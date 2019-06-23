var spyglass = {};

function buildMatchListEntry(player, match) {
	var fixedrealmclasses = ["Samurai","Necromancer","Hexblade","Bard","Tourist","Rage-Mage","Lawyer","Ninja-Lawyer","Beastmaster"];
	var outputstring = '<tr><td>'+player+'</td><td>'+match.game+'</td>';
	if (typeof(match.race) != 'undefined'){
		outputstring += '<td>';
		if (typeof(match.cLvl) != 'undefined') outputstring += match.cLvl + '</td><td>';
		if (typeof(match.subRace) != 'undefined') {
			outputstring += match.subRace + ' ';
			if (typeof(match.class) != 'undefined' && match.class != "Monster") outputstring += match.race;
		} else {
			outputstring += match.race;
		}
		if (typeof(match.class) != 'undefined' && match.class != "Monster") outputstring += ' ' + match.class;
		if (typeof(match.mRealm1) != 'undefined' && !(fixedrealmclasses.includes(match.class))) {
			outputstring += ' (' + match.mRealm1;
			if (typeof(match.mRealm2) != 'undefined') {
				outputstring += '/' + match.mRealm2+')';
			} else outputstring += ')';
		}
		if (typeof(match.subClass) != 'undefined') outputstring += ' ('+match.subClass+')';
		outputstring += '</td><td>';
		if (typeof(match.mapName) != 'undefined') {
			if (typeof(match.dLvl) != 'undefined' && parseInt(match.dLvl) > 0) {
				if (match.mapName!='Quest') {
					outputstring += ' on Level ' + match.dLvl;
					outputstring += ' of ' + match.mapName;
				} else {
					outputstring += ' in a Level ' + match.dLvl;
					outputstring += ' ' + match.mapName;
				}
			} else {
				outputstring += ' in ' + match.mapName;
			}
		} else if (typeof(match.mDepth) != 'undefined') {
			outputstring += ' at ' + match.mDepth + '\'';
		} else if (typeof(match.dLvl) != 'undefined') {
			if (parseInt(match.dLvl) > 0) {
				outputstring += ' on Level ' + match.dLvl;
			} else {
				outputstring += ' in Town';
			}
		}
		outputstring += '</td>'
	} else {
		//three empty cells
		outputstring += '<td></td><td></td><td></td>';
	}
	outputstring += '<td>' + (parseInt(match.idletime)*10) + '</td>';
	outputstring += '</tr>';
	return outputstring;
}

function listMatches(matches) {
	$("#watchmenu table").html("<tr><th>Player</th><th>Game</th><th>cLvl</th><th>Race/Class</th><th>Place</th><th>Idle</th></tr>");
	var players = Object.keys(matches);
	if (players.length > 0) {
		for(var i=0; i<players.length; i++) {
			var idle = matches[players[i]].idletime > 0 ? ', idle for <span>'+matches[players[i]].idletime+'0</span> seconds' : "";
			$("#watchmenu table").append(function(i) {
				var outputstring = buildMatchListEntry(players[i],matches[players[i]]);
				return $(outputstring).click(function(){
					if(players[i] === username)
						applyTerminal("play", players[i], 1, "no", matches[players[i]].dimensions);
					else
						applyTerminal("spectate", players[i], 1, "no", matches[players[i]].dimensions);
				});
			}(i));			
		}
	}
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
						applyTerminal("play", gamename, panels, walls, matches[i].dimensions);
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