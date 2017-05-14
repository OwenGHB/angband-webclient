var passport = require('passport');
var session = require('cookie-session');
var Account = require('../models/account');
var router = require('express').Router();

router.get('/', function(req, res) {
  res.render('index', {title:'GwaRL.xyz', user: req.user});
});

module.exports = router;