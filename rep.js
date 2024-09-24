// repertoire section
// attr lookup
const attr_idx = [
	"others",
	"アニソン",
	"ラブライブ",
	"アイマス",
	"マクロス",
	"J-POP",
	"ボカロ",
	"ジブリ",
	"特撮",
	"ロック",
	"歌謡曲",
	"disney"
];

// anisong selection
let rep_anisong = {
	lovelive : [1, 2],
	imas : [1, 3],
	macros : [1, 4],
	other : [1, 1]
};
// genre selection
let rep_genre = {
	jpop : [1, 5],
	voc : [1, 6],
	jib : [1, 7],
	tok : [1, 8],
	rock : [1, 9],
	kay : [1, 10],
	dis : [1, 11],
	other : [1, 0]
};

// display info
var rep_info = {
	attrdata : true,
	date : true
};

// songs no longer have karaoke available
const oke_gone = [
	"ノーザンクロス"
];

let longpress_timer;
let post_longpress_timer;
let is_long_pressing = false;

$(function() {
	{ // repertoire
		// input - submit
		$(document).on("blur", "#rep_input", function() {
			input_focused = false;
			rep_search();
		});
		
		// input::enter -> blur
		$(document).on("keydown", function(e) {
			if (e.keyCode === 13 && current_page === "repertoire") {
				$("#rep_input").blur();
			}
		});
		
		// filter - hide_block
		$(document).on("click", "#filter_display", function() {
			$("#filter_close").toggleClass("closed");
			$("#filter_content").toggleClass("hidden");
		});
		
		// filter - anisong
		$(document).on("click", ".filter_anisong", function() {
			let e = this.id.replace("anisong_", "");
			if (e === "all") {
				$(".filter_anisong .checkbox").toggleClass("selected", !$("#anisong_all .checkbox").hasClass("selected"));
				for (let i in rep_anisong) {
					rep_anisong[i][0] = $("#anisong_all .checkbox").hasClass("selected") ? 1 : 0;
				}
			} else {
				$(`#${this.id} .checkbox`).toggleClass("selected");
				rep_anisong[e][0] ^= 1;
				if (!$(`#${this.id} .checkbox`).hasClass("selected")) {
					$("#anisong_all .checkbox").removeClass("selected");
				} else {
					for (let i in rep_anisong) {
						if (!rep_anisong[i][0]) {
							rep_search();
							return;
						}
					}
					$("#anisong_all .checkbox").addClass("selected");
				}
			}
			rep_search();
		});
		
		// filter - genre
		$(document).on("click", ".filter_genre", function() {
			let e = this.id.replace("genre_", "");
			const all = "#genre_all .checkbox";
			if (e === "all") {
				$(".filter_genre .checkbox").toggleClass("selected", !$(all).hasClass("selected"));
				for (let i in rep_genre) {
					rep_genre[i][0] = $(all).hasClass("selected") ? 1 : 0;
				}
			} else {
				$(`#${this.id} .checkbox`).toggleClass("selected");
				rep_genre[e][0] ^= 1;
				if (!$(`#${this.id} .checkbox`).hasClass("selected")) {
					$(all).removeClass("selected");
				} else {
					for (let i in rep_genre) {
						if (!rep_genre[i][0]) {
							rep_search();
							return;
						}
					}
					$(all).addClass("selected");
				}
			}
			rep_search();
		});
		
		// filter - sort - sort options
		$(document).on("click", ".filter_sort", function() {
			let e = this.id.replace("sort_", "");
			// check if clicking on the same item
			if (settings.rep_sort_method.value === e) {
				return;
			}
			$(".filter_sort .radio").removeClass("selected");
			$(`#${this.id} .radio`).addClass("selected");
			settings.rep_sort_method.value = e;
			update_rep_sort_display();
			rep_display();
		});
		
		// filter - sort - asd/des
		$(document).on("click", "#filter_asd", function() {
			// swap sort way
			settings.rep_sort_asd.value ^= 1;
			// update text
			update_rep_sort_display();
			rep_display();
		});
		
		// filter - display items
		$(document).on("click", ".filter_display", function() {
			rep_info[this.id.replace("display_", "")] ^= 1;
			$(`#${this.id} .checkbox`).toggleClass("selected");
			// update
			rep_display();
		});
		
		// filter - if display selecetd first
		$(document).on("click", "#sort_selected", function() {
			settings.rep_selected_first.value ^= 1;
			$("#sort_selected .checkbox").toggleClass("selected");
			// update
			rep_display();
		});
		
		// display - select
		$(document).on("click", ".rep_song_container", function() {
			if (is_long_pressing) {
				return;
			}
			let song_id = parseInt(this.id.replace("rep_song_", ""));
			if ($(this).hasClass("selected")) {
				rep_selected.splice(rep_selected.indexOf(song_id), 1);
				if (!rep_selected.length) {
					$("#nav_share").addClass("disabled");
				}
			} else {
				rep_selected.push(song_id);
				$("#nav_share").removeClass("disabled");
			}
			$(this).toggleClass("selected");
		});
		
		// display - long press copy
		$(document).on("mousedown touchstart", ".rep_song_container", function() {
			if (!settings.rep_long_press_copy.value) {
				return;
			}
			let e = parseInt(this.id.replace(/(rep_song_)/, ""));
			longpress_timer = setTimeout(function() {
				navigator.clipboard.writeText(song[e][song_idx.name]);
				copy_popup();
				is_long_pressing = true;
				post_longpress_timer = setTimeout(function() {
					is_long_pressing = false;
					clearTimeout(post_longpress_timer);
				}, settings.rep_long_press_time.value - 100);
			}, settings.rep_long_press_time.value);
		});
		
		// display - long press copy (disabling)
		$(document).on("mouseup mouseleft touchend touchmove", ".rep_song_container", function() {
			clearTimeout(longpress_timer);
		});
		
		// share
		$(document).on("click", "#nav_share", function() {
			if (current_page !== "repertoire" || $(this).hasClass("disabled") || prevent_menu_popup) {
				return;
			}
			// disable menu, other buttons
			prevent_menu_popup = true;
			$(document.body).toggleClass("no_scroll");
			$("#rep_share").removeClass("hidden");
			$("#popup_container").removeClass("hidden");
		});

		// share - search
		$(document).on("click", "#rep_share_search", function() {
			// close popup
			$("#popup_container").click();
			is_searching_from_rep = 1;
			jump2page("search");
			hits = copy_of(rep_selected);
			// set loading and input display to special value
			loading = "!bulk_load_flag";
			$("#input").val("");
			update_display(1);
		})

		// share - url
		$(document).on("click", "#rep_share_link", function() {
			// close popup
			$("#popup_container").click();
			// generate url w/ first song
			let out_url = "szk31.github.io/yuco/?search=" + song_lookup.indexOf(rep_selected[0]);
			// then add 2nd to last song
			for (let i = 1; i < rep_selected.length; ++i) {
				out_url += ("," + song_lookup.indexOf(rep_selected[i]));
			}
			navigator.clipboard.writeText(out_url);
			copy_popup();
		})
		
		// share - tweet
		$(document).on("click", "#rep_share_tweet", function() {
			$("#rep_share").addClass("hidden");
			$("#rep_tweet").removeClass("hidden");
		});

		$(document).on("click", ".rep_tweet_a", function() {
			if (settings.rep_show_artist.value == (this.id === "rep_tweet_ya")) {
				return;
			}
			settings.rep_show_artist.value ^= 1;
			$(".rep_tweet_a").toggleClass("selected");
			update_setting("rep_show_artist");
		});

		$(document).on("click", ".rep_tweet_submit", function() {
			let tweet = "";
			for (let i in rep_selected) {
				tweet += `${song[rep_selected[i]][song_idx.name]}${settings.rep_show_artist.value ? (" / " + song[rep_selected[i]][song_idx.artist]) : ""}\n`;
			}
			let e = this.id.replace("rep_tweet_", "");
			switch (e) {
				case "t":
					navigator.clipboard.writeText(tweet);
					copy_popup();
					break;
				default :
					window.open("https://twitter.com/intent/tweet?text=" + encodeURIComponent(tweet + "#つきみゆこ"), "_blank");
			}
			// close pop up
			$("#popup_container").click();
		});
	}
});

let rep_hits = [];
let rep_hits_solo = [];
let rep_hits_count = 0;

let rep_selected = [];
let rep_input_memory = "";

function rep_search(force = false) {
	// check if input is empty
	let input_value = $("#rep_input").val().normalize("NFKC").trim();
	// check if input has been updated
	if (input_value !== rep_input_memory) {
		rep_input_memory = input_value;
	} else if (!force && input_value) {
		// if input didnt changed and is not blank
		return;
	}
	rep_hits = [];
	if (input_value) {
		// returning search result by input
		for (let i = 1; i < song.length; ++i) {
			if (!entry_proc[i].length) {
				continue;
			}
			if (processed_song_name[i].includes(input_value) || song[i][song_idx.reading].includes(input_value)) {
				rep_hits.push(i);
			}
		}
		rep_display();
		return;
	}
	// get mask
	let mask = inv_mask = 0;
	// combine both mask_object and create binary mask
	Object.values(rep_anisong).concat(Object.values(rep_genre)).forEach(x => mask += x[0] << x[1]);
	Object.values(rep_anisong).forEach(x => inv_mask += x[0] << x[1]);
	inv_mask = ~inv_mask & 28;	// 28: 0b11100, the only 3 bits used in anisong filter 
	// search
	for (i in song) {
		if (song[i][song_idx.attr] & mask &&	// satisflies filter mask
		  !(song[i][song_idx.attr] & inv_mask)	// does not satisfly inverse filter mask
		) {
			rep_hits.push(i);
		}
	}
	rep_display();
}

let rep_display_inter;

function rep_display() {
	$("#rep_count").html(`hit${rep_hits.length > 1 ? "s" : ""}: ${rep_hits.length}`);
	if (settings.rep_selected_first.value) {
		// remove selected item in main array
		rep_hits = rep_hits.filter(val => !rep_selected.includes(val));
	}
	if (!rep_hits.length) {
		$("#rep_display").html(`<div class="search_no_result">検索結果なし</div>`);
		return;
	}
	$("#rep_display").html("");
	// sort record
	switch (settings.rep_sort_method.value) {
		case "50" : // default, do nothing
			rep_hits.sort((a, b) => (settings.rep_sort_asd.value ? 1 : -1) * (a - b));
			break;
		case "count" :
			// sang entry count
			// create a lookup array for all songs for the current member selection
			let entry_count = [];
			rep_hits.forEach(x => entry_count[x] = entry_proc[x].length);
			rep_hits.sort((a, b) => (settings.rep_sort_asd.value ? 1 : -1) * (entry_count[b] - entry_count[a]));
			break;
		case "date" : {
			// sort with last sang date
			let date_lookup = [];
			for (let i = 1; i < song.length; ++i) {
				let dummy = get_last_sang(i);
				date_lookup[i] = dummy ? dummy.getTime() : 0;
			}
			rep_hits.sort((a, b) => (settings.rep_sort_asd.value ? 1 : -1) * (date_lookup[b] - date_lookup[a]));
			break;
		}
		case "release" : {
			// release date of song
			let date_lookup = [];
			rep_hits.forEach(val => rls_lookup[val] = to8601(song[val][song_idx.release]).getTime());
			rep_hits.sort((a, b) => (settings.rep_sort_asd.value ? 1 : -1) * (rls_lookup[b] - rls_lookup[a]));
			break;
		}
	}
	if (settings.rep_selected_first.value) {
		// add selected back into main array
		rep_hits = rep_selected.concat(rep_hits);
	}
	// actual displaying
	rep_loading_progress = 0;
	rep_display_loop();
	clearInterval(rep_display_inter);
	rep_display_inter = setInterval(rep_display_loop, 10);
}

let rep_loading_progress = 0;

function rep_display_loop() {
	let load_end = Math.min(rep_loading_progress + 20, rep_hits.length);
	for (let i = rep_loading_progress; i < load_end; ++i) {
		let sang_count = get_sang_count(rep_hits[i]);
		let last_sang = get_last_sang(rep_hits[i]);
		let delta_last = last_sang === 0 ? -1 : get_date_different(last_sang);
		let temp_html = "";
		if (rep_info["attrdata"]) {
			var attr_count = {gui : 0, oke : 0};
			for (var j in entry_proc[rep_hits[i]]) {
				// only get attr if the entry satisfy selected singer
				attr_count[get_attr(entry_proc[rep_hits[i]][j])]++;
			}
			temp_html = `<div class="rep_extra_info grid_block-2"><div class="row-1 col-1">${attr_count.gui > 0 ? "弾語" : "　　　"}</div><div class="row-1 col-2">${attr_count.oke > 0 ? "音源" : "　　"}</div></div>`;
		}
		let new_html = `<div class="rep_song_container${rep_selected.includes(rep_hits[i]) ? " selected" : ""}${sang_count[0] && (sang_count[0] === sang_count[1]) ? " rep_mem_only" : ""}" id="rep_song_${rep_hits[i]}"><div class="rep_song_row1"><div class="rep_song_title">${song[rep_hits[i]][song_idx.name]} / ${song[rep_hits[i]][song_idx.artist]}</div><div class="rep_song_nooke">${oke_gone.includes(song[rep_hits[i]][song_idx.name]) ? "オケ消滅" : ""}</div></div><div class="rep_song_info grid_block-4"><div>${delta_last === 0 ? "今日" : delta_last === -1 ? "---" : `${delta_last}日前`}</div><div>${sang_count[0]}回${sang_count[1] > 0 ? (sang_count[0] === sang_count[1] ? " (メン限のみ)" : ` (${sang_count[1]}回メン限)`) : ""}</div><div>${rep_info["date"] ? "(" + last_sang.toISOString().slice(0, 10) + ")" : ""}</div>${temp_html}</div></div>`;
		$("#rep_display").append(new_html);
	}
	// call itself again if not finished
	rep_loading_progress += 20;
	if (rep_loading_progress >= rep_hits.length) {
		clearInterval(rep_display_inter);
		$("#rep_display").append("<div class=\"general_vertical_space\"></div>");
	}
}

function update_rep_sort_display() {
	let temp = "";
	switch (settings.rep_sort_method.value) {
		case "50" : 
			temp = settings.rep_sort_asd.value ? "正順 (⇌逆順)" : "逆順 (⇌正順)";
			break;
		case "count" : 
			temp = settings.rep_sort_asd.value ? "多い順 (⇌少ない順)" : "少ない順 (⇌多い順)";
			break;
		case "date" : 
		case "release" : 
			temp = settings.rep_sort_asd.value ? "新しい順 (⇌古い順)" : "古い順 (⇌新しい順)";
			break;
		default : 
			// error
			return 1;
	}
	$("#filter_asd div:nth-child(2)").html(temp);
}