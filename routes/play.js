var passport = require('passport');
var session = require('cookie-session');
var Account = require('../models/account');
var router = require('express').Router();
var pty = require('node-pty');
var ps = require('ps-node');

var matches = {};

router.post('/', function(req, res) {
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
	console.log('Created terminal with PID: ' + term.pid);
	var match = {};
	match.terminal = term;
	match.log = '';
	term.on('data', function(data) {
		match.log += data;
	});
	matches[user] = match;
	res.send(term.pid.toString());
	res.end();
});

router.ws('/', function (ws, req) {
	var term = matches[req.user.username].terminal;
	console.log('Connected to terminal ' + term.pid);
	ws.send(matches[req.user.username].log);
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
		term.kill();
		//kill the process if it hasn't already
		ps.lookup({ pid: term.pid }, function(err, resultList ) {
			if (err) {
				throw new Error( err );
			}
			var process = resultList[ 0 ];
			if( process ){
				console.log( 'PID: %s, COMMAND: %s, ARGUMENTS: %s', process.pid, process.command, process.arguments );
				ps.kill( term.pid, function( err ) {
					if (err) {
						throw new Error( err );
					}
					else {
						console.log( 'Process %s has been killed!', term.pid );
					}
				});
			}
			else {
				console.log( 'No such process found!' );
			}
		});
		console.log('Closed terminal ' + term.pid);
		// Clean things up
		delete matches[req.user.username];
	});
});

module.exports = router;