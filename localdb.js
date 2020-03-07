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
const DEFAULT_ROLES = ["basic"];


/* SHEMAS

   users: [{
      name          : string,
      password_hash : string,
      role          : [string],
      registered    : datetime,
      last_visited  : datetime,
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
   authenticate(username, password, function(error, user, more_info) {
      console.log("..verified as", error, user, more_info);
      return done(error, user, more_info);
   });
};


module.exports.serializeUser = function(user, done) {
   // console.log("serializing", user.name);
   return done(null, user.name);
};


module.exports.deserializeUser = function(name, done) {
   // console.log("attempting to deserialize user", name);
   var user = findUserByName(name);
   // console.log("..deserialized", user ? user.name : "user not found!!!");
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



// ============================================================================
// CHAT RELATED FUNCTIONS
// ============================================================================

// add new message
module.exports.pushMessage = function(user, message) {

   // check and trim if there are too many messages already
   var messages = db.chat.get("data").orderBy("timestamp", "asc").value();
   if(messages.length > config.chat_max_messages) {
      console.log("localdb: chat is too big, trimming messages");
      db.chat
         .set("data", messages.slice(config.chat_max_messages - 10, messages.length))
         .write();
   }

   // add new message
   return db.chat
      .get("data")
      .push({
         user      : typeof user === "string" ? user : user.name,
         extra     : typeof user === "string" ? []   : user.roles,
         message   : message,
         timestamp : + new Date()
      })
      .write();
}


// gets last N messages
module.exports.readMessages = function(limit) {
   return db.chat.get("data")
      .orderBy("timestamp", "desc")
      .take(limit)
      .orderBy("timestamp", "asc")
      .value();
}



//user roles
module.exports.addRole = function(role,user) {
   var roles = db.users.get("data").find({name: user}).value().roles;
   if (!(roles.includes(role))) roles.push(role);
   db.users.get("data").find({name: user}).assign({roles: roles}).write();
   return roles;
}

module.exports.unBanAll = function() {
	var users = db.users.get("data").value();
	for (var i=0; i<users.length; i++){ 
		for (var j=0; j<users[i].roles.length; j++){
			if (["mute","banned"].includes(users[i].roles[j])) {
				users[i].roles.splice(j, 1); 
				j--;
			}
		}
		db.users.get("data").find({name: users[i].name}).assign({roles: users[i].roles}).write();
	}
}

module.exports.checkRole = function(role,user) {
   var roles = db.users.get("data").find({name: user}).value().roles;
   return roles.includes(role);
}

module.exports.fetchGames = function() {
	return db.games.value().data;
}

module.exports.setVersionString = function(game,longname) {
	db.games.get("data").find({name: game}).assign({longname: longname}).write();
	return longname;
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
   db.chat.read();
   // db.sessions.read();
};



// update last_connected for user
function updateLastConnected(name) {
   var now = + new Date();
   
   db.users
      .get("data")
      .find({name: name})
      .assign({last_connected: now})
      .write();

   return now;
}
module.exports.updateLastConnected = updateLastConnected;



// update last_disconnected for user
function updateLastDisconnected(name) {
   var now = + new Date();
   
   db.users
      .get("data")
      .find({name: name})
      .assign({last_disconnected: now})
      .write();

   return now;
}
module.exports.updateLastDisconnected = updateLastDisconnected;



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
 *       "bad username/password" when username/password check failed
 * */
function authenticate(username, password, callback) {

   console.log("authenticating user", username);

   // find user
   var user = db.users.get("data").find({name: username}).value();
   
   // user does not exist, create one
   if(!user) {
      // abort if username is too short or too long
      if(username.length < 3 || username.length > 25)
         return callback(null, null, "bad username/password");
      
      // username should have only english a-zA-Z0-9 characters
      if(!new RegExp(/^[a-zA-Z0-9_]*$/).test(username))
         return callback(null, null, "bad username/password");

      // abort if password is too short
      if(password.length < 8)
         return callback(null, null, "bad username/password");

      bcrypt.hash(password, SALT_ROUNDS, function(error, hashed_password) {
         if(error)
            return callback(error, null);
            
         var new_user = {
            name           : username,
            password_hash  : hashed_password,
            roles          : DEFAULT_ROLES,
            registered     : + new Date(),
            last_connected : + new Date()
         };
         db.users.get("data").push(new_user).write();
         callback(null, new_user, "new");
      });
   }
   
   // user exist
   else {
      // check if user is not banned
      if(user.roles.indexOf("banned") !== -1) {
         console.warn(`Banned user ${user.name} tried to log in`);
         return callback(null, null, "banned");
      }

      // if not compare password hashes
      bcrypt.compare(password, user.password_hash, function(error, they_match) {
         if(error)
            return callback(error, null);
         if(they_match) {
            // update last_visited in database
            var now = updateLastConnected(username);
            user.last_connected = now;
            return callback(null, user, "ok");
         }
         else
            return callback(null, null, "wrong password");
      });
   }
}