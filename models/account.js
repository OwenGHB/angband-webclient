var mongoose              = require('mongoose');
var Schema                = mongoose.Schema;
var passportLocalMongoose = require('passport-local-mongoose');


var Account = new Schema({
   // nickname: String, // not needed right now
   isWinner: { type: Boolean, default: false }
});



Account.plugin(passportLocalMongoose);
module.exports = mongoose.model('Account', Account);
