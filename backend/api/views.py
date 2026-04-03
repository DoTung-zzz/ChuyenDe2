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
class RegionViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Region.objects.all()
    serializer_class = RegionSerializer
    permission_classes = [permissions.AllowAny]

class PostViewSet(viewsets.ModelViewSet):
    queryset = Post.objects.all()
    serializer_class = PostSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]

    def get_queryset(self):
        # Allow filtering by region and status
        queryset = Post.objects.all()
        region_id = self.request.query_params.get('region', None)
        post_status = self.request.query_params.get('status', 'Active')
        
        if post_status:
            queryset = queryset.filter(status=post_status)
        if region_id:
            queryset = queryset.filter(region_id=region_id)
            
        return queryset

    def perform_create(self, serializer):
        serializer.save(contributor=self.request.user)

class CommentViewSet(viewsets.ModelViewSet):
    queryset = Comment.objects.all()
    serializer_class = CommentSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

class RatingViewSet(viewsets.ModelViewSet):
    queryset = Rating.objects.all()
    serializer_class = RatingSerializer
    permission_classes = [permissions.IsAuthenticated]

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
