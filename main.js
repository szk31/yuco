// series search
const series_lookup = {
	"マクロス" : "マクロスまくろす",
	"ラブライブ" : "ラブライブらぶらいぶll",
	"アイマス" : "アイマスあいますデレマスでれます",
	"ジブリ" : "ジブリじぶり",
	"物語シリーズ" : "物語シリーズものがたりしりーず",
	"まどマギ" : "まどマギまどまぎ",
	"disney" : "disneyディズニーでぃずにー"
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

const version = "1.8.0";

/* control / memories */

// prevent menu from opening when info or setting is up
let prevent_menu_popup = false;

// current page name
let current_page = "home";

/* setting section */
let settings = {
	set_hidden_unlocked: {			// setting: if hidden options are unlocked
		value: false,
		req_LS: true
	},
	set_show_hidden: {				// setting: if hidden options are displayed
		value: false,
		req_LS: true
	},
	ser_show_private: {				// setting: do display private video
		value: true,
		req_LS: true,
		prv_name: ["pcsl_s_showHidden"]
	},
	ser_select_input: {				// setting: highlight input on click
		value: true,
		req_LS: true,
		prv_name: ["pcsl_s_selecInput"]
	},
	ser_via_song_name: {			// search: if search is searching song name
		value: true,
		req_LS: false
	},
	ser_sort_by_date: {				// search: if results are sorted by date
		value: true,
		req_LS: false
	},
	ser_sort_asd: {					// serach: if results are sorted ascendingly
		value: true,
		req_LS: false
	},
	ser_rand_show: {				// setting: if random button is shown
		value: false,
		req_LS: true,
		prv_name: ["pcsl_s_showRandom"]
	},
	ser_rand_req_empty: {			// setting: if random is pressable when input is not empty
		value: false,
		req_LS: true,
		prv_name: ["pcsl_s_ignoreRule"]
	},
	pdt_on_change_only: {			// setting: if predict only shows once input changed
		value: true,
		req_LS: true,
		prv_name: ["pcsl_s_autoAnyway"]
	},
	pdt_reading: {					// setting: display reading in predict
		value: true,
		req_LS: true,
		prv_name: ["pcsl_s_shwReading"]
	},
	pdt_copy_on_select: {			// setting: if song name copied on select\
		value: false,
		req_LS: true
	},
	rep_show_release: {				// setting: display release date in rep
		value: false,
		req_LS: true,
		prv_name: ["pcsl_s_showReleas"]
	},
	rep_long_press_copy: {			// setting: if long press song copies song name
		value: true,
		req_LS: true,
		prv_name: ["pcsl_s_LPressCopy"]
	},
	rep_long_press_time: {			// setting: long press react time (ms)
		value: 600,
		req_LS: true,
		prv_name: ["pcsl_s_longP_time"]
	},
	rep_select_input: {				// setting: highlight input on click
		value: true,
		req_LS: true,
		prv_name: ["pcsl_s_rep_select"]
	},
	rep_sort_method: {				// rep: sort
		value: "50",
		req_LS: false
	},
	rep_sort_asd: {					// rep: if results are sorted ascendingly
		value: true,
		req_LS: false
	},
	rep_selected_first: {			// rep: if selected songs are moved to top
		value: false,
		req_LS: false
	},
	rep_show_artist: {				// hidden: if rep-share includes artist name
		value: true,
		req_LS: true,
		prv_name: ["pcsl_s_rep_artist"]
	}
};

function update_setting(key) {
	ls(`pcsl_${key}`, settings[key].value);
	return settings[key].value;
}

function toggle_setting(key) {
	settings[key].value ^= 1;
	return update_setting(key);
}

// ram for searching (entry_processed)
let entry_proc = [];

// memcount - rep generate interval flag
let memcount_rep_int;

// pre-process song names
let processed_song_name = [""];

// pre-process song to be skipped
let auto_skips = [];

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
	init();
});

function init() {
	$("#loading_text").html("Processing data...");

	load_setting_flags();
	process_data();
	load_url_para();

	// remove loading screen
	$("#loading_text").html("Loading Complete.<br />You can't see this tho");
	$("#loading_overlay").addClass("hidden");
	$("body").removeClass("allow_reload");
}

function load_setting_flags() {
	// change settings selected theme
	$(`#three_way_${ls("theme") === "extra" ? "dark" : ls("theme")}`).addClass("selected");

	function new_key(key, val) {
		ls(key, typeof val === "number" ? val : val ? 1 : 0);
	}

	const do_default = new URLSearchParams(window.location.search).has("reset_settings");
	if (do_default) {
		ls("theme", "mixed");
	}
	Object.entries(settings).forEach(([index, item]) => {
		if (!item.req_LS) {
			return;
		}
		const key = `pcsl_${index}`;
		if (do_default) {
			localStorage.removeItem(key);
			ls(key, typeof item.value === "number" ? item.value : item.value ? 1 : 0);
			return;
		}

		let result = ls(key);
		if (!result) {
			// check if no older key
			if (!settings[index].prv_name?.length) {
				// new user, add new key
				new_key(key, item.value);
				return; 
			}
			// old user, yes older key
			const old_setting = settings[index].prv_name.find(x => ls(x));
			if (old_setting) {
				result = ls(old_setting);
				localStorage.removeItem(old_setting);
				ls(key, result);
			} else {
				new_key(key, item.value);
				return;
			}
		}
		const dflt = settings[index].value;
		// read key if exist
		switch (result) {
			case "0":
			case "1":
				settings[index].value = result == 1;
				break;
			default: 
			settings[index].value = parseInt(result);
		}
		result = settings[index].value;
		const changed = settings[index].value !== dflt;
		// change the selected option insetting menu as well
		let target = `#setting_${index}>div`;
		switch (index) {	// non-default: special case
			case "set_hidden_unlocked":
				if (settings[index].value) {
					$("#setting_extra_container").removeClass("hidden");
				}
				return;
			case "set_show_hidden":
				if (changed) {
					$(".settings_extra").removeClass("hidden");
				}
				break;
			case "ser_rand_show":
				$("#nav_search_random").toggleClass("blank", !result);
				$(".setting_req_random").toggleClass("disabled", !result);
				break;
			case "rep_long_press_time":
				if (changed) {
					$("#three_way_time>div").removeClass("selected");
					$(`#three_way_${result}`).addClass("selected");
				}
				return;
			case "rep_show_artist":
				target = ".rep_tweet_a";
				break;
			case "rep_long_press_copy":
				$("#three_way_time").toggleClass("disabled", !result);
				break;
		}
		if (changed) {
			$(target).toggleClass("selected");
		}
	});
	switch (ls("theme")) {
		case "light":
		case "mixed":
			$("#setting_dark_container>div").addClass("disabled");
			break;
		case "extra":
			$("#setting_dark").click();
	}	  
}

function process_data() {
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
	auto_display_max = Math.floor(7 * window.innerHeight / window.innerWidth);
	
	// process song names
	for (let i = 1; i < song.length; ++i) {
		processed_song_name.push(song[i][song_idx.name].toLowerCase().normalize("NFKC"));
		if (i > 2 && song[i][song_idx.name].trim() === song[i - 1][song_idx.name].trim()) {
			auto_skips.push(i);
		}
	}
}

function load_url_para() {
	// processing url para
	let url_para = new URLSearchParams(window.location.search);
	url_para.delete("reset_settings");
	window.history.pushState(null, null, `${document.location.href.split('?')[0]}${url_para.size ? `?${url_para}` : ""}`);
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

		// unlock hidden settings
		let title_clicked = 0;
		$(document).on("click", function(e) {
			if ($(e.target).closest(".settings_title").length) {
				if (++title_clicked === 5) {
					ls("pcsl_set_hidden_unlocked", 1);
					// show settings here
					$("#setting_extra_container").removeClass("hidden");
				}
			} else {
				title_clicked = 0;
			}
		})

		// general - display_theme
		$(document).on("click", "#three_way_theme>div", function() {
			let selected = this.id.replace("three_way_", "");
			$("#setting_dark").toggleClass("disabled", selected !== "dark");
			if (selected !== "dark") {
				$("#setting_dark>div").removeClass("selected");
				$("#dark_normal").addClass("selected");
			}
			document.documentElement.setAttribute("theme", selected);
			ls("theme", selected);
			$("#three_way_theme>div").removeClass("selected");
			$(this).addClass("selected");
		});

		// rep - long press length
		$(document).on("click", "#three_way_time>div", function() {
			if ($(".setting_copy_time").hasClass("disabled")) {
				return;
			}
			let time = parseInt(this.id.replace("three_way_", ""));
			ls("pcsl_rep_long_press_time", time);
			settings.rep_long_press_time.value = time;
			$("#three_way_time>div").removeClass("selected");
			$(this).addClass("selected");
		});

		// settings - other options
		$(document).on("click", ".two_way:not(.disabled)", function() {
			$(this).children().toggleClass("selected");
			const key = this.id.replace("setting_", "");
			switch (key) {
				case "set_show_hidden":
					$(".settings_extra").toggleClass("hidden", toggle_setting(key));
					break;
				case "dark":
					let cur_state = $("#dark_extra").hasClass("selected") ? "extra" : "dark";
					ls("theme", cur_state);
					document.documentElement.setAttribute("theme", cur_state);
					break;
				case "ser_show_private":
					toggle_setting(key);
					update_display(1);
					break;
				case "ser_rand_show":
					const rs = toggle_setting(key);	// *r*and_*s*how
					$("#nav_search_random").toggleClass("blank", rs);
					$(".setting_req_random").toggleClass("disabled", !rs);
					break;
				case "ser_rand_req_empty":
					toggle_setting(key);
					$("#nav_search_random").toggleClass("disabled", settings.ser_via_song_name.value ? (settings.ser_rand_req_empty.value ? false : search_memory !== "") : true);
					break;
				case "rep_show_release":
					toggle_setting(key);
					if (current_page === "repertoire") {
						rep_display();
					}
					break;
				case "rep_long_press_copy":
					$(".setting_copy_time").toggleClass("disabled", !toggle_setting(key));
					break;
				case "ser_select_input":
				case "pdt_on_change_only":
				case "pdt_reading":
				case "pdt_copy_on_select":
				case "rep_select":
					toggle_setting(key);
					break;
			}
		});

		// settings - reset button, reset cancel
		$(document).on("click", "#settings_reset_button, #settings_reset_nah", function() {
			$(".settings_reset>span").toggleClass("hidden");
			$("#settings_reset_confirm").toggleClass("blank");
		});

		// settings - reset confirm
		$(document).on("click", "#settings_reset_yes", function() {
			const currentUrl = new URL(window.location.href);
			currentUrl.searchParams.set("reset_settings", "");
			window.location.href = currentUrl.toString();
		});
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
	let count = mem_count = 0;
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

let copy_popup_flag = false;

function copy_popup() {
	if (copy_popup_flag) {
		return;
	}
	copy_popup_flag = true;
	$("#copy_popup").attr("class", "fade_out");
	setTimeout(() => {
		copy_popup_flag = false;
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

function ls(key, value) {
	return value === undefined ? localStorage.getItem(key) : localStorage.setItem(key, value);
}