from rest_framework import serializers

from accounts.models import User

from .models import Vehicle


class VehicleSerializer(serializers.ModelSerializer):
    owner_name = serializers.CharField(source='owner.username', read_only=True)

    class Meta:
        model = Vehicle
        fields = (
            'id', 'owner', 'owner_name', 'brand', 'model', 'year',
            'plate_number', 'vin', 'color', 'mileage', 'created_at',
        )
        read_only_fields = ('id', 'created_at')
        extra_kwargs = {'owner': {'required': False}}

    def validate_owner(self, value):
        if value.role != User.Role.CLIENT:
            raise serializers.ValidationError(
                'Avtomobil egasi faqat mijoz (client) bo\'lishi mumkin.'
            )
        return value

    def validate_year(self, value):
        if value < 1900 or value > 2100:
            raise serializers.ValidationError('Yil noto\'g\'ri kiritilgan.')
        return value