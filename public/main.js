var term;
var socket;

var newgameangband=document.getElementById('newgame-angband');
if (newgameangband) newgameangband.setAttribute('onClick','newGame("angband")');
var newgamemaster=document.getElementById('newgame-master');
if (newgamemaster) newgamemaster.setAttribute('onClick','newGame("master")');
var newgameposchengband=document.getElementById('newgame-poschengband');
if (newgameposchengband) newgameposchengband.setAttribute('onClick','newGame("poschengband")');
var newgamefaangband=document.getElementById('newgame-faangband');
if (newgamefaangband) newgamefaangband.setAttribute('onClick','newGame("faangband")');
var newgamenppangband=document.getElementById('newgame-nppangband');
if (newgamenppangband) newgamenppangband.setAttribute('onClick','newGame("nppangband")');
var newgamenppmoria=document.getElementById('newgame-nppmoria');
if (newgamenppmoria) newgamenppmoria.setAttribute('onClick','newGame("nppmoria")');
var newgameborg=document.getElementById('newgame-borg');
if (newgameborg) newgameborg.setAttribute('onClick','newGame("borg")');
var resumeborg=document.getElementById('resume-borg');
if (resumeborg) resumeborg.setAttribute('onClick','resumeGame()');

function newGame(game) {
	document.getElementById("menu").innerHTML='';
	var terminalContainer=document.getElementById("terminal-container");
	terminalContainer.innerHTML='';
	term = new Terminal();
	term.open(terminalContainer);
	term.fit();
	var initialGeometry = term.proposeGeometry();
	var charWidth = Math.ceil(term.element.offsetWidth / 125);
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

function resumeGame() {
	var terminalContainer=document.getElementById("terminal-container");
	terminalContainer.innerHTML='';
	term = new Terminal();
	term.open(terminalContainer);
	term.fit();
	var initialGeometry = term.proposeGeometry();
	var charWidth = Math.ceil(term.element.offsetWidth / 125);
	var charHeight = Math.ceil(term.element.offsetHeight / 40);
	var socketURL = 'ws://' + location.hostname + ((location.port) ? (':' + location.port) : '') + '/games/play';
	socket = new WebSocket(socketURL);
	socket.onopen = term.attach(socket);
}

function spectateGame(player) {
	var terminalContainer=document.getElementById("terminal-container");
	terminalContainer.innerHTML='';
	term = new Terminal();
	term.open(terminalContainer);
	term.fit();
	var initialGeometry = term.proposeGeometry();
	var charWidth = Math.ceil(term.element.offsetWidth / 125);
	var charHeight = Math.ceil(term.element.offsetHeight / 40);
	var socketURL = 'ws://' + location.hostname + ((location.port) ? (':' + location.port) : '') + '/games/watch?player='+player;
	socket = new WebSocket(socketURL);
	socket.onopen = term.attach(socket);
}

function closeGame() {
	socket.close();
}