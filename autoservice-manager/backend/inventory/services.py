from django.db import transaction
from django.db.models import F

from .models import Part, StockIn


@transaction.atomic
def receive_stock(part, quantity, unit_cost, supplier, note, user):
    """Omborga kirim: yozuv yaratadi va qoldiqni oshiradi."""
    stock_in = StockIn.objects.create(
        part=part,
        quantity=quantity,
        unit_cost=unit_cost,
        supplier=supplier,
        note=note,
        received_by=user,
    )
    Part.objects.filter(pk=part.pk).update(quantity=F('quantity') + quantity)
    return stock_in