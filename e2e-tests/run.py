import atexit
import logging
import os
import subprocess
import threading
import time
from functools import wraps
from pathlib import Path
from timeit import default_timer as timer
from typing import List, Dict, IO

logging.basicConfig(level=logging.DEBUG, format="%(levelname)s\t%(name)s %(message)s")
log = logging.getLogger(__name__)

frontend_port: int = 3045
backend_port: int = frontend_port + 1
httpbin_port: int = frontend_port + 2

child_processes: List[subprocess.Popen] = []

e2e_tests_path: Path = Path(".").resolve()
backend_path: Path = (e2e_tests_path.parent / "backend").resolve()
frontend_path: Path = (e2e_tests_path.parent / "frontend").resolve()

log.debug("e2e_tests_path: %r.", e2e_tests_path)
log.debug("backend_path: %r.", backend_path)
log.debug("frontend_path: %r.", frontend_path)


@atexit.register
def kill_all():
	for proc in child_processes:
		if proc is not None and proc.poll() is None:
			log.info("Killing process %r.", proc)
			proc.kill()


def logger_inject(fn):
	"""
	Decorates a function to add an additional first positional parameter to the function, which is a `logging.Logger`
	instance with the name set to the function's fully qualified name.
	:param fn: Function to add the log parameter as the first positional parameter.
	:return: Decorated function.
	"""

	@wraps(fn)  # This makes some Django's internal reflection based checks fail.
	def wrapped(*args, **kwargs):
		name = ("" if fn.__module__ == "__main__" else fn.__module__ + ".") + fn.__name__
		return fn(logging.getLogger(name), *args, **kwargs)

	return wrapped


def main():
	start = timer()
	make_venv(backend_path)
	pip_deps(backend_path, backend_path.parent)
	venvs_time = timer() - start

	start = timer()
	prestige_backend()
	prestige_frontend()
	httpbin()
	prelude_processes_time = timer() - start

	# Take a moment for the servers to have come up.
	time.sleep(2)

	start = timer()
	run_tests()
	tests_time = timer() - start

	log.info(
		"Times venvs_time=%0.2fs prelude_processes_time=%0.2fs tests_time=%0.2fs",
		venvs_time,
		prelude_processes_time,
		tests_time,
	)


def make_venv(location: Path, prompt: str = None, logger: logging.Logger = None):
	prompt = prompt or location.name
	location = location / "venv"
	if not location.exists():
		log.info("Creating new venv at %r.", location)
		spawn_process(
			["python3", "-m", "venv", "--prompt", prompt, str(location)],
			log_target=logger,
		).wait()


def pip_deps(venv_parent: Path, requirements_parent: Path = None, logger: logging.Logger = None):
	spawn_process(
		[
			str(venv_parent / "venv" / "bin" / "python"),
			"-m",
			"pip",
			"install",
			"-r",
			str((requirements_parent or venv_parent) / "requirements.txt"),
		],
		log_target=logger,
	).wait()


@logger_inject
def prestige_backend(fn_log):
	# 1. Backend server process.
	make_venv(e2e_tests_path, logger=fn_log)
	pip_deps(e2e_tests_path, logger=fn_log)

	backend_env = {
		"DJANGO_SETTINGS_MODULE": "prestige.settings",
		"PRESTIGE_UNIVERSE": "e2e_tests",
		"PRESTIGE_ENV": "development",
		"PRESTIGE_SECRET_KEY": "e2e-secret-key",
		"PRESTIGE_CORS_ORIGINS": f"http://localhost:{frontend_port}",
		"DATABASE_URL": "sqlite:///e2e-db.sqlite3",
	}

	fn_log.info("Run migrations on backend server.")
	spawn_process(
		[
			str(backend_path / "venv" / "bin" / "python"),
			"manage.py",
			"migrate",
		],
		log_target=fn_log,
		cwd=backend_path,
		env=backend_env,
	).wait()

	child_processes.append(spawn_process(
		[
			str(backend_path / "venv" / "bin" / "python"),
			"manage.py",
			"runserver",
			"--noreload",
			str(backend_port),
		],
		log_target=fn_log,
		cwd=backend_path,
		env=backend_env,
	))


def spawn_process(cmd, *, log_target: logging.Logger, cwd: Path = None, env: Dict[str, str] = None) -> subprocess.Popen:
	kwargs = {}

	if cwd is not None:
		kwargs["cwd"] = str(cwd)

	if env is not None:
		kwargs["env"] = {**os.environ, **env}

	if log_target is not None:
		kwargs.update(stdout=subprocess.PIPE, stderr=subprocess.PIPE)

	process = subprocess.Popen(cmd, **kwargs)

	if log_target is not None:
		pipe_file_to_log(process.stdout, log_target, logging.INFO)
		pipe_file_to_log(process.stderr, log_target, logging.WARNING)

	return process


def pipe_file_to_log(file: IO, logger: logging.Logger, level: int):
	def watcher():
		for line in file:
			logger.log(level, "%s", line.decode("UTF-8")[:-1])

	threading.Thread(target=watcher, daemon=True).start()


def prestige_frontend():
	# 2. Frontend server process.
	subprocess.check_call(
		[
			"yarn",
			"install",
			"--frozen-lockfile",
			"--non-interactive"
		],
		cwd=str(frontend_path),
	)

	subprocess.check_call(
		["yarn", "build"],
		cwd=str(frontend_path),
		env={
			**os.environ,
			"PRESTIGE_BACKEND": f"http://localhost:{backend_port}",
		},
	)

	child_processes.append(subprocess.Popen(
		[
			str(backend_path / "venv" / "bin" / "python"),
			"-m",
			"http.server",
			str(frontend_port),
		],
		cwd=str(frontend_path / "dist"),
	))


def httpbin():
	# 3. A local httpbin server process.
	child_processes.append(subprocess.Popen(
		[
			str(e2e_tests_path / "venv" / "bin" / "flask"),
			"run",
			"-p",
			str(httpbin_port),
		],
		cwd=str(e2e_tests_path),
		env={
			**os.environ,
			"FLASK_APP": "httpbin:app",
		},
	))


def run_tests():
	subprocess.check_call(
		[
			str(e2e_tests_path / "venv" / "bin" / "python"),
			"-m",
			"unittest",
			"discover",
			"--start-directory",
			"src",
		],
		cwd=str(e2e_tests_path),
		env={
			**os.environ,
			"PATH": str(e2e_tests_path / "drivers") + ":" + os.environ.get("PATH", ""),
			"PYTHONPATH": str(e2e_tests_path / "src"),
			"FRONTEND_URL": f"http://localhost:{frontend_port}",
			"HTTPBIN_URL": f"http://localhost:{httpbin_port}",
		},
	)


if __name__ == '__main__':
	main()
