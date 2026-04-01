from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register(r'regions', views.RegionViewSet, basename='region')
router.register(r'posts', views.PostViewSet, basename='post')
router.register(r'comments', views.CommentViewSet, basename='comment')
router.register(r'ratings', views.RatingViewSet, basename='rating')
router.register(r'favorites', views.FavoriteViewSet, basename='favorite')
router.register(r'reports', views.ReportViewSet, basename='report')

urlpatterns = [
    path('auth/register/', views.register, name='register'),
    path('auth/login/', views.login, name='login'),
    path('auth/me/', views.me, name='me'),
    path('public/cuisine-data/', views.public_cuisine_data, name='public_cuisine_data'),
    path('', include(router.urls)),
]
