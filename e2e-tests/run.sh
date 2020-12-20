#!/usr/bin/env bash

set -o errexit  # Exit script when a command fails.
set -o pipefail
set -o nounset  # Using unset variables is an error.
set -o monitor  # Enable job control.
set -o verbose  # Print commands as they are being executed.

# shellcheck disable=SC2064
trap "trap - SIGTERM && kill -- -$$" SIGINT SIGTERM EXIT

cd "$(dirname "$0")"
echo "Working in '$PWD'."

frontend_port=3045
backend_port=$((frontend_port + 1))

# Backend server
pushd ../backend
if [[ ! -d venv ]]; then
	python3 -m venv --prompt e2e_tests venv
fi
source venv/bin/activate
pip install -r ../requirements.txt
pip install -r ../e2e-tests/requirements.txt

manage() {
	DJANGO_SETTINGS_MODULE="prestige.settings" \
		PRESTIGE_UNIVERSE="e2e_tests" \
		PRESTIGE_ENV="development" \
		PRESTIGE_SECRET_KEY="e2e-secret-key" \
		PRESTIGE_CORS_ORIGINS="http://localhost:$frontend_port" \
		DATABASE_URL="sqlite:///e2e-db.sqlite3" \
		python manage.py "$@"
}
manage migrate
manage runserver "127.0.0.1:$backend_port" &
backend_server_pid=$!
echo "Backend PID: '$backend_server_pid'."
popd

# Frontend server
pushd ../frontend
yarn install
PORT="$frontend_port" PRESTIGE_BACKEND="http://localhost:$backend_port" yarn start &
frontend_server_pid=$!
echo "Frontend PID: '$frontend_server_pid'."
popd

# Run tests
FRONTEND_URL="http://localhost:$frontend_port" python src/main.py

ls -l shots

kill $frontend_server_pid || true
kill $backend_server_pid || true
wait
