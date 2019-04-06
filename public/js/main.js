window.AudioContext = window.AudioContext || window.webkitAudioContext;
var userAgent = navigator.userAgent || navigator.vendor || window.opera;

var audioContext = new AudioContext();
var audioInput = null,
	realAudioInput = null,
	inputPoint = null,
	audioRecorder = null;
var rafID = null;
var analyserContext = null;
var canvasWidth, canvasHeight;
var recIndex = 0;

var recordedFile = null;
var recording = false;
var recordingSteam = null;

//
var steps = [];
var lowest = 0;
var highest = 0;
var average = 0;
var range;
var mode;
var tuner;
var frequencyOccurances = {};

var voice;


/* TODO:
- offer mono option
- "Monitor input" switch
*/

function saveAudio(){
	audioRecorder.exportWAV(doneEncoding);
	// could get mono instead by saying
	// audioRecorder.exportMonoWAV(doneEncoding);
}

function gotBuffers(buffers){
	var canvas = document.getElementById("wavedisplay");

	drawBuffer(canvas.width, canvas.height, canvas.getContext('2d'), buffers[0]);

	// the ONLY time gotBuffers is called is right after a new recording is completed - 
	// so here's where we should set up the download.
	audioRecorder.exportWAV(doneEncoding);
}

function doneEncoding(blob){
	Recorder.setupDownload(blob, "myRecording" + ((recIndex<10)?"0":"") + recIndex + ".wav");
	recIndex++;
}

Recorder.setupDownload = function(blob, filename){
	var stats = {
		highest: highest,
		lowest: lowest,
		median: median,
		average: average,
		range: range,
		mode: mode
	};

	var fd = new FormData();
	fd.append('fname', filename);
	fd.append('data', blob);
	fd.append('userAgent', userAgent);
	fd.append('stats', JSON.stringify(stats));
	console.log('Stats', stats);

	$.ajax({
		type: 'POST',
		url: '/api/recording/upload',
		data: fd,
		processData: false,
		contentType: false
	}).done(function(data){
		console.log(data);

		$('#share-buttons a').each(function(index, elem){
			var href = $(elem).attr('href');
			href = href.replace('xxxxx', data.givenID);
			$(elem).attr('href', href);

		});

		$('#share-buttons').removeClass('hidden');
		// $('#start-analyzing-wrapper').removeClass('hidden');
		recordedFile = data;
	});
}

$('#start-analyzing-wrapper').click(function(e){
	console.log('OK', recordedFile);
});

$('#recordBtn').click(function(e){
	if($(this).hasClass("recording")){
		$('#analyser-wrapper').addClass('hidden');
		$('#wavedisplay-wrapper').removeClass('hidden');

		$(this).removeClass("recording")
		$('#recordBtn-wrapper').addClass("hidden");
		$('#statsChart-wrapper').removeClass("hidden");
		$('#stats').removeClass('hidden');
		// var steps = 0;
		var total = 0;
		lowest = 0;
		highest = 0;
		var lowestDone = false;

		console.log(frequencyOccurances);

		for(freq in frequencyOccurances){
			var freqTimes = frequencyOccurances[freq];

			// steps += freqTimes;
			total += (freqTimes * parseInt(freq));
			average = Math.round(total / steps.length);

			if(!lowestDone && freqTimes >= 3){
				lowest = parseInt(freq);
				lowestDone = true;
			}

			if(freqTimes >= 3){
				highest = parseInt(freq);
			}
		}

		median = steps[Math.round(steps.length / 2)];
		range = highest - lowest;
		mode = getMode(steps);

		document.getElementById('lowest-val').innerHTML = lowest;
		document.getElementById('highest-val').innerHTML = highest;
		document.getElementById('average-val').innerHTML = average;
		document.getElementById('median-val').innerHTML = median;
		document.getElementById('range-val').innerHTML = range;
		document.getElementById('mode-val').innerHTML = mode

		// stop recording
		audioRecorder.stop();
		audioRecorder.getBuffers(gotBuffers);
		recording = false;

		var tracks = recordingSteam.getAudioTracks();
		tracks.forEach(function(track){
			track.stop();
		});

		voice.stop();
		drawChart();
	}else if(!$(this).hasClass("recorded")){
		$('#analyser-wrapper').removeClass('hidden');
		$(this).addClass("recording");

		voice = new Wad({
			source: 'mic',
			filter: [
				// {type : 'lowpass', frequency : 350},
				// {type : 'highpass', frequency : 50}
			]
			// reverb  : {
			//     wet : .4
			// },
			// panning : -.2
		});

		if(!navigator.getUserMedia){
			navigator.getUserMedia = navigator.webkitGetUserMedia || navigator.mozGetUserMedia;
		}
		if(!navigator.cancelAnimationFrame){
			navigator.cancelAnimationFrame = navigator.webkitCancelAnimationFrame || navigator.mozCancelAnimationFrame;
		}
		if(!navigator.requestAnimationFrame){
			navigator.requestAnimationFrame = navigator.webkitRequestAnimationFrame || navigator.mozRequestAnimationFrame;
		}

		navigator.getUserMedia({
			"audio": {
				"mandatory": {
					"googEchoCancellation": "false",
					"googAutoGainControl": "false",
					"googNoiseSuppression": "false",
					"googHighpassFilter": "false"
				},
				"optional": []
			},
		}, function(stream){
			console.log(stream);
			recordingSteam = stream;
			gotStream(stream);

			audioRecorder.clear();
			audioRecorder.record();
			recording = true;

			tuner = new Wad.Poly();
			tuner.setVolume(0) // mute the tuner to avoid feedback
			tuner.add(voice);

			voice.play();
			tuner.updatePitch();/**/
		}, function(e){
			alert('Error getting audio');
			console.log(e);
		});

		// start recording
		/*if(!audioRecorder){
			return;
		}*/

		// wadi();
	}else{
		// saveAudio();
	}
});

function convertToMono(input){
	var splitter = audioContext.createChannelSplitter(2);
	var merger = audioContext.createChannelMerger(2);

	input.connect(splitter);
	splitter.connect(merger, 0, 0);
	splitter.connect(merger, 0, 1);
	return merger;
}

function cancelAnalyserUpdates(){
	window.cancelAnimationFrame(rafID);
	rafID = null;
}

function updateAnalysers(time){
	// console.log(time);
	if(!analyserContext){
		var canvas = document.getElementById("analyser");
		canvasWidth = canvas.width;
		canvasHeight = canvas.height;
		analyserContext = canvas.getContext('2d');
	}

	if(tuner && recording){
		if(tuner.pitch > 50 && tuner.pitch < 280){
			if(frequencyOccurances[tuner.pitch]){
				frequencyOccurances[tuner.pitch] = frequencyOccurances[tuner.pitch] + 1;
			}else{
				frequencyOccurances[tuner.pitch] = 1;
			}

			steps.push(tuner.pitch)
			/*total += tuner.pitch;
			average = Math.round(total / steps.length);
			console.log(total, steps.length);

			document.getElementById('average-val').innerHTML = average;
			document.getElementById('median-val').innerHTML = steps[Math.round(steps.length / 2)];
			document.getElementById('range-val').innerHTML = highest - lowest;
			document.getElementById('mode-val').innerHTML = getMode(steps);

			if(tuner.pitch < lowest){
				lowest = tuner.pitch;
				document.getElementById('lowest-val').innerHTML = lowest;
			}
			if(tuner.pitch > highest){
				highest = tuner.pitch;
				document.getElementById('highest-val').innerHTML = highest;
			}*/
		}
	}

	// analyzer draw code here
	{
		var SPACING = 3;
		var BAR_WIDTH = 1;
		var numBars = Math.round(canvasWidth / SPACING);
		var freqByteData = new Uint8Array(analyserNode.frequencyBinCount);
		// console.log(freqByteData);

		analyserNode.getByteFrequencyData(freqByteData); 

		analyserContext.clearRect(0, 0, canvasWidth, canvasHeight);
		analyserContext.fillStyle = '#F6D565';
		analyserContext.lineCap = 'round';
		var multiplier = analyserNode.frequencyBinCount / numBars;

		// Draw rectangle for each frequency bin.
		for (var i = 0; i < numBars; ++i){
			var magnitude = 0;
			var offset = Math.floor(i * multiplier);
			// gotta sum/average the block, or we miss narrow-bandwidth spikes
			for (var j = 0; j< multiplier; j++)
				magnitude += freqByteData[offset + j];
			magnitude = magnitude / multiplier;
			var magnitude2 = freqByteData[i * multiplier];
			analyserContext.fillStyle = "hsl(" + Math.round((i*360)/numBars) + ", 100%, 50%)";
			analyserContext.fillRect(i * SPACING, canvasHeight, BAR_WIDTH, -magnitude);
		}
	}
	
	rafID = window.requestAnimationFrame(updateAnalysers);
}

function toggleMono(){
	if(audioInput != realAudioInput){
		audioInput.disconnect();
		realAudioInput.disconnect();
		audioInput = realAudioInput;
	}else{
		realAudioInput.disconnect();
		audioInput = convertToMono(realAudioInput);
	}

	audioInput.connect(inputPoint);
}

function gotStream(stream){
	inputPoint = audioContext.createGain();

	// Create an AudioNode from the stream.
	realAudioInput = audioContext.createMediaStreamSource(stream);
	audioInput = realAudioInput;
	audioInput.connect(inputPoint);

	// audioInput = convertToMono(input);

	analyserNode = audioContext.createAnalyser();
	analyserNode.fftSize = 2048;
	inputPoint.connect(analyserNode);

	audioRecorder = new Recorder(inputPoint);

	zeroGain = audioContext.createGain();
	zeroGain.gain.value = 0.0;
	inputPoint.connect(zeroGain);
	zeroGain.connect(audioContext.destination);
	updateAnalysers();
}

function initAudio(){
	if(!navigator.getUserMedia)
		navigator.getUserMedia = navigator.webkitGetUserMedia || navigator.mozGetUserMedia;
	if(!navigator.cancelAnimationFrame)
		navigator.cancelAnimationFrame = navigator.webkitCancelAnimationFrame || navigator.mozCancelAnimationFrame;
	if(!navigator.requestAnimationFrame)
		navigator.requestAnimationFrame = navigator.webkitRequestAnimationFrame || navigator.mozRequestAnimationFrame;

	navigator.getUserMedia({
		"audio": {
			"mandatory": {
				"googEchoCancellation": "false",
				"googAutoGainControl": "false",
				"googNoiseSuppression": "false",
				"googHighpassFilter": "false"
			},
			"optional": []
		},
	}, gotStream, function(e){
		// alert('Error getting audio');
		console.log(e);
	});
}

function drawBuffer(width, height, context, data){
	var step = Math.ceil( data.length / width );

	var amp = height / 2;
	context.fillStyle = "silver";
	context.clearRect(0,0,width,height);

	for(var i=0; i < width; i++){
		var min = 1.0;
		var max = -1.0;

		for (j=0; j<step; j++) {
			var datum = data[(i*step)+j]; 
			if (datum < min)
				min = datum;
			if (datum > max)
				max = datum;
		}

		context.fillRect(i,(1+min)*amp,1,Math.max(1,(max-min)*amp));
	}
}

function getMode(arr){
	var numMapping = {};
	var greatestFreq = 0;
	var mode;

	arr.forEach(function(number){
		numMapping[number] = (numMapping[number] || 0) + 1;

		if (greatestFreq < numMapping[number]){
			greatestFreq = numMapping[number];
			mode = number;
		}
	});

	return +mode;
}

function drawChart(){
	var ctx = document.getElementById("statsChart").getContext("2d");

	var dataset = {};
	for(var key in frequencyOccurances){
		if(frequencyOccurances[key] >= 10){
			dataset[key] = frequencyOccurances[key];
		}
	}

	console.log(Object.keys(frequencyOccurances).length);

	var statsChart = new Chart(ctx, {
		type: "horizontalBar",
		data: {
			labels: Object.keys(dataset),
			reverse: true,
			datasets: [
				{
					label: "Frequency",
					data: Object.values(dataset),
					backgroundColor: ["rgba(113, 88, 203, .15)"],
					borderColor: ["rgba(113, 88, 203, 1)"],
					borderWidth: 1,
					fill: "start"
				}
			]
		},
		options: {
			responsive: true,
			animation: {
				//duration: 250
			},
			tooltips: {
				intersect: false,
				backgroundColor: "rgba(113, 88, 203, 1)",
				titleFontSize: 16,
				titleFontStyle: "400",
				titleSpacing: 4,
				titleMarginBottom: 8,
				bodyFontSize:	12,
				bodyFontStyle:	'400',
				bodySpacing: 4,
				xPadding: 8,
				yPadding: 8,
				cornerRadius: 4,
				displayColors: false,
			},
			title: {
				text: "Pitch Stats",
				display: true
			},
			// Elements options apply to all of the options unless overridden in a dataset
			// In this case, we are setting the border of each horizontal bar to be 2px wide
			elements: {
				rectangle: {
					borderWidth: 2,
				}
			},
			legend: {
				position: 'right',
			},
		}
	});
}

// window.addEventListener('load', initAudio);
