from rest_framework import serializers
from .models import Role, User, Region, Post, Comment, Rating, Favorite, Report, Reaction, Follow, Notification

class RoleSerializer(serializers.ModelSerializer):
    class Meta:
        model = Role
        fields = '__all__'

class UserSerializer(serializers.ModelSerializer):
    role_name = serializers.CharField(source='role.role_name', read_only=True)
    
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'full_name', 'bio', 'passion', 'location', 'role_name', 'status', 'password']
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
    likes_count = serializers.SerializerMethodField()
    user_reaction = serializers.SerializerMethodField()

    class Meta:
        model = Post
        fields = '__all__'
        read_only_fields = ('contributor',)

    def get_likes_count(self, obj):
        return obj.reactions.count()

    def get_user_reaction(self, obj):
        user = self.context['request'].user
        if user.is_authenticated:
            reaction = obj.reactions.filter(user=user).first()
            return reaction.reaction_type if reaction else None
        return None

class CommentSerializer(serializers.ModelSerializer):
    user_name = serializers.CharField(source='user.full_name', read_only=True)

    class Meta:
        model = Comment
        fields = '__all__'
        read_only_fields = ('user',)

class RatingSerializer(serializers.ModelSerializer):
    user_name = serializers.CharField(source='user.full_name', read_only=True)

    class Meta:
        model = Rating
        fields = '__all__'
        read_only_fields = ('user',)

class FavoriteSerializer(serializers.ModelSerializer):
    post_details = PostSerializer(source='post', read_only=True)
    class Meta:
        model = Favorite
        fields = ['favorite_id', 'post', 'post_details', 'created_at']
        read_only_fields = ('user',)

class ReactionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Reaction
        fields = '__all__'
        read_only_fields = ('user',)

class ReportSerializer(serializers.ModelSerializer):
    user_name = serializers.CharField(source='user.full_name', read_only=True)
    post_title = serializers.CharField(source='post.title', read_only=True)

    class Meta:
        model = Report
        fields = '__all__'
        read_only_fields = ('user',)

class FollowSerializer(serializers.ModelSerializer):
    follower_name = serializers.CharField(source='follower.full_name', read_only=True)
    followed_name = serializers.CharField(source='followed.full_name', read_only=True)

    class Meta:
        model = Follow
        fields = '__all__'
        read_only_fields = ('follower',)

class NotificationSerializer(serializers.ModelSerializer):
    actor_name = serializers.CharField(source='actor.full_name', read_only=True)
    post_title = serializers.CharField(source='post.title', read_only=True)

    class Meta:
        model = Notification
        fields = '__all__'
