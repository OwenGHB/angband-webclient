var safety = 10;            // for font size calculation
var initComplete = false    // used to do some stuff only after this will be true

var protocol = location.protocol === "https:" ? "wss" : "ws";
var socketURL = protocol + '://' + location.hostname + ((location.port) ? (':' + location.port) : '') + '/meta';
var socket;

var spyglass = {};
var playing = false;
var dimensions={ rows:50, cols:150 };
var terminfo = 'xterm-256color';
var term = new Terminal({
	termName: terminfo,
	colors: Terminal.xtermColors,
	cols: dimensions.cols,
	rows: dimensions.rows,
	cursorBlink: false
});
term.applicationCursor=true;

var fonts = [
	"Share Tech Mono",
	"Fira Mono",
	"Nova Mono",
	"Overpass Mono",
	"Oxygen Mono",
	"Cutive Mono",
	"VT323",
	"Anonymous Pro",
	"PT Mono",
	"Ubuntu Mono",
	"Cousine",
	"Space Mono",
	"Droid Sans Mono",
	"Source Code Pro",
	"Roboto Mono",
	"Inconsolata"
];

function addMessage(msg, extra_class) {
	var $msg = $(msg);
	if(extra_class) 
		$("#chatlog .wrapper").append('<div class="message"><span class="' + extra_class + '">' + msg + '</span></div>');
	else 
		$("#chatlog .wrapper").append('<div class="message">' + msg + '</div>');
}
function updateUserCount(users) { 
	$("#peoplelist .info").html("<p>there " + (users.length>1?"are":"is") + " <b>" + users.length + "</b> user" + (users.length>1?"s":"") + " online");
	$("#peoplelist .people").html("");
	for(var i=0; i<users.length; i++)
		$("#peoplelist .people").append("<div> - " + users[i] + "</div>");
}
function listMatches(matches) {
	$("#watchmenu ul").html("");
	var players = Object.keys(matches);
	if(players.length > 0) {
		for(var i=0; i<players.length; i++) {
			var p = players[i];
			var m = matches[p];
			var idle = m.idletime > 0 ? ', idle for <span>'+m.idletime+'0</span> seconds' : "";
			$("#watchmenu ul").append(function(i) {
			    return $('<li><span>'+players[i]+'</span> playing <span>'+matches[players[i]].game+'</span>'+idle+'</li>').click(function() {
			        applyTerminal("spectate", players[i]);
			    });
			}(i));			
		}
	}
	else {
		$("#watchmenu ul").append('<li>there are no live games right now</li>');
	}
}
function listFiles(files) { console.log("todo"); }


function showTab(pos, el) {
	const tabs = $(".tab-panels").children().map(function(i,e){return e.id;});
	for(var i=0; i<tabs.length; i++) {
		if(i === pos-1)
			$("#"+tabs[i]).removeClass("hidden")
		else 
			$("#"+tabs[i]).addClass("hidden");
	}
	if(el) {
    	$(".tab-buttons a").removeClass("selected");
    	$(el).addClass("selected");
	}
}

function applyTerminal(mode, qualifier, panels, walls) {
	$terminal = $("#terminal-container");
	if(mode === "play") {
		if (!playing){
			playing = true;
			$("#navigation ul").append(function() {
				return $('<li><a href="#"> - ' + qualifier + ' (your game)</a></li>').click(function() {
					applyTerminal("play", qualifier);
				});
			});
			socket.send(JSON.stringify({
				eventtype:'newgame',
				content: {
					game:qualifier,
					panels: panels,
					dimensions: dimensions,
					walls: walls
				}
			}));
			term.on('data', function(data) {
				socket.send(JSON.stringify({eventtype: 'gameinput', content: data}));
			});
		}
		$terminal.html("");
		term.open($terminal.get(0));
	}
	else if(mode === "spectate") {
		if (typeof(spyglass[qualifier])=='undefined') {
			$("#navigation ul").append(function() {
				return $('<li><a href="#"> - ' + qualifier + '</a></li>').click(function() {
					applyTerminal("spectate", qualifier);
				});
			});
			spyglass[qualifier] = new Terminal({
				termName: terminfo,
				colors: Terminal.xtermColors,
				cols: dimensions.cols,
				rows: dimensions.rows,
				cursorBlink: false
			});
			socket.send(JSON.stringify({eventtype:'subscribe', content:{player:qualifier}}));
		}
		spyglass[qualifier].open($terminal.get(0));
	}
	
	// resize terminal container to fit remaining space nicely
	adjustTerminalFontSize();
	
	// hide lobby and unhide terminal
	$("#games-lobby").addClass("hidden");
	$("#terminal-pane").removeClass("hidden");
}

function adjustTerminalFontSize() {
	$("#tester").css("display", "initial");
	$("#tester").css("visibility", "hidden");
	var sizes = [8,9,10,10.5,11,12,13,14,15,16,17,18,19,20];
	var window_width = $(window).innerWidth();
	var $mainpane = $(".pane-main");
	var mph = $mainpane.innerHeight();
	var mpw = $mainpane.innerWidth();
	var selected_size = sizes[0];
	for(var i=0; i<sizes.length; i++) {
		$("#tester").css('font-size', sizes[i] + "px");
		var tw = $("#tester").innerWidth();
		var th = $("#tester").innerHeight();
		var cfs = $("#tester").css('font-size');
// 		console.log("main-pane:", mpw, mph, "testing font size:", sizes[i], "test div:", tw, th, "term:",tw*dimensions.cols, th*dimensions.rows);
		var check_width = dimensions.cols * tw > mpw-safety;
		var check_height = window_width < 1000 ? false : dimensions.rows * th > mph-safety;
		if(check_height || check_width) {
// 			console.log("best font size is", selected_size, `that gives width=${dimensions.cols * tw} and height=${dimensions.rows * th}`);
			break;
		}
		else 
			selected_size = sizes[i];
	}
	$("#tester").css("display", "none");
	$("#terminal-container").css("font-size", selected_size + "px");
}

function initChat() {
	socket = new WebSocket(socketURL);
	socket.addEventListener('message', function (ev) {
		var data = JSON.parse(ev.data);
		switch(data.eventtype) {
			case "chat":
				addMessage(data.content); 
				if(initComplete)
				    $("#chatlog .wrapper").animate({ scrollTop: $('#chatlog .wrapper').prop("scrollHeight")}, 300);
				break;
			case "usercount":
				updateUserCount(data.content); break;
			case "matchupdate":
				listMatches(data.content); break;
			case "fileupdate":
				listFiles(data.content); break;
			case "spectatorinfo":
				addMessage(data.content); break;
			case "owngameoutput":
				term.write(data.content); break;
			case "gameoutput":
				if (typeof(spyglass[data.content.player])!='undefined') {
					spyglass[data.content.player].write(data.content.data);
				} 
				else {
					spyglass[data.content.player] = new Terminal({
						termName: terminfo,
						colors: Terminal.xtermColors,
						cols: dimensions.cols,
						rows: dimensions.rows,
						cursorBlink: false
					});
					spyglass[data.content.player].write(data.content.data);
				}
				break;
			default:
				console.warn("unknown socket event occured", data.eventtype); break;
		}
	});
	socket.addEventListener('close', function () {
		addMessage("***Disconnected***", "system");
	});
	socket.addEventListener('open', function () {
		addMessage("***Connected to chat***", "system");
	});
	$("#new-message-input input").keypress(function(e) {
		if (!e) e = window.event;
		var keyCode = e.keyCode || e.which;
		if (keyCode == '13') {
		    if($(this).val().length > 0) {
    			socket.send(JSON.stringify({eventtype:'chat', content:$(this).val()}));
    			$(this).val("");
    			$("#chatlog .wrapper").animate({ scrollTop: $('#chatlog .wrapper').prop("scrollHeight")}, 1000);
		    }
		}
	});
}

function initGameList() {
	// populate select
	for(var i=0; i<games.length; i++) {
		var g=games[i];
		$("#gameselect").append('<option value='+g.name+' title="'+g.desc+'">'+g.longname+'</option>');
	}
	// select onchange
	$("#gameselect").change(function(e) {
		for(var i=0; i<games.length; i++) {
			if(e.target.value === games[i].name) {
				$("#game-description").html(games[i].desc);
			}
		}
	});
	$("#gameselect").trigger("change");
	$("#playbutton").click(function() {
		var gamename = $("#gameselect").val();
		var panels = $("#panels").val()
		applyTerminal("play", gamename, panels);
	});
}

function changeTerminalFont(family, skipSaving) {
	var f = '"' + family + '", monospace';
	$("#terminal-container").css("font-family", f);
	$("#tester").css("font-family", f);
	$("#terminal-container").css("font-size", "8px");
	$("#tester").css("font-size", "8px");
	adjustTerminalFontSize();
	if(!skipSaving) saveOption("terminal_font_family", family);
}

function saveOption(opt, val) {
	if(window.localStorage) {
		var ls = window.localStorage.getItem("aw_options");
		if(!ls) ls = {};
		else ls = JSON.parse(ls);
		ls[opt] = val;
		window.localStorage.setItem("aw_options", JSON.stringify(ls));
	}
}

function loadAndApplyOptions() {
	if(window.localStorage) {
		var ls = window.localStorage.getItem("aw_options");
		if(ls) {
			ls = JSON.parse(ls);
			// restore terminal font
			changeTerminalFont(ls["terminal_font_family"], false);
		}
	}
}

$(function() {
	// apply options from local storage
	loadAndApplyOptions();
	
	// init and open chat tab by default
	initChat(); showTab(2);
	
	// init angband variants list box
	initGameList();
	
	// terminal resizer
	$(window).resize(function() { adjustTerminalFontSize(); });
	
	// navigation to home button
	$("#navigation-home").click(function() {
    	$("#terminal-pane").addClass("hidden");
    	$("#games-lobby").removeClass("hidden");
	});
	
	// add extra fonts
	fonts.map(function(f,i) {
		$("#extra-fonts").append('<option value="' + f + '">' + f + '</option>');
	});
	$("#extra-fonts").change(function(e) { changeTerminalFont(e.target.value); });
	
    // scroll chat messages
	setTimeout(function() {
	    $("#chatlog .wrapper").animate({ scrollTop: $('#chatlog .wrapper').prop("scrollHeight")}, 300);
	    initComplete = true;
	}, 1000);
});