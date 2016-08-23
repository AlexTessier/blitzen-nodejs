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
	this.accessTokenRefreshed = false;
}

Request.prototype.onSuccess = function(
	serverResponse)
{
	return serverResponse;
}

Request.prototype.onFailure = function(
	serverResponse)
{
//	console.log("Request::onFailure");

	if (	(serverResponse.response.statusMessage == 'Unauthorized')
		&&	(!this.accessTokenRefreshed))
	{
		console.log('Data360 API request was unauthorized.');
		console.log('Attempting to obtain new access token.');

		var thisObj = this;

		return this.database.authenticator.obtainAccessToken()
		.then(
			function() {return thisObj.send()})
		.then(
			function(successResult) {return thisObj.onSuccess(successResult)}, 
			function(failureResult) {return thisObj.onFailure(failureResult)});
	}
	else
	{
		return serverResponse;
	}
}

Request.prototype.refreshAccessToken = function()
{
	this.accessTokenRefreshed = true;
	return this.database.authenticator.obtainAccessToken()
}

Request.prototype.send = function()
{
	console.log('\n' + this.method + ": " + this.url);

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

	console.log("token: " + this.database.authenticator.accessToken());

	if (this.method === 'GET')
	{
		options.qs = this.params;
	}
	else
	{
		options.body = this.params;
	}

	var thisObj = this;

	return httpRequest(options)
	.then(
		function(successResult) {return thisObj.onSuccess(successResult)}, 
		function(failureResult) {return thisObj.onFailure(failureResult)});
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


Database.prototype.tryRequest = function(
	method, 
	url,
	params)
{
	console.log('\n' + method + ": " + url);

	var options = 
	{
		method: method,
		url: url,
		headers:
		{
			'cache-control': 'no-cache',
			'Accept': 'application/json',
			'Authorization': 'Bearer ' + this.authenticator.accessToken() 
		},
		json: true,
	};

	console.log("token: " + this.authenticator.accessToken());

	if (method === 'GET')
	{
		options.qs = params;
	}
	else
	{
		options.body = params;
	}

	resultPromise =  httpRequest(options);
	assert(resultPromise);
	return resultPromise;
	/*
	returnValue = new Promise(
		function(successFn, failureFn) 
		{
			console.log("executing httpRequest");

			resultPromise = httpRequest(options);
			assert(resultPromise);
			console.log("waiting on httpRequest result");
			resultPromise.then(
				function(successResult) 
				{
					console.log(method + ' request succeeded.');
					console.log(successResult);
					successFn(successResult);
				},
				function(failureResult) 
				{
					console.log(
						method 
						+ ' request failed: ' 
						+ failureResult.response.statusCode
						+ " ("
						+ failureResult.response.statusMessage
						+ "): "
						+ failureResult.response.body);
					failureFn(failureResult);
				})
			.catch(
				errors.StatusCodeError, 
				function(failureResult) 
				{
					console.log("request exeception");
					failureFn(failureResult);
				});
		});

	assert(returnValue);
	return returnValue;
	*/
}
	
Database.prototype.retryRequest = function(
	method,
	url,
	params)
{
	var thisObj = this;

	return this.authenticator.obtainAccessToken()
	.then(
		function(successResult)
		{
			return thisObj.tryRequest(method, url, params);
		},
		function(failureResult)
		{
		});
}
	
Database.prototype.onRequestSuccess = function(
	serverResponse)
{
	console.log("request succeeded");
//	console.log(serverResponse);
	return serverResponse;
}

Database.prototype.onRequestFailure = function(
	method,
	url,
	params,
	serverResponse)
{
	console.log("request failure");

	if (failureResult.response.statusMessage == 'Unauthorized')
	{
		console.log('Data360 API request was unauthorized.');
		console.log('Attempting to obtain new access token.');
		promise = thisObj.retryRequest(method, url, params);
		assert(promise);
		return promise;
	}
	else
	{
		return failureResult;
	}
}

Database.prototype.request = function(
	method, 
	url,
	params)
{
//	console.log("request()");
	var thisObj = this;

	var request = new Request(method, url, params, this);

	return request.send();
/*
	resultPromise = this.tryRequest(method, url, params);
	assert(resultPromise);
	return resultPromise
	.then(
		this.onRequestSuccess,
		function failureFn(failureResult) // move to Database.prototype.onRequestFailure()?
		{
			if (failureResult.response.statusMessage == 'Unauthorized')
			{
				console.log('Data360 API request was unauthorized.');
				console.log('Attempting to obtain new access token.');
				promise = thisObj.retryRequest(method, url, params);
				assert(promise);
				return promise;
			}
			else
			{
				return failureResult;
			}
		});
*/
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

	resultPromise = this.request('POST', url, params);

	assert(resultPromise); 
	return resultPromise;
//	return this.request('POST', url, params);
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
