var blitzen = require('./lib/blitzen-v1-simple');

var ORGANIZATION_ID = 'd58983a1fd3aa3e8bf4e1ae4a7b2';
var GROUP_ID = '2b8084cd855fa749b7113eba1849';
var PROJECT_ID = '2bbb4f6099676a77d70cfdc4254e';

var credentialsFilePath = '/Users/cameroj/.adsk-data360/credentials-crucible.json'; 

var database = new blitzen.Database(credentialsFilePath);

database.connect()
.then(
	function(result)
	{
		//Add 2 data points with randomly selected values
		var params = 
		{
			organizationId: ORGANIZATION_ID,
			groupId: GROUP_ID,
			projectId: PROJECT_ID,
			readingList: 
			[
				{
					sensorId: 'exampleSensorId',
					ts: new Date().toISOString(),
					val: Math.random()
				},
				{
					sensorId: 'exampleSensorId',
					ts: new Date().toISOString(),
					val: Math.random()
				}
			]
		}

		// By not returning the Promise returned from postReadings(), we allow
		// the app to proceed into the following .then() immediately.
		database.postReadings(params);
	})
.then(
	function(result)
	{
		//Add 2 data points with randomly selected values
		var params = 
		{
			organizationId: ORGANIZATION_ID,
			groupId: GROUP_ID,
			projectId: PROJECT_ID,
			readingList: 
			[
				{
					sensorId: 'exampleSensorId',
					ts: new Date().toISOString(),
					val: Math.random()
				},
				{
					sensorId: 'exampleSensorId',
					ts: new Date().toISOString(),
					val: Math.random()
				}
			]
		}

		// By returning the Promise returned from postReadings(), we force the
		// app to wait for the response from postReadings() before proceeding
		// into the following .then(). If we don't need the postReadings()
		// call to complete before we move on, we can fire-and-forget the
		// postReadings() call simply by omitting the return here, as we did
		// above.
		return database.postReadings(params);
	})
.then(
	function(result)
	{
		//Query parameters to fetch data from Data 360
		var params = 
		{
			organizationId: ORGANIZATION_ID,
			groupId: GROUP_ID,
			projectId: PROJECT_ID,
			sensorList: 'exampleSensorId',
			//startTS: '2016-04-27T08:02:49.586Z',
			//endTS: '2016-04-27T08:02:55.586Z',
			//rollupFrequency: '1W'
		}

		return database.getReadings(params);
	});

