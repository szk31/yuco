// series search
const series_lookup = {
	"マクロス" : ["マクロス", "まくろす"],
	"ラブライブ" : ["ラブライブ", "らぶらいぶ", "LL", "ll"],
	"アイマス" : ["アイマス", "あいます", "デレマス", "でれます"],
	"ジブリ" : ["ジブリ", "じぶり"],
	"物語シリーズ" : ["物語シリーズ", "ものがたりしりーず", "ものがたりシリーズ"],
	"まどマギ" : ["まどマギ", "まどまぎ", "まどか"],
	"disney" : ["disney", "ディズニー", "でぃずにー", "Disney"]
};

// indices lookup
const entry_idx = {
	song_id : 0,
	video : 1,
	note : 2,
	time : 3,
	type : 4
}, song_idx = {
	name : 0,
	artist : 1,
	reading : 2,
	attr : 3,
	release : 4,
	reference : 5
}, video_idx = {
	id : 0,
	date : 1
};

const version = "1.7.3b";

/* control / memories */

// prevent menu from opening when info or setting is up
let prevent_menu_popup = false;

// current page name
let current_page = "home";

/* setting section */
let setting = {
	// search
	show_hidden : true,				// if display private video
	select_input : true,			// select input on click
	show_random : false,			// display random button
	random_ignore : true,			// bypass random rule:(input being empty)
	search_by_song : true,			// config: searching by song name
	search_sort_by_date : true,		// config: display sort by date
	search_sort_asd : true,			// config: sort ascendingly 

	// rep
	show_release : false,			// if display release date
	longPress_copy : true,			// if long press on song name copies
	rep_select_input : true,		// select input on click
	rep_sort : "50",				// config: display sort by method
	rep_sort_asd : true,			// config: sort ascendingly
	rep_selected_first : false,		// config: display selecetd songs on top
	rep_show_artist : true,			// hidden: rep-share include artist name
	longPress_time : 600			// conifg: long press copy time (ms)
};

// ram for searching (entry_processed)
let entry_proc = [];

// memcount - rep generate interval flag
let memcount_rep_int;

// pre-process song names
let processed_song_name = [""];

{	// theme
	let theme = ls("theme");
	if (!theme) {
		theme = "mixed";
		ls("theme", theme);
	}
	document.documentElement.setAttribute("theme", theme);
}

document.addEventListener('DOMContentLoaded', async function() {
	if (window.innerHeight / window.innerWidth < 1.5) {
		// bad screen ratio, open new window
		$("#v_screen").addClass("post_switch");
		$("#v_screen").height("100%");
		$("#v_screen").width(0.5625 * window.innerHeight);
		$("#v_screen").attr("src", "index.html" + window.location.search);
		// hide original page
		$("body > div").addClass("post_switch");
		$("body").addClass("post_switch");
		// delete data
		song = song_lookup = note_index = null;
		return;
	}

	// change settings selected theme
	$(`#three_way_${ls("theme") === "extra" ? "dark" : ls("theme")}`).addClass("selected");
	// check url para first
	let url_para = new URLSearchParams(window.location.search);
	process_data();
});

function process_data() {
	$("#loading_text").html("Processing data...");
	let url_para = new URLSearchParams(window.location.search);
	
	// add local storage if not exist
	const lookup = [
		["pcsl_s_showHidden", 1],
		["pcsl_s_selecInput", 1],
		["pcsl_s_showRandom", 0],
		["pcsl_s_ignoreRule", 0],
		["pcsl_s_rep_select", 1],
		["pcsl_s_showReleas", 0],
		["pcsl_s_LPressCopy", 1],
		["pcsl_s_longP_time", 600]
	];
	for (let i in lookup) {
		if (ls(lookup[i][0]) === null) {
			ls(lookup[i][0], lookup[i][1]);
		}
	}

	// read from local storage
	setting.show_hidden     = ls("pcsl_s_showHidden") == 1;
	setting.select_input    = ls("pcsl_s_selecInput") == 1;
	setting.show_random     = ls("pcsl_s_showRandom") == 1;
	setting.random_ignore   = ls("pcsl_s_ignoreRule") == 1;
	setting.rep_select_input= ls("pcsl_s_rep_select") == 1;
	setting.show_release    = ls("pcsl_s_showReleas") == 1;
	setting.longPress_copy  = ls("pcsl_s_LPressCopy") == 1;
	setting.rep_show_artist = ls("pcsl_s_rep_artist") == 1;
	setting.longPress_time  = parseInt(ls("pcsl_s_longP_time"));

	// switch display in settings according to saved settings
	if (!setting.show_hidden) {
		$("#setting_hidden>div").toggleClass("selected");
	}
	if (!setting.select_input) {
		$("#setting_select>div").toggleClass("selected");
	}
	if (setting.show_random) {
		$("#setting_random>div").toggleClass("selected");
	}
	if (setting.random_ignore) {
		$("#setting_ignore>div").toggleClass("selected");
	}
	if (!setting.rep_select_input) {
		$("#setting_rep_select>div").toggleClass("selected");
	}
	if (setting.show_release) {
		$("#setting_release>div").toggleClass("selected");
	}
	if (!setting.longPress_copy) {
		$("#setting_copy>div").toggleClass("selected");
	}
	if (!setting.rep_show_artist) {
		$(".rep_tweet_a").toggleClass("selected");
	}
	$("#three_way_time>div").removeClass("selected");
	$(`#three_way_${setting.longPress_time}`).addClass("selected");

	$("#nav_search_random").toggleClass("blank", !setting.show_random);
	$(".setting_req_random").toggleClass("disabled", !setting.show_random);
	$(".setting_copy_time").toggleClass("disabled", !setting.longPress_copy);

	if (ls("pcsl_s_show_extra")) {
		$("#setting_extra_container").removeClass("hidden");
	}
	switch (ls("theme")) {
		case "light":
		case "mixed":
			$("#setting_extra_container>div").addClass("disabled");
			break;
		case "extra":
			$("#setting_extra").click();
	}

	// processing url para
	init();
	let target_page = url_para.get("page");
	if (target_page !== "home") {
		if (jump2page(target_page) === -1) {
			jump2page("home");
		}
	}
	if (url_para.get("search") !== null) {
		if (current_page !== "search") {
			jump2page("search");
		}
		// prevent out of range
		let song_id = url_para.get("search").split(",");
		if (song_id.length > 1) {
			let added_song = 0;
			for (let i in song_id) {
				// check if valid
				let temp = parseInt(song_id[i]);
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
	if (url_para.get("rfilter") !== null) {
		if (current_page !== "repertoire") {
			jump2page("rep");
		}
		// extract bits
		let selected_bits = [];
		let temp = parseInt(url_para.get("rfilter"));
		let counter = 0;
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
		for (let i in rep_anisong) {
			if (!selected_bits.includes(rep_anisong[i][1])) {
				$("#anisong_" + i).click();
			}
		}
		for (let i in rep_genre) {
			if (!selected_bits.includes(rep_genre[i][1])) {
				$("#general_" + i).click();
			}
		}
	}
	// remove loading screen
	$("#loading_text").html("Loading Complete.<br />You can't see this tho");
	$("#loading_overlay").addClass("hidden");
	$("body").removeClass("allow_reload");
}

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
			let scrollTop = $("html,body").scrollTop();
			let delta = scrollTop / 33;
			function frame() {
				scrollTop -= delta;
				$("html,body").scrollTop(scrollTop);
				if (scrollTop <= 0)
					clearInterval(id)
			}
			let id = setInterval(frame, 1);
			if (current_page === "repertoire" && setting.rep_selected_first) {
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
			let target = ($(e.target).attr("id")).replace("menu2page_", "");
			if (target === current_page) {
				return;
			}
			jump2page(target);
			
			// close menu
			$("#menu_container").addClass("hidden");
			$("#nav_menu").removeClass("menu_opened");
			$(document.body).removeClass("no_scroll");
		});
		
		// menu - setting
		$(document).on("click", "#menu_setting", function() {
			// hide / show things
			$("#popup_container").removeClass("hidden");
			$("#settings").removeClass("hidden");
			$("#menu_container").addClass("hidden");
			$("#nav_menu").removeClass("menu_opened");
			prevent_menu_popup = true;
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
	
	{ // settings

		let dark_clicked = 0;
		// general - display_theme
		$(document).on("click", "#three_way_theme>div", function() {
			let selected = this.id.replace("three_way_", "");
			$("#setting_extra_container>div").toggleClass("disabled", selected !== "dark");
			if (selected === "dark") {
				selected = $("#dark_extra").hasClass("selected") ? "extra" : "dark";
			}
			document.documentElement.setAttribute("theme", selected);
			ls("theme", selected);
			$("#three_way_theme>div").removeClass("selected");
			$(this).addClass("selected");
			// set post-switch bg colour
			// does not account for cross origin, not needed anyways
			parent.refresh_bgColour();
			dark_clicked = selected === "dark" ? ++dark_clicked : 0;
			if (dark_clicked === 5) {
				$("#setting_extra_container").removeClass("hidden");
				ls("pcsl_s_show_extra", 1);
			}
			
		});

		// rep - long press length
		$(document).on("click", "#three_way_time>div", function() {
			let time = parseInt(this.id.replace("three_way_", ""));
			ls("pcsl_s_longP_time", time);
			setting.longPress_time = time;
			$("#three_way_time>div").removeClass("selected");
			$(this).addClass("selected");
		});

		$(document).on("click", ".two_way:not(.disabled)", function() {
			$(this).children().toggleClass("selected");
			switch (this.id) {
				case "setting_extra":
					let cur_state = $("#dark_extra").hasClass("selected");
					ls("theme", cur_state ? "extra" : "dark");
					document.documentElement.setAttribute("theme", ls("theme"));
					break;
				case "setting_hidden":
					setting.show_hidden ^= 1;
					ls("pcsl_s_showHidden", setting.show_hidden ? "1" : "0");
					update_display(1);
					break;
				case "setting_select":
					setting.select_input ^= 1;
					ls("pcsl_s_selecInput", setting.select_input ? "1" : "0");
					break;
				case "setting_random":
					setting.show_random ^= 1;
					$("#nav_search_random").toggleClass("blank", setting.show_random);
					ls("pcsl_s_showRandom", setting.show_random ? "1" : "0");
					$(".setting_req_random").toggleClass("disabled", !setting.show_random);
					break;
				case "setting_ignore":
					setting.random_ignore ^= 1;
					$("#nav_search_random").toggleClass("disabled", setting.search_by_song ? (setting.random_ignore ? false : loading !== "") : true);
					ls("pcsl_s_ignoreRule", setting.random_ignore ? "1" : "0");
					break;
				case "setting_release":
					setting.show_release ^= 1;
					ls("pcsl_s_showReleas", setting.show_release ? "1" : "0");
					if (current_page === "repertoire") {
						rep_display();
					}
					break;
				case "setting_rep_select":
					setting.rep_select_input ^= 1;
					ls("pcsl_s_rep_select", setting.rep_select_input ? "1" : "0");
					break;
				case "setting_copy":
					setting.longPress_copy ^= 1;
					ls("pcsl_s_LPressCopy", setting.longPress_copy ? "1" : "0");
					$(".setting_copy_time").toggleClass("disabled", !setting.longPress_copy);
			}
		})
	}
	
	// popup - return
	$(document).on("click", "#popup_container", function(e) {
		// all popup except rep share
		if (!$(e.target).closest('.popup_frame').length) {
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
			let result = new Date(date_start);
			result.setDate(date_start.getDate() + passed);
			return result.toISOString().slice(0, 10);
		}
		
		for (let i in video) {
			video[i][video_idx.date] = getDateText(video[i][video_idx.date]);
		}
		
		// reverse note
		for (let i in entry) {
			entry[i][entry_idx.note] = note_index[entry[i][entry_idx.note]];
		}
		// remove note index
		note_index = null;
	}
	for (let i in song) {
		entry_proc[i] = [];
	}
	for (let i = 0; i < entry.length; ++i) {
		entry_proc[entry[i][0]].push(i);
	}
	$("#info_version").html(version);
	$("#info_last-update").html(video[video.length - 1][video_idx.date]);
	// get screen size
	auto_display_max = Math.floor(5 * Math.pow(window.innerHeight / window.innerWidth, 1.41421356237));
	
	// process song names
	for (let i = 1; i < song.length; ++i) {
		processed_song_name.push(song[i][song_idx.name].toLowerCase().normalize("NFKC"));
	}
}

// functional functions

// display date in yyyy-MM-dd format
function display_date(input) {
	let e = typeof(input) === "string" ? new Date(input) : input;
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
	let e = org.toLowerCase().indexOf(selc.toLowerCase());
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

const today = new Date().setHours(0, 0, 0, 0);

// get day different between {date1 and date2} or {date1 and today}
function get_date_different(date1, date2 = today) {
	date1 = (typeof(date1) === "string") ? new Date(date1) : date1;
	date2 = date2 === undefined ? date2 : new Date(date2);
	return Math.round(Math.abs(date1 - date2) / 86400000);
}

// get entry count of all entry and member-only entry that fufills mask
function get_sang_count(id) {
	let count = 0,
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
			$("#nav_title").html("曲検索");
			// reset input -> reload
			$("#input").val("");
			search();
			break;
		case "rep" :
		case "repertoire" : 
			// show section
			$("#repertoire_section").removeClass("hidden");
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

let copy_popup_is_displaying = false;

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

function to_html(input) {
	return input.replaceAll(`"`, `&quot;`).replaceAll(`'`, `&apos;`);
}

function to_non_html(input) {
	return input.replaceAll(`&quot;`, `"`).replaceAll(`&apos;`, `'`);
}
function refresh_bgColour() {
	document.documentElement.setAttribute("theme", ls("theme"));
}

function ls(a, b) {
	return b === undefined ? localStorage.getItem(a) : localStorage.setItem(a, b);
}