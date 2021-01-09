serve-backend: backend/venv
	@cd backend \
		&& source venv/bin/activate \
		&& set -e && source env.sh && set +e \
		&& python manage.py runserver 127.0.0.1:3041

test-backend:
	@cd backend \
		&& source venv/bin/activate \
		&& PRESTIGE_UNIVERSE=test \
			python manage.py test

serve-frontend:
	@cd frontend && yarn && yarn start

test-frontend:
	@cd frontend && yarn install --frozen-lockfile && npx jest

test-e2e:
	@cd e2e-tests && python3 run.py

test-all: test-frontend test-backend test-e2e

makemigrations migrate: backend/venv
	@cd backend \
		&& source venv/bin/activate \
		&& set -e && source env.sh && set +e \
		&& python manage.py $@

backend/venv: requirements.txt
	@mkdir -p backend
	@test -d backend/venv || python3 -m venv --prompt prestige backend/venv
	@source backend/venv/bin/activate \
	@pip install -r requirements.txt

.PHONY: serve-backend serve-frontend test-all test-frontend test-backend test-e2e
