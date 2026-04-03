from django.contrib import admin
from django.urls import path, include
from django.views.generic import TemplateView

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/', include('api.urls')),
    
    # Frontend Routes
    path('', TemplateView.as_view(template_name='index.html'), name='home'),
    path('index.html', TemplateView.as_view(template_name='index.html')),
    path('login.html', TemplateView.as_view(template_name='login.html')),
    path('dacsan.html', TemplateView.as_view(template_name='dacsan.html')),
    path('profile.html', TemplateView.as_view(template_name='profile.html')),
    path('saved.html', TemplateView.as_view(template_name='saved.html')),
    path('trending.html', TemplateView.as_view(template_name='trending.html')),
    path('chitiet.html', TemplateView.as_view(template_name='chitiet.html')),
    path('dangbai.html', TemplateView.as_view(template_name='dangbai.html')),
    path('timkiem.html', TemplateView.as_view(template_name='timkiem.html')),
    path('thongbao.html', TemplateView.as_view(template_name='thongbao.html')),
    path('settings.html', TemplateView.as_view(template_name='settings.html')),
    path('admin.html', TemplateView.as_view(template_name='admin.html')),
]
