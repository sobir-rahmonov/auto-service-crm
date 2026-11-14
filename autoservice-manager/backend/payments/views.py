from rest_framework import mixins, permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from accounts.models import User
from accounts.permissions import IsAdminOrManager

from . import services
from .models import Invoice
from .serializers import (
    InvoiceCreateSerializer, InvoiceSerializer, PaymentCreateSerializer,
)


class InvoiceViewSet(
    mixins.ListModelMixin,
    mixins.RetrieveModelMixin,
    viewsets.GenericViewSet,
):
    """Hisob-fakturalar. Yaratish va to'lov qayd etish faqat amallar orqali."""

    serializer_class = InvoiceSerializer
    filterset_fields = ['status', 'order']
    search_fields = ['number', 'order__client__username']
    ordering_fields = ['created_at', 'total_amount']

    def get_queryset(self):
        user = self.request.user
        queryset = Invoice.objects.select_related(
            'order__client', 'order__vehicle',
        ).prefetch_related('payments__recorded_by')
        if user.role == User.Role.CLIENT:
            return queryset.filter(order__client=user)
        if user.role == User.Role.MECHANIC:
            # Usta hisob-fakturalarni ko'rmaydi
            return queryset.none()
        return queryset

    def get_permissions(self):
        if self.action in ('list', 'retrieve'):
            return [permissions.IsAuthenticated()]
        return [IsAdminOrManager()]

    def _respond(self, invoice, code=status.HTTP_200_OK):
        invoice = self.get_queryset().get(pk=invoice.pk)
        return Response(InvoiceSerializer(invoice).data, status=code)

    @action(detail=False, methods=['post'])
    def create_for_order(self, request):
        """Yakunlangan buyurtma uchun hisob-faktura yaratish."""
        serializer = InvoiceCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        invoice = services.create_invoice(
            serializer.validated_data['order'], request.user,
        )
        return self._respond(invoice, status.HTTP_201_CREATED)

    @action(detail=True, methods=['post'])
    def pay(self, request, pk=None):
        """To'lovni qayd etish."""
        invoice = self.get_object()
        serializer = PaymentCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        invoice = services.record_payment(
            invoice,
            serializer.validated_data['amount'],
            serializer.validated_data['method'],
            request.user,
        )
        return self._respond(invoice)