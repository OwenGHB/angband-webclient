var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var Game = new Schema({
  name: String,
  longname: String,
  desc: String,
  longdesc: String,
  restrict_paths: Boolean,
  data_paths: Array[String],
  args: Array[String]
});

module.exports = mongoose.model('Game', Game);