#!/usr/bin/env bash

set -o errexit
set -o nounset
set -o pipefail
if [[ -n "${CI:-}" ]]; then
	set -o xtrace
fi

-h() { help; }
help() {
	echo 'Please see the manage.sh script source for available tasks.' >&2
}

# TODO: Hitting Ctrl-c in middle of a job doesn't cancel.

###
# Backend targets
###

serve-backend() {
	cd backend
	go run .
}

build-backend() (
	cd backend
	go build \
		-o ../prestige \
		-v \
		-ldflags "-X main.Version=${VERSION-} -X main.Date=$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
		.
)

lint-backend() {
	cd backend
	go vet ./...
}

test-backend() {
	pushd backend

	docker compose pull
	docker compose up -d

	# The `%%` here will be replaced by a different db name for each test.
	export PRESTIGE_DATABASE_URI="mongodb://user:pass@localhost/%%?authSource=admin"

	n=4
	while [[ $n -gt 0 ]]; do
		if docker compose exec mongo mongosh "${PRESTIGE_DATABASE_URI//%%/}" --quiet --eval "$(cat apitests/mongodb-test-data.js)"; then
			break
		fi
		sleep 3
		n=$((n-1))
	done

	go clean -testcache || true
	code=0
	if ! go mod tidy; then
		code=1
	elif ! go test -vet=all -cover ./... | color-go-test-output; then
		code=1
	fi

	popd

	return $code
}

color-go-test-output() {
	sed -e "/^ok /s/^/$(printf "\033[32m")/" -e "/FAIL/s/^/$(printf "\033[31m")/" -e "s/$/$(printf "\033[0m")/"
}

###
# Frontend targets
###

serve-frontend() {
	cd frontend
	if [[ package.json -nt yarn.lock ]]; then
		yarn install
	fi
	fix-star-zoom
	NODE_ENV=development exec npx parcel serve src/index.html --dist-dir dist-serve --port "${PORT-3040}"
}

build-frontend() (
	cd frontend
	fix-star-zoom
	NODE_ENV="production" PRESTIGE_BACKEND=${PRESTIGE_BACKEND:-} \
		npx parcel build src/index.html --dist-dir dist --no-autoinstall --no-source-maps --no-cache
)

fix-star-zoom() {
	if grep -F -m1 -q "*zoom:" node_modules/tachyons/css/tachyons.css; then
		out="$(sed "s/\*zoom:/zoom:/" node_modules/tachyons/css/tachyons.css)"
		echo "$out" > node_modules/tachyons/css/tachyons.css
	fi
}

lint-frontend() {
	ensure-node_modules frontend
	(
		cd frontend
		npx tsc --noEmit --project .
		npx eslint --report-unused-disable-directives src
	)
}

test-frontend() (
	ensure-node_modules frontend
	cd frontend
	npx jest
)

update-browserslist() (
	cd frontend
	npx browserslist@latest --update-db
)

###
# Documentation
###

serve-docs() {
	ensure-venv
	source venv/bin/activate
	cd docs
	PYTHONPATH=. exec mkdocs serve --dev-addr "127.0.0.1:${PORT:-3042}"
}

build-docs() (
	ensure-venv
	source venv/bin/activate
	cd docs
	PYTHONPATH=. mkdocs build
)

###
# End-to-end Testing
###

test-e2e() (
	ensure-venv
	ensure-node_modules e2e-tests
	rm -rf e2e-tests/{logs,trail}
	source venv/bin/activate
	cd e2e-tests
	time python3 run.py
)

test-ui() {
	build-all
	cd ui-tests
	if [[ package.json -nt yarn.lock ]]; then
		yarn install
	fi
	cp -v ../prestige .

	docker compose -f ../backend/docker-compose.yaml pull
	docker compose -f ../backend/docker-compose.yaml up -d

	n=4
	while [[ $n -gt 0 ]]; do
		if docker compose -f ../backend/docker-compose.yaml exec mongo mongosh "mongodb://user:pass@localhost/ui-tests?authSource=admin" --quiet --eval "$(cat ../backend/apitests/mongodb-test-data.js)"; then
			break
		fi
		sleep 3
		n=$((n-1))
	done

	DEBUG=pw:webserver yarn playwright test
}

###
# Miscellaneous / Project-wide targets
###

ensure-venv() {
	if [[ -f venv/make_sentinel && -f venv/bin/pip-compile && requirements.in -ot venv/make_sentinel && requirements.txt -ot venv/make_sentinel && requirements-dev.txt -ot venv/make_sentinel ]]; then
		return
	fi
	if [[ ! -d venv ]]; then
		python3 -m venv --prompt prestige venv
	fi
	(
		source venv/bin/activate
		pip install pip-tools
		pip-compile requirements.in
		pip install -r requirements.txt
		pip install -r requirements-dev.txt
	)
	touch venv/make_sentinel
}

ensure-node_modules() {
	at="$1"
	if [[ -e $at/node_modules/make_sentinel && $at/package.json -ot $at/node_modules/make_sentinel && $at/yarn.lock -ot $at/node_modules/make_sentinel ]]; then
		return
	fi
	if ! type yarn; then npm install -g yarn; fi
	if [[ $at/package.json -nt $at/yarn.lock ]]; then
		(cd "$at" && yarn install)
	else
		(cd "$at" && yarn install --frozen-lockfile)
	fi
	touch "$at/node_modules/make_sentinel"
}

test-all() {
	lint-frontend
	test-frontend
	 lint-backend
	test-backend
	test-e2e
}

outdated() (
	# TODO: Check for backend as well.
	cd frontend
	yarn outdated
)

deps() {
	ensure-venv
	ensure-node_modules frontend
	ensure-node_modules e2e-tests
}

upgrade-deps() (
	# TODO: Don't attempt stop/start frontend, if isn't already running.
	cd frontend
	../venv/bin/supervisorctl stop prestige:frontend
	yarn upgrade --latest
	../venv/bin/supervisorctl start prestige:frontend
	# TODO: Upgrade dependencies for backend as well.
)

start() (
	ensure-venv
	if [[ -e supervisord.pid ]]; then
		if ! curl -sS localhost:3044 >&/dev/null; then
			echo "Looks like an unclean exit was done. Cleaning up and trying to start again."
			rm supervisord.pid
			start
			return
		fi
		echo 'Already running.'
	else
		if [[ -f dev.env ]]; then
			set -a
			source dev.env
			set +a
		fi
		mkdir -pv logs
		venv/bin/supervisord
		echo 'Just started.'
	fi
	echo -e 'App available at <http://localhost:3040>.\nProcess monitor at <http://localhost:3044>.'
)

stop() (
	ensure-venv
	if [[ -e supervisord.pid ]]; then
		kill "$(venv/bin/supervisorctl pid)"
		echo 'Just stopped.'
		sleep 2s
	else
		echo 'Already stopped.'
	fi
)

restart() {
	stop
	start
}

build-all() (
	build-frontend
	rm -rf backend/assets/static
	mv frontend/dist backend/assets/static
	build-docs
	mv docs/site backend/assets/static/docs
	build-backend
)

upload-package() (
	tar -caf package.tar.gz prestige
	du -sh prestige package.tar.gz || true
	aws s3 cp package.tar.gz s3://ssk-artifacts/prestige-package.tar.gz
)

cd "$(dirname "$0")"
"$@"
