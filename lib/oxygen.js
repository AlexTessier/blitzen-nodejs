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
	this.forgeUrl = forgeUrl;

    this._accessToken = null;
    this.credentials = {};
	this.clientId = null;
	this.clientSecret = null;
//	this.automaticallyRefreshAccessToken = true;

	this.readCredentialsFromFile(this.credentialsFilePath);
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
				'Successfully read credentials file => ClientID: ' 
				+ this.credentials.client_id);
		}
		else
		{
			console.log('Error = > Invalid credentials file format');
			console.log('Aborting !');
			process.exit(1);
		}
	}
	catch (e) 
	{
		if (e.code === 'ENOENT') 
		{
			console.log(
				'Error => Credentials file not found: ' 
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

// obtain access token
// refresh access token
// access token
Authenticator.prototype.obtainAccessToken = function()
{
	// This code does 2-legged OAuth 2
	// It requires an OAuth 2 client id and client secret as input, 
	// and produces a bearer token as output.
	
	var thisObj = this;

	return new Promise(
		function(resolve, reject) 
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

			httpRequest(options)
				.then(
					function(result) 
					{
						thisObj._accessToken = new Token(
							result.access_token,
							result.expires_in);
						console.log(
							'Fetched Token: ' 
							+ JSON.stringify(thisObj._accessToken));
						resolve();
					})
				.catch(
					function(err) 
					{
						console.log('Error Authenticating: ' + err);
						var error = new Error();
						error.message = 
							"Error Authenticating: " 
							+ err.message;
						reject(error);
					})
		});
}

Authenticator.prototype.refreshAccessToken = function()
{
	var thisObj = this;

	return new Promise(
		function(resolve, reject) 
		{
			// if token is stale or expired or nonexistent, and we've been configured
			// to automatically refresh tokens, then first refresh/obtain the token.
			if (	thisObj._accessToken === undefined 
				||	thisObj._accessToken === null
				|| 	thisObj._accessToken.isExpired() 
				|| 	thisObj._accessToken.isStale()) 
			{
				console.log('access token requires refreshing');
				return thisObj.obtainAccessToken()
			}
			else
			{
				console.log('access token does not require refreshing');
				resolve();
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
function Token(key, timeBeforeExpiryInSeconds)
{
	this.key = key;
	this.expiryTime = moment.utc().seconds(timeBeforeExpiryInSeconds);
}


Token.prototype.isExpired = function()
{
	return (this.expiryTime < moment.utc());
}


Token.prototype.isStale = function()
{
	var timeBeforeExpiryInMilliseconds = this.expiryTime - moment.utc();
	var timeBeforeExpiryInSeconds = timeBeforeExpiryInMilliseconds / 1000;

	// If token will expire in less than 2 minutes, consider it stale
	if (timeBeforeExpiryInSeconds <= 120)
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

