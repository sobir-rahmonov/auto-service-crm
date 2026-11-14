from decimal import Decimal

from django.conf import settings
from django.db import models

from orders.models import Order


class Invoice(models.Model):
    class Status(models.TextChoices):
        UNPAID = 'unpaid', 'To\'lanmagan'
        PAID = 'paid', 'To\'langan'

    order = models.OneToOneField(
        Order, on_delete=models.PROTECT, related_name='invoice',
    )
    number = models.CharField(max_length=30, unique=True, editable=False)
    total_amount = models.DecimalField(max_digits=12, decimal_places=2)
    status = models.CharField(
        max_length=10, choices=Status.choices, default=Status.UNPAID,
    )
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name='+',
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f'{self.number} ({self.status})'


class Payment(models.Model):
    class Method(models.TextChoices):
        CASH = 'cash', 'Naqd'
        CARD = 'card', 'Karta'
        TRANSFER = 'transfer', 'O\'tkazma'

    invoice = models.ForeignKey(
        Invoice, on_delete=models.PROTECT, related_name='payments',
    )
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    method = models.CharField(
        max_length=10, choices=Method.choices, default=Method.CASH,
    )
    recorded_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name='+',
    )
    paid_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-paid_at']

    def __str__(self):
        return f'{self.invoice.number}: {self.amount} ({self.method})'