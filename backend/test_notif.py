import os
import django
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "backend.settings")
django.setup()

from api.models import User, Follow, Post, Notification

print("Users:", User.objects.count())
print("Posts:", Post.objects.count())
print("Follows:", Follow.objects.count())
print("Notifications:", Notification.objects.count())

for n in Notification.objects.all():
    print(n.recipient.username, "<-", n.actor.username, n.action_type, n.post.title)
