var mongoose = require('mongoose');

var recordingSchema = new mongoose.Schema({
	givenID: {
		type: String,
		unique: true,
		required: true,
		index: true
	},

	highest: Number,
	lowest: Number,
	average: Number,
	median: Number,
	range: Number,
	mode: Number,

	ip: String,
	client: Object,
	createdOn: {
		type: Date,
		"default": Date.now
	}
});

mongoose.model('Recording', recordingSchema);