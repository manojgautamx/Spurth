from django.contrib import admin
from .models import League, Post, UserProfile
from django.contrib.auth import get_user_model

User = get_user_model()
admin.site.register(User)

class LeagueAdmin(admin.ModelAdmin):
    list_display = ('name', 'sport', 'location', 'date_time', 'league_type', 'max_players', 'price', 'created_by')
    list_editable = ('max_players', 'price')
    list_filter = ('league_type', 'sport')
    search_fields = ('name', 'sport', 'location', 'created_by__username')
    exclude = ('created_by',)  # HIDE 'created_by' field from the admin form

    def save_model(self, request, obj, form, change):
        if not change:
            obj.created_by = User.objects.get(pk=request.user.pk)
        obj.save()


admin.site.register(League, LeagueAdmin)

class UserProfileAdmin(admin.ModelAdmin):
    list_display = ['user', 'get_leagues_created', 'get_leagues_joined']

    def get_leagues_created(self, obj):
        return obj.user.created_leagues.count()
    get_leagues_created.short_description = 'Leagues Created'

    def get_leagues_joined(self, obj):
        return obj.user.joined_leagues.exclude(created_by=obj.user).count()
    get_leagues_joined.short_description = 'Leagues Joined'

admin.site.register(UserProfile, UserProfileAdmin)


@admin.register(Post)
class PostAdmin(admin.ModelAdmin):
    list_display = (
        'id',
        'user',
        'league',
        'short_caption',
        'image_preview',
        'created_at',
    )
    search_fields = ('user__username', 'caption', 'league__name')
    list_filter = ('league', 'created_at')

    def short_caption(self, obj):
        return obj.caption[:40] + ('...' if len(obj.caption) > 40 else '')
    short_caption.short_description = 'Caption'

    def image_preview(self, obj):
        if obj.image:
            return "📷 Yes"
        return "—"
    image_preview.short_description = 'Image'