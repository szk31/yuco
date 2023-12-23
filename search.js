// stores whats currently looking up
var loading = "";

// store song id (song[id]) of folded up songs
var hide_song = new Array();

// if searching through song names or artist names
var searching_song_name = true;

// sort by date / type
var search_sort_by_date = true;

// sort asd / des
var search_sort_asd = true;

// max display boxes of autocomplete
var auto_display_max;

// flag : is loading songs from rep selected
var is_searching_from_rep = false;

$(function() {
	// nav - random
	$(document).on("click", "#nav_search_random", function() {
		if($(this).hasClass("disabled") && !do_random_anyway) {
			return;
		}
		if (prevent_menu_popup) {
			return;
		}
		// check if the song has any visibile record
		var random_song,
			found = trial = 0;
		do {
			random_song = Math.floor(Math.random() * song.length);
			for (var i in entry_proc[random_song]) {
				if ((!do_display_hidden) && is_private(entry_proc[random_song][i])) {
					continue;
				}
				found++;
				break;
			}
		} while (found === 0);
		$("#input").val(song[random_song][song_idx.name]);
		is_searching_from_rep = 0;
		search();
	});
	
	// nav - share
	$(document).on("click", "#nav_share", function() {
		if (current_page !== "search" || $(this).hasClass("disabled")) {
			return;
		}
		// generate url w/ first song
		var out_url = "szk31.github.io/yuco/?search=" + song_lookup.indexOf(hits[0]);
		// then add 2nd to last song
		for (var i = 1; i < hits.length; ++i) {
			out_url += ("," + song_lookup.indexOf(hits[i]));
		}
		navigator.clipboard.writeText(out_url);
		copy_popup();
	});
	
	{ // search
		// search - input - autocomplete
		$(document).on("input", "#input", function() {
			auto_search();
		});
		
		// search - input - autocomplete - selection
		$(document).on("mousedown", ".auto_panel", function() {
			var e = $(this).attr("id");
			// set input
			$("#input").val(e);
			// input on blur fires after this so no need to run search here
		});

		// search - input - submit
		$(document).on("blur", "#input", function() {
			$("#search_auto").addClass("hidden");
			is_searching_from_rep ? is_searching_from_rep = 0 : $("#nav_share").toggleClass("disabled", !is_searching_from_rep);
			search();
		});
		
		// search - input::enter -> blur
		$(document).on("keydown", function(e) {
			if (e.keyCode === 13 && current_page === "search") {
				$("#input").blur();
			}
		});
		
		// search - input::focus -> reset, auto complete
		$(document).on("focus", "#input", function(e) {
			if (do_clear_input || loading === "!bulk_load_flag") {
				$(e.target).val("");
				$("#nav_search_random").removeClass("disabled");
				$("#nav_share").addClass("disabled");
			}
			auto_search();
		});
		
		// search - collapse option menu
		$(document).on("click", "#search_options_button", function() {
			$("#search_options_button").toggleClass("opened");
			$("#search_options_container").toggleClass("hidden");
		});
		
		// search - options - singer
		$(document).on("click", ".singer_icon", function() {
			var e = parseInt($(this).attr('class').split(/\s+/).find(x => x.startsWith("sing_sel_")).replace("sing_sel_", ""));
			var selected = part_rom.indexOf(e);
			if (0 <= selected && selected <= 2) {
				singer_chosen[selected] ^= 1;
			}
			part_filter[selected] ^= 1;
			// just add a new filter[6] to use at displaying
			$(".sing_sel_" + e).toggleClass("selected");
			loading = "";
			search();
		});
		
		// search - options - method
		$(document).on("click", ".search_option_group1", function() {
			var clicked_id = $(this).attr("id").replace(/(search_options_)/, "");
			var new_setting = clicked_id === "songname";
			if (new_setting === searching_song_name) {
				// nothing changed
				return;
			}
			searching_song_name = new_setting;
			$(".search_option_group1>.radio").toggleClass("selected");
			$("#input").val("");
			$("#nav_share").addClass("disabled");
			$("#input").attr("placeholder", searching_song_name ? "曲名/読みで検索" : "アーティスト名で検索");
			$("#search_display").html("");
			loading = "";
			// disable / renable random
			$("#nav_search_random").toggleClass("disabled", !searching_song_name);
		});
		
		// search - options - sort - method
		$(document).on("click", ".search_option_group2", function() {
			var clicked_id = $(this).attr("id").replace(/(search_options_)/, "");
			var new_setting = clicked_id === "date";
			if (search_sort_by_date === new_setting) {
				// nothing changed
				return;
			}
			search_sort_by_date = new_setting;
			$(".search_option_group2>.radio").toggleClass("selected");
			update_display();
			$("#search_options_asd>.attr_name").html(search_sort_by_date ? 
			(search_sort_asd ? "古い順&nbsp;(⇌新しい順)" : "新しい順&nbsp;(⇌古い順)") : 
			(search_sort_asd ? "正順&nbsp;(⇌逆順)" : "逆順&nbsp;(⇌正順)"));
		});
		
		// search - options - sort - asd/des
		$(document).on("click", ".search_option_group3", function() {
			search_sort_asd ^= 1;
			$("#search_options_asd>.attr_name").html(search_sort_by_date ? 
			(search_sort_asd ? "古い順&nbsp;(⇌新しい順)" : "新しい順&nbsp;(⇌古い順)") : 
			(search_sort_asd ? "正順&nbsp;(⇌逆順)" : "逆順&nbsp;(⇌正順)"));
			update_display();
		});
		
		// search - options - others - max display - input
		$(document).on("input", "#search_options_count_input", function() {
			max_count_update(this);
		});
		
		// search - options - others - max display
		$(document).on("blur", "#search_options_count_input", function() {
			// check min max
			var e = Math.min(400, Math.max(1, parseInt($("#search_options_count_input").val())));
			$("#search_options_count_input").val(e);
			max_display = e;
			update_display();
			setCookie("pcsl_settings_display", e);
		});
		
		// search - options - others - max display - blur
		$(document).on("keydown", function(e) {
			if (e.keyCode === 13) {
				$("#search_options_count_input").blur();
			}
		});
		
		// search - options - others
		$(document).on("click", ".search_option_group4", function() {
			var btn_id = $(this).attr("id").replace(/(search_options_)/, "");
			$("#search_options_btn_" + btn_id).toggleClass("selected");
			switch (btn_id) {
				case "displayHidden" :
					do_display_hidden ^= 1;
					update_display();
					setCookie("pcsl_settings_hidden" , do_display_hidden ? 1 : 0);
					break;
				case "reset" :
					do_clear_input ^= 1;
					setCookie("pcsl_settings_clear" , do_clear_input ? 1 : 0);
					break;
				case "randomAnyway" :
					do_random_anyway ^= 1;
					$("#nav_search_random").toggleClass("disabled", searching_song_name ? (do_random_anyway ? false : loading !== "") : true);
					setCookie("pcsl_settings_random" , do_random_anyway ? 1 : 0);
					break;
				case "shareWeb" :
					do_share_web ^= 1;
					setCookie("pcsl_settings_share" , do_random_anyway ? 1 : 0);
			}
		});
		
		// search - song - hide_song
		$(document).on("click", ".song_name_container", function(e) {
			if (!$(e.target).hasClass("song_copy_icon")) {
				var f = parseInt($(this).attr("id"));
				if(!hide_song.includes(f)){
					hide_song.push(f);
				}else{
					hide_song.splice(hide_song.indexOf(f), 1);
				}
				$(".song_" + f).toggleClass("hidden");
				$("#fold_" + f).toggleClass("closed");
			}
		});

		// search - song - copy_name
		$(document).on("click", ".song_copy_icon", function() {
			var e = parseInt($(this).attr("id").replace("copy_name_", ""));
			navigator.clipboard.writeText(song[e][song_idx.name]);
			copy_popup();
		});
		
		// search - entry - share
		$(document).on("click", ".entry_share", function() {
			var entry_id = parseInt($(this).attr("id").replace("entry_", ""));
			// get video title
			const url = "https://www.youtube.com/watch?v=" + video[entry[entry_id][entry_idx.video]][video_idx.id];

			fetch("https://noembed.com/embed?dataType=json&url=" + url)
			.then(res => res.json())
			.then(function(data) {
				// title of unlisted / private video are returned a 401 error
				if (data.title === undefined) {
					alert("動画タイトル取得できませんでした。");
					return;
				}
				var tweet = "";
				if (entry[entry_id][entry_idx.time] === 0) {
					tweet = data.title + "\n(youtu.be/" + video[entry[entry_id][entry_idx.video]][video_idx.id] + ")";
				} else {
					tweet = song[entry[entry_id][entry_idx.song_id]][song_idx.name].trim() + " / " + song[entry[entry_id][entry_idx.song_id]][song_idx.artist] + " @" + data.title + "\n(youtu.be/" + video[entry[entry_id][entry_idx.video]][video_idx.id] + timestamp(entry_id) + ")";
				}
				if (do_share_web) {
					tweet += ("\n\nszk31.github.io/yuco/?search=" + song_lookup.indexOf(entry[entry_id][entry_idx.song_id]) + "より");
				}
				window.open("https://twitter.com/intent/tweet?text=" + encodeURIComponent(tweet), "_blank");
			});
		});
	}
});

var hits = [];

function auto_search() {
	var e = $("#input").val().normalize("NFKC").toLowerCase().trim();
	if (e === "" || !searching_song_name) {
		$("#search_auto").addClass("hidden");
		return;
	}
	var auto_exact = [],
		auto_other = [],
		auto_exact_count = 0,
		auto_other_count = 0;
	// search for series name
	for (var i in series_lookup) {
		for (var j in series_lookup[i]) {
			var f = series_lookup[i][j].indexOf(e);
			if (f !== -1) {
				// if string exist in series variations
				auto_exact[auto_exact_count++] = i;
				break;
			}
		}
	}
	// if input consist of only hiragana, "ー" or "ヴ"
	if (!/[^\u3040-\u309F\u30FC\u30F4]/.test(e)) {
		// search for reading
		// should search for index of 1st char -> 2nd then try to fill up auto_exact first but who cares about loading time anyway
		for (var i = 1; i < song.length; ++i) {
			// skip if same song name
			if (i > 2 && song[i][song_idx.name].trim() === song[i - 1][song_idx.name].trim()) {
				continue;
			}
			var f = song[i][song_idx.reading].indexOf(e);
			switch (f) {
				case  0 : // found, from beginning
					if (entry_proc[i].length > 0) {
						auto_exact[auto_exact_count++] = i;
					}
					break;
				case -1 : // not found
					break;
				default : // found, not from beginning
					if (entry_proc[i].length > 0) {
						auto_other[auto_other_count++] = i;
					}
					break;
			}
			if (auto_exact_count >= auto_display_max) {
				break;
			}
		}
	} else {
		// search for song name
		for (var i = 1; i < song.length; ++i) {
			// skip if same song name
			if (i > 2 && song[i][song_idx.name].trim() === song[i - 1][song_idx.name].trim()) {
				continue;
			}
			var f = song[i][song_idx.name].toLowerCase().indexOf(e);
			switch (f) {
				case  0 : // found, from beginning
					if (entry_proc[i].length > 0) {
						auto_exact[auto_exact_count++] = i;
					}
					break;
				case -1 : // not found
					break;
				default : // found, not from beginning
					if (entry_proc[i].length > 0) {
						auto_other[auto_other_count++] = i;
					}
					break;
			}
			if (auto_exact_count >= auto_display_max) {
				break;
			}
		}
	}
	// display
	var auto_display_count = 0;
	var new_html = "";
	for (var i in auto_exact) {
		// data being number (song id) or string (series name)
		var auto_reading, auto_display, song_name;
		if (isNaN(parseInt(auto_exact[i]))) {
			// series name
			auto_reading = "";
			auto_display = song_name = auto_exact[i];
		} else {
			// song reading
			var song_reading = song[auto_exact[i]][song_idx.reading];
			if (song_reading.indexOf(" ") === -1) {
				auto_reading = bold(song_reading, e)
			} else {
				auto_reading = bold(song_reading.substring(0, song_reading.indexOf(" ")), e);
			}
			// song name
			song_name = song[auto_exact[i]][song_idx.name];
			auto_display = bold(song_name, e);
		}
		new_html += ("<div id=\"" + song_name + "\" class=\"auto_panel" + (auto_display_count === 0 ? " auto_first" : "") + "\"><div class=\"auto_reading\">" + auto_reading + "</div><div class=\"auto_display\">" + auto_display + "</div></div>");
		auto_display_count++;
	}
	for (var i in auto_other) {
		new_html += ("<div id=\"" + song[auto_other[i]][song_idx.name] + "\" class=\"auto_panel" + (auto_display_count === 0 ? " auto_first" : "") + "\"><div class=\"auto_reading\"></div><div class=\"auto_display\">" + bold(song[auto_other[i]][song_idx.name], e) + "</div></div>");
		
		if (++auto_display_count >= auto_display_max) {
			break;
		}
	}
	$("#search_auto").html(new_html);
	if (new_html !== "") {
		$("#search_auto").removeClass("hidden");
	} else {
		$("#search_auto").addClass("hidden");
	}
}

function search() {
	// ignore blank input if search from rep
	if (is_searching_from_rep) {
		update_display();
		return;
	}
	var e = $("#input").val().trim();
	if (e === loading) {
		return;
	}
	loading = e;
	if (e === "") {
		// clear current list
		$("#search_display").html("");
		// enable random
		$("#nav_search_random").removeClass("disabled");
		return;
	}
	// not empty input
	// disable random
	if (!do_random_anyway) {
		$("#nav_search_random").addClass("disabled");
	}
	// replace wchar w/ char
	e = e.normalize("NFKC").toLowerCase();
	var series_name = "";
	for (var i in series_lookup) {
		for (var j in series_lookup[i]) {
			if (series_lookup[i].includes(e)) {
				series_name = i;
				break;
			}
		}
		if (series_name !== "") {
			break;
		}
	}
	// search for series in attr
	var attr_series = 0;
	if (series_name != "") {
		var using_attr = [2, 3, 4, 7];
		for (var i in using_attr) {
			if (attr_idx[using_attr[i]] === series_name) {
				attr_series = using_attr[i];
				break;
			}
		}
	}

	hits = [];
	for (var i = 1; i < song.length; ++i) {
		if (hits.length === 200) {
			break;
		}
		if (searching_song_name) {
			if (series_name !== "") {
				if (song[i][song_idx.reading].includes(series_name)) {
					hits.push(i);
					continue;
				}
				// check in attr index
				if (attr_series) {	// default 0 if not needed
					if ((1 << attr_series) & song[i][song_idx.attr]) {
						hits.push(i);
					}
				}
			} else {
				if (processed_song_name[i].includes(e) ||
					song[i][song_idx.reading].toLowerCase().includes(e)
				) {
					hits.push(i);
				}
			}
		} else {
			if (song[i][song_idx.artist].toLowerCase().includes(e)) {
				hits.push(i);
			}
		}
	}
	$("#nav_share").toggleClass("disabled", searching_song_name || hits === 0);
	// sort exact song name to top
	hits.sort(function (a, b) {
		if (song[a][song_idx.name].trim().toLowerCase() === e) {
			// exist a record same to input
			if (song[b][song_idx.name].trim().toLowerCase() === e) {
				// if the other record is also same to input
				return 0;
			} else {
				return -1;
			}
		} else {
			if (song[b][song_idx.name].trim().toLowerCase() === e) {
				return 1;
			}
		}
	});
	update_display();
}

function update_display(force = false) {
	// ignore blank input if search from rep
	force |= is_searching_from_rep;
	
	$("#search_auto").addClass("hidden");
	if (loading === "" && !force) {
		return;
	}
	var current_song = -1;
	// record loaded song (for un-hiding song thats no longer loaded)
	var loaded_song = [];
	var loaded_count = 0;
	
	var new_html = "";
	var displayed = 0;
	var found_entries = 0;
	for (var i = 0; i < hits.length; ++i) {
		// sort according to settings
		var sorted_enrties = [];
		if (search_sort_by_date) {
			sorted_enrties = entry_proc[hits[i]].sort((a, b) => {
				return (search_sort_asd ? a - b : b - a);
			});
		} else {
			sorted_enrties = entry_proc[hits[i]].sort((a, b) => {
				if (entry[a][entry_idx.type] === entry[b][entry_idx.type]) {
					return a - b;
				}
				return (search_sort_asd ? 1 : -1) * (display_order[entry[a][entry_idx.type]] - display_order[entry[b][entry_idx.type]])
			});
		}
		found_entries += sorted_enrties.length;
		for (var j = 0; j < sorted_enrties.length; ++j) {
			var cur_entry = sorted_enrties[j];
			// if private
			if ((!do_display_hidden) && is_private(cur_entry)) {
				continue;
			}
			// if new song
			if (current_song !== entry[cur_entry][entry_idx.song_id]) {
				new_html += ((current_song !== -1 ? "</div>" : "") + "<div class=\"song_container\">");
				current_song = entry[cur_entry][entry_idx.song_id];
				loaded_song[loaded_count++] = current_song;
				// if hide the song
				var show = !hide_song.includes(current_song);
				// check song name
				var song_name = song[current_song][song_idx.name].normalize("NFKC");
				var song_name_length = 0;
				for (var k = 0; k < song_name.length; ++k) {
					song_name_length += /[ -~]/.test(song_name.charAt(k)) ? 1 : 2;
				}
				// you know what fuck this shit i will just add exception
				if (song_name === "secret base ~君がくれたもの~") {
					song_name_length = 0;
				}
				// case "みくみくにしてあげる♪【してやんよ】"
				if (song_name === "みくみくにしてあげる♪【してやんよ】") {
					song_name = "みくみくにしてあげる♪<br />【してやんよ】";
				}
				if (/([^~]+~+[^~])/g.test(song_name) && song_name_length >= 28) {
					song_name = song_name.substring(0, song_name.search(/~/g)) + "<br />" + song_name.substring(song_name.search(/~/g));
				}
				new_html += (
				"<div class=\"song_name_container " + (loaded_count % 2 ? "odd_colour" : "even_colour") + "\" id=\"" + current_song + "\">" +
					"<div class=\"song_rap\">" +
						"<div class=\"song_name\">" + song_name + "</div>" +
						"<div class=\"song_credit" + (show ? "" : " hidden") + (song[current_song][song_idx.artist].length > 30 ? " long_credit" : "") + " song_" + current_song + "\">" + song[current_song][song_idx.artist] + "</div>" +
					"</div>" +
					"<div class=\"song_icon_container\">" +
						"<div id=\"fold_" + current_song + "\" class=\"song_fold_icon" + (show ? "" : " closed") + "\"></div>" +
						"<div id=\"copy_name_" + current_song + "\" class=\"song_copy_icon song_" + current_song + (show ? "" : " hidden") + "\"></div>" +
					"</div>" +
				"</div>");
			}
			var is_mem = entry[cur_entry][entry_idx.note].includes("【メン限");
			var no_note = entry[cur_entry][entry_idx.note] === "" || entry[cur_entry][entry_idx.note] === "【メン限】" || entry[cur_entry][entry_idx.note] === "【メン限アーカイブ】";
			var note = entry[cur_entry][entry_idx.note];
			if (is_mem) {
				if (note.includes("メン限アーカイブ")) {
					note = note.replace(/【メン限アーカイブ】/g, "");
				} else {
					note = note.replace(/【メン限】/g, "");
				}
			}
			new_html += (
			"<div class=\"entry_container " + 
			"singer_9" + (is_mem ? "m" : "") + 
			" song_" + current_song + (hide_song.includes(current_song) ? " hidden" : "") + "\">" + 
				"<a href=\"https://youtu.be/" + video[entry[cur_entry][entry_idx.video]][video_idx.id] + timestamp(cur_entry) +"\" target=\"_blank\">" + 
				"<div class=\"entry_primary\">" + 
					"<div class=\"entry_date\">" + 
						display_date(video[entry[cur_entry][entry_idx.video]][video_idx.date]) + 
					"</div>" + 
					"<div class=\"entry_singer\">" + 
						"つきみゆこ" + 
					"</div>" + 
					"<div class=\"mem_display\">" + (is_mem ? "メン限" : "") + "</div>" + 
					"<div class=\"entry_share\" id=\"entry_" + cur_entry + "\" onclick=\"return false;\"></div>" + 
				"</div>" + 
				(no_note ? "" : ("<div class=\"entry_note\">" + note + "</div>")) + "</a>" + 
			"</div>");
			if (++displayed >= max_display) {
				i = 200;
				break;
			}
		}
	}
	// dealing with a blank screen with non-blank input
	do {
		// if there already something to display
		if (new_html !== "") {
			break;
		}
		// no song found
		if (hits.length === 0) {
			new_html += "<div class=\"search_no_result\">曲検索結果なし";
			break;
		}
		// only private songs are found / singer deselected
		if (found_entries > 0) {
			new_html += "<div class=\"search_no_result\">非表示動画のみ";
			break;
		}
		// only never sang songs are found
		new_html += "<div class=\"search_no_result\">歌記録なし";
	} while (0);
	
	$("#search_display").html(new_html + "</div>");
	// check all hiden songs
	for (var i = 0; i < hide_song.length; ++i) {
		// if song havnt been loaded, remove from hide list
		if (!loaded_song.includes(hide_song[i])) {
			hide_song.splice(i--, 1);
		}
	}
}

function timestamp(id) {
	return entry[id][entry_idx.time] === 0 ? "" : "?t=" + entry[id][entry_idx.time];
}

function max_count_update(node) {
	// store cursor position
	var start = node.selectionStart,
		  end = node.selectionEnd,
	        e = $(node).val();
	
	// remove anything thats not 0~9, remove last character if too long
	e = e.replace(/[^\d]/g, "").substring(0, 3);
	// set value to processed value
	$("#search_options_count_input").val(e);
	// restore cursor position
	node.setSelectionRange(start, end);
}
