from django.urls import path
from .views import register, CreateLeagueView, MyLeaguesView, PublicLeaguesView, join_league, joined_leagues, update_league, UserProfileCreateView, ProfileStatusView, UpdateProfileView
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from django.conf import settings
from django.conf.urls.static import static

urlpatterns = [
    path('register/', register, name='register'),  # Ensure this is correct
    path('token/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('create-league/', CreateLeagueView.as_view(), name='create-league'),
    path('my-leagues/', MyLeaguesView.as_view(), name='my-leagues'),
    path('api/token/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('api/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('public-leagues/', PublicLeaguesView.as_view(), name='public-leagues'),
    path('join-league/<int:league_id>/', join_league, name='join-league'),
    path('joined-leagues/', joined_leagues, name='joined-leagues'),
    path('update-league/<int:league_id>/', update_league, name='update-league'),
    # ✅ User profile endpoints
    path('profile/', UserProfileCreateView.as_view(), name='user-profile'),
    path('profile/status/', ProfileStatusView.as_view(), name='profile-status'),
    path('profile/update/', UpdateProfileView.as_view(), name='update-profile'),
]

