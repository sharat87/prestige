serve-backend:
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
	@cd frontend && yarn && yarn test

test-e2e:
	@cd e2e-tests && python3 run.py

test-all: test-frontend test-backend test-e2e

.PHONY: serve-backend serve-frontend test-all test-frontend test-backend test-e2e
