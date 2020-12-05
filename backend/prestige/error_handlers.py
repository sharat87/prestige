import logging
import sys
from http import HTTPStatus

from django.http import JsonResponse


log = logging.getLogger(__name__)


def handler400(request, exception):
	log.error("400 at %r.", request.path, exc_info=exception)
	return JsonResponse({
		"ok": False,
		"error": str(exception),
	}, status=HTTPStatus.BAD_REQUEST)


def handler500(request):
	exception = sys.exc_info()
	log.error("500 at %r.", request.path, exc_info=exception)
	return JsonResponse({
		"ok": False,
		"error": str(exception),
	}, status=HTTPStatus.INTERNAL_SERVER_ERROR)
