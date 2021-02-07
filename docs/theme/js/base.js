const searchModal = document.getElementById("mkdocs_search_modal")
const keyboardModal = document.getElementById("mkdocs_keyboard_modal")

// Search
window.addEventListener("load", () => {
	if (searchModal == null) {
		return
	}

	const match = location.search.match(/[\?&]q=([^&]+)/)
	if (match != null) {
		searchModal.querySelector("input").value = match[1]
		showSearchModal()
	}

	const searchBtn = document.getElementById("searchBtn")
	if (searchBtn != null) {
		searchBtn.addEventListener("click", showSearchModal)
	}

	// Close search modal when result is selected
	// The links get added later so listen to parent
	searchModal.addEventListener("click", event => {
		if (event.target.tagName === 'A') {
			searchModal.classList.remove("show")
		}
	})
})

// Keyboard shortcuts
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
			const el = document.querySelector(".modal.show")
			if (el != null) {
				el.classList.remove("show")
			}
			break
		case "n":
			click(document.querySelector("a[rel='next']"))
			break
		case "p":
			click(document.querySelector("a[rel='prev']"))
			break
		case "/":
			e.preventDefault()
			keyboardModal.classList.remove("show")
			showSearchModal()
			break
		case "?":
			e.preventDefault()
			if (searchModal != null) {
				searchModal.classList.remove("show")
			}
			keyboardModal.classList.add("show")
			break
	}
})

!(() => { // Scroll spy to auto-highlight current item in TOC.
	let isRequested = false

	function scrollSpy() {
		const activeHeaders = {}
		for (const h of document.body.querySelectorAll("h2, h3")) {
			if (h.offsetTop > window.scrollY) {
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
		isRequested = false
	}

	document.addEventListener("scroll", event => {
		if (!isRequested) {
			window.requestAnimationFrame(scrollSpy)
			isRequested = true
		}
	})
})()

// Global click handler
document.addEventListener("click", (event) => {
	if (event.target.matches(".disabled a, a.disabled, a[href='#'], a[href='']")) {
		event.preventDefault()
	} else if (event.target.matches("button.close")) {
		// Close button inside a modal.
		event.target.closest(".modal").classList.remove("show")
	} else if (event.target.matches(".modal")) {
		// Mask behind a modal.
		event.target.classList.remove("show")
	}
})

function showSearchModal() {
	if (searchModal != null) {
		searchModal.classList.add("show")
		searchModal.querySelector("input").focus()
		searchModal.querySelector("input").select()
		window.doSearch()
	}
}

function click(el) {
	if (el != null) {
		el.click()
	}
}
