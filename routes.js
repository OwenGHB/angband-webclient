var passport = require('passport');
var session = require('cookie-session');
var Account = require('./models/account');
var Match = require('./models/match');
var router = require('express').Router();
var pty = require('pty.js');
var ps = require('ps-node');

var matches = {};
var chatsockets = {};
var home = '/home/angbandlive';

router.get('/', function(req, res) {
	Match.find(function (err, result) {  
		if (err) {
			return handleError(err);
		} else {
			livematches = result;
			res.render('index', {title:'GwaRL.xyz', user: req.user, livematches: livematches});
		}
	});	
});

router.post('/newgame', function(req, res) {
	res.setHeader('Access-Control-Allow-Credentials', 'true');
	var user = req.user.username;
	var game = req.query.game;
	var path = home+'/games/'+game;
	var args = [];
	var terminfo='xterm-256color';
	console.log(user+' wants to play '+game);
	switch (game) {
		case 'poschengband':
		terminfo='rxvt-unicode-256color';
		case 'angband':
		case 'faangband':
			args = [
				'-u'+user,
				'-duser='+home+'/public/user/'+user+'/'+game,
				'-mgcu',
				'--',
				'-b'
			];
		break;
		case 'sil':
			args = [
				'-dapex='+home+'/var/games/'+game+'/apex',
				'-duser='+home+'/public/user/'+user+'/'+game,
				'-dsave='+home+'/public/user/'+user+'/'+game+'/save',
				'-mgcu',
				'--',
				'-b'
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
	var term = pty.fork(path, args, {
		name: terminfo,
		cols: 150,
		rows: 40,
		cwd: process.env.HOME
	});
	console.log(term.name);
	matches[user] = term;
	var match = new Match({player: user, game: game});
	match.save(function (err) {
		if (err) return handleError(err);
	});
	console.log('Created terminal with PID: ' + term.pid);
	res.end();
});

router.ws('/play', function (ws, req) {
	var player = req.user.username;
	var term = matches[player];
	var keepalive = setInterval(function(){ws.ping();},30000);
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
		clearInterval(keepalive);
		if (player!='borg'){
			term.write('^X  ');
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
							throw new Error( err );
						}
						else {
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
			Match.remove({ player: player }, function (err) {
				if (err) {
					return handleError(err);
				}
				else {
					console.log( 'Removed match from database' );
				}
			});
			delete matches[player];
		}
	});
	term.write(' ');
	console.log('Connected to terminal ' + term.pid);
});

router.ws('/spectate', function (ws, req) {
	var player = req.query.watch;
	var term = matches[player];
	var keepalive=setInterval(function(){ws.ping();},30000);
	term.on('data', function(data) {
		try {
			ws.send(data);
		} catch (ex) {
			// The WebSocket is not open, ignore
		}
	});
	ws.on('close', function() {
		clearInterval(keepalive);
	});
});

router.ws('/chat', function (ws, req) {
	if (typeof(req.user.username)!='undefined'){
		chatsockets[req.user.username] = ws;
		var keepalive=setInterval(function(){chatsockets[req.user.username].ping();},30000);
		ws.on('message', function(msg) {
			for (i in chatsockets){
				chatsockets[i].send(req.user.username+': '+msg);
			}
		});
		ws.on('close', function() {
			clearInterval(keepalive);
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