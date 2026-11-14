from django.conf import settings
from django.core.validators import MinValueValidator
from django.db import models


class Part(models.Model):
    name = models.CharField(max_length=150)
    sku = models.CharField(
        max_length=50,
        unique=True,
        help_text='Qism kodi (artikul)',
    )
    description = models.TextField(blank=True)
    price = models.DecimalField(max_digits=10, decimal_places=2)
    quantity = models.PositiveIntegerField(default=0)
    min_quantity = models.PositiveIntegerField(
        default=5,
        help_text='Shundan kam qolsa ogohlantirish beriladi',
    )
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['name']

    @property
    def is_low_stock(self):
        return self.quantity <= self.min_quantity

    def __str__(self):
        return f'{self.name} [{self.sku}] - {self.quantity} dona'





class StockIn(models.Model):
    part = models.ForeignKey(
        Part, on_delete=models.PROTECT, related_name='stock_ins',
    )
    quantity = models.PositiveIntegerField(validators=[MinValueValidator(1)])
    unit_cost = models.DecimalField(
        max_digits=10, decimal_places=2, null=True, blank=True,
        help_text='Xarid narxi (bir dona), ixtiyoriy',
    )
    supplier = models.CharField(max_length=150, blank=True)
    note = models.TextField(blank=True)
    received_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name='+',
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f'{self.part.name}: +{self.quantity}'    