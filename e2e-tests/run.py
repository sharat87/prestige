"""
Starts required services for Prestige and then runs the UI tests.
"""

from pathlib import Path
from typing import Any, Dict, List, Optional
import atexit
import logging
import os
import subprocess
import sys
import threading
import time

import requests

logging.basicConfig(level=logging.INFO, format="%(levelname)s\t%(name)s %(message)s")
log = logging.getLogger(__name__)
logging.getLogger("urllib3.connectionpool").setLevel(logging.ERROR)

frontend_port: int = 3050
backend_port: int = frontend_port + 1
docs_port: int = frontend_port + 2
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

	backend_thread = spawn_thread(prestige_backend)
	frontend_thread = spawn_thread(prestige_frontend)

	backend_thread.join(20)
	frontend_thread.join(20)

	live_threads = [th for th in [
		backend_thread,
		frontend_thread,
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
			"node_modules/.bin/parcel",
			"serve",
			"src/index.html",
			"--dist-dir",
			"dist-e2e-serve",
			"--port",
			frontend_port,
		],
		cwd=frontend_path,
		env={
			"PRESTIGE_EXT_URL_PREFIX": f"http://localhost:{mocker_port}/",
			"BACKEND_PORT": backend_port,
		},
		outfile="frontend.log",
	)
	time.sleep(1)

	verify_service_up("", frontend_port, "frontend")


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


def run_tests() -> int:
	return spawn_process(
		[
			"node",
			"--trace-warnings",
			e2e_tests_path / "node_modules" / ".bin" / "jest",
			"--detectOpenHandles",
			"--verbose",
			"src",
		],
		cwd=e2e_tests_path,
		env={
			"APP_URL": f"http://localhost:{frontend_port}",
			"DOCS_PORT": docs_port,
			"MOCKER_PORT": mocker_port,
			"MOCKER_LOGS": logs_path / "mocker.log",
		},
	).wait()


if __name__ == "__main__":
	sys.exit(main() or 0)
