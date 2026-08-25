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
    """Queues Cloudinary's Rekognition moderation for an already-uploaded
    asset. Rekognition typically resolves synchronously, so the caller gets
    an immediate 'approved'/'rejected' back — falls back to 'pending' (with
    the webhook resolving it later) only if Cloudinary doesn't return a
    verdict right away, or the call fails outright.
    """
    try:
        res = cloudinary.uploader.explicit(
            public_id, type='upload', moderation='aws_rek',
            notification_url=CLOUDINARY_WEBHOOK_URL,
        )
        moderation = res.get('moderation') or []
        if moderation and moderation[0].get('status') in ('approved', 'rejected'):
            return moderation[0]['status']
    except Exception as e:
        print('Cloudinary moderation trigger failed:', e)
    return 'pending'


def delete_cloudinary_image(public_id):
    try:
        cloudinary.uploader.destroy(public_id)
    except Exception as e:
        print('Cloudinary delete failed:', e)
