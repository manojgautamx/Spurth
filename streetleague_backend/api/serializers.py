from rest_framework import serializers
from django.contrib.auth import get_user_model
from .models import League

User = get_user_model()

class UserSerializer(serializers.ModelSerializer):
    """Serializer for user details, excludes password during serialization."""

    class Meta:
        model = User
        fields = ('id', 'username', 'email')
        extra_kwargs = {
            'email': {'required': True},
        }

class LeagueSerializer(serializers.ModelSerializer):
    """Serializer for league with nested user details for created_by."""
    created_by = UserSerializer(read_only=True)

    class Meta:
        model = League
        fields = ('id', 'name', 'sport', 'location', 'date_time', 'league_type', 
                  'max_players', 'price', 'created_by', 'description')
        read_only_fields = ('created_by',)
