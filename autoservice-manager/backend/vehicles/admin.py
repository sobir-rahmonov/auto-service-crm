from django.contrib import admin

from .models import Vehicle


@admin.register(Vehicle)
class VehicleAdmin(admin.ModelAdmin):
    list_display = ('plate_number', 'brand', 'model', 'year', 'owner', 'mileage')
    list_filter = ('brand', 'year')
    search_fields = ('plate_number', 'vin', 'brand', 'model', 'owner__username')