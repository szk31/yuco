// stores whats currently looking up
let loading = "";

// store song id (song[id]) of folded up songs
let hide_song = new Array();

// max display boxes of autocomplete
let auto_display_max;

// flag : is loading songs from rep selected
let is_searching_from_rep = false;

let input_focused = false;

$(function() {
	// nav - random
	$(document).on("click", "#nav_search_random", function() {
		if($(this).hasClass("disabled") && !setting.random_ignore || prevent_menu_popup) {
			return;
		}
		// check if the song has any visibile record
		let random_song, found = 0;
		do {
			random_song = 1 + Math.floor(Math.random() * song.length);
			for (let i in entry_proc[random_song]) {
				if (!setting.show_hidden && is_private(entry_proc[random_song][i])) {
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
	
	{ // search
		// search - input - autocomplete
		$(document).on("input", "#input", function() {
			auto_search();
		});
		
		// search - input - autocomplete - selection
		$(document).on("mousedown", ".auto_panel", function() {
			$("#input").val(to_non_html(this.id));
			// input on blur fires after this so no need to run search here
		});

		// search - input - submit
		$(document).on("blur", "#input", function() {
			$("#search_auto").addClass("hidden");
			input_focused = false;
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
		$(document).on("click", "#input, #rep_input", function() {
			if (input_focused) {
				return;
			}
			input_focused = true;
			if (setting.select_input && this.id === "input" ||
			setting.rep_select_input && this.id === "rep_input") {
				let pass = this;
				setTimeout(function() {
					pass.setSelectionRange(0, $(pass).val().length);
				}, 0);
			}
			else if (loading === "!bulk_load_flag" && this.id === "input") {
				$(this).val("");
				$("#nav_search_random").removeClass("disabled");
				$("#nav_share").addClass("disabled");
			}
			if (this.id === "input") {
				auto_search();
			}
		});
		
		// search - collapse option menu
		$(document).on("click", "#search_options_button", function() {
			$("#search_options_button").toggleClass("opened");
			$("#search_options_container").toggleClass("hidden");
		});
		
		// search - options - method
		$(document).on("click", ".search_option_group1", function() {
			let new_setting = this.id === "search_options_songname";
			if (new_setting === setting.search_by_song) {
				// nothing changed
				return;
			}
			setting.search_by_song = new_setting;
			$(".search_option_group1>.radio").toggleClass("selected");
			$("#input").val("");
			$("#input").attr("placeholder", setting.search_by_song ? "曲名/読みで検索" : "アーティスト名で検索");
			$("#search_display").html("");
			loading = "";
			// disable / renable random
			$("#nav_search_random").toggleClass("disabled", !setting.search_by_song);
		});
		
		// search - options - sort - method
		$(document).on("click", ".search_option_group2", function() {
			let new_setting = thid.id === "search_options_date";
			if (new_setting === setting.search_sort_by_date) {
				// nothing changed
				return;
			}
			setting.search_sort_by_date = new_setting;
			$(".search_option_group2>.radio").toggleClass("selected");
			update_display();
			$("#search_options_asd>.attr_name").html(setting.search_sort_by_date ? 
			(setting.search_sort_asd ? "古い順&nbsp;(⇌新しい順)" : "新しい順&nbsp;(⇌古い順)") : 
			(setting.search_sort_asd ? "正順&nbsp;(⇌逆順)" : "逆順&nbsp;(⇌正順)"));
		});
		
		// search - options - sort - asd/des
		$(document).on("click", ".search_option_group3", function() {
			setting.search_sort_asd ^= 1;
			$("#search_options_asd>.attr_name").html(setting.search_sort_by_date ? 
				(setting.search_sort_asd ? "古い順&nbsp;(⇌新しい順)" : "新しい順&nbsp;(⇌古い順)") : 
				(setting.search_sort_asd ? "正順&nbsp;(⇌逆順)" : "逆順&nbsp;(⇌正順)")
			);
			update_display();
		});
		
		// search - song - hide_song
		$(document).on("click", ".song_name_container", function(e) {
			if ($(e.target).hasClass("song_copy_icon")) {
				return;
			}
			let f = this.id;
			if (hide_song.includes(f)) {
				hide_song.splice(hide_song.indexOf(f), 1);
			} else {
				hide_song.push(f);
			}
			$(".song_" + f).toggleClass("hidden");
			$("#fold_" + f).toggleClass("closed");
		});

		// search - song - copy_name
		$(document).on("click", ".song_copy_icon", function() {
			navigator.clipboard.writeText(song[parseInt(this.id.replace("copy_name_", ""))][song_idx.name]);
			copy_popup();
		});
		
		// search - entry - share
		$(document).on("click", ".entry_share", function(e) {
			e.preventDefault();
			let entry_id = parseInt(this.id.replace("entry_", ""));
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
				let tweet;
				if (entry[entry_id][entry_idx.time] === 0) {
					tweet = data.title + "\n(youtu.be/" + video[entry[entry_id][entry_idx.video]][video_idx.id] + ")";
				} else {
					tweet = song[entry[entry_id][entry_idx.song_id]][song_idx.name].trim() + " / " + song[entry[entry_id][entry_idx.song_id]][song_idx.artist] + " @" + data.title + "\n(youtu.be/" + video[entry[entry_id][entry_idx.video]][video_idx.id] + timestamp(entry_id) + ")";
				}
				window.open("https://twitter.com/intent/tweet?text=" + encodeURIComponent(tweet), "_blank");
			});
		});
	}
});

let hits = [];

function auto_search() {
	let e = $("#input").val().normalize("NFKC").toLowerCase().trim();
	if (e === "" || !setting.search_by_song) {
		$("#search_auto").addClass("hidden");
		return;
	}
	let auto_exact = [],
		auto_other = [],
		auto_exact_count = 0,
		auto_other_count = 0;
	// search for series name
	for (let i in series_lookup) {
		for (let j in series_lookup[i]) {
			let f = series_lookup[i][j].indexOf(e);
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
		for (let i = 1; i < song.length; ++i) {
			// skip if same song name
			if (i > 2 && song[i][song_idx.name].trim() === song[i - 1][song_idx.name].trim()) {
				continue;
			}
			let f = song[i][song_idx.reading].indexOf(e);
			switch (f) {
				case  0 : // found, from beginning
					auto_exact[auto_exact_count++] = i;
					break;
				case -1 : // not found
					break;
				default : // found, not from beginning
					auto_other[auto_other_count++] = i;
					break;
			}
			if (auto_exact_count >= auto_display_max) {
				break;
			}
		}
	} else {
		// search for song name
		for (let i = 1; i < song.length; ++i) {
			// skip if same song name
			if (i > 2 && song[i][song_idx.name].trim() === song[i - 1][song_idx.name].trim()) {
				continue;
			}
			let f = song[i][song_idx.name].toLowerCase().indexOf(e);
			// special notation in reading
			if (f === -1) {
				// get reading first space position
				let space_pos = song[i][song_idx.reading].indexOf(" ");
				if (space_pos > 0) {
					//  position of searching string
					if (song[i][song_idx.reading].indexOf(e) > space_pos) {
						// hit
						f = 1;
					}
				}	
			}
			switch (f) {
				case  0 : // found, from beginning
					auto_exact[auto_exact_count++] = i;
					break;
				case -1 : // not found
					break;
				default : // found, not from beginning
					auto_other[auto_other_count++] = i;
					break;
			}
			if (auto_exact_count >= auto_display_max) {
				break;
			}
		}
	}
	// display
	let auto_display_count = 0;
	let new_html = "";
	for (let i in auto_exact) {
		// data being number (song id) or string (series name)
		let auto_reading, auto_display, song_name;
		if (isNaN(parseInt(auto_exact[i]))) {
			// series name
			auto_reading = "";
			auto_display = song_name = auto_exact[i];
		} else {
			// song reading
			let song_reading = song[auto_exact[i]][song_idx.reading];
			auto_reading = bold(song_reading.indexOf(" ") === -1 ? song_reading : song_reading.substring(0, song_reading.indexOf(" ")), e);
			// song name
			song_name = song[auto_exact[i]][song_idx.name];
			auto_display = bold(song_name, e);
		}
		new_html += `<div id="${to_html(song_name)}" class="auto_panel${auto_display_count === 0 ? " auto_first" : ""}"><div class="auto_reading">${auto_reading}</div><div class="auto_display">${auto_display}</div></div>`;
		auto_display_count++;
	}
	for (let i in auto_other) {
		new_html += `<div id="${to_html(song[auto_other[i]][song_idx.name])}" class="auto_panel${(auto_display_count === 0 ? " auto_first" : "")}"><div class="auto_reading"></div><div class="auto_display">${bold(song[auto_other[i]][song_idx.name], e)}</div></div>`;
		
		if (++auto_display_count >= auto_display_max) {
			break;
		}
	}
	$("#search_auto").html(new_html);
	$("#search_auto").toggleClass("hidden", new_html === "");
}

function search() {
	// ignore blank input if search from rep
	if (is_searching_from_rep) {
		update_display();
		return;
	}
	let search_value = $("#input").val().trim();
	if (search_value === loading) {
		return;
	}
	loading = search_value;
	if (search_value === "") {
		// clear current list
		$("#search_display").html("");
		// enable random
		$("#nav_search_random").removeClass("disabled");
		return;
	}
	// not empty input
	// disable random
	if (!setting.random_ignore) {
		$("#nav_search_random").addClass("disabled");
	}
	// replace wchar w/ char
	search_value = search_value.normalize("NFKC").toLowerCase();
	let series_name = "";
	for (let i in series_lookup) {
		for (let j in series_lookup[i]) {
			if (series_lookup[i].includes(search_value)) {
				series_name = i;
				break;
			}
		}
		if (series_name !== "") {
			break;
		}
	}
	// search for series in attr
	let attr_series = 0;
	if (series_name != "") {
		let using_attr = [2, 3, 4, 7];
		for (let i in using_attr) {
			if (attr_idx[using_attr[i]] === series_name) {
				attr_series = using_attr[i];
				break;
			}
		}
	}

	hits = [];
	for (let i = 1; i < song.length; ++i) {
		if (hits.length === 200) {
			break;
		}
		if (setting.search_by_song) {
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
				if (processed_song_name[i].includes(search_value) ||
					song[i][song_idx.reading].toLowerCase().includes(search_value)
				) {
					hits.push(i);
				}
			}
		} else {
			if (song[i][song_idx.artist].toLowerCase().includes(search_value)) {
				hits.push(i);
			}
		}
	}
	$("#nav_share").toggleClass("disabled", setting.search_by_song || hits === 0);
	// sort exact song name to top
	hits.sort(function (a, b) {
		let song_b_name = song[b][song_idx.name].trim().toLowerCase();
		if (song[a][song_idx.name].trim().toLowerCase() === search_value) {
			// exist a record same to input
			return song_b_name === search_value ? 0 : -1;
		} else {
			if (song_b_name === search_value) {
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
	let current_song = -1;
	// record loaded song (for un-hiding song thats no longer loaded)
	let loaded_song = [];
	let loaded_count = displayed = found_entries = 0;
	let new_html = "";
	for (let i = 0; i < hits.length; ++i) {
		// sort according to settings
		let sorted_enrties = [];
		if (setting.search_sort_by_date) {
			sorted_enrties = entry_proc[hits[i]].sort((a, b) => {
				return (setting.search_sort_asd ? a - b : b - a);
			});
		} else {
			sorted_enrties = entry_proc[hits[i]].sort((a, b) => {
				if (entry[a][entry_idx.type] === entry[b][entry_idx.type]) {
					return a - b;
				}
				return (setting.search_sort_asd ? 1 : -1) * (display_order[entry[a][entry_idx.type]] - display_order[entry[b][entry_idx.type]])
			});
		}
		found_entries += sorted_enrties.length;
		for (let j = 0; j < sorted_enrties.length; ++j) {
			let cur_entry = sorted_enrties[j];
			// if private
			if ((!setting.show_hidden) && is_private(cur_entry)) {
				continue;
			}
			// if new song
			if (current_song !== entry[cur_entry][entry_idx.song_id]) {
				new_html += ((current_song !== -1 ? "</div>" : "") + `<div class="song_container">`);
				current_song = entry[cur_entry][entry_idx.song_id];
				loaded_song[loaded_count++] = current_song;
				// if hide the song
				let show = !hide_song.includes(current_song);
				// check song name
				let song_name = song[current_song][song_idx.name].normalize("NFKC");
				let song_name_length = 0;
				for (let k = 0; k < song_name.length; ++k) {
					song_name_length += /[ -~]/.test(song_name.charAt(k)) ? 1 : 2;
				}
				// you know what fuck this shit i will just add exception
				if (song_name === "secret base ~君がくれたもの~" ||
					song_name === "かくしん的☆めたまるふぉ～ぜっ！" ||
					song_name === "ススメ☆オトメ ~jewel parade~" ||
					song_name === "Time after time ～花舞う街で～"
				) {
					song_name_length = 0;
				}
				// case "みくみくにしてあげる♪【してやんよ】"
				if (song_name === "みくみくにしてあげる♪【してやんよ】") {
					song_name = "みくみくにしてあげる♪<br />【してやんよ】";
				}
				if (/([^~]+~+[^~])/g.test(song_name) && song_name_length >= 28) {
					song_name = song_name.substring(0, song_name.search(/~/g)) + "<br />" + song_name.substring(song_name.search(/~/g));
				}
				new_html += `<div class="song_name_container" id="${current_song}"><div class="song_rap"><div class="song_name">${song_name}</div><div class="song_credit${show ? "" : " hidden"}${song[current_song][song_idx.artist].length > 30 ? " long_credit" : ""} song_${current_song}">${song[current_song][song_idx.artist]}</div></div><div class="song_icon_container"><div id="fold_${current_song}" class="song_fold_icon${show ? "" : " closed"}"></div><div id="copy_name_${current_song}" class="song_copy_icon song_${current_song}${show ? "" : " hidden"}"></div></div></div>`;
			}
			let is_mem = entry[cur_entry][entry_idx.note].includes("【メン限");
			let no_note = entry[cur_entry][entry_idx.note] === "" || entry[cur_entry][entry_idx.note] === "【メン限】" || entry[cur_entry][entry_idx.note] === "【メン限アーカイブ】";
			let note = entry[cur_entry][entry_idx.note];
			if (is_mem) {
				note = note.replace(/【メン限アーカイブ】|【メン限】/g, "");
			}
			new_html += `<div class="entry_container singer_8${is_mem ? "m" : ""} song_${current_song}${hide_song.includes(current_song) ? " hidden" : ""}"><a href="https://youtu.be/${video[entry[cur_entry][entry_idx.video]][video_idx.id]}${timestamp(cur_entry)}" target="_blank"><div class="entry_primary"><div class="entry_date">${display_date(video[entry[cur_entry][entry_idx.video]][video_idx.date])}</div><div class="entry_singer">つきみゆこ</div><div class="mem_display">${is_mem ? "メン限" : ""}</div><div class="entry_share" id="entry_${cur_entry}"></div></div>${no_note ? "" : `<div class="entry_note">${note}</div>`}</a></div>`;
			if (++displayed >= 400) {	// hardcoded max_display
				i = 200;
				break;
			}
		}
	}
	// dealing with a blank screen with non-blank input
	// no song found
	if (!hits.length) {
		new_html += `<div class="search_no_result">曲検索結果なし`;
	}
	// only never sang songs are found
	else if (!found_entries) {
		new_html += `<div class="search_no_result">歌記録なし`;
	}
	// only private songs are found / singer deselected
	else if (new_html === "") {
		new_html += `<div class="search_no_result">非表示動画のみ`;
	}
	
	$("#search_display").html(new_html + `</div><div class="general_vertical_space"></div>`);
	// check all hiden songs
	for (let i = 0; i < hide_song.length; ++i) {
		// if song havnt been loaded, remove from hide list
		if (!loaded_song.includes(hide_song[i])) {
			hide_song.splice(i--, 1);
		}
	}
}

function timestamp(id) {
	let e = entry[id][entry_idx.time];
	return e ? "?t=" + e : "";
}
