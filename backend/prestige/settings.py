import os
from pathlib import Path

import dj_database_url

# Build paths inside the project like this: BASE_DIR / "subdir".
BASE_DIR = Path(__file__).resolve().parent.parent

ENV = os.getenv("PRESTIGE_ENV", "prod")
IS_PROD = ENV == "prod"

# Quick-start development settings - unsuitable for production
# See https://docs.djangoproject.com/en/3.1/howto/deployment/checklist/

if IS_PROD:
	_missing_env_vars = {
		"PRESTIGE_DATABASE_URL",
		"PRESTIGE_SECRET_KEY",
	} - os.environ.keys()

	if _missing_env_vars:
		raise ValueError("Missing required env vars: %r" % _missing_env_vars)

# SECURITY WARNING: keep the secret key used in production secret!
SECRET_KEY = (
	os.getenv("PRESTIGE_SECRET_KEY")
	if IS_PROD
	else "=sez4lhfn@nh86)ylzgl(5k*5kkd+la(dzfsisvdk9ezj2958-"
)
if not SECRET_KEY:
	raise ValueError("Missing secret key. Please set the env variable PRESTIGE_SECRET_KEY.")

# SECURITY WARNING: don't run with debug turned on in production!
DEBUG = not IS_PROD

if not DEBUG:
	# This has a good default when DEBUG is `True`.
	ALLOWED_HOSTS = [
		s.strip() for s in os.getenv("PRESTIGE_ALLOWED_HOSTS", "").split(",")
		if s and not s.isspace()
	]

# Application definition

INSTALLED_APPS = [
	"django.contrib.admin",
	"django.contrib.auth",
	"django.contrib.contenttypes",
	"django.contrib.sessions",
	"django.contrib.messages",
	"django.contrib.staticfiles",
	"proxy",
	"auth_api",
	"storage",
	"gist",
]

MIDDLEWARE = [
	"django.middleware.security.SecurityMiddleware",
	"django.contrib.sessions.middleware.SessionMiddleware",
	"django.middleware.common.CommonMiddleware",
	"django.middleware.csrf.CsrfViewMiddleware",
	"django.contrib.auth.middleware.AuthenticationMiddleware",
	"django.contrib.messages.middleware.MessageMiddleware",
	"django.middleware.clickjacking.XFrameOptionsMiddleware",
	"prestige.middlewares.parsed_body.ParsedBodyMiddleware",
]

AUTH_USER_MODEL = "auth_api.User"

ROOT_URLCONF = "prestige.urls"

TEMPLATES = [
	{
		"BACKEND": "django.template.backends.django.DjangoTemplates",
		"DIRS": [],
		"APP_DIRS": True,
		"OPTIONS": {
			"context_processors": [
				"django.template.context_processors.debug",
				"django.template.context_processors.request",
				"django.contrib.auth.context_processors.auth",
				"django.contrib.messages.context_processors.messages",
			],
		},
	},
]

WSGI_APPLICATION = "prestige.wsgi.application"


# Database
# https://docs.djangoproject.com/en/3.1/ref/settings/#databases
if IS_PROD:
	DATABASES = {
		# This will parse the values of the PRESTIGE_DATABASE_URL environment variable into Django's DB config format.
		# For SQLite, set `PRESTIGE_DATABASE_URL=sqlite:///path/to/folder/db.sqlite3`
		"default": dj_database_url.config(env="PRESTIGE_DATABASE_URL", conn_max_age=600),
	}

else:
	DATABASES = {
		"default": {
			"ENGINE": "django.db.backends.sqlite3",
			"NAME": ":memory:" if ENV == "test" else "db.sqlite3",
		},
	}


# Password validation
# https://docs.djangoproject.com/en/3.1/ref/settings/#auth-password-validators
AUTH_PASSWORD_VALIDATORS = [
	{
		"NAME": "django.contrib.auth.password_validation.MinimumLengthValidator",
	},
	{
		"NAME": "prestige.password_validation.MaximumLengthValidator",
	},
]


# Logging
# https://docs.djangoproject.com/en/3.1/topics/logging/
LOGGING = {
	"version": 1,
	"disable_existing_loggers": False,
	"formatters": {
		"verbose": {
			"format": "{asctime} {levelname} {name} {message}",
			"style": "{",
			"datefmt": "%Y.%m.%d.%H.%M.%S.%j",
		},
	},
	"handlers": {
		"console": {
			"class": "logging.StreamHandler",
			"formatter": "verbose",
		},
		"mail_admins": {
			"level": "ERROR",
			"class": "django.utils.log.AdminEmailHandler",
		},
	},
	"loggers": {
		"django": {
			"handlers": ["console"],
			"level": "WARNING",
			"propagate": True,
		},
		"django.request": {
			"handlers": ["console", "mail_admins"],
			"level": "ERROR" if ENV == "test" else "DEBUG",
			"propagate": False,
		},
		"urllib3": {
			"handlers": ["console"],
			"level": "WARNING",
			"propagate": True,
		},
		"gunicorn.error": {
			"handlers": ["console"],
			"level": "INFO",
			"propagate": True,
		},
	},
	"root": {
		"handlers": ["console", "mail_admins"],
		"level": "ERROR" if ENV == "test" or IS_PROD else "DEBUG",
	},
}

# Internationalization
# https://docs.djangoproject.com/en/3.1/topics/i18n/

LANGUAGE_CODE = "en-us"

TIME_ZONE = "UTC"

USE_I18N = True

USE_L10N = True

USE_TZ = True

# Static files (CSS, JavaScript, Images)
# https://docs.djangoproject.com/en/3.1/howto/static-files/

STATIC_ROOT = BASE_DIR / "static"
STATIC_URL = "/static/"


PROXY_DISALLOW_HOSTS = {
	s.strip()
	for s in os.getenv("PRESTIGE_PROXY_DISALLOW_HOSTS", "localhost, 127.0.0.1").split(",")
	if not s.isspace()
} if IS_PROD else None


if IS_PROD:
	SECURE_PROXY_SSL_HEADER = "HTTP_X_FORWARDED_PROTO", "https"
	SECURE_SSL_REDIRECT = True

	# Ref: <https://docs.djangoproject.com/en/3.2/ref/middleware/#referrer-policy>.
	SECURE_REFERRER_POLICY = ["same-origin", "origin-when-cross-origin", "strict-origin-when-cross-origin"]

	SESSION_COOKIE_SECURE = CSRF_COOKIE_SECURE = True


GITHUB_CLIENT_ID = os.getenv("GITHUB_CLIENT_ID", None)
GITHUB_CLIENT_SECRET = os.getenv("GITHUB_CLIENT_SECRET", None)
