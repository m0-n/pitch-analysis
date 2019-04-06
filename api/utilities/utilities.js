var path = require('path');

var sendResJSON = function(res, status, content) {
	res.status(status);
	res.json(content);
};

var makeUniqueID = function(codeLength, possibles) {
	codeLength = codeLength || 4;
	possibles = possibles || "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

	var code = "";

	for(var i=0; i < codeLength; i++){
		code += possibles.charAt(Math.floor(Math.random() * possibles.length));
	}
	return code;
};

module.exports.soundsDir = path.join(__dirname, '../../public/sound-files/');

module.exports.sendResJSON     = sendResJSON;
module.exports.makeUniqueID    = makeUniqueID;
