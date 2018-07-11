// var pty         = require('pty.js');
var pty         = require('node-pty');
var moment      = require('moment');
var ps          = require('ps-node');
var fs          = require('fs-extra');
var games       = require('./games.js');
var config      = require("./config");
var terminal    = require('term.js');

var lib         = {};

// holds current games played. User.name is the key
var matches     = {};

// holds current socket connections
var metasockets = {};


var home        = process.env.CUSTOM_HOME || '/home/angband';
var localdb     = require("./localdb");



lib.stats = function() {
	return {
		players: Object.keys(metasockets).length,
		games: Object.keys(matches).length
	}
}


lib.respond = function(user, msg) {
	if(msg.eventtype == 'chat') {
		chat(user,msg.content);
	} 
	else if(msg.eventtype == 'newgame'){
		if (typeof(matches[user.name]) != 'undefined') {
			closegame(user.name);
		} 
		else if(user.name != 'anthon') {
			newgame(user,msg.content);
		}
	} 
	else if(msg.eventtype == 'connectplayer') {
		connectplayer(user.name);
	} 
	else if(msg.eventtype == 'subscribe') {
		subscribe(user,msg.content);
	} 
	else if(msg.eventtype == 'gameinput') {
		if(typeof(matches[user.name])!='undefined'){
			matches[user.name].term.write(msg.content);
			matches[user.name].idle=false;
		}
	}
}


function chat(user, message){
	var response = JSON.stringify({ 
		eventtype: "chat",
		content: { 
			user: user.name,
			message: message,
			extra: user.roles,
			timestamp: new Date()
		}
	});

	// todo: check against banned users, if user is ok then push message
	localdb.pushMessage(user, message);

	if (user.name!="Sirfurnace") {
		for (var i in metasockets){
			try {
				metasockets[i].send(response);
			} 
			catch (ex) {
				// The WebSocket is not open, ignore
			}
		}
	} 
	else {
		metasockets[user.name].send(response);
	}
}


//some get functions
function getmatchlist(matches) {
	console.log("getMatchList: matches", matches);
	var livematches = {};
	for (var i in matches) {
		var charinfo = getcharinfo(i, matches[i].game);
		livematches[i] = {
			game       : matches[i].game,
			idletime   : matches[i].idletime,
			cLvl       : charinfo.cLvl,
			race       : charinfo.race,
			subrace    : charinfo.subrace,
			class      : charinfo.class,
			dimensions : {rows: matches[i].dimensions.rows, cols: matches[i].dimensions.cols} 
		};
	}
	return livematches;
}


//check player alive status for recording purposes
function isalive(user,game){
	var alive = true;
	var charinfo = getcharinfo(user,game);
	if (charinfo.isAlive == "0" || charinfo.isDead == "1") {
		alive = false;
	}
	return alive;
}


function getcharinfo(user, game) {
	var dirpath = home+'/user/'+user+'/'+game;
	fs.ensureDirSync(dirpath);
	var files=fs.readdirSync(dirpath);
	var charinfo = {};
	if (files.includes('CharOutput.txt')){
		var json=fs.readFileSync(dirpath+'/CharOutput.txt','utf8');
		json = json.replace(/\n/gm,"\n\"");
		json = json.replace(/:/gm,'":');
		json = json.replace(/"{/gm,'{');
		json = json.replace(/"}/gm,'}');
		try {
			charinfo=JSON.parse(json);
		} 
		catch (ex) {
		}
	}
	return charinfo;
}


function getfilelist(name) {
	var files = {};
	var users = fs.readdirSync(home+'/user/');
	if (users.includes(name)){
		var path = home+'/user/'+name+'/';
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
		files.name=name;
	}
	return files;
}


function getgamelist() {
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


function getgameinfo(game) {
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


function newgame(user, msg) {
	var game = msg.game;
	var gameinfo = getgameinfo(game);
	var panels = msg.panels;
	var dimensions = msg.dimensions;
	var asciiwalls = msg.walls;
	var player = user.name;
	var compgame = 'silq';
	var compnumber = '217';
	var panelargs = ['-b'];
	console.log(`starting new game: user=${user.name} dimensions=${dimensions.cols}x${dimensions.rows}`);
	if(panels > 1) {
		if (game == 'poschengband' || game == 'elliposchengband' || game == 'composband') {
			panelargs = ['-right','40x*','-bottom','*x8'];
		} 
		else {
			panelargs = ['-n'+panels];
		}
	}
	var path = home + '/games/' + game + '/' + game;
	var args = [];
	var terminfo = 'xterm-256color';
	if(game == 'umoria') {
		args.push(home + '/games/' + game + '/' + user.name);
	} 
	else {
		if (game == 'competition') {
			args.push('-u'+compnumber+'-'+user.name);
		} 
		else {
			args.push('-u'+user.name);
		}
		if (game == 'competition') {
			args.push('-duser='+home+'/user/'+user.name+'/'+compgame);
		} 
		else if (gameinfo.restrict_paths){
			args.push('-d'+home+'/user/'+user.name+'/'+game);
		} 
		else {
			args.push('-duser='+home+'/user/'+user.name+'/'+game);
		}
		for (var i in gameinfo.args) {
			args.push('-'+gameinfo.args[i]);
		}
		args.push('-mgcu');
		args.push('--');
		for (var i in panelargs){
			args.push(panelargs[i]);
		}
	}
	if (msg.walls) 
		args.push('-a');
	var termdesc = {};
	if (game == 'competition') {
		var newattempt = true;
		var newtty = false;
		var savegames = fs.readdirSync(home+'/'+compgame+'/lib/save/');
		if (savegames.includes('1002.'+compnumber+''+user.name)){
			newattempt = !isalive(user.name,compgame);
		}
		fs.ensureDirSync(home+'/user/'+user.name);
		var ttydir = fs.readdirSync(home+'/ttyrec');
		var ttyfile = home+'/ttyrec/'+compnumber+'-'+user.name+'.ttyrec';
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
			if (!newtty) 
				args.unshift('-a');
		} 
		else {
			fs.copySync(home+'/games/'+compgame+'/lib/save/1002.'+compnumber, home+'/games/'+compgame+'/lib/save/1002.'+compnumber+''+user.name);
		}
	}
	termdesc = {
		path     : path,
		args     : args,
		terminfo : terminfo
	};
	console.log("current args for the game are:", args);
	try {
		var term_opts = {
			name              : termdesc.terminfo,
			cols              : parseInt(dimensions.cols),
			rows              : parseInt(dimensions.rows),
			cwd               : process.env.HOME,
			applicationCursor : true
		};
		console.log("forking pty with opts", term_opts);
		var term = pty.fork(termdesc.path,termdesc.args, term_opts);
		term.on('data', function(data) {
			try {
				metasockets[player].send(JSON.stringify({eventtype: 'owngameoutput', content: data}));
			} 
			catch (ex) {
				// The WebSocket is not open, ignore
			}
			if (typeof(matches[player])!='undefined') 
				for (var i in matches[player].spectators) {
					try {
						metasockets[matches[player].spectators[i]].send(JSON.stringify({
							eventtype: 'gameoutput',
							content: {
								player :player,
								data   :data
							}
						}));
					} 
					catch (ex) {
						// The WebSocket is not open, ignore
					}
				}
	/* 		if (typeof(matches[player].termcache)!='undefined') {
				matches[player].termcache.write(data);
			} */
		});
		term.on('close', function(data) {
			closegame(user.name);
		});

		matches[user.name] = {
			term: term,
			game: game,
			idle: false,
			idletime: 0,
			spectators: [],
			dimensions: dimensions
		};
		
		for (var i in metasockets) {
			try {
				metasockets[i].send(JSON.stringify({eventtype: 'matchupdate', content: getmatchlist(matches)}));
			} 
			catch (ex) {
				// The WebSocket is not open, ignore
			}
		}
	} 
	catch(ex) {
		console.log('we usually crash here, now we should not any more.');
		console.error(ex);
	}
	/*var termcache = new terminal.Terminal({
		termName: 'xterm-256color',
		colors: terminal.Terminal.xtermColors,
		cols: dimensions.cols,
		rows: dimensions.rows,
		cursorBlink: false,
		scrollBottom: dimensions.rows
	});*/
}


function closegame(player){
	if (typeof(matches[player])!='undefined'){
		//kill the process if it hasn't already
		//horrific reverse engineering hack here
		var term = matches[player].term;
		if (matches[player].game == 'competition'){
			var gamepid = parseInt(term.pid) + 3;
		} 
		else {
			var gamepid=term.pid;
		}
		ps.lookup({ pid: gamepid }, function(err, resultList ) {
			if (err) {
				console.log( err );
			}
			var process = resultList[ 0 ];
			if( process ){
				setTimeout(function() {
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
					} 
					catch(ex) {
						console.error(ex);
					}
				},500);
			} 
			else {
				console.log( 'Process %s was not found, expect user exited cleanly.',player );
			}
			// Clean things up
			delete matches[player]; 
			try {
				metasockets[player].send(JSON.stringify({eventtype: 'gameover', content: []}));
			} 
			catch (ex) {
				// The WebSocket is not open, ignore
			}
			for (var i in metasockets) {
				try {
					metasockets[i].send(JSON.stringify({eventtype: 'matchupdate', content: getmatchlist(matches)}));
				} 
				catch (ex) {
					// The WebSocket is not open, ignore
				}
			}
		});
	}
}


function subscribe(user,message) {
	var player = message.player;
	var spectator = user.name;
	if (typeof(matches[player]) != 'undefined' && typeof(matches[player].term) != 'undefined' && typeof(user.name) != 'undefined') {
		if(metasockets[player]) {
			metasockets[player].send(JSON.stringify({eventtype: 'systemannounce', content: spectator + " is now watching"}));
			matches[player].spectators.push(spectator);
		}
		/* try {
			metasockets[spectator].send(JSON.stringify({eventtype: 'gameoutputcache', content: {player:player,term:matches[player].termcache}}));
		} catch (ex) {
			// The WebSocket is not open, ignore
		} */
	}
}



// ===================================================================
// EXPORTED FUNCTIONS
// ===================================================================
lib.welcome = function(user,ws) {
	metasockets[user.name] = ws;
	var player = user.name;
	//send some info to the user upon connecting
	try {
		var last_chat_messages = localdb.readMessages(config.chat_last_messages);
		metasockets[user.name].send(JSON.stringify({eventtype: 'gamelist', content: getgamelist()}));
		metasockets[user.name].send(JSON.stringify({eventtype: 'populate_chat', content: last_chat_messages}));
		metasockets[user.name].send(JSON.stringify({eventtype: 'matchupdate', content: getmatchlist(matches)}));
		metasockets[user.name].send(JSON.stringify({eventtype: 'fileupdate', content: getfilelist(user.name)}));
		metasockets[user.name].send(JSON.stringify({eventtype: 'usercount', content: Object.keys(metasockets)}));
	} 
	catch (ex) {
		// The WebSocket is not open, ignore
	}
	

	// push arrival event to chat database
	var diff = moment().diff(user.last_connected, "seconds");
	if(!user.last_connected || diff > 30) {
		localdb.pushMessage("--system--", `${user.name} has joined the chat`);
		var last_connected = localdb.updateLastConnected(user.name);
		user.last_connected = last_connected;
	}

	//announce their arrival
	for (var i in metasockets){
		try {
			metasockets[i].send(JSON.stringify({
				eventtype: 'usercount', content: Object.keys(metasockets)
			}));
			if(i !== user.name) {
				metasockets[i].send(JSON.stringify({
					eventtype: 'systemannounce', content: `${user.name} has joined the chat`
				}));
			}
		} 
		catch (ex) {
			// The WebSocket is not open, ignore
		}
	}
	
	//listen for inputs
	metasockets[user.name].on('message', function(message) {
		var msg = JSON.parse(message);
		lib.respond(user,msg);
	});
	
	//bid farewell
	metasockets[user.name].once('close', function() {
		if (player!='borg'){
			console.log('Closing socket for ' + player);
			//we need to check there's a match in the first place
			if (typeof(matches[player])!='undefined'){
				closegame(player);
			} 
			for (var i in matches) {
				if (typeof(matches[i])!='undefined'&&matches[i].spectators.includes(user.name)) {
					delete matches[i].spectators[matches[i].spectators.indexOf(user.name)];
				}
			}
		}
		delete metasockets[user.name];

		// push departure event to chat database
		var diff = moment().diff(user.last_disconnected, "seconds");
		if(!user.last_disconnected || diff > 30) {
			localdb.pushMessage("--system--", `${user.name} has left the chat`);
			var last_disconnected = localdb.updateLastDisconnected(user.name);
			user.last_disconnected = last_disconnected;
		}

		//announce the departure
		for (var i in metasockets) {
			try {
				metasockets[i].send(JSON.stringify({eventtype: 'usercount', content: Object.keys(metasockets)}));
				if(i !== user.name) {
					metasockets[i].send(JSON.stringify({
						eventtype: 'systemannounce', content: `${user.name} has left the chat`
					}));
				}
			} 
			catch (ex) {
				// The WebSocket is not open, ignore
			}
		}
	});
}


lib.keepalive = function(){
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

module.exports = lib;
