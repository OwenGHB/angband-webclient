var term;
var socket; 

function adjustsize(dimensions){
	var fontSize=Math.min(Math.floor((window.innerWidth/dimensions.cols)/0.6),Math.floor(window.innerHeight/dimensions.rows));
	document.getElementById("container").style.width=window.innerWidth+'px';
	document.getElementById("container").style.height=window.innerHeight+'px';
	document.getElementById("terminal-container").style.fontSize=fontSize.toString()+'px';
	document.getElementById("terminal-container").style.width=Math.ceil(0.6*dimensions.cols*fontSize).toString()+'px';
	document.getElementById("terminal-container").style.height=Math.ceil(dimensions.rows*fontSize).toString()+'px';
	document.getElementById("menu").style.width=(window.innerWidth-Math.ceil(0.6*dimensions.cols*Math.floor(window.innerHeight/dimensions.rows))-2).toString()+'px';
}

function applyTerminal(mode, qualifier, dimensions) {
	var terminalContainer=document.getElementById("terminal-container");
	terminalContainer.innerHTML='';
	var terminfo = '';
	switch (qualifier){
	case 'poschengband':
		terminfo = 'rxvt-unicode-256color';
		break;
	default :
		terminfo = 'xterm-256color';
		break;
	}
	term = new Terminal({
		termName: terminfo,
		colors: Terminal.xtermColors,
		cols: dimensions.cols,
		rows: dimensions.rows,
		cursorBlink: false
	});
	term.open(terminalContainer);
	var socketURL = 'ws://' + location.hostname + ((location.port) ? (':' + location.port) : '') + '/'+mode;
	if (mode=='play') {
		term.applicationCursor=true;
		fetch('/newgame?game='+qualifier+'&rows='+dimensions.rows+'&cols='+dimensions.cols, {credentials: 'include', method: 'POST'}).then(function () {
			socket = new WebSocket(socketURL);
			term.on('data', function(data) {
				socket.send(data);
			});
			socket.addEventListener('message', function (ev) {
				term.write(ev.data);
			});
		});  
	} else if (mode=='spectate') {
		socketURL += '?watch='+qualifier;
		socket = new WebSocket(socketURL);
		socket.addEventListener('message', function (ev) {
			term.write(ev.data);
		});
	}
}
