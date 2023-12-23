// series search
var series_lookup = {
	"マクロス" : ["マクロス", "まくろす"],
	"ラブライブ" : ["ラブライブ", "らぶらいぶ", "LL", "ll"],
	"アイマス" : ["アイマス", "あいます", "デレマス", "でれます"],
	"ジブリ" : ["ジブリ", "じぶり"],
	"物語シリーズ" : ["物語シリーズ", "ものがたりしりーず", "ものがたりシリーズ"],
	"まどマギ" : ["まどマギ", "まどまぎ", "まどか"],
	"disney" : ["disney", "ディズニー", "でぃずにー", "Disney"]
};

// indices lookup
var entry_idx = {
	song_id : 0,
	video : 1,
	note : 2,
	time : 3
};
var song_idx = {
	name : 0,
	artist : 1,
	reading : 2,
	attr : 3,
	release : 4,
	reference : 5
};
var video_idx = {
	id : 0,
	date : 1
};

var version = "1.5.8a";

/* control / memories */

// prevent menu from opening when info or setting is up
var prevent_menu_popup = false;

// current page name
var current_page = "home";

/* setting section */
// max display song count
var max_display = 100;

// if on, display private entries despite not accessable
var do_display_hidden = true;

// if the previous input should be cleared when user tap input box
var do_clear_input = false;

// if random requirement is ignored (input being blank)
var do_random_anyway = false;

// do add the link to this website when sharing
var do_share_web = false;

// ram for searching (entry_processed)
var entry_proc = [];

// memcount - rep generate interval flag
var memcount_rep_int;

// pre-process song names
var processed_song_name = [""];

$(window).on("load", async function() {
	var url_para = new URLSearchParams(window.location.search);
	if(/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)){
		// on mobile, do nothing
	} else {
		// check screen ratio
		// and hope nobody use some super-duper long screen
		if (window.innerHeight / window.innerWidth < 1.3) {
			// bad screen ratio, open new window
			$("#v_screen").addClass("post_switch");
			$("#v_screen").height("100%");
			$("#v_screen").width(0.5625 * window.innerHeight);
			$("#v_screen").attr("src", "index.html" + window.location.search);
			// hide original page
			$("body > div").addClass("post_switch");
			$("body").addClass("post_switch");
			url_para.delete("key");
			window.history.replaceState(null, "", url_para.size === 0 ? "" : ("?" + url_para.toString()));
			return;
		}
	}
	
	// get settings from cookie
	// use the same settings as pcsl
	if (getCookie("pcsl_settings_display") === "") {
		// cookie not set
		setCookie("pcsl_settings_display", 100);
		setCookie("pcsl_settings_hidden" , 1);
		setCookie("pcsl_settings_clear"  , 0);
		setCookie("pcsl_settings_random" , 0);
		setCookie("pcsl_settings_share"  , 0);
	} else {
		max_display       = parseInt(getCookie("pcsl_settings_display"));
		do_display_hidden = (getCookie("pcsl_settings_hidden")) === "1";
		do_clear_input    = (getCookie("pcsl_settings_clear")) === "1";
		do_random_anyway  = (getCookie("pcsl_settings_random")) === "1";
		do_share_web      = (getCookie("pcsl_settings_share")) === "1";
		
		// update display
		$("#search_options_count_input").val(max_display);
		$("#search_options_btn_displayHidden").toggleClass("selected", do_display_hidden);
		$("#search_options_btn_reset").toggleClass("selected", do_clear_input);
		$("#search_options_btn_randomAnyway").toggleClass("selected", do_random_anyway);
		$("#search_options_btn_shareWeb").toggleClass("selected", do_share_web);
	}
	
	// processing url para
	if (url_para.get("hfilter") !== (null && "")) {
		// get url para and store
		hard_filter = parseInt(url_para.get("hfilter"));
		setCookie("pcsl_settings_hfilter", hard_filter, 400);
	} else if (getCookie("pcsl_settings_hfilter") !== ""){
		// read from cookie and renew
		hard_filter = parseInt(getCookie("pcsl_settings_hfilter"));
		removeCookie("pcsl_settings_hfilter");
		setCookie("pcsl_settings_hfilter", hard_filter, 400);
	}
	init();
	var target_page = url_para.get("page");
	if (target_page !== ("home" || null)) {
		if (jump2page(target_page) === -1) {
			jump2page("home");
		}
	}
	if (url_para.get("search") !== (null && "")) {
		if (current_page !== "search") {
			jump2page("search");
		}
		// prevent out of range
		var song_id = url_para.get("search").split(",");
		if (song_id.length > 1) {
			var added_song = 0;
			for (var i in song_id) {
				// check if valid
				var temp = parseInt(song_id[i]);
				if (temp >= 1 && temp < song.length) {
					hits[added_song++] = song_lookup[temp];
				}
			}
			is_searching_from_rep = 1;
			loading = "!bulk_load_flag";
			update_display(1);
		} else if (song_id >= 1 && song_id < song.length) {
			$("#input").val(song[song_lookup[song_id]][song_idx.name]);
			$("#input").blur();
		}
	}
	/*    rep filter
	 * this read a string of binary number
	 * the value is exactly the same as rep_anisong and rep_genre
	 */
	if (url_para.get("rfilter") !== (null && "")) {
		if (current_page !== "repertoire") {
			jump2page("rep");
		}
		// extract bits
		var selected_bits = [];
		var temp = parseInt(url_para.get("rfilter"));
		var counter = 0;
		while (temp) {
			// test if last bit is 1
			if (temp % 2) {
				selected_bits.push(counter);
			}
			// remove last bit, add counter
			temp >>= 1;
			counter++;
		}
		// click all checkbox thats NOT selected
		for (var i in rep_anisong) {
			if (!selected_bits.includes(rep_anisong[i][1])) {
				$("#anisong_" + i).click();
			}
		}
		for (var i in rep_genre) {
			if (!selected_bits.includes(rep_genre[i][1])) {
				$("#general_" + i).click();
			}
		}
	}
	// remove loading screen
	$("#loading_overlay").addClass("hidden");
});

$(function() {
	{ // nav
		// nav - menu
		$(document).on("click", "#nav_menu", function(e) {
			// disable going back to top
			e.preventDefault();
			if (prevent_menu_popup) {
				return;
			}
			$("#menu_container").toggleClass("hidden");
			$("#nav_menu").toggleClass("menu_opened");
			$(document.body).toggleClass("no_scroll");
		});
		
		// nav - to_top
		$(document).on("click", "#nav_to_top", function(e) {
			e.preventDefault();
			if (prevent_menu_popup) {
				return;
			}
			$("html,body").animate({
				scrollTop: 0
			}, "fast");
			
			if (current_page === "repertoire" && rep_display_selected_first) {
				rep_display();
			}
		});
	}
	
	{ // menu
		// menu -fog> return
		$(document).on("click", "#menu_container", function(e) {
			if (!($(e.target).parents(".defog").length || $(e.target).hasClass("defog"))) {
				$("#menu_container").addClass("hidden");
				$("#nav_menu").removeClass("menu_opened");
				$(document.body).removeClass("no_scroll");
			}
		});
		
		// menu -> page
		$(document).on("click", ".menu2page", function(e) {
			var target = ($(e.target).attr("id")).replace("menu2page_", "");
			if (target === current_page) {
				return;
			}
			jump2page(target);
			
			// close menu
			$("#menu_container").addClass("hidden");
			$("#nav_menu").removeClass("menu_opened");
			$(document.body).removeClass("no_scroll");
		});
		
		// menu - mem_count
		$(document).on("click", "#menu_count", function() {
			// hide / show things
			$("#popup_container").removeClass("hidden");
			$("#memcount").removeClass("hidden");
			$("#menu_container").addClass("hidden");
			$("#nav_menu").removeClass("menu_opened");
			prevent_menu_popup = true;
			
			// generate if not generated
			if ($("#memcount_content").html() !== "") {
				return;
			}
			
			// <to be implemented>
			
			// rep part - load in background
			memcount_rep_int = setInterval(memcount_load_rep , 1);
		});
		
		// menu - information
		$(document).on("click", "#menu_info", function() {
			$("#popup_container").removeClass("hidden");
			$("#information").removeClass("hidden");
			$("#menu_container").addClass("hidden");
			$("#nav_menu").removeClass("menu_opened");
			prevent_menu_popup = true;
		});
	}
	
	// memcount swap content
	$(document).on("click", "#memcount, #memcount_rep", function(e) {
		if ($(e.target).closest('.popup_frame').length) {
			$(".memcount_subblock").toggleClass("hidden");
		}
	});
	
	// popup - return
	$(document).on("click", "#popup_container", function(e) {
		// all popup except rep share
		if (!($(e.target).closest('.popup_frame').length ||
			  $(e.target).find("#rep_list:not(.hidden)").length)) {
			$(".popup_frame").addClass("hidden");
			$("#popup_container").addClass("hidden");
			$(document.body).removeClass("no_scroll");
			prevent_menu_popup = false;
		}
	});
	
	// home - hyper
	$(document).on("click", ".home_hyperlink_block", function() {
		jump2page($(this).attr("id").replace("home_hyper_", ""));
	})
});

function init() {
	$("#input").val("");
	// process data
	{
		// reverse video dates
		const date_start = new Date("2021-01-01");

		function getDateText(passed) {
			var result = new Date(date_start);
			result.setDate(date_start.getDate() + passed);
			return result.toISOString().slice(0, 10);
		}
		
		for (var i in video) {
			video[i][video_idx.date] = getDateText(video[i][video_idx.date]);
		}
		
		// reverse note
		for (var i in entry) {
			entry[i][entry_idx.note] = note_index[entry[i][entry_idx.note]];
		}
		// remove note index
		note_index = null;
	}
	for (var i in song) {
		entry_proc[i] = [];
	}
	for (var i = 0; i < entry.length; ++i) {
		entry_proc[entry[i][0]].push(i);
	}
	$("#info_version").html(version);
	$("#info_last-update").html(video[video.length - 1][video_idx.date]);
	// get screen size
	auto_display_max = Math.floor(5 * Math.pow(window.innerHeight / window.innerWidth, 1.41421356237));
	
	// rep
	var rep_solo_temp = [];
	
	// process song names
	for (var i = 1; i < song.length; ++i) {
		processed_song_name.push(song[i][song_idx.name].toLowerCase().normalize("NFKC"));
	}
}

// memcount - loading rep part in background
function memcount_load_rep() {
	// remove interval
	clearInterval(memcount_rep_int);
	
	// <to be implemented>
}

// functional functions

// display date in yyyy-MM-dd format
function display_date(input) {
	var e = typeof(input) === "string" ? new Date(input) : input;
	return (e.getFullYear() + "-" + fill_digit(e.getMonth() + 1, 2) + "-" + fill_digit(e.getDate(), 2));
}

// add 0 in front of a number
function fill_digit(input, length) {
	e = "" + input;
	while (e.length < length) {
		e = "0" + e;
	}
	return e;
}

function is_private(index) {
	return entry[index][entry_idx.note].includes("非公開") ||
		   entry[index][entry_idx.note].includes("記録用") ||
		   entry[index][entry_idx.note].includes("アーカイブなし");
}

// rap the `selc` section in bold tag if exist in `org`
function bold(org, selc) {
	var e = org.toLowerCase().indexOf(selc.toLowerCase());
	if (e === -1 || selc === "") {
		return org;
	} else {
		return (org.substring(0, e) + "<b>" + org.substring(e, e + selc.length) + "</b>" + org.substring(e + selc.length));
	}
}

function copy_of(input) {
	if (typeof input === "object") {
		return JSON.parse(JSON.stringify(input));
	} else {
		return input;
	}
}

function get_last_sang(id) {
	return new Date(video[entry[entry_proc[id][entry_proc[id].length - 1]][entry_idx.video]][video_idx.date]);
}

// returns a date object for a "dd-mm-yyyy" input
function to8601(date_string) {
	try {
		return new Date(
			date_string.substring(6),
			parseInt(date_string.substring(3, 5)) - 1,
			date_string.substring(0, 2)
		);
	} catch {
		console.log(date_string + " is not in dd-MM-yyyy format");
		return -1;
	}
}

var today = new Date().setHours(0, 0, 0, 0);

// get day different between {date1 and date2} or {date1 and today}
function get_date_different(date1, date2 = today) {
	date1 = (typeof(date1) === "string") ? new Date(date1) : date1;
	date2 = date2 === undefined ? date2 : new Date(date2);
	return Math.round(Math.abs(date1 - date2) / 86400000);
}

// get entry count of all entry and member-only entry that fufills mask
function get_sang_count(id) {
	
	var count = 0,
		mem_count = 0;
	for (var i in entry_proc[id]) {
		count++;
		if (entry[entry_proc[id][i]][entry_idx.note].includes("【メン限")) {
			mem_count++;
		}
	}
	return [count, mem_count];
}

function get_attr(id) {
	var e = entry[id][entry_idx.note];
	if (e.includes("弾き語り")) {
		return "gui";
	}
	if (e.includes("アカペラ")) {
		return "aca";
	}
	return "oke";
}

function jump2page(target) {
	target = target === "rep" ? "repertoire" : target;
	current_page = target;
	$(".menu2page_selected").removeClass("menu2page_selected");
	$("#menu2page_" + target).addClass("menu2page_selected");
	// show / hide section
	$(".section_container").addClass("hidden");
	$("#" + target + "_section").removeClass("hidden");
	$("#nav_dummy").addClass("hidden");
	$("#nav_search_random").addClass("hidden");
	$("#nav_bulk_search").addClass("hidden");
	$("#nav_share").addClass("hidden");
	// remove previously generated comtent
	$("#search_display").html("");
	$("#rep_display").html("");
	switch (target) {
		case "home" : 
			// show section
			$("#nav_title").html("ホーム");
			$("#nav_dummy").removeClass("hidden");
			break;
		case "search" :
			// show section
			$("#nav_search_random").removeClass("hidden");
			$("#nav_share").removeClass("hidden");
			$("#nav_share").toggleClass("disabled", !is_searching_from_rep);
			$("#nav_title").html("曲検索");
			// reset input -> reload
			$("#input").val("");
			search();
			break;
		case "rep" :
		case "repertoire" : 
			// show section
			$("#repertoire_section").removeClass("hidden");
			$("#nav_bulk_search").removeClass("hidden");
			$("#nav_share").removeClass("hidden");
			$("#nav_share").toggleClass("disabled", !rep_selected.length);
			$("#nav_title").html("レパートリー");
			// do whatever needed
			rep_input_memory = "";
			rep_search();
			break;
		default :
			// error
			return -1;
	}
	$(window).scrollTop(0);
}

var copy_popup_is_displaying = false;

function copy_popup() {
	if (copy_popup_is_displaying) {
		return;
	}
	copy_popup_is_displaying = true;
	$("#copy_popup").attr("class", "fade_out");
	setTimeout(() => {
		copy_popup_is_displaying = false;
		$("#copy_popup").attr("class", "hidden");
	}, 1500);
}

// from w3school
function setCookie(cname, cvalue, exdays = 400) {
	const d = new Date();
	d.setTime(d.getTime() + (exdays * 24 * 60 * 60 * 1000));
	let expires = "expires="+d.toUTCString();
	document.cookie = cname + "=" + cvalue + ";" + expires + ";path=/";
}

function getCookie(cname) {
	let name = cname + "=";
	let ca = document.cookie.split(';');
	for(let i = 0; i < ca.length; i++) {
		let c = ca[i];
		while (c.charAt(0) == ' ') {
			c = c.substring(1);
		}
		if (c.indexOf(name) == 0) {
			return c.substring(name.length, c.length);
		}
	}
	return "";
}

function removeCookie(cname) {
	document.cookie = cname + "=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/";
}