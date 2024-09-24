// stores whats currently looking up
let search_memory = "";

// store song id (song[id]) of folded up songs
let hide_song = new Array();

// max display boxes of autocomplete
let auto_display_max;

// flag : is loading songs from rep selected
let is_searching_from_rep = false;

let input_focused = false;

$(function() {
	// nav - random
	let random_last;
	$(document).on("click", "#nav_search_random", function() {
		if($(this).hasClass("disabled") && !settings.ser_rand_req_empty.value || prevent_menu_popup) {
			return;
		}
		// check if the song has any visibile record
		let random_song, found = 0;
		while (!found) {
			random_song = 1 + Math.floor(Math.random() * song.length);
			if (random_song === random_last) {
				continue;
			}
			for (let i in entry_proc[random_song]) {
				if (!settings.ser_show_private.value && is_private(entry_proc[random_song][i])) {
					continue;
				}
				found++;
				break;
			}
		}
		random_last = random_song;
		$("#search_input").val(song[random_song][song_idx.name]);
		is_searching_from_rep = 0;
		search();
	});
	
	{ // search
		// search - input - autocomplete
		$(document).on("input", "#search_input", function() {
			auto_search();
		});
		
		// search - input - autocomplete - selection
		$(document).on("mousedown", ".auto_panel", function() {
			$("#search_input").val(to_non_html(this.id));
			// input on blur fires after this so no need to run search here
		});

		let auto_pointer = 0;	// will be using for nth-child, 0: not using; 1+: pointer pos
		// search - input - auto-complete - arrow keys
		$(document).on("keydown", function(e) {
			// 38: up-arrow, 40: down-arrow
			let dir = Object({38 : -1, 40 : 1})[e.keyCode];
			if ($("#search_auto").hasClass("hidden") ||		// not in search
				dir === undefined ||						// wrong key
				auto_input_memory !== get_search_input() ||	// still in ime
				(!auto_pointer && dir === -1)				// pressing up first
			) {
				return;
			}
			// such that 1 <= pointer_position <= max display
			auto_pointer = Math.max(1, Math.min(auto_display_max, auto_display_count, auto_pointer + dir));
			$("#search_auto>div").removeClass("selected");
			$(`#search_auto>div:nth-child(${auto_pointer})`).addClass("selected");
		});

		// search - input - submit
		$(document).on("blur", "#search_input", function() {
			$("#search_auto").addClass("hidden");
			input_focused = false;
			is_searching_from_rep ? is_searching_from_rep = 0 : $("#nav_share").toggleClass("disabled", !is_searching_from_rep);
			search();
		});
		
		// search - input::enter -> blur
		$(document).on("keydown", function(e) {
			if (e.keyCode === 13 && current_page === "search") {
				if (auto_pointer) {
					auto_pointer = 0;
					const selected = $(".auto_panel.selected")[0].id;
					$("#search_input").val(selected);
					if (settings.pdt_copy_on_select.value) {
						navigator.clipboard.writeText(selected);
						copy_popup();
					}
				}
				$("#search_input").blur();
			}
		});
		
		// search - input::focus -> reset, auto complete
		$(document).on("click", "#search_input, #rep_input", function() {
			if (input_focused) {
				return;
			}
			input_focused = true;
			if (settings.ser_select_input.value && this.id === "search_input" ||
				settings.rep_select_input.value && this.id === "rep_input") {
				let pass = this;
				setTimeout(function() {
					pass.setSelectionRange(0, $(pass).val().length);
				}, 0);
			}
			else if (search_memory === "!bulk_load_flag" && this.id === "search_input") {
				$(this).val("");
				$("#nav_search_random").removeClass("disabled");
				$("#nav_share").addClass("disabled");
			}
			if (this.id === "search_input") {
				auto_search();
			}
		});
		
		// search - collapse option menu
		$(document).on("click", "#ser_opt_button", function() {
			$(this).toggleClass("opened");
			$("#ser_opt_container").toggleClass("hidden");
		});
		
		// search - options - method
		$(document).on("click", ".ser_opt_gp1", function() {
			let new_setting = this.id === "ser_opt_songname";
			if (new_setting === settings.ser_via_song_name.value) {
				// nothing changed
				return;
			}
			settings.ser_via_song_name.value = new_setting;
			$(".ser_opt_gp1>.radio").toggleClass("selected");
			$("#search_input").val("");
			$("#search_input").attr("placeholder", settings.ser_via_song_name.value ? "曲名/読みで検索" : "アーティスト名で検索");
			$("#search_display").html("");
			search_memory = "";
			// disable / renable random
			$("#nav_search_random").toggleClass("disabled", !settings.ser_via_song_name.value);
		});
		
		function update_ser_asd() {
			$("#ser_opt_asd>div:nth-child(2)").html(new Array(
				"古い順&nbsp;(⇌新しい順)", "新しい順&nbsp;(⇌古い順)",
				"正順&nbsp;(⇌逆順)", "逆順&nbsp;(⇌正順)"
			)[(settings.ser_sort_by_date.value ? 0 : 2) + (settings.ser_sort_asd.value ? 0 : 1)]);
		}

		// search - options - sort - method
		$(document).on("click", ".ser_opt_gp2", function() {
			let new_setting = this.id === "ser_opt_date";
			if (new_setting === settings.ser_sort_by_date.value) {
				// nothing changed
				return;
			}
			settings.ser_sort_by_date.value = new_setting;
			$(".ser_opt_gp2>.radio").toggleClass("selected");
			update_ser_asd();
			update_display();
		});
		
		// search - options - sort - asd/des
		$(document).on("click", "#ser_opt_asd", function() {
			settings.ser_sort_asd.value ^= 1;
			update_ser_asd();
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
				if (!data.title) {
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
let auto_input_memory = "";

function auto_search() {
	let input = get_search_input();
	if (auto_input_memory === input && !settings.pdt_on_change_only.value) {
		return;
	}
	auto_input_memory = input;
	if (!input || !settings.ser_via_song_name.value) {
		$("#search_auto").addClass("hidden");
		return;
	}
	let auto_exact = [],
		auto_other = [];
	
	function add_song(id, found_pos) {
		if (!found_pos) {			// from beginning
			auto_exact.push(id);
		}
		else if (found_pos > 0) {	// exist but not from beginning
			auto_other.push(id);
		}
	}

	// search for series name (allows multiple)
	for (let i in series_lookup) {
		if (series_lookup[i].includes(input)) {
			// if string exist in series variations
			auto_exact.push(i);
		}
	}
	// if input not consist of only hiragana, "ー" or "ヴ"
	const auto_thru_name = /[^\u3040-\u309F\u30FC\u30F4]/.test(input);
	const roman_kana = r2k(input);
	for (let i = 1; i < song.length && auto_exact.length < auto_display_max; ++i) {
		// skip if same song name
		if (auto_skips.includes(i)) {
			continue;
		}
		if (!auto_thru_name) {
			add_song(i, song[i][song_idx.reading].indexOf(input));
			continue;
		}
		let name_pos = processed_song_name[i].indexOf(input);
		// check for special notation in reading
		if (name_pos === -1 && song[i][song_idx.reading].includes(" ") && song[i][song_idx.reading].includes(input)) {
			name_pos = 1;
		}
		if (name_pos === -1 && roman_kana) {
			name_pos = song[i][song_idx.reading].indexOf(roman_kana);
		}
		add_song(i, name_pos);
	}
	// display
	auto_display_count = 0;
	let new_html = "";
	for (let i in auto_exact) {
		// data being number (song id) or string (series name)
		let auto_reading =  auto_display =  song_name = "";
		if (typeof auto_exact[i] === "string") {
			// series name
			auto_display = song_name = auto_exact[i];
		} else {
			auto_reading = bold(song[auto_exact[i]][song_idx.reading].split(" ")[0], input);
			song_name = song[auto_exact[i]][song_idx.name];
			auto_display = bold(song_name, input);
		}
		new_html += `<div id="${to_html(song_name)}" class="auto_panel${auto_display_count++ === 0 ? " auto_first" : ""}"><div class="auto_reading${!auto_reading || !settings.pdt_reading.value ? " auto_no_reading" : ""}">${auto_reading}</div><div class="auto_display">${auto_display}</div></div>`;
	}
	for (let i in auto_other) {
		if (auto_display_count++ >= auto_display_max) {
			break;
		}
		new_html += `<div id="${to_html(song[auto_other[i]][song_idx.name])}" class="auto_panel${(auto_display_count === 0 ? " auto_first" : "")}"><div class="auto_reading${settings.pdt_reading.value ? "" : " auto_no_reading"}">${song[auto_other[i]][song_idx.reading].split(" ")[0]}</div><div class="auto_display">${bold(song[auto_other[i]][song_idx.name], input)}</div></div>`;
	}
	$("#search_auto").html(new_html);
	$("#search_auto").toggleClass("hidden", !new_html);
	auto_pointer = 0;
	$("#search_auto>div").removeClass("selected");
}

function search() {
	// ignore blank input if search from rep
	if (is_searching_from_rep) {
		update_display();
		return;
	}
	let search_value = get_search_input();
	if (search_value === search_memory) {
		return;
	}
	search_memory = search_value;
	if (search_value === "") {
		// clear current list
		$("#search_display").html("");
		// enable random
		$("#nav_search_random").removeClass("disabled");
		return;
	}
	// not empty input
	$("#nav_search_random").toggleClass("disabled", !settings.ser_rand_req_empty.value);
	
	// series
	const series_name = search_value in series_lookup ? search_value : "",
		  attr_series = attr_idx.includes(search_value) ? attr_idx.indexOf(search_value) : 0;

	hits = [];
	let exact_counter = 0;
	if (series_name) {	// get song with series
		song.forEach((val, i) => (i ? ((attr_series ? val[song_idx.attr] & (1 << attr_series) : val[song_idx.reading].includes(search_value)) ? hits.push(i) : null) : null));
	} else {			// get song by search
		const max_hit = 200;
		const roman_kana = r2k(search_value);
		for (var i = 1; i < song.length && hits.length < max_hit; ++i) {
			if (settings.ser_via_song_name.value ? 
				processed_song_name[i].includes(search_value) ||
				song[i][song_idx.reading].toLowerCase().includes(search_value) ||
				song[i][song_idx.reading].includes(roman_kana) :
				song[i][song_idx.artist].toLowerCase().includes(search_value)
			) {
				// put in front if song name is exactly the same as searched value
				processed_song_name[i] === search_value ? hits.splice(exact_counter++, 0, i) : hits.push(i);
			}
		}
	}
	update_display();
}

function update_display(force = false) {
	// ignore blank input if search from rep
	force |= is_searching_from_rep;
	
	$("#search_auto").addClass("hidden");
	if (search_memory === "" && !force) {
		return;
	}
	let current_song = -1;
	// record loaded song (for un-hiding song thats no longer loaded)
	let loaded_song = [];
	let displayed = found_entries = 0;
	let new_html = "";
	for (let i = 0; i < hits.length && i <= 200; ++i) {
		// sort according to settings
		let sorted_enrties = [];
		if (settings.ser_sort_by_date.value) {
			sorted_enrties = entry_proc[hits[i]].sort((a, b) => {
				return (settings.ser_sort_asd.value ? a - b : b - a);
			});
		} else {
			sorted_enrties = entry_proc[hits[i]].sort((a, b) => {
				if (entry[a][entry_idx.type] === entry[b][entry_idx.type]) {
					return a - b;
				}
				return (settings.ser_sort_asd.value ? 1 : -1) * (display_order[entry[a][entry_idx.type]] - display_order[entry[b][entry_idx.type]])
			});
		}
		found_entries += sorted_enrties.length;
		for (let j = 0; j < sorted_enrties.length; ++j) {
			let cur_entry = sorted_enrties[j];
			// if private
			if ((!settings.ser_show_private.value) && is_private(cur_entry)) {
				continue;
			}
			// if new song
			if (current_song !== entry[cur_entry][entry_idx.song_id]) {
				new_html += ((current_song !== -1 ? "</div>" : "") + `<div class="song_container">`);
				current_song = entry[cur_entry][entry_idx.song_id];
				loaded_song.push(current_song);
				// if hide the song
				let show = !hide_song.includes(current_song);
				// check song name
				let song_name = song[current_song][song_idx.name].normalize("NFKC");
				let song_name_length = 0;
				for (let k = 0; k < song_name.length; ++k) {
					song_name_length += /[ -~]/.test(song_name.charAt(k)) ? 1 : 2;
				}
				// you know what fuck this shit i will just add exception
				if (["secret base ~君がくれたもの~",
					"かくしん的☆めたまるふぉ～ぜっ！",
					"ススメ☆オトメ ~jewel parade~",
					"Time after time ～花舞う街で～"
				   ].includes(song_name)
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

function get_search_input() {
	return $("#search_input").val().normalize("NFKC").toLowerCase().trim();
}