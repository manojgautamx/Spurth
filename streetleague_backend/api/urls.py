from django.urls import path
from .views import register
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from .views import CreateLeagueView


urlpatterns = [
    path('register/', register, name='register'),  # Ensure this is correct
    path('token/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('create-league/', CreateLeagueView.as_view(), name='create-league'),
]
