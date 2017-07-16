var pty = require('pty.js');
var ps = require('ps-node');
var fs = require('fs-extra');

var lib = {};
lib.matches = {};
lib.metasockets={};
lib.chatlog = [];

var home = '/home/angbandlive';

//check player alive status for recording purposes
isalive=function(playerfile){
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
		newgame(user,msg.content);
	} else if (msg.eventtype=='connectplayer'){
		connectplayer(user.username,msg.content.ws);
	}  else if (msg.eventtype=='subscribe'){
		subscribe(user,msg.content);
	}
}
function chat(user,message){
	//should be if (user.winner)
	//lazy hack because I promised Lina a purple name if she won
	var winners = [
		'LinaButterfly',
		'Ingwe_Ingweron',
		'Serinus_Serinus',
		'wobbly',
		'rodent'
	];
	if (winners.includes(user.username)){
		var response = JSON.stringify({
			eventtype: 'chat', content: '<span class="playername winner">'+user.username+'</span>: '+message
		});
	} else if (user.username=='MITZE'){
		var response = JSON.stringify({
			eventtype: 'chat', content: '<span class="playername MITZE">'+user.username+'</span>: '+message
		});
	} else {
		var response = JSON.stringify({
			eventtype: 'chat', content: '<span class="playername">'+user.username+'</span>: '+message
		});
	}
	lib.chatlog.unshift(response);
	while (lib.chatlog.length>20) {
		lib.chatlog.pop();
	}
	for (var i in lib.metasockets){
		try {
			lib.metasockets[i].send(response);
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
			idletime: matches[i].idletime
		};
	}
	return livematches;
}

function getfilelist(username){
	var files = {};
	var users = fs.readdirSync(home+'/public/user/');
	if (users.includes(username)){
		var path = home+'/public/user/'+username+'/';
		var ls = fs.readdirSync(path);
		for (var i in ls){
			var dumps = [];
			if (ls[i].match(/^[a-zA-Z0-9_]+$/)){
				var varfiles = fs.readdirSync(path+ls[i]);
				for (var j in varfiles){
					if (varfiles[j].match(/\.([hH][tT][mM][lL]|[tT][xX][tT])/)) dumps.push(varfiles[j]);
				}
				files[ls[i]]=dumps;
			}
		}
	}
	return files;
}
function newgame(user,msg){
	var game = msg.game;
	var panels = msg.panels;
	var dimensions = msg.dimensions;
	if (typeof(lib.matches[user.username])=='undefined'){
		var compgame = 'angband';
		var compnumber = '207';
		var panelarg = '-b';
		if (panels>1) panelarg = '-n'+panels;
		var path = home+'/games/'+game;
		var args = [];
		var terminfo='xterm-256color';
		switch (game) {
			case 'sangband':
			case 'steamband':
			case 'hellband':
			case 'zangband':
			case 'tome':
			case 'oangband':
			case 'unangband':
			case 'poschengband':
			case 'angband':
			case 'faangband':
				args = [
					'-u'+user.username,
					'-duser='+home+'/public/user/'+user.username+'/'+game,
					'-mgcu',
					'--',
					panelarg
				];
			break;
			case 'competition':
				args = [
					'-u'+compnumber+'-'+user.username,
					'-duser='+home+'/public/user/'+user.username+'/'+compgame,
					'-mgcu',
					'--',
					panelarg
				];
			break;
			case 'sil':
				args = [
					'-u'+user.username,
					'-dapex='+home+'/var/games/'+game+'/apex',
					'-duser='+home+'/public/user/'+user.username+'/'+game,
					'-dsave='+home+'/var/games/'+game+'/save',
					'-mgcu',
					'--',
					panelarg
				];
			break;
			case 'borg':
				args = [
					'-u'+user.username,
					'-d'+home+'/public/user/'+user.username+'/'+game,
				];
			break;
			case 'nppangband':
				args = [
					'-u'+user.username,
					'-d'+home+'/public/user/'+user.username+'/'+game,
					'-sang',
					'-mgcu',
					'--',
					panelarg
				];
			break;
			case 'nppmoria':
				args = [
					'-u'+user.username,
					'-d'+home+'/public/user/'+user.username+'/'+game,
					'-smor',
					'-mgcu',
					'--',
					panelarg
				];
			break;
			case 'umoria':
				args = [
					home+'/var/games/umoria/'+user.username
				];
			break;
			default:
			break;
		}
		var termdesc = {};
		if (game=='competition'){
			var newattempt = true;
			var newtty = false;
			var savegames = fs.readdirSync(home+'/var/games/'+compgame+'/save');
			if (savegames.includes(compnumber+'-'+user.username)){
				var playerfile = home+'/var/games/'+compgame+'/save/'+compnumber+'-'+user.username;
				newattempt = !isalive(playerfile);
			}
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
			}
		}
		termdesc = {
			path:path,
			args:args,
			terminfo: terminfo
		};
		var term = pty.fork(termdesc.path,termdesc.args,{
			name: termdesc.terminfo,
			cols: dimensions.cols,
			rows: dimensions.rows,
			cwd: process.env.HOME
		});
		var match = {
			term: term,
			game: game,
			idle: false,
			idletime: 0,
			spectators: {}
		}
		lib.matches[user.username] = match;
	} else {
		console.log('Using existing process with PID: ' + lib.matches[user.username].term.pid);
	}
	for (var i in lib.metasockets){
		try {
			lib.metasockets[i].send(JSON.stringify({eventtype: 'matchupdate', content: getmatchlist(lib.matches)}));
		} catch (ex) {
			// The WebSocket is not open, ignore
		}
	}
}
function connectplayer(player,ws){
	lib.matches[player].socket=ws;
	var term = lib.matches[player].term;
	term.on('data', function(data) {
		try {
			ws.send(data);
		} catch (ex) {
			// The WebSocket is not open, ignore
		}
		if (typeof(lib.matches[player])!='undefined') for (var i in lib.matches[player].spectators) {
			try {
				lib.matches[player].spectators[i].send(data);
			} catch (ex) {
				// The WebSocket is not open, ignore
			}
		}
	});
	ws.on('message', function(msg) {
		term.write(msg);
		if (typeof(lib.matches[player])!='undefined') lib.matches[player].idle=false;
	});
	ws.once('close', function () {
		if (player!='borg'){
			console.log('Closing terminal for ' + player);
			//we need to check there's a match in the first place
			if (typeof(lib.matches[player])!='undefined'){
				closegame(player);
			} else {
				console.log('no match found for '+player+' in match list. I wonder why?');
			}
		}
	});
	term.write(' ');
	console.log(player + ' started a game');
}

function closegame(player){
	//kill the process if it hasn't already
	//horrific reverse engineering hack here
	var term = lib.matches[player].term;
	if (lib.matches[player].game=='competition'){
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
			ps.kill( gamepid, function( err ) {
				if (err) {
					console.log( err );
				} else {
					console.log( 'Process %s did not exit and has been forcibly killed!', gamepid );
				}
			});				
		}
		else {
			console.log( 'Process %s was not found, expect user exited cleanly.',player );
		}
		//now kill the pty
		term.kill();
		// Clean things up
		delete lib.matches[player];
		for (var i in lib.metasockets){
			try {
				lib.metasockets[i].send(JSON.stringify({eventtype: 'matchupdate', content: getmatchlist(matches)}));
			} catch (ex) {
				// The WebSocket is not open, ignore
			}
		}
	});
}
function subscribe(user,message){
	var player = message.player;
	var ws = message.ws;
	var term = lib.matches[player].term;
	var spectator = user.username;
	if (typeof(term)!='undefined'&&typeof(user)!='undefined') {
		lib.metasockets[player].send(JSON.stringify({eventtype: 'spectatorinfo', content: spectator+" is now watching"}));
		lib.matches[player].spectators[spectator]=ws;
		ws.once('close', function() {
			try {
				lib.metasockets[player].send(JSON.stringify({eventtype: 'spectatorinfo', content: spectator+" is no longer watching"}));
			} catch (ex) {
				// The WebSocket is not open, ignore
			}
			if (typeof(lib.matches[player])!='undefined') delete lib.matches[player].spectators[spectator];
		});
	}
}
lib.welcome=function(user,ws) {
	lib.metasockets[user.username] = ws;
	try {
		for (var i in lib.chatlog){
			lib.metasockets[user.username].send(lib.chatlog[lib.chatlog.length-i-1]);
		}
		lib.metasockets[user.username].send(JSON.stringify({eventtype: 'matchupdate', content: getmatchlist(lib.matches)}));
		lib.metasockets[user.username].send(JSON.stringify({eventtype: 'fileupdate', content: lib.getfilelist(user.username)}));
		lib.metasockets[user.username].send(JSON.stringify({eventtype: 'usercount', content: 'Users online: '+Object.keys(lib.metasockets).length}));
	} catch (ex) {
		// The WebSocket is not open, ignore
	}
	for (var i in lib.metasockets){
		try {
			lib.metasockets[i].send(JSON.stringify({
				eventtype: 'usercount', content: 'Users online: '+Object.keys(lib.metasockets).length
			}));
		} catch (ex) {
			// The WebSocket is not open, ignore
		}
	}
	lib.metasockets[user.username].on('message', function(message) {
		var msg = {eventtype: 'chat', content: message};
		lib.respond(user,msg);
	});
	lib.metasockets[user.username].once('close', function() {
		delete lib.metasockets[user.username];
		for (var i in lib.metasockets){
			try {
				lib.metasockets[i].send(JSON.stringify({eventtype: 'usercount', content: 'Users online: '+Object.keys(lib.metasockets).length}));
			} catch (ex) {
				// The WebSocket is not open, ignore
			}
		}
	});
}
lib.keepalive=function(){
	var matchlist=getmatchlist(lib.matches);
	for (var i in lib.matches) {
		if (typeof(lib.matches[i].socket)!='undefined') {
			try {
				lib.matches[i].socket.ping();
			} catch (ex) {
				
			}
			if (lib.matches[i].idle) {
				lib.matches[i].idletime++;
			} else {
				lib.matches[i].idletime=0;
			}
			lib.matches[i].idle=true;
			if (lib.matches[i].idletime>60) {
				lib.matches[i].socket.close();
			} else {
				for (var j in lib.matches[i].spectators) {
					try {
						lib.matches[i].spectators[j].ping();
					} catch (ex) {
						
					}
				}
			}
		}
	}
	for (var i in lib.metasockets) {
		try {
			lib.metasockets[i].ping();
			lib.metasockets[i].send(JSON.stringify({eventtype: 'matchupdate', content: matchlist}));
		} catch (ex) {
			// The WebSocket is not open, ignore
		}
	}
}

module.exports=lib;