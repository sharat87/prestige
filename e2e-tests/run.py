"""
Starts required services for Prestige and then runs the UI tests.
"""

from pathlib import Path
from typing import Any, Dict, List, Optional
from urllib.request import urlretrieve
from zipfile import ZipFile
import atexit
import logging
import os
import re
import stat
import subprocess
import sys
import threading
import time

import requests

logging.basicConfig(level=logging.INFO, format="%(levelname)s\t%(name)s %(message)s")
log = logging.getLogger(__name__)
logging.getLogger("urllib3.connectionpool").setLevel(logging.ERROR)

# TODO: Find random available ports using
# ... <https://selenium-python.readthedocs.io/api.html#selenium.webdriver.common.utils.free_port>?
frontend_port: int = 3050
backend_port: int = frontend_port + 1
proxy_port: int = frontend_port + 2
httpbun_port: int = frontend_port + 3
mocker_port: int = frontend_port + 4

child_processes: List[subprocess.Popen] = []
open_log_files: Dict[str, Any] = {}

e2e_tests_path: Path = Path(".").resolve()
root_path: Path = e2e_tests_path.parent
backend_path: Path = root_path / "backend"
frontend_path: Path = root_path / "frontend"
venv_bin: Path = root_path / "venv" / "bin"
logs_path: Path = e2e_tests_path / "logs"

log.debug("e2e_tests_path: %r.", e2e_tests_path)
log.debug("backend_path: %r.", backend_path)
log.debug("frontend_path: %r.", frontend_path)


@atexit.register
def kill_and_close_all():
	for proc in child_processes:
		if proc is not None and proc.poll() is None:
			log.debug("Killing process %r.", proc)
			proc.kill()

	for name, f in open_log_files.items():
		log.debug("Closing %r.", name)
		f.close()


def main() -> Optional[int]:
	logs_path.mkdir(parents=True, exist_ok=True)

	chrome_driver_thread = spawn_thread(ensure_chrome_driver)
	backend_thread = spawn_thread(prestige_backend)
	frontend_thread = spawn_thread(prestige_frontend)
	proxy_thread = spawn_thread(proxy)
	httpbun_thread = spawn_thread(httpbun)
	mocker_thread = spawn_thread(mocker)

	chrome_driver_thread.join(20)
	backend_thread.join(20)
	frontend_thread.join(20)
	proxy_thread.join(20)
	httpbun_thread.join(20)
	mocker_thread.join(20)

	live_threads = [th for th in [
		chrome_driver_thread,
		backend_thread,
		frontend_thread,
		proxy_thread,
		httpbun_thread,
		mocker_thread,
	] if th.is_alive()]

	if live_threads:
		log.error("Not all services started successfully. Exiting. Remaining: %r.", live_threads)
		return 1

	return run_tests()


def prestige_backend():
	# 1. Backend server process.
	backend_env = {
		"DJANGO_SETTINGS_MODULE": "prestige.settings",
		"PRESTIGE_ENV": "e2e-tests",
		"PRESTIGE_SECRET_KEY": "e2e-secret-key",
		"PRESTIGE_PROXY_DISALLOW_HOSTS": "",
		"DATABASE_URL": "sqlite:///" + str(e2e_tests_path / "e2e-tests.db"),
		"PYTHONPATH": backend_path,
		"PRESTIGE_EXT_URL_PREFIX": f"http://localhost:{mocker_port}/",
		"GITHUB_CLIENT_ID": "github-client-id-obviously-fake",
		"GITHUB_CLIENT_SECRET": "github-client-secret-obviously-fake",
	}

	try:
		os.remove("e2e-tests.db")
	except FileNotFoundError:
		pass

	spawn_process(
		[
			venv_bin / "python",
			"manage.py",
			"migrate",
		],
		cwd=backend_path,
		env=backend_env,
		outfile="backend.log",
	).wait()

	spawn_process(
		[
			venv_bin / "python",
			# e2e_tests_path / "mocked_backend_server.py",
			"manage.py",
			"runserver",
			"--noreload",
			backend_port,
		],
		cwd=backend_path,
		env=backend_env,
		outfile="backend.log",
		outfile_append=True,
	)

	verify_service_up("health", backend_port, "backend")


def prestige_frontend():
	# 2. Frontend server process.
	spawn_process(
		[
			"make",
			"build-frontend",
		],
		env={
			"PRESTIGE_EXT_URL_PREFIX": f"http://localhost:{mocker_port}/",
		},
		outfile="frontend.log",
	).wait()

	spawn_process(
		[
			venv_bin / "python",
			"-m",
			"http.server",
			frontend_port,
		],
		cwd=str(frontend_path / "dist"),
		outfile="frontend.log",
		outfile_append=True,
	)
	time.sleep(1)

	verify_service_up("", frontend_port, "frontend")


def proxy():
	# 3. A reverse proxy to tie the frontend and backend togather on a single domain.
	spawn_process(
		[
			venv_bin / "mitmdump",
			"--mode",
			f"reverse:http://localhost:{frontend_port}",
			"--scripts",
			"./mitm_routing.py",
			"--listen-port",
			proxy_port,
		],
		env={
			"PROXY_PORT": proxy_port,
			"FRONTEND_PORT": frontend_port,
			"BACKEND_PORT": backend_port,
		},
		outfile="proxy.log",
	)


def httpbun():
	# 4. A local httpbun server process.
	# TODO: Switch to httpbun for e2e tests, intead of httpbin.

	spawn_process(
		[
			venv_bin / "python",
			"-m",
			"httpbin.core",
			"--port",
			httpbun_port,
		],
		outfile="httpbun.log",
	)

	verify_service_up("get", httpbun_port, "httpbun")


def mocker():
	# 5. Mock server for external APIs.
	spawn_process(
		[
			"node",
			e2e_tests_path / "mocker.js",
		],
		env={
			"PORT": mocker_port,
		},
		outfile="mocker.log",
	)

	verify_service_up("health", mocker_port, "mocker")


def spawn_thread(fn) -> threading.Thread:
	th = threading.Thread(target=fn, name=fn.__name__)
	th.start()
	return th


def spawn_process(
		cmd,
		*,
		cwd: Path = None,
		env: Dict[Any, Any] = None,
		outfile: str = None,
		outfile_append: bool = False,
) -> subprocess.Popen:
	kwargs: Dict[str, Any] = {
		"cwd": str(cwd or root_path),
	}

	if env is not None:
		kwargs["env"] = {**os.environ, **{str(k): str(v) for k, v in env.items()}}

	if outfile:
		outfile_f = open(str(logs_path / outfile), "a" if outfile_append else "w")
		open_log_files[outfile] = outfile_f
		kwargs.update(stdout=outfile_f, stderr=subprocess.STDOUT)
	else:
		kwargs.update(stdout=None, stderr=None)

	process = subprocess.Popen([str(c) for c in cmd], **kwargs)

	child_processes.append(process)
	return process


def verify_service_up(path: str, port: int, name: str = None, *, tries: int = 9):
	while tries:
		if name:
			log.debug("Checking %r.", name)
		try:
			response = requests.get(f"http://localhost:{port}/{path}")
		except requests.ConnectionError:
			pass
		else:
			if response.ok:
				break
		tries -= 1
		time.sleep(1)
	else:
		log.debug("Max retries finished for %r.", name)
		raise ValueError("Unable to verify service %r." % name)

	log.debug("Readied %r.", name)


def run_tests_selenium() -> int:
	return spawn_process(
		[
			venv_bin / "pytest",
			"-vv",
			"src",
			"--durations=0",
			"--log-format=%(asctime)s %(levelname)s %(name)s:%(lineno)s %(message)s",
			# To include date in log lines: "--log-date-format=%Y-%m-%d %H:%M:%S",
		],
		cwd=e2e_tests_path,
		env={
			"PATH": str(e2e_tests_path / "drivers") + ":" + os.environ.get("PATH", ""),
			"PYTHONPATH": e2e_tests_path / "src",
			"FRONTEND_URL": f"http://localhost:{proxy_port}",
			"HTTPBUN_URL": f"http://localhost:{httpbun_port}",
		},
	).wait()


def run_tests() -> int:
	return spawn_process(
		[
			e2e_tests_path / "node_modules" / ".bin" / "jest",
			"--detectOpenHandles",
			"src",
		],
		cwd=e2e_tests_path,
		env={
			"FRONTEND_URL": f"http://localhost:{proxy_port}",
			"HTTPBUN_URL": f"http://localhost:{httpbun_port}",
		},
	).wait()


def ensure_chrome_driver():
	if sys.platform == "darwin":
		chrome_exe = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
		os_in_file = "mac64"
	elif sys.platform == "linux":
		chrome_exe = "google-chrome"
		os_in_file = "linux64"
	else:
		raise ValueError("Unhandled platform %r." % sys.platform)

	chrome_version = re.search(
		r"\d+",
		subprocess.check_output([chrome_exe, "--version"]).decode(),
	).group()
	log.debug("Chrome version: %r.", chrome_version)

	driver_version = 0
	if os.path.exists("drivers/chromedriver"):
		driver_version = re.search(
			r"\d+",
			subprocess.check_output(["drivers/chromedriver", "--version"]).decode(),
		).group()
		log.debug("Driver version: %r.", driver_version)

	if chrome_version == driver_version:
		log.debug("Already have a matching chrome driver.")
		return

	response = requests.get("http://chromedriver.storage.googleapis.com/LATEST_RELEASE_" + chrome_version)
	response.raise_for_status()
	latest_version = response.text

	urlretrieve(
		f"https://chromedriver.storage.googleapis.com/{latest_version}/chromedriver_{os_in_file}.zip",
		"chromedriver.zip",
	)

	with ZipFile("chromedriver.zip") as z:
		os.makedirs("drivers", exist_ok=True)
		z.extract(z.namelist()[0], "drivers")

	os.remove("chromedriver.zip")
	st = os.stat("drivers/chromedriver")
	os.chmod("drivers/chromedriver", st.st_mode | stat.S_IEXEC)


if __name__ == "__main__":
	sys.exit(main() or 0)
