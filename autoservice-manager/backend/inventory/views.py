from rest_framework import mixins, permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from accounts.permissions import IsAdminOrManager

from . import services
from .models import Part, StockIn
from .serializers import PartSerializer, StockInSerializer


class PartViewSet(viewsets.ModelViewSet):
    serializer_class = PartSerializer
    filterset_fields = ['is_active']
    search_fields = ['name', 'sku']
    ordering_fields = ['name', 'price', 'quantity']

    def get_queryset(self):
        queryset = Part.objects.all()
        # Admin/manager hamma qismni ko'radi, boshqalar faqat faollarini
        if self.request.user.role in ('admin', 'manager'):
            return queryset
        return queryset.filter(is_active=True)

    def get_permissions(self):
        # Omborni faqat xodimlar ko'radi (mijoz emas)
        if self.action in ('list', 'retrieve', 'low_stock'):
            return [permissions.IsAuthenticated(), self.IsStaff()]
        # Qo'shish, o'zgartirish, o'chirish: faqat admin/manager
        return [IsAdminOrManager()]

    class IsStaff(permissions.BasePermission):
        def has_permission(self, request, view):
            return request.user.role in ('admin', 'manager', 'mechanic')

    @action(detail=False, methods=['get'], url_path='low-stock')
    def low_stock(self, request):
        """Qoldig'i kam qolgan qismlar ro'yxati."""
        parts = [p for p in self.get_queryset() if p.is_low_stock]
        serializer = self.get_serializer(parts, many=True)
        return Response(serializer.data)




class StockInViewSet(
    mixins.ListModelMixin,
    mixins.RetrieveModelMixin,
    mixins.CreateModelMixin,
    viewsets.GenericViewSet,
):
    """Omborga kirim. Faqat admin/manager. Tahrirlash va o'chirish yo'q."""

    serializer_class = StockInSerializer
    queryset = StockIn.objects.select_related('part', 'received_by')
    permission_classes = [IsAdminOrManager]
    filterset_fields = ['part']
    search_fields = ['part__name', 'part__sku', 'supplier']
    ordering_fields = ['created_at', 'quantity']

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        stock_in = services.receive_stock(
            data['part'], data['quantity'], data.get('unit_cost'),
            data.get('supplier', ''), data.get('note', ''), request.user,
        )
        return Response(
            self.get_serializer(stock_in).data, status=status.HTTP_201_CREATED,
        )    