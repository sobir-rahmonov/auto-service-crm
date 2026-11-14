from decimal import Decimal

from rest_framework.test import APITestCase

from accounts.models import User
from inventory.models import Part
from orders.models import Order, PartRequest
from payments.models import Invoice, Payment
from vehicles.models import Vehicle

URL = '/api/reports/dashboard/'
S = Order.Status


class DashboardTests(APITestCase):
    def setUp(self):
        pw = 'pass12345'
        self.admin = User.objects.create_user('admin1', password=pw, role='admin')
        self.manager = User.objects.create_user('manager1', password=pw, role='manager')
        self.mech1 = User.objects.create_user('mech1', password=pw, role='mechanic')
        self.mech2 = User.objects.create_user('mech2', password=pw, role='mechanic')
        self.client1 = User.objects.create_user('client1', password=pw, role='client')
        self.client2 = User.objects.create_user('client2', password=pw, role='client')

        v1 = Vehicle.objects.create(
            owner=self.client1, brand='Chevrolet', model='Nexia',
            year=2018, plate_number='01A111AA',
        )
        v2 = Vehicle.objects.create(
            owner=self.client2, brand='Kia', model='K5',
            year=2021, plate_number='01B222BB',
        )

        def order(client, vehicle, status, mechanic=None, total='0.00'):
            return Order.objects.create(
                client=client, vehicle=vehicle, problem_description='Test',
                status=status, mechanic=mechanic, total_price=Decimal(total),
            )

        self.o_new = order(self.client1, v1, S.NEW)
        self.o_prog = order(self.client1, v1, S.IN_PROGRESS, self.mech1)
        self.o_done = order(self.client2, v2, S.COMPLETED, self.mech1, '100000.00')
        self.o_paid = order(self.client2, v2, S.PAID, self.mech2, '50000.00')

        Invoice.objects.create(
            order=self.o_done, number='INV-T-0001',
            total_amount=Decimal('100000.00'),
        )
        paid_invoice = Invoice.objects.create(
            order=self.o_paid, number='INV-T-0002',
            total_amount=Decimal('50000.00'), status=Invoice.Status.PAID,
        )
        Payment.objects.create(invoice=paid_invoice, amount=Decimal('50000.00'))

        self.part = Part.objects.create(
            name='Moy filtri', sku='OF-T1', price=Decimal('45000.00'), quantity=7,
        )
        PartRequest.objects.create(
            order=self.o_prog, part=self.part, quantity=1,
            requested_by=self.mech1,
        )

    def get_data(self, user):
        self.client.force_authenticate(user=user)
        resp = self.client.get(URL)
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.data['role'], user.role)
        return resp.data['data']

    def test_anonymous_cannot_access(self):
        self.assertEqual(self.client.get(URL).status_code, 401)

    def test_admin_dashboard(self):
        d = self.get_data(self.admin)
        self.assertEqual(d['total_clients'], 2)
        self.assertEqual(d['total_vehicles'], 2)
        self.assertEqual(d['active_orders'], 2)
        self.assertEqual(d['completed_orders'], 2)
        self.assertEqual(Decimal(str(d['total_revenue'])), Decimal('50000.00'))
        self.assertEqual(d['parts_count'], 1)
        self.assertEqual(d['parts_total_quantity'], 7)
        self.assertEqual(d['top_mechanics'][0]['username'], 'mech1')
        self.assertEqual(d['top_mechanics'][0]['done_orders'], 1)

    def test_manager_dashboard(self):
        d = self.get_data(self.manager)
        self.assertEqual(d['today_orders'], 4)
        self.assertEqual(d['new_orders'], 1)
        self.assertEqual(d['in_progress_orders'], 1)
        self.assertEqual(d['waiting_orders'], 0)
        self.assertEqual(d['completed_orders'], 2)
        self.assertEqual(d['awaiting_payment_orders'], 1)

    def test_mechanic_sees_only_own_numbers(self):
        d = self.get_data(self.mech1)
        self.assertEqual(d['assigned_orders'], 0)
        self.assertEqual(d['in_progress_orders'], 1)
        self.assertEqual(d['completed_orders'], 1)
        self.assertEqual(d['total_orders'], 2)
        self.assertEqual(d['pending_part_requests'], 1)

        d = self.get_data(self.mech2)
        self.assertEqual(d['total_orders'], 1)
        self.assertEqual(d['pending_part_requests'], 0)

    def test_client_sees_only_own_numbers(self):
        d = self.get_data(self.client1)
        self.assertEqual(d['vehicles_count'], 1)
        self.assertEqual(d['orders_count'], 2)
        self.assertEqual(d['in_progress_orders'], 1)
        self.assertEqual(d['unpaid_invoices'], 0)
        self.assertEqual(d['completed_orders'], 0)

        d = self.get_data(self.client2)
        self.assertEqual(d['orders_count'], 2)
        self.assertEqual(d['unpaid_invoices'], 1)
        self.assertEqual(d['completed_orders'], 2)




class FinancialReportTests(APITestCase):
    URL = '/api/reports/financial/'

    def setUp(self):
        pw = 'pass12345'
        self.admin = User.objects.create_user('admin1', password=pw, role='admin')
        self.manager = User.objects.create_user('manager1', password=pw, role='manager')
        self.mechanic = User.objects.create_user('mech1', password=pw, role='mechanic')
        self.client1 = User.objects.create_user('client1', password=pw, role='client')
        vehicle = Vehicle.objects.create(
            owner=self.client1, brand='Kia', model='K5',
            year=2021, plate_number='01B222BB',
        )

        def order(status, total):
            return Order.objects.create(
                client=self.client1, vehicle=vehicle, problem_description='T',
                status=status, total_price=Decimal(total),
            )

        # 100000 so'mlik hisob: 40000 to'langan (qarz 60000)
        inv1 = Invoice.objects.create(
            order=order(S.COMPLETED, '100000.00'), number='INV-T-0001',
            total_amount=Decimal('100000.00'),
        )
        Payment.objects.create(invoice=inv1, amount=Decimal('40000.00'), method='cash')
        # 50000 so'mlik hisob: to'liq to'langan
        inv2 = Invoice.objects.create(
            order=order(S.PAID, '50000.00'), number='INV-T-0002',
            total_amount=Decimal('50000.00'), status=Invoice.Status.PAID,
        )
        Payment.objects.create(invoice=inv2, amount=Decimal('50000.00'), method='card')

    def test_admin_and_manager_get_report(self):
        for user in (self.admin, self.manager):
            self.client.force_authenticate(user=user)
            resp = self.client.get(self.URL)
            self.assertEqual(resp.status_code, 200)
            self.assertEqual(resp.data['invoices_count'], 2)
            self.assertEqual(Decimal(str(resp.data['total_invoiced'])), Decimal('150000.00'))
            self.assertEqual(Decimal(str(resp.data['total_paid'])), Decimal('90000.00'))
            self.assertEqual(Decimal(str(resp.data['outstanding_debt'])), Decimal('60000.00'))
            methods = {m['method']: m['count'] for m in resp.data['by_method']}
            self.assertEqual(methods, {'cash': 1, 'card': 1})

    def test_mechanic_and_client_forbidden(self):
        for user in (self.mechanic, self.client1):
            self.client.force_authenticate(user=user)
            self.assertEqual(self.client.get(self.URL).status_code, 403)

    def test_future_date_range_is_empty(self):
        self.client.force_authenticate(user=self.admin)
        resp = self.client.get(self.URL + '?date_from=2099-01-01')
        self.assertEqual(resp.data['invoices_count'], 0)
        self.assertEqual(resp.data['total_paid'], 0)

    def test_invalid_dates_fail(self):
        self.client.force_authenticate(user=self.admin)
        self.assertEqual(self.client.get(self.URL + '?date_from=abc').status_code, 400)
        resp = self.client.get(self.URL + '?date_from=2026-12-01&date_to=2026-11-01')
        self.assertEqual(resp.status_code, 400)        