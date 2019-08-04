var localStorage;

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
			font_size: $("#games-font-size").val(),
			version: $("#games-version").val()
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
		$("#games-version").val(opts.version);
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
	$("#games-font-size").val("12px");
}
