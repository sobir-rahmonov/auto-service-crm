from rest_framework import serializers

from accounts.models import User
from inventory.models import Part
from services.models import Service

from .models import (
    Order, OrderPart, OrderService, OrderStatusHistory, PartRequest, Review,
)


# ---------- O'qish uchun (javob) ----------

class OrderServiceSerializer(serializers.ModelSerializer):
    service_name = serializers.CharField(source='service.name', read_only=True)

    class Meta:
        model = OrderService
        fields = ('id', 'service', 'service_name', 'price')


class OrderPartSerializer(serializers.ModelSerializer):
    part_name = serializers.CharField(source='part.name', read_only=True)
    subtotal = serializers.DecimalField(
        max_digits=12, decimal_places=2, read_only=True,
    )

    class Meta:
        model = OrderPart
        fields = ('id', 'part', 'part_name', 'quantity', 'price', 'subtotal')


class OrderStatusHistorySerializer(serializers.ModelSerializer):
    changed_by_name = serializers.CharField(
        source='changed_by.username', read_only=True,
    )

    class Meta:
        model = OrderStatusHistory
        fields = ('id', 'status', 'changed_by', 'changed_by_name', 'changed_at')


class OrderSerializer(serializers.ModelSerializer):
    client_name = serializers.CharField(source='client.username', read_only=True)
    vehicle_info = serializers.CharField(source='vehicle.__str__', read_only=True)
    mechanic_name = serializers.CharField(
        source='mechanic.username', read_only=True, default=None,
    )
    status_display = serializers.CharField(
        source='get_status_display', read_only=True,
    )
    order_services = OrderServiceSerializer(many=True, read_only=True)
    order_parts = OrderPartSerializer(many=True, read_only=True)
    status_history = OrderStatusHistorySerializer(many=True, read_only=True)

    class Meta:
        model = Order
        fields = (
            'id', 'client', 'client_name', 'vehicle', 'vehicle_info',
            'mechanic', 'mechanic_name', 'status', 'status_display',
            'problem_description', 'diagnosis', 'extra_issues',
            'work_notes', 'time_spent_minutes', 'total_price',
            'order_services', 'order_parts', 'status_history',
            'created_at', 'updated_at', 'completed_at',
        )
        read_only_fields = fields


# ---------- Buyurtma yaratish ----------

class OrderCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Order
        fields = ('id', 'client', 'vehicle', 'problem_description')
        read_only_fields = ('id',)
        extra_kwargs = {'client': {'required': False}}

    def validate_client(self, value):
        if value.role != User.Role.CLIENT:
            raise serializers.ValidationError(
                'Buyurtma egasi faqat mijoz (client) bo\'lishi mumkin.'
            )
        return value

    def validate(self, attrs):
        user = self.context['request'].user
        if user.role == User.Role.CLIENT:
            # Mijoz faqat o'z nomiga so'rov yuboradi
            attrs['client'] = user
        elif not attrs.get('client'):
            raise serializers.ValidationError(
                {'client': 'Mijozni ko\'rsating.'}
            )
        if attrs['vehicle'].owner_id != attrs['client'].id:
            raise serializers.ValidationError(
                {'vehicle': 'Bu avtomobil tanlangan mijozga tegishli emas.'}
            )
        return attrs


# ---------- Amallar uchun (action) ----------

class DiagnosisSerializer(serializers.Serializer):
    diagnosis = serializers.CharField()


class AssignMechanicSerializer(serializers.Serializer):
    mechanic = serializers.PrimaryKeyRelatedField(
        queryset=User.objects.filter(role=User.Role.MECHANIC, is_active=True),
    )


class AddServiceSerializer(serializers.Serializer):
    service = serializers.PrimaryKeyRelatedField(
        queryset=Service.objects.filter(is_active=True),
    )


class AddPartSerializer(serializers.Serializer):
    part = serializers.PrimaryKeyRelatedField(
        queryset=Part.objects.filter(is_active=True),
    )
    quantity = serializers.IntegerField(min_value=1, default=1)


class ChangeStatusSerializer(serializers.Serializer):
    status = serializers.ChoiceField(choices=Order.Status.choices)


class MechanicNotesSerializer(serializers.ModelSerializer):
    class Meta:
        model = Order
        fields = ('extra_issues', 'work_notes', 'time_spent_minutes')




# ---------- Ehtiyot qism so'rovi ----------

class PartRequestSerializer(serializers.ModelSerializer):
    part_name = serializers.CharField(source='part.name', read_only=True)
    status_display = serializers.CharField(
        source='get_status_display', read_only=True,
    )
    requested_by_name = serializers.CharField(
        source='requested_by.username', read_only=True, default=None,
    )
    reviewed_by_name = serializers.CharField(
        source='reviewed_by.username', read_only=True, default=None,
    )

    class Meta:
        model = PartRequest
        fields = (
            'id', 'order', 'part', 'part_name', 'quantity', 'comment',
            'status', 'status_display', 'requested_by', 'requested_by_name',
            'reviewed_by', 'reviewed_by_name', 'review_note',
            'created_at', 'reviewed_at',
        )
        read_only_fields = fields


class PartRequestCreateSerializer(serializers.Serializer):
    part = serializers.PrimaryKeyRelatedField(
        queryset=Part.objects.filter(is_active=True),
    )
    quantity = serializers.IntegerField(min_value=1, default=1)
    comment = serializers.CharField(required=False, allow_blank=True, default='')


class PartRequestReviewSerializer(serializers.Serializer):
    review_note = serializers.CharField(required=False, allow_blank=True, default='')    





# ---------- Fikr va baho ----------

class ReviewSerializer(serializers.ModelSerializer):
    client_name = serializers.CharField(source='client.username', read_only=True)

    class Meta:
        model = Review
        fields = (
            'id', 'order', 'client', 'client_name',
            'rating', 'comment', 'created_at',
        )
        read_only_fields = fields


class ReviewCreateSerializer(serializers.Serializer):
    order = serializers.IntegerField()
    rating = serializers.IntegerField(min_value=1, max_value=5)
    comment = serializers.CharField(required=False, allow_blank=True, default='')