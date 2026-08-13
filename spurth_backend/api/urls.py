from django.urls import path, include
from .views import PublicUserSearchView, firebase_token, forgot_password, register, CreateLeagueView, MyLeaguesView, PublicLeaguesView, CustomTokenObtainPairView, join_league, joined_leagues, resend_verification, reset_password, update_league, leave_league, league_status, delete_league, can_enter_chat, me, verify_email, view_user_profile, cancel_league, league_detail, delete_post, remove_participant, user_leagues, verify_email_redirect, forgot_password, reset_password, send_invite, UserProfileCreateView, ProfileStatusView, UpdateProfileView, CommentViewSet
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from django.conf import settings
from django.conf.urls.static import static
from rest_framework.routers import DefaultRouter
from .views import PostViewSet
from .views import google_auth
from .views import set_username, get_notifications, mark_notification_read, mark_all_read
from .serializers import NotificationSerializer

router = DefaultRouter()
router.register(r'posts', PostViewSet, basename='post')

comment_list = CommentViewSet.as_view({
    'get': 'list',
    'post': 'create',
}) 

comment_detail = CommentViewSet.as_view({
    'delete': 'destroy',
})

urlpatterns = [
    path('register/', register, name='register'),  # Ensure this is correct
    path('token/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('create-league/', CreateLeagueView.as_view(), name='create-league'),
    path('my-leagues/', MyLeaguesView.as_view(), name='my-leagues'),
    path('token/', CustomTokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('api/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('public-leagues/', PublicLeaguesView.as_view(), name='public-leagues'),
    path('join-league/<int:league_id>/', join_league, name='join-league'),
    path('joined-leagues/', joined_leagues, name='joined-leagues'),
    path('update-league/<int:league_id>/', update_league, name='update-league'),
    # ✅ User profile endpoints
    path('profile/', UserProfileCreateView.as_view(), name='user-profile'),
    path('profile/status/', ProfileStatusView.as_view(), name='profile-status'),
    path('profile/update/', UpdateProfileView.as_view(), name='update-profile'),
    path('leave-league/<int:league_id>/', leave_league, name='leave-league'),
    path('league-status/<int:league_id>/', league_status, name='league-status'),
    path('delete-league/<int:league_id>/', delete_league, name='delete-league'),
    path('can-enter-chat/<int:league_id>/', can_enter_chat, name='can-enter-chat'),
    path('profile/<int:user_id>/', view_user_profile),
    path('me/', me),
    path('users/', PublicUserSearchView.as_view(), name='user-search'),
    path('', include(router.urls)),
    path('posts/<int:post_pk>/comments/', comment_list, name='post-comments'),
    path('comments/<int:pk>/', comment_detail, name='comment-detail'),
    path('cancel-league/<int:pk>/', cancel_league),
    path('league-detail/<int:league_id>/', league_detail, name='league-detail'),
    path('delete-post/<int:post_id>/', delete_post, name='delete-post'),
    path('remove-participant/<int:league_id>/<int:user_id>/', remove_participant, name='remove-participant'),
    path('firebase-token/', firebase_token),  # becomes /api/firebase-token/
    path('user-leagues/<int:user_id>/', user_leagues, name='user-leagues'),
    path('auth/google/', google_auth),
    path('set-username/', set_username),
    path('notifications/', get_notifications),
    path('notifications/<int:notification_id>/read/', mark_notification_read),
    path('notifications/read-all/', mark_all_read),
    path('verify-email/', verify_email),
    path('resend-verification/', resend_verification),
    path('verify-email-redirect/', verify_email_redirect),
    path('forgot-password/', forgot_password),
    path('reset-password/', reset_password),
    path('invite/', send_invite, name='send-invite'),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)