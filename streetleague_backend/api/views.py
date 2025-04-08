from rest_framework.response import Response
from rest_framework.decorators import api_view
from rest_framework import status
from django.contrib.auth.models import User
from rest_framework_simplejwt.tokens import RefreshToken

@api_view(['POST'])
def register(request):
    if request.method == 'POST':
        username = request.data.get('username')
        email = request.data.get('email')
        password = request.data.get('password')

        # Check if all fields are provided
        if not username or not email or not password:
            return Response({'detail': 'Username, email, and password are required.'}, status=status.HTTP_400_BAD_REQUEST)

        # Check if user already exists
        if User.objects.filter(username=username).exists():
            return Response({'detail': 'Username already taken.'}, status=status.HTTP_400_BAD_REQUEST)

        if User.objects.filter(email=email).exists():
            return Response({'detail': 'Email already in use.'}, status=status.HTTP_400_BAD_REQUEST)

        # Create new user
        user = User.objects.create_user(username=username, email=email, password=password)

        # Generate JWT tokens (optional but recommended)
        refresh = RefreshToken.for_user(user)
        access_token = str(refresh.access_token)
        refresh_token = str(refresh)

        return Response({
            'access': access_token,
            'refresh': refresh_token
        }, status=status.HTTP_201_CREATED)
