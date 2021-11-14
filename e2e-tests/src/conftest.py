from collections import defaultdict
from typing import Dict
import os
import os.path
import logging

import pytest
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.common.keys import Keys
from selenium.webdriver.support.expected_conditions import presence_of_element_located
from selenium.webdriver.support.ui import WebDriverWait
from selenium.common.exceptions import NoSuchElementException


@pytest.fixture
def log(request):
	return logging.getLogger(request.function.__module__ + "." + request.function.__qualname__)


@pytest.fixture
def browser(request, caplog):
	caplog.set_level(logging.WARNING, logger="selenium.webdriver.remote.remote_connection")
	caplog.set_level(logging.WARNING, logger="urllib3.connectionpool")
	browser = Browser(request)
	yield browser
	browser.close()


class Browser:
	def __init__(self, test_request):
		self.test_name = test_request.node.name
		self._shot_ids: Dict[str, int] = defaultdict(int)

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

		self.driver.set_window_size(1400, 960)
		self.driver.implicitly_wait(2)
		self.wait = WebDriverWait(self.driver, 10)

		self.driver.get(self.prestige_base)
		self.wait_for("header h1")

	def close(self):
		console_logs_file = os.path.join("logs", "console", self.test_name + ".log")
		os.makedirs(os.path.dirname(console_logs_file), exist_ok=True)
		with open(console_logs_file, "w") as f:
			for entry in self.driver.get_log("browser"):
				print(entry, file=f)
		self.driver.quit()

	def shot(self, title: str = "shot"):
		self._shot_ids[self.test_name] += 1
		path = f"shots/{self.test_name}/{self._shot_ids[self.test_name]:03}-{title}.png"
		os.makedirs(os.path.dirname(path), exist_ok=True)
		self.driver.save_screenshot(path)

	def set_editor_content(self, content):
		textarea = self.wait_for("textarea")
		self.find(".CodeMirror").click()
		textarea.send_keys(Keys.COMMAND, "a")
		textarea.send_keys(Keys.BACKSPACE)
		textarea.send_keys(content)

	def editor_run(self):
		textarea = self.find("textarea")
		textarea.send_keys(Keys.CONTROL, Keys.HOME)
		textarea.send_keys(Keys.COMMAND, Keys.HOME)
		textarea.send_keys(Keys.CONTROL, Keys.ENTER)

	def find(self, css: str):
		return self.driver.find_element_by_css_selector(css)

	def is_exists(self, css: str) -> bool:
		try:
			self.driver.find_element_by_css_selector(css)
			return True
		except NoSuchElementException:
			return False

	def wait_for(self, css: str):
		"""
		Wait for the presence of an element by the given CSS selector, and return the element.
		"""
		self.wait.until(presence_of_element_located((By.CSS_SELECTOR, css)))
		return self.find(css)

	def refresh(self):
		self.driver.refresh()
