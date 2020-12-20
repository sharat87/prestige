import atexit
import logging
import os
import subprocess
import time
from pathlib import Path
from typing import List

logging.basicConfig(level=logging.DEBUG)
log = logging.getLogger(__name__)

frontend_port = 3045
backend_port = frontend_port + 1

child_processes: List[subprocess.Popen] = []


@atexit.register
def kill_all():
	for proc in child_processes:
		if proc is not None and proc.poll() is None:
			log.info("Killing process %r.", proc)
			proc.kill()


def make_venv(location: Path, prompt: str = None):
	prompt = prompt or location.name
	location = location / "venv"
	if not location.exists():
		log.info("Creating new venv at %r.", location)
		subprocess.check_call(["python3", "-m", "venv", "--prompt", prompt, str(location)])


def pip_deps(venv_parent: Path, requirements_parent: Path = None):
	subprocess.check_call([
		str(venv_parent / "venv" / "bin" / "python"),
		"-m",
		"pip",
		"install",
		"-r",
		str((requirements_parent or venv_parent) / "requirements.txt"),
	])


e2e_tests_path = Path(".").resolve()
backend_path = (e2e_tests_path.parent / "backend").resolve()
frontend_path = (e2e_tests_path.parent / "frontend").resolve()

log.debug("e2e_tests_path: %r.", e2e_tests_path)
log.debug("backend_path: %r.", backend_path)
log.debug("frontend_path: %r.", frontend_path)

make_venv(e2e_tests_path)
pip_deps(e2e_tests_path)

make_venv(backend_path)
pip_deps(backend_path, backend_path.parent)

backend_env = {
	**os.environ,
	"DJANGO_SETTINGS_MODULE": "prestige.settings",
	"PRESTIGE_UNIVERSE": "e2e_tests",
	"PRESTIGE_ENV": "development",
	"PRESTIGE_SECRET_KEY": "e2e-secret-key",
	"PRESTIGE_CORS_ORIGINS": f"http://localhost:{frontend_port}",
	"DATABASE_URL": "sqlite:///e2e-db.sqlite3",
}

log.info("Run migrations on backend server.")
subprocess.check_call(
	[
		str(backend_path / "venv" / "bin" / "python"),
		"manage.py",
		"migrate",
	],
	cwd=str(backend_path),
	env=backend_env,
)

child_processes.append(subprocess.Popen(
	[
		str(backend_path / "venv" / "bin" / "python"),
		"manage.py",
		"runserver",
		"--noreload",
		str(backend_port),
	],
	cwd=str(backend_path),
	env=backend_env,
))

subprocess.check_call(
	["yarn", "install"],
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

# Take a moment for the servers to have come up.
time.sleep(2)

# Run all tests
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
	},
)

log.info("Fin.")
