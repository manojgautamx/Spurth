from django.contrib import admin
from django.contrib import admin
from .models import League

# Optional: Customize admin display
class LeagueAdmin(admin.ModelAdmin):
    list_display = ('name', 'sport', 'location', 'date_time', 'league_type')
    search_fields = ('name', 'sport', 'location')

admin.site.register(League, LeagueAdmin)
