var initComplete = false    // used to do some stuff only after this will be true
var custom_subpanels = false;

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
	$("#gameselect").html("");
	for (var i=0; i<games.length; i++) {
		$("#gameselect").append('<option value='+games[i].name+' title="'+games[i].desc+'">'+games[i].longname+'</option>');
	}
	// select onchange
	$("#gameselect").change(function(e) {
		for (var i=0; i<games.length; i++) {
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
				if (typeof(games[i].custom_subpanels) != 'undefined' && games[i].custom_subpanels) {
					$(".subwindow-extra").removeClass('hidden');
					$(".subwindow-basic").addClass('hidden');
					custom_subpanels = true;
				} else {
					$(".subwindow-extra").addClass('hidden');
					$(".subwindow-basic").removeClass('hidden');
					custom_subpanels = false;
				}
				saveSelectedGameName(e.target.value);
				loadDefaultGameOptions(e.target.value);
				$("#versionselect").html("");
				for (var j=0; j<games[i].versions.length; j++){
					$("#versionselect").append('<option value='+games[i].versions[j]+'>'+games[i].versions[j]+'</option>');
				}
				loadGameOptions(e.target.value);
			}
		}
		
	});
	$("#playbutton").click(function() {
		var gamename = $("#gameselect").val()+":"+$("#versionselect").val();
		var panels = ["-spacer","1x0"];
		if (custom_subpanels){
			var tmp = false;
			if ($("#subwindow-right").val() > 0) {
				panels.push("-right");
				tmp = $("#subwindow-right").val()+"x";
			}
			if ($("#subwindow-right-split").val() > 0) {
				tmp += $("#subwindow-right-split").val()+",*";
			} else if (tmp) {
				tmp += "*";
			}
			if (tmp) panels.push(tmp);
			if ($("#subwindow-top").val() > 0) {
				panels.push("-top");
				panels.push("*x"+$("#subwindow-top").val());
			}
			if ($("#subwindow-bottom").val() > 0) {
				panels.push("-bottom");
				panels.push("*x"+$("#subwindow-bottom").val());
			}
		} else if (parseInt($("#subwindows").val())==1) {
			panels = ["-b"];
		} else panels = ["-n"+$("#subwindows").val()];
		var walls = false;
		applyTerminal("play", gamename, panels, calculateIdealTerminalDimensions());
	});
	$("#deletebutton").click(function() {
		if(!confirm('Are you sure you want to proceed?'+"\n"+'This will *delete* your savegame file for '+$("#gameselect :selected").text()+'!')) return;
		var gamename = $("#gameselect").val();
		requestDeletion('ownsave',gamename,version,false);
		$(this).off('click');
		$(this).addClass('hidden');
		$(this).attr("target","_blank");
		$(this).attr("href","/"+username+"/"+gamename+"/"+username);
	});
	$("#updatebutton").click(function() {
		var gamename = $("#gameselect").val();
		applyTerminal("update", gamename, [], calculateIdealTerminalDimensions());
	});
}
