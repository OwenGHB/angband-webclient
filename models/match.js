var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var Match = new Schema({
	player: String,
	game: String
});

module.exports = mongoose.model('Match', Match);