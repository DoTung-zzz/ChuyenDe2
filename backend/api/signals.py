from django.db.models.signals import post_save
from django.dispatch import receiver
from .models import Report, Post

@receiver(post_save, sender=Report)
def auto_increase_report_count(sender, instance, created, **kwargs):
    if created:
        post = instance.post
        post.report_count += 1
        post.save(update_fields=['report_count'])
