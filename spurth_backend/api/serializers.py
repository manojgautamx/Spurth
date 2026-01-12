from rest_framework import serializers
from django.contrib.auth import get_user_model
from .models import League, UserProfile

User = get_user_model()

class UserSerializer(serializers.ModelSerializer):
    """Serializer for user details, excludes password during serialization."""

    class Meta:
        model = User
        fields = ('id', 'username', 'email')
        extra_kwargs = {
            'email': {'required': True},
        }
    
        def get_avatar(self, obj):
            if hasattr(obj, 'profile') and obj.profile.avatar:
                return obj.profile.avatar.url
            return None


class PublicUserSerializer(serializers.ModelSerializer):
    avatar = serializers.SerializerMethodField()
    full_name = serializers.CharField(source='profile.full_name', read_only=True)

    class Meta:
        model = User
        fields = ('id', 'username', 'full_name', 'avatar')

    def get_avatar(self, obj):
        request = self.context.get('request')

        if hasattr(obj, 'profile') and obj.profile.avatar:
            if request:
                return request.build_absolute_uri(obj.profile.avatar.url)
            return obj.profile.avatar.url

        return None

from rest_framework import serializers
from .models import League, User  # Adjust imports as needed

class LeagueSerializer(serializers.ModelSerializer):
    created_by = PublicUserSerializer(read_only=True)
    joined = serializers.SerializerMethodField()
    is_owner = serializers.SerializerMethodField()
    participant_count = serializers.SerializerMethodField()
    is_full = serializers.SerializerMethodField()
    
    # 1. Add this new field
    participants = serializers.SerializerMethodField()

    class Meta:
        model = League
        fields = (
            'id', 'name', 'sport', 'location', 'latitude', 'longitude',
            'date_time', 'league_type', 'max_players', 'price',
            'created_by', 'description', 'is_owner', 'joined', 
            'is_full', 'participant_count', 'participants' # 2. Don't forget to add it to fields tuple
        )
        read_only_fields = ('created_by',)

    def get_joined(self, obj):
        user = self.context.get('request').user
        if user.is_authenticated:
            return obj.participants.filter(id=user.id).exists()
        return False
    
    def get_is_owner(self, obj):
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            return obj.created_by_id == request.user.id
        return False
    
    # def get_participant_count(self, obj):
    #     return obj.participants.count()

    def get_is_full(self, obj):
        return obj.is_full()

    # ... inside LeagueSerializer ...

    def get_participants(self, obj):
        participants = list(obj.participants.all())

        if obj.created_by and obj.created_by not in participants:
            participants.insert(0, obj.created_by)

        serializer = PublicUserSerializer(
            participants,
            many=True,
            context=self.context
        )
        return serializer.data


    def get_participant_count(self, obj):
        # 1. Count database participants
        count = obj.participants.count()
        
        # 2. If the creator isn't in the database list, add +1 to the count manually
        if obj.created_by and not obj.participants.filter(id=obj.created_by.id).exists():
            count += 1
            
        return count



class UserProfileSerializer(serializers.ModelSerializer):
    full_name = serializers.CharField(required=True)
    username = serializers.CharField(source='user.username', read_only=True)
    age = serializers.SerializerMethodField()
    leagues_joined = serializers.SerializerMethodField()
    leagues_created = serializers.SerializerMethodField()
    favorite_sports = serializers.ListField(child=serializers.CharField(), write_only=True, required=False)
    favorite_sports_display = serializers.SerializerMethodField()

    class Meta:
        model = UserProfile
        fields = [
            'id', 'full_name', 'username', 'avatar', 'age', 'bio', 'favorite_sports', 'favorite_sports_display',
            'gender', 'leagues_joined', 'leagues_created', 'birth_date'
        ]
        read_only_fields = ['user', 'age', 'leagues_joined', 'leagues_created', 'favorite_sports_display']

    def get_age(self, obj):
        return obj.calculate_age()

    def get_leagues_joined(self, obj):
        return obj.user.joined_leagues.exclude(created_by=obj.user).count()

    def get_leagues_created(self, obj):
        return obj.user.created_leagues.count()

    def get_favorite_sports_display(self, obj):
        return obj.favorite_sports.split(',') if obj.favorite_sports else []

    def to_representation(self, instance):
        representation = super().to_representation(instance)
        # Optional: rename 'favorite_sports_display' to 'favorite_sports' in output
        representation['favorite_sports'] = representation.pop('favorite_sports_display')
        return representation

    def update(self, instance, validated_data):
        # Convert favorite_sports list to comma-separated string
        favorite_sports = validated_data.pop('favorite_sports', None)
        if favorite_sports is not None:
            validated_data['favorite_sports'] = ','.join(favorite_sports)
        return super().update(instance, validated_data)

    def create(self, validated_data):
        favorite_sports = validated_data.pop('favorite_sports', None)
        if favorite_sports is not None:
            validated_data['favorite_sports'] = ','.join(favorite_sports)
        return super().create(validated_data)
    
