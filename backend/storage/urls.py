from django.urls import path

from . import views

urlpatterns = [
	path("", views.DocumentCrud.as_view(), name="crud"),
	path("<slug:slug>", views.DocumentCrud.as_view(), name="crud_single"),
]
