// TODO: Document classes and functions.

//var errors = require('request-promise/errors');
var httpRequest = require('request-promise');
var Promise = require("bluebird");
var fs = require('fs');
var os = require('os');
var path = require('path');
var moment = require('moment');

const DEFAULT_FORGE_URL = 'https://developer.api.autodesk.com';

function Authenticator(
	credentialsFilePath,
	forgeUrl)
{
	if (typeof(forgeUrl) === 'undefined') forgeUrl = DEFAULT_FORGE_URL;

	this.credentialsFilePath = credentialsFilePath;
	this.accessTokenFilePath = this.accessTokenFilePath(credentialsFilePath);
	this.forgeUrl = forgeUrl;

    this._accessToken = null;
    this.credentials = {};
	this.clientId = null;
	this.clientSecret = null;

	this.readCredentialsFromFile(this.credentialsFilePath);
	this.readAccessTokenFromFile(this.credentialsFilePath);
}

Authenticator.prototype.readCredentialsFromFile = function(
	credentialsFilePath)
{
	try 
	{
		var data = fs.readFileSync(this.credentialsFilePath, 'utf8')
		this.credentials = JSON.parse(data);

		if (this.credentials.client_id && this.credentials.client_secret)
		{
			console.log(
				'Successfully read credentials file\n\tclient_id: ' 
				+ this.credentials.client_id
				+ "\n");
		}
		else
		{
			console.log('Error: Invalid credentials file format');
			console.log('Aborting !');
			process.exit(1);
		}
	}
	catch (e) 
	{
		if (e.code === 'ENOENT') 
		{
			console.log(
				'Error: Credentials file not found: ' 
				+ this.credentialsFile);
		} 
		else 
		{
			console.log("Error reading credentials file: " + e.message);
		}

		console.log('Aborting !');
		process.exit(1);
	}
}


Authenticator.prototype.accessTokenFilePath = function(
	credentialsFilePath)
{
	// The name of the token file is based on the name of the credentials
	// file.
	
	accessTokenFilePath = path.join(
		path.dirname(credentialsFilePath),
		'token.' + path.basename(credentialsFilePath));

	return accessTokenFilePath;
}

Authenticator.prototype.readAccessTokenFromFile = function(
	accessTokenFilePath)
{
	try 
	{
		var data = fs.readFileSync(this.accessTokenFilePath, 'utf8')
		token = JSON.parse(data)

		this._accessToken = new Token(
			token.key,
			token.endTime);

		if (this._accessToken.key && this._accessToken.endTime)
		{
			console.log(
				'Successfully read access token file\n\ttoken: ' 
				+ this._accessToken.key);
		}
		else
		{
			console.log('Error: Invalid access token file format');
			this._accessToken = null;
		}
	}
	catch (e) 
	{
		if (e.code === 'ENOENT') 
		{
			console.log(
				'Warning: access token file not found: ' 
				+ this.accessTokenFilePath);
		} 
		else 
		{
			console.log("Error reading access token file: " + e.message);
			// TODO: Delete the invalid access token file?
		}
	}
}

Authenticator.prototype.writeAccessTokenToFile = function(
	accessTokenFilePath)
{
	console.log("writeAccessTokenToFile()");
	return new Promise(
		function(successFn, failureFn) 
		{
			fs.writeFile(
				this.accessTokenFilePath, 
				JSON.stringify(this._accessToken),
				function(err) 
				{
					if (err) 
					{
						return failureFn(err);
					}
//					successFn(JSON.stringify(this._accessToken));
					successFn();
				});
		});
}

Authenticator.prototype.parseToken = function(
	response)
{
	console.log("parseToken() called");
	this._accessToken = new Token(
		response.access_token,
		response.expires_in);
	console.log(
		'Fetched Token: ' 
		+ JSON.stringify(this._accessToken));

	this.writeAccessTokenToFile(this.accessTokenFilePath);

	return new Promise(
		function(successFn, failureFn) 
		{
			successFn();
		});
}

// obtain access token
// refresh access token
// access token
Authenticator.prototype.obtainAccessToken = function()
{
	console.log("obtainAccessToken()");

	// This code does 2-legged OAuth 2
	// It requires an OAuth 2 client id and client secret as input, 
	// and produces a bearer token as output.
	
	var thisObj = this;

	return new Promise(
		function(successFn, failureFn) 
		{
			var options = 
			{
				method: 'POST',
				url: thisObj.forgeUrl + '/authentication/v1/authenticate',
				headers: 
				{
					'cache-control': 'no-cache',
					'content-type': 'application/x-www-form-urlencoded'
				},
				form: 
				{
					client_id: thisObj.credentials.client_id,
					client_secret: thisObj.credentials.client_secret,
					grant_type: 'client_credentials'
				},
				json: true
			};

			console.log("calling httpRequest()");
			httpRequest(options)
				.then(
					function(successResult) 
					{
						console.log("httpRequest() succeeded");
						thisObj._accessToken = new Token(
							successResult.access_token,
							successResult.expires_in);
						console.log(
							'Fetched Token: ' 
							+ JSON.stringify(thisObj._accessToken));
						thisObj.writeAccessTokenToFile(thisObj.accessTokenFilePath)
						.then(
							function(dummyResult)
							{
								return successFn(successResult);
							});
					})
				/*	},
					function(failureResult) 
					{
						console.log("httpRequest() failed");
						console.log('Error Authenticating: ' + failureResult);
						var error = new Error();
						error.message = 
							"Error Authenticating: " 
							+ failureResult.message;
						failureFn(error);
					});
				*/
				
				.catch(
					function(failureResult) 
					{
						console.log("httpRequest() failed");
						console.log('Error Authenticating: ' + failureResult);
						var error = new Error();
						error.message = 
							"Error Authenticating: " 
							+ failureResult.message;
						return failureFn(error);
					})
				
		});
}

Authenticator.prototype.refreshAccessToken = function()
{
	console.log("refreshAccessToken()");
	var thisObj = this;

	return new Promise(
		function(successFn, failureFn) 
		{
			// if token is stale or expired or nonexistent, and we've been configured
			// to automatically refresh tokens, then first refresh/obtain the token.
			if (	thisObj._accessToken === undefined 
				||	thisObj._accessToken === null
				|| 	thisObj._accessToken.isExpired() 
				|| 	thisObj._accessToken.isStale()) 
			{
				return thisObj.obtainAccessToken()
			}
			else
			{
				console.log("Existing access token appears to be valid.");
				successFn();
			}
		});
}


Authenticator.prototype.login = function()
{
	// This code implements 3-legged OAuth 1
}


Authenticator.prototype.accessToken = function()
{
	return this._accessToken;
}


// TODO: Derive from some OAuth token class?
function Token(key, timeUntilEndInSeconds)
{
	this.key = key;
	this.startTime = moment.utc();
	this.endTime = moment.utc().seconds(timeUntilEndInSeconds);
}


Token.prototype.isExpired = function()
{
	return (this.endTime < moment.utc());
}


Token.prototype.isStale = function()
{
	var timeUntilEndInMilliseconds = this.endTime - moment.utc();
	var timeUntilEndInSeconds = timeUntilEndInMilliseconds / 1000;
	//var timeSinceStartInMilliseconds = moment.utc() - this.startTime;
	//var timeSinceStartInSeconds = timeSinceStartInMilliseconds / 1000;

	// Define a length of time before expiry of the token during which the
	// token should be considered stale and in need of refreshing.
	const thresholdInMinutes = 3;
	const thresholdInSeconds = thresholdInMinutes * 60;

	// If token will expire in less than the threshold, consider it stale.
	if (timeUntilEndInSeconds <= thresholdInSeconds)
	{
		return true;
	}
	else
	{
		return false;
	}
}

Token.prototype.toString = function()
{
	return this.key;
}

exports.Authenticator = Authenticator
exports.Token = Token

