from django.contrib.auth.password_validation import validate_password
from rest_framework import serializers

from .models import User


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = (
            'id', 'username', 'email', 'first_name',
            'last_name', 'phone', 'role', 'is_active',
        )
        read_only_fields = ('id', 'role', 'is_active')

class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(
        write_only=True,
        validators=[validate_password],
    )
    password2 = serializers.CharField(write_only=True)

    class Meta:
        model = User
        fields = (
            'username', 'email', 'first_name', 'last_name',
            'phone', 'password', 'password2',
        )

    def validate(self, attrs):
        if attrs['password'] != attrs['password2']:
            raise serializers.ValidationError(
                {'password2': 'Parollar bir xil emas.'}
            )
        return attrs

    def create(self, validated_data):
        validated_data.pop('password2')
        password = validated_data.pop('password')
        user = User(**validated_data)
        user.role = User.Role.CLIENT
        user.set_password(password)
        user.save()
        return user

    



class UserCreateSerializer(serializers.ModelSerializer):
    """Admin/manager tomonidan foydalanuvchi yaratish."""
    password = serializers.CharField(
        write_only=True,
        validators=[validate_password],
    )

    class Meta:
        model = User
        fields = (
            'id', 'username', 'email', 'first_name', 'last_name',
            'phone', 'role', 'password',
        )
        read_only_fields = ('id',)

    def validate_role(self, value):
        requester = self.context['request'].user
        # Manager faqat mijoz qo'sha oladi, admin istalgan rolni
        if requester.role != User.Role.ADMIN and value != User.Role.CLIENT:
            raise serializers.ValidationError(
                'Siz faqat mijoz (client) qo\'sha olasiz.'
            )
        return value

    def create(self, validated_data):
        password = validated_data.pop('password')
        user = User(**validated_data)
        user.set_password(password)
        user.save()
        return user


class UserUpdateSerializer(serializers.ModelSerializer):
    """Admin/manager tomonidan foydalanuvchini tahrirlash."""

    class Meta:
        model = User
        fields = (
            'id', 'username', 'email', 'first_name', 'last_name',
            'phone', 'role', 'is_active',
        )
        read_only_fields = ('id', 'username')

    def validate(self, attrs):
        requester = self.context['request'].user
        is_admin = requester.role == User.Role.ADMIN

        # Rol va holatni faqat admin o'zgartiradi
        if not is_admin and ('role' in attrs or 'is_active' in attrs):
            raise serializers.ValidationError(
                'Rol va holatni faqat admin o\'zgartira oladi.'
            )
        # Admin o'zini bloklay yoki rolini tushira olmaydi (tizimdan chiqib ketmaslik uchun)
        if self.instance and self.instance.pk == requester.pk:
            if attrs.get('role', requester.role) != requester.role:
                raise serializers.ValidationError(
                    {'role': 'O\'z rolingizni o\'zgartira olmaysiz.'}
                )
            if attrs.get('is_active') is False:
                raise serializers.ValidationError(
                    {'is_active': 'O\'zingizni bloklay olmaysiz.'}
                )
        return attrs    