from rest_framework import permissions, viewsets

from accounts.permissions import IsAdminOrManager

from .models import Service
from .serializers import ServiceSerializer


class ServiceViewSet(viewsets.ModelViewSet):
    serializer_class = ServiceSerializer
    filterset_fields = ['is_active']
    search_fields = ['name', 'description']
    ordering_fields = ['name', 'price', 'duration_minutes']

    def get_queryset(self):
        queryset = Service.objects.all()
        # Admin/manager hamma xizmatni ko'radi, boshqalar faqat faollarini
        if self.request.user.role in ('admin', 'manager'):
            return queryset
        return queryset.filter(is_active=True)

    def get_permissions(self):
        # Ko'rish: tizimga kirgan hamma
        if self.action in ('list', 'retrieve'):
            return [permissions.IsAuthenticated()]
        # Qo'shish, o'zgartirish, o'chirish: faqat admin/manager
        return [IsAdminOrManager()]