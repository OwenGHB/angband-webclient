var passport = require('passport');
var session = require('cookie-session');
var Account = require('../models/account');
var router = require('express').Router();
var fs = require('fs-extra');

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

module.exports = router;