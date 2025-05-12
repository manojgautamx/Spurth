from rest_framework.response import Response
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.views import APIView
from rest_framework import status, permissions
from django.contrib.auth import get_user_model
from django.db.models import Q

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
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = LeagueSerializer(data=request.data)

        if serializer.is_valid():
            # Set `created_by` explicitly here
            serializer.save(created_by=request.user)
            return Response(serializer.data, status=status.HTTP_201_CREATED)

        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


# List My Leagues View
class MyLeaguesView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        leagues = League.objects.filter(created_by=request.user)
        serializer = LeagueSerializer(leagues, many=True)
        return Response(serializer.data)


# # List Public Leagues View
# class PublicLeaguesView(APIView):
#     permission_classes = [IsAuthenticated]

#     def get(self, request):
#         leagues = League.objects.exclude(created_by=request.user)
#         serializer = LeagueSerializer(leagues, many=True)
#         return Response(serializer.data)


# List Public Leagues View
class PublicLeaguesView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        # Get the list of joined leagues
        joined_league_ids = request.user.joined_leagues.values_list('id', flat=True)

        # Exclude both created and joined leagues
        leagues = League.objects.exclude(
            Q(created_by=request.user) | Q(id__in=joined_league_ids)
        )

        serializer = LeagueSerializer(leagues, many=True)
        return Response(serializer.data)



# Join League View
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def join_league(request, league_id):
    try:
        league = League.objects.get(id=league_id)

        if request.user in league.participants.all():
            return Response({'detail': 'You already joined this league.'}, status=status.HTTP_400_BAD_REQUEST)

        league.participants.add(request.user)
        league.save()

        # Return the full league data with nested `created_by` structure
        serializer = LeagueSerializer(league)
        return Response(serializer.data, status=status.HTTP_200_OK)

    except League.DoesNotExist:
        return Response({'detail': 'League not found.'}, status=status.HTTP_404_NOT_FOUND)


# List Joined Leagues
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def joined_leagues(request):
    leagues = League.objects.filter(participants=request.user).exclude(created_by=request.user)
    serializer = LeagueSerializer(leagues, many=True)
    return Response(serializer.data)


# Update League View
@api_view(['PUT'])
@permission_classes([IsAuthenticated])
def update_league(request, league_id):
    try:
        league = League.objects.get(id=league_id)

        # Ensure only the creator can update the league
        if league.created_by != request.user:
            return Response({'detail': 'You do not have permission to edit this league.'}, status=status.HTTP_403_FORBIDDEN)

        serializer = LeagueSerializer(league, data=request.data, partial=True)

        if serializer.is_valid():
            serializer.save()  # `created_by` remains unchanged
            return Response(serializer.data, status=status.HTTP_200_OK)

        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    except League.DoesNotExist:
        return Response({'detail': 'League not found.'}, status=status.HTTP_404_NOT_FOUND)
