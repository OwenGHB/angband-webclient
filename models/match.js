var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var Match = new Schema({
	player: String,
});

module.exports = mongoose.model('Match', Match);