from django.contrib.auth.models import AbstractUser, Group, Permission
from django.db import models

class User(AbstractUser):
    groups = models.ManyToManyField(Group, related_name="api_users", blank=True)
    user_permissions = models.ManyToManyField(Permission, related_name="api_user_permissions", blank=True)
    
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
    max_players = models.PositiveIntegerField(default=0)  # 👈 New field
    price = models.CharField(max_length=50, default="Free")  # 👈 New field
    created_at = models.DateTimeField(auto_now_add=True)
    created_by = models.ForeignKey(User, on_delete=models.CASCADE, related_name='created_leagues')

    def __str__(self):
        return self.name
