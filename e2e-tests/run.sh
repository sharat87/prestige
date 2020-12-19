#!/usr/bin/env bash

set -o errexit
set -o pipefail
set -o nounset
set -o monitor  # Enable job control.
set -o verbose  # Print commands as they are being executed.

cd "$(dirname "$0")"
echo "Working in '$PWD'."


pushd ../backend
if [[ ! -d venv ]]; then
	python3 -m venv --prompt e2e_tests venv
fi
source venv/bin/activate
pip install -r ../requirements.txt
pip install -r ../e2e-tests/requirements.txt

alias backend_env="DJANGO_SETTINGS_MODULE='prestige.settings' PRESTIGE_ENV='development' PRESTIGE_SECRET_KEY='e2e-secret-key' PRESTIGE_CORS_ORIGINS='http://localhost:3045' DATABASE_URL='sqlite:///db.sqlite3'"
backend_env python manage.py migrate
backend_env python manage.py runserver 127.0.0.1:3046 &
backend_server_pid=$!
echo "Backend PID: $backend_server_pid"
popd

python src/main.py

kill $backend_server_pid || true
wait
