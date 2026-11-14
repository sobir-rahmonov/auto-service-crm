from decimal import Decimal

from django.db import transaction
from django.db.models import Sum
from django.utils import timezone
from rest_framework.exceptions import ValidationError

from orders.models import Order, OrderStatusHistory

from .models import Invoice, Payment


def _generate_number():
    """Hisob raqami: INV-2026-0001 ko'rinishida, yil bo'yicha ketma-ket."""
    year = timezone.now().year
    prefix = f'INV-{year}-'
    last = (
        Invoice.objects.filter(number__startswith=prefix)
        .order_by('-number')
        .first()
    )
    next_num = int(last.number.split('-')[-1]) + 1 if last else 1
    return f'{prefix}{next_num:04d}'


def paid_total(invoice):
    result = invoice.payments.aggregate(total=Sum('amount'))['total']
    return result or Decimal('0.00')


@transaction.atomic
def create_invoice(order_id, user):
    try:
        order = Order.objects.select_for_update().get(pk=order_id)
    except Order.DoesNotExist:
        raise ValidationError({'order': 'Bunday buyurtma topilmadi.'})

    if order.status != Order.Status.COMPLETED:
        raise ValidationError(
            'Hisob-faktura faqat yakunlangan (completed) buyurtma uchun yaratiladi.'
        )
    if hasattr(order, 'invoice'):
        raise ValidationError('Bu buyurtma uchun hisob-faktura allaqachon mavjud.')

    return Invoice.objects.create(
        order=order,
        number=_generate_number(),
        total_amount=order.total_price,
        created_by=user,
    )


@transaction.atomic
def record_payment(invoice, amount, method, user):
    # Hisobni qulflaymiz: bir vaqtda ikki to'lov summani buzmasin
    invoice = Invoice.objects.select_for_update().select_related('order').get(
        pk=invoice.pk,
    )
    if invoice.status == Invoice.Status.PAID:
        raise ValidationError('Bu hisob allaqachon to\'liq to\'langan.')

    remaining = invoice.total_amount - paid_total(invoice)
    if amount > remaining:
        raise ValidationError(
            f'To\'lov summasi qolgan summadan ({remaining}) oshib ketdi.'
        )

    Payment.objects.create(
        invoice=invoice, amount=amount, method=method, recorded_by=user,
    )

    # To'liq to'langan bo'lsa: hisob va buyurtma "paid" bo'ladi
    if paid_total(invoice) >= invoice.total_amount:
        invoice.status = Invoice.Status.PAID
        invoice.save(update_fields=['status'])

        order = invoice.order
        order.status = Order.Status.PAID
        order.save(update_fields=['status', 'updated_at'])
        OrderStatusHistory.objects.create(
            order=order, status=Order.Status.PAID, changed_by=user,
        )
    return invoice