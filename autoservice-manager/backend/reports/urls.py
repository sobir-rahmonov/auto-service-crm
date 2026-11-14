from django.urls import path

from .views import DashboardView, FinancialReportView

urlpatterns = [
    path('dashboard/', DashboardView.as_view(), name='dashboard'),
    path('financial/', FinancialReportView.as_view(), name='financial-report'),
]