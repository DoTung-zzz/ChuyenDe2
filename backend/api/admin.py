from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from .models import Role, User, Region, Post, Comment, Rating, Favorite, Report, ThirdParty, DataAccessLog

# Register your models here.

@admin.register(User)
class CustomUserAdmin(UserAdmin):
    list_display = ('username', 'email', 'full_name', 'role', 'status', 'is_staff')
    fieldsets = UserAdmin.fieldsets + (
        (None, {'fields': ('full_name', 'role', 'status')}),
    )
    add_fieldsets = UserAdmin.add_fieldsets + (
        (None, {'fields': ('full_name', 'role', 'status')}),
    )

admin.site.register(Role)
admin.site.register(Region)
admin.site.register(Post)
admin.site.register(Comment)
admin.site.register(Rating)
admin.site.register(Favorite)
admin.site.register(Report)
admin.site.register(ThirdParty)
admin.site.register(DataAccessLog)
