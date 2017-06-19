var term;
var socket;

function adjustsize(dimensions){
	var fontSize=Math.min(Math.floor((window.innerWidth/dimensions.cols)/0.6),Math.floor(window.innerHeight/dimensions.rows));
	var narrowscreen=(Math.floor((window.innerWidth/dimensions.cols)/0.6)<Math.floor(window.innerHeight/dimensions.rows));
	document.getElementById("container").style.width=window.innerWidth+'px';
	document.getElementById("container").style.height=window.innerHeight+'px';
	document.getElementById("terminal-container").style.fontSize=fontSize.toString()+'px';
	document.getElementById("terminal-container").style.width=Math.ceil(0.6*dimensions.cols*fontSize).toString()+'px';
	document.getElementById("terminal-container").style.height=Math.ceil(dimensions.rows*fontSize).toString()+'px';
	if (narrowscreen) {
		document.getElementById("menu").style.width='100%';
		document.getElementById("menu").style.height=(window.innerHeight-Math.ceil(dimensions.rows*fontSize)-1).toString()+'px';
		document.getElementById("chat").style.height='100%';
		document.getElementById("chat").style.width='50%';
		document.getElementById("chatlog").style.height=(window.innerHeight-Math.ceil(dimensions.rows*fontSize)-43).toString()+'px';
	} else {
		document.getElementById("menu").style.width=(window.innerWidth-Math.ceil(0.6*dimensions.cols*fontSize)-1).toString()+'px';
		document.getElementById("menu").style.height='100%';
		document.getElementById("chat").style.height='50%';
		document.getElementById("chat").style.width='100%';
		document.getElementById("chatlog").style.height=((window.innerHeight/2)-43).toString()+'px';
	}
}
function applyTerminal(mode, qualifier, dimensions) {
	var terminalContainer=document.getElementById("terminal-container");
	terminalContainer.innerHTML='';
	var terminfo = 'xterm-256color';
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
