from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import OrderViewSet, PartRequestViewSet, ReviewViewSet

router = DefaultRouter()
router.register('', OrderViewSet, basename='order')

part_request_router = DefaultRouter()
part_request_router.register('', PartRequestViewSet, basename='part-request')

review_router = DefaultRouter()
review_router.register('', ReviewViewSet, basename='review')

urlpatterns = [
    # Tartib muhim: bu prefikslar buyurtma id si deb qabul qilinmasligi uchun birinchi turadi
    path('part-requests/', include(part_request_router.urls)),
    path('reviews/', include(review_router.urls)),
    path('', include(router.urls)),
]