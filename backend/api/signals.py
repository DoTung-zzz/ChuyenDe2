from django.db.models.signals import post_save
from django.dispatch import receiver
from .models import Report, Post, Notification, Follow

@receiver(post_save, sender=Report)
def auto_increase_report_count(sender, instance, created, **kwargs):
    if created:
        post = instance.post
        post.report_count += 1
        post.save(update_fields=['report_count'])

@receiver(post_save, sender=Post)
def create_new_post_notifications(sender, instance, created, **kwargs):
    if created and instance.status == 'Active':
        followers = Follow.objects.filter(followed=instance.contributor)
        for follow in followers:
            Notification.objects.create(
                recipient=follow.follower,
                actor=instance.contributor,
                post=instance,
                action_type='new_post'
            )
