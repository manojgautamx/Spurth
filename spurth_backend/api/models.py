from django.contrib.auth.models import AbstractUser, Group, Permission
from django.db import models
from cloudinary.models import CloudinaryField
import uuid

# ✅ Custom User Model (to allow extension and avoid conflicts)
class User(AbstractUser):
    groups = models.ManyToManyField(Group, related_name="api_users", blank=True)
    user_permissions = models.ManyToManyField(Permission, related_name="api_user_permissions", blank=True)
    email_verified = models.BooleanField(default=False)

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
    cover_image = CloudinaryField(
        'image',
        folder='leagues',
        null=True,
        blank=True
    )
    is_cancelled = models.BooleanField(default=False)

    # 🔥 Optional fields for richer UX
    max_players = models.PositiveIntegerField(default=0)  # Max number of participants
    price = models.DecimalField(max_digits=10, decimal_places=2, default=0, null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    created_by = models.ForeignKey(User, on_delete=models.CASCADE, related_name='created_leagues')

    # ✅ Participants who joined this league
    participants = models.ManyToManyField(User, related_name='joined_leagues', blank=True)

    def __str__(self):
        return self.name

    # ✅ Optional: check if league is full
    def is_full(self):
        return self.max_players > 0 and self.participant_count() >= self.max_players
    
    def has_joined(self, user):
        """Check if a specific user has joined the league."""
        return self.participants.filter(id=user.id).exists()

    def join(self, user):
        if self.is_full():
            return False

        if self.participants.filter(id=user.id).exists():
            return False

        self.participants.add(user)
        return True

    def leave(self, user):
        """Remove a user from the league."""
        self.participants.remove(user)
    
    def participant_count(self):
        return self.participants.count() + 1 



class UserProfile(models.Model):
    GENDER_CHOICES = [
        ('male', 'Male'),
        ('female', 'Female'),
        ('other', 'Other'),
    ]

    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='profile')
    full_name = models.CharField(max_length=100, blank=True)
    avatar = CloudinaryField(
        'image',
        folder='avatars',
        blank=True,
        null=True
    )
    birth_date = models.DateField(blank=True, null=True)
    bio = models.TextField(blank=True)
    favorite_sports = models.CharField(max_length=255, blank=True)
    gender = models.CharField(max_length=10, choices=GENDER_CHOICES, blank=True)
    location = models.CharField(max_length=255, blank=True)

    def __str__(self):
        return f"Profile of {self.user.username}"

    def calculate_age(self):
        from datetime import date
        if not self.birth_date:
            return None
        today = date.today()
        return today.year - self.birth_date.year - ((today.month, today.day) < (self.birth_date.month, self.birth_date.day))

# Feed

class Post(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    league = models.ForeignKey(
        League,
        on_delete=models.CASCADE,
        related_name='posts',
        null=True,
        blank=True
    )
    caption = models.TextField(blank=True)
    image = CloudinaryField(
        'image',
        folder='posts',
        null=True,
        blank=True
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']


class Like(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    post = models.ForeignKey(Post, on_delete=models.CASCADE, related_name='likes')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('user', 'post')

class Comment(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    post = models.ForeignKey(Post, on_delete=models.CASCADE, related_name='comments')
    text = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['created_at']


class Notification(models.Model):
    TYPE_CHOICES = [
        ('reschedule', 'Event Rescheduled'),
        ('cancel', 'Event Cancelled'),
        ('new_event', 'New Event'),
        ('message', 'New Message'),
        ('invite', 'Invited'),   
    ]

    recipient = models.ForeignKey(
        User, on_delete=models.CASCADE, related_name='notifications'
    )
    notification_type = models.CharField(max_length=20, choices=TYPE_CHOICES)
    title = models.CharField(max_length=255)
    body = models.TextField()
    league = models.ForeignKey(
        League, on_delete=models.SET_NULL,
        null=True, blank=True, related_name='notifications'
    )
    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.notification_type} → {self.recipient.username}"
    
class EmailVerificationToken(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='verification_token')
    token = models.UUIDField(default=uuid.uuid4, unique=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def is_expired(self):
        from django.utils import timezone
        return (timezone.now() - self.created_at).total_seconds() > 86400  # 24 hours