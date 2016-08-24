var blitzen = require('./blitzen');
var fs = require('fs');
var os = require('os');
//var async = require('asyncawait/async');
//var await = require('asyncawait/await');

readEntitiesFromFile = function(
	entitiesFilePath)
{
	try 
	{
		var data = fs.readFileSync(entitiesFilePath, 'utf8');
		var entities = JSON.parse(data);


		if (	entities.organization_id 
			&& 	entities.group_id
			&&	entities.project_id)
		{
			console.log(
				"Successfully read entities."
				+ "\n\torganization_id: " 
				+ entities.organization_id
				+ "\n\tgroup_id: " 
				+ entities.group_id
				+ "\n\tproject_id: " 
				+ entities.project_id
				+ "\n");
		}
		else
		{
			console.log('Error = > Invalid entities file format');
			console.log('Aborting !');
			process.exit(1);
		}

		return entities;
	}
	catch (e) 
	{
		if (e.code === 'ENOENT') 
		{
			console.log(
				'Error => Entities file not found: ' 
				+ entitiesFilePath);
		} 
		else 
		{
			console.log("Error reading entities file: " + e.message);
		}

		console.log('Aborting !');
		process.exit(1);
	}
}


var entitiesFilePath = 
	os.homedir() + '/.adsk-data360/entities-crucible.json';

var entities = readEntitiesFromFile(entitiesFilePath);

var credentialsFilePath = 
	os.homedir() + '/.adsk-data360/credentials-crucible.json'; 

var database = new blitzen.Database(credentialsFilePath);

//Add 2 data points with randomly selected values
var params = 
{
	organizationId: entities.organization_id,
	groupId: entities.group_id,
	projectId: entities.project_id,
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
database.postReadings(params)
.then(
	function(result)
	{
		//Add 2 data points with randomly selected values
		var params = 
		{
			organizationId: entities.organization_id,
			groupId: entities.group_id,
			projectId: entities.project_id,
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
			organizationId: entities.organization_id,
			groupId: entities.group_id,
			projectId: entities.project_id,
			sensorList: 'exampleSensorId',
			//startTS: '2016-04-27T08:02:49.586Z',
			//endTS: '2016-04-27T08:02:55.586Z',
			//rollupFrequency: '1W'
		}

		return database.getReadings(params);
	});

