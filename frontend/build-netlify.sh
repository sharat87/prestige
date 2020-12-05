#!/bin/sh

yarn \
	&& yarn run build

cd ../backend \
	&& pip install -r ../requirements.txt \
	&& PRESTIGE_SECRET_KEY=fake-secret-key PRESTIGE_CORS_ORIGINS= python manage.py collectstatic \
	&& mv static ../frontend/dist/
