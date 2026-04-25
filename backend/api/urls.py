from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register(r'regions', views.RegionViewSet, basename='region')
router.register(r'posts', views.PostViewSet, basename='post')
router.register(r'comments', views.CommentViewSet, basename='comment')
router.register(r'ratings', views.RatingViewSet, basename='rating')
router.register(r'favorites', views.FavoriteViewSet, basename='favorite')
router.register(r'reactions', views.ReactionViewSet, basename='reaction')
router.register(r'reports', views.ReportViewSet, basename='report')
router.register(r'follows', views.FollowViewSet, basename='follow')
router.register(r'notifications', views.NotificationViewSet, basename='notification')
router.register(r'admin/users', views.UserAdminViewSet, basename='admin-user')

urlpatterns = [
    path('auth/register/', views.register, name='register'),
    path('auth/login/', views.login, name='login'),
    path('auth/me/', views.me, name='me'),
    path('public/cuisine-data/', views.public_cuisine_data, name='public_cuisine_data'),
    path('admin/stats/', views.admin_stats, name='admin_stats'),
    path('users/<int:pk>/profile/', views.user_profile, name='user-profile'),
    path('followed-users/', views.followed_users, name='followed-users'),
    path('', include(router.urls)),
]
