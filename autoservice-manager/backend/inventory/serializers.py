from rest_framework import serializers

from .models import Part, StockIn

class PartSerializer(serializers.ModelSerializer):
    is_low_stock = serializers.BooleanField(read_only=True)

    class Meta:
        model = Part
        fields = (
            'id', 'name', 'sku', 'description', 'price',
            'quantity', 'min_quantity', 'is_low_stock',
            'is_active', 'created_at',
        )
        read_only_fields = ('id', 'created_at', 'quantity')

    def validate_price(self, value):
        if value <= 0:
            raise serializers.ValidationError('Narx 0 dan katta bo\'lishi kerak.')
        return value




class StockInSerializer(serializers.ModelSerializer):
    part_name = serializers.CharField(source='part.name', read_only=True)
    received_by_name = serializers.CharField(
        source='received_by.username', read_only=True, default=None,
    )

    class Meta:
        model = StockIn
        fields = (
            'id', 'part', 'part_name', 'quantity', 'unit_cost',
            'supplier', 'note', 'received_by', 'received_by_name',
            'created_at',
        )
        read_only_fields = ('id', 'received_by', 'created_at')

    def validate_quantity(self, value):
        if value < 1:
            raise serializers.ValidationError('Miqdor 1 dan kam bo\'lmasligi kerak.')
        return value    