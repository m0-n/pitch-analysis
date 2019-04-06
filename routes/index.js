var request = require('request');
var express = require('express');
var router = express.Router();

/*var apiOptions = {
	server : "https://localhost:5000"
};

if(process.env.NODE_ENV == 'production'){
	apiOptions.server = 'https://voice-pitch.herokuapp.com';
}*/

/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index', { title: 'Pitch Detector' });
});

router.get('/voice-stats/:givenID', function(req, res) {
	var requestOptions = {
		url : 'https://pitch-detector.herokuapp.com/api/recording/' + req.params.givenID,
		method : "GET",
		json: {}
	};

	request(requestOptions, function(err, response, body){
		if(response.statusCode === 200) {
			console.log(body);

			res.render('voice-stats', {
				givenID: req.params.givenID,
				stats: body
			});
		}else{
			//> THROW AN ERROR!!
		}
	});
});


module.exports = router;
