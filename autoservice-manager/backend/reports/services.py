from django.db.models import Count, Q, Sum
from django.utils import timezone

from accounts.models import User
from inventory.models import Part
from orders.models import Order, PartRequest
from payments.models import Invoice, Payment
from vehicles.models import Vehicle

S = Order.Status

ACTIVE_STATUSES = [S.NEW, S.DIAGNOSTICS, S.ASSIGNED, S.IN_PROGRESS]
DONE_STATUSES = [S.COMPLETED, S.PAID]


def admin_dashboard():
    revenue = Payment.objects.aggregate(total=Sum('amount'))['total'] or 0
    parts = Part.objects.filter(is_active=True)
    top_mechanics = (
        User.objects.filter(role=User.Role.MECHANIC)
        .annotate(
            done_orders=Count(
                'assigned_orders',
                filter=Q(assigned_orders__status__in=DONE_STATUSES),
            )
        )
        .order_by('-done_orders', 'username')[:5]
    )
    return {
        'total_clients': User.objects.filter(role=User.Role.CLIENT).count(),
        'total_vehicles': Vehicle.objects.count(),
        'active_orders': Order.objects.filter(status__in=ACTIVE_STATUSES).count(),
        'completed_orders': Order.objects.filter(status__in=DONE_STATUSES).count(),
        'total_revenue': revenue,
        'parts_count': parts.count(),
        'parts_total_quantity': parts.aggregate(t=Sum('quantity'))['t'] or 0,
        'top_mechanics': [
            {'id': m.id, 'username': m.username, 'done_orders': m.done_orders}
            for m in top_mechanics
        ],
    }


def manager_dashboard():
    today = timezone.localdate()
    return {
        'today_orders': Order.objects.filter(created_at__date=today).count(),
        'new_orders': Order.objects.filter(status=S.NEW).count(),
        'in_progress_orders': Order.objects.filter(status=S.IN_PROGRESS).count(),
        # Usta biriktirilgan, lekin ta'mirlash hali boshlanmagan
        'waiting_orders': Order.objects.filter(status=S.ASSIGNED).count(),
        'completed_orders': Order.objects.filter(status__in=DONE_STATUSES).count(),
        # Yakunlangan, lekin hali to'liq to'lanmagan
        'awaiting_payment_orders': Order.objects.filter(status=S.COMPLETED).count(),
    }


def mechanic_dashboard(user):
    mine = Order.objects.filter(mechanic=user)
    return {
        'assigned_orders': mine.filter(status=S.ASSIGNED).count(),
        'in_progress_orders': mine.filter(status=S.IN_PROGRESS).count(),
        'completed_orders': mine.filter(status__in=DONE_STATUSES).count(),
        'total_orders': mine.count(),
        'pending_part_requests': PartRequest.objects.filter(
            requested_by=user, status=PartRequest.Status.PENDING,
        ).count(),
    }


def client_dashboard(user):
    mine = Order.objects.filter(client=user)
    return {
        'vehicles_count': Vehicle.objects.filter(owner=user).count(),
        'orders_count': mine.count(),
        'in_progress_orders': mine.filter(status=S.IN_PROGRESS).count(),
        'unpaid_invoices': Invoice.objects.filter(
            order__client=user, status=Invoice.Status.UNPAID,
        ).count(),
        'completed_orders': mine.filter(status__in=DONE_STATUSES).count(),
    }


def dashboard_for(user):
    if user.role == User.Role.ADMIN:
        return admin_dashboard()
    if user.role == User.Role.MANAGER:
        return manager_dashboard()
    if user.role == User.Role.MECHANIC:
        return mechanic_dashboard(user)
    return client_dashboard(user)






def financial_report(date_from=None, date_to=None):
    """Moliyaviy hisobot. Sana oralig'i ixtiyoriy (to'lov va hisob sanasi bo'yicha)."""
    payments = Payment.objects.all()
    invoices = Invoice.objects.all()
    if date_from:
        payments = payments.filter(paid_at__date__gte=date_from)
        invoices = invoices.filter(created_at__date__gte=date_from)
    if date_to:
        payments = payments.filter(paid_at__date__lte=date_to)
        invoices = invoices.filter(created_at__date__lte=date_to)

    total_paid = payments.aggregate(t=Sum('amount'))['t'] or 0
    
    total_invoiced = invoices.aggregate(t=Sum('total_amount'))['t'] or 0

    # Qarz: to'lanmagan hisoblar summasi minus ularga qilingan to'lovlar
    unpaid = invoices.filter(status=Invoice.Status.UNPAID)
    unpaid_total = unpaid.aggregate(t=Sum('total_amount'))['t'] or 0
    unpaid_paid = Payment.objects.filter(invoice__in=unpaid).aggregate(
        t=Sum('amount'),
    )['t'] or 0

    by_method = list(
        payments.values('method')
        .annotate(total=Sum('amount'), count=Count('id'))
        .order_by('method')
    )
    return {
        'date_from': date_from,
        'date_to': date_to,
        'invoices_count': invoices.count(),
        'total_invoiced': total_invoiced,
        'total_paid': total_paid,
        'outstanding_debt': unpaid_total - unpaid_paid,
        'by_method': by_method,
    }