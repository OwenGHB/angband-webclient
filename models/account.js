var mongoose              = require('mongoose');
var Schema                = mongoose.Schema;
var passportLocalMongoose = require('passport-local-mongoose');


var Account = new Schema({
   // nickname: String, // not needed right now
   isWinner: { type: Boolean, default: false },
   isDev: { type: Boolean, default: false }
   // we can probably better make an array of roles and just add roles as class to message
   // like this by default:
   // roles: { type: Array, default: ['basic'] }
   // and
   // winners will have roles: ['basic', 'winner'] for example
});



Account.plugin(passportLocalMongoose);
module.exports = mongoose.model('Account', Account);
