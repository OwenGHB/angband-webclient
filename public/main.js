var term,
    protocol,
    socketURL,
    socket,
    pid,
    charWidth,
    charHeight;

var terminalContainer = document.getElementById('terminal-container');
var controls = document.getElementById('controls');
document.getElementById('newgame-angband').setAttribute('onClick','newGame("angband")');
document.getElementById('newgame-poschengband').setAttribute('onClick','newGame("poschengband")');
document.getElementById('newgame-faangband').setAttribute('onClick','newGame("faangband")');

function newGame(game) {
  // Clean terminal
  while (terminalContainer.children.length) {
    terminalContainer.removeChild(terminalContainer.children[0]);
  }
  //remove controls
  while (controls.children.length) {
    controls.removeChild(controls.children[0]);
  }
  term = new Terminal();

  socketURL = 'ws://' + location.hostname + ((location.port) ? (':' + location.port) : '') + '/games/';

  term.open(terminalContainer);
  term.fit();
  
  var initialGeometry = term.proposeGeometry();
  
  fetch('/games?game='+game, {credentials: 'include', method: 'POST'}).then(function (res) {
	charWidth = Math.ceil(term.element.offsetWidth / 120);
    charHeight = Math.ceil(term.element.offsetHeight / 40);
    res.text().then(function (pid) {
      window.pid = pid;
      socketURL += pid;
      socket = new WebSocket(socketURL);
      socket.onopen = term.attach(socket);
    });
  });  
}
