var passport = require('passport');
var session = require('cookie-session');
var Account = require('../models/account');
var router = require('express').Router();
var fs = require('fs-extra');

router.post('/signin', 
	function(req, res, next) {
		Account.find({username:req.body.username},function(err, result){
			if (result.length>0){
				next();
			} else {
				Account.register(new Account({username: req.body.username}), req.body.password, function(err) {
					if (err) {
						console.log('error while user register!', err);
						return next(err);
					}
					console.log('user registered!');
					var defaultpath = "/home/bandit/public/user/default";
					var userpath = "/home/bandit/public/user/"+req.body.username;
					var subdirs = {};
					var games = fs.readdirSync(defaultpath);
					for (var i=0; i<games.length; i++) {
						var game = games[i];
						subdirs[game]=fs.readdirSync(defaultpath+'/'+game);
						for (var j=0;j <subdirs[game].length; j++){
							if (subdirs[game][j]=='customize'||subdirs[game][j]=='pref') {
								var pathfrom=defaultpath+'/'+game+'/'+subdirs[game][j];
								var pathto=userpath+'/'+game+'/'+subdirs[game][j];
								fs.copy(pathfrom, pathto, err => {
									if (err) return console.error(err);
									console.log('copied default pref files');
								});
							}
						}
					}
					next();
				});
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