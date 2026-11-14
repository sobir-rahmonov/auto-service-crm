from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import PartViewSet, StockInViewSet

router = DefaultRouter()
router.register('', PartViewSet, basename='part')

stock_in_router = DefaultRouter()
stock_in_router.register('', StockInViewSet, basename='stock-in')

urlpatterns = [
    # Tartib muhim: "stock-in/" qism id si deb qabul qilinmasligi uchun birinchi turadi
    path('stock-in/', include(stock_in_router.urls)),
    path('', include(router.urls)),
]