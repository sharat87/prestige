"""prestige URL Configuration

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/3.1/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""

from django.contrib import admin
from django.urls import include, path

handler400 = "prestige.error_handlers.handler400"
handler500 = "prestige.error_handlers.handler500"

urlpatterns = [
    path('', include("proxy.urls")),  # Deprecated.
    path('proxy/', include("proxy.urls")),
    path('storage/', include("storage.urls")),
    path('auth/', include("auth_api.urls")),
    path('oauth/', include("oauth2_provider.urls", namespace='oauth2_provider')),
    path('a/', admin.site.urls),
]
