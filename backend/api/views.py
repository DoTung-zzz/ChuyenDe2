from rest_framework import viewsets, permissions, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.authtoken.models import Token
from django.contrib.auth import authenticate
from django.shortcuts import get_object_or_404
from django.db.models import Avg
from .models import Role, User, Region, Post, Comment, Rating, Favorite, Report, Reaction, Follow, Notification
from .serializers import (
    RoleSerializer, UserSerializer, RegionSerializer, PostSerializer, 
    CommentSerializer, RatingSerializer, FavoriteSerializer, ReportSerializer,
    ReactionSerializer, FollowSerializer, NotificationSerializer
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

@api_view(['GET', 'PATCH'])
@permission_classes([permissions.IsAuthenticated])
def me(request):
    user = request.user
    if request.method == 'PATCH':
        serializer = UserSerializer(user, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    data = UserSerializer(user).data
    data.update({
        'post_count': user.posts.filter(status='Active').count(),
        'follower_count': user.followers.count(),
        'following_count': user.following.count(),
    })
    return Response(data)

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
        post = serializer.save(contributor=self.request.user)
        # Notify followers
        followers = Follow.objects.filter(followed=self.request.user)
        for follow in followers:
            Notification.objects.create(
                recipient=follow.follower,
                actor=self.request.user,
                action_type='new_post',
                post=post,
                is_read=False
            )

    def update(self, request, *args, **kwargs):
        post = self.get_object()
        if post.contributor != request.user and (not request.user.role or request.user.role.role_name != 'Admin'):
            return Response({"error": "You do not have permission to edit this post."}, status=403)
        return super().update(request, *args, **kwargs)

    def destroy(self, request, *args, **kwargs):
        post = self.get_object()
        if post.contributor != request.user and (not request.user.role or request.user.role.role_name != 'Admin'):
            return Response({"error": "You do not have permission to delete this post."}, status=403)
        return super().destroy(request, *args, **kwargs)

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
            defaults={
                'stars': serializer.validated_data.get('stars'),
                'comment': serializer.validated_data.get('comment')
            }
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

class ReactionViewSet(viewsets.ModelViewSet):
    queryset = Reaction.objects.all()
    serializer_class = ReactionSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        post_id = self.request.query_params.get('post')
        if post_id:
            return self.queryset.filter(post_id=post_id)
        return self.queryset

    def perform_create(self, serializer):
        post = serializer.validated_data.get('post')
        reaction_type = serializer.validated_data.get('reaction_type')
        
        reaction, created = Reaction.objects.update_or_create(
            user=self.request.user, 
            post=post,
            defaults={'reaction_type': reaction_type}
        )

class FollowViewSet(viewsets.ModelViewSet):
    queryset = Follow.objects.all()
    serializer_class = FollowSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return self.queryset.filter(follower=self.request.user)

    def perform_create(self, serializer):
        serializer.save(follower=self.request.user)

class NotificationViewSet(viewsets.ModelViewSet):
    queryset = Notification.objects.all()
    serializer_class = NotificationSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return self.queryset.filter(recipient=self.request.user).order_by('-created_at')

    def partial_update(self, request, *args, **kwargs):
        # Allow marking as read
        return super().partial_update(request, *args, **kwargs)

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
            'avg_rating': p.avg_rating,
            'thumbnail': p.thumbnail
        })
    return Response(data)

@api_view(['GET'])
@permission_classes([permissions.AllowAny])
def user_profile(request, pk):
    from django.db.models import Avg
    user = get_object_or_404(User, pk=pk)
    return Response({
        'id': user.id,
        'username': user.username,
        'full_name': user.full_name,
        'bio': user.bio,
        'passion': user.passion,
        'location': user.location,
        'date_joined': user.date_joined,
        'post_count': user.posts.filter(status='Active').count(),
        'follower_count': user.followers.count(),
        'following_count': user.following.count(),
    })

@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def followed_users(request):
    follows = Follow.objects.filter(follower=request.user)
    data = []
    for f in follows:
        u = f.followed
        data.append({
            'id': u.id,
            'username': u.username,
            'full_name': u.full_name
        })
    return Response(data)
