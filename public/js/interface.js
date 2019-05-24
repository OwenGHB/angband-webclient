var spyglass = {};

var initComplete = false    // used to do some stuff only after this will be true

function buildMatchListEntry(player) {
	var fixedrealmclasses = ["Samurai","Necromancer","Hexblade","Bard","Tourist","Rage-Mage","Lawyer","Ninja-Lawyer","Beastmaster"];
	var outputstring = '<li><span>'+player+'</span> playing <span>'+matches[player].game+'</span>';
	if (typeof(matches[player].race) != 'undefined'){
		outputstring += ' as a <span>';
		if (typeof(matches[player].cLvl) != 'undefined') outputstring +='Level ' + matches[player].cLvl + ' ';
		if (typeof(matches[player].subRace) != 'undefined') {
			outputstring += matches[player].subRace + ' ';
			if (typeof(matches[player].class) != 'undefined' && matches[player].class != "Monster") outputstring += matches[player].race;
		} else {
			outputstring += matches[player].race;
		}
		if (typeof(matches[player].class) != 'undefined' && matches[player].class != "Monster") outputstring += ' ' + matches[player].class;
		if (typeof(matches[player].mRealm1) != 'undefined' && !(fixedrealmclasses.includes(matches[player].class))) {
			outputstring += ' (' + matches[player].mRealm1;
			if (typeof(matches[player].mRealm2) != 'undefined') {
				outputstring += '/' + matches[player].mRealm2+')';
			} else outputstring += ')';
		}
		if (typeof(matches[player].subClass) != 'undefined') outputstring += ' ('+matches[player].subClass+')';
		if (typeof(matches[player].mapName) != 'undefined') {
			if (typeof(matches[player].dLvl) != 'undefined' && parseInt(matches[player].dLvl) > 0) {
				if (matches[player].mapName!='Quest') {
					outputstring += ' on Level ' + matches[player].dLvl;
					outputstring += ' of ' + matches[player].mapName;
				} else {
					outputstring += ' in a Level ' + matches[player].dLvl;
					outputstring += ' ' + matches[player].mapName;
				}
			} else {
				outputstring += ' in ' + matches[player].mapName;
			}
		} else if (typeof(matches[player].mDepth) != 'undefined') {
			outputstring += ' at ' + matches[player].mDepth + '\'';
		}
		outputstring += '</span>' + idle + '</li>';
	}
	return outputstring;
}

function listMatches(matches) {
	$("#watchmenu ul").html("");
	var players = Object.keys(matches);
	if (players.length > 0) {
		for(var i=0; i<players.length; i++) {
			var idle = matches[players[i]].idletime > 0 ? ', idle for <span>'+matches[players[i]].idletime+'0</span> seconds' : "";
			$("#watchmenu ul").append(function(i) {
				var outputstring = buildMatchListEntry(players[i]);
				return $(outputstring).click(function(){
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