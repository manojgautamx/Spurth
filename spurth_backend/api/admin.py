from django.contrib import admin
from .models import Activity, Post, UserProfile, Report
from django.contrib.auth import get_user_model

User = get_user_model()
admin.site.register(User)

class ActivityAdmin(admin.ModelAdmin):
    list_display = ('name', 'activity_type', 'location', 'date_time', 'format', 'max_players', 'price', 'created_by')
    list_editable = ('max_players', 'price')
    list_filter = ('format', 'activity_type')
    search_fields = ('name', 'activity_type', 'location', 'created_by__username')
    exclude = ('created_by',)  # HIDE 'created_by' field from the admin form

    def save_model(self, request, obj, form, change):
        if not change:
            obj.created_by = User.objects.get(pk=request.user.pk)
        obj.save()


admin.site.register(Activity, ActivityAdmin)

class UserProfileAdmin(admin.ModelAdmin):
    list_display = ['user', 'get_activities_created', 'get_activities_joined']

    def get_activities_created(self, obj):
        return obj.user.created_activities.count()
    get_activities_created.short_description = 'Activities Created'

    def get_activities_joined(self, obj):
        return obj.user.joined_activities.exclude(created_by=obj.user).count()
    get_activities_joined.short_description = 'Activities Joined'

admin.site.register(UserProfile, UserProfileAdmin)


@admin.register(Post)
class PostAdmin(admin.ModelAdmin):
    list_display = (
        'id',
        'user',
        'activity',
        'short_caption',
        'image_preview',
        'created_at',
    )
    search_fields = ('user__username', 'caption', 'activity__name')
    list_filter = ('activity', 'created_at')

    def short_caption(self, obj):
        return obj.caption[:40] + ('...' if len(obj.caption) > 40 else '')
    short_caption.short_description = 'Caption'

    def image_preview(self, obj):
        if obj.image:
            return "📷 Yes"
        return "—"
    image_preview.short_description = 'Image'


@admin.register(Report)
class ReportAdmin(admin.ModelAdmin):
    list_display = ('id', 'target_type', 'target_summary', 'reporter', 'reason', 'status', 'created_at')
    list_editable = ('status',)
    list_filter = ('status', 'reason', 'target_type')
    search_fields = ('reporter__username', 'details')

    def target_summary(self, obj):
        if obj.post:
            return f'Post #{obj.post.id} by @{obj.post.user.username}'
        if obj.activity:
            return obj.activity.name
        if obj.reported_user:
            return f'@{obj.reported_user.username}'
        return '—'
    target_summary.short_description = 'Target'
