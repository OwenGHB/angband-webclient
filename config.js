/* global process require Object console */
// Provides default configurations that can be overridden by setting environment variable.

var path = require('path'); // The path module will build OS independent paths
var util = require('util'); // Used for printf style format function
var fs = require('fs');
var config = {};

// Defines the list of games that can be played and the path to their binaries.
// Defaults are specified here, but if a file exists at $ANGBAND_WC_LOCAL_CONF
// it will be read and used to override the values here.

{
	let defaultSavePath = path.join(process.env.HOME, 'public', 'user');
	// Angband, Poschengband and Faangband use the same path
	config.games = {
		angband: {
			binPath: path.join(process.env.HOME, 'games', 'angband'),
			savePath: defaultSavePath
		},
		poschengband: {
			binPath: path.join(process.env.HOME, 'games', 'poschengband'),
			savePath: defaultSavePath
		},
		faangband: {
			binPath: path.join(process.env.HOME, 'games', 'faangband'),
			savePath: defaultSavePath
		},
		sil: {
			binPath: path.join(process.env.HOME, 'games', 'sil'),
			savePath: defaultSavePath,
			apexPath: path.join(process.env.HOME, 'var', 'games', 'sil', 'apex')
		},
		borg: {
			binPath: path.join(process.env.HOME, 'games', 'borg'),
			savePath: defaultSavePath
		}
	};
}

if (process.env.ANGBAND_WC_LOCAL_CONF && fs.existsSync(process.env.ANGBAND_WC_LOCAL_CONF)) {
	// read the local conf file and pull in the overrides
	console.log('Loading local conf');
	var localConf = require(process.env.ANGBAND_WC_LOCAL_CONF);
	config = Object.assign(config, localConf);
	console.log(config);
}

module.exports = config;
