import os
import unittest

from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.common.keys import Keys
from selenium.webdriver.support.expected_conditions import presence_of_element_located
from selenium.webdriver.support.ui import WebDriverWait


URL = os.getenv("FRONTEND_URL")
if not URL:
	raise ValueError("Missing/empty 'FRONTEND_URL' environment variable.")

os.makedirs("shots", exist_ok=True)

options = webdriver.ChromeOptions()
options.headless = True


class SearchText(unittest.TestCase):
	def setUp(self):
		self.driver = webdriver.Chrome(options=options)
		self.wait = WebDriverWait(self.driver, 10)
		self.driver.set_window_size(1366, 784)
		self.driver.get(URL)

	def tearDown(self):
		self.driver.quit()

	def test_search_by_text(self):
		self.wait.until(presence_of_element_located((By.CSS_SELECTOR, "header h1")))
		print(self.driver.find_element_by_css_selector("header h1 + div").text)
		self.wait.until(presence_of_element_located((By.TAG_NAME, "textarea")))
		self.driver.find_element_by_css_selector(".CodeMirror .CodeMirror-line").click()
		self.driver.find_element_by_css_selector("textarea").send_keys(Keys.HOME)
		self.driver.find_element_by_css_selector("textarea").send_keys("GET http://httpbin.org/get\n\n###\n\n")
		self.driver.find_element_by_css_selector("textarea").send_keys(Keys.CONTROL, Keys.HOME)
		self.driver.find_element_by_css_selector("textarea").send_keys(Keys.COMMAND, Keys.HOME)
		self.driver.find_element_by_css_selector("textarea").send_keys(Keys.CONTROL, Keys.ENTER)
		self.wait.until(presence_of_element_located((By.CSS_SELECTOR, ".result-pane .body")))
		self.driver.save_screenshot("shots/shot-1.png")


if __name__ == '__main__':
	unittest.main()
