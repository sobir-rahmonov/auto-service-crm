from decimal import Decimal

from django.conf import settings
from django.db import models

from inventory.models import Part
from services.models import Service
from vehicles.models import Vehicle


class Order(models.Model):
    class Status(models.TextChoices):
        NEW = 'new', 'Yangi'
        DIAGNOSTICS = 'diagnostics', 'Diagnostika'
        ASSIGNED = 'assigned', 'Ustaga biriktirilgan'
        IN_PROGRESS = 'in_progress', 'Ta\'mirlanmoqda'
        COMPLETED = 'completed', 'Yakunlangan'
        PAID = 'paid', 'To\'langan'
        CANCELLED = 'cancelled', 'Bekor qilingan'

    client = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name='orders',
        limit_choices_to={'role': 'client'},
    )
    vehicle = models.ForeignKey(
        Vehicle,
        on_delete=models.PROTECT,
        related_name='orders',
    )
    mechanic = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='assigned_orders',
        limit_choices_to={'role': 'mechanic'},
    )
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.NEW,
    )
    problem_description = models.TextField(help_text='Mijoz aytgan muammo')
    diagnosis = models.TextField(blank=True, help_text='Diagnostika natijasi')

    # Mechanic kiritadigan ma'lumotlar
    extra_issues = models.TextField(
        blank=True, help_text='Aniqlangan qo\'shimcha nosozliklar',
    )
    work_notes = models.TextField(
        blank=True, help_text='Bajarilgan ishlar haqida izoh',
    )
    time_spent_minutes = models.PositiveIntegerField(
        default=0, help_text='Ta\'mirlashga sarflangan vaqt (daqiqada)',
    )

    total_price = models.DecimalField(
        max_digits=12, decimal_places=2, default=Decimal('0.00'),
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    completed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f'Buyurtma #{self.pk} - {self.vehicle.plate_number} ({self.status})'


class OrderService(models.Model):
    order = models.ForeignKey(
        Order, on_delete=models.CASCADE, related_name='order_services',
    )
    service = models.ForeignKey(Service, on_delete=models.PROTECT)
    price = models.DecimalField(
        max_digits=10, decimal_places=2,
        help_text='Buyurtma paytidagi narx (keyin katalogda o\'zgarsa ham saqlanadi)',
    )

    def __str__(self):
        return f'{self.service.name} - {self.price}'


class OrderPart(models.Model):
    order = models.ForeignKey(
        Order, on_delete=models.CASCADE, related_name='order_parts',
    )
    part = models.ForeignKey(Part, on_delete=models.PROTECT)
    quantity = models.PositiveIntegerField(default=1)
    price = models.DecimalField(
        max_digits=10, decimal_places=2,
        help_text='Bir dona narxi (buyurtma paytidagi)',
    )

    @property
    def subtotal(self):
        return self.price * self.quantity

    def __str__(self):
        return f'{self.part.name} x {self.quantity}'


class OrderStatusHistory(models.Model):
    order = models.ForeignKey(
        Order, on_delete=models.CASCADE, related_name='status_history',
    )
    status = models.CharField(max_length=20, choices=Order.Status.choices)
    changed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name='+',
    )
    changed_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['changed_at']

    def __str__(self):
        return f'#{self.order_id}: {self.status}'




class PartRequest(models.Model):
    class Status(models.TextChoices):
        PENDING = 'pending', 'Kutilmoqda'
        APPROVED = 'approved', 'Tasdiqlangan'
        REJECTED = 'rejected', 'Rad etilgan'

    order = models.ForeignKey(
        Order, on_delete=models.CASCADE, related_name='part_requests',
    )
    part = models.ForeignKey(Part, on_delete=models.PROTECT)
    quantity = models.PositiveIntegerField(default=1)
    comment = models.TextField(blank=True, help_text='Usta izohi')
    status = models.CharField(
        max_length=10, choices=Status.choices, default=Status.PENDING,
    )
    requested_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name='part_requests',
    )
    reviewed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='+',
    )
    review_note = models.TextField(blank=True, help_text='Rad etish sababi va h.k.')
    created_at = models.DateTimeField(auto_now_add=True)
    reviewed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f'#{self.order_id}: {self.part.name} x {self.quantity} ({self.status})' 



class Review(models.Model):
    order = models.OneToOneField(
        Order, on_delete=models.CASCADE, related_name='review',
    )
    client = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='reviews',
    )
    rating = models.PositiveSmallIntegerField(help_text='1 dan 5 gacha')
    comment = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f'#{self.order_id}: {self.rating}/5'       