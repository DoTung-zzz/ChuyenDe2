from django.http import JsonResponse
from .models import ThirdParty, DataAccessLog
from django.utils.timezone import now
from datetime import timedelta

# Rate limits per tier (requests per day)
RATE_LIMITS = {
    'free': 100,
    'basic': 1000,
    'premium': None,  # Unlimited
}

class ApiKeyAuthMiddleware:
    """
    Middleware xác thực API Key cho đối tác third-party.
    Áp dụng cho mọi request tới /api/v1/public/
    """
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        if request.path.startswith('/api/v1/public/'):
            api_key = request.headers.get('X-API-Key')

            # 1. Kiểm tra có gửi key không
            if not api_key:
                return JsonResponse({
                    'error': 'Missing API Key',
                    'hint': 'Add header: X-API-Key: <your_api_key>',
                    'docs': 'Đăng ký tại /developer.html để nhận API Key'
                }, status=401)

            # 2. Tra cứu key trong database
            try:
                partner = ThirdParty.objects.get(api_key=api_key, is_active=True)
            except ThirdParty.DoesNotExist:
                return JsonResponse({
                    'error': 'Invalid or inactive API Key',
                    'hint': 'Kiểm tra lại API Key hoặc đăng ký tại /developer.html'
                }, status=403)

            # 3. Kiểm tra Rate Limit
            rate_limit = RATE_LIMITS.get(partner.tier)
            if rate_limit is not None:
                today_start = now().replace(hour=0, minute=0, second=0, microsecond=0)
                today_count = DataAccessLog.objects.filter(
                    partner=partner,
                    accessed_at__gte=today_start
                ).count()
                if today_count >= rate_limit:
                    resets_at = (today_start + timedelta(days=1)).isoformat()
                    return JsonResponse({
                        'error': 'Rate limit exceeded',
                        'limit': rate_limit,
                        'used': today_count,
                        'tier': partner.tier,
                        'resets_at': resets_at,
                        'hint': 'Nâng cấp tier để tăng giới hạn'
                    }, status=429)

            # 4. Ghi Access Log
            DataAccessLog.objects.create(
                partner=partner,
                endpoint=request.path,
                method=request.method,
                response_status=200
            )

            # 5. Gắn partner vào request để view có thể dùng
            request.third_party_partner = partner

        return self.get_response(request)
