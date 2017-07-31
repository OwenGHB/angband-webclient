
var protocol = location.protocol === "https:" ? "wss" : "ws";
var socketURL = protocol + '://' + location.hostname + ((location.port) ? (':' + location.port) : '') + '/meta';
var socket;
var dimensions={rows:50, cols:150};
var terminfo = 'xterm-256color';
var term = new Terminal({
	termName: terminfo,
	colors: Terminal.xtermColors,
	cols: dimensions.cols,
	rows: dimensions.rows,
	cursorBlink: false
});
term.applicationCursor=true;
var spyglass = {};
var playing = false;

function adjustsize(){
	var prefersize={cols:parseInt(document.getElementById('mincolumns').value),rows:parseInt(document.getElementById('minrows').value)};
	var windowwidth = Math.min(window.innerWidth,document.documentElement.clientWidth);
	var windowheight = Math.min(window.innerHeight,document.documentElement.clientHeight);
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
		var t_height = Math.floor(windowheight/needsize[i].rows);
		var t_result = testfont(t_height,needsize[i],document.body.style.fontFamily);
		while (testfont(t_height,needsize[i],document.body.style.fontFamily).x >  windowwidth && t_height > 2){
			t_height--;
		}
		needsize[i].lineHeight = t_height;
	}
	var lineheight;
	if (document.getElementById('widescreen').value=='on'){
		lineHeight=needsize.wide.lineHeight;
		widescreen=true;
	} else if (document.getElementById('widescreen').value=='off'){
		lineHeight=needsize.narrow.lineHeight;
		widescreen=false;
	} else if (needsize.narrow.lineHeight<needsize.wide.lineHeight){
		lineHeight=needsize.wide.lineHeight;
		widescreen=true;
	} else {
		lineHeight=needsize.narrow.lineHeight;
		widescreen=false;
	}
	var fontSize=lineHeight;
	var results = testfont(lineHeight,dimensions,document.body.style.fontFamily);
	document.getElementById("container").style.width=windowwidth+'px';
	document.getElementById("container").style.height=windowheight+'px';
	document.getElementById("container").style.fontSize=fontSize+'px';
	document.getElementById("container").style.lineHeight=lineHeight+'px';
	var mainmenu = document.getElementById("mainmenu");
	if (mainmenu) {
		document.getElementById("mainmenu").style.width=Math.ceil(results.x)+'px';
		document.getElementById("mainmenu").style.height=Math.ceil(results.y)+'px';
	}
	document.getElementById("terminal-container").style.width=Math.ceil(results.x)+'px';
	document.getElementById("terminal-container").style.height=Math.ceil(results.y)+'px';
	var settingsdivids=["navigation","settings","files"];
	if (widescreen) {
		document.getElementById("menu").style.width=(windowwidth-Math.ceil(results.x)-1)+'px';
		document.getElementById("menu").style.height=windowheight+'px';
		document.getElementById("sidebarmenu").style.width=(windowwidth-Math.ceil(results.x)-1)+'px';
		document.getElementById("sidebarmenu").style.height=Math.floor(windowheight/2)+'px';
		for (var i in settingsdivids) {
			document.getElementById(settingsdivids[i]).style.height=(Math.floor(windowheight/2)-document.getElementById("menutabs").offsetHeight)+'px';
			document.getElementById(settingsdivids[i]).style.width=(windowwidth-Math.ceil(results.x)-1)+'px';
		}
		document.getElementById("chat").style.height=(Math.floor(windowheight/2))+'px';
		document.getElementById("chat").style.width=(windowwidth-Math.ceil(results.x)-1)+'px';
		document.getElementById("chatlog").style.height=(Math.ceil(windowheight/2)-Math.max(document.getElementById("chatmessage").offsetHeight,document.getElementById("sendchat").offsetHeight)-document.getElementById("chattabs").offsetHeight-1)+'px';
	} else {
		document.getElementById("menu").style.width=windowwidth+'px';
		document.getElementById("menu").style.height=(windowheight-Math.ceil(results.y)-1)+'px';
		document.getElementById("sidebarmenu").style.width=Math.floor(windowwidth/2)+'px';
		document.getElementById("sidebarmenu").style.height=(windowheight-Math.ceil(results.y)-1)+'px';
		for (var i in settingsdivids) {
			document.getElementById(settingsdivids[i]).style.height=(windowheight-Math.ceil(results.y)-document.getElementById("menutabs").offsetHeight-1)+'px';
			document.getElementById(settingsdivids[i]).style.width=Math.floor(windowwidth/2)+'px';
		}
		document.getElementById("chat").style.height=(windowheight-Math.ceil(results.y)-1)+'px';
		document.getElementById("chat").style.width=Math.floor(windowwidth/2)+'px';
		document.getElementById("chatlog").style.height=(windowheight-Math.ceil(results.y)-Math.max(document.getElementById("chatmessage").offsetHeight,document.getElementById("sendchat").offsetHeight)-document.getElementById("chattabs").offsetHeight-1)+'px';
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
function applyTerminal(mode, qualifier, panels, walls) {
	var debug = document.getElementById('debug');
	var child = document.getElementById("p1");
	document.getElementById("mainmenu").style.display="none";
	document.getElementById("terminal-container").style.display="block";
	var terminalContainer=document.getElementById("terminal-container");
	terminalContainer.innerHTML='';
	if (mode=='play') {
		if (!playing){
			playing=true;
			var livelink = document.createElement("button");
			livelink.className = "navlink";
			var textnode = document.createTextNode(qualifier);
			livelink.appendChild(textnode);
			livelink.setAttribute('onclick','applyTerminal("play","'+qualifier+'")');
			document.getElementById("navigation").appendChild(livelink);
			socket.send(JSON.stringify({eventtype:'newgame',content:{game:qualifier,panels:panels,dimensions:dimensions,walls:walls}}));
			term.on('data', function(data) {
				socket.send(JSON.stringify({eventtype:'gameinput',content:data}));
				if (false) {
					debug.innerHTML=JSON.stringify(data);
				}
			});
		}
		term.open(terminalContainer);
	} 
	else if (mode=='spectate') {
		if (typeof(spyglass[qualifier])=='undefined') {
			var livelink = document.createElement("button");
			livelink.className = "navlink";
			var textnode = document.createTextNode(qualifier);
			livelink.appendChild(textnode);
			livelink.setAttribute('onclick','applyTerminal("spectate","'+qualifier+'")');
			document.getElementById("navigation").appendChild(livelink);
			spyglass[qualifier] = new Terminal({
				termName: terminfo,
				colors: Terminal.xtermColors,
				cols: dimensions.cols,
				rows: dimensions.rows,
				cursorBlink: false
			});
			socket.send(JSON.stringify({eventtype:'subscribe',content:{player:qualifier}}));
		}
		spyglass[qualifier].open(terminalContainer);
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
			document.getElementById("userlist").innerHTML='<ul><li>'+data.content.join('</li><li>')+'</li></ul>';
			document.getElementById("userlistbutton").innerHTML='Users online: '+data.content.length;
		} else if (data.eventtype=='matchupdate') {
			listmatches(data.content);
		} else if (data.eventtype=='fileupdate') {
			document.getElementById("files").innerHTML=listfiles(data.content);
		} else if (data.eventtype=='spectatorinfo') {
			document.getElementById("chatlog").innerHTML+=data.content+'<br>';
			document.getElementById("chatlog").scrollTop = document.getElementById("chatlog").scrollHeight - document.getElementById("chatlog").clientHeight;
		} else if (data.eventtype=='owngameoutput') {
			term.write(data.content);
		} else if (data.eventtype=='gameoutput'){
			if (typeof(spyglass[data.content.player])!='undefined') {
				spyglass[data.content.player].write(data.content.data);
			} else {
				spyglass[data.content.player] = new Terminal({
					termName: terminfo,
					colors: Terminal.xtermColors,
					cols: dimensions.cols,
					rows: dimensions.rows,
					cursorBlink: false
				});
				spyglass[data.content.player].write(data.content.data);
			}
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
		document.getElementById('playbutton').setAttribute('onclick','applyTerminal("play","'+document.getElementById("gameselect").value+'",'+document.getElementById("panels").value+','+document.getElementById("walls").checked+')');
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
	document.getElementById("navigationbutton").addEventListener("click",function(){
		document.getElementById("navigation").style.display="block";
		document.getElementById("settings").style.display="none";
		document.getElementById("files").style.display="none";
	});
	document.getElementById("settingsbutton").addEventListener("click",function(){
		document.getElementById("navigation").style.display="none";
		document.getElementById("settings").style.display="block";
		document.getElementById("files").style.display="none";
	});
	document.getElementById("filesbutton").addEventListener("click",function(){
		document.getElementById("navigation").style.display="none";
		document.getElementById("settings").style.display="none";
		document.getElementById("files").style.display="block";
	});
	document.getElementById("chatbutton").addEventListener("click",function(){
		document.getElementById("chatlog").style.display="block";
		document.getElementById("chatmessage").style.display="inline";
		document.getElementById("sendchat").style.display="inline";
		document.getElementById("userlist").style.display="none";
	});
	document.getElementById("userlistbutton").addEventListener("click",function(){
		document.getElementById("chatlog").style.display="none";
		document.getElementById("chatmessage").style.display="none";
		document.getElementById("sendchat").style.display="none";
		document.getElementById("userlist").style.display="block";
	});
	document.getElementById("homebutton").addEventListener("click",function(){
		document.getElementById("mainmenu").style.display="block";
		document.getElementById("terminal-container").style.display="none";
	});
	var fonts = [ 
	'AmstradPC1512',
	'IBM_BIOS',
	'IBM_CGA',
	'IBM_CGAthin',
	'IBM_MDA',
	'IBM_VGA9',
	'TandyNew_225',
	'TandyNew_TV',
	'VGA_SquarePx',
	'YOzFontOTWD'
	];
	for (var i in fonts) {
		var fontoption = document.createElement('option');
		fontoption.value = fonts[i];
		fontoption.appendChild(document.createTextNode(fonts[i]));
		document.getElementById('fontselect').appendChild(fontoption);
	}
	document.getElementById('applysettings').addEventListener("click",function(){
		document.body.style.fontFamily=document.getElementById('fontselect').value;
		adjustsize();
	});
	document.body.style.fontFamily=document.getElementById('fontselect').value;
}
