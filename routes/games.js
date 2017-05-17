var passport = require('passport');
var session = require('cookie-session');
var Account = require('../models/account');
var Match = require('../models/match');
var router = require('express').Router();
var pty = require('node-pty');
var ps = require('ps-node');

var matches = {};

router.post('/newgame', function(req, res) {
	res.setHeader('Access-Control-Allow-Credentials', 'true');
	var user = req.user.username;
	var games = {
		angband: {
			path: '/home/bandit/games/angband',
			args: [
				'-u'+user,
				'-dscores=/home/bandit/webclient/var/default/angband/score',
				'-dinfo=/home/bandit/webclient/var/default/angband/info',
				'-duser=/home/bandit/webclient/var/'+user+'/angband',
				'-dsave=/home/bandit/webclient/var/'+user+'/angband/save',
				'-dpref=/home/bandit/webclient/var/'+user+'/angband/pref',
				'-mgcu'
			],
		},
		poschengband: {
			path: '/home/bandit/games/poschengband',
			args: [
				'-u'+user,
				'-dapex=/home/bandit/webclient/var/default/poschengband/score',
				'-dinfo=/home/bandit/webclient/var/default/poschengband/info',
				'-duser=/home/bandit/webclient/var/'+user+'/poschengband',
				'-dsave=/home/bandit/webclient/var/'+user+'/poschengband/save',
				'-dpref=/home/bandit/webclient/var/'+user+'/poschengband/pref',
				'-mgcu'
			],
		},
		faangband: {
			path: '/home/bandit/games/faangband',
			args: [
				'-u'+user,
				'-dapex=/home/bandit/webclient/var/default/faangband/score',
				'-dinfo=/home/bandit/webclient/var/default/faangband/info',
				'-duser=/home/bandit/webclient/var/'+user+'/faangband',
				'-dsave=/home/bandit/webclient/var/'+user+'/faangband/save',
				'-dpref=/home/bandit/webclient/var/'+user+'/faangband/pref',
				'-mgcu'
			],
		},
	};
	var game = req.query.game;
	var term = pty.spawn(games[game].path, games[game].args, {
		name: 'xterm-color',
		cols: 120,
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
	});
	term.write(' ');
	console.log('Connected to terminal ' + term.pid);
});

router.ws('/watch', function (ws, req) {
	var player = req.query.player;
	var term = matches[player];
	ws.on('open', function() {
		term.write('^R');
	});
	term.on('data', function(data) {
		try {
			ws.send(data);
		} catch (ex) {
			// The WebSocket is not open, ignore
		}
	});
});

module.exports = router;