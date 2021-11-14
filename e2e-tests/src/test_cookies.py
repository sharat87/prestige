import textwrap


def test_cookies_ui_reflects_responses(log, browser):
	log.warning("haha")
	browser.set_editor_content("GET " + browser.httpbun_base + "/cookies/set?name=sherlock\n")
	browser.editor_run()

	status_el = browser.wait_for(".t-response-status")
	browser.shot()

	assert status_el.text == "200 Ok"

	browser.find(".t-cookies-toggle-btn").click()
	browser.shot()

	assert browser.find(".t-response-body pre").text == textwrap.dedent("""\
		1{
		2  "cookies": {
		3    "name": "sherlock"
		4  }
		5}""")
	assert browser.find(".t-cookies-table tbody").text == "1 localhost.local / name sherlock n/a Del"

	browser.set_editor_content("GET " + browser.httpbun_base + "/cookies/delete?name=\n")
	browser.editor_run()

	status_el = browser.wait_for(".t-response-status")
	browser.shot()

	assert browser.is_exists(".t-cookies-empty")


def test_cookies_clear(log, browser):
	browser.set_editor_content("GET " + browser.httpbun_base + "/cookies/set?name=mycroft\n")
	browser.editor_run()

	browser.wait_for(".t-response-status")
	browser.shot()

	browser.find(".t-cookies-toggle-btn").click()
	browser.shot()
	assert browser.find(".t-cookies-table tbody").text == "1 localhost.local / name mycroft n/a Del"

	browser.find(".t-cookies-clear-all-btn").click()
	browser.shot()
	assert browser.is_exists(".t-cookies-empty")

	browser.refresh()
	browser.wait_for(".t-cookies-toggle-btn").click()
	browser.shot()
	assert browser.is_exists(".t-cookies-empty")
