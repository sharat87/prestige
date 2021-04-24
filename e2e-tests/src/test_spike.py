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
		self.httpbin_base = os.getenv("HTTPBIN_URL", "http://httpbin.org")
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

	def editor_send_keys(self, content: str):
		self.wait.until(presence_of_element_located((By.TAG_NAME, "textarea")))
		self.driver.find_element_by_css_selector(".CodeMirror .CodeMirror-line").click()
		self.driver.find_element_by_css_selector("textarea").send_keys(Keys.COMMAND, "a")
		self.driver.find_element_by_css_selector("textarea").send_keys(content)


class SearchText(BaseTestCase):
	def test_search_by_text(self):
		self.wait.until(presence_of_element_located((By.CSS_SELECTOR, "header h1")))
		print(self.driver.find_element_by_css_selector("header h1 + div").text)
		self.editor_send_keys("GET " + self.httpbin_base + "/get\n\n###\n\n")
		self.driver.find_element_by_css_selector("textarea").send_keys(Keys.CONTROL, Keys.HOME)
		self.driver.find_element_by_css_selector("textarea").send_keys(Keys.COMMAND, Keys.HOME)
		self.driver.find_element_by_css_selector("textarea").send_keys(Keys.CONTROL, Keys.ENTER)
		self.wait.until(presence_of_element_located((By.CSS_SELECTOR, ".result-pane .body")))
		self.shot()


if __name__ == '__main__':
	unittest.main()
