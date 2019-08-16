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
			subwindow_right: $("#subwindow-right").val(),
			subwindow_right_split: $("#subwindow-right-split").val(),
			subwindow_top: $("#subwindow-top").val(),
			subwindow_bottom: $("#subwindow-bottom").val(),
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
		if (typeof(opts.subwindows)!='undefined') $("#subwindows").val(opts.subwindows);
		if (typeof(opts.subwindow_right)!='undefined') {
			$("#subwindow-right").val(opts.subwindow_right);
		}
		if (typeof(opts.subwindow_right_split)!='undefined'){
			$("#subwindow-right-split").val(opts.subwindow_right_split);
		}
		if (typeof(opts.subwindow_top)!='undefined') {
			$("#subwindow-top").val(opts.subwindow_top);
		}
		if (typeof(opts.subwindow_bottom)!='undefined') {
			$("#subwindow-bottom").val(opts.subwindow_bottom);
		}
		if (typeof(opts.font)!='undefined') $("#extra-fonts").val(opts.font);
		if (typeof(opts.font_size)!='undefined') $("#games-font-size").val(opts.font_size);
		if (typeof(opts.version)!='undefined') $("#games-version").val(opts.version);
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
	$("#subwindow-right").val(0);
	$("#subwindow-right-split").val(0);
	$("#subwindow-top").val(0);
	$("#subwindow-top-split").val(0);
	$("#subwindow-bottom").val(0);
	$("#subwindow-bottom-split").val(0);
	$("#games-font-size").val(12);
}
