from django.contrib import admin
from django.urls import path, include
from django.http import JsonResponse


def health_check(request):
    return JsonResponse({'status': 'ok', 'service': 'backend'})

urlpatterns = [
    path('api/health/', health_check, name='health_check'),
    path('admin/', admin.site.urls),
    path('api/auth/', include('apps.authentication.urls')),
    path('api/modismos/', include('apps.modismos.urls')),
    path('api/asistente/', include('apps.asistente.urls')),
    path('api/evaluacion/', include('apps.evaluacion.urls')),
    path('api/admin/', include('apps.evaluacion.admin_urls')),
]
