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
	document.getElementById("playmenu").innerHTML='';
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
			//hack for arrow keys
			data=data.replace("[A","OA");
			data=data.replace("[B","OB");
			data=data.replace("[C","OC");
			data=data.replace("[D","OD");
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