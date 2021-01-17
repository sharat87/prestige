SHELL := bash

help:
	@echo 'Please see the makefile for available targets.'

###
# Backend targets
###

serve-backend: backend/venv
	@cd backend \
		&& source venv/bin/activate \
		&& set -o allexport \
		&& source env.sh \
		&& python manage.py runserver 127.0.0.1:3041

lint-backend: backend/venv backend/venv/bin/flake8
	@cd backend \
		&& source venv/bin/activate \
		&& flake8 . --extend-exclude venv --select=E9,F63,F7,F82 --show-source --statistics

test-backend: backend/venv
	@cd backend \
		&& source venv/bin/activate \
		&& PRESTIGE_UNIVERSE=test \
			python manage.py test

makemigrations migrate: backend/venv
	@cd backend \
		&& source venv/bin/activate \
		&& set -o allexport \
		&& source env.sh \
		&& python manage.py $@

backend/venv: requirements.txt
	@mkdir -p backend
	@test -d backend/venv || python3 -m venv --prompt prestige backend/venv
	@source backend/venv/bin/activate && pip install -r requirements.txt

backend/venv/bin/flake8: backend/venv
	@source backend/venv/bin/activate && pip install flake8

###
# Frontend targets
###

build-frontend: frontend/node_modules
	@cd frontend && node manage.js build

serve-frontend: frontend/node_modules
	@cd frontend && node manage.js serve

lint-frontend: frontend/node_modules
	@cd frontend && npx tsc --noEmit --project . && npx eslint --report-unused-disable-directives src

test-frontend: frontend/node_modules
	@cd frontend && npx jest

frontend/node_modules: frontend/package.json frontend/yarn.lock
	@if [[ frontend/package.json -nt frontend/yarn.lock ]]; then \
			cd frontend && yarn install; \
		else \
			cd frontend && yarn install --frozen-lockfile; \
		fi

###
# Miscellaneous / Project-wide targets
###

test-e2e: e2e-tests/drivers/chromedriver
	@cd e2e-tests && PATH="$$PWD/drivers:$$PATH" python3 run.py

e2e-tests/drivers/chromedriver:
	@export CHROME_VERSION="$$(google-chrome --version | cut -f 3 -d ' ' | cut -d '.' -f 1)" \
		&& VERSION="$$(curl --silent --location --fail --retry 3 http://chromedriver.storage.googleapis.com/LATEST_RELEASE_$$CHROME_VERSION)" \
		&& wget -c -nc --retry-connrefused --tries=0 -O chromedriver.zip https://chromedriver.storage.googleapis.com/$$VERSION/chromedriver_linux64.zip
	@unzip -o -q chromedriver.zip
	@mkdir -p $$(dirname $@)
	@sudo mv chromedriver $@
	@rm chromedriver.zip

test-all: lint-frontend test-frontend test-backend test-e2e

.PHONY: help serve-backend lint-backend test-backend build-frontend serve-frontend lint-frontend test-frontend test-e2e test-all
