import random
from datetime import timedelta

from django.core.management.base import BaseCommand
from django.utils import timezone

from api.models import (
    User, UserProfile, Activity, Post, Comment, Like,
    Poll, PollChoice, PollVote,
)

FIRST_LAST_GENDER = [
    ('Aarav', 'Sharma', 'male'), ('Priya', 'Thapa', 'female'), ('Rohan', 'Gurung', 'male'),
    ('Sita', 'Rai', 'female'), ('Bikash', 'Shrestha', 'male'), ('Anjali', 'Karki', 'female'),
    ('Sujan', 'Magar', 'male'), ('Nisha', 'Tamang', 'female'), ('Deepak', 'Poudel', 'male'),
    ('Kritika', 'Bhattarai', 'female'), ('Manish', 'Adhikari', 'male'), ('Sabina', 'Lama', 'female'),
    ('Rajesh', 'Khadka', 'male'), ('Puja', 'Basnet', 'female'), ('Nabin', 'Chhetri', 'male'),
]

ACTIVITY_TEMPLATES = [
    ('Football', 'Sunday Football Match'),
    ('Basketball', 'Pickup Basketball Game'),
    ('Yoga', 'Sunrise Yoga Session'),
    ('Hiking', 'Shivapuri Hiking Trip'),
    ('Cycling', 'City Cycling Tour'),
    ('Tennis', 'Doubles Tennis Practice'),
    ('Badminton', 'Badminton Tournament'),
    ('Running', 'Morning Run Club'),
    ('Chess', 'Chess Meetup'),
    ('Board Games', 'Board Game Night'),
]

INTERESTS_POOL = [
    'football', 'basketball', 'yoga', 'hiking', 'cycling', 'tennis',
    'badminton', 'running', 'chess', 'gaming', 'music', 'photography',
]

BIOS = [
    "Always up for a good game.",
    "Trying to stay active and meet new people.",
    "Weekend warrior. Coffee addict.",
    "Here for the community, not just the sport.",
    "Fitness enthusiast exploring the city.",
    "New to Spurth, excited to join activities!",
    "",
]

LOCATIONS = [
    ("Tundikhel Ground", 27.7000, 85.3200),
    ("Shivapuri National Park", 27.8100, 85.3800),
    ("Bhrikutimandap", 27.7040, 85.3150),
    ("Patan Durbar Square Area", 27.6730, 85.3250),
    ("Bouddha Park", 27.7215, 85.3620),
    ("Balaju Park", 27.7330, 85.3020),
    ("Chobhar Hill", 27.6650, 85.2900),
    ("Nagarkot Viewpoint", 27.7150, 85.5200),
]

POST_CAPTIONS = [
    "Had an amazing time today, can't wait for the next one!",
    "Great turnout, thanks everyone who came out!",
    "Perfect weather for this today.",
    "Made some new friends here, highly recommend joining!",
    "Tougher than expected but so much fun.",
    "Anyone else sore today? Worth it though!",
    "Best session yet, let's do this again soon.",
    "Great energy from the group today!",
    "Small crew but a great time regardless.",
    "Already looking forward to next week.",
]

POLL_TEMPLATES = [
    ("What time works best for next week's session?", ["Morning", "Afternoon", "Evening"]),
    ("Should we make this a weekly thing?", ["Yes!", "Maybe", "No"]),
    ("Which location should we try next?", ["Same spot", "New park", "Indoor venue"]),
    ("How was today's session?", ["Loved it", "It was okay", "Could be better"]),
]

COMMENT_TEXTS = [
    "Count me in for next time!",
    "This looks so fun!",
    "Wish I could've joined!",
    "Great job organizing this!",
    "Same time next week?",
    "Love this energy.",
]


class Command(BaseCommand):
    help = "Seeds the database with fake users, upcoming activities, posts, and polls for testing/demo purposes."

    def add_arguments(self, parser):
        parser.add_argument(
            '--clear', action='store_true',
            help='Delete previously seeded demo_ users (and their activities/posts) before seeding.',
        )

    def handle(self, *args, **options):
        if options['clear']:
            deleted, _ = User.objects.filter(username__startswith='demo_').delete()
            self.stdout.write(self.style.WARNING(f'Cleared {deleted} previously seeded objects.'))

        users = self._create_users()
        activities = self._create_activities(users)
        post_count = self._create_posts_and_polls(users, activities)

        self.stdout.write(self.style.SUCCESS(
            f'Seeded {len(users)} users, {len(activities)} activities, {post_count} posts/polls. '
            f'Demo account password: DemoPass123!'
        ))

    def _create_users(self):
        users = []
        for i, (first, last, gender) in enumerate(FIRST_LAST_GENDER):
            username = f'demo_{first.lower()}{i}'
            user, created = User.objects.get_or_create(
                username=username,
                defaults={'email': f'{username}@example.com', 'email_verified': True},
            )
            if created:
                user.set_password('DemoPass123!')
                user.save()
            UserProfile.objects.update_or_create(
                user=user,
                defaults={
                    'full_name': f'{first} {last}',
                    'gender': gender,
                    'bio': random.choice(BIOS),
                    'interests': ','.join(random.sample(INTERESTS_POOL, k=random.randint(1, 3))),
                    'location': 'Kathmandu, Nepal',
                    'birth_date': timezone.now().date() - timedelta(days=random.randint(20, 35) * 365),
                },
            )
            users.append(user)
        return users

    def _create_activities(self, users):
        activities = []
        for activity_type, name in ACTIVITY_TEMPLATES:
            place, lat, lon = random.choice(LOCATIONS)
            creator = random.choice(users)
            activity = Activity.objects.create(
                name=name,
                description=f'Join us for a {activity_type.lower()} session — all levels welcome.',
                activity_type=activity_type,
                location=place,
                latitude=lat + random.uniform(-0.01, 0.01),
                longitude=lon + random.uniform(-0.01, 0.01),
                # Always in the future — these are meant to show up as
                # upcoming, joinable activities, not past/concluded ones.
                date_time=timezone.now() + timedelta(days=random.randint(1, 21), hours=random.randint(0, 12)),
                format=random.choice(['casual', 'competitive']),
                max_players=random.choice([0, 10, 15, 20]),
                price=random.choice([0, 0, 0, 200, 500]),
                created_by=creator,
            )
            participants = random.sample([u for u in users if u != creator], k=random.randint(2, 6))
            activity.participants.set(participants)
            activities.append(activity)
        return activities

    def _create_posts_and_polls(self, users, activities):
        count = 0
        for _ in range(18):
            activity = random.choice(activities)
            # Only the activity's own creator/participants can post, matching
            # the real app's membership rule for the Experience composer.
            eligible = [activity.created_by] + list(activity.participants.all())
            author = random.choice(eligible)

            is_poll = random.random() < 0.3
            if is_poll:
                question, choice_texts = random.choice(POLL_TEMPLATES)
                caption = question
            else:
                caption = random.choice(POST_CAPTIONS)

            post = Post.objects.create(user=author, activity=activity, caption=caption)
            count += 1

            if is_poll:
                poll = Poll.objects.create(
                    post=post,
                    expires_at=timezone.now() + timedelta(days=random.randint(1, 5)),
                )
                choice_objs = [PollChoice.objects.create(poll=poll, text=t) for t in choice_texts]
                voter_count = random.randint(0, len(eligible))
                for voter in random.sample(eligible, k=voter_count):
                    PollVote.objects.get_or_create(
                        poll=poll, user=voter,
                        defaults={'choice': random.choice(choice_objs)},
                    )

            for liker in random.sample(users, k=random.randint(0, min(8, len(users)))):
                Like.objects.get_or_create(user=liker, post=post)

            for _ in range(random.randint(0, 3)):
                Comment.objects.create(
                    user=random.choice(users),
                    post=post,
                    text=random.choice(COMMENT_TEXTS),
                )

        return count
