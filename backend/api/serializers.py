from rest_framework import serializers
from .models import Role, User, Region, Post, Comment, Rating, Favorite, Report

class RoleSerializer(serializers.ModelSerializer):
    class Meta:
        model = Role
        fields = '__all__'

class UserSerializer(serializers.ModelSerializer):
    role_name = serializers.CharField(source='role.role_name', read_only=True)
    
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'full_name', 'role_name', 'status', 'password']
        extra_kwargs = {'password': {'write_only': True}}
        
    def create(self, validated_data):
        user = User.objects.create_user(**validated_data)
        return user

class RegionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Region
        fields = '__all__'

class PostSerializer(serializers.ModelSerializer):
    author_name = serializers.CharField(source='contributor.full_name', read_only=True)
    author_username = serializers.CharField(source='contributor.username', read_only=True)
    region_name = serializers.CharField(source='region.region_name', read_only=True)

    class Meta:
        model = Post
        fields = '__all__'
        read_only_fields = ('contributor',)

class CommentSerializer(serializers.ModelSerializer):
    user_name = serializers.CharField(source='user.full_name', read_only=True)

    class Meta:
        model = Comment
        fields = '__all__'
        read_only_fields = ('user',)

class RatingSerializer(serializers.ModelSerializer):
    class Meta:
        model = Rating
        fields = '__all__'
        read_only_fields = ('user',)

class FavoriteSerializer(serializers.ModelSerializer):
    class Meta:
        model = Favorite
        fields = '__all__'
        read_only_fields = ('user',)

class ReportSerializer(serializers.ModelSerializer):
    class Meta:
        model = Report
        fields = '__all__'
        read_only_fields = ('user', 'process_status')
