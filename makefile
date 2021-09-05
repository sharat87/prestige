SHELL := bash

help:
	@echo 'Please see the makefile for available targets.'

###
# Backend targets
###

build-backend: venv
	source venv/bin/activate \
		&& cd backend \
		&& PRESTIGE_SECRET_KEY=unused DATABASE_URL='sqlite://:memory:' python manage.py collectstatic --clear --no-input \
		&& python -m compileall -f .

lint-backend: venv/bin/flake8
	@source venv/bin/activate \
		&& cd backend \
		&& flake8 . --extend-exclude venv --select=E9,F63,F7,F82 --show-source --statistics

test-backend: venv
	@source venv/bin/activate \
		&& cd backend \
		&& PRESTIGE_ENV=test \
			python manage.py test

changepassword: venv
	@source venv/bin/activate \
		&& cd backend \
		&& PRESTIGE_ENV=development PYTHONUTF8=1 python manage.py $@ "$$(read -e -r -p 'Email: '; echo $$REPLY)"

makemigrations migrate: venv
	@source venv/bin/activate \
		&& cd backend \
		&& PRESTIGE_ENV=development PYTHONUTF8=1 python manage.py $@

resetdb: venv
	@rm -fv backend/db.sqlite3
	@make migrate
	@echo '*** Creating super user ***'
	@source venv/bin/activate \
		&& cd backend \
		&& PRESTIGE_ENV=development PYTHONUTF8=1 python manage.py createsuperuser

venv/bin/flake8: | venv
	@source venv/bin/activate && pip install flake8

###
# Frontend targets
###

build-frontend: frontend/node_modules
	@cd frontend && NODE_ENV=production PRESTIGE_BACKEND=$${PRESTIGE_BACKEND:-} \
		npx parcel build src/index.html --dist-dir dist --no-autoinstall --no-source-maps --no-cache

lint-frontend: frontend/node_modules
	@cd frontend && npx tsc --noEmit --project . && npx eslint --report-unused-disable-directives src

test-frontend: frontend/node_modules
	@cd frontend && npx jest

frontend/node_modules: frontend/node_modules/make_sentinel

frontend/node_modules/make_sentinel: frontend/package.json frontend/yarn.lock
	if ! type yarn; then npm install -g yarn; fi
	if [[ frontend/package.json -nt frontend/yarn.lock ]]; then \
			cd frontend && yarn install; \
		else \
			cd frontend && yarn install --frozen-lockfile; \
		fi
	@touch $@

update-browserslist:
	@cd frontend && \
		npx browserslist@latest --update-db

###
# Documentation
###

build-docs: venv
	@source venv/bin/activate \
		&& cd docs \
		&& PYTHONPATH=. mkdocs build

###
# End-to-end Testing
###

test-e2e: venv e2e-tests/drivers/chromedriver
	@rm -rf e2e-tests/shots
	@source venv/bin/activate \
		&& cd e2e-tests \
		&& python3 run.py

e2e-tests/drivers/chromedriver:
	@export CHROME_VERSION="$$((google-chrome --version || "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --version) | cut -f 3 -d ' ' | cut -d '.' -f 1)" \
		&& VERSION="$$(curl --silent --location --fail --retry 3 http://chromedriver.storage.googleapis.com/LATEST_RELEASE_$$CHROME_VERSION)" \
		&& OS="$$(if [[ $$(uname -s) = Linux ]]; then echo linux64; else echo mac64; fi)" \
		&& wget -c -nc --retry-connrefused --tries=0 -O chromedriver.zip https://chromedriver.storage.googleapis.com/$$VERSION/chromedriver_$$OS.zip
	@unzip -o -q chromedriver.zip
	@mkdir -p $$(dirname $@)
	@mv chromedriver $@
	@rm chromedriver.zip

###
# Miscellaneous / Project-wide targets
###

venv: venv/make_sentinel

venv/make_sentinel: requirements.txt requirements-dev.txt
	test -d venv || python3 -m venv --prompt prestige venv
	source venv/bin/activate && pip install -r requirements.txt && pip install -r requirements-dev.txt
	touch $@

test-all: lint-frontend test-frontend test-backend test-e2e

outdated:
	cd frontend && yarn outdated

upgrade-deps:
	# TODO: Don't attempt stop/start frontend, if isn't already running.
	@cd frontend \
		&& ../venv/bin/supervisorctl stop prestige:frontend \
		&& yarn upgrade --latest \
		&& ../venv/bin/supervisorctl start prestige:frontend
	@# TODO: Upgrade dependencies for backend as well.

# The processes aren't being killed when supervisord is killed with a `Ctrl+c`.
start: venv venv/bin/supervisord
	@if [[ -e .supervisor.sock ]]; then echo 'Already running.'; else \
		if [[ -f dev.env ]]; then set -a; source dev.env; fi; \
		venv/bin/supervisord; \
		echo 'Just started.'; fi
	@echo 'App at <http://localhost:3045>. Process monitor at <http://localhost:3044>. Request monitor at <http://localhost:3046>.'

stop: venv venv/bin/supervisord
	@if [[ -e .supervisor.sock ]]; then kill $$(venv/bin/supervisorctl pid); echo 'Just stopped.'; sleep 2s; else echo 'Already stopped.'; fi

venv/bin/supervisord:
	@source venv/bin/activate \
		&& pip install supervisor

build-all: build-frontend build-backend build-docs
	test ! -d package
	mkdir -p package
	# Copy favicon to hashless filename for docs to show the favicon.
	cp frontend/dist/favicon.*.ico frontend/dist/favicon.ico
	mv backend/static frontend/dist/
	mv docs/site frontend/dist/docs
	mv frontend/dist package/webroot
	cp -r backend package/
	cp requirements.txt package/
	find package/backend -type d -name __pycache__ -print -exec rm -rf '{}' ';' -prune
	rm -rf package/backend/.mypy_cache
	cd package && tar -caf ../package.tar.gz *
	du -sh package package.tar.gz || true
	rm -rf package

upload-package:
	aws s3 cp package.tar.gz s3://ssk-artifacts/prestige-package.tar.gz

heroku-release: clean build-frontend build-backend build-docs
	# Copy favicon to hashless filename for docs to show the favicon.
	cp frontend/dist/favicon.*.ico frontend/dist/favicon.ico
	mv frontend/dist/* backend/static/
	mv docs/site backend/static/docs
	tree backend/static
	cd backend \
		&& DATABASE_URL=unused PRESTIGE_SECRET_KEY="=sez4lhfn@nh86)ylzgl(5k*5kkd+la(dzfsisvdk9ezj2958-" python manage.py migrate

clean:
	rm -rf frontend/dist backend/static docs/site
	find backend -type d -name __pycache__ -print -exec rm -rf '{}' ';' -prune


.PHONY: help lint-backend test-backend build-frontend lint-frontend test-frontend test-e2e test-all venv start stop
