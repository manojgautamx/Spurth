from rest_framework.response import Response
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.views import APIView
from rest_framework import status, permissions
from django.contrib.auth import get_user_model
from django.db.models import Q
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from rest_framework.generics import ListAPIView
import json
import re
from django.http import HttpResponse, HttpResponseRedirect
from rest_framework import viewsets
from rest_framework.decorators import action
from django.db.models import Count

from django.utils import timezone
from django.db import IntegrityError
from datetime import timedelta
from rest_framework.exceptions import ValidationError
from django.shortcuts import get_object_or_404
from rest_framework_simplejwt.views import TokenObtainPairView

from firebase_admin import auth as firebase_auth
import firebase_config  # triggers initialization
from rest_framework.throttling import ScopedRateThrottle

from google.oauth2 import id_token
from google.auth.transport import requests as google_requests

from django.core.mail import send_mail, EmailMessage
from django.conf import settings
from .models import EmailVerificationToken, generate_verification_code
from django.contrib.auth.backends import ModelBackend

User = get_user_model()

# Same bounds enforced in SignupScreen.js — keep both in sync.
USERNAME_MIN_LENGTH = 3
USERNAME_MAX_LENGTH = 20
USERNAME_RE = re.compile(r'^[a-zA-Z0-9_.-]+$')

from rest_framework_simplejwt.tokens import RefreshToken
from .serializers import CommentSerializer, ActivitySerializer, NotificationSerializer, PostSerializer, UserProfileSerializer, PublicUserProfileSerializer, PublicUserSerializer, CustomTokenObtainPairSerializer, ActivityJoinRequestSerializer
from .models import Activity, Like, Post, UserProfile, Comment, Notification, Poll, PollChoice, PollVote, ActivityJoinRequest
from .moderation import trigger_image_moderation
import cloudinary.utils

@api_view(['POST'])
@permission_classes([AllowAny])
def google_auth(request):
    token = request.data.get('id_token')
    try:
        info = id_token.verify_oauth2_token(
            token,
            google_requests.Request(),
            '23044304139-qa1ni7ln2r3keke8aash7n90vmuctp6e.apps.googleusercontent.com'
        )
        email = info['email']
        name = info.get('name', '')
        picture = info.get('picture', '')

        # Generate a unique username from email
        base_username = email.split('@')[0].replace('.', '_')
        username = base_username
        counter = 1
        while User.objects.filter(username=username).exists():
            username = f"{base_username}{counter}"
            counter += 1

        user, created = User.objects.get_or_create(email=email, defaults={'username': username})
        if created or not user.email_verified:
            user.email_verified = True  # Google already verified it
            user.save()
        UserProfile.objects.get_or_create(user=user)

        refresh = RefreshToken.for_user(user)
        return Response({
            'access': str(refresh.access_token),
            'refresh': str(refresh),
            'is_new_user': created,
        })
    except Exception as e:
        return Response({'detail': str(e)}, status=400)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def set_username(request):
    username = request.data.get('username', '').strip()
    if not username:
        return Response({'detail': 'Username required.'}, status=400)
    if User.objects.filter(username=username).exclude(id=request.user.id).exists():
        return Response({'detail': 'Username already taken.'}, status=400)
    request.user.username = username
    request.user.save()
    return Response({'detail': 'Username updated.'})


# Live availability check while typing on the signup screen. Mirrors the
# exact checks register() enforces below, so a "available" response here
# is never contradicted by register() rejecting it moments later.
@api_view(['GET'])
@permission_classes([AllowAny])
def check_username(request):
    username = request.query_params.get('username', '').strip()

    if len(username) < USERNAME_MIN_LENGTH:
        return Response({'available': False, 'detail': f'At least {USERNAME_MIN_LENGTH} characters.'})
    if len(username) > USERNAME_MAX_LENGTH:
        return Response({'available': False, 'detail': f'At most {USERNAME_MAX_LENGTH} characters.'})
    if not USERNAME_RE.match(username):
        return Response({'available': False, 'detail': 'Only letters, numbers, _ . - allowed.'})

    taken = User.objects.filter(username__iexact=username).exists()
    return Response({'available': not taken, 'detail': 'Username already taken.' if taken else ''})


# User Registration View
@api_view(['POST'])
@permission_classes([AllowAny])
def register(request):
    username = request.data.get('username', '').strip()
    email = request.data.get('email')
    password = request.data.get('password')

    if not username or not email or not password:
        return Response({'detail': 'Username, email, and password are required.'}, status=status.HTTP_400_BAD_REQUEST)

    if len(username) < USERNAME_MIN_LENGTH or len(username) > USERNAME_MAX_LENGTH:
        return Response(
            {'detail': f'Username must be {USERNAME_MIN_LENGTH}-{USERNAME_MAX_LENGTH} characters.'},
            status=status.HTTP_400_BAD_REQUEST,
        )

    if not USERNAME_RE.match(username):
        return Response({'detail': 'Username can only contain letters, numbers, _ . -'}, status=status.HTTP_400_BAD_REQUEST)

    # iexact — a case-only variant of an existing username (e.g. "JohnDoe"
    # vs "johndoe") must be rejected too, otherwise CustomTokenObtainPairSerializer's
    # case-insensitive login lookup can no longer tell the two accounts apart.
    if User.objects.filter(username__iexact=username).exists():
        return Response({'detail': 'Username already taken.'}, status=status.HTTP_400_BAD_REQUEST)

    if User.objects.filter(email=email).exists():
        return Response({'detail': 'Email already in use.'}, status=status.HTTP_400_BAD_REQUEST)

    user = User.objects.create_user(username=username, email=email, password=password)
    # Every user needs a UserProfile row from the moment they exist — without
    # this, view_user_profile 404s with "Profile not found" for anyone who
    # hasn't finished the onboarding wizard yet (UserProfile is only
    # otherwise created there), even when viewing their own profile.
    UserProfile.objects.get_or_create(user=user)

    refresh = RefreshToken.for_user(user)
    # Deliberately not sending a verification email here — it now only goes
    # out when the user reaches Home and taps "Verify your email" themselves
    # (EmailVerificationScreen / HomeScreen's inline card), not automatically
    # at signup.
    return Response({
        'access': str(refresh.access_token),
        'refresh': str(refresh),
    }, status=status.HTTP_201_CREATED)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def firebase_token(request):
    uid = str(request.user.id)  # matches userId you already use in chat
    token = firebase_auth.create_custom_token(uid)
    return Response({'firebase_token': token.decode('utf-8')})

# Create Activity View
class CreateActivityView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        if not request.user.phone_verified:
            return Response(
                {'detail': 'Host verification required', 'phone_verified': False},
                status=status.HTTP_403_FORBIDDEN
            )

        serializer = ActivitySerializer(data=request.data, context={'request': request})

        if serializer.is_valid():
            serializer.save(created_by=request.user)
            activity = serializer.instance

            if 'cover_image' in request.FILES:
                activity.moderation_status = trigger_image_moderation(activity.cover_image.public_id)
                activity.save(update_fields=['moderation_status'])

            # Notify users whose interests match the activity type
            activity_type = (activity.activity_type or '').lower()
            interested_users = User.objects.filter(
                profile__interests__icontains=activity_type
            ).exclude(id=request.user.id)

            create_notifications(
                recipients=list(interested_users),
                notification_type='new_event',
                title=f'🎉 New {activity.activity_type} event near you',
                body=f'{activity.name} has been posted. Check it out!',
                activity=activity,
            )

            return Response(
                ActivitySerializer(activity, context={'request': request}).data,
                status=status.HTTP_201_CREATED
            )

        print("Validation errors:", serializer.errors)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


# Phone (host) verification — client verifies the OTP with Firebase directly,
# then hands us the resulting ID token so we can confirm it server-side and
# trust the phone_number claim it carries.
class PhoneVerificationConfirmView(APIView):
    permission_classes = [IsAuthenticated]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = 'verification'

    def post(self, request):
        id_token = request.data.get('id_token')
        if not id_token:
            return Response({'detail': 'id_token is required'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            decoded = firebase_auth.verify_id_token(id_token)
        except Exception:
            return Response({'detail': 'Invalid or expired verification token'}, status=status.HTTP_400_BAD_REQUEST)

        phone_number = decoded.get('phone_number')
        if not phone_number:
            return Response({'detail': 'Token did not carry a verified phone number'}, status=status.HTTP_400_BAD_REQUEST)

        if User.objects.filter(phone_number=phone_number).exclude(id=request.user.id).exists():
            return Response({'detail': 'This phone number is already verified on another account'}, status=status.HTTP_409_CONFLICT)

        request.user.phone_number = phone_number
        request.user.phone_verified = True
        request.user.save(update_fields=['phone_number', 'phone_verified'])

        return Response({'phone_verified': True, 'phone_number': phone_number})


#email or username authentication backend
class EmailOrUsernameBackend(ModelBackend):
    def authenticate(self, request, username=None, password=None, **kwargs):
        try:
            # Allow either username or email in the username field
            user = User.objects.get(
                Q(username__iexact=username) | Q(email__iexact=username)
            )
        except User.DoesNotExist:
            return None
        except User.MultipleObjectsReturned:
            user = User.objects.filter(email__iexact=username).first()

        if user and user.check_password(password):
            return user
        return None

# List My Activities View
class MyActivitiesView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        activities = Activity.objects.filter(created_by=request.user) \
            .select_related('created_by__profile').prefetch_related('participants__profile')
        serializer = ActivitySerializer(activities, many=True, context={'request': request})
        return Response(serializer.data)

# List Public Activities View
class PublicActivitiesView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        # Get the list of joined activities
        joined_activity_ids = request.user.joined_activities.values_list('id', flat=True)

        # Exclude both created and joined activities.
        # select_related/prefetch_related here matter a lot: ActivitySerializer's
        # is_owner/is_full/joined/participants/participant_count fields were each
        # issuing their own separate query per activity (some even twice), so an
        # unoptimized list of ~20 activities meant 100+ sequential round-trips to
        # the DB — this was the actual cause of Explore taking 15-20s to load,
        # not just a slow query.
        activities = Activity.objects.exclude(
            Q(created_by=request.user) | Q(id__in=joined_activity_ids)
        ).select_related('created_by__profile').prefetch_related('participants__profile')

        serializer = ActivitySerializer(activities, many=True, context={'request': request})
        return Response(serializer.data)



# Join Activity View
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def join_activity(request, activity_id):
    try:
        activity = Activity.objects.get(id=activity_id)

        if activity.created_by == request.user:
            return Response(
                {'detail': 'Creator is already part of the activity.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        if activity.is_full():
            return Response(
                {'detail': 'Activity is full.'},
                status=status.HTTP_403_FORBIDDEN
            )

        if activity.participants.filter(id=request.user.id).exists():
            return Response(
                {'detail': 'You already joined this activity.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        if activity.date_time < timezone.now():
            raise ValidationError("This event has already concluded.")

        if activity.is_invite_only:
            # Anyone directly invited through the app (send_invite) skips the
            # request queue entirely — matched on any invite notification
            # ever sent for this (user, activity) pair, read or not, so
            # reading the notification without immediately joining doesn't
            # cost them their bypass eligibility.
            has_direct_invite = Notification.objects.filter(
                recipient=request.user, notification_type='invite', activity=activity,
            ).exists()

            if not has_direct_invite:
                jr, created = ActivityJoinRequest.objects.get_or_create(
                    activity=activity, user=request.user, defaults={'status': 'pending'},
                )
                if not created:
                    if jr.status == 'pending':
                        return Response(
                            {'detail': 'You already requested to join this activity.'},
                            status=status.HTTP_400_BAD_REQUEST,
                        )
                    if jr.status == 'declined':
                        cooldown_ends = jr.responded_at + timedelta(hours=24)
                        if timezone.now() < cooldown_ends:
                            return Response(
                                {'detail': 'You can request again 24 hours after being declined.'},
                                status=status.HTTP_400_BAD_REQUEST,
                            )
                        jr.status = 'pending'
                        jr.responded_at = None
                        jr.save(update_fields=['status', 'responded_at'])
                    # 'accepted' rows can't reach here — the already-joined
                    # check above catches that case first.

                create_notifications(
                    recipients=[activity.created_by],
                    notification_type='join_request',
                    title='New join request',
                    body=f'@{request.user.username} requested to join "{activity.name}"',
                    activity=activity,
                )
                return Response(
                    {'detail': 'Join request sent.', 'request_status': 'pending'},
                    status=status.HTTP_202_ACCEPTED,
                )

        activity.participants.add(request.user)

        serializer = ActivitySerializer(activity, context={'request': request})
        return Response(serializer.data, status=status.HTTP_200_OK)


    except Activity.DoesNotExist:
        return Response({'detail': 'Activity not found.'}, status=status.HTTP_404_NOT_FOUND)


# Leave Activity View
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def leave_activity(request, activity_id):
    try:
        activity = Activity.objects.get(id=activity_id)

        if request.user not in activity.participants.all():
            return Response({'detail': 'You are not part of this activity.'}, status=status.HTTP_400_BAD_REQUEST)

        activity.participants.remove(request.user)
        activity.save()

        # Return updated activity
        serializer = ActivitySerializer(activity, context={'request': request})
        return Response(serializer.data, status=status.HTTP_200_OK)

    except Activity.DoesNotExist:
        return Response({'detail': 'Activity not found.'}, status=status.HTTP_404_NOT_FOUND)

# Check Join Status
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def activity_status(request, activity_id):
    try:
        activity = Activity.objects.get(id=activity_id)
        joined = request.user in activity.participants.all()

        request_status = None
        if not joined and activity.is_invite_only:
            jr = activity.join_requests.filter(user=request.user, status='pending').first()
            if jr:
                request_status = 'pending'

        return Response({'joined': joined, 'request_status': request_status}, status=status.HTTP_200_OK)

    except Activity.DoesNotExist:
        return Response({'detail': 'Activity not found.'}, status=status.HTTP_404_NOT_FOUND)


# Owner reviews a pending join request
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def respond_join_request(request, request_id):
    action = request.data.get('action')
    if action not in ('accept', 'decline'):
        return Response({'detail': "action must be 'accept' or 'decline'."}, status=status.HTTP_400_BAD_REQUEST)

    try:
        jr = ActivityJoinRequest.objects.select_related('activity', 'user').get(id=request_id)
    except ActivityJoinRequest.DoesNotExist:
        return Response({'detail': 'Join request not found.'}, status=status.HTTP_404_NOT_FOUND)

    if jr.activity.created_by != request.user:
        return Response({'detail': 'Permission denied.'}, status=status.HTTP_403_FORBIDDEN)

    if jr.status != 'pending':
        return Response({'detail': 'This request has already been responded to.'}, status=status.HTTP_400_BAD_REQUEST)

    if action == 'accept':
        if jr.activity.is_full():
            return Response({'detail': 'Activity is now full.'}, status=status.HTTP_400_BAD_REQUEST)

        jr.activity.participants.add(jr.user)
        jr.status = 'accepted'
        jr.responded_at = timezone.now()
        jr.save(update_fields=['status', 'responded_at'])

        create_notifications(
            recipients=[jr.user],
            notification_type='request_accepted',
            title='Request accepted',
            body=f'Your request to join "{jr.activity.name}" was accepted.',
            activity=jr.activity,
        )
        return Response({'detail': 'Request accepted.'}, status=status.HTTP_200_OK)

    jr.status = 'declined'
    jr.responded_at = timezone.now()
    jr.save(update_fields=['status', 'responded_at'])

    create_notifications(
        recipients=[jr.user],
        notification_type='request_declined',
        title='Request declined',
        body=f'Your request to join "{jr.activity.name}" was declined.',
        activity=jr.activity,
    )
    return Response({'detail': 'Request declined.'}, status=status.HTTP_200_OK)


# Owner lists pending join requests for one of their activities
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def list_join_requests(request, activity_id):
    try:
        activity = Activity.objects.get(id=activity_id)
    except Activity.DoesNotExist:
        return Response({'detail': 'Activity not found.'}, status=status.HTTP_404_NOT_FOUND)

    if activity.created_by != request.user:
        return Response({'detail': 'Permission denied.'}, status=status.HTTP_403_FORBIDDEN)

    pending = activity.join_requests.filter(status='pending').select_related('user__profile')
    serializer = ActivityJoinRequestSerializer(pending, many=True, context={'request': request})
    return Response(serializer.data)


# Requester cancels their own pending join request
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def cancel_join_request(request, activity_id):
    jr = ActivityJoinRequest.objects.filter(
        activity_id=activity_id, user=request.user, status='pending'
    ).first()
    if not jr:
        return Response({'detail': 'No pending request found.'}, status=status.HTTP_400_BAD_REQUEST)

    jr.delete()
    return Response(status=status.HTTP_204_NO_CONTENT)

# List Joined Activities
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def joined_activities(request):
    activities = Activity.objects.filter(participants=request.user).exclude(created_by=request.user) \
        .select_related('created_by__profile').prefetch_related('participants__profile')
    serializer = ActivitySerializer(activities, many=True, context={'request': request})
    return Response(serializer.data)


# Update Activity View
@api_view(['PUT'])
@permission_classes([IsAuthenticated])
def update_activity(request, activity_id):
    try:
        activity = Activity.objects.get(id=activity_id)

        if activity.created_by != request.user:
            return Response({'detail': 'Permission denied.'}, status=status.HTTP_403_FORBIDDEN)

        old_datetime = activity.date_time
        serializer = ActivitySerializer(activity, data=request.data, partial=True, context={'request': request})

        if serializer.is_valid():
            serializer.save()

            if 'cover_image' in request.FILES:
                serializer.instance.moderation_status = trigger_image_moderation(serializer.instance.cover_image.public_id)
                serializer.instance.save(update_fields=['moderation_status'])

            # Fire reschedule notification if date changed
            new_datetime = serializer.instance.date_time
            if 'date_time' in request.data and old_datetime != new_datetime:
                participants = list(activity.participants.all())
                new_date_str = new_datetime.strftime('%d %b %Y at %I:%M %p')
                create_notifications(
                    recipients=participants,
                    notification_type='reschedule',
                    title=f'{activity.name} rescheduled',
                    body=f'The event has been moved to {new_date_str}.',
                    activity=activity,
                )

            return Response(serializer.data, status=status.HTTP_200_OK)

        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    except Activity.DoesNotExist:
        return Response({'detail': 'Activity not found.'}, status=status.HTTP_404_NOT_FOUND)


# Cloudinary calls this if its moderation add-on (Amazon Rekognition)
# doesn't resolve synchronously inside trigger_image_moderation()'s own
# explicit() call — there's no JWT on this request, so authenticity is
# verified via Cloudinary's own request-signing instead
# (X-Cld-Timestamp/X-Cld-Signature headers).
@api_view(['POST'])
@permission_classes([AllowAny])
def cloudinary_moderation_webhook(request):
    body_str = request.body.decode('utf-8')
    timestamp = request.headers.get('X-Cld-Timestamp')
    signature = request.headers.get('X-Cld-Signature')

    if not timestamp or not signature:
        return Response({'detail': 'Missing signature headers.'}, status=status.HTTP_400_BAD_REQUEST)

    try:
        valid = cloudinary.utils.verify_notification_signature(body_str, int(timestamp), signature)
    except Exception:
        valid = False

    if not valid:
        return Response({'detail': 'Invalid signature.'}, status=status.HTTP_400_BAD_REQUEST)

    payload = request.data
    if payload.get('notification_type') != 'moderation':
        return Response({'detail': 'Ignored.'}, status=status.HTTP_200_OK)

    public_id = payload.get('public_id', '')
    new_status = payload.get('moderation_status')  # 'approved' | 'rejected'
    if new_status not in ('approved', 'rejected'):
        return Response({'detail': 'Ignored.'}, status=status.HTTP_200_OK)

    # CloudinaryField(folder='activities'/'posts') means public_id is
    # prefixed accordingly — cheap way to know which table to check first.
    # The DB column stores the full resource string
    # ('image/upload/v<version>/<public_id>.<format>'), not the bare
    # public_id Cloudinary's payload gives us, so this has to be a
    # containment match rather than an exact one — collisions are
    # practically impossible given Cloudinary's randomly generated ids.
    instance = None
    owner = None
    if public_id.startswith('activities/'):
        instance = Activity.objects.filter(cover_image__contains=public_id).first()
        owner = instance.created_by if instance else None
    elif public_id.startswith('posts/'):
        instance = Post.objects.filter(image__contains=public_id).first()
        owner = instance.user if instance else None

    if not instance:
        return Response({'detail': 'No matching content.'}, status=status.HTTP_200_OK)

    instance.moderation_status = new_status
    instance.save(update_fields=['moderation_status'])

    if new_status == 'rejected':
        create_notifications(
            recipients=[owner],
            notification_type='content_flagged',
            title='Your photo was flagged',
            body='One of your photos was flagged by our moderation system and is hidden from other users. You can replace it any time.',
            activity=instance if isinstance(instance, Activity) else instance.activity,
        )

    return Response({'detail': 'ok'}, status=status.HTTP_200_OK)


@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def delete_activity(request, activity_id):
    try:
        activity = Activity.objects.get(id=activity_id)

        if activity.created_by != request.user:
            return Response(
                {'detail': 'You do not have permission to delete this activity.'},
                status=status.HTTP_403_FORBIDDEN
            )

        activity.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

    except Activity.DoesNotExist:
        return Response(
            {'detail': 'Activity not found.'},
            status=status.HTTP_404_NOT_FOUND
        )


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def can_enter_chat(request, activity_id):
    try:
        activity = Activity.objects.get(id=activity_id)

        is_creator = activity.created_by == request.user
        is_participant = activity.participants.filter(id=request.user.id).exists()

        return Response({
            "can_chat": is_creator or is_participant
        })
    except Activity.DoesNotExist:
        return Response({"detail": "Activity not found"}, status=404)


class UserProfileCreateView(APIView):
    permission_classes = [permissions.IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]

    def post(self, request):
        user = request.user
        profile, created = UserProfile.objects.get_or_create(user=user)
        serializer = UserProfileSerializer(profile, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save(user=user)
            return Response(serializer.data, status=status.HTTP_200_OK)
        print("Profile errors:", serializer.errors)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def get(self, request):
        user = request.user
        try:
            profile = user.profile
        except UserProfile.DoesNotExist:
            return Response({'detail': 'Profile not found.'}, status=status.HTTP_404_NOT_FOUND)
        serializer = UserProfileSerializer(profile)
        return Response(serializer.data)

class ProfileStatusView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        profile = getattr(user, 'profile', None)  # assuming OneToOneField to a Profile model
        if not profile:
            return Response({'profile_complete': False, 'phone_verified': False, 'can_host': False})

        # avatar intentionally excluded — the onboarding wizard's photo step
        # (ProfileScreen.js) lets users skip it with no validation, so
        # requiring it here would silently disagree with what the UI
        # actually enforces (surfacing as a confusing "kicked back to
        # onboarding" on the user's next session).
        required_fields = [profile.gender, profile.birth_date]
        is_complete = all(required_fields)
        return Response({
            'profile_complete': is_complete,
            'phone_verified': user.phone_verified,
            'can_host': user.phone_verified,
        })

@api_view(['GET'])
@permission_classes([AllowAny])
def view_user_profile(request, username):
    try:
        user = User.objects.get(username=username)
        if not hasattr(user, 'profile'):
            return Response({'detail': 'Profile not found for this user.'}, status=404)
        # Trimmed serializer for anonymous/public visitors — excludes
        # birth_date (only ever consumed by self-editing screens; the public
        # profile view only reads the already-computed `age` field).
        serializer = PublicUserProfileSerializer(user.profile)
        return Response(serializer.data)
    except User.DoesNotExist:
        return Response({'detail': 'User not found.'}, status=404)

@api_view(['GET'])
@permission_classes([AllowAny])
def user_activities(request, username):
    User = get_user_model()
    try:
        target = User.objects.get(username=username)
    except User.DoesNotExist:
        return Response({'detail': 'User not found.'}, status=404)
    created = Activity.objects.filter(created_by=target)
    joined = Activity.objects.filter(participants=target).exclude(created_by=target)
    return Response({
        'created': ActivitySerializer(created, many=True, context={'request': request}).data,
        'joined': ActivitySerializer(joined, many=True, context={'request': request}).data,
    })

# class UpdateProfileView(APIView):
#     permission_classes = [IsAuthenticated]

#     def put(self, request):
#         profile = request.user.profile
#         serializer = ProfileSerializer(profile, data=request.data, partial=True)
#         if serializer.is_valid():
#             serializer.save()
#             return Response(serializer.data)
#         return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


# views.py
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def me(request):
    profile = getattr(request.user, 'profile', None)
    avatar = None
    location = ''
    if profile and profile.avatar:
        try:
            avatar = profile.avatar.build_url(
                width=200,
                height=200,
                crop='fill',
                quality='auto',
                fetch_format='auto'
            )
        except Exception:
            avatar = None
    return Response({
        "id": request.user.id,
        "username": request.user.username,
        'email': request.user.email,           # ← add this
        'email_verified': request.user.email_verified,
        "avatar": avatar,
        'location': location,
        'phone_number': request.user.phone_number,
        'phone_verified': request.user.phone_verified,
    })

@api_view(['PUT'])
@permission_classes([IsAuthenticated])
def cancel_activity(request, pk):
    activity = get_object_or_404(Activity, pk=pk)

    if activity.created_by != request.user:
        return Response({"detail": "Not allowed"}, status=403)

    activity.is_cancelled = True
    activity.save()

    # Notify all participants
    participants = list(activity.participants.all())
    create_notifications(
        recipients=participants,
        notification_type='cancel',
        title=f'{activity.name} cancelled',
        body='This event has been cancelled by the host.',
        activity=activity,
    )

    return Response({"success": True})

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def send_invite(request):
    invited_user_id = request.data.get('invited_user_id')
    activity_id     = request.data.get('activity_id')

    if not invited_user_id or not activity_id:
        return Response(
            {'detail': 'invited_user_id and activity_id are required.'},
            status=400
        )

    try:
        invited_user = User.objects.get(id=invited_user_id)
        activity     = Activity.objects.get(id=activity_id)
    except User.DoesNotExist:
        return Response({'detail': 'User not found.'}, status=404)
    except Activity.DoesNotExist:
        return Response({'detail': 'Event not found.'}, status=404)

    inviter = request.user

    # Inviter must be the owner or a participant
    is_member = (
        activity.created_by == inviter or
        activity.participants.filter(id=inviter.id).exists()
    )
    if not is_member:
        return Response(
            {'detail': 'You are not a member of this event.'},
            status=403
        )

    # Don't invite someone already in the activity
    already_in = (
        activity.created_by == invited_user or
        activity.participants.filter(id=invited_user.id).exists()
    )
    if already_in:
        return Response(
            {'detail': 'This person has already joined the event.'},
            status=400
        )

    # Don't send a duplicate pending invite
    already_invited = Notification.objects.filter(
        recipient=invited_user,
        notification_type='invite',
        activity=activity,
        is_read=False,
    ).exists()
    if already_invited:
        return Response({'detail': 'Invite already sent.'}, status=400)

    Notification.objects.create(
        recipient=invited_user,
        notification_type='invite',
        title='You have been invited',
        body=f'@{inviter.username} invited you to "{activity.name}"',
        activity=activity,
    )

    return Response({'detail': 'Invite sent.'}, status=201)


class UpdateProfileView(APIView):
    permission_classes = [IsAuthenticated]

    def put(self, request):
        return self.update_profile(request, partial=False)

    def patch(self, request):
        return self.update_profile(request, partial=True)

    def update_profile(self, request, partial):
        profile = request.user.profile
        serializer = UserProfileSerializer(profile, data=request.data, partial=partial)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class PublicUserSearchView(ListAPIView):
    serializer_class = PublicUserSerializer
    permission_classes = [AllowAny]

    def get_queryset(self):
        query = self.request.query_params.get('search', '')
        if len(query) < 3:
            return User.objects.none()

        return User.objects.filter(
            Q(username__icontains=query) |
            Q(profile__full_name__icontains=query)
        ).select_related('profile')[:10]

    def get_serializer_context(self):
        context = super().get_serializer_context()
        context['request'] = self.request
        return context


# Feed Views

class PostViewSet(viewsets.ModelViewSet):
    serializer_class = PostSerializer
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def get_permissions(self):
        # Reading a single post, a filtered feed (an activity's or a
        # profile's own posts — the embedded lists on those public detail
        # pages), or a post's comments is public content. Everything else
        # (create/update/destroy/like/vote, and comment creation via the
        # POST branch of `comments`) stays authenticated — those are all
        # interactive actions, not reads. An unfiltered `list` call (the
        # main Experience feed) also stays authenticated; that screen lives
        # inside MainTabs, which an anonymous visitor can't reach anyway.
        if self.action == 'retrieve':
            return [AllowAny()]
        if self.action == 'list' and (
            self.request.query_params.get('activity') or self.request.query_params.get('user')
        ):
            return [AllowAny()]
        if self.action == 'comments' and self.request.method == 'GET':
            return [AllowAny()]
        return [IsAuthenticated()]

    def get_queryset(self):
        queryset = (
            Post.objects
            .select_related('user', 'activity')
            .annotate(
                likes_count=Count('likes', distinct=True),
                comments_count=Count('comments', distinct=True)
            )
            .order_by('-created_at')
        )

        activity_id = self.request.query_params.get('activity')
        if activity_id:
            queryset = queryset.filter(activity_id=activity_id)

        user_id = self.request.query_params.get('user')
        if user_id:
            queryset = queryset.filter(user_id=user_id)

        return queryset


    def perform_create(self, serializer):
        activity = serializer.validated_data['activity']
        user = self.request.user

        # Allow only creator or participants to post
        if activity.created_by != user and not activity.participants.filter(id=user.id).exists():
            raise PermissionDenied("You are not a member of this activity.")

        post = serializer.save(user=user)

        if 'image' in self.request.FILES:
            post.moderation_status = trigger_image_moderation(post.image.public_id)
            post.save(update_fields=['moderation_status'])

        # Optional poll — DRF's default nested create() won't handle a
        # choices array automatically, so this is plain ORM code rather
        # than serializer magic (matches the activity-membership check
        # above, which is also plain view logic, not serializer-driven).
        choices = [c.strip() for c in self.request.data.getlist('poll_choices') if c.strip()]
        if len(choices) >= 2:
            days = int(self.request.data.get('poll_days') or 0)
            hours = int(self.request.data.get('poll_hours') or 0)
            minutes = int(self.request.data.get('poll_minutes') or 0)
            duration = timedelta(days=days, hours=hours, minutes=minutes)
            if duration.total_seconds() <= 0:
                duration = timedelta(days=1)  # matches the composer's default (1 day)

            poll = Poll.objects.create(post=post, expires_at=timezone.now() + duration)
            PollChoice.objects.bulk_create([
                PollChoice(poll=poll, text=text[:25]) for text in choices[:4]
            ])

    @action(detail=True, methods=['post'])
    def vote(self, request, pk=None):
        post = self.get_object()
        try:
            poll = post.poll
        except Poll.DoesNotExist:
            return Response({'detail': 'This post has no poll.'}, status=status.HTTP_400_BAD_REQUEST)

        if poll.expires_at < timezone.now():
            return Response({'detail': 'This poll has ended.'}, status=status.HTTP_400_BAD_REQUEST)

        choice_id = request.data.get('choice_id')
        choice = poll.choices.filter(id=choice_id).first()
        if not choice:
            return Response({'detail': 'Invalid choice.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            PollVote.objects.create(poll=poll, choice=choice, user=request.user)
        except IntegrityError:
            return Response({'detail': 'You already voted on this poll.'}, status=status.HTTP_409_CONFLICT)

        serializer = PostSerializer(post, context={'request': request})
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def like(self, request, pk=None):
        post = self.get_object()
        user = request.user

        like, created = Like.objects.get_or_create(user=user, post=post)

        if not created:
            like.delete()
            return Response({'liked': False})

        return Response({'liked': True})

    @action(detail=True, methods=['get', 'post'])
    def comments(self, request, pk=None):
        post = self.get_object()

        if request.method == 'GET':
            comments = post.comments.all()
            serializer = CommentSerializer(comments, many=True)
            return Response(serializer.data)

        if request.method == 'POST':
            serializer = CommentSerializer(data=request.data)
            if serializer.is_valid():
                serializer.save(user=request.user, post=post)
                return Response(serializer.data, status=201)
            return Response(serializer.errors, status=400)

@api_view(['GET'])
@permission_classes([AllowAny])
def activity_detail(request, activity_id):
    try:
        activity = Activity.objects.get(id=activity_id)
    except Activity.DoesNotExist:
        return Response({'detail': 'Not found.'}, status=404)

    from .serializers import ActivitySerializer  # use whatever serializer MyActivitiesView uses
    serializer = ActivitySerializer(activity, context={'request': request})
    return Response(serializer.data)


@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def delete_post(request, post_id):
    try:
        post = Post.objects.get(id=post_id)
        # Allow post owner OR activity owner to delete
        is_post_owner = request.user == post.user
        is_activity_owner = post.activity and post.activity.created_by == request.user
        if not is_post_owner and not is_activity_owner:
            return Response({'detail': 'Permission denied.'}, status=403)
        post.delete()
        return Response(status=204)
    except Post.DoesNotExist:
        return Response({'detail': 'Post not found.'}, status=404)


@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def remove_participant(request, activity_id, user_id):
    User = get_user_model()
    try:
        activity = Activity.objects.get(id=activity_id)
        if activity.created_by != request.user:
            return Response({'detail': 'Permission denied.'}, status=403)
        participant = User.objects.get(id=user_id)
        activity.participants.remove(participant)
        return Response(status=204)
    except Activity.DoesNotExist:
        return Response({'detail': 'Activity not found.'}, status=404)
    except User.DoesNotExist:
        return Response({'detail': 'User not found.'}, status=404)


# views.py
class CommentViewSet(viewsets.ModelViewSet):
    serializer_class = CommentSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Comment.objects.filter(post_id=self.kwargs['post_pk'])

    def perform_create(self, serializer):
        serializer.save(user=self.request.user, post_id=self.kwargs['post_pk'])

def create_notifications(recipients, notification_type, title, body, activity=None):
    """Bulk-create notifications for a list of users."""
    notifications = [
        Notification(
            recipient=user,
            notification_type=notification_type,
            title=title,
            body=body,
            activity=activity,
        )
        for user in recipients
        if user is not None
    ]
    Notification.objects.bulk_create(notifications)

# ── Notification Views ──────────────────────────────────────────────────────


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_notifications(request):
    notifications = Notification.objects.filter(recipient=request.user)
    serializer = NotificationSerializer(notifications, many=True)
    unread_count = notifications.filter(is_read=False).count()
    return Response({'results': serializer.data, 'unread_count': unread_count})


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def mark_notification_read(request, notification_id):
    try:
        notif = Notification.objects.get(id=notification_id, recipient=request.user)
        notif.is_read = True
        notif.save()
        return Response({'detail': 'Marked as read.'})
    except Notification.DoesNotExist:
        return Response({'detail': 'Not found.'}, status=404)


#Email Verification Views

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def mark_all_read(request):
    Notification.objects.filter(recipient=request.user, is_read=False).update(is_read=True)
    return Response({'detail': 'All marked as read.'})

def send_verification_email(user):
    # Reuse the existing code if it's still valid so that every email sent
    # (initial + any resends) carries the same code — otherwise an earlier
    # email's code silently stops working the moment a new one is sent.
    token_obj = EmailVerificationToken.objects.filter(user=user).first()
    if token_obj is None or token_obj.is_expired():
        token_obj, _ = EmailVerificationToken.objects.update_or_create(
            user=user,
            defaults={'token': generate_verification_code(), 'created_at': timezone.now()},
        )

    send_mail(
        subject='Verify your Spurth email',
        message=f'Hi {user.username},\n\nYour Spurth verification code:\n\n{token_obj.token}\n\nOpen the Spurth app and enter this code to verify your email.\nExpires in 24 hours.',
        from_email=settings.DEFAULT_FROM_EMAIL,
        recipient_list=[user.email],
        fail_silently=False,
    )

@api_view(['POST'])
@permission_classes([AllowAny])
def verify_email(request):
    token = request.data.get('token')
    if not token:
        return Response({'detail': 'Token required.'}, status=400)
    try:
        token_obj = EmailVerificationToken.objects.get(token=token)
        if token_obj.is_expired():
            return Response({'detail': 'Token expired. Please request a new one.'}, status=400)
        token_obj.user.email_verified = True
        token_obj.user.save()
        token_obj.delete()
        return Response({'detail': 'Email verified successfully.'})
    except EmailVerificationToken.DoesNotExist:
        return Response({'detail': 'Invalid token.'}, status=400)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def resend_verification(request):
    user = request.user
    if user.email_verified:
        return Response({'detail': 'Email already verified.'}, status=400)
    try:
        send_verification_email(user)
        return Response({'detail': 'Verification email sent.'})
    except Exception as e:
        return Response({'detail': f'Failed to send email: {str(e)}'}, status=500)

@api_view(['GET'])
@permission_classes([AllowAny])
def verify_email_redirect(request):
    token = request.GET.get('token')
    if not token:
        return HttpResponse('Invalid link.', status=400)
    # Redirect to deep link — Android opens the app
    return HttpResponseRedirect(f'spurth://verify-email?token={token}')


class CustomTokenObtainPairView(TokenObtainPairView):
    serializer_class = CustomTokenObtainPairSerializer

#forgot password view
@api_view(['POST'])
@permission_classes([AllowAny])
def forgot_password(request):
    email = request.data.get('email', '').strip()
    if not email:
        return Response({'detail': 'Email is required.'}, status=400)

    try:
        user = User.objects.get(email__iexact=email)
    except User.DoesNotExist:
        # Don't reveal whether email exists — always return success
        return Response({'detail': 'If that email exists, a reset link has been sent.'})

    # Reuse EmailVerificationToken model with a new code
    token_obj, _ = EmailVerificationToken.objects.get_or_create(user=user)
    token_obj.token = generate_verification_code()
    token_obj.created_at = timezone.now()
    token_obj.save()

    send_mail(
        subject='Reset your Spurth password',
        message=(
            f'Hi {user.username},\n\n'
            f'You requested a password reset for your Spurth account.\n\n'
            f'Your reset code:\n\n{token_obj.token}\n\n'
            f'Enter this code in the app to reset your password.\n'
            f'This code expires in 24 hours.\n\n'
            f'If you did not request this, ignore this email.'
        ),
        from_email=settings.DEFAULT_FROM_EMAIL,
        recipient_list=[user.email],
        fail_silently=False,
    )

    return Response({'detail': 'If that email exists, a reset link has been sent.'})


@api_view(['POST'])
@permission_classes([AllowAny])
def reset_password(request):
    token = request.data.get('token', '').strip()
    new_password = request.data.get('new_password', '').strip()
    confirm_password = request.data.get('confirm_password', '').strip()

    if not token or not new_password:
        return Response({'detail': 'Token and new password are required.'}, status=400)

    if new_password != confirm_password:
        return Response({'detail': 'Passwords do not match.'}, status=400)

    if len(new_password) < 8:
        return Response({'detail': 'Password must be at least 8 characters.'}, status=400)

    try:
        token_obj = EmailVerificationToken.objects.get(token=token)
    except EmailVerificationToken.DoesNotExist:
        return Response({'detail': 'Invalid or expired reset code.'}, status=400)

    if token_obj.is_expired():
        token_obj.delete()
        return Response({'detail': 'Reset code has expired. Please request a new one.'}, status=400)

    user = token_obj.user
    user.set_password(new_password)
    user.save()
    token_obj.delete()

    return Response({'detail': 'Password reset successfully. You can now log in.'})


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def change_password(request):
    current_password = request.data.get('current_password', '').strip()
    new_password = request.data.get('new_password', '').strip()
    confirm_password = request.data.get('confirm_password', '').strip()

    if not current_password or not new_password:
        return Response({'detail': 'Current and new password are required.'}, status=400)

    if not request.user.check_password(current_password):
        return Response({'detail': 'Current password is incorrect.'}, status=400)

    if new_password != confirm_password:
        return Response({'detail': 'New passwords do not match.'}, status=400)

    if len(new_password) < 8:
        return Response({'detail': 'Password must be at least 8 characters.'}, status=400)

    if new_password == current_password:
        return Response({'detail': 'New password must be different from the current password.'}, status=400)

    request.user.set_password(new_password)
    request.user.save()

    return Response({'detail': 'Password changed successfully.'})


def _check_account_action_password(user, request):
    # Accounts created via Google Sign-In have no usable password, so
    # skip the confirmation check for them — there's nothing to check
    # against and requiring one would lock those users out of this
    # feature entirely.
    if not user.has_usable_password():
        return None
    password = request.data.get('password', '').strip()
    if not password:
        return Response({'detail': 'Password is required.'}, status=400)
    if not user.check_password(password):
        return Response({'detail': 'Incorrect password.'}, status=400)
    return None


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def deactivate_account(request):
    user = request.user
    error = _check_account_action_password(user, request)
    if error:
        return error

    user.is_active = False
    user.save(update_fields=['is_active'])
    return Response({'detail': 'Account deactivated.'})


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def delete_account(request):
    user = request.user
    error = _check_account_action_password(user, request)
    if error:
        return error

    user.delete()
    return Response({'detail': 'Account deleted.'})


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def contact_support(request):
    subject = request.data.get('subject', '').strip()
    message = request.data.get('message', '').strip()
    if not subject or not message:
        return Response({'detail': 'Subject and message are required.'}, status=400)

    user = request.user
    email = EmailMessage(
        subject=f'[Spurth Help] {subject}',
        body=(
            f'From: {user.username} ({user.email})\n\n'
            f'{message}'
        ),
        from_email=settings.DEFAULT_FROM_EMAIL,
        to=['help@spurth.com'],
        reply_to=[user.email] if user.email else None,
    )
    email.send(fail_silently=False)
    return Response({'detail': 'Your message has been sent to our support team.'})
