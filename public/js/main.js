var protocol = window.location.protocol === "https:" ? "wss" : "ws";
var socketURL = protocol + '://' + window.location.hostname + ((window.location.port) ? (':' + window.location.port) : '') + '/meta';
var socket;

//var username also available
var TU;

// ========================================================
// STARTUP FUNCTION
// ========================================================
$(function() {
	localStorage = window.localStorage;
	
	// add extra fonts
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
	fonts = fonts.sort();
	fonts.map(function(f,i) {
		$("#extra-fonts").append('<option value="' + f + '">' + f + '</option>');
	});
	$("#extra-fonts, #games-font-size, #versionselect").change(function(e) { saveGameOptions(); });
	
	// add bottom sidebar force option
	$("#opt-sidebar-bottom").change(function(e) { changeSidebarOnBottom(e.target.checked); });
	
	$("#opt-ui-font-size").change(function(e) { changeUIFontSize(e.target.value); });
	$("#opt-ui-font-size").val($("html").css("font-size"));

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

	// navigation to home button
	$("#navigation-home").click(function() {
    	$("#terminal-pane").addClass("hidden");
    	$("#games-lobby").removeClass("hidden");
	});
	
	// game option change handlers
	$("#extra-fonts,#games-font-size,#versionselect,#subwindows,#subwindow-right,#subwindow-right-split,#subwindow-top,#subwindow-bottom").change(function() { saveGameOptions(); });
	
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