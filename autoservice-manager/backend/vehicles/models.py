from django.conf import settings
from django.db import models


class Vehicle(models.Model):
    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='vehicles',
        limit_choices_to={'role': 'client'},
    )
    brand = models.CharField(max_length=50)
    model = models.CharField(max_length=50)
    year = models.PositiveIntegerField()
    plate_number = models.CharField(max_length=20, unique=True)
    vin = models.CharField(max_length=17, unique=True, blank=True, null=True)
    color = models.CharField(max_length=30, blank=True)
    mileage = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f'{self.brand} {self.model} ({self.plate_number})'