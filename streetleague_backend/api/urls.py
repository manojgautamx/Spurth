from django.urls import path
from .views import register, CreateLeagueView, MyLeaguesView
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

urlpatterns = [
    path('register/', register, name='register'),  # Ensure this is correct
    path('token/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('create-league/', CreateLeagueView.as_view(), name='create-league'),
    path('my-leagues/', MyLeaguesView.as_view(), name='my-leagues'),
]
