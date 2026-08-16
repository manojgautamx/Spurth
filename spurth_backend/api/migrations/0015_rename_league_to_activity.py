# Renames the League model/fields to Activity terminology to match the
# app's actual concept (sports-event-finder naming leftover). RenameModel /
# RenameField are schema-preserving (SQL ALTER TABLE / ALTER COLUMN) — no
# data is dropped or recreated.
import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0014_alter_notification_notification_type'),
    ]

    operations = [
        migrations.RenameModel(
            old_name='League',
            new_name='Activity',
        ),
        migrations.RenameField(
            model_name='activity',
            old_name='sport',
            new_name='activity_type',
        ),
        migrations.RenameField(
            model_name='activity',
            old_name='league_type',
            new_name='format',
        ),
        migrations.RenameField(
            model_name='post',
            old_name='league',
            new_name='activity',
        ),
        migrations.RenameField(
            model_name='notification',
            old_name='league',
            new_name='activity',
        ),
        migrations.RenameField(
            model_name='userprofile',
            old_name='favorite_sports',
            new_name='interests',
        ),
        migrations.AlterField(
            model_name='activity',
            name='created_by',
            field=models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='created_activities', to=settings.AUTH_USER_MODEL),
        ),
        migrations.AlterField(
            model_name='activity',
            name='participants',
            field=models.ManyToManyField(blank=True, related_name='joined_activities', to=settings.AUTH_USER_MODEL),
        ),
    ]
