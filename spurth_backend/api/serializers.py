from rest_framework import serializers
from django.contrib.auth import get_user_model
from .models import Activity, Notification, Post, UserProfile, Comment, Poll, PollChoice
from django.utils import timezone
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from django.db.models import Q

User = get_user_model()


# 🔐 USER
class UserSerializer(serializers.ModelSerializer):
    avatar = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ('id', 'username', 'email', 'avatar')

    def get_avatar(self, obj):
        if hasattr(obj, 'profile') and obj.profile.avatar:
            try:
                return obj.profile.avatar.build_url(
                    width=100,
                    height=100,
                    crop='fill',
                    quality='auto',
                    fetch_format='auto'
                )
            except Exception:
                return obj.profile.avatar.url
        return None


# 🌍 PUBLIC USER
class PublicUserSerializer(serializers.ModelSerializer):
    avatar = serializers.SerializerMethodField()
    full_name = serializers.CharField(source='profile.full_name', read_only=True)

    class Meta:
        model = User
        fields = ('id', 'username', 'full_name', 'avatar')

    def get_avatar(self, obj):
        if hasattr(obj, 'profile') and obj.profile.avatar:
            try:
                return obj.profile.avatar.build_url(
                    width=200,
                    height=200,
                    crop='fill',
                    quality='auto',
                    fetch_format='auto'
                )
            except Exception:
                return obj.profile.avatar.url
        return None


# 🏆 ACTIVITY
class ActivitySerializer(serializers.ModelSerializer):
    created_by = PublicUserSerializer(read_only=True)
    joined = serializers.SerializerMethodField()
    is_owner = serializers.SerializerMethodField()
    participant_count = serializers.SerializerMethodField()
    is_full = serializers.SerializerMethodField()
    is_concluded = serializers.SerializerMethodField()
    participants = serializers.SerializerMethodField()
    cover_image = serializers.ImageField(required=False, allow_null=True)
    # ── ADD: read-only field for Cloudinary URL ──
    cover_image_url = serializers.SerializerMethodField()

    date_time = serializers.DateTimeField(format="%Y-%m-%dT%H:%M:%S")

    class Meta:
        model = Activity
        fields = (
            'id', 'name', 'activity_type', 'location', 'latitude', 'longitude',
            'date_time', 'format', 'max_players', 'price',
            'created_by', 'description', 'is_owner', 'joined',
            'is_full', 'participant_count', 'participants',
            'cover_image', 'cover_image_url', 'is_concluded', 'is_cancelled'
        )
        read_only_fields = ('created_by',)

    def get_cover_image_url(self, obj):
        if obj.cover_image:
            try:
                return obj.cover_image.build_url(
                    width=600, height=400, crop='fill',
                    quality='auto', fetch_format='auto'
                )
            except Exception:
                return obj.cover_image.url
        return None

    def to_representation(self, instance):
        rep = super().to_representation(instance)
        # Replace raw cover_image with Cloudinary URL
        rep['cover_image'] = rep.pop('cover_image_url', None)
        return rep

    def get_joined(self, obj):
        user = self.context.get('request').user
        return user.is_authenticated and obj.participants.filter(id=user.id).exists()

    def get_is_owner(self, obj):
        request = self.context.get('request')
        return request and request.user.is_authenticated and obj.created_by_id == request.user.id

    def get_is_concluded(self, obj):
        return obj.date_time and obj.date_time < timezone.now()

    def get_is_full(self, obj):
        return obj.is_full()

    def get_participants(self, obj):
        participants = list(obj.participants.all())

        if obj.created_by and obj.created_by not in participants:
            participants.insert(0, obj.created_by)

        return PublicUserSerializer(participants, many=True, context=self.context).data

    def get_participant_count(self, obj):
        count = obj.participants.count()

        if obj.created_by and not obj.participants.filter(id=obj.created_by.id).exists():
            count += 1

        return count

    def get_cover_image(self, obj):
        if obj.cover_image:
            try:
                return obj.cover_image.build_url(
                    width=600,
                    height=400,
                    crop='fill',
                    quality='auto',
                    fetch_format='auto'
                )
            except Exception:
                return obj.cover_image.url
        return None


# 👤 PROFILE
class UserProfileSerializer(serializers.ModelSerializer):
    full_name = serializers.CharField(required=True)
    username = serializers.CharField(source='user.username', read_only=True)
    age = serializers.SerializerMethodField()
    activities_joined = serializers.SerializerMethodField()
    activities_created = serializers.SerializerMethodField()
    interests = serializers.ListField(child=serializers.CharField(), write_only=True, required=False)
    interests_display = serializers.SerializerMethodField()
    avatar = serializers.ImageField(required=False, allow_null=True)
    # ── ADD: read-only field for Cloudinary URL ──
    avatar_url = serializers.SerializerMethodField()
    phone_verified = serializers.BooleanField(source='user.phone_verified', read_only=True)

    class Meta:
        model = UserProfile
        fields = [
            'id', 'full_name', 'username', 'avatar', 'age', 'bio',
            'interests', 'interests_display',
            'gender', 'activities_joined', 'activities_created',
            'birth_date', 'location', 'avatar_url', 'phone_verified'
        ]
        read_only_fields = ['user', 'age', 'activities_joined', 'activities_created', 'interests_display', 'phone_verified']

    def get_avatar_url(self, obj):
        if obj.avatar:
            try:
                return obj.avatar.build_url(
                    width=200, height=200, crop='fill',
                    quality='auto', fetch_format='auto'
                )
            except Exception:
                return obj.avatar.url
        return None

    def to_representation(self, instance):
        rep = super().to_representation(instance)
        # Replace avatar (raw file) with avatar_url (Cloudinary URL) for frontend
        rep['avatar'] = rep.pop('avatar_url', None)
        rep.pop('interests', None)
        rep['interests'] = rep.pop('interests_display', [])
        return rep

    def get_age(self, obj):
        return obj.calculate_age()

    def get_activities_joined(self, obj):
        return obj.user.joined_activities.exclude(created_by=obj.user).count()

    def get_activities_created(self, obj):
        return obj.user.created_activities.count()

    def get_interests_display(self, obj):
        return obj.interests.split(',') if obj.interests else []

    def update(self, instance, validated_data):
        interests = validated_data.pop('interests', None)
        if interests is not None:
            validated_data['interests'] = ','.join(interests)
        return super().update(instance, validated_data)

    def create(self, validated_data):
        interests = validated_data.pop('interests', None)
        if interests is not None:
            validated_data['interests'] = ','.join(interests)
        return super().create(validated_data)

    def get_avatar(self, obj):
        if obj.avatar:
            try:
                return obj.avatar.build_url(
                    width=200,
                    height=200,
                    crop='fill',
                    quality='auto',
                    fetch_format='auto'
                )
            except Exception:
                return obj.avatar.url
        return None


# 📰 POSTS
class PollChoiceSerializer(serializers.ModelSerializer):
    votes_count = serializers.SerializerMethodField()

    class Meta:
        model = PollChoice
        fields = ['id', 'text', 'votes_count']

    def get_votes_count(self, obj):
        return obj.votes.count()


class PollSerializer(serializers.ModelSerializer):
    choices = PollChoiceSerializer(many=True, read_only=True)
    total_votes = serializers.SerializerMethodField()
    is_expired = serializers.SerializerMethodField()
    has_voted = serializers.SerializerMethodField()
    user_choice_id = serializers.SerializerMethodField()

    class Meta:
        model = Poll
        fields = ['id', 'expires_at', 'is_expired', 'total_votes', 'has_voted', 'user_choice_id', 'choices']

    def get_total_votes(self, obj):
        return obj.votes.count()

    def get_is_expired(self, obj):
        return obj.expires_at < timezone.now()

    def _user_vote(self, obj):
        request = self.context.get('request')
        if not (request and request.user.is_authenticated):
            return None
        return obj.votes.filter(user=request.user).first()

    def get_has_voted(self, obj):
        return self._user_vote(obj) is not None

    def get_user_choice_id(self, obj):
        vote = self._user_vote(obj)
        return vote.choice_id if vote else None


class PostSerializer(serializers.ModelSerializer):
    user_name = serializers.CharField(source='user.username', read_only=True)
    likes_count = serializers.IntegerField(read_only=True)
    comments_count = serializers.IntegerField(read_only=True)
    is_liked = serializers.SerializerMethodField()
    activity_name = serializers.CharField(source='activity.name', read_only=True)
    cover_image = serializers.SerializerMethodField()
    activity_creator_id = serializers.IntegerField(source='activity.created_by.id', read_only=True)
    activity_is_concluded = serializers.SerializerMethodField()
    activity_is_cancelled = serializers.BooleanField(source='activity.is_cancelled', read_only=True)
    user_avatar = serializers.SerializerMethodField()
    image = serializers.ImageField(required=False, allow_null=True)  # ← writable
    is_host = serializers.SerializerMethodField()
    poll = serializers.SerializerMethodField()

    class Meta:
        model = Post
        fields = [
            'id', 'user', 'user_name', 'user_avatar',
            'activity', 'activity_name', 'activity_creator_id',
            'cover_image', 'caption', 'image', 'poll',
            'created_at', 'likes_count', 'comments_count',
            'is_liked', 'is_host',
            'activity_is_concluded', 'activity_is_cancelled',
        ]
        read_only_fields = ['user', 'created_at']

    def get_poll(self, obj):
        try:
            poll = obj.poll
        except Poll.DoesNotExist:
            return None
        return PollSerializer(poll, context=self.context).data

    def to_representation(self, instance):
        rep = super().to_representation(instance)
        # On read, replace raw image path with Cloudinary URL
        if instance.image:
            try:
                rep['image'] = instance.image.build_url(
                    width=800,
                    crop='limit',
                    quality='auto',
                    fetch_format='auto'
                )
            except Exception:
                rep['image'] = instance.image.url
        return rep

    def get_is_liked(self, obj):
        request = self.context.get('request')
        return request and request.user.is_authenticated and obj.likes.filter(user=request.user).exists()

    def get_is_host(self, obj):
        return obj.activity and obj.user_id == obj.activity.created_by_id

    def get_activity_is_concluded(self, obj):
        return obj.activity and obj.activity.date_time and obj.activity.date_time < timezone.now()

    def get_cover_image(self, obj):
        if obj.activity and obj.activity.cover_image:
            try:
                return obj.activity.cover_image.build_url(
                    width=500,
                    height=300,
                    crop='fill',
                    quality='auto',
                    fetch_format='auto'
                )
            except Exception:
                return obj.activity.cover_image.url
        return None

    def get_user_avatar(self, obj):
        if hasattr(obj.user, 'profile') and obj.user.profile.avatar:
            try:
                return obj.user.profile.avatar.build_url(
                    width=100,
                    height=100,
                    crop='fill',
                    quality='auto',
                    fetch_format='auto'
                )
            except Exception:
                return obj.user.profile.avatar.url
        return None

    def get_image(self, obj):
        if obj.image:
            try:
                return obj.image.build_url(
                    width=800,
                    crop='limit',
                    quality='auto',
                    fetch_format='auto'
                )
            except Exception:
                return obj.image.url
        return None


# 💬 COMMENTS
class CommentSerializer(serializers.ModelSerializer):
    user_name = serializers.CharField(source='user.username', read_only=True)

    class Meta:
        model = Comment
        fields = ['id', 'user', 'user_name', 'post', 'text', 'created_at']
        read_only_fields = ['user', 'post', 'created_at']

class NotificationSerializer(serializers.ModelSerializer):
    activity_name = serializers.CharField(source='activity.name', read_only=True)
    activity_id = serializers.IntegerField(source='activity.id', read_only=True)

    class Meta:
        model = Notification
        fields = [
            'id', 'notification_type', 'title', 'body',
            'activity_id', 'activity_name', 'is_read', 'created_at',
        ]


class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    def validate(self, attrs):
        username = attrs.get('username')
        password = attrs.get('password')

        try:
            user = User.objects.get(
                Q(username__iexact=username) | Q(email__iexact=username)
            )
        except User.DoesNotExist:
            raise serializers.ValidationError(
                {'detail': 'No account found with that username or email.'}
            )
        except User.MultipleObjectsReturned:
            user = User.objects.filter(email__iexact=username).first()

        if not user.check_password(password):
            raise serializers.ValidationError(
                {'detail': 'Incorrect password. Please try again.'}
            )

        attrs['username'] = user.username
        return super().validate(attrs)
