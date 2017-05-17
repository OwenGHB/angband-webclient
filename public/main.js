var term;
var socket;

var controls = document.getElementById('controls');
document.getElementById('newgame-angband').setAttribute('onClick','newGame("angband")');
document.getElementById('newgame-poschengband').setAttribute('onClick','newGame("poschengband")');
document.getElementById('newgame-faangband').setAttribute('onClick','newGame("faangband")');

function newGame(game) {
	document.body.innerHTML='<div id="terminal-container"></div>';
	var terminalContainer=document.getElementById("terminal-container");
	term = new Terminal();
	term.open(terminalContainer);
	term.fit();
	var initialGeometry = term.proposeGeometry();
	var charWidth = Math.ceil(term.element.offsetWidth / 120);
	var charHeight = Math.ceil(term.element.offsetHeight / 40);
	var socketURL = 'ws://' + location.hostname + ((location.port) ? (':' + location.port) : '') + '/games/play';
	fetch('/games/newgame?game='+game, {credentials: 'include', method: 'POST'}).then(function (res) {
		res.text().then(function (pid) {
			window.pid = pid;
			socket = new WebSocket(socketURL);
			socket.onopen = term.attach(socket);
		});
	});  
}

function spectateGame(player) {
	document.body.innerHTML='<div id="terminal-container"></div>';
	var terminalContainer=document.getElementById("terminal-container");
	term = new Terminal();
	term.open(terminalContainer);
	term.fit();
	var initialGeometry = term.proposeGeometry();
	var charWidth = Math.ceil(term.element.offsetWidth / 120);
	var charHeight = Math.ceil(term.element.offsetHeight / 40);
	var socketURL = 'ws://' + location.hostname + ((location.port) ? (':' + location.port) : '') + '/games/watch?player='+player;
	socket = new WebSocket(socketURL);
	socket.onopen = term.attach(socket);
}