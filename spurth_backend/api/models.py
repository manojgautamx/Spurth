from django.contrib.auth.models import AbstractUser, Group, Permission
from django.db import models
from cloudinary.models import CloudinaryField
import uuid
import random


def generate_verification_code():
    return f"{random.randint(0, 999999):06d}"

# ✅ Custom User Model (to allow extension and avoid conflicts)
class User(AbstractUser):
    groups = models.ManyToManyField(Group, related_name="api_users", blank=True)
    user_permissions = models.ManyToManyField(Permission, related_name="api_user_permissions", blank=True)
    email_verified = models.BooleanField(default=False)
    phone_number = models.CharField(max_length=20, unique=True, null=True, blank=True)
    phone_verified = models.BooleanField(default=False)

# ✅ Activity Model
class Activity(models.Model):
    FORMAT_CHOICES = [
        ('casual', 'Casual'),
        ('competitive', 'Competitive'),
    ]

    name = models.CharField(max_length=100)
    description = models.TextField(blank=True)
    activity_type = models.CharField(max_length=50)
    location = models.CharField(max_length=255)
    latitude = models.FloatField()
    longitude = models.FloatField()
    date_time = models.DateTimeField()
    format = models.CharField(max_length=20, choices=FORMAT_CHOICES)
    cover_image = CloudinaryField(
        'image',
        folder='activities',
        null=True,
        blank=True
    )
    is_cancelled = models.BooleanField(default=False)
    is_invite_only = models.BooleanField(default=False)

    # 🔥 Optional fields for richer UX
    max_players = models.PositiveIntegerField(default=0)  # Max number of participants
    price = models.DecimalField(max_digits=10, decimal_places=2, default=0, null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    created_by = models.ForeignKey(User, on_delete=models.CASCADE, related_name='created_activities')

    # ✅ Participants who joined this activity
    participants = models.ManyToManyField(User, related_name='joined_activities', blank=True)

    def __str__(self):
        return self.name

    # ✅ Optional: check if activity is full
    def is_full(self):
        return self.max_players > 0 and self.participant_count() >= self.max_players

    def has_joined(self, user):
        """Check if a specific user has joined the activity."""
        return self.participants.filter(id=user.id).exists()

    def join(self, user):
        if self.is_full():
            return False

        if self.participants.filter(id=user.id).exists():
            return False

        self.participants.add(user)
        return True

    def leave(self, user):
        """Remove a user from the activity."""
        self.participants.remove(user)

    def participant_count(self):
        return self.participants.count() + 1


class ActivityJoinRequest(models.Model):
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('accepted', 'Accepted'),
        ('declined', 'Declined'),
    ]

    activity = models.ForeignKey(Activity, on_delete=models.CASCADE, related_name='join_requests')
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='activity_join_requests')
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default='pending')
    created_at = models.DateTimeField(auto_now_add=True)
    responded_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        unique_together = ('activity', 'user')
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.user.username} -> {self.activity.name} ({self.status})"


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
    interests = models.CharField(max_length=255, blank=True)
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
    activity = models.ForeignKey(
        Activity,
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


class Poll(models.Model):
    post = models.OneToOneField(Post, on_delete=models.CASCADE, related_name='poll')
    expires_at = models.DateTimeField()
    created_at = models.DateTimeField(auto_now_add=True)


class PollChoice(models.Model):
    poll = models.ForeignKey(Poll, on_delete=models.CASCADE, related_name='choices')
    text = models.CharField(max_length=25)


class PollVote(models.Model):
    poll = models.ForeignKey(Poll, on_delete=models.CASCADE, related_name='votes')
    choice = models.ForeignKey(PollChoice, on_delete=models.CASCADE, related_name='votes')
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    voted_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('user', 'poll')  # one vote per poll, not per choice


class Notification(models.Model):
    TYPE_CHOICES = [
        ('reschedule', 'Event Rescheduled'),
        ('cancel', 'Event Cancelled'),
        ('new_event', 'New Event'),
        ('message', 'New Message'),
        ('invite', 'Invited'),
        ('join_request', 'Join Request'),
        ('request_accepted', 'Request Accepted'),
        ('request_declined', 'Request Declined'),
    ]

    recipient = models.ForeignKey(
        User, on_delete=models.CASCADE, related_name='notifications'
    )
    notification_type = models.CharField(max_length=20, choices=TYPE_CHOICES)
    title = models.CharField(max_length=255)
    body = models.TextField()
    activity = models.ForeignKey(
        Activity, on_delete=models.SET_NULL,
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
    # A short, typeable code (not a UUID) — this doubles as both the email
    # verification code and the password-reset code, both entered by hand.
    token = models.CharField(max_length=6, default=generate_verification_code, unique=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def is_expired(self):
        from django.utils import timezone
        return (timezone.now() - self.created_at).total_seconds() > 86400  # 24 hours