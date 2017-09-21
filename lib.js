var pty         = require('pty.js');
var ps          = require('ps-node');
var fs          = require('fs-extra');
var mongoose    = require('mongoose');
var games       = require('./games.js');
var terminal    = require('term.js');

var lib         = {};
matches     = {};
metasockets = {};
chatlog     = [];
var home        = process.env.CUSTOM_HOME || '/home/angbandlive';


//check player alive status for recording purposes
function isalive(playerfile){
	var alive = true;
	var file = fs.openSync(playerfile, 'r');
	var buffer = new Buffer(36);
	fs.readSync(file, buffer, 0, 36, 36);
	var headertext = buffer.toString('utf8');
	if (headertext.match(/\sdead\s/)!=null){
		alive = false;
	}
	console.log(headertext);
	return alive;
}
lib.respond=function(user,msg){
	if (msg.eventtype=='chat'){
		chat(user,msg.content);
	} else if (msg.eventtype=='newgame'){
		if (typeof(matches[user.username])!='undefined'){
			closegame(user.username);
		} else {
			newgame(user,msg.content);
		}
	} else if (msg.eventtype=='connectplayer'){
		connectplayer(user.username);
	} else if (msg.eventtype=='subscribe'){
		subscribe(user,msg.content);
	} else if (msg.eventtype=='gameinput'){
		if (typeof(matches[user.username])!='undefined'){
			matches[user.username].term.write(msg.content);
			matches[user.username].idle=false;
		}
	}
}
function chat(user,message){
	var response = JSON.stringify({ 
		eventtype: "chat",
		content: { 
			user: user.username,
			message: message,
			extra: user.roles,
			timestamp: new Date()
		}
	});
	chatlog.unshift(response);
	while (chatlog.length>100) {
		chatlog.pop();
	}
	for (var i in metasockets){
		try {
			metasockets[i].send(response);
		} catch (ex) {
			// The WebSocket is not open, ignore
		}
	}
}
//some get functions
function getmatchlist(matches){
	var livematches = {};
	for (var i in matches){
		livematches[i] = {
			game: matches[i].game,
			idletime: matches[i].idletime,
			dimensions:{rows:matches[i].term.rows,cols:matches[i].term.cols} 
		};
	}
	return livematches;
}

function getfilelist(username){
	var files = {};
	var users = fs.readdirSync(home+'/public/user/');
	if (users.includes(username)){
		var path = home+'/public/user/'+username+'/';
		fs.ensureDirSync(path);
		var ls = fs.readdirSync(path);
		for (var i in games){
			var dumps = [];
			if (games[i].name.match(/^[a-zA-Z0-9_]+$/)){
				fs.ensureDirSync(path+games[i].name);
				var varfiles = fs.readdirSync(path+games[i].name);
				for (var j in varfiles){
					if (varfiles[j].match(/\.([hH][tT][mM][lL]|[tT][xX][tT])/)) dumps.push(varfiles[j]);
				}
				files[games[i].name]=dumps;
			}
		}
		files.username=username;
	}
	return files;
}
function getgamelist(){
	var gamelist = [];
	for (var i in games){
		gamelist.push({name:games[i].name,longname:games[i].longname,desc:games[i].desc});
	}
	gamelist.sort(function(a, b) {
	  var nameA = a.name.toUpperCase(); // ignore upper and lowercase
	  var nameB = b.name.toUpperCase(); // ignore upper and lowercase
	  if (nameA < nameB) {
		return -1;
	  }
	  if (nameA > nameB) {
		return 1;
	  }
	  // names must be equal
	  return 0;
	});
	return gamelist;
}
function getgameinfo(game){
	var info = {};
	for (var i in games){
		if (games[i].name==game) {
			info.restrict_paths=games[i].restrict_paths;
			info.data_paths=games[i].data_paths;
			info.args=games[i].args;
		}
	}
	return info;
}
function newgame(user,msg){
	var game = msg.game;
	var gameinfo = getgameinfo(game);
	var panels = msg.panels;
	var dimensions = msg.dimensions;
	var asciiwalls = msg.walls;
	var player = user.username;
	var compgame = 'poschengband_new';
	var compnumber = '209';
	var panelarg = '-b';
	if (panels>1) panelarg = '-n'+panels;
	var path = home+'/games/'+game;
	var args = [];
	var terminfo='xterm-256color';
	if (game=='umoria'){
		args.push(home+'/var/games/'+game+'/'+user.username);
	} else {
		if (game=='competition'){
			//args.push('-u'+compnumber+'-'+user.username);
			args.push('-u'+user.username);
		} else {
			args.push('-u'+user.username);
		}
		if (game=='competition'){
			args.push('-duser='+home+'/public/user/'+user.username+'/'+compgame);
		} else if (gameinfo.restrict_paths){
			args.push('-d'+home+'/public/user/'+user.username+'/'+game);
		} else {
			args.push('-duser='+home+'/public/user/'+user.username+'/'+game);
		}
		for (var i in gameinfo.data_paths){
			args.push('-d'+gameinfo.data_paths[i]+'='+home+'/var/games/'+game+'/'+gameinfo.data_paths[i]);
		}
		for (var i in gameinfo.args){
			args.push('-'+gameinfo.args[i]);
		}
		args.push('-mgcu');
		args.push('--');
		args.push(panelarg);
	}
	if (msg.walls) args.push('-a');
	var termdesc = {};
	if (game=='competition'){
		/* var newattempt = true;
		var newtty = false;
		var savegames = fs.readdirSync(home+'/var/games/'+compgame+'/save');
		if (savegames.includes(compnumber+'-'+user.username)){
			var playerfile = home+'/var/games/'+compgame+'/save/'+compnumber+'-'+user.username;
			newattempt = !isalive(playerfile);
		}
		fs.ensureDirSync(home+'/public/user/'+user.username);
		var ttydir = fs.readdirSync(home+'/public/user/'+user.username);
		var ttyfile = home+'/public/user/'+user.username+'/'+compnumber+'-'+user.username+'.ttyrec';
		if (ttydir.includes(ttyfile)){
			newtty=true;
		}
		var command = home+'/games/'+compgame+' '+args.join(' ');
		path = 'ttyrec';
		args = [
			'-e',
			command,
			ttyfile
		];
		if (!newattempt) {
			if (!newtty) args.unshift('-a');
		} else {
			fs.copySync(home+'/var/games/'+compgame+'/save/'+compnumber, home+'/var/games/'+compgame+'/save/'+compnumber+'-'+user.username);
		} */
		fs.copySync(home+'/var/games/'+compgame+'/save/'+compnumber, home+'/var/games/'+compgame+'/save/'+user.username);
	}
	termdesc = {
		path:path,
		args:args,
		terminfo: terminfo
	};
	try {
		var term = pty.fork(termdesc.path,termdesc.args,{
			name: termdesc.terminfo,
			cols: parseInt(dimensions.cols),
			rows: parseInt(dimensions.rows),
			cwd: process.env.HOME,
			applicationCursor: true
		});
	} catch(ex) {
		console.log('averted crash');
	}
	term.on('data', function(data) {
		try {
			metasockets[player].send(JSON.stringify({eventtype:'owngameoutput',content:data}));
		} catch (ex) {
			// The WebSocket is not open, ignore
		}
		if (typeof(matches[player])!='undefined') for (var i in matches[player].spectators) {
			try {
				metasockets[matches[player].spectators[i]].send(JSON.stringify({eventtype:'gameoutput',content:{player:player,data:data}}));
			} catch (ex) {
				// The WebSocket is not open, ignore
			}
		}
/* 		if (typeof(matches[player].termcache)!='undefined') {
			matches[player].termcache.write(data);
		} */
	});
	term.on('close', function(data) {
		closegame(user.username);
	});
	/*var termcache = new terminal.Terminal({
		termName: 'xterm-256color',
		colors: terminal.Terminal.xtermColors,
		cols: dimensions.cols,
		rows: dimensions.rows,
		cursorBlink: false,
		scrollBottom: dimensions.rows
	});*/
	var match = {
		term: term,
		game: game,
		idle: false,
		idletime: 0,
		spectators: []
	}
	matches[user.username] = match;
	
	for (var i in metasockets){
		try {
			metasockets[i].send(JSON.stringify({eventtype: 'matchupdate', content: getmatchlist(matches)}));
		} catch (ex) {
			// The WebSocket is not open, ignore
		}
	}
}
function closegame(player){
	if (typeof(matches[player])!='undefined'){
		//kill the process if it hasn't already
		//horrific reverse engineering hack here
		var term = matches[player].term;
		if (matches[player].game=='competition'){
			var gamepid=parseInt(term.pid)+3;
		} else {
			var gamepid=term.pid;
		}
		ps.lookup({ pid: gamepid }, function(err, resultList ) {
			if (err) {
				console.log( err );
			}
			var process = resultList[ 0 ];
			if( process ){
				setTimeout(function(){
					try {
						ps.kill( gamepid, function( err ) {
							if (err) 
								return console.log( err );
							try {
								term.kill();
								console.log( 'Process %s did not exit and has been forcibly killed!', gamepid );
							}
							catch(e) { console.error(e); }
						});
					} catch(ex) {
						console.error(ex);
					}
				},500);
			} else {
				console.log( 'Process %s was not found, expect user exited cleanly.',player );
			}
			// Clean things up
			delete matches[player]; 
			try {
				metasockets[player].send(JSON.stringify({eventtype: 'gameover', content: []}));
			} catch (ex) {
				// The WebSocket is not open, ignore
			}
			for (var i in metasockets){
				try {
					metasockets[i].send(JSON.stringify({eventtype: 'matchupdate', content: getmatchlist(matches)}));
				} catch (ex) {
					// The WebSocket is not open, ignore
				}
			}
		});
	}
}
function subscribe(user,message){
	var player = message.player;
	var spectator = user.username;
	if (typeof(matches[player])!='undefined' && typeof(matches[player].term)!='undefined' && typeof(user.username)!='undefined') {
		if(metasockets[player]) {
			metasockets[player].send(JSON.stringify({eventtype: 'spectatorinfo', content: spectator + " is now watching"}));
			matches[player].spectators.push(spectator);
		}
		/* try {
			metasockets[spectator].send(JSON.stringify({eventtype: 'gameoutputcache', content: {player:player,term:matches[player].termcache}}));
		} catch (ex) {
			// The WebSocket is not open, ignore
		} */
	}
}
lib.welcome = function(user,ws) {
	metasockets[user.username] = ws;
	var player = user.username;
	//send some info to the user upon connecting
	try {
		metasockets[user.username].send(JSON.stringify({eventtype: 'gamelist', content: getgamelist()}));
		metasockets[user.username].send(JSON.stringify({eventtype: 'populate_chat', content: chatlog}));
		metasockets[user.username].send(JSON.stringify({eventtype: 'matchupdate', content: getmatchlist(matches)}));
		metasockets[user.username].send(JSON.stringify({eventtype: 'fileupdate', content: getfilelist(user.username)}));
		metasockets[user.username].send(JSON.stringify({eventtype: 'usercount', content: Object.keys(metasockets)}));
	} catch (ex) {
		// The WebSocket is not open, ignore
	}
	
	//announce their arrival
	for (var i in metasockets){
		try {
			metasockets[i].send(JSON.stringify({
				eventtype: 'usercount', content: Object.keys(metasockets)
			}));
		} catch (ex) {
			// The WebSocket is not open, ignore
		}
	}
	
	//listen for inputs
	metasockets[user.username].on('message', function(message) {
		var msg = JSON.parse(message);
		lib.respond(user,msg);
	});
	
	//bid farewell
	metasockets[user.username].once('close', function() {
		if (player!='borg'){
			console.log('Closing socket for ' + player);
			//we need to check there's a match in the first place
			if (typeof(matches[player])!='undefined'){
				closegame(player);
			} for (var i in matches) {
				if (typeof(matches[i])!='undefined'&&matches[i].spectators.includes(user.username)) {
					delete matches[i].spectators[matches[i].spectators.indexOf(user.username)];
				}
			}
		}
		delete metasockets[user.username];
		//announce the departure
		for (var i in metasockets){
			try {
				metasockets[i].send(JSON.stringify({eventtype: 'usercount', content: Object.keys(metasockets)}));
			} catch (ex) {
				// The WebSocket is not open, ignore
			}
		}
	});
}
lib.keepalive=function(){
	var matchlist=getmatchlist(matches);
	for (var i in matches) {
		if (matches[i].idle) {
			matches[i].idletime++;
		} else {
			matches[i].idletime=0;
		}
		matches[i].idle=true;
		if (matches[i].idletime>60) {
			closegame(i);
		} 
	}
	for (var i in metasockets) {
		try {
			metasockets[i].ping();
			metasockets[i].send(JSON.stringify({eventtype: 'matchupdate', content: matchlist}));
		} catch (ex) {
			// The WebSocket is not open, ignore
		}
	}
}

module.exports=lib;
