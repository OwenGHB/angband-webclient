var games = [
	{
		name:'angband',
		longname:'Angband 4.1.0',
		desc:"The latest release of the classic dungeon exploration game inspired by the work of JRR Tolkein. Descended from Moria."
	},
	{
		name:'competition',
		longname:'Competition 207',
		desc:"Aldarion is a Dunadan who has a knack for reading arcane runes. Unfortunately, he took that as a sign that he should be a Valar-slaying mage, and he's regretting his life decisions at the moment."
	},
	{
		name:'faangband',
		longname:'FAangband 1.4.4',
		desc:"Redesigned gameplay mechanics, full of new features and new content, including wilderness levels. Faithful to Tolkein. Descended from Oangband"
	},
	{
		name:'hellband',
		longname:'Hellband 0.8.7',
		desc:"Fantasy renaissance Italian setting, informed by demonology and inspired by Dante. Descended from Zangband. Won't load keymaps (i.e. movement) from default pref folder, you have to make your own."
	},
	{
		name:'nppangband',
		longname:'NPPAngband 7.1.0',
		desc:"Attempts to preserve classic angband gameplay but with various improvements."
	},
	{
		name:'nppmoria',
		longname:'NPPMoria 7.1.0',
		desc:"A recreation of Moria using the NPPAngband engine."
	},
	{
		name:'oangband',
		longname:'Oangband 1.1.0u',
		desc:'Opinion angband. Redesigned gameplay mechanics and extra content. Very influential'
	},
	{
		name:'poschengband',
		longname:'PosChengband 6.1.0b',
		desc:"One of the most popular variants, bursting with new content. Includes wilderness. Descended from Zangband."
	},
	{
		name:'sangband',
		longname:'Sangband 1.0.0',
		desc:'Skills Angband.'
	},
	{
		name:'sil',
		longname:'Sil 1.3.0',
		desc:"Heavily redesigned gameplay mechanics to be a shorter but more tactically intricate game. Very faithful to Tolkein. Descended from NPPAngband"
	},
	{
		name:'steamband',
		longname:'Steamband 0.4.1f',
		desc:'Steampunk Angband. Please use your site username for your character name if playing, or else progress will be lost.'
	},
	{
		name:'tome',
		longname:'ToME 2.3.6-ah',
		desc:"Full of new content, quests and a large open world. Descended from Zangband."
	},
	{
		name:'umoria',
		longname:'UMoria 5.6',
		desc:'A restoration of the original Moria game.'
	},
	{
		name:'unangband',
		longname:'UnAngband 6.5.0a',
		desc:"Influential variant full of new content with new quests, classes and locations."
	},
	{
		name:'zangband',
		longname:'ZAngband 2.7.5pre1',
		desc:"Massively influential variant. New races, classes, and an overworld."
	}
];

var term;
var socket;
var socketURL = 'ws://' + location.hostname + ((location.port) ? (':' + location.port) : '') + '/meta';
var dimensions={rows:50,cols:150};
var terminfo = 'xterm-256color';
term = new Terminal({
	termName: terminfo,
	colors: Terminal.xtermColors,
	cols: dimensions.cols,
	rows: dimensions.rows,
	cursorBlink: false
});
term.applicationCursor=true;

function adjustsize(){
	var prefersize = {cols:30,rows:8};
	var needsize = {
		wide:{
			cols: dimensions.cols+prefersize.cols,
			rows: dimensions.rows
		},
		narrow:{
			cols: dimensions.cols,
			rows: dimensions.rows+prefersize.rows
		}
	};
	for (var i in needsize) {
		var t_height = Math.floor(window.innerHeight/needsize[i].rows);
		var t_result = testfont(t_height,needsize[i],document.body.style.fontFamily);
		while (testfont(t_height,needsize[i],document.body.style.fontFamily).x >  window.innerWidth && t_height > 2){
			t_height--;
		}
		needsize[i].lineHeight = t_height;
	}
	var widescreen;
	var lineheight;
	if (needsize.narrow.lineHeight<needsize.wide.lineHeight){
		lineHeight=needsize.wide.lineHeight;
		widescreen=true;
	} else {
		lineHeight=needsize.narrow.lineHeight;
		widescreen=false;
	}
	var fontSize=lineHeight;
	var results = testfont(lineHeight,dimensions,document.body.style.fontFamily);
	document.getElementById("container").style.width=window.innerWidth+'px';
	document.getElementById("container").style.height=window.innerHeight+'px';
	document.getElementById("container").style.fontSize=fontSize+'px';
	document.getElementById("container").style.lineHeight=lineHeight+'px';
	var mainmenu = document.getElementById("mainmenu");
	if (mainmenu) {
		document.getElementById("mainmenu").style.width=Math.ceil(results.x)+'px';
		document.getElementById("mainmenu").style.height=Math.ceil(results.y)+'px';
	}
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
			text+='#';
		}
		var node = document.createTextNode(text);
		span.appendChild(node);
		span.innerHTML+='</br>';
	}
	document.body.appendChild(span);
	var results = {x:span.scrollWidth,y:span.scrollHeight,ratio:(span.scrollWidth/cols)/(span.scrollHeight/rows)};
	document.body.removeChild(span);
	return results;
}
function applyTerminal(mode, qualifier, panels) {
	var debug = document.getElementById('debug');
	var child = document.getElementById("p1");
	document.getElementById("container").removeChild(document.getElementById("mainmenu"));
	document.getElementById("terminal-container").style.display="block";
	var terminalContainer=document.getElementById("terminal-container");
	terminalContainer.innerHTML='';
	term.open(terminalContainer);
	if (mode=='play') {
		
		socket.send(JSON.stringify({eventtype:'newgame',content:{game:qualifier,panels:panels,dimensions:dimensions}}));
		term.on('data', function(data) {
			socket.send(JSON.stringify({eventtype:'gameinput',content:data}));
			if (false) {
				debug.innerHTML=JSON.stringify(data);
			}
		});
	} else if (mode=='spectate') {
		socket.send(JSON.stringify({eventtype:'subscribe',content:{player:qualifier}}));
	}
}
function listmatches(livematches){
	var watchmenu=document.getElementById("watchmenu");
	watchmenu.innerHTML = 'Live games: ';
	var watchlist = document.createElement("ul");
	watchmenu.appendChild(watchlist);
	for (var i in livematches) {
		var livematch = document.createElement("li");
		livematch.className = "livematch";
		var livelink = document.createElement("button");
		livelink.className = "player";
		var playername = document.createTextNode(i+" ("+livematches[i].game+")");
		var idletime = document.createTextNode(" idle "+livematches[i].idletime+"0 seconds");
		livelink.appendChild(playername);
		livelink.setAttribute('onclick','applyTerminal("spectate","'+i+'")');
		watchlist.appendChild(livematch);
		livematch.appendChild(livelink);
		if (parseInt(livematches[i].idletime)>0) {
			livematch.appendChild(idletime);
		}
	}
	var debug = false;
	if (debug) debug.innerHTML=JSON.stringify(livematches);
}
function listfiles(filelinks){
	var list = '<ul>';
	for (var i in filelinks){
		list+='<li>'+i+'<ul>';
		for (var j in filelinks[i]){
				list+='<li>';
				list+='<a href="/user/'+document.getElementById("username").innerHTML+'/'+i+'/'+filelinks[i][j]+'">';
				list+=filelinks[i][j]
				list+='</a>';
				list+='</li>';
		}
		list+='</ul></li>';
	}
	list += '</ul>';
	return list;
}
function initmeta(){
	socket = new WebSocket(socketURL);
	socket.addEventListener('message', function (ev) {
		var data = JSON.parse(ev.data);
		//switch this
		if (data.eventtype=='chat') {
			document.getElementById("chatlog").innerHTML+=data.content+'<br>';
			document.getElementById("chatlog").scrollTop = document.getElementById("chatlog").scrollHeight - document.getElementById("chatlog").clientHeight;
		} else if (data.eventtype=='usercount') {
			document.getElementById("usercount").innerHTML=data.content;
		} else if (data.eventtype=='matchupdate') {
			listmatches(data.content);
		} else if (data.eventtype=='fileupdate') {
			document.getElementById("files").innerHTML=listfiles(data.content);
		} else if (data.eventtype=='spectatorinfo') {
			document.getElementById("chatlog").innerHTML+=data.content+'<br>';
			document.getElementById("chatlog").scrollTop = document.getElementById("chatlog").scrollHeight - document.getElementById("chatlog").clientHeight;
		} else if (data.eventtype=='gameoutput') {
			term.write(data.content);
		}
	});
	socket.addEventListener('close', function () {
		document.getElementById("chatlog").innerHTML+='***Disconnected***<br>';
		document.getElementById("chatlog").scrollTop = document.getElementById("chatlog").scrollHeight - document.getElementById("chatlog").clientHeight;
	});
	socket.addEventListener('open', function () {
		document.getElementById("chatlog").scrollTop = document.getElementById("chatlog").scrollHeight - document.getElementById("chatlog").clientHeight;
	});
	document.getElementById("sendchat").addEventListener("click",function() {
		chatsocket.send(JSON.stringify({eventtype:'chat',content:document.getElementById("chatmessage").value}));
		document.getElementById("chatmessage").value='';
	});
	document.getElementById("chatmessage").onkeypress = function(e){
		if (!e) e = window.event;
		var keyCode = e.keyCode || e.which;
		if (keyCode == '13'){
			socket.send(JSON.stringify({eventtype:'chat',content:document.getElementById("chatmessage").value}));
			document.getElementById("chatmessage").value='';
		}
	}
}
function initcontrols(){
	for (var i in games) {
		if (i==0) document.getElementById("gamedescription").innerHTML=games[i].desc;
		var gameoption = document.createElement("option");
		gameoption.value=games[i].name;
		gameoption.appendChild(document.createTextNode(games[i].longname));
		document.getElementById("gameselect").appendChild(gameoption);
	}
	document.getElementById("gameselect").addEventListener("change",function(){
		document.getElementById("gamedescription").innerHTML=games.find(function(game){
			var ismatch = false;
			if (game.name==document.getElementById("gameselect").value) ismatch = true;
			return ismatch;
		}).desc;
		document.getElementById('playbutton').setAttribute('onclick','applyTerminal("play","'+document.getElementById("gameselect").value+'",'+document.getElementById("panels").value+')');
	});
	document.getElementById('playbutton').setAttribute('onclick','applyTerminal("play","'+document.getElementById("gameselect").value+'",'+document.getElementById("panels").value+')');
	document.getElementById("columns").value=dimensions.cols;
	document.getElementById("rows").value=dimensions.rows;
	document.getElementById("columns").addEventListener("input",function(){
		dimensions.cols=document.getElementById("columns").value;
		adjustsize();
	});
	document.getElementById("rows").addEventListener("input",function(){
		dimensions.rows=document.getElementById("rows").value;
		adjustsize();
	});
	document.getElementById("panels").oninput = function(){
		var playbutton = document.getElementById('playbutton');
		if (playbutton) playbutton.setAttribute('onclick','applyTerminal("play","'+document.getElementById("gameselect").value+'",'+document.getElementById("panels").value+')');
	}
}
function initsettings(){
	var fonts = [ 
	'AmstradPC1512',
	'IBM_BIOS',
	'IBM_CGA',
	'IBM_CGAthin',
	'IBM_EGA8',
	'IBM_EGA9',
	'IBM_MDA',
	'IBM_VGA8',
	'IBM_VGA9',
	'TandyNew_225',
	'TandyNew_TV',
	'VGA_SquarePx',
	'YOz14s',
	'YOzFontOTWD'
	];
	for (var i in fonts) {
		var fontoption = document.createElement('option');
		fontoption.value = fonts[i];
		fontoption.appendChild(document.createTextNode(fonts[i]));
		document.getElementById('fontselect').appendChild(fontoption);
	}
	document.getElementById('fontselect').onchange = function(){
		document.body.style.fontFamily=document.getElementById('fontselect').value;
		adjustsize();
	};
	document.body.style.fontFamily=document.getElementById('fontselect').value;
}
function signIn(){
	var loginform = document.getElementById("login-form");
	loginform.action = "/signin";
	loginform.submit();
}