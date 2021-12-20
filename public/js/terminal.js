var playing = false;
var dimensions = {};

var safety = 2;            // for font size calculation

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

function applyTerminal(mode, qualifier, panelargs, d) {
	//console.log(`applying terminal: mode=${mode}, qualifier=${qualifier}, panelargs=${panelargs}, walls=${walls}, dimensions=${d.rows}x${d.cols}`);
	$terminal = $("#terminal-container");
	dimensions = d;
	if(mode === "play") {
		if (!playing){
			playing = true;
			var gameversion = qualifier.split(":");
			var game = gameversion[0];
			var version = gameversion[1];
			spyglass['default'] = createTerminal(d);
			$("#navigation ul").append(function() {
				return $('<li><a href="#"> - your game</a></li>').click(function() {
					applyTerminal("play", qualifier, [], d);
					adjustFontSizeForSpectation(d);
				});
			});
			socket.send(JSON.stringify({
				eventtype:'newgame',
				content: {
					game: game,
					version: version,
					panelargs: panelargs,
					dimensions: d,
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
					applyTerminal("spectate", qualifier, [], d);
					adjustFontSizeForSpectation(d);
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
			socket.send(JSON.stringify({eventtype: 'updateinput', content: data}));
		});

		$terminal.html("");
		spyglass['default'].open($terminal.get(0));
	}
	
	// hide lobby and unhide terminal
	$("#games-lobby").addClass("hidden");
	$("#terminal-pane").removeClass("hidden");
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
	for(var i = 8; i < 40 && !found; i+=0.5) {
		// set new font size to tester
		$("#tester").css("font-size", i);

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
	$("#terminal-container").css("font-size", checked_font_index-0.5);
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

	//console.log(`${pane_width}x${pane_height} fit ${_width}x${_height} terminal (font size: ${desired_font_size}, tester: ${tester_width}x${tester_height})`);

	$("#tester").css("display", "none");


	return {
		rows: _height - 1, 
		cols: _width - 1
	};
}
