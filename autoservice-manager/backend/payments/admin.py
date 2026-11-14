from django.contrib import admin

from .models import Invoice, Payment


class PaymentInline(admin.TabularInline):
    model = Payment
    extra = 0
    readonly_fields = ('paid_at',)


@admin.register(Invoice)
class InvoiceAdmin(admin.ModelAdmin):
    list_display = ('number', 'order', 'total_amount', 'status', 'created_at')
    list_filter = ('status', 'created_at')
    search_fields = ('number', 'order__client__username')
    readonly_fields = ('number', 'created_at')
    inlines = [PaymentInline]


@admin.register(Payment)
class PaymentAdmin(admin.ModelAdmin):
    list_display = ('invoice', 'amount', 'method', 'recorded_by', 'paid_at')
    list_filter = ('method',)
    readonly_fields = ('paid_at',)