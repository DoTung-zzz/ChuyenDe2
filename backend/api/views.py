from rest_framework import viewsets, permissions, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.authtoken.models import Token
from django.contrib.auth import authenticate
from django.db.models import Avg

from .models import Role, User, Region, Post, Comment, Rating, Favorite, Report
from .serializers import (
    RoleSerializer, UserSerializer, RegionSerializer, PostSerializer, 
    CommentSerializer, RatingSerializer, FavoriteSerializer, ReportSerializer
)

# Authentication Views
@api_view(['POST'])
@permission_classes([permissions.AllowAny])
def register(request):
    serializer = UserSerializer(data=request.data)
    if serializer.is_valid():
        user = serializer.save()
        token, created = Token.objects.get_or_create(user=user)
        return Response({'token': token.key, 'user': UserSerializer(user).data}, status=status.HTTP_201_CREATED)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

@api_view(['POST'])
@permission_classes([permissions.AllowAny])
def login(request):
    username = request.data.get('username')
    password = request.data.get('password')
    user = authenticate(username=username, password=password)
    if user:
        token, created = Token.objects.get_or_create(user=user)
        return Response({'token': token.key, 'user': UserSerializer(user).data})
    return Response({"error": "Wrong Credentials"}, status=status.HTTP_400_BAD_REQUEST)

@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def me(request):
    return Response(UserSerializer(request.user).data)

# ViewSets
class RegionViewSet(viewsets.ModelViewSet):
    queryset = Region.objects.all()
    serializer_class = RegionSerializer
    
    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [permissions.IsAdminUser()]
        return [permissions.AllowAny()]

class UserAdminViewSet(viewsets.ModelViewSet):
    queryset = User.objects.all()
    serializer_class = UserSerializer
    permission_classes = [permissions.IsAdminUser]

class PostViewSet(viewsets.ModelViewSet):
    queryset = Post.objects.all()
    serializer_class = PostSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]

    def get_queryset(self):
        queryset = Post.objects.all()
        region_id = self.request.query_params.get('region', None)
        
        # If Admin, they might want to see all statuses
        if self.request.user.is_authenticated and self.request.user.role and self.request.user.role.role_name == 'Admin':
            post_status = self.request.query_params.get('status', None)
        else:
            post_status = self.request.query_params.get('status', 'Active')
        
        if post_status:
            queryset = queryset.filter(status=post_status)
        if region_id:
            queryset = queryset.filter(region_id=region_id)
            
        return queryset

    def perform_create(self, serializer):
        serializer.save(contributor=self.request.user)

    def update(self, request, *args, **kwargs):
        # Allow admins to update status even if they aren't the author
        if request.user.role and request.user.role.role_name == 'Admin':
            return super().update(request, *args, **kwargs)
        return super().update(request, *args, **kwargs)

class CommentViewSet(viewsets.ModelViewSet):
    queryset = Comment.objects.all()
    serializer_class = CommentSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]

    def get_queryset(self):
        queryset = super().get_queryset()
        post_id = self.request.query_params.get('post')
        user_id = self.request.query_params.get('user')
        if post_id:
            queryset = queryset.filter(post_id=post_id)
        if user_id:
            queryset = queryset.filter(user_id=user_id)
        return queryset

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)
        
    def destroy(self, request, *args, **kwargs):
        comment = self.get_object()
        if comment.user != request.user and request.user.role.role_name != 'Admin':
            return Response({"error": "You do not have permission to delete this comment."}, status=403)
        return super().destroy(request, *args, **kwargs)

class RatingViewSet(viewsets.ModelViewSet):
    queryset = Rating.objects.all()
    serializer_class = RatingSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        queryset = super().get_queryset()
        post_id = self.request.query_params.get('post')
        user_id = self.request.query_params.get('user')
        if post_id:
            queryset = queryset.filter(post_id=post_id)
        if user_id:
            queryset = queryset.filter(user_id=user_id)
        return queryset

    def perform_create(self, serializer):
        # Update if already exists, else create
        post = serializer.validated_data.get('post')
        rating, created = Rating.objects.update_or_create(
            user=self.request.user, 
            post=post,
            defaults={'stars': serializer.validated_data.get('stars')}
        )

class FavoriteViewSet(viewsets.ModelViewSet):
    queryset = Favorite.objects.all()
    serializer_class = FavoriteSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return self.queryset.filter(user=self.request.user)

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

class ReportViewSet(viewsets.ModelViewSet):
    queryset = Report.objects.all()
    serializer_class = ReportSerializer
    permission_classes = [permissions.IsAuthenticated]

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def admin_stats(request):
    if request.user.role and request.user.role.role_name != 'Admin':
        return Response({"error": "Unauthorized"}, status=403)
        
    data = {
        'total_users': User.objects.count(),
        'total_posts': Post.objects.count(),
        'total_reports': Report.objects.filter(process_status='Pending').count(),
        'trending_dishes': Post.objects.filter(status='Active').order_by('-created_at')[:5].values('title', 'region__region_name')
    }
    return Response(data)

@api_view(['GET'])
@permission_classes([permissions.AllowAny])
def public_cuisine_data(request):
    """
    Equivalent to the View_PublicCuisineData from SQL Server.
    """
    posts = Post.objects.filter(status='Active').annotate(avg_rating=Avg('ratings__stars'))
    data = []
    for p in posts:
        data.append({
            'post_id': p.post_id,
            'title': p.title,
            'region_name': p.region.region_name if p.region else None,
            'author': p.contributor.full_name if p.contributor else p.contributor.username,
            'avg_rating': p.avg_rating
        })
    return Response(data)
