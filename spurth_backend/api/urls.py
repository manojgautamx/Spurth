from django.urls import path, include
from .views import PublicUserSearchView, firebase_token, forgot_password, register, CreateActivityView, MyActivitiesView, PublicActivitiesView, CustomTokenObtainPairView, join_activity, joined_activities, resend_verification, reset_password, change_password, update_activity, leave_activity, activity_status, delete_activity, can_enter_chat, me, verify_email, view_user_profile, cancel_activity, activity_detail, delete_post, remove_participant, user_activities, verify_email_redirect, forgot_password, reset_password, send_invite, UserProfileCreateView, ProfileStatusView, UpdateProfileView, CommentViewSet, PhoneVerificationConfirmView, deactivate_account, delete_account, contact_support, respond_join_request, list_join_requests, cancel_join_request
from rest_framework_simplejwt.views import TokenRefreshView
from django.conf import settings
from django.conf.urls.static import static
from rest_framework.routers import DefaultRouter
from .views import PostViewSet
from .views import google_auth
from .views import set_username, check_username, get_notifications, mark_notification_read, mark_all_read
from .views import cloudinary_moderation_webhook
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
    path('check-username/', check_username, name='check-username'),
    path('cloudinary-webhook/', cloudinary_moderation_webhook, name='cloudinary-webhook'),
    path('token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('create-activity/', CreateActivityView.as_view(), name='create-activity'),
    path('my-activities/', MyActivitiesView.as_view(), name='my-activities'),
    path('token/', CustomTokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('api/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('public-activities/', PublicActivitiesView.as_view(), name='public-activities'),
    path('join-activity/<int:activity_id>/', join_activity, name='join-activity'),
    path('joined-activities/', joined_activities, name='joined-activities'),
    path('update-activity/<int:activity_id>/', update_activity, name='update-activity'),
    # ✅ User profile endpoints
    path('profile/', UserProfileCreateView.as_view(), name='user-profile'),
    path('profile/status/', ProfileStatusView.as_view(), name='profile-status'),
    path('profile/update/', UpdateProfileView.as_view(), name='update-profile'),
    path('leave-activity/<int:activity_id>/', leave_activity, name='leave-activity'),
    path('activity-status/<int:activity_id>/', activity_status, name='activity-status'),
    path('delete-activity/<int:activity_id>/', delete_activity, name='delete-activity'),
    path('can-enter-chat/<int:activity_id>/', can_enter_chat, name='can-enter-chat'),
    path('profile/<str:username>/', view_user_profile),
    path('me/', me),
    path('users/', PublicUserSearchView.as_view(), name='user-search'),
    path('', include(router.urls)),
    path('posts/<int:post_pk>/comments/', comment_list, name='post-comments'),
    path('comments/<int:pk>/', comment_detail, name='comment-detail'),
    path('cancel-activity/<int:pk>/', cancel_activity),
    path('activity-detail/<int:activity_id>/', activity_detail, name='activity-detail'),
    path('delete-post/<int:post_id>/', delete_post, name='delete-post'),
    path('remove-participant/<int:activity_id>/<int:user_id>/', remove_participant, name='remove-participant'),
    path('firebase-token/', firebase_token),  # becomes /api/firebase-token/
    path('user-activities/<str:username>/', user_activities, name='user-activities'),
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
    path('change-password/', change_password, name='change-password'),
    path('invite/', send_invite, name='send-invite'),
    path('respond-join-request/<int:request_id>/', respond_join_request, name='respond-join-request'),
    path('join-requests/<int:activity_id>/', list_join_requests, name='list-join-requests'),
    path('cancel-join-request/<int:activity_id>/', cancel_join_request, name='cancel-join-request'),
    path('verification/phone/confirm/', PhoneVerificationConfirmView.as_view(), name='phone-verification-confirm'),
    path('account/deactivate/', deactivate_account, name='account-deactivate'),
    path('account/delete/', delete_account, name='account-delete'),
    path('support/contact/', contact_support, name='support-contact'),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
