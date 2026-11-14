from rest_framework import mixins, permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied
from rest_framework.response import Response

from accounts.models import User
from accounts.permissions import (
    IsAdminOrManager, IsClient, IsMechanic, IsStaffRole,
)

from . import services
from .models import Order, PartRequest, Review
from .serializers import (
    AddPartSerializer, AddServiceSerializer, AssignMechanicSerializer,
    ChangeStatusSerializer, DiagnosisSerializer, MechanicNotesSerializer,
    OrderCreateSerializer, OrderSerializer, PartRequestCreateSerializer,
    PartRequestReviewSerializer, PartRequestSerializer,
    ReviewCreateSerializer, ReviewSerializer,
)

class OrderViewSet(
    mixins.ListModelMixin,
    mixins.RetrieveModelMixin,
    mixins.CreateModelMixin,
    viewsets.GenericViewSet,
):
    """Buyurtmalar. Tahrirlash va o'chirish yo'q, faqat amallar (action) orqali o'zgaradi."""

    serializer_class = OrderSerializer
    filterset_fields = {
        'status': ['exact'],
        'client': ['exact'],
        'mechanic': ['exact'],
        'vehicle': ['exact'],
        'created_at': ['gte', 'lte'],
    }
    search_fields = [
        'client__username', 'vehicle__plate_number', 'problem_description',
    ]
    ordering_fields = ['created_at', 'total_price', 'status']

    # ---------- Yordamchi qismlar ----------

    def get_queryset(self):
        user = self.request.user
        queryset = Order.objects.select_related(
            'client', 'vehicle', 'mechanic',
        ).prefetch_related(
            'order_services__service',
            'order_parts__part',
            'status_history__changed_by',
        )
        if user.role == User.Role.CLIENT:
            return queryset.filter(client=user)
        if user.role == User.Role.MECHANIC:
            return queryset.filter(mechanic=user)
        return queryset

    def get_permissions(self):
        if self.action in ('list', 'retrieve'):
            return [permissions.IsAuthenticated()]
        if self.action == 'create':
            return [(IsAdminOrManager | IsClient)()]
        if self.action == 'request_part':
            return [IsMechanic()]
        if self.action in ('diagnosis', 'change_status', 'notes'):
            return [IsStaffRole()]
        # assign, add/remove service, add/remove part
        return [IsAdminOrManager()]

    def _respond(self, order, code=status.HTTP_200_OK):
        # Yangilangan ma'lumot bilan qayta o'qiymiz
        order = self.get_queryset().get(pk=order.pk)
        return Response(OrderSerializer(order).data, status=code)

    # ---------- Yaratish ----------

    def create(self, request, *args, **kwargs):
        serializer = OrderCreateSerializer(
            data=request.data, context={'request': request},
        )
        serializer.is_valid(raise_exception=True)
        order = services.create_order(serializer, request.user)
        return self._respond(order, status.HTTP_201_CREATED)

    # ---------- Amallar ----------

    @action(detail=True, methods=['post'])
    def diagnosis(self, request, pk=None):
        """Diagnostika natijasini kiritish (admin, manager, biriktirilgan usta)."""
        order = self.get_object()
        serializer = DiagnosisSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        order = services.set_diagnosis(
            order, serializer.validated_data['diagnosis'], request.user,
        )
        return self._respond(order)

    @action(detail=True, methods=['post'])
    def assign(self, request, pk=None):
        """Ustaga biriktirish (admin, manager)."""
        order = self.get_object()
        serializer = AssignMechanicSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        order = services.assign_mechanic(
            order, serializer.validated_data['mechanic'], request.user,
        )
        return self._respond(order)

    @action(detail=True, methods=['post'], url_path='add-service')
    def add_service(self, request, pk=None):
        order = self.get_object()
        serializer = AddServiceSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        order = services.add_service(
            order, serializer.validated_data['service'], request.user,
        )
        return self._respond(order)

    @action(
        detail=True, methods=['delete'],
        url_path=r'remove-service/(?P<item_id>\d+)',
    )
    def remove_service(self, request, pk=None, item_id=None):
        order = self.get_object()
        order = services.remove_service(order, int(item_id), request.user)
        return self._respond(order)

    @action(detail=True, methods=['post'], url_path='add-part')
    def add_part(self, request, pk=None):
        order = self.get_object()
        serializer = AddPartSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        order = services.add_part(
            order,
            serializer.validated_data['part'],
            serializer.validated_data['quantity'],
            request.user,
        )
        return self._respond(order)

    @action(
        detail=True, methods=['delete'],
        url_path=r'remove-part/(?P<item_id>\d+)',
    )
    def remove_part(self, request, pk=None, item_id=None):
        order = self.get_object()
        order = services.remove_part(order, int(item_id), request.user)
        return self._respond(order)

    @action(detail=True, methods=['post'], url_path='change-status')
    def change_status(self, request, pk=None):
        """Statusni o'zgartirish (qoidalar services.py da tekshiriladi)."""
        order = self.get_object()
        serializer = ChangeStatusSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        order = services.change_status(
            order, serializer.validated_data['status'], request.user,
        )
        return self._respond(order)

    @action(detail=True, methods=['patch'])
    def notes(self, request, pk=None):
        """Usta izohlari: qo'shimcha nosozlik, bajarilgan ish, sarflangan vaqt."""
        order = self.get_object()
        user = request.user
        if user.role == User.Role.MECHANIC and order.mechanic_id != user.id:
            raise PermissionDenied('Bu buyurtma sizga biriktirilmagan.')
        if order.status not in services.EDITABLE_STATUSES:
            raise PermissionDenied('Bu holatdagi buyurtmani o\'zgartirib bo\'lmaydi.')
        serializer = MechanicNotesSerializer(
            order, data=request.data, partial=True,
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return self._respond(order)

    @action(detail=True, methods=['post'], url_path='request-part')
    def request_part(self, request, pk=None):
        """Usta ehtiyot qism so'raydi (faqat o'ziga biriktirilgan buyurtma)."""
        order = self.get_object()
        serializer = PartRequestCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        part_request = services.create_part_request(
            order, data['part'], data['quantity'], data['comment'], request.user,
        )
        return Response(
            PartRequestSerializer(part_request).data,
            status=status.HTTP_201_CREATED,
        )


class PartRequestViewSet(
    mixins.ListModelMixin,
    mixins.RetrieveModelMixin,
    viewsets.GenericViewSet,
):
    """Ehtiyot qism so'rovlari. Tasdiqlash/rad etish: admin va manager."""

    serializer_class = PartRequestSerializer
    filterset_fields = ['status', 'order']
    ordering_fields = ['created_at']

    def get_queryset(self):
        user = self.request.user
        queryset = PartRequest.objects.select_related(
            'order', 'part', 'requested_by', 'reviewed_by',
        )
        if user.role == User.Role.MECHANIC:
            return queryset.filter(requested_by=user)
        if user.role == User.Role.CLIENT:
            return queryset.none()
        return queryset

    def get_permissions(self):
        if self.action in ('list', 'retrieve'):
            return [permissions.IsAuthenticated()]
        return [IsAdminOrManager()]

    @action(detail=True, methods=['post'])
    def approve(self, request, pk=None):
        part_request = self.get_object()
        serializer = PartRequestReviewSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        part_request = services.approve_part_request(
            part_request, serializer.validated_data['review_note'], request.user,
        )
        return Response(PartRequestSerializer(part_request).data)

    @action(detail=True, methods=['post'])
    def reject(self, request, pk=None):
        part_request = self.get_object()
        serializer = PartRequestReviewSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        part_request = services.reject_part_request(
            part_request, serializer.validated_data['review_note'], request.user,
        )
        return Response(PartRequestSerializer(part_request).data)



class ReviewViewSet(
    mixins.ListModelMixin,
    mixins.RetrieveModelMixin,
    mixins.CreateModelMixin,
    viewsets.GenericViewSet,
):
    """Mijoz fikrlari. Yaratish faqat mijoz uchun."""

    serializer_class = ReviewSerializer
    filterset_fields = ['rating', 'order']
    ordering_fields = ['created_at', 'rating']

    def get_queryset(self):
        user = self.request.user
        queryset = Review.objects.select_related('client', 'order')
        if user.role == User.Role.CLIENT:
            return queryset.filter(client=user)
        if user.role == User.Role.MECHANIC:
            return queryset.filter(order__mechanic=user)
        return queryset

    def get_permissions(self):
        if self.action == 'create':
            return [IsClient()]
        return [permissions.IsAuthenticated()]

    def create(self, request, *args, **kwargs):
        serializer = ReviewCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        review = services.create_review(
            data['order'], data['rating'], data['comment'], request.user,
        )
        return Response(
            ReviewSerializer(review).data, status=status.HTTP_201_CREATED,
        )    