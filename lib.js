var pty = require('pty.js');
var ps = require('ps-node');
var fs = require('fs-extra');

var lib = {};
matches = {};
metasockets = {};
chatlog = [];

var home = '/home/angbandlive';

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
		newgame(user,msg.content);
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
	//should be if (user.winner)
	//lazy hack because I promised Lina a purple name if she won
	var winners = [
		'LinaButterfly',
		'Ingwe_Ingweron',
		'Serinus_Serinus',
		'wobbly',
		'rodent',
		'clouded',
		'Philip'
	];
	if(user.isDev)
		var response = JSON.stringify({
			eventtype: 'chat', content: '<span class="playername dev">'+user.username+'</span>: '+message
		});
	else if (user.isWinner) {
		var response = JSON.stringify({
			eventtype: 'chat', content: '<span class="playername winner">'+user.username+'</span>: '+message
		});
	} 
	else if (user.username=='MITZE'){
		var response = JSON.stringify({
			eventtype: 'chat', content: '<span class="playername MITZE">'+user.username+'</span>: '+message
		});
	} 
	else {
		var response = JSON.stringify({
			eventtype: 'chat', content: '<span class="playername basic">'+user.username+'</span>: '+message
		});
	}
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
		files.username=username;
	}
	return files;
}
function newgame(user,msg){
	var game = msg.game;
	var panels = msg.panels;
	var dimensions = msg.dimensions;
	var asciiwalls = msg.walls;
	var player = user.username;
	if (typeof(matches[user.username])=='undefined'){
		var compgame = 'faangband';
		var compnumber = '208';
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
		if (msg.walls) args.push('-a');
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
		});
		var match = {
			term: term,
			game: game,
			idle: false,
			idletime: 0,
			spectators: []
		}
		matches[user.username] = match;
	} else {
		console.log('Using existing process with PID: ' + matches[user.username].term.pid);
	}
	for (var i in metasockets){
		try {
			metasockets[i].send(JSON.stringify({eventtype: 'matchupdate', content: getmatchlist(matches)}));
		} catch (ex) {
			// The WebSocket is not open, ignore
		}
	}
}
function closegame(player){
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
		delete matches[player];
		for (var i in metasockets){
			try {
				metasockets[i].send(JSON.stringify({eventtype: 'matchupdate', content: getmatchlist(matches)}));
			} catch (ex) {
				// The WebSocket is not open, ignore
			}
		}
	});
}
function subscribe(user,message){
	var player = message.player;
	var spectator = user.username;

	if (typeof(matches[player])!='undefined' && typeof(matches[player].term)!='undefined' && typeof(user.username)!='undefined') {
		metasockets[player].send(JSON.stringify({eventtype: 'spectatorinfo', content: spectator + " is now watching"}));
		matches[player].spectators.push(spectator);
	}
}
lib.welcome = function(user,ws) {
	metasockets[user.username] = ws;
	var player = user.username;
	//send some info to the user upon connecting
	try {
		for (var i in chatlog){
			metasockets[user.username].send(chatlog[chatlog.length-i-1]);
		}
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