var formidable = require('formidable');
var requestIp = require('request-ip');
var uaParser = require('ua-parser-js');
var fs = require('fs');

var mongoose = require('mongoose');
var utilities = require('../utilities/utilities.js');
var Recording = mongoose.model('Recording');

module.exports.uploadRecording = function(req, res){
	console.log('>>>', req.files, req.body, req.data);

	const form = new formidable.IncomingForm();
	// form.uploadDir = utilities.soundsDir;
	form.parse(req);

	var stats = {};
	var userAgent = '';

	form.on('field', function(name, value){
		if(name == 'stats'){
			stats = JSON.parse(value);
		}else if(name == 'userAgent'){
			userAgent = value;
		}
	});

	form.on('file', function(name, file){
		const givenID = utilities.makeUniqueID(8);
		const filePath = utilities.soundsDir + givenID + '.wav';
		console.log('##########', stats);

		fs.rename(file.path, filePath, function(err){
			if(err){
				console.log('ERROR', err);
				sendResJSON(res, 400, err);
			}else{
				var recording = new Recording();
				var ip = requestIp.getClientIp(req);
				var client = uaParser(userAgent);

				recording.givenID = givenID;
				recording.ip = ip;
				recording.client = client;
				recording.highest = stats.highest;
				recording.lowest = stats.lowest;
				recording.average = stats.average;
				recording.median = stats.median;
				recording.range = stats.range;
				recording.mode = stats.mode;

				recording.save((err, savedRecording) => {
					if(err){
						console.log('Error', err);
						utilities.sendResJSON(res, 400, 'Error');
					}else{
						console.log('Uploaded!');
						utilities.sendResJSON(res, 200, { givenID });
					}
				});
			}
		});
	});

	/*form.parse(req, function(err, fields, files){
		console.log(err, fields, files);

		if(files){
			var filePath = files.filetoupload.path;

			fs.rename(filePath, utilities.soundsDir + filePath, function(err){
				if(err){
					console.log('ERROR', err);
					sendResJSON(res, 400, err);
				}else{
					console.log('Uploaded!');
					sendResJSON(res, 200, 'DONE');
				}
			});
		}
	});*/
}

module.exports.retreiveRecording = function(req, res){
	Recording
	.findOne({givenID: req.params.givenID})
	.select('-ip -client')
	.exec((err, recording) => {
		if(err){
			console.log('Error', err);
			utilities.sendResJSON(res, 400, 'Error');
		}else{
			console.log('Uploaded!');
			utilities.sendResJSON(res, 200, recording);
		}
	});
}