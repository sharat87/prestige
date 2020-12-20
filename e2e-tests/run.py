import atexit
import http.server
import logging
import os
import sys
import time
from pathlib import Path
import subprocess

logging.basicConfig(level=logging.DEBUG)
log = logging.getLogger(__name__)

frontend_port = 3045
backend_port = frontend_port + 1

backend_proc = None
frontend_proc = None


@atexit.register
def kill_all():
	if backend_proc is not None:
		log.info("Killing backend.")
		backend_proc.kill()
	if frontend_proc is not None:
		log.info("Killing frontend.")
		frontend_proc.kill()


e2e_tests_path = Path(".")
backend_path = (e2e_tests_path / ".." / "backend").resolve()
frontend_path = (e2e_tests_path / ".." / "frontend").resolve()

log.debug("e2e_tests_path: %r.", e2e_tests_path)
log.debug("backend_path: %r.", backend_path)
log.debug("frontend_path: %r.", frontend_path)

if not (e2e_tests_path / "venv").exists():
	log.info("Creating new venv at %r.", e2e_tests_path / "venv")
	subprocess.check_call(["python3", "-m", "venv", "--prompt", "stockfish-e2e", str(e2e_tests_path / "venv")])

subprocess.check_call([
	str(e2e_tests_path / "venv" / "bin" / "python"),
	"-m",
	"pip",
	"install",
	"-r",
	str(e2e_tests_path / "requirements.txt"),
])

if not (backend_path / "venv").exists():
	log.info("Creating new venv at %r.", backend_path / "venv")
	subprocess.check_call(["python3", "-m", "venv", "--prompt", "stockfish-backend", str(backend_path / "venv")])

subprocess.check_call([
	str(backend_path / "venv" / "bin" / "python"),
	"-m",
	"pip",
	"install",
	"-r",
	str(backend_path / ".." / "requirements.txt"),
])

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

backend_proc = subprocess.Popen(
	[
		str(backend_path / "venv" / "bin" / "python"),
		"manage.py",
		"runserver",
		"--noreload",
		str(backend_port),
	],
	cwd=str(backend_path),
	env=backend_env,
)

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

frontend_proc = subprocess.Popen(
	[
		str(backend_path / "venv" / "bin" / "python"),
		"-m",
		"http.server",
		str(frontend_port),
	],
	cwd=str(frontend_path / "dist"),
)

# Take a moment for the servers to have come up.
time.sleep(2)

# Run all tests
subprocess.check_call(
	[
		str(e2e_tests_path / "venv" / "bin" / "python"),
		"src/main.py",
	],
	cwd=str(e2e_tests_path),
	env={
		**os.environ,
		"PATH": str(e2e_tests_path / "drivers") + ":" + os.environ.get("PATH", ""),
		"FRONTEND_URL": f"http://localhost:{frontend_port}",
	},
)

log.info("Fin.")
