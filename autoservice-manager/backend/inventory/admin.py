from django.contrib import admin

from .models import Part, StockIn

@admin.register(Part)
class PartAdmin(admin.ModelAdmin):
    list_display = ('name', 'sku', 'price', 'quantity', 'min_quantity', 'is_active')
    list_filter = ('is_active',)
    search_fields = ('name', 'sku')




@admin.register(StockIn)
class StockInAdmin(admin.ModelAdmin):
    """Faqat ko'rish uchun. Kirim API orqali qilinadi, shunda qoldiq to'g'ri oshadi."""
    list_display = ('part', 'quantity', 'supplier', 'received_by', 'created_at')
    search_fields = ('part__name', 'part__sku', 'supplier')

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False

    def has_delete_permission(self, request, obj=None):
        return False    