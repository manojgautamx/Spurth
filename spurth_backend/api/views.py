from rest_framework.response import Response
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.views import APIView
from rest_framework import status, permissions
from django.contrib.auth import get_user_model
from django.db.models import Q
from rest_framework.parsers import MultiPartParser, FormParser
import json


User = get_user_model()

from rest_framework_simplejwt.tokens import RefreshToken
from .serializers import LeagueSerializer, UserProfileSerializer
from .models import League, UserProfile

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
        serializer = LeagueSerializer(data=request.data, context={'request': request})

        if serializer.is_valid():
            serializer.save(created_by=request.user)
            return Response(LeagueSerializer(serializer.instance, context={'request': request}).data, status=status.HTTP_201_CREATED)


        # Print detailed errors for debugging
        print("Validation errors:", serializer.errors)
        return Response(serializer.errors, status=status.HTfTP_400_BAD_REQUEST)



# List My Leagues View
class MyLeaguesView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        leagues = League.objects.filter(created_by=request.user)
        serializer = LeagueSerializer(leagues, many=True, context={'request': request})
        return Response(serializer.data)

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

        serializer = LeagueSerializer(leagues, many=True, context={'request': request})
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
        serializer = LeagueSerializer(league, context={'request': request})
        return Response(serializer.data, status=status.HTTP_200_OK)

    except League.DoesNotExist:
        return Response({'detail': 'League not found.'}, status=status.HTTP_404_NOT_FOUND)
    
# Leave League View
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def leave_league(request, league_id):
    try:
        league = League.objects.get(id=league_id)

        if request.user not in league.participants.all():
            return Response({'detail': 'You are not part of this league.'}, status=status.HTTP_400_BAD_REQUEST)

        league.participants.remove(request.user)
        league.save()

        # Return updated league
        serializer = LeagueSerializer(league, context={'request': request})
        return Response(serializer.data, status=status.HTTP_200_OK)

    except League.DoesNotExist:
        return Response({'detail': 'League not found.'}, status=status.HTTP_404_NOT_FOUND)
    
# Check Join Status
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def league_status(request, league_id):
    try:
        league = League.objects.get(id=league_id)
        joined = request.user in league.participants.all()
        return Response({'joined': joined}, status=status.HTTP_200_OK)

    except League.DoesNotExist:
        return Response({'detail': 'League not found.'}, status=status.HTTP_404_NOT_FOUND)




# List Joined Leagues
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def joined_leagues(request):
    leagues = League.objects.filter(participants=request.user).exclude(created_by=request.user)
    serializer = LeagueSerializer(leagues, many=True, context={'request': request})
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

        serializer = LeagueSerializer(league, data=request.data, partial=True, context={'request': request})

        if serializer.is_valid():
            serializer.save()  # `created_by` remains unchanged
            return Response(serializer.data, status=status.HTTP_200_OK)

        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    except League.DoesNotExist:
        return Response({'detail': 'League not found.'}, status=status.HTTP_404_NOT_FOUND)
    

@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def delete_league(request, league_id):
    try:
        league = League.objects.get(id=league_id)

        if league.created_by != request.user:
            return Response(
                {'detail': 'You do not have permission to delete this league.'},
                status=status.HTTP_403_FORBIDDEN
            )

        league.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

    except League.DoesNotExist:
        return Response(
            {'detail': 'League not found.'},
            status=status.HTTP_404_NOT_FOUND
        )


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def can_enter_chat(request, league_id):
    try:
        league = League.objects.get(id=league_id)

        is_creator = league.created_by == request.user
        is_participant = league.participants.filter(id=request.user.id).exists()

        return Response({
            "can_chat": is_creator or is_participant
        })
    except League.DoesNotExist:
        return Response({"detail": "League not found"}, status=404)




class UserProfileCreateView(APIView):
    permission_classes = [permissions.IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]

    def post(self, request):
        user = request.user

        # Get or create the user profile
        profile, created = UserProfile.objects.get_or_create(user=user)

        data = request.data.copy()

        # Decode favorite_sports JSON string if necessary
        favorite_sports = request.data.getlist('favorite_sports')
        if favorite_sports:
            data['favorite_sports'] = ','.join(favorite_sports)


        # Create the serializer with the current profile instance (for update)
        serializer = UserProfileSerializer(profile, data=data, partial=True)

        if serializer.is_valid():
            serializer.save(user=user)
            return Response(serializer.data, status=status.HTTP_200_OK)
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
            return Response({'profile_complete': False})

        required_fields = [profile.gender, profile.birth_date, profile.avatar]
        is_complete = all(required_fields)
        return Response({'profile_complete': is_complete})
    
@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def view_user_profile(request, user_id):
    try:
        user = User.objects.get(id=user_id)
        if not hasattr(user, 'profile'):
            return Response({'detail': 'Profile not found for this user.'}, status=404)
        serializer = UserProfileSerializer(user.profile)
        return Response(serializer.data)
    except User.DoesNotExist:
        return Response({'detail': 'User not found.'}, status=404)

# class UpdateProfileView(APIView):
#     permission_classes = [IsAuthenticated]

#     def put(self, request):
#         profile = request.user.profile
#         serializer = ProfileSerializer(profile, data=request.data, partial=True)
#         if serializer.is_valid():
#             serializer.save()
#             return Response(serializer.data)
#         return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    


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
