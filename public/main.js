var term;
var socket;
var dimensions={rows:50,cols:150};
var games = ['angband','poschengband','faangband','sil','borg'];

function adjustsize(){
	var needsize = {wide:{},narrow:{}};
	needsize.wide.cols = dimensions.cols+35;
	needsize.wide.rows = dimensions.rows;
	needsize.narrow.cols = dimensions.cols;
	needsize.narrow.rows = dimensions.rows+10;
	for (var i in needsize) {
		var optheight = Math.floor(window.innerHeight/needsize[i].rows);
		var optwidth = Math.floor((window.innerWidth/needsize[i].cols)/testfont(optheight,dimensions,document.body.style.fontFamily).ratio);
		needsize[i].lineHeight = Math.min(optwidth,optheight);
	}
	var lineHeight=Math.max(needsize.narrow.lineHeight,needsize.wide.lineHeight);
	var fontSize=lineHeight;
	var results = testfont(lineHeight,dimensions,document.body.style.fontFamily);
	var widescreen=(needsize.narrow.lineHeight<=needsize.wide.lineHeight);
	document.getElementById("container").style.width=window.innerWidth+'px';
	document.getElementById("container").style.height=window.innerHeight+'px';
	document.getElementById("container").style.fontSize=fontSize+'px';
	document.getElementById("container").style.lineHeight=lineHeight+'px';
	document.getElementById("terminal-container").style.width=Math.ceil(results.x)+'px';
	document.getElementById("terminal-container").style.height=Math.ceil(results.y)+'px';
	if (widescreen) {
		document.getElementById("menu").style.width=(window.innerWidth-Math.ceil(results.x)-1)+'px';
		document.getElementById("menu").style.height=Math.ceil(results.y)+'px';
		document.getElementById("settings").style.height=Math.floor(6*window.innerHeight/20)+'px';
		document.getElementById("settings").style.width=(window.innerWidth-Math.ceil(results.x)-1)+'px';
		document.getElementById("files").style.height=Math.floor(7*window.innerHeight/20)+'px';
		document.getElementById("files").style.width=(window.innerWidth-Math.ceil(results.x)-1)+'px';
		document.getElementById("chat").style.height=Math.floor(7*window.innerHeight/20)+'px';
		document.getElementById("chat").style.width=(window.innerWidth-Math.ceil(results.x)-1)+'px';
		document.getElementById("chatlog").style.height=(Math.ceil(7*window.innerHeight/20)-Math.max(document.getElementById("chatmessage").offsetHeight,document.getElementById("sendchat").offsetHeight)-document.getElementById("usercount").offsetHeight-1)+'px';
	} else {
		document.getElementById("menu").style.width=window.innerWidth+'px';
		document.getElementById("menu").style.height=(window.innerHeight-Math.ceil(results.y)-1)+'px';
		document.getElementById("settings").style.height=(window.innerHeight-Math.ceil(results.y)-1)+'px';
		document.getElementById("settings").style.width=Math.floor(6*window.innerWidth/20)+'px';
		document.getElementById("files").style.height=(window.innerHeight-Math.ceil(results.y)-1)+'px';
		document.getElementById("files").style.width=Math.floor(7*window.innerWidth/20)+'px';
		document.getElementById("chat").style.height=(window.innerHeight-Math.ceil(results.y)-1)+'px';
		document.getElementById("chat").style.width=Math.floor(7*window.innerWidth/20)+'px';
		document.getElementById("chatlog").style.height=(window.innerHeight-Math.ceil(results.y)-Math.max(document.getElementById("chatmessage").offsetHeight,document.getElementById("sendchat").offsetHeight)-document.getElementById("usercount").offsetHeight-1)+'px';
	}
}
function testfont(lineHeight,dimensions,fontFamily) {
	var span = document.createElement("span");
	var cols = dimensions.cols;
	var rows = dimensions.rows;
	span.style.lineHeight=lineHeight+'px';
	span.style.fontSize=lineHeight+'px';
	span.style.fontFamily=fontFamily;
	span.style.position="fixed";
	for (var j=0;j<rows;j++){
		var text = "";
		for (var k=0;k<cols;k++) {
			text+='l';
		}
		var node = document.createTextNode(text);
		span.appendChild(node);
		span.innerHTML+='</br>';
	}
	document.body.appendChild(span);
	var results = {x:span.offsetWidth,y:span.offsetHeight,ratio:(span.offsetWidth/cols)/(span.offsetHeight/rows)};
	document.body.removeChild(span);
	return results;
}
function applyTerminal(mode, qualifier, panels) {
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
		fetch('/newgame?game='+qualifier+'&panels='+panels+'&rows='+dimensions.rows+'&cols='+dimensions.cols, {credentials: 'include', method: 'POST'}).then(function () {
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
