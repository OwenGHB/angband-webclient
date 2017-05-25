var passport = require('passport');
var session = require('cookie-session');
var Account = require('../models/account');
var Match = require('../models/match');
var router = require('express').Router();
var pty = require('node-pty');
var ps = require('ps-node');

var matches = {};
var home = '/home/angbandlive';

router.post('/newgame', function(req, res) {
	res.setHeader('Access-Control-Allow-Credentials', 'true');
	var user = req.user.username;
	var game = req.query.game;
	var path = home+'/games/'+game;
	var args = [];
	console.log(user+' wants to play '+game);
	switch (game) {
		case 'angband':
		case 'master':
			args = [
				'-u'+user,
				'-duser='+home+'/public/user/'+user+'/'+game,
			];
		break;
		case 'poschengband':
		case 'faangband':
			args = [
				'-u'+user,
				'-duser='+home+'/public/user/'+user+'/'+game,
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
	console.log('path:'+path);
	console.log('args:'+args);
	var term = pty.spawn(path, args, {
		name: 'xterm-color',
		cols: 125,
		rows: 40,
		cwd: process.env.PWD,
		env: process.env
	});
	matches[user] = term;
	var match = new Match({player: user, game: game});
	match.save(function (err) {
		if (err) return handleError(err);
	});
	console.log('Created terminal with PID: ' + term.pid);
	res.send(term.pid.toString());
	res.end();
});

router.ws('/play', function (ws, req) {
	var player = req.user.username;
	var term = matches[player];
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

router.ws('/watch', function (ws, req) {
	var player = req.query.player;
	var term = matches[player];
	term.on('data', function(data) {
		try {
			ws.send(data);
		} catch (ex) {
			// The WebSocket is not open, ignore
		}
	});
});

module.exports = router;