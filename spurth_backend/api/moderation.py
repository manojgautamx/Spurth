from rest_framework import serializers
from better_profanity import profanity
import cloudinary.uploader


def check_text(value, field_label):
    if value and profanity.contains_profanity(value):
        raise serializers.ValidationError(f'Please remove inappropriate language from your {field_label}.')
    return value


# Cloudinary's moderation add-ons need a real public HTTPS URL they can call
# back — unreachable from local/dev, so moderation just stays 'pending'
# outside production.
CLOUDINARY_WEBHOOK_URL = 'https://api.spurth.com/api/cloudinary-webhook/'


def trigger_image_moderation(public_id):
    try:
        cloudinary.uploader.explicit(
            public_id, type='upload', moderation='webpurify',
            notification_url=CLOUDINARY_WEBHOOK_URL,
        )
    except Exception as e:
        print('Cloudinary moderation trigger failed:', e)
