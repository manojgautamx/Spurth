from django.contrib import admin
from django.urls import path, include

urlpatterns = [
    path('admin/', admin.site.urls),  # ✅ this line enables the admin panel
    path('api/', include('api.urls')),  # your API routes
]
