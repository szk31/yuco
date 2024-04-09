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
		$(document).on("click", "#filter_title", function() {
			$("#filter_close").toggleClass("closed");
			$("#filter_content").toggleClass("hidden");
		});
		
		// filter - entry - attr
		$(document).on("click", ".filter_entry_attr_item", function() {
			let e = this.id.replace(/(attr_container_)/, "");
			if (e === "all") {
				// if selecting all
				// check if it is previously selected
				$(".attr_checkbox").toggleClass("selected", !$("#attr_" + e).hasClass("selected"));
				for (let i in rep_attr) {
					rep_attr[i] = $("#attr_" + e).hasClass("selected") ? 1 : 0;
				}
			} else {
				$("#attr_" + e).toggleClass("selected");
				rep_attr[e] ^= 1;
				if (!$("#attr_" + e).hasClass("selected")) {
					$("#attr_all").removeClass("selected");
				} else {
					for (let i in rep_attr) {
						if (!rep_attr[i]) {
							rep_search();
							return;
						}
					}
					$("#attr_all").addClass("selected");
				}
			}
			rep_search();
		});
		
		// filter - genre - anisong
		$(document).on("click", ".filter_genre_anisong_item", function() {
			let e = this.id.replace(/(genre_container_anisong_)/, "");
			if (e === "all") {
				$(".genre_anisong_checkbox").toggleClass("selected", !$("#anisong_all").hasClass("selected"));
				for (let i in rep_anisong) {
					rep_anisong[i][0] = $("#anisong_all").hasClass("selected") ? 1 : 0;
				}
			} else {
				$("#anisong_" + e).toggleClass("selected");
				rep_anisong[e][0] ^= 1;
				if (!$("#anisong_" + e).hasClass("selected")) {
					$("#anisong_all").removeClass("selected");
				} else {
					for (let i in rep_anisong) {
						if (!rep_anisong[i][0]) {
							rep_search();
							return;
						}
					}
					$("#anisong_all").addClass("selected");
				}
			}
			rep_search();
		});
		
		// filter - genre - general
		$(document).on("click", ".filter_genre_general_item", function() {
			let e = this.id.replace(/(genre_container_general_)/, "");
			if (e === "all") {
				$(".genre_general_checkbox").toggleClass("selected", !$("#general_all").hasClass("selected"));
				for (let i in rep_genre) {
					rep_genre[i][0] = $("#general_all").hasClass("selected") ? 1 : 0;
				}
			} else {
				$("#general_" + e).toggleClass("selected");
				rep_genre[e][0] ^= 1;
				if (!$("#general_" + e).hasClass("selected")) {
					$("#general_all").removeClass("selected");
				} else {
					for (let i in rep_genre) {
						if (!rep_genre[i][0]) {
							rep_search();
							return;
						}
					}
					$("#general_all").addClass("selected");
				}
			}
			rep_search();
		});
		
		// filter - sort - sort options
		$(document).on("click", ".filter_sort_item", function() {
			let e = this.id.replace(/(sort_container_)/, "");
			// check if clicking on the same item
			if (setting.rep_sort === e) {
				return;
			}
			$(".sort_checkbox").removeClass("selected");
			$("#sort_" + e).addClass("selected");
			setting.rep_sort = e;
			update_rep_sort_display();
			rep_display();
		});
		
		// filter - sort - asd/des
		$(document).on("click", ".filter_sort2_item", function() {
			// swap sort way
			setting.rep_sort_asd ^= 1;
			// update text
			update_rep_sort_display();
			rep_display();
		});
		
		// filter - if display selecetd first
		$(document).on("click", ".filter_sort3_item", function() {
			setting.rep_selected_first ^= 1;
			$(".sort3_checkbox").toggleClass("selected", setting.rep_selected_first);
			// update
			rep_display();
		});
		
		// filter - display
		$(document).on("click", ".filter_display_item", function() {
			var e = $(this).attr("id").replace(/(display_container_)/, "");
			$("#display_" + e).toggleClass("selected");
			rep_info[e] ^= 1;
			rep_display();
		});
		
		// display - select
		$(document).on("click", ".rep_song_container", function() {
			if (is_long_pressing) {
				return;
			}
			let e = parseInt(this.id.replace(/(rep_song_)/, ""));
			if ($(this).hasClass("selected")) {
				rep_selected.splice(rep_selected.indexOf(e), 1);
				if (rep_selected.length === 0) {
					$("#nav_share").addClass("disabled");
					$("#nav_bulk_search").addClass("disabled");
				}
			} else {
				rep_selected.push(e);
				$("#nav_share").removeClass("disabled");
				$("#nav_bulk_search").removeClass("disabled");
			}
			$(this).toggleClass("selected");
		});
		
		// display - long press copy
		$(document).on("mousedown touchstart", ".rep_song_container", function() {
			if (!setting.longPress_copy) {
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
				}, setting.longPress_time - 100);
			}, setting.longPress_time);
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
			if (setting.rep_show_artist == (this.id === "rep_tweet_ya")) {
				return;
			}
			setting.rep_show_artist ^= 1;
			$(".rep_tweet_a").toggleClass("selected");
			ls("pcsl_s_rep_artist", setting.rep_show_artist ? 1 : 0);
		});

		$(document).on("click", ".rep_tweet_submit", function() {
			let tweet = "";
			for (let i in rep_selected) {
				tweet += `${song[rep_selected[i]][song_idx.name]}${setting.rep_show_artist ? (" / " + song[rep_selected[i]][song_idx.artist]) : ""}\n`;
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
	} else if (!force && input_value !== "") {
		// if input didnt changed and is not blank
		return;
	}
	if (rep_input_memory !== "") {
		rep_hits = [];
		rep_hits_count = 0;
		// returning search result by input
		for (let i = 1; i < song.length; ++i) {
			if (entry_proc[i].length === 0) {
				continue;
			}
			if (processed_song_name[i].search(input_value.toLowerCase()) !== -1 ||
				song[i][song_idx.reading].search(input_value) !== -1
				) {
				rep_hits[rep_hits_count++] = i;
			}
		}
		rep_display();
		return;
	}
	// get mask
	let mask = 0;
	rep_hits = [];
	rep_hits_count = 0;
	for (let i in rep_anisong) {
		mask += rep_anisong[i][0] << rep_anisong[i][1];
	}
	for (let i in rep_genre) {
		mask += rep_genre[i][0] << rep_genre[i][1];
	}
	// remove flag
	let inv_mask = 0;
	for (let i in rep_anisong) {
		if (i === "other") {
			continue;
		}
		inv_mask += (1 - rep_anisong[i][0]) << rep_anisong[i][1];
	}
	// search
	for (let i = 0; i < song.length; ++i) {
		if (song[i][song_idx.attr] & mask) {
			if (inv_mask) {
				// remove song thats deselected
				if (song[i][song_idx.attr] & inv_mask) {
					continue;
				}
			}
			rep_hits[rep_hits_count++] = i;
		}
	}
	rep_display();
}

let rep_display_inter;

function rep_display() {
	if (setting.rep_selected_first) {
		// remove selected item in main array
		for (let i in rep_selected) {
			if (rep_hits.indexOf(rep_selected[i]) === -1) {
				continue;
			}
			rep_hits.splice(rep_hits.indexOf(rep_selected[i]), 1);
		}
	}

	// get member
	$("#rep_display").html("");
	// sort record
	switch (setting.rep_sort) {
		case "50" :
			// default, do nothing
			rep_hits.sort((a, b) => {
				return a - b;
			});
			if (!setting.rep_sort_asd) {
				rep_hits.reverse();
			}
			break;
		case "count" :
			// sang entry count
			// create a lookup array for all songs for the current member selection
			let entry_count = [];
			for (let i = 1; i < song.length; ++i) {
				entry_count[i] = entry_proc[i].length;
			}
			rep_hits.sort((a, b) => {
				return (setting.rep_sort_asd ? 1 : -1) * (entry_count[b] - entry_count[a]);
			});
			break;
		case "date" : {
			// sort with last sang date
			let date_lookup = [];
			for (let i = 1; i < song.length; ++i) {
				let dummy = get_last_sang(i);
				date_lookup[i] = dummy ? dummy.getTime() : 0;
			}
			rep_hits.sort((a, b) => {
				return (setting.rep_sort_asd ? 1 : -1) * (date_lookup[b] - date_lookup[a]);
			});
			break;
		}
		case "release" : {
			// release date of song
			let date_lookup = [];
			for (let i = 1; i < song.length; ++i) {
				date_lookup[i] = to8601(song[i][song_idx.release]).getTime();
			}
			rep_hits.sort((a, b) => {
				return (setting.rep_sort_asd ? 1 : -1) * (date_lookup[b] - date_lookup[a]);
			});
			break;
		}
		default : 
			// anything else is error
			console.log("rep_sort of type \"" + setting.rep_sort + "\" not found");
			return;
	}
	if (setting.rep_selected_first) {
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
		// sang count
		let sang_count = get_sang_count(rep_hits[i]);
		// last sang
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
	switch (setting.rep_sort) {
		case "50" : 
			temp = setting.rep_sort_asd ? "正順 (⇌逆順)" : "逆順 (⇌正順)";
			break;
		case "count" : 
			temp = setting.rep_sort_asd ? "多い順 (⇌少ない順)" : "少ない順 (⇌多い順)";
			break;
		case "date" : 
		case "release" : 
			temp = setting.rep_sort_asd ? "新しい順 (⇌古い順)" : "古い順 (⇌新しい順)";
			break;
		default : 
			// error
			return 1;
	}
	$("#sort_name_sort").html(temp);
}