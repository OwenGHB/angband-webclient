var safety = 2;            // for font size calculation
var initComplete = false    // used to do some stuff only after this will be true

var protocol = window.location.protocol === "https:" ? "wss" : "ws";
var socketURL = protocol + '://' + window.location.hostname + ((window.location.port) ? (':' + window.location.port) : '') + '/meta';
var socket;
var user_list = [];

var matched_user_list = [];
var isAutocompleteOpened = false;
var currentAutocompletePos = 0;

var spyglass = {};
var playing = false;
var dimensions= {};

//var username also available

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
	"Inconsolata",
	"Lucida Console",
	"Courier"
];
var font_sizes = [8,9,10,10.5,11,12,13,14,15,16,17,18,19,20,22,24,26,28,32,36,40];
var localStorage;
var TU;
var notify_sound = $("#notification").get(0);


function populateChat(messages) {
	messages.forEach(function(message) {
		if (message.user=='--system--') {
			addMessage(message, "system", false);
		} else if (message.user=='--deathangel--') {
			addMessage(message, "deathangel", false);
		} else {
			addMessage(message, false, false);
		}
	});
	$("#chatlog .wrapper").animate({ scrollTop: $('#chatlog .wrapper').prop("scrollHeight")}, 300);
   initComplete = true;
}


function addMessage(msg, extra_class, shouldNotify) {
	// var $msg = $(msg);
	var classes = [];
	var ts = moment(msg.timestamp).format("HH:mm");

	if(msg.extra) 
		classes = msg.extra.join(" ") + " " + msg.user;
	
	if(!extra_class && msg.user !== "--system--") {
		var $m = $('<div class="message"><span class="time">['+ts+'] </span><span class="user '+classes+'">'+msg.user+'</span>: <span class="msg"></span></div>');
		$m.find("span.msg").text(msg.message);
		$("#chatlog .wrapper").append($m);
		if(shouldNotify) 
			notifyIfNeeded(username, msg.message);
	}
	else {
		var _m = typeof msg === "object" ? msg.message : msg;
		$("#chatlog .wrapper").append('<div class="message"><span class="time">['+ts+'] </span><span class="'+extra_class+'">' + _m + '</span></div>');
	}

	// if user is outside chat tab and new msg arrive blink chat icon
	if(window.localStorage) {
		if(!$("#link-chat").hasClass("selected")) {
			var unix_ts = moment(msg.timestamp).unix();
			var unix_ts_before = window.localStorage.getItem("last_msg");

			if(!unix_ts_before || unix_ts > unix_ts_before)
				$("#link-chat").addClass("flashing");

			window.localStorage.setItem("last_msg", unix_ts);
		}
	}
}


function notifyIfNeeded(user, message) {
	if(message.indexOf("@" + user) !== -1)
		notify_sound.play();
}


function updateUserCount(users) { 
	$("#peoplelist .info").html("<p>there " + (users.length>1?"are":"is") + " <b>" + users.length + "</b> user" + (users.length>1?"s":"") + " online");
	$("#peoplelist .people").html("");
	for(var i=0; i<users.length; i++)
		$("#peoplelist .people").append("<div> - " + users[i] + "</div>");
	user_list = users;
}


function listMatches(matches) {
	$("#watchmenu ul").html("");
	var players = Object.keys(matches);
	if(players.length > 0) {
		for(var i=0; i<players.length; i++) {
			var idle = matches[players[i]].idletime > 0 ? ', idle for <span>'+matches[players[i]].idletime+'0</span> seconds' : "";
			$("#watchmenu ul").append(function(i) {
				var outputstring = '<li><span>'+players[i]+'</span> playing <span>'+matches[players[i]].game+'</span>';
				if (typeof(matches[players[i]].race) != 'undefined'){
					outputstring += ' as a <span>';
					if (typeof(matches[players[i]].cLvl) != 'undefined') outputstring +='Level ' + matches[players[i]].cLvl + ' ';
					if (typeof(matches[players[i]].subRace) != 'undefined') outputstring += matches[players[i]].subRace + ' ';
					outputstring += matches[players[i]].race;
					if (typeof(matches[players[i]].class) != 'undefined' && matches[players[i]].class != "Monster") outputstring += ' ' + matches[players[i]].class;
					if (typeof(matches[players[i]].mRealm1) != 'undefined') {
						outputstring += ' (' + matches[players[i]].mRealm1;
						if (typeof(matches[players[i]].mRealm2) != 'undefined') {
							outputstring += '/' + matches[players[i]].mRealm2+')';
						} else outputstring += ')';
					}
					if (typeof(matches[players[i]].subClass) != 'undefined') outputstring += ' ('+matches[players[i]].subClass+')';
					if (typeof(matches[players[i]].mapName) != 'undefined') {
						if (typeof(matches[players[i]].dLvl) != 'undefined' && parseInt(matches[players[i]].dLvl) > 0) {
							if (matches[players[i]].mapName!='Quest') {
								outputstring += ' on Level ' + matches[players[i]].dLvl;
								outputstring += ' of ' + matches[players[i]].mapName;
							} else {
								outputstring += ' in a Level ' + matches[players[i]].dLvl;
								outputstring += ' ' + matches[players[i]].mapName;
							}
						} else {
							outputstring += ' in ' + matches[players[i]].mapName;
						}
					} else if (typeof(matches[players[i]].mDepth) != 'undefined') {
						outputstring += ' (max depth ' + matches[players[i]].mDepth + '\')';
					}
					outputstring += '</span>' + idle + '</li>';
				}
			   return $(outputstring).click(function() {
			   	if(players[i] === username)
			      	applyTerminal("play", players[i], 1, "no", matches[players[i]].dimensions);
			   	else
			      	applyTerminal("spectate", players[i], 1, "no", matches[players[i]].dimensions);
			   });
			}(i));			
		}
	}
	else {
		$("#watchmenu ul").append('<li>there are no live games right now</li>');
	}
}


function listFiles(files) {
	var $tab = $("#tab-files .wrapper");
	var user = files.name;
	delete files.name;
	var games = Object.keys(files);
	if(games.length === 0)
		return;
	$tab.html("");
	for(var i=0; i<games.length; i++) {
		var userfiles = files[games[i]];
		if(userfiles.length > 0) {
			var $game = $('<div class="game">' +games[i]+ '</div>');
			var $list = $('<ul></ul>');
			for(var f=0; f<userfiles.length; f++) {
				var $listitem = $('<li></li>');
				$listitem.append('<a href="#" onclick="requestDeletion(\'usergenerated\',\''+games[i]+'\',\''+userfiles[f]+'\')">✖</a>');
				$listitem.append('<a href="/' +user+ '/' +games[i]+ '/' +userfiles[f]+ '" target="_blank">' +userfiles[f]+ '</a>');
				$list.append($listitem);
			}
			$game.append($list);
			$tab.append($game);
		}		
	}	
}

function requestDeletion(filetype,game,specifier) {
	socket.send(JSON.stringify({eventtype:'deletefile',content:{filetype:filetype,game:game,specifier:specifier}}));
}

function showMenu(){
	$("#terminal-pane").addClass("hidden");
	$("#games-lobby").removeClass("hidden");
}


function showTab(id, el) {
	//ugly hack but a lot of things are ugly right now
	if (['tab-chat','tab-people'].includes(id)){
		$(".isaf div.tab").addClass("hidden");
		$("#" + id).removeClass("hidden");
		$(".isaf a").removeClass("selected");
	} else {
		$(".uchel div.tab").addClass("hidden");
		$("#" + id).removeClass("hidden");
		$(".uchel a").removeClass("selected");
	}
	$(el).addClass("selected");

	if(id === "tab-chat")
		$("#link-chat").removeClass("flashing");
}


function createTerminal(dimensions) {
	return new Terminal({
		termName: 'xterm-256color',
		colors: Terminal.xtermColors,
		cols: parseInt(dimensions.cols)+1,
		rows: parseInt(dimensions.rows)+1,
		cursorBlink: false,
		applicationCursor: true
	});
}


function applyTerminal(mode, qualifier, panels, walls, d) {
	console.log(`applying terminal: mode=${mode}, qualifier=${qualifier}, panels=${panels}, walls=${walls}, dimensions=${d.rows}x${d.cols}`);
	$terminal = $("#terminal-container");
	dimensions = d;
	if(mode === "play") {
		if (!playing){
			playing = true;
			spyglass['default'] = createTerminal(d);
			$("#navigation ul").append(function() {
				return $('<li><a href="#"> - ' + qualifier + ' (your game)</a></li>').click(function() {
					applyTerminal("play", qualifier, panels, walls, d);
				});
			});
			socket.send(JSON.stringify({
				eventtype:'newgame',
				content: {
					game: qualifier,
					panels: panels,
					dimensions: d,
					walls: walls
				}
			}));
			spyglass['default'].on('data', function(data) {
				$("#keystrokeinput").html(JSON.stringify(data));
				socket.send(JSON.stringify({eventtype: 'gameinput', content: data}));
			});
		}
		$terminal.html("");
		spyglass['default'].open($terminal.get(0));
	}
	else if(mode === "spectate") {
		if (typeof(spyglass[qualifier]) == 'undefined') {
			$("#navigation ul").append(function() {
				return $('<li><a href="#"> - ' + qualifier + '</a></li>').click(function() {
					applyTerminal("spectate", qualifier, panels, walls, d);
				});
			});
			spyglass[qualifier] = createTerminal(d);
			socket.send(JSON.stringify({eventtype:'subscribe', content: {player: qualifier}}));
		}

		// alter font-size to fit player's row/cols to your screen
		adjustFontSizeForSpectation(d);
		

		$terminal.html("");
		spyglass[qualifier].open($terminal.get(0));
	}
	else if(mode === "update") {
		spyglass['default'] = createTerminal(d);
		socket.send(JSON.stringify({
			eventtype:'update',
			content: {
				game: qualifier,
				dimensions: d,
			}
		}));
		spyglass['default'].on('data', function(data) {
			$("#keystrokeinput").html(JSON.stringify(data));
			socket.send(JSON.stringify({eventtype: 'updateinput', content: data}));
		});

		$terminal.html("");
		spyglass['default'].open($terminal.get(0));
	}
	
	// hide lobby and unhide terminal with fade
	$("#games-lobby").addClass("hidden");
	$("#terminal-pane").removeClass("hidden");
}


// does the same as listGameMatches?? 
function cleanSpyGlass(matches){
	$("#navigation ul").html("");
	$("#navigation ul").append(function() {
		return $('<li><a id="navigation-home" href="#"> - home</a></li>').click(function() {
			$("#terminal-pane").addClass("hidden");
			$("#games-lobby").removeClass("hidden");
		});
	});
	var players = Object.keys(matches);
	if(Object.keys(spyglass).length > 0) {
		for(var i in spyglass) {
			if (i == username) {
				$("#navigation ul").append(function(i) {
					return $('<li><a href="#">' + i + '</a></li>').click(function() {
						var panels = $("#subwindows").val();
						var walls = false;
						var d = { rows: $("#term-rows").val(), cols: $("#term-cols").val() };
						var gamename = $("#gameselect").val();
						applyTerminal("play", gamename, panels, walls, );
					});
				}(i));
			} 
			else if (players.includes(i)) {
				$("#navigation ul").append(function(i) {
					return $('<li><a href="#">' + i + '</a></li>').click(function() {
						applyTerminal("spectate", i, 1, false, matches[i].dimensions);
					});
				}(i));	
			} 
			else {
				delete spyglass[i];
			}
		}
	}
}


function closeGame(){
	$("#navigation ul").html("");
	$("#navigation ul").append(function() {
		return $('<li><a id="navigation-home" href="#"> - home</a></li>').click(function() {
			$("#terminal-pane").addClass("hidden");
			$("#games-lobby").removeClass("hidden");
		});
	});
	if(Object.keys(spyglass).length > 0) {
		for(var i in spyglass) {
			if (i!='default') {
				$("#navigation ul").append(function(i) {
					return $('<li><a href="#"> - ' + i + '</a></li>').click(function() {
						applyTerminal("spectate", i, 1, false);
					});
				}(i));	
			} else {
				delete spyglass[i];
			}
		}
	}
	$("#terminal-pane").addClass("hidden");
	$("#games-lobby").removeClass("hidden");
	playing=false;
}


function adjustTerminalFontSize() {
	console.warn("adjustTerminalFontSize is deprecated!");
}


function initChat() {
	socket = new WebSocket(socketURL);
	socket.addEventListener('message', function (ev) {
		var data = JSON.parse(ev.data);
		switch(data.eventtype) {
			case "populate_chat":
				populateChat(data.content); 
				initComplete = true; 
				break;
			case "gamelist":
				initGameList(data.content); 
				loadSelectedGameName();
				break;
			case "chat":
				addMessage(data.content, false, initComplete); 
				if(initComplete)
				    $("#chatlog .wrapper").animate({ scrollTop: $('#chatlog .wrapper').prop("scrollHeight")}, 300);
				break;
			case "usercount":
				updateUserCount(data.content); break;
			case "matchupdate":
				listMatches(data.content); 
				//cleanSpyGlass(data.content); 
				break;
			case "fileupdate":
				listFiles(data.content); break;
			case "systemannounce":
				addMessage(data.content, "system", initComplete);
				if(initComplete)
				    $("#chatlog .wrapper").animate({ scrollTop: $('#chatlog .wrapper').prop("scrollHeight")}, 300);
				break;
			case "deathannounce":
				addMessage(data.content, "deathangel", initComplete);
				if(initComplete)
				    $("#chatlog .wrapper").animate({ scrollTop: $('#chatlog .wrapper').prop("scrollHeight")}, 300);
				break;
			case "owngameoutput":
			case "updateoutput":
				spyglass['default'].write(data.content); break;
			case "gameover":
			case "updateover":
				closeGame(); break;
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
			/* case "gameoutputcache":
				spyglass[data.content.player]=data.content.term;
				break; */
			default:
				console.warn("unknown socket event occured", data.eventtype); break;
		}
	});
	socket.addEventListener('close', function () {
		addMessage("***Disconnected***", "system");
		$("#chatlog .wrapper").animate({ scrollTop: $('#chatlog .wrapper').prop("scrollHeight")}, 300);
		// todo: attempt to reconnect!
	});
	socket.addEventListener('open', function () {
		addMessage("***Connected***", "system");
		$("#chatlog .wrapper").animate({ scrollTop: $('#chatlog .wrapper').prop("scrollHeight")}, 300);
	});
	
	$("#new-message-input input").on("keyup", function(e) {
		if(e.keyCode !== 13) {
			var current_input = (" " + e.target.value);
			var last_block = current_input.split(" ");
			last_block = last_block[last_block.length-1];
			if(last_block[0] === "@" && last_block.split("@").length === 2 && last_block.length > 1) {
				var name_part = last_block.substring(1);
				matched_user_list = [];
				var highlight_counter = 0;
				for(var i in user_list) {
					if(user_list[i].toLowerCase().indexOf(name_part.toLowerCase()) !== -1) {
						var cl = "";
						var $l = $('<li onclick=insertName("' + user_list[i] + '")>' + user_list[i] + '</li>');
						$l.on("mouseover", highlightUser)
						if(highlight_counter === currentAutocompletePos) {
							$l.addClass("selected");
						}
						matched_user_list.push($l);
						highlight_counter++;
					}
				}
				if(matched_user_list.length > 0) 
					showAutoCompleteBox(matched_user_list);
				else 
					hideAutoCompleteBox();
			}
			else 
				hideAutoCompleteBox();
		}
	});
	
	$("#new-message-input input").on("keydown", function(e) {
		if (!e) e = window.event;
		var keyCode = e.keyCode || e.which;
		if (keyCode === 13) {
			if(isAutocompleteOpened) {
				insertName(matched_user_list[currentAutocompletePos].text());
			}
		    else if($(this).val().length > 0) {
    			socket.send(JSON.stringify({eventtype:'chat', content:$(this).val()}));
    			$(this).val("");
    			$("#chatlog .wrapper").animate({ scrollTop: $('#chatlog .wrapper').prop("scrollHeight")}, 1000);
		    }
		}
		else {
			if(isAutocompleteOpened) {
				if(keyCode === 38) {  // up
					changeSelectedMatch(false); e.preventDefault();
				}
				else if(keyCode === 40) { // down
					changeSelectedMatch(true); e.preventDefault();
				}
			}
		}
	});
}


function initGameList(games) {
	// populate select
	for(var i=0; i<games.length; i++) {
		var g=games[i];
		$("#gameselect").append('<option value='+g.name+' title="'+g.desc+'">'+g.longname+'</option>');
	}
	// select onchange
	$("#gameselect").change(function(e) {
		for(var i=0; i<games.length; i++) {
			if(e.target.value === games[i].name) {
				var desc = games[i].desc;
				if (typeof(games[i].owner) != 'undefined') desc +=' Maintained by '+games[i].owner;
				$("#game-description").html(games[i].desc);
				if (typeof(games[i].owner) != 'undefined' && username == games[i].owner) {
					$("#updatebutton").removeClass('hidden');
				} else {
					$("#updatebutton").addClass('hidden');
				}
				if (typeof(games[i].savexists) != 'undefined' && games[i].savexists) {
					$("#deletebutton").removeClass('hidden');
				} else {
					$("#deletebutton").addClass('hidden');
				}
				saveSelectedGameName(e.target.value);
				loadDefaultGameOptions(e.target.value);
				loadGameOptions(e.target.value);
			}
		}
		
	});
	$("#playbutton").click(function() {
		var gamename = $("#gameselect").val();
		var panels = $("#subwindows").val();
		var walls = false;
		applyTerminal("play", gamename, panels, walls, calculateIdealTerminalDimensions());
	});
	$("#deletebutton").click(function() {
		if(!confirm('Are you sure you want to proceed?'+"\n"+'This will *delete* your savegame file for '+$("#gameselect :selected").text()+'!')) return;
		var gamename = $("#gameselect").val();
		requestDeletion('ownsave',gamename,false);
		$(this).off('click');
		$(this).addClass('hidden');
		$(this).attr("target","_blank");
		$(this).attr("href","/"+username+"/"+gamename+"/"+username);
	});
	$("#updatebutton").click(function() {
		var gamename = $("#gameselect").val();
		applyTerminal("update", gamename, 1, "no", calculateIdealTerminalDimensions());
	});
}


function adjustFontSizeForSpectation(remote_game_dimensions) {
	console.log("calculating adjusted font size to fit remote terminal with dimensions", remote_game_dimensions);
	var selected_font_family = $("#extra-fonts").val();
	
	var my_pane_height = $(".pane-main").height();
	var my_pane_width  = $(".pane-main").width();

	// find font size that will fit remote terminal to your game pane
	var found = false, checked_font_index = 0;
	$("#tester").css("font-family", selected_font_family);
	$("#tester").css("display", "initial");
	$("#tester").css("visibility", "hidden");
	for(var i = 0; i < font_sizes.length && !found; i++) {
		// set new font size to tester
		$("#tester").css("font-size", font_sizes[i]);

		// get tester new size
		var tester_width = $("#tester").width();
		var tester_height = $("#tester").height();

		// calculate my term size using current font size
		var resulting_rows = tester_height * remote_game_dimensions.rows;
		var resulting_cols = tester_width  * remote_game_dimensions.cols;

		// check how it fits, exit loop if it is bigger
		if(resulting_rows > my_pane_height || resulting_cols > my_pane_width)
			found = true;

		checked_font_index = i;
	}

	// apply selected font settings to terminal pane
	$("#terminal-container").css("font-size", font_sizes[checked_font_index - 1]);
	$("#terminal-container").css("font-family", selected_font_family);
	$("#terminal-container").css("line-height", "initial");
}


function calculateIdealTerminalDimensions() {
	var desired_font_size = $("#games-font-size").val();
	var desired_font_family = $("#extra-fonts").val();

	// apply desired font size to tester and get its new dimensions
	$("#tester").css("display", "initial");
	$("#tester").css("visibility", "hidden");
	$("#tester").css("font-size", desired_font_size);
	$("#tester").css("font-family", desired_font_family);
	
	var tester_width = $("#tester").width();
	var tester_height = $("#tester").height();
	
	var pane_height = $(".pane-main").height() - 2 * parseInt(desired_font_size, 10);
	var pane_width = $(".pane-main").width() - parseInt(desired_font_size, 10);

	// apply selected font settings to terminal pane
	$("#terminal-container").css("font-size", desired_font_size);
	$("#terminal-container").css("font-family", desired_font_family);
	$("#terminal-container").css("line-height", "initial");

	// calculate how many testers can we fit into pane-main
	var _width = (pane_width / tester_width).toFixed(0);
	var _height = (pane_height / tester_height).toFixed(0);

	console.log(`${pane_width}x${pane_height} fit ${_width}x${_height} terminal (font size: ${desired_font_size}, tester: ${tester_width}x${tester_height})`);

	$("#tester").css("display", "none");


	return {
		rows: _height - 1, 
		cols: _width - 1
	};
}


function changeUIFontSize(size, skipSaving) {
	$("html, body, #container").css("font-size", size);
	adjustTerminalFontSize();
	if(!skipSaving) saveOption("ui_font_size", size);
}

function changeBorderStyle(borderstyle, skipSaving) {
	$(".pane-main .pane-side").css("border-style", borderstyle);
}

function changeBackgroundColor(bgcolor, skipSaving) {
	if (tabcolor.match(/[[a-f][A-F]\d]+?/) != null && tabcolor.length == 6){
		$("html, body, #container").css("background-color", bgcolor);
		//if(!skipSaving) saveOption("ui_background_color", bgcolor);
	}
}

function changeMenuColor(tabcolor, skipSaving) {
	if (tabcolor.match(/[[a-f][A-F]\d]+?/) != null && tabcolor.length == 6){
		$(".panel").css("background-color", tabcolor);
		//if(!skipSaving) saveOption("ui_menu_color", tabcolor);
	}
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
			// ui font size
			if(ls["ui_font_size"]) {
				changeUIFontSize(ls["ui_font_size"], false);
				$("#opt-ui-font-size").val(ls["ui_font_size"]);
			}
		}
	}
}

function saveSelectedGameName(game) {
	if(localStorage) {
		localStorage.setItem("aw_selected_game", game);
	}
}

function loadSelectedGameName() {
	if(localStorage) {
		var g = localStorage.getItem("aw_selected_game");
		if(g) $("#gameselect").val(g).trigger("change");
		else $("#gameselect").val("angband").trigger("change");
	}
}

function saveGameOptions() {
	if(localStorage) {
		var game = $("#gameselect").val();
		var opts = {
			subwindows: $("#subwindows").val(),
			ascii_walls: $("#ascii-walls").val(),
			font: $("#extra-fonts").val(),
			font_size: $("#games-font-size").val()
		};
		localStorage.setItem("aw_options_" + game, JSON.stringify(opts));
	}
}

function loadGameOptions(game) {
	if(localStorage) {
		var opts = localStorage.getItem("aw_options_" + game);
		if(!opts)
			return loadDefaultGameOptions(game);
		opts = JSON.parse(opts);
		$("#subwindows").val(opts.subwindows);
		$("#ascii-walls").val(opts.ascii_walls);
		$("#extra-fonts").val(opts.font);
		$("#games-font-size").val(opts.font_size);
	}
	else
		loadDefaultGameOptions(game);
}

function loadDefaultGameOptions(game) {
	var subwindows = 1;
	var ascii_walls = false;
	var $$subwindows, $walls;
	$("#subwindows").val(subwindows);
	$("#ascii-walls").val(ascii_walls);
	$("#games-font-size").val("14px");
}


// ========================================================
// chat autocomplete
// ========================================================
function showAutoCompleteBox(items) {
	$("#users-popup ul").html(items);
	$("#users-popup").removeClass("hidden");
	isAutocompleteOpened = true;
}
function hideAutoCompleteBox(force) {
	$("#users-popup ul").html("");
	$("#users-popup").addClass("hidden");
	currentAutocompletePos = 0;
	isAutocompleteOpened = false;
}
function insertName(name) {
	var $input = $("#new-message-input input");
	var v = $input.val();
	v = v.split(" ");
	v[v.length-1] = "@" + name + " ";
	$input.val(v.join(" "));
	hideAutoCompleteBox();
	$input.focus();
}
function changeSelectedMatch(goDown) {
	if(goDown && currentAutocompletePos < matched_user_list.length-1)
		currentAutocompletePos++;
	else if(!goDown && currentAutocompletePos > 0)
		currentAutocompletePos--;
}
function highlightUser(e) {
	$("#users-popup ul li").removeClass("selected");
	$(this).addClass("selected");
}



// ========================================================
// STARTUP FUNCTION
// ========================================================
$(function() {
	localStorage = window.localStorage;
	
	// add extra fonts
	fonts = fonts.sort();
	fonts.map(function(f,i) {
		$("#extra-fonts").append('<option value="' + f + '">' + f + '</option>');
	});
	$("#extra-fonts, #games-font-size").change(function(e) { saveGameOptions(); });
	
	// add bottom sidebar force option
	$("#opt-sidebar-bottom").change(function(e) { changeSidebarOnBottom(e.target.checked); });
	
	// add ui font size options
	font_sizes.map(function(f,i) {
		$("#opt-ui-font-size").append('<option value="' + f + 'px">' + f + 'px</option>');
	});
	$("#opt-ui-font-size").change(function(e) { changeUIFontSize(e.target.value); });
	$("#opt-ui-font-size").val($("html").css("font-size"));

	// add ui font size options
	font_sizes.map(function(f,i) {
		$("#games-font-size").append('<option value="' + f + 'px">' + f + 'px</option>');
	});

	// add more options
	var borderstyles = ['solid','inset','outset','ridge','groove','none'];
	for (var i in borderstyles){
		$("#opt-ui-border-style").append('<option value="' + borderstyles[i] + '">' + borderstyles[i] + '</option>');
	}
	$("#opt-ui-border-style").change(function() { changeBorderStyle($("#opt-ui-border-style").val()); });
	$("#opt-ui-body-color").val($("body").css("background-color"));
	$("#opt-ui-chat-color").val($(".panel").css("background-color"));
	$("#opt-ui-chat-color").change(function() { changeMenuColor($("#opt-ui-border-style").val()); });
	
	// restore and apply options from local storage
	loadAndApplyOptions();
	
	// init and open chat tab by default
	initChat();
	
	// terminal resizer
	// $(window).resize(function() { adjustTerminalFontSize(); });
	
	// navigation to home button
	$("#navigation-home").click(function() {
    	$("#terminal-pane").addClass("hidden");
    	$("#games-lobby").removeClass("hidden");
	});
	
	// game option change handlers
	$("#term-cols,#term-rows,#subwindows,#ascii-walls").change(function() { saveGameOptions(); });
	
	// tablet ui
	var ua = navigator.userAgent.toLowerCase();
	var tablets = ["ipad", "android 5"];
	var onTablet = false;
	tablets.map(function(model) {
		if(ua.indexOf(model) !== -1)
			onTablet = true;
	});
	if(onTablet) {
		TU = TU(socket).init();
	}
});