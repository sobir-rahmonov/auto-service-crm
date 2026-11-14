from django.contrib import admin
from .models import (
    Order, OrderPart, OrderService, OrderStatusHistory, PartRequest, Review,
)

class OrderServiceInline(admin.TabularInline):
    model = OrderService
    extra = 0


class OrderPartInline(admin.TabularInline):
    model = OrderPart
    extra = 0


class OrderStatusHistoryInline(admin.TabularInline):
    model = OrderStatusHistory
    extra = 0
    readonly_fields = ('status', 'changed_by', 'changed_at')
    can_delete = False


@admin.register(Order)
class OrderAdmin(admin.ModelAdmin):
    list_display = (
        'id', 'client', 'vehicle', 'mechanic',
        'status', 'total_price', 'created_at',
    )
    list_filter = ('status', 'mechanic', 'created_at')
    search_fields = (
        'client__username', 'vehicle__plate_number', 'problem_description',
    )
    readonly_fields = ('created_at', 'updated_at', 'completed_at')
    inlines = [OrderServiceInline, OrderPartInline, OrderStatusHistoryInline]



@admin.register(PartRequest)
class PartRequestAdmin(admin.ModelAdmin):
    list_display = ('order', 'part', 'quantity', 'status', 'requested_by', 'created_at')
    list_filter = ('status',)
    search_fields = ('part__name', 'order__id')





@admin.register(Review)
class ReviewAdmin(admin.ModelAdmin):
    list_display = ('order', 'client', 'rating', 'created_at')
    list_filter = ('rating',)