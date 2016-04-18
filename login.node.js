var Blitzen = require('./blitzen');

var consumerKey = "60f331c3-45c4-491b-ab71-238d50c3675d";
var consumerSecret = "bc0d686f-23a9-4de6-927d-d68be1bd9e7a";

var database = new Blitzen.Database();
database.login(consumerKey, consumerSecret);

console.log('Getting a list of company memberships');
var url = 'https://projectdasher-staging.api.autodesk.com/api/company-membership/v1/list.json';
console.log('url: ' + url);

database.get(url);
