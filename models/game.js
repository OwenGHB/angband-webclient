var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var Game = new Schema({
  name: String,
  longname: String,
  desc: String,
  longdesc: String,
  paths: Array[String]
});

module.exports = mongoose.model('Account', Account);