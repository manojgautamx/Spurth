from rest_framework.response import Response
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.views import APIView
from rest_framework import status, permissions
from django.contrib.auth import get_user_model

User = get_user_model()

from rest_framework_simplejwt.tokens import RefreshToken
from .serializers import LeagueSerializer
from .models import League

# User Registration View
@api_view(['POST'])
@permission_classes([AllowAny])
def register(request):
    username = request.data.get('username')
    email = request.data.get('email')
    password = request.data.get('password')

    if not username or not email or not password:
        return Response({'detail': 'Username, email, and password are required.'}, status=status.HTTP_400_BAD_REQUEST)

    if User.objects.filter(username=username).exists():
        return Response({'detail': 'Username already taken.'}, status=status.HTTP_400_BAD_REQUEST)

    if User.objects.filter(email=email).exists():
        return Response({'detail': 'Email already in use.'}, status=status.HTTP_400_BAD_REQUEST)

    user = User.objects.create_user(username=username, email=email, password=password)

    refresh = RefreshToken.for_user(user)
    return Response({
        'access': str(refresh.access_token),
        'refresh': str(refresh),
    }, status=status.HTTP_201_CREATED)

# Create League View
class CreateLeagueView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        serializer = LeagueSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save(created_by=request.user)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

# List My Leagues View
class MyLeaguesView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        leagues = League.objects.filter(created_by=request.user)
        serializer = LeagueSerializer(leagues, many=True)
        return Response(serializer.data)


# 🔥 NEW: List Public Leagues (not created by this user)
class PublicLeaguesView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        leagues = League.objects.exclude(created_by=request.user)
        serializer = LeagueSerializer(leagues, many=True)
        return Response(serializer.data)


# 🔥 NEW: Join League View
@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def join_league(request, league_id):
    try:
        league = League.objects.get(id=league_id)
        if request.user in league.participants.all():
            return Response({'detail': 'You already joined this league.'}, status=400)
        league.participants.add(request.user)
        return Response({'detail': 'Successfully joined the league.'}, status=200)
    except League.DoesNotExist:
        return Response({'detail': 'League not found.'}, status=404)

# 🔥 NEW: List Joined Leagues (user is a participant but not creator)
@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def joined_leagues(request):
    leagues = League.objects.filter(participants=request.user).exclude(created_by=request.user)
    serializer = LeagueSerializer(leagues, many=True)
    return Response(serializer.data)
