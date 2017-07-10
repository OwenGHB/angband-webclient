var express = require('express');
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var session = require('cookie-session');
var bodyParser = require('body-parser');
var terminal = require('term.js');
var pty = require('pty.js');
var ps = require('ps-node');
var fs = require('fs-extra');
var app = express();
var expressWs = require('express-ws')(app);
var mongoose = require('mongoose');
var passport = require('passport');
var LocalStrategy = require('passport-local').Strategy;
var Account = require('./models/account');

//some of our variables
var matches = {};
var metasockets = {};
var chatlog = [];
var keepalive=setInterval(function(){
	var matchlist=getmatchlist();
	for (var i in matches) {
		if (typeof(matches[i].socket)!='undefined') {
			try {
				matches[i].socket.ping();
			} catch (ex) {
				
			}
			if (matches[i].idle) {
				matches[i].idletime++;
			} else {
				matches[i].idletime=0;
			}
			matches[i].idle=true;
			if (matches[i].idletime>60) {
				matches[i].socket.close();
			} else {
				for (var j in matches[i].spectators) {
					try {
						matches[i].spectators[j].ping();
					} catch (ex) {
						
					}
				}
			}
		}
	}
	for (var i in metasockets) {
		try {
			metasockets[i].ping();
			metasockets[i].send(JSON.stringify({eventtype: 'matchupdate', content: matchlist}));
		} catch (ex) {
			// The WebSocket is not open, ignore
		}
	}
},10000);
var home = '/home/angbandlive';
//lazy hack because I promised Lina a purple name if she won
var winners = [
	'LinaButterfly',
	'Ingwe_Ingweron',
	'Serinus_Serinus'
];
var silwinners = [
	'wobbly'
];

//things to put elsewhere
function gettermdesc(user,game,panels){
	var compgame = 'angband';
	var compnumber = '207';
	var panelarg = '-b';
	if (panels>1) panelarg = '-n'+panels;
	var path = home+'/games/'+game;
	var args = [];
	var terminfo='xterm-256color';
	console.log(user+' wants to play '+game);
	switch (game) {
		case 'sangband':
		case 'steamband':
		case 'zangband':
		case 'tome':
		case 'oangband':
		case 'unangband':
		case 'poschengband':
		case 'angband':
		case 'faangband':
			args = [
				'-u'+user,
				'-duser='+home+'/public/user/'+user+'/'+game,
				'-mgcu',
				'--',
				panelarg
			];
		break;
		case 'competition':
			args = [
				'-u'+compnumber+'-'+user,
				'-duser='+home+'/public/user/'+user+'/'+compgame,
				'-mgcu',
				'--',
				panelarg
			];
		break;
		case 'sil':
			args = [
				'-u'+user,
				'-dapex='+home+'/var/games/'+game+'/apex',
				'-duser='+home+'/public/user/'+user+'/'+game,
				'-dsave='+home+'/var/games/'+game+'/save',
				'-mgcu',
				'--',
				panelarg
			];
		break;
		case 'borg':
			args = [
				'-u'+user,
				'-d'+home+'/public/user/'+user+'/'+game,
			];
		break;
		case 'nppangband':
			args = [
				'-u'+user,
				'-d'+home+'/public/user/'+user+'/'+game,
				'-sang',
				'-mgcu',
				'--',
				panelarg
			];
		break;
		case 'nppmoria':
			args = [
				'-u'+user,
				'-d'+home+'/public/user/'+user+'/'+game,
				'-smor',
				'-mgcu',
				'--',
				panelarg
			];
		break;
		case 'umoria':
			args = [
				home+'/var/games/umoria/'+user
			];
		break;
		default:
		break;
	}
	var termdesc = {};
	if (game=='competition'){
		console.log('competition entry');
		var newattempt = true;
		var newtty = false;
		var savegames = fs.readdirSync(home+'/var/games/'+compgame+'/save');
		if (savegames.includes(compnumber+'-'+user)){
			var playerfile = home+'/var/games/'+compgame+'/save/'+compnumber+'-'+user;
			newattempt = !isalive(playerfile);
		}
		var ttydir = fs.readdirSync(home+'/public/user/'+user);
		var ttyfile = home+'/public/user/'+user+'/'+compnumber+'-'+user+'.ttyrec';
		if (ttydir.includes(ttyfile)){
			newtty=true;
		}
		var command = home+'/games/'+compgame+' '+args.join(' ');
		path = 'ttyrec';
		args = [
			'-e',
			command,
			ttyfile
		];
		if (!newattempt) {
			if (!newtty) args.unshift('-a');
		} else {
			fs.copySync(home+'/var/games/'+compgame+'/save/'+compnumber, home+'/var/games/'+compgame+'/save/'+compnumber+'-'+user);
		}
	}
	termdesc = {
		path:path,
		args:args,
		terminfo: terminfo
	};
	return termdesc;
}
function isalive(playerfile){
	var alive = true;
	var file = fs.openSync(playerfile, 'r');
	var buffer = new Buffer(36);
	fs.readSync(file, buffer, 0, 36, 36);
	var headertext = buffer.toString('utf8');
	if (headertext.match(/\sdead\s/)!=null){
		alive = false;
	}
	console.log(headertext);
	console.log(alive.toString());
	return alive;
}
function getmatchlist(){
	var livematches = {};
	for (var i in matches){
		livematches[i] = {
			game: matches[i].game,
			idletime: matches[i].idletime
		};
	}
	return livematches;
}

function getfilelist(){
	if (typeof(req.user)!='undefined'){
        var files = {};
        var users = fs.readdirSync(home+'/public/user/');
        if (users.includes(req.user.username)){
            var path = home+'/public/user/'+req.user.username+'/';
            var ls = fs.readdirSync(path);
            for (var i in ls){
				var dumps = [];
				if (ls[i].match(/^[a-zA-Z0-9_]+$/)){
					var varfiles = fs.readdirSync(path+ls[i]);
					for (var j in varfiles){
							if (varfiles[j].match(/\.([hH][tT][mM][lL]|[tT][xX][tT])/)) dumps.push(varfiles[j]);
					}
					files[ls[i]]=dumps;
				}
			}
        }
		return files;
	}
}

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
	var user = req.user.username;
	var query = req.query;
	var game = query.game;
	var panels = query.panels;
	var cols = parseInt(query.cols);
	var rows = parseInt(query.rows);
	if (typeof(matches[user])=='undefined'){
		var termdesc = gettermdesc(user,game,panels);
		console.log(termdesc);
		var term = pty.fork(termdesc.path,termdesc.args,{
			name: termdesc.terminfo,
			cols: cols,
			rows: rows,
			cwd: process.env.HOME
		});
		console.log('Created terminal with PID: ' + term.pid);
		var match = {
			term: term,
			game: query.game,
			idle: false,
			idletime: 0,
			spectators: {}
		}
		matches[user] = match;
	} else {
		console.log('Using existing process with PID: ' + matches[user].term.pid);
	}
	for (var i in metasockets){
		try {
			metasockets[i].send(JSON.stringify({eventtype: 'userstatus', content: req.user.username+' started playing '+game}));
			metasockets[i].send(JSON.stringify({eventtype: 'matchupdate', content: getmatchlist()}));
		} catch (ex) {
			// The WebSocket is not open, ignore
		}
	}
	res.end();
});

app.ws('/play', function (ws, req) {
	var player = req.user.username;
	matches[player].socket=ws;
	var term = matches[player].term;
	term.on('data', function(data) {
		try {
			ws.send(data);
		} catch (ex) {
			// The WebSocket is not open, ignore
		}
		if (typeof(matches[player])!='undefined') for (var i in matches[player].spectators) {
			try {
				matches[player].spectators[i].send(data);
			} catch (ex) {
				// The WebSocket is not open, ignore
			}
		}
	});
	ws.on('message', function(msg) {
		term.write(msg);
		matches[player].idle=false;
	});
	ws.once('close', function () {
		if (player!='borg'){
			console.log('Closing terminal for' + player);
			//kill the process if it hasn't already
			//horrific reverse engineering hack here
			if (matches[player].game=='competition'){
				var gamepid=parseInt(term.pid)+3;
			} else {
				var gamepid=term.pid;
			}
			ps.lookup({ pid: gamepid }, function(err, resultList ) {
				if (err) {
					console.log( err );
				}
				var process = resultList[ 0 ];
				if( process ){
					ps.kill( gamepid, function( err ) {
						if (err) {
							console.log( err );
						} else {
							console.log( 'Process %s did not exit and has been forcibly killed!', gamepid );
						}
					});				
				}
				else {
					console.log( 'Process %s was not found, expect user exited cleanly.',player );
				}
			});
			//now kill the pty
			term.kill();
			// Clean things up
			delete matches[player];
			for (var i in metasockets){
				try {
					metasockets[i].send(JSON.stringify({eventtype: 'matchupdate', content: getmatchlist()}));
				} catch (ex) {
					// The WebSocket is not open, ignore
				}
			}
		}
	});
	term.write(' ');
	console.log(player + ' started a game');
});

app.ws('/spectate', function (ws, req) {
	var player = req.query.watch;
	var term = matches[player].term;
	if (typeof(term)!='undefined'&&typeof(req.user)!='undefined') {
		var spectator = req.user.username;
		metasockets[player].send(JSON.stringify({eventtype: 'spectatorinfo', content: spectator+" is now watching"}));
		matches[player].spectators[spectator]=ws;
		ws.once('close', function() {
			try {
				metasockets[player].send(JSON.stringify({eventtype: 'spectatorinfo', content: spectator+" is no longer watching"}));
			} catch (ex) {
				// The WebSocket is not open, ignore
			}
			if (typeof(matches[player])!='undefined') delete matches[player].spectators[spectator];
		});
	}
});
app.ws('/replay', function(ws, req){
	
});

app.ws('/meta', function (ws, req) {
	if (typeof(req.user.username)!='undefined'){
		metasockets[req.user.username] = ws;
		try {
			for (var i in chatlog){
				ws.send(chatlog[chatlog.length-i-1]);
			}
			ws.send(JSON.stringify({eventtype: 'matchupdate', content: getmatchlist()}));
			ws.send(JSON.stringify({eventtype: 'fileupdate', content: getfilelist()}));
			ws.send(JSON.stringify({eventtype: 'usercount', content: 'Users online: '+Object.keys(metasockets).length}));
		} catch (ex) {
			// The WebSocket is not open, ignore
		}
		for (var i in metasockets){
			try {
				metasockets[i].send(JSON.stringify({
					eventtype: 'usercount', content: 'Users online: '+Object.keys(metasockets).length
				}));
			} catch (ex) {
				// The WebSocket is not open, ignore
			}
		}
		metasockets[req.user.username].on('message', function(msg) {
			//should be if (req.user.winner)
			if (winners.includes(req.user.username)){
				var message = JSON.stringify({
					eventtype: 'chat', content: '<span class="playername winner">'+req.user.username+'</span>: '+msg
				});
			} else if (silwinners.includes(req.user.username)){
				var message = JSON.stringify({
					eventtype: 'chat', content: '<span class="playername silwinner">'+req.user.username+'</span>: '+msg
				});
			} else {
				var message = JSON.stringify({
					eventtype: 'chat', content: '<span class="playername">'+req.user.username+'</span>: '+msg
				});
			}
			chatlog.unshift(message);
			while (chatlog.length>20) {
				chatlog.pop();
			}
			for (var i in metasockets){
				try {
					metasockets[i].send(message);
				} catch (ex) {
					// The WebSocket is not open, ignore
				}
			}
		});
		metasockets[req.user.username].once('close', function() {
			delete metasockets[req.user.username];
			for (var i in metasockets){
				try {
					metasockets[i].send(JSON.stringify({eventtype: 'usercount', content: 'Users online: '+Object.keys(metasockets).length}));
				} catch (ex) {
					// The WebSocket is not open, ignore
				}
			}
		});
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
