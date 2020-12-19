import os
import unittest

from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.common.keys import Keys
from selenium.webdriver.support.expected_conditions import presence_of_element_located
from selenium.webdriver.support.ui import WebDriverWait


os.makedirs("shots", exist_ok=True)

options = webdriver.ChromeOptions()
options.headless = True
with webdriver.Chrome(options=options) as driver:
	wait = WebDriverWait(driver, 10)
	driver.set_window_size(1366, 784)
	driver.get("https://prestigemad.com")
	wait.until(presence_of_element_located((By.CSS_SELECTOR, "header h1")))
	print(driver.find_element_by_css_selector("header h1 + div").text)
	wait.until(presence_of_element_located((By.TAG_NAME, "textarea")))
	driver.find_element_by_css_selector(".CodeMirror .CodeMirror-line").click()
	driver.find_element_by_css_selector("textarea").send_keys("GET http://httpbin.org/get")
	driver.find_element_by_css_selector("textarea").send_keys(Keys.CONTROL, Keys.ENTER)
	wait.until(presence_of_element_located((By.CSS_SELECTOR, ".result-pane .body")))
	driver.save_screenshot("shots/shot-1.png")

print("Done")


'''
class SearchText(unittest.TestCase):
	def setUp(self):
		# create a new Firefox session
		self.driver = webdriver.Chrome(options=options)
		# self.driver.implicitly_wait(30)
		# self.driver.maximize_window()
		# navigate to the application home page
		self.driver.get("http://www.google.com/")

	def test_search_by_text(self):
		# get the search textbox
		self.search_field = self.driver.find_element_by_name("q")

		# enter search keyword and submit
		self.search_field.send_keys("Selenium WebDriver Interview questions")
		self.search_field.submit()

		# get the list of elements which are displayed after the search
		# currently on result page usingfind_elements_by_class_namemethod

		lists = self.driver.find_elements_by_class_name("r")
		self.assertEqual(11, len(lists))
		driver.save_screenshot("test-1.png")

	def tearDown(self):
		# close the browser window
		self.driver.quit()


if __name__ == '__main__':
	unittest.main()
'''
