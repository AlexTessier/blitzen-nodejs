var OAuth = require("oauth").OAuth;
var util = require('util');

function Database()
{
	this.oauthBaseUrl = "https://accounts.autodesk.com/OAuth";
	this.requestTokenUrl = this.oauthBaseUrl + "/RequestToken";
	this.accessTokenUrl = this.oauthBaseUrl + "/AccessToken";
	this.authorizeUrl = this.oauthBaseUrl + "/Authorize";

	this.consumerKey = null;
	this.consumerSecret = null;
	this.oauth = null;
	this.accessTokenKey = null;
	this.accessTokenSecret = null;
}

Database.prototype.login = function login(
	consumerKey, 
	consumerSecret)
{
	console.log("login");
	console.log(this);

	this.oauth = new OAuth(
		this.requestTokenUrl,
		this.accessTokenUrl,
		consumerKey,  
		consumerSecret, 
		"1.0", 
		undefined, 
		"HMAC-SHA1");       

	var thisObj = this;

	this.oauth.getOAuthRequestToken(
		function(error, requestTokenKey, requestTokenSecret, results)
		{
			thisObj.requestTokenCallback(
				error, 
				requestTokenKey, 
				requestTokenSecret, 
				results);
		});
}

Database.prototype.requestTokenCallback = function requestTokenCallback(
	error, 
	requestTokenKey, 
	requestTokenSecret, 
	results) 
{
	console.log("requestTokenCallback");
	console.log(this);

	if (error) 
	{
		console.log('error: ' + JSON.stringify(error));
	} 
	else 
	{
		console.log('requestTokenKey: ' + requestTokenKey);
		console.log('requestTokenSecret: ' + requestTokenSecret);
		console.log('results: ' + util.inspect(results));
		console.log("Requesting access token");
		console.log(
			'Please go to ' 
				+ this.authorizeUrl 
				+ '?oauth_token=' 
				+ encodeURIComponent(requestTokenKey));

		var thisObj = this;

		ask(
			"Please enter the verification code:\n", 
			/[\w\d]+/, 
			function(data) 
			{
				thisObj.oauth.getOAuthAccessToken(
					requestTokenKey, 
					requestTokenSecret, 
					data, 
					function(
						error, 
						accessTokenKey, 
						accessTokenSecret, 
						results)
					{
						thisObj.accessTokenCallback(
							error, 
							accessTokenKey, 
							accessTokenSecret, 
							results);
					});
			});
	}
}

Database.prototype.accessTokenCallback = function accessTokenCallback(
	error, 
	accessTokenKey, 
	accessTokenSecret, 
	results) 
{
	console.log("accessTokenCallback");
	console.log(this);

	if (error) 
	{
		console.log('error: ' + JSON.stringify(error));
	} 
	else 
	{
		console.log('accessTokenKey: ' + accessTokenKey);
		console.log('accessTokenSecret: ' + accessTokenSecret);
		console.log('access token results: ' + util.inspect(results));

		this.accessTokenKey = accessTokenKey;
		this.accessTokenSecret = accessTokenSecret;
	}
}

Database.prototype.get = function get(url)
{
	console.log("get");
	console.log(this);

	var request = this.oauth.get(
		url, 
		this.accessTokenKey, 
		this.accessTokenSecret, 
		function(error, data) 
		{
			if (error) 
			{
				console.log(error);
			} 
			else 
			{
				console.log(data);
				var json = JSON.parse(data);
				console.log(json);
			}
		});
}


function ask(
	question, 
	format, 
	callback) 
{
	var stdin = process.stdin;
	var stdout = process.stdout;

	stdin.resume();
	stdout.write(question);

	stdin.once(
		'data', 
		function(data) 
		{
			data = data.toString().trim();

			if (format.test(data)) 
			{
				callback(data);
			} 
			else 
			{
				stdout.write("It should match: "+ format +"\n");
				ask(question, format, callback);
			}
		});
}

exports.Database = Database;
