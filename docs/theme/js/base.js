function getSearchTerm() {
	var sPageURL = window.location.search.substring(1);
	var sURLVariables = sPageURL.split('&');
	for (var i = 0; i < sURLVariables.length; i++) {
		var sParameterName = sURLVariables[i].split('=');
		if (sParameterName[0] == 'q') {
			return sParameterName[1];
		}
	}
}

window.addEventListener("load", function() {
	const search_term = getSearchTerm()
	const searchModal = document.getElementById("mkdocs_search_modal")
	const keyboardModal = document.getElementById("mkdocs_keyboard_modal")

	if (search_term) {
		showSearchModal()
		searchModal.querySelector("input").value = search_term
		searchModal.querySelector("input").select()
	}

	const searchBtn = document.getElementById("searchBtn")
	if (searchBtn != null) {
		console.log("No search btn found")
		searchBtn.addEventListener("click", showSearchModal)
	}

	function showSearchModal() {
		if (searchModal != null) {
			searchModal.classList.add("show")
			searchModal.querySelector("input").focus()
			searchModal.querySelector("input").select()
			window.doSearch()
		}
	}

	// Close search modal when result is selected
	// The links get added later so listen to parent
	if (searchModal != null) {
		searchModal.addEventListener("click", (event) => {
			if (event.target.tagName === 'A') {
				searchModal.classList.remove("show")
			}
		})
	}

	// Keyboard navigation
	document.addEventListener("keydown", e => {
		if (e.target.matches("input")) {
			if (e.key === "Escape") {
				if (e.target.value !== "") {
					e.preventDefault()
					e.target.value = ""
					return true
				}
			} else {
				return true
			}
		}

		switch (e.key) {
			case "Escape":
				document.querySelector(".modal.show").classList.remove("show")
				break
			case "n":
				click(document.querySelector("a[rel='next']"))
				break
			case "p":
				click(document.querySelector("a[rel='prev']"))
				break
			case "/":
				e.preventDefault();
				keyboardModal.classList.remove("show")
				showSearchModal();
				break
			case "?":
				e.preventDefault()
				if (searchModal != null) {
					searchModal.classList.remove("show")
				}
				keyboardModal.classList.add("show")
				break
			default: break
		}
	})

	for (const el of document.getElementsByTagName("table")) {
		el.classList.add("table", "table-striped", "table-hover")
	}

})

!(() => { // Scroll spy to auto-highlight current item in TOC.
	document.addEventListener("scroll", onDocumentScroll);

	let last_known_scroll_position = 0;
	let ticking = false;

	function scrollSpy(scroll_pos) {
		const activeHeaders = {};
		for (const h of document.body.querySelectorAll("h1, h2")) {
			if (h.offsetTop > last_known_scroll_position) {
				break
			}
			activeHeaders[h.tagName] = h
		}
		for (const a of document.querySelectorAll("#aside .active")) {
			a.classList.remove("active")
		}
		for (const h of Object.values(activeHeaders)) {
			const el = document.querySelector(`#aside a[href="#${h.id}"]`)
			if (el != null) {
				el.classList.add("active")
			}
		}
	}

	function onDocumentScroll(event) {
		last_known_scroll_position = window.scrollY;

		if (!ticking) {
			window.requestAnimationFrame(function() {
				scrollSpy(last_known_scroll_position);
				ticking = false;
			});

			ticking = true;
		}
	}
})();

document.addEventListener("click", (event) => {
	if (event.target.matches("li.disabled a, a.disabled, a[href='#'], a[href='']")) {
		event.preventDefault()
	} else if (event.target.matches("button.close")) {
		// Close button inside a modal.
		event.target.closest(".modal").classList.remove("show")
	} else if (event.target.matches(".modal")) {
		// Mask behind a modal.
		event.target.classList.remove("show")
	}
});

function click(el) {
	if (el != null) {
		el.click()
	}
}
