
var Promise = require('native-or-bluebird');
var pngparse = require('pngparse');
var sharp = require('sharp');

var DEFAULT_HASH_SIZE = 8;
var PIXEL_LENGTH = 4;

module.exports = function(path, callback, hashSize) {
	if (typeof callback === 'number') {
		hashSize = callback;
		callback = null;
	}
	var height = hashSize || DEFAULT_HASH_SIZE;
	var width = height + 1;
	// Covert to small gray image
	var stream = sharp(path)
		.grayscale()
		.resize(width, height)
		.png();
	// png parse is stupid
	stream.destroy = noop;

	var promise = new Promise(function (resolve, reject) {
		pngparse.parseStream(stream, function (err, data) {
			/* istanbul ignore if */
			if (err) return reject(err);
			resolve(data.data);
		})
	}).then(function (pixels) {
		// Compare adjacent pixels.
		var difference = '';
		for (var row = 0; row < height; row++) {
			for (var col = 0; col < height; col++) { // height is not a mistake here...
				var left = px(pixels, width, col, row);
				var right = px(pixels, width, col + 1, row);
				difference += left < right ? 1 : 0;
			}
		}
		return binaryToHex(difference);
	})

	if (typeof callback === 'function') {
		promise.then(function (res) {
			callback(null, res);
		}, callback);
	}

	return promise;
};

// TODO: move to a separate module
function binaryToHex(s) {
	var output = '';
	for (var i = 0; i < s.length; i += 4) {
		var bytes = s.substr(i, 4);
		var decimal = parseInt(bytes, 2);
		var hex = decimal.toString(16);
		output += hex;
	}
	return new Buffer(output, 'hex');
}

function px(pixels, width, x, y) {
	return pixels[width * PIXEL_LENGTH * y + x * PIXEL_LENGTH];
}

function noop() {}
