import textwrap


def test_get_200(browser):
	browser.set_editor_content("GET " + browser.httpbun_base + "/get\n\n###\n\n")
	browser.editor_run()
	status_el = browser.wait_for(".t-response-status")
	browser.shot()
	assert status_el.text == "200 Ok"
	assert browser.find(".t-response-body pre").text == textwrap.dedent("""\
		 1{3 items
		 2  "args": {},
		 3  "headers": {5 items
		 4    "Accept": "*/*",
		 5    "Accept-Encoding": "gzip, deflate, br",
		 6    "Connection": "keep-alive",
		 7    "Host": "%s",
		 8    "User-Agent": "proxy at prestigemad.com"
		 9  },
		10  "origin": "127.0.0.1",
		11  "url": "%s/get"
		12}""" % (browser.httpbun_base.split("/")[2], browser.httpbun_base))
