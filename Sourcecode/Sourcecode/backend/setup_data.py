import os
import django

# Setup Django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from api.models import Role, Region, User

def setup():
    # Roles
    roles = ['Admin', 'Contributor', 'Consumer']
    for r_name in roles:
        Role.objects.get_or_create(role_name=r_name)
    print("Roles created/checked.")

    # Regions
    regions = [
        {'name': 'Miền Bắc', 'desc': 'Đặc trưng với các món thanh đạm, ít cay.'},
        {'name': 'Miền Trung', 'desc': 'Đặc trưng với món ăn đậm đà, cay nồng.'},
        {'name': 'Miền Nam', 'desc': 'Đặc trưng với món ăn ngọt, béo ngậy.'}
    ]
    for r in regions:
        Region.objects.get_or_create(region_name=r['name'], defaults={'description': r['desc']})
    print("Regions created/checked.")

    # Create a default admin user if not exists
    if not User.objects.filter(username='admin').exists():
        admin_role, _ = Role.objects.get_or_create(role_name='Admin')
        User.objects.create_superuser('admin', 'admin@example.com', 'admin123', full_name='Quản trị viên', role=admin_role)
        print("Admin user created: admin / admin123")
    else:
        print("Admin user already exists.")

if __name__ == '__main__':
    setup()
