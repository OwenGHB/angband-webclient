var passport = require('passport');
var session = require('cookie-session');
var Account = require('./models/account');
var router = require('express').Router();
var pty = require('node-pty');
var ps = require('ps-node');
var fs = require('fs-extra');

var terminals = {},
    logs = {};

router.get('/', function(req, res) {
  res.render('index', {title:'GwaRL.xyz', user: req.user});
});

router.post('/login', passport.authenticate('local'), function(req, res) {
  console.log('Session user '+JSON.stringify(req.session.passport.user));
  res.redirect('/');
});

router.post('/register', 
	function(req, res, next) {
		console.log('registering user');
		if (req.body.username!='default') Account.register(new Account({username: req.body.username}), req.body.password, function(err) {
			if (err) {
				console.log('error while user register!', err);
				return next(err);
			}
			console.log('user registered!');
			fs.copy('/home/bandit/webclient/var/default', '/home/bandit/webclient/var/'+req.body.username, err => {
				if (err) return console.error(err);
				console.log('copied default pref files');
			});
			next();
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

router.post('/games', function(req, res) {
	res.setHeader('Access-Control-Allow-Credentials', 'true');
	var user = req.session.passport.user;
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
	terminals[term.pid] = term;
	logs[term.pid] = '';
	term.on('data', function(data) {
		logs[term.pid] += data;
	});
	res.send(term.pid.toString());
	res.end();
});

router.ws('/games/:pid', function (ws, req) {
  var term = terminals[parseInt(req.params.pid)];
  console.log('Connected to terminal ' + term.pid);
  ws.send(logs[term.pid]);

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
    delete terminals[term.pid];
    delete logs[term.pid];
  });
});

module.exports = router;