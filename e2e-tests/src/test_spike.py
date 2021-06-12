from collections import defaultdict
import inspect
import os
import os.path
import unittest
from typing import Dict

from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.common.keys import Keys
from selenium.webdriver.support.expected_conditions import presence_of_element_located
from selenium.webdriver.support.ui import WebDriverWait


class BaseTestCase(unittest.TestCase):
	_shot_ids: Dict[str, int] = defaultdict(int)

	@classmethod
	def setUpClass(cls):
		if cls is BaseTestCase:
			raise unittest.SkipTest

	def setUp(self):
		self.httpbun_base = os.getenv("HTTPBUN_URL", "https://httpbun.com")
		self.prestige_base = os.getenv("FRONTEND_URL", "https://prestigemad.com")

		browser = os.environ.get("PRESTIGE_SELENIUM_BROWSER", "chrome").lower()
		if browser.startswith("f"):
			options = webdriver.FirefoxOptions()
			options.headless = True
			self.driver = webdriver.Firefox(options=options)
		else:
			options = webdriver.ChromeOptions()
			options.headless = True
			options.capabilities["goog:loggingPrefs"] = {
				"browser": "ALL",
			}
			self.driver = webdriver.Chrome(options=options)

		self.driver.set_window_size(1366, 1200)
		self.wait = WebDriverWait(self.driver, 10)

		self.driver.get(self.prestige_base)

	def tearDown(self):
		for entry in self.driver.get_log("browser"):
			print(entry)
		self.driver.quit()

	def shot(self, title: str = None):
		fn = inspect.stack()[1].function
		self._shot_ids[fn] += 1
		title = fn if title is None else (fn + "-" + title)
		path = f"shots/{title}-{self._shot_ids[fn]}.png"
		os.makedirs(os.path.dirname(path), exist_ok=True)
		self.driver.save_screenshot(path)

	def set_editor_content(self, content):
		textarea = self.wait_for("textarea")
		self.query_selector(".CodeMirror .CodeMirror-line").click()
		textarea.send_keys(Keys.COMMAND, "a")
		textarea.send_keys(Keys.BACKSPACE)
		textarea.send_keys(content)

	def editor_run(self):
		textarea = self.query_selector("textarea")
		textarea.send_keys(Keys.CONTROL, Keys.HOME)
		textarea.send_keys(Keys.COMMAND, Keys.HOME)
		textarea.send_keys(Keys.CONTROL, Keys.ENTER)

	def query_selector(self, css: str):
		return self.driver.find_element_by_css_selector(css)

	def wait_for(self, css: str):
		"""
		Wait for the presence of an element by the given CSS selector, and return the element.
		"""
		self.wait.until(presence_of_element_located((By.CSS_SELECTOR, css)))
		return self.query_selector(css)


class SearchText(BaseTestCase):

	def test_get_200(self):
		self.wait.until(presence_of_element_located((By.CSS_SELECTOR, "header h1")))
		print(self.driver.find_element_by_css_selector("header h1 + div").text)
		self.set_editor_content("GET " + self.httpbun_base + "/get\n\n###\n\n")
		self.editor_run()
		status_el = self.wait_for(".result-pane .status")
		self.shot()
		assert status_el.text == "200 Ok"


if __name__ == '__main__':
	unittest.main()
