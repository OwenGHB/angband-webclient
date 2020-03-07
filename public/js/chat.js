var notify_sound = $("#notification").get(0);
var user_list = [];

var matched_user_list = [];
var isAutocompleteOpened = false;
var currentAutocompletePos = 0;

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

function scrollChatBar(){
	var chatwrap = $('#chatlog .wrapper');
	if(initComplete && ((chatwrap.prop("scrollTop")+chatwrap.prop("clientHeight"))>=(chatwrap.prop("scrollHeight")-chatwrap.prop("clientHeight")))) {
		$("#chatlog .wrapper").animate({ scrollTop: $('#chatlog .wrapper').prop("scrollHeight")}, 300);
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
