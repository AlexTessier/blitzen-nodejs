var errors = require('request-promise/errors');
var httpRequest = require('request-promise');
var Promise = require("bluebird");
var fs = require('fs');
var oxygen = require('./oxygen');
var path = require('path');

//TODO: Create this library as a npm module ? (TBD)

const DEFAULT_API_URL = 'https://projectdasher-staging.api.autodesk.com';
const V1_SIMPLE_READINGS_ENDPOINT = '/api/v1/projects/{projectId}/readings';

function Database(
	credentialsFilePath,
	apiUrl)
{
	console.assert(
		typeof(credentialsFilePath) != 'undefined',
		{
			'message': 'credentialsFilePath not specified'
		});
	console.assert(
		typeof(credentialsFilePath) === 'string',
		{
			'message': 'credentialsFilePath is not a string',
			'credentialsFilePath': credentialsFilePath
		});

	if (typeof(apiUrl) === 'undefined') apiUrl = DEFAULT_API_URL;

	console.assert(
		typeof(apiUrl) === 'string',
		{
			'message': 'apiUrl is not a string',
			'apiUrl': apiUrl
		});

	this.authenticator = new oxygen.Authenticator(credentialsFilePath);
	this.apiUrl = DEFAULT_API_URL;
}

Database.prototype.readingsUrl = function()
{
	return (this.apiUrl + V1_SIMPLE_READINGS_ENDPOINT);
}

Database.prototype.connect = function()
{
	console.log('Database.connect() called');

	return this.authenticator.obtainAccessToken();
}

Database.prototype.request = function(
	method, 
	url,
	params)
{
	console.log('\n' + method + ": " + url);
	
	var options = 
	{
		method: 'GET',
		url: url,
		headers:
		{
			'cache-control': 'no-cache',
			'Accept': 'application/json',
			'Authorization': 'oauth_token="' 
				+ this.authenticator.accessToken() 
				+ '",oauth_version="2.0"'
		},
		json: true,
	};

	if (method === 'GET')
	{
		options.qs = params;
	}
	else
	{
		options.body = params;
	}

	return new Promise(
		function(resolve, reject) 
		{
			httpRequest(options)
				.then(
					function(body) 
					{
						console.log(body);
						resolve(body);
					})
				.catch(
					errors.StatusCodeError, 
					function(reason) 
					{
						reject(reason.message);
					})
		});
}

Database.prototype.getRequest = function(
	url,
	params)
{
	var options = 
	{
		method: 'GET',
		url: url,
		qs: params,
	};

	return this.request('GET', url, params);
}


Database.prototype.postRequest = function(
	url,
	params)
{
	var options = 
	{
		method: 'POST',
		url: url,
		body: params,
	};

	return this.request('POST', url, params);
}

Database.prototype.deleteRequest = function(
	url,
	params)
{
	var options = 
	{
		method: 'DELETE',
		url: url,
		body: params,
	};

	return this.request('DELETE', url, params);
}

Database.prototype.getReadings = function(
	params)
{
	var url = this.readingsUrl().replace('{projectId}', params.projectId);

	if (typeof(params.projectId) === 'undefined')
	{
		return new Promise(
			function(resolve, reject) 
			{
				var error = new Error();
				error.message = 'Missing Project Id parameter';
				reject(error);
			});
	}
	else 
	{
		return this.getRequest(url, params);
	}
}


Database.prototype.postReadings = function(
	params)
{
	var url = this.readingsUrl().replace('{projectId}', params.projectId);

	if (typeof(params.projectId) === 'undefined')
	{
		return new Promise(
			function(resolve, reject) 
			{
				var error = new Error();
				error.message = 'Missing Project Id parameter';
				reject(error);
			});
	}
	else 
	{
		return this.postRequest(url, params);
	}
}

Database.prototype.deleteReadings = function()
{
	var url = this.readingsUrl().replace('{projectId}', params.projectId);

	var errorMessage = '';

	if (typeof(params.projectId) === "undefined")
	{
		errorMessage = 'Missing Project Id parameter';
	}

	if (typeof(params.startTS) === "undefined")
	{
		errorMessage = 'Missing startTS parameter';
	}

	if (typeof(params.endTS) === "undefined")
	{
		errorMessage = 'Missing endTS parameter';
	}
	
	if (errorMessage !== '')
	{
        return new Promise(
			function(resolve, reject) 
			{
				var error = new Error();
				error.message = errorMessage;
				reject(error);
			});
	}
	else 
	{
		return this.deleteRequest(url, params);
	}
}

exports.Database = Database;
