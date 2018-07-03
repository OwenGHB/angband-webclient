var lowdb    = require("lowdb");
var FileSync = require("lowdb/adapters/FileSync");
var bcrypt   = require("bcrypt");
var config   = require("./config");


var db       = {
   games    : lowdb(new FileSync("./db/games.json")),
   news     : lowdb(new FileSync("./db/news.json")),
   chat     : lowdb(new FileSync("./db/chat.json")),
   users    : lowdb(new FileSync("./db/users.json"))
};
var SALT_ROUNDS   = 5;
var DEFAULT_ROLES = ["basic"];


/* SHEMAS

   users: [{
      name          : string,
      password_hash : string,
      role          : [string]
   }]

   news: [{
      title: string,
      timestamp: string,
      content: string
   }]
   
   games: [{
      name: String,
      longname: String,
      desc: String,
      longdesc: String,
      restrict_paths: Boolean,
      data_paths: Array,
      args: Array
   }]

*/
// set default data if db files are empty
db.games .defaults({data:[]}).write();
db.news  .defaults({data:[]}).write();
db.users .defaults({data:[]}).write();
db.chat  .defaults({data:[]}).write();


// export db object
module.exports.db = db;



// AUTEHNTICATION
module.exports.verifyWithLocalDb = function(username, password, done) {
   console.log("localdb verifyWithLocalDb: checking with", username, password);
   authenticate(username, password, function(error, user, more_info) {
      console.log("..verified as", error, user, more_info);
      return done(error, user, more_info);
   });
};


module.exports.serializeUser = function(user, done) {
   console.log("serializing", user.name);
   return done(null, user.name);
};


module.exports.deserializeUser = function(name, done) {
   console.log("attempting to deserialize user", name);
   var user = findUserByName(name);
   console.log("..deserialized", user ? user.name : "user not found!!!");
   if(user)
      return done(null, user);
   else
      return done(null, null);
};



// middlewares
module.exports.isUserLoggedIn = function(req, res, next) {
   if(req.user) {
      return next(); 
   }
   req.logout();
   res.clearCookie('session');
   res.redirect("/");
};


// CHAT RELATED FUNCTIONS
module.exports.pushMessage = function(user, message) {

   // check and trim if there are too many messages already
   var messages = db.chat.get("data").orderBy("timestamp", "asc").value();
   if(messages.length > config.chat_max_messages) {
      db.chat
         .set("data", messages.slice(config.chat_max_messages - 10, messages.length))
         .write();
   }

   // get last N messages
   return db.chat
      .get("data")
      .push({
         user      : user.name,
         extra     : user.roles,
         message   : message,
         timestamp : + new Date()
      })
      .write();
}

module.exports.readMessages = function(limit) {
   return db.chat.get("data")
      .orderBy("timestamp", "desc")
      .take(limit)
      .orderBy("timestamp", "asc")
      .value();
}







// get last 10 news
function getNews() {
   return db.news
      .get("data")
      .orderBy("timestamp", "desc")
      .take(20)
      .value();
}
module.exports.getNews = getNews;


// state update
module.exports.refresh = function() {
   db.games.read();
   db.news.read();
   db.users.read();
   // db.sessions.read();
};




// UTILITY FUNCTIONS
function findUserByName(name) {
   return db.users.get("data").find({name: name}).value();
}


/**
 * username: `string`
 * password: `string`
 * callback: `function(error, user, additional_info)`
 *    error
 *       `null` if no errors
 *       `string` if some error occured during authentication
 *    user
 *       `null` if authentication failed (wrong username/password pair)
 *       `object` object with user data according to schema
 *    additional_info: can be one of:
 *       `null` - when some error occured
 *       "new" when username was not found in db and new user was created
 *       "ok" when username and password matched ones in db
 *       "no match" when username/password pair had no match in db or password was incorrect
 * */
function authenticate(username, password, callback) {
   var user = db.users.get("data").find({name: username}).value();
   
   // user does not exist, create one
   if(!user) {
      bcrypt.hash(password, SALT_ROUNDS, function(error, hashed_password) {
         if(error)
            return callback(error, null);
            
         var new_user = {
            name          : username,
            password_hash : hashed_password,
            roles         : DEFAULT_ROLES
         };
         db.users.get("data").push(new_user).write();
         callback(null, new_user, "new");
      });
   }
   
   // user exist, check password hashes
   else {
      bcrypt.compare(password, user.password_hash, function(error, they_match) {
         if(error)
            return callback(error, null);
         if(they_match)
            return callback(null, user, "ok");
         else
            return callback(null, null, "wrong password");
      });
   }
}