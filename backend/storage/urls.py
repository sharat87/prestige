from django.urls import path

from . import views

urlpatterns = [
	path("", views.StorageCrud.as_view(), name="crud"),
	path("<slug:slug>", views.StorageCrud.as_view(), name="crud_single"),
	path('patch/<slug:slug>', views.patch_view, name='patch_view'),
]
