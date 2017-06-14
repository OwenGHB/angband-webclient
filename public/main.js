var term;
var socket;
var games = ['angband','sil','poschengband','faangband','nppangband','nppmoria','borg'];

for (i in games) {
	var playbutton = document.getElementById('newgame-'+games[i]);
	if (playbutton) playbutton.setAttribute('onClick','applyTerminal("play","'+games[i]+'")');
}

function applyTerminal(mode, qualifier) {
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
		cols: 150,
		rows: 40,
		screenKeys: true,
		cursorBlink: false
	});
	term.open(terminalContainer);
	var socketURL = 'ws://' + location.hostname + ((location.port) ? (':' + location.port) : '') + '/'+mode;
	if (mode=='play') {
		fetch('/newgame?game='+qualifier, {credentials: 'include', method: 'POST'}).then(function () {
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
