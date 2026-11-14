from django.utils.dateparse import parse_date
from rest_framework import permissions
from rest_framework.exceptions import ValidationError
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.permissions import IsAdminOrManager

from . import services


class DashboardView(APIView):
    """Rolga qarab mos dashboard ma'lumotlari."""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        return Response({
            'role': request.user.role,
            'data': services.dashboard_for(request.user),
        })


class FinancialReportView(APIView):
    """Moliyaviy hisobot (admin/manager). ?date_from=2026-11-01&date_to=2026-11-30"""
    permission_classes = [IsAdminOrManager]

    def _date(self, request, name):
        raw = request.query_params.get(name)
        if not raw:
            return None
        value = parse_date(raw)
        if value is None:
            raise ValidationError({name: 'Sana YYYY-MM-DD ko\'rinishida bo\'lishi kerak.'})
        return value

    def get(self, request):
        date_from = self._date(request, 'date_from')
        date_to = self._date(request, 'date_to')
        if date_from and date_to and date_from > date_to:
            raise ValidationError('date_from date_to dan keyin bo\'lishi mumkin emas.')
        return Response(services.financial_report(date_from, date_to))