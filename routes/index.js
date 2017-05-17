var passport = require('passport');
var session = require('cookie-session');
var Account = require('../models/account');
var Match = require('../models/match');
var router = require('express').Router();

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

module.exports = router;