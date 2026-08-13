from rest_framework import serializers
from django.contrib.auth import get_user_model
from .models import League, Notification, Post, UserProfile, Comment
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


# 🏆 LEAGUE
class LeagueSerializer(serializers.ModelSerializer):
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
        model = League
        fields = (
            'id', 'name', 'sport', 'location', 'latitude', 'longitude',
            'date_time', 'league_type', 'max_players', 'price',
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
    leagues_joined = serializers.SerializerMethodField()
    leagues_created = serializers.SerializerMethodField()
    favorite_sports = serializers.ListField(child=serializers.CharField(), write_only=True, required=False)
    favorite_sports_display = serializers.SerializerMethodField()
    avatar = serializers.ImageField(required=False, allow_null=True)
    # ── ADD: read-only field for Cloudinary URL ──
    avatar_url = serializers.SerializerMethodField()

    class Meta:
        model = UserProfile
        fields = [
            'id', 'full_name', 'username', 'avatar', 'age', 'bio',
            'favorite_sports', 'favorite_sports_display',
            'gender', 'leagues_joined', 'leagues_created',
            'birth_date', 'location', 'avatar_url'
        ]
        read_only_fields = ['user', 'age', 'leagues_joined', 'leagues_created', 'favorite_sports_display']

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
        rep.pop('favorite_sports', None)
        rep['favorite_sports'] = rep.pop('favorite_sports_display', [])
        return rep

    def get_age(self, obj):
        return obj.calculate_age()

    def get_leagues_joined(self, obj):
        return obj.user.joined_leagues.exclude(created_by=obj.user).count()

    def get_leagues_created(self, obj):
        return obj.user.created_leagues.count()

    def get_favorite_sports_display(self, obj):
        return obj.favorite_sports.split(',') if obj.favorite_sports else []

    def to_representation(self, instance):
        rep = super().to_representation(instance)
        rep['favorite_sports'] = rep.pop('favorite_sports_display')
        return rep

    def update(self, instance, validated_data):
        fav = validated_data.pop('favorite_sports', None)
        if fav is not None:
            validated_data['favorite_sports'] = ','.join(fav)
        return super().update(instance, validated_data)

    def create(self, validated_data):
        fav = validated_data.pop('favorite_sports', None)
        if fav is not None:
            validated_data['favorite_sports'] = ','.join(fav)
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
class PostSerializer(serializers.ModelSerializer):
    user_name = serializers.CharField(source='user.username', read_only=True)
    likes_count = serializers.IntegerField(read_only=True)
    comments_count = serializers.IntegerField(read_only=True)
    is_liked = serializers.SerializerMethodField()
    league_name = serializers.CharField(source='league.name', read_only=True)
    cover_image = serializers.SerializerMethodField()
    league_creator_id = serializers.IntegerField(source='league.created_by.id', read_only=True)
    league_is_concluded = serializers.SerializerMethodField()
    league_is_cancelled = serializers.BooleanField(source='league.is_cancelled', read_only=True)
    user_avatar = serializers.SerializerMethodField()
    image = serializers.ImageField(required=False, allow_null=True)  # ← writable
    is_host = serializers.SerializerMethodField()

    class Meta:
        model = Post
        fields = [
            'id', 'user', 'user_name', 'user_avatar',
            'league', 'league_name', 'league_creator_id',
            'cover_image', 'caption', 'image',
            'created_at', 'likes_count', 'comments_count',
            'is_liked', 'is_host',
            'league_is_concluded', 'league_is_cancelled',
        ]
        read_only_fields = ['user', 'created_at']

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
        return obj.league and obj.user_id == obj.league.created_by_id

    def get_league_is_concluded(self, obj):
        return obj.league and obj.league.date_time and obj.league.date_time < timezone.now()

    def get_cover_image(self, obj):
        if obj.league and obj.league.cover_image:
            try:
                return obj.league.cover_image.build_url(
                    width=500,
                    height=300,
                    crop='fill',
                    quality='auto',
                    fetch_format='auto'
                )
            except Exception:
                return obj.league.cover_image.url
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
    league_name = serializers.CharField(source='league.name', read_only=True)
    league_id = serializers.IntegerField(source='league.id', read_only=True)

    class Meta:
        model = Notification
        fields = [
            'id', 'notification_type', 'title', 'body',
            'league_id', 'league_name', 'is_read', 'created_at',
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