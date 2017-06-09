var term;
var socket;

var newgameangband=document.getElementById('newgame-angband');
if (newgameangband) newgameangband.setAttribute('onClick','newGame("angband")');
var newgamemaster=document.getElementById('newgame-sil');
if (newgamemaster) newgamemaster.setAttribute('onClick','newGame("sil")');
var newgameposchengband=document.getElementById('newgame-poschengband');
if (newgameposchengband) newgameposchengband.setAttribute('onClick','newGame("poschengband")');
var newgamefaangband=document.getElementById('newgame-faangband');
if (newgamefaangband) newgamefaangband.setAttribute('onClick','newGame("faangband")');
var newgamenppangband=document.getElementById('newgame-nppangband');
if (newgameborg) newgameborg.setAttribute('onClick','newGame("borg")');
var resumeborg=document.getElementById('resume-borg');
if (resumeborg) resumeborg.setAttribute('onClick','resumeGame()');

function newGame(game) {
	var terminalContainer=document.getElementById("terminal-container");
	terminalContainer.innerHTML='';
	term = new Terminal({
		cols: 150,
		rows: 40,
		useStyle: true,
		screenKeys: true,
		cursorBlink: false
	});
	term.open(terminalContainer);
	var socketURL = 'ws://' + location.hostname + ((location.port) ? (':' + location.port) : '') + '/play';
	fetch('/newgame?game='+game, {credentials: 'include', method: 'POST'}).then(function () {
		socket = new WebSocket(socketURL);
		term.on('data', function(data) {
			socket.send(data);
		});
		socket.addEventListener('message', function (ev) {
			term.write(ev.data);
		});
	});  
}


function spectateGame(player) {
	var terminalContainer=document.getElementById("terminal-container");
	terminalContainer.innerHTML='';
	term = new Terminal({
		cols: 150,
		rows: 40,
		useStyle: true,
		screenKeys: true,
		cursorBlink: false
	});
	term.open(terminalContainer);
	var socketURL = 'ws://' + location.hostname + ((location.port) ? (':' + location.port) : '') + '/watch?player='+player;
	socket = new WebSocket(socketURL);
	socket.addEventListener('message', function (ev) {
		term.write(ev.data);
	});
}

function closeGame() {
	socket.close();
}