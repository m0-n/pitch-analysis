var express = require('express');
var router = express.Router();

var ctrlRecording	= require('../controllers/recording');

router.post('/recording/upload', ctrlRecording.uploadRecording);
router.get('/recording/:givenID', ctrlRecording.retreiveRecording);


module.exports = router;