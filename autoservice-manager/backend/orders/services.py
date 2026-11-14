from decimal import Decimal

from django.db import transaction
from django.db.models import F
from django.utils import timezone
from rest_framework.exceptions import PermissionDenied, ValidationError

from accounts.models import User
from inventory.models import Part

from .models import (
    Order, OrderPart, OrderService, OrderStatusHistory, PartRequest, Review,
)
S = Order.Status

# Qaysi statusdan qaysi statusga o'tish mumkin
ALLOWED_TRANSITIONS = {
    S.NEW: {S.DIAGNOSTICS, S.ASSIGNED, S.CANCELLED},
    S.DIAGNOSTICS: {S.ASSIGNED, S.CANCELLED},
    S.ASSIGNED: {S.IN_PROGRESS, S.CANCELLED},
    S.IN_PROGRESS: {S.COMPLETED, S.CANCELLED},
    S.COMPLETED: {S.PAID},
    S.PAID: set(),
    S.CANCELLED: set(),
}

# Xizmat va qism qo'shish mumkin bo'lgan statuslar
EDITABLE_STATUSES = {S.NEW, S.DIAGNOSTICS, S.ASSIGNED, S.IN_PROGRESS}

# Mechanic o'tkaza oladigan statuslar
MECHANIC_TRANSITIONS = {
    (S.ASSIGNED, S.IN_PROGRESS),
    (S.IN_PROGRESS, S.COMPLETED),
}


def _add_history(order, status, user):
    OrderStatusHistory.objects.create(
        order=order, status=status, changed_by=user,
    )


def _ensure_editable(order):
    if order.status not in EDITABLE_STATUSES:
        raise ValidationError(
            'Yakunlangan, to\'langan yoki bekor qilingan buyurtmani o\'zgartirib bo\'lmaydi.'
        )


def recalculate_total(order):
    """Umumiy narx = xizmatlar narxi + (qism narxi x soni).

    Prefetch keshiga tayanmaslik uchun bazadan yangidan o'qiymiz.
    """
    total = Decimal('0.00')
    for item in OrderService.objects.filter(order=order):
        total += item.price
    for item in OrderPart.objects.filter(order=order):
        total += item.price * item.quantity
    order.total_price = total
    order.save(update_fields=['total_price', 'updated_at'])
    return order


@transaction.atomic
def create_order(serializer, user):
    order = serializer.save()
    _add_history(order, order.status, user)
    return order


@transaction.atomic
def set_diagnosis(order, diagnosis, user):
    _ensure_editable(order)
    order.diagnosis = diagnosis
    update_fields = ['diagnosis', 'updated_at']
    if order.status == S.NEW:
        order.status = S.DIAGNOSTICS
        update_fields.append('status')
        _add_history(order, S.DIAGNOSTICS, user)
    order.save(update_fields=update_fields)
    return order


@transaction.atomic
def assign_mechanic(order, mechanic, user):
    if order.status not in (S.NEW, S.DIAGNOSTICS, S.ASSIGNED):
        raise ValidationError(
            'Ta\'mirlash boshlangan buyurtmada ustani almashtirib bo\'lmaydi.'
        )
    order.mechanic = mechanic
    update_fields = ['mechanic', 'updated_at']
    if order.status != S.ASSIGNED:
        order.status = S.ASSIGNED
        update_fields.append('status')
        _add_history(order, S.ASSIGNED, user)
    order.save(update_fields=update_fields)
    return order


@transaction.atomic
def add_service(order, service, user):
    _ensure_editable(order)
    if order.order_services.filter(service=service).exists():
        raise ValidationError('Bu xizmat buyurtmaga allaqachon qo\'shilgan.')
    OrderService.objects.create(
        order=order, service=service, price=service.price,
    )
    return recalculate_total(order)


@transaction.atomic
def remove_service(order, order_service_id, user):
    _ensure_editable(order)
    deleted, _ = order.order_services.filter(pk=order_service_id).delete()
    if not deleted:
        raise ValidationError('Bunday xizmat buyurtmada topilmadi.')
    return recalculate_total(order)


@transaction.atomic
def add_part(order, part, quantity, user):
    _ensure_editable(order)
    # Qismni qulflab olamiz, shunda bir vaqtda ikki kishi qoldiqni buzmaydi
    part = Part.objects.select_for_update().get(pk=part.pk)
    if part.quantity < quantity:
        raise ValidationError(
            f'Omborda yetarli qism yo\'q: "{part.name}" qoldig\'i {part.quantity} dona.'
        )
    Part.objects.filter(pk=part.pk).update(quantity=F('quantity') - quantity)

    existing = order.order_parts.filter(part=part).first()
    if existing:
        existing.quantity += quantity
        existing.save(update_fields=['quantity'])
    else:
        OrderPart.objects.create(
            order=order, part=part, quantity=quantity, price=part.price,
        )
    return recalculate_total(order)


@transaction.atomic
def remove_part(order, order_part_id, user):
    _ensure_editable(order)
    item = order.order_parts.filter(pk=order_part_id).first()
    if not item:
        raise ValidationError('Bunday qism buyurtmada topilmadi.')
    # Qism omborga qaytariladi
    Part.objects.filter(pk=item.part_id).update(
        quantity=F('quantity') + item.quantity,
    )
    item.delete()
    return recalculate_total(order)


@transaction.atomic
def change_status(order, new_status, user):
    old_status = order.status

    if new_status == S.ASSIGNED:
        raise ValidationError(
            'Ustaga biriktirish alohida amal orqali bajariladi (assign).'
        )
    if new_status not in ALLOWED_TRANSITIONS[old_status]:
        raise ValidationError(
            f'"{old_status}" holatidan "{new_status}" holatiga o\'tib bo\'lmaydi.'
        )

    if user.role == User.Role.MECHANIC:
        if order.mechanic_id != user.id:
            raise PermissionDenied('Bu buyurtma sizga biriktirilmagan.')
        if (old_status, new_status) not in MECHANIC_TRANSITIONS:
            raise PermissionDenied('Siz bu holatga o\'tkaza olmaysiz.')
    elif user.role not in (User.Role.ADMIN, User.Role.MANAGER):
        raise PermissionDenied('Statusni o\'zgartirishga ruxsat yo\'q.')

    if new_status == S.COMPLETED:
        if not order.order_services.exists():
            raise ValidationError(
                'Yakunlashdan oldin kamida bitta xizmat tanlanishi kerak.'
            )
        order.completed_at = timezone.now()

    if new_status == S.CANCELLED:
        # Ishlatilgan qismlar omborga qaytariladi
        for item in order.order_parts.all():
            Part.objects.filter(pk=item.part_id).update(
                quantity=F('quantity') + item.quantity,
            )

    order.status = new_status
    order.save()
    _add_history(order, new_status, user)
    return order






@transaction.atomic
def create_part_request(order, part, quantity, comment, user):
    if user.role != User.Role.MECHANIC:
        raise PermissionDenied('Faqat usta ehtiyot qism so\'rashi mumkin.')
    if order.mechanic_id != user.id:
        raise PermissionDenied('Bu buyurtma sizga biriktirilmagan.')
    if order.status not in (S.ASSIGNED, S.IN_PROGRESS):
        raise ValidationError(
            'Qism faqat biriktirilgan yoki ta\'mirlanayotgan buyurtma uchun so\'raladi.'
        )
    return PartRequest.objects.create(
        order=order, part=part, quantity=quantity,
        comment=comment, requested_by=user,
    )


@transaction.atomic
def approve_part_request(part_request, review_note, user):
    part_request = PartRequest.objects.select_for_update().select_related(
        'order', 'part',
    ).get(pk=part_request.pk)
    if part_request.status != PartRequest.Status.PENDING:
        raise ValidationError('Bu so\'rov allaqachon ko\'rib chiqilgan.')

    # Qism buyurtmaga qo'shiladi, ombor kamayadi, narx qayta hisoblanadi
    add_part(
        part_request.order, part_request.part, part_request.quantity, user,
    )

    part_request.status = PartRequest.Status.APPROVED
    part_request.reviewed_by = user
    part_request.review_note = review_note
    part_request.reviewed_at = timezone.now()
    part_request.save()
    return part_request


@transaction.atomic
def reject_part_request(part_request, review_note, user):
    part_request = PartRequest.objects.select_for_update().get(
        pk=part_request.pk,
    )
    if part_request.status != PartRequest.Status.PENDING:
        raise ValidationError('Bu so\'rov allaqachon ko\'rib chiqilgan.')
    part_request.status = PartRequest.Status.REJECTED
    part_request.reviewed_by = user
    part_request.review_note = review_note
    part_request.reviewed_at = timezone.now()
    part_request.save()
    return part_request




@transaction.atomic
def create_review(order_id, rating, comment, user):
    if user.role != User.Role.CLIENT:
        raise PermissionDenied('Faqat mijoz fikr qoldira oladi.')
    try:
        order = Order.objects.get(pk=order_id, client=user)
    except Order.DoesNotExist:
        raise ValidationError({'order': 'Bunday buyurtma topilmadi.'})
    if order.status not in (S.COMPLETED, S.PAID):
        raise ValidationError(
            'Fikr faqat yakunlangan yoki to\'langan buyurtmaga qoldiriladi.'
        )
    if Review.objects.filter(order=order).exists():
        raise ValidationError('Bu buyurtmaga fikr allaqachon qoldirilgan.')
    return Review.objects.create(
        order=order, client=user, rating=rating, comment=comment,
    )