var passport = require('passport');
var session = require('cookie-session');
var Account = require('./models/account');
var router = require('express').Router();
var pty = require('pty.js');
var ps = require('ps-node');

var matches = {};
var chatsockets = {};
var chatlog = [];
var keepalive=setInterval(function(){
	for (var i in matches) {
		if (typeof(matches[i].socket!='undefined')) {
			matches[i].socket.ping();
		}
	}
	for (var i in chatsockets) {
		chatsockets[i].ping();
	}
},10000);
var home = '/home/angbandlive';

router.get('/', function(req, res) {
	var livematchinfo;
	livematches = Object.keys(matches);
	res.render('index', {title:'GwaRL.xyz', user: req.user, livematches: livematches});
});

router.post('/newgame', function(req, res) {
	res.setHeader('Access-Control-Allow-Credentials', 'true');
	var user = req.user.username;
	console.log(req.query);
	var game = req.query.game;
	var panels = req.query.panels;
	var cols = parseInt(req.query.cols);
	var rows = parseInt(req.query.rows);
	var silwindows = '-b';
	if (panels>1) silwindows = '-n'+panels;
	var path = home+'/games/'+game;
	var args = [];
	var terminfo='xterm-256color';
	console.log(user+' wants to play '+game);
	switch (game) {
		case 'poschengband':
		case 'angband':
		case 'faangband':
			args = [
				'-u'+user,
				'-duser='+home+'/public/user/'+user+'/'+game,
				'-mgcu',
				'--',
				'-n'+panels
			];
		break;
		case 'sil':
			args = [
				'-u'+user,
				'-dapex='+home+'/var/games/'+game+'/apex',
				'-duser='+home+'/public/user/'+user+'/'+game,
				'-dsave='+home+'/public/user/'+user+'/'+game+'/save',
				'-mgcu',
				'--',
				silwindows
			];
		break;
		case 'borg':
			args = [
				'-u'+user,
				'-d'+home+'/public/user/'+user
			];
		break;
		default:
		break;
	}
	console.log('Creating terminal');
	var term = pty.fork(path, args, {
		name: terminfo,
		cols: cols,
		rows: rows,
		cwd: process.env.HOME
	});
	var match = {
		term: term
	}
	matches[user] = match;
	console.log('Created terminal with PID: ' + term.pid);
	res.end();
});

router.ws('/play', function (ws, req) {
	var player = req.user.username;
	matches[player].socket=ws;
	var term = matches[player].term;
	term.on('data', function(data) {
		try {
			ws.send(data);
		} catch (ex) {
			// The WebSocket is not open, ignore
		}
	});
	ws.on('message', function(msg) {
		term.write(msg);
	});
	ws.on('close', function () {
		if (player!='borg'){
			term.kill();
			//kill the process if it hasn't already
			ps.lookup({ pid: term.pid }, function(err, resultList ) {
				if (err) {
					throw new Error( err );
				}
				var process = resultList[ 0 ];
				if( process ){
					ps.kill( term.pid, function( err ) {
						if (err) {
							console.log( err );
						} else {
							console.log( 'Process %s did not exit and has been forcibly killed!', term.pid );
						}
					});				
				}
				else {
					console.log( 'No such process found!' );
				}
			});
			console.log('Closed terminal ' + term.pid);
			// Clean things up
			delete matches[player];
		}
	});
	term.write(' ');
	console.log('Connected to terminal ' + term.pid);
});

router.ws('/spectate', function (ws, req) {
	var player = req.query.watch;
	var term = matches[player].term;
	if (typeof(term)!='undefined'){
		term.on('data', function(data) {
			try {
				ws.send(data);
			} catch (ex) {
				// The WebSocket is not open, ignore
			}
		});
	}
});

router.ws('/chat', function (ws, req) {
	if (typeof(req.user.username)!='undefined'){
		for (var i in chatlog){
			ws.send(chatlog[chatlog.length-i-1]);
		}
		chatsockets[req.user.username] = ws;
		chatsockets[req.user.username].on('message', function(msg) {
			chatlog.unshift(req.user.username+': '+msg);
			while (chatlog.length>20) {
				chatlog.pop();
			}
			for (var i in chatsockets){
				chatsockets[i].send(req.user.username+': '+msg);
			}
		});
		chatsockets[req.user.username].on('close', function() {
			delete chatsockets[req.user.username];
		});
	}
});

router.post('/signin', 
	function(req, res, next) {
		Account.find({username:req.body.username},function(err, result){
			if (result.length>0){
				next();
			} else {
				if (req.body.username.match(/^[a-zA-Z0-9_]+$/).length>0) {
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

router.get('/logout', function(req, res) {
  req.logout();
  res.redirect('/');
});

module.exports = router;