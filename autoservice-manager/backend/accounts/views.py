from rest_framework import generics, permissions, viewsets

from .models import User
from .permissions import IsAdminOrManager
from .serializers import (
    RegisterSerializer, UserCreateSerializer,
    UserSerializer, UserUpdateSerializer,
)

from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError as DjangoValidationError
from rest_framework.response import Response
from rest_framework.views import APIView

class RegisterView(generics.CreateAPIView):
    """Yangi mijoz ro'yxatdan o'tishi (token talab qilinmaydi)."""
    queryset = User.objects.all()
    serializer_class = RegisterSerializer
    permission_classes = [permissions.AllowAny]


class ProfileView(generics.RetrieveUpdateAPIView):
    """Joriy foydalanuvchining o'z profili."""
    serializer_class = UserSerializer

    def get_object(self):
        return self.request.user


class UserViewSet(viewsets.ModelViewSet):
    """Foydalanuvchilarni boshqarish (admin/manager).

    Manager faqat mijozlar bilan ishlaydi, admin hammasi bilan.
    O'chirish yo'q: foydalanuvchi bloklanadi (is_active=False).
    """
    permission_classes = [IsAdminOrManager]
    http_method_names = ['get', 'post', 'patch', 'head', 'options']
    filterset_fields = ['role', 'is_active']
    search_fields = ['username', 'first_name', 'last_name', 'phone']
    ordering_fields = ['id', 'username', 'date_joined']

    def get_queryset(self):
        queryset = User.objects.all().order_by('id')
        if self.request.user.role == User.Role.MANAGER:
            return queryset.filter(role=User.Role.CLIENT)
        return queryset

    def get_serializer_class(self):
        if self.action == 'create':
            return UserCreateSerializer
        if self.action == 'partial_update':
            return UserUpdateSerializer
        return UserSerializer




class MechanicListView(generics.ListAPIView):
    """Faol ustalar ro'yxati (admin/manager, ustaga biriktirish uchun)."""
    serializer_class = UserSerializer
    permission_classes = [IsAdminOrManager]
    pagination_class = None
    queryset = User.objects.filter(
        role=User.Role.MECHANIC, is_active=True,
    ).order_by('first_name', 'username')  



class ChangePasswordView(APIView):
    """Joriy foydalanuvchi o'z parolini o'zgartiradi."""

    def post(self, request):
        old = request.data.get('old_password', '')
        new = request.data.get('new_password', '')
        if not request.user.check_password(old):
            return Response(
                {'old_password': ['Joriy parol noto\'g\'ri.']}, status=400,
            )
        try:
            validate_password(new, request.user)
        except DjangoValidationError as e:
            return Response({'new_password': list(e.messages)}, status=400)
        request.user.set_password(new)
        request.user.save()
        return Response({'detail': 'Parol o\'zgartirildi.'})       