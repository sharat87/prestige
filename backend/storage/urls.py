from django.urls import path

from . import views

urlpatterns = [
	path("", views.index_view, name="crud"),
	path("<slug:slug>", views.single_view, name="crud_single"),
]
