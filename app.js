var express       = require('express');
var path          = require('path');
// var favicon       = require('serve-favicon');
var logger        = require('morgan');
var cookieParser  = require('cookie-parser');
var session       = require('express-session');
// var store = require('connect-nedb-session')(session);
var NedbStore     = require('nedb-session-store')(session);
var bodyParser    = require('body-parser');
var terminal      = require('term.js');
var app           = express();
var expressWs     = require('express-ws')(app);
// var mongoose      = require('mongoose');
var passport      = require('passport');
var LocalStrategy = require('passport-local').Strategy;
// var fs            = require('fs-extra');
var localdb       = require("./localdb");
var awc           = require('./lib.js');
// var Account       = require('./models/account');

//set up our pinging
setInterval(function() { awc.keepalive(); }, 10000);

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');
// app.set('view engine', 'ejs');

app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: false}));
app.use(cookieParser());
app.use(session({
   name: 'session',
   store: new NedbStore({ filename: "./db/sessions.json"}),
   resave: false,
   secret: process.env.SESSION_SECRET,
   saveUninitialized: false,
   keys: ['air', 'fire', 'water']}
));

app.use(express.static(path.join(__dirname, 'public')));
app.use(express.static('/home/angbandlive/public/user'));

// Configure passport middleware
app.use(passport.initialize());
app.use(passport.session());

// Terminal middleware
app.use(terminal.middleware());

// Configure passport-local to use account model for authentication
// var Account = require('./models/account');


passport.use(new LocalStrategy(localdb.verifyWithLocalDb));
passport.serializeUser(localdb.serializeUser);
passport.deserializeUser(localdb.deserializeUser);

// passport.use(new LocalStrategy(Account.authenticate()));
// passport.serializeUser(Account.serializeUser());
// passport.deserializeUser(Account.deserializeUser());

// Connect mongoose
// const db_url = process.env.MONGODB_URL || 'mongodb://localhost/bandit';
// mongoose.connect(db_url, function(err) {
//  if (err) {
//     return console.error("Could not connect to mongodb. Ensure that you have mongodb running on localhost and mongodb accepts connections on standard ports!");
//  }
//  console.log("database connection established");
// });

// Register routes
app.get('/', function(req, res) {
   var news = localdb.getNews();
	res.render('index.pug', {
	   user: req.user ? req.user.name : null, 
	   news: news
	});
});

app.get("/refresh", function(req, res) {
    localdb.refresh();
    res.send("ok");
});

app.ws('/meta', function (ws, req) {
	if (typeof(req.user.username)!='undefined'){
		awc.welcome(req.user, ws);
	}
});


app.post('/enter', passport.authenticate("local"), function(req, res) {
   console.log("sign in step 3", req.user);
   return res.redirect("/hall");
});

app.get("/hall", function(req, res) {
   console.log("rendering hall");
   return res.render("hall.pug");
});
app.post("/hall", localdb.isLoggedIn, function(req, res) {
   console.log("post rendering hall");
   return res.render("hall.pug");
});



// app.post('/signin', function(req, res, next) {
// 	Account.find({username:req.body.username}, function(err, result) {
// 		if (result.length>0){
// 			next();
// 		} 
// 		else {
// 		   if(req.body.username.length < 3)
// 		      return res.json({error: true, msg:"username too short"});
// 		   if(req.body.username.length > 20)
// 		      return res.json({error: true, msg:"username too long"});
// 			if (req.body.username.match(/^[a-zA-Z_]+$/) != null) {
// 				Account.register(new Account({username: req.body.username}), req.body.password, function(err) {
// 					if (err) {
// 						console.log('error while user register!', err);
// 						return next(err);
// 					}
// 					console.log('user registered!');
// 					next();
// 				});
// 			} 
// 			else {
// 				return res.json({error: true, msg:"username must contain only letters and no spaces"});
// 			}
// 		}
// 	});},
// 	passport.authenticate('local'),
// 	function(req, res) {
// 		// res.redirect('/');
// 		return res.json({error: false, mgs: "ok"});
// 	}
// );

app.get('/logout', function(req, res) {
  req.logout();
  res.redirect('/');
});


// last route in all routes will be treated as "not found" or 404 page
app.use(function(req, res, next) {
  return res.render("404.pug");
});

// error handlers

// development error handler
// will print stacktrace
if (app.get('env') === 'development') {
  app.use(function(err, req, res, next) {
    res.status(err.status || 500);
    res.render('error', {
      message: err.message,
      error: err
    });
  });
}

// production error handler
// no stacktraces leaked to user
app.use(function(err, req, res, next) {
  res.status(err.status || 500);
  res.render('error', {
    message: err.message,
    error: {}
  });
});


// gracefully exit
// process.on("SIGTERM", function () {
//    console.log("SIGTERM terminating app");
//    app.close(function () {
//       process.exit(0);
//    });
// });


var IP = process.env.C9_IP || process.env.IP || "127.0.0.1";
var PORT = process.env.C9_PORT || process.env.PORT || 3000;
var server = app.listen(PORT, IP, function() {
  console.log(`angband.live is is up and running at ${IP} port ${PORT}`);
});


process.on('SIGTERM', function onSigterm() {
   console.info('Got SIGTERM. Graceful shutdown started at', new Date().toISOString());
   // start graceul shutdown here
   server.close(function(err) {
      if (err) {
         console.error(err);
         process.exit(1);
      }
      console.log("..process can now be stopped");
      process.exit();
   });
});