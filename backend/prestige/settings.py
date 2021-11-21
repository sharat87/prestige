import os
from pathlib import Path

import dj_database_url

# Build paths inside the project like this: BASE_DIR / "subdir".
BASE_DIR = Path(__file__).resolve().parent.parent

# SECURITY WARNING: don't run with debug turned on in production!
ENV = os.getenv("PRESTIGE_ENV", "prod")
DEBUG = ENV != "prod"


def get_prod_env(var_name: str, default: str) -> str:
	"""
	Return the value of the environment variable `var_name`. If that variable is missing, raise an error on prod, or
	return `default` otherwise.
	"""
	value = (os.getenv(var_name, default) if DEBUG else os.environ[var_name]).strip()
	if not value:
		raise ValueError(f"Empty value for {var_name}. Please provide a non-empty value.")
	return value


# Quick-start development settings - unsuitable for production
# See https://docs.djangoproject.com/en/3.1/howto/deployment/checklist/

# SECURITY WARNING: keep the secret key used in production secret!
SECRET_KEY = get_prod_env(
	"PRESTIGE_SECRET_KEY",
	# This is a dev-mode secret key. Do NOT use this on production.
	"=sez4lhfn@nh86)ylzgl(5k*5kkd+la(dzfsisvdk9ezj2958-",
)
if not SECRET_KEY:
	raise ValueError("Missing secret key. Please set the env variable PRESTIGE_SECRET_KEY.")

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
DATABASES = {
	"default": dj_database_url.parse(
		get_prod_env("DATABASE_URL", "sqlite:///" + (":memory:" if ENV == "test" else "db.sqlite3")),
		conn_max_age=600,
	),
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
		"gunicorn": {
			"handlers": ["console"],
			"level": "INFO",
			"propagate": True,
		},
	},
	"root": {
		"handlers": ["console", "mail_admins"],
		"level": "ERROR" if ENV == "test" or not DEBUG else "DEBUG",
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


if DEBUG:
	PROXY_DISALLOW_HOSTS = set()
else:
	PROXY_DISALLOW_HOSTS = {
		s.strip()
		for s in os.getenv("PRESTIGE_PROXY_DISALLOW_HOSTS", "localhost, 127.0.0.1").split(",")
		if not s.isspace()
	}
	PROXY_DISALLOW_HOSTS.update(ALLOWED_HOSTS)


if not DEBUG:
	SECURE_PROXY_SSL_HEADER = "HTTP_X_FORWARDED_PROTO", "https"
	SECURE_SSL_REDIRECT = True

	# Ref: <https://docs.djangoproject.com/en/3.2/ref/middleware/#referrer-policy>.
	SECURE_REFERRER_POLICY = ["same-origin", "origin-when-cross-origin", "strict-origin-when-cross-origin"]

	SESSION_COOKIE_SECURE = CSRF_COOKIE_SECURE = True


EXT_URL_PREFIX = (os.getenv("PRESTIGE_EXT_URL_PREFIX", None) or "").strip()

# Create on at <https://github.com/settings/developers>.
# Callback URL is <http://localhost:3045/auth/github/callback>.
GITHUB_CLIENT_ID = os.getenv("GITHUB_CLIENT_ID", None)
GITHUB_CLIENT_SECRET = os.getenv("GITHUB_CLIENT_SECRET", None)


# From <https://console.cloud.google.com/iam-admin/settings>.
RECAPTCHA_PROJECT_ID = os.getenv("RECAPTCHA_PROJECT_ID", None)
# From <https://console.cloud.google.com/security/recaptcha>.
RECAPTCHA_SITE_KEY = os.getenv("RECAPTCHA_SITE_KEY", None)
# From <https://console.cloud.google.com/apis/credentials>.
RECAPTCHA_API_KEY = os.getenv("RECAPTCHA_API_KEY", None)


# Generate a key with `python -c 'from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())'`
ACCESS_TOKEN_ENCRYPTION_KEY = get_prod_env(
	"ACCESS_TOKEN_ENCRYPTION_KEY",
	# Default to a dummy encryption key, when not in production.
	"eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHg=",
)
