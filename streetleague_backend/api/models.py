from django.contrib.auth.models import AbstractUser, Group, Permission
from django.db import models

# ✅ Custom User Model (to allow extension and avoid conflicts)
class User(AbstractUser):
    groups = models.ManyToManyField(Group, related_name="api_users", blank=True)
    user_permissions = models.ManyToManyField(Permission, related_name="api_user_permissions", blank=True)

# ✅ League Model
class League(models.Model):
    LEAGUE_TYPE_CHOICES = [
        ('casual', 'Casual'),
        ('competitive', 'Competitive'),
    ]

    name = models.CharField(max_length=100)
    description = models.TextField()
    sport = models.CharField(max_length=50)
    location = models.CharField(max_length=255)
    latitude = models.FloatField()
    longitude = models.FloatField()
    date_time = models.DateTimeField()
    league_type = models.CharField(max_length=20, choices=LEAGUE_TYPE_CHOICES)

    # 🔥 Optional fields for richer UX
    max_players = models.PositiveIntegerField(default=0)  # Max number of participants
    price = models.CharField(max_length=50, default="Free")  # Entry fee or "Free"

    created_at = models.DateTimeField(auto_now_add=True)
    created_by = models.ForeignKey(User, on_delete=models.CASCADE, related_name='created_leagues')

    # ✅ Participants who joined this league
    participants = models.ManyToManyField(User, related_name='joined_leagues', blank=True)

    def __str__(self):
        return self.name

    # ✅ Optional: check if league is full
    def is_full(self):
        return self.max_players > 0 and self.participants.count() >= self.max_players
