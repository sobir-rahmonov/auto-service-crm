from decimal import Decimal

from rest_framework import serializers

from .models import Invoice, Payment

class PaymentSerializer(serializers.ModelSerializer):
    method_display = serializers.CharField(
        source='get_method_display', read_only=True,
    )
    recorded_by_name = serializers.CharField(
        source='recorded_by.username', read_only=True, default=None,
    )

    class Meta:
        model = Payment
        fields = (
            'id', 'invoice', 'amount', 'method', 'method_display',
            'recorded_by', 'recorded_by_name', 'paid_at',
        )
        read_only_fields = fields


class InvoiceSerializer(serializers.ModelSerializer):
    client_name = serializers.CharField(
        source='order.client.username', read_only=True,
    )
    vehicle_info = serializers.CharField(
        source='order.vehicle.__str__', read_only=True,
    )
    status_display = serializers.CharField(
        source='get_status_display', read_only=True,
    )
    paid_amount = serializers.SerializerMethodField()
    remaining_amount = serializers.SerializerMethodField()
    payments = PaymentSerializer(many=True, read_only=True)

    class Meta:
        model = Invoice
        fields = (
            'id', 'number', 'order', 'client_name', 'vehicle_info',
            'total_amount', 'paid_amount', 'remaining_amount',
            'status', 'status_display', 'payments', 'created_at',
        )
        read_only_fields = fields

    def get_paid_amount(self, obj):
        return sum((p.amount for p in obj.payments.all()), 0)

    def get_remaining_amount(self, obj):
        return obj.total_amount - self.get_paid_amount(obj)


# ---------- Amallar uchun ----------

class InvoiceCreateSerializer(serializers.Serializer):
    order = serializers.IntegerField()


class PaymentCreateSerializer(serializers.Serializer):
    amount = serializers.DecimalField(
        max_digits=12, decimal_places=2, min_value=Decimal('0.01'),
    )
    method = serializers.ChoiceField(
        choices=Payment.Method.choices, default=Payment.Method.CASH,
    )