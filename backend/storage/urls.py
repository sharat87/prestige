from django.urls import path

from . import views

urlpatterns = [
	path('ls', views.ls_view, name='ls_view'),
	path('get/<slug:slug>', views.get_view, name='get_view'),
	path('patch/<slug:slug>', views.patch_view, name='patch_view'),
]
