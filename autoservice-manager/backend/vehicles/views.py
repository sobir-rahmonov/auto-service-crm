from rest_framework import permissions, viewsets
from rest_framework.exceptions import ValidationError

from accounts.permissions import IsAdminOrManager

from .models import Vehicle
from .serializers import VehicleSerializer


class VehicleViewSet(viewsets.ModelViewSet):
    serializer_class = VehicleSerializer
    filterset_fields = ['owner', 'brand', 'year']
    search_fields = ['plate_number', 'vin', 'brand', 'model']
    ordering_fields = ['created_at', 'year', 'mileage']

    def get_queryset(self):
        user = self.request.user
        queryset = Vehicle.objects.select_related('owner')
        if user.role == 'client':
            return queryset.filter(owner=user)
        return queryset

    def get_permissions(self):
        # Ko'rish: barcha tizimga kirgan foydalanuvchilar
        if self.action in ('list', 'retrieve'):
            return [permissions.IsAuthenticated()]
        # Qo'shish: client, admin, manager (mechanic emas)
        if self.action == 'create':
            return [permissions.IsAuthenticated(), self.CanCreate()]
        # O'zgartirish va o'chirish: faqat admin/manager
        return [IsAdminOrManager()]

    class CanCreate(permissions.BasePermission):
        def has_permission(self, request, view):
            return request.user.role in ('client', 'admin', 'manager')

    def perform_create(self, serializer):
        user = self.request.user
        if user.role == 'client':
            # Mijoz o'z nomiga qo'shadi
            serializer.save(owner=user)
        else:
            # Admin/manager egani o'zi ko'rsatishi shart
            if not serializer.validated_data.get('owner'):
                raise ValidationError({'owner': 'Egasini ko\'rsating.'})
            serializer.save()