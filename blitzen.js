var errors = require('request-promise/errors');
var fs = require('fs');
var httpRequest = require('request-promise');
var oxygen = require('./oxygen');
var path = require('path');
var Promise = require("bluebird");
var util = require('util');
const assert = require('assert');

//TODO: Create this library as a npm module ? (TBD)

const DEFAULT_API_URL = 'https://projectdasher-staging.api.autodesk.com';
const V1_SIMPLE_READINGS_ENDPOINT = '/api/v1/projects/{projectId}/readings';

function Request(
	method,
	url, 
	params,
	database)
{
	assert(database);

	this.method = method;
	this.url = url;
	this.params = params;
	this.database = database;
	this.firstAttempt = true;
}

Request.prototype.onSuccess = function(
	serverResponse)
{
	console.log("Request succeeded.\n");
	return serverResponse;
}

Request.prototype.onFailure = function(
	serverResponse)
{
	if (	(serverResponse.response.statusMessage == 'Unauthorized')
		&&	(this.firstAttempt))
	{
		// The request failed, probably due to an invalid access token.
		// This is the first failure of this request. 
		// We will obtain a new access token and attempt the same request
		// again. If it fails again for the same reason, we will not attempt
		// it again. 
		
		this.firstAttempt = false;

		console.log('Data360 API request was unauthorized.');
		console.log('Attempting to obtain new access token.');

		var thisObj = this;

		return this.database.authenticator.obtainAccessToken()
			.then(
				function() {return thisObj.send()})
			.then(
				function(successResult) 
					{return thisObj.onSuccess(successResult)}, 
				function(failureResult) 
					{return thisObj.onFailure(failureResult)});
	}
	else
	{
		return serverResponse;
	}
}

Request.prototype.options = function()
{
	var options = 
	{
		method: this.method,
		url: this.url,
		headers:
		{
			'cache-control': 'no-cache',
			'Accept': 'application/json',
			'Authorization': 'Bearer ' 
				+ this.database.authenticator.accessToken() 
		},
		json: true,
	};

	if (this.method === 'GET')
	{
		options.qs = this.params;
	}
	else
	{
		options.body = this.params;
	}

	return options;
}

Request.prototype.send = function()
{
	var thisObj = this;


	return this.database.authenticator.refreshAccessToken()
		.then(
			function()
			{
				console.log(
					thisObj.method
					+ " "
					+ thisObj.url);
				return httpRequest(thisObj.options())
			},
			function()
			{
				console.log("failure")
			})
		.then(
			function(successResult) 
			{
				return thisObj.onSuccess(successResult)
			}, 
			function(failureResult) 
			{
				return thisObj.onFailure(failureResult)
			});
}

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

Database.prototype.getRequest = function(
	url,
	params)
{
	var request = new Request('GET', url, params, this);

	return request.send();
}

Database.prototype.postRequest = function(
	url,
	params)
{
	var request = new Request('POST', url, params, this);

	return request.send();
}

Database.prototype.deleteRequest = function(
	url,
	params)
{
	var request = new Request('DELETE', url, params, this);

	return request.send();
}

Database.prototype.getReadings = function(
	params)
{
	var url = this.readingsUrl().replace('{projectId}', params.projectId);

	if (typeof(params.projectId) === 'undefined')
	{
		return new Promise(
			function(successFn, failureFn) 
			{
				var error = new Error();
				error.message = 'Missing Project Id parameter';
				failureFn(error);
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
			function(successFn, failureFn) 
			{
				var error = new Error();
				error.message = 'Missing Project Id parameter';
				failureFn(error);
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
			function(successFn, failureFn) 
			{
				var error = new Error();
				error.message = errorMessage;
				failureFn(error);
			});
	}
	else 
	{
		return this.deleteRequest(url, params);
	}
}

exports.Database = Database;
