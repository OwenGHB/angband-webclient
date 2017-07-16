var express = require('express');
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var session = require('cookie-session');
var bodyParser = require('body-parser');
var terminal = require('term.js');
var app = express();
var expressWs = require('express-ws')(app);
var mongoose = require('mongoose');
var passport = require('passport');
var awc = require('./lib.js');
var LocalStrategy = require('passport-local').Strategy;
var Account = require('./models/account');

//set up our pinging
setInterval(function(){awc.keepalive()},10000);

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

// uncomment after placing your favicon in /public
//app.use(favicon(__dirname + '/public/favicon.ico'));
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: false}));
app.use(cookieParser());
app.use(session({name: 'session',keys: ['air', 'fire', 'water']}));

app.use(express.static(path.join(__dirname, 'public')));

// Configure passport middleware
app.use(passport.initialize());
app.use(passport.session());

// Terminal middleware
app.use(terminal.middleware());

// Configure passport-local to use account model for authentication
var Account = require('./models/account');
passport.use(new LocalStrategy(Account.authenticate()));

passport.serializeUser(Account.serializeUser());
passport.deserializeUser(Account.deserializeUser());

// Connect mongoose
mongoose.connect('mongodb://localhost/bandit', function(err) {
  if (err) {
    console.log('Could not connect to mongodb on localhost. Ensure that you have mongodb running on localhost and mongodb accepts connections on standard ports!');
  }
});

// Register routes
app.get('/', function(req, res) {
	res.render('index', {title:'GwaRL.xyz', user: req.user});
});

app.post('/newgame', function(req, res) {
	res.setHeader('Access-Control-Allow-Credentials', 'true');
	var user = req.user;
	var query = req.query;
	var game = query.game;
	var panels = query.panels;
	var cols = parseInt(query.cols);
	var rows = parseInt(query.rows);
	var message = {eventtype:'newgame',content:{game:game,panels:panels,dimensions:{cols:cols,rows:rows}}};
	awc.respond(user,message);
	res.end();
});

app.ws('/play', function (ws, req) {
	var user = req.user;
	var message = {eventtype:'connectplayer',content:{ws:ws}};
	awc.respond(user,message);
});

app.ws('/spectate', function (ws, req) {
	var player = req.query.watch;
	var message = {eventtype:'subscribe',content:{player:player, ws:ws}};
	awc.respond(user,message);
});

app.ws('/meta', function (ws, req) {
	if (typeof(req.user.username)!='undefined'){
		awc.welcome(req.user, ws);
	}
});

app.post('/signin', 
	function(req, res, next) {
		Account.find({username:req.body.username},function(err, result){
			if (result.length>0){
				next();
			} else {
				if (req.body.username.match(/^[a-zA-Z_]+$/)!=null) {
					Account.register(new Account({username: req.body.username}), req.body.password, function(err) {
						if (err) {
							console.log('error while user register!', err);
							return next(err);
						}
						console.log('user registered!');
						next();
					});
				} else {
					next();
				}
			}
		});
	},
	passport.authenticate('local'),
	function(req, res) {
		res.redirect('/');
	}
);

app.get('/logout', function(req, res) {
  req.logout();
  res.redirect('/');
});

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  var err = new Error('Not Found');
  err.status = 404;
  next(err);
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

module.exports = app;
