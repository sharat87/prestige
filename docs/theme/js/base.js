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

window.addEventListener('resize', applyTopPadding);

function applyTopPadding() {
	// Update various absolute positions to match where the main container
	// starts. This is necessary for handling multi-line nav headers, since
	// that pushes the main container down.
	var offset = $('body > .container').offset();
	document.body.parentElement.style.scrollPaddingTop = document.getElementById("aside").style.top = offset.top + "px";
}

window.addEventListener("load", function() {
	applyTopPadding();

	const search_term = getSearchTerm()
	const searchModal = document.getElementById("mkdocs_search_modal")
	const keyboardModal = document.getElementById("mkdocs_keyboard_modal")

	if (search_term) {
		showSearchModal()
		searchModal.querySelector("input").value = search_term
		searchModal.querySelector("input").select()
	}

	document.getElementById("searchBtn").addEventListener("click", showSearchModal)

	function showSearchModal() {
		searchModal.classList.add("show")
		searchModal.querySelector("input").focus()
	}

	// Close search modal when result is selected
	// The links get added later so listen to parent
	searchModal.addEventListener("click", (event) => {
		if (event.target.tagName === 'A') {
			searchModal.classList.remove("show")
		}
	})

	// Populate keyboard modal with proper Keys
	keyboardModal.querySelector('.help.shortcut kbd').innerHTML = "?";
	keyboardModal.querySelector('.prev.shortcut kbd').innerHTML = "p";
	keyboardModal.querySelector('.next.shortcut kbd').innerHTML = "n";
	keyboardModal.querySelector('.search.shortcut kbd').innerHTML = "s";

	// Keyboard navigation
	document.addEventListener("keydown", function(e) {
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

		var page;
		switch (e.key) {
			case "Escape":
				document.querySelector(".modal.show").classList.remove("show")
				break
			case "n":
				page = $('.navbar a[rel="next"]:first').prop('href')
				break
			case "p":
				page = $('.navbar a[rel="prev"]:first').prop('href')
				break
			case "s":
				e.preventDefault();
				keyboardModal.classList.remove("show")
				showSearchModal();
				break
			case "/":
			case "?":
				e.preventDefault()
				searchModal.classList.remove("show")
				keyboardModal.classList.add("show")
				break
			default: break
		}

		if (page) {
			keyboardModal.style.display = ""
			window.location.href = page
		}
	})

	$('table').addClass('table table-striped table-hover');

	function showInnerDropdown(item) {
		var popup = $(item).next('.dropdown-menu');
		popup.addClass('show');
		$(item).addClass('open');

		// First, close any sibling dropdowns.
		var container = $(item).parent().parent();
		container.find('> .dropdown-submenu > a').each(function(i, el) {
			if (el !== item) {
				hideInnerDropdown(el);
			}
		});

		var popupMargin = 10;
		var maxBottom = $(window).height() - popupMargin;
		var bounds = item.getBoundingClientRect();

		popup.css('left', bounds.right + 'px');
		if (bounds.top + popup.height() > maxBottom &&
			bounds.top > $(window).height() / 2) {
			popup.css({
				'top': (bounds.bottom - popup.height()) + 'px',
				'max-height': (bounds.bottom - popupMargin) + 'px',
			});
		} else {
			popup.css({
				'top': bounds.top + 'px',
				'max-height': (maxBottom - bounds.top) + 'px',
			});
		}
	}

	function hideInnerDropdown(item) {
		var popup = $(item).next('.dropdown-menu');
		popup.removeClass('show');
		$(item).removeClass('open');

		popup.scrollTop(0);
		popup.find('.dropdown-menu').scrollTop(0).removeClass('show');
		popup.find('.dropdown-submenu > a').removeClass('open');
	}

	$('.dropdown-submenu > a').on('click', function(e) {
		if ($(this).next('.dropdown-menu').hasClass('show')) {
			hideInnerDropdown(this);
		} else {
			showInnerDropdown(this);
		}

		e.stopPropagation();
		e.preventDefault();
	});

	$('.dropdown-menu').parent().on('hide.bs.dropdown', function(e) {
		$(this).find('.dropdown-menu').scrollTop(0);
		$(this).find('.dropdown-submenu > a').removeClass('open');
		$(this).find('.dropdown-menu .dropdown-menu').removeClass('show');
	});
});

(() => {
	document.addEventListener("scroll", onDocumentScroll);

	let last_known_scroll_position = 0;
	let ticking = false;

	function doSomething(scroll_pos) {
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
			document.querySelector(`#aside a[href="#${h.id}"]`).classList.add("active")
		}
	}

	function onDocumentScroll(event) {
		last_known_scroll_position = window.scrollY;

		if (!ticking) {
			window.requestAnimationFrame(function() {
				doSomething(last_known_scroll_position);
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
