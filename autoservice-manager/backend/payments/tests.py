from decimal import Decimal

from rest_framework.test import APITestCase

from accounts.models import User
from orders.models import Order
from vehicles.models import Vehicle

from .models import Invoice

URL = '/api/payments/'


class PaymentTestBase(APITestCase):
    def setUp(self):
        pw = 'pass12345'
        self.manager = User.objects.create_user('manager1', password=pw, role='manager')
        self.mechanic = User.objects.create_user('mech1', password=pw, role='mechanic')
        self.client1 = User.objects.create_user('client1', password=pw, role='client')
        self.client2 = User.objects.create_user('client2', password=pw, role='client')

        self.vehicle1 = Vehicle.objects.create(
            owner=self.client1, brand='Chevrolet', model='Nexia',
            year=2018, plate_number='01A111AA',
        )
        self.vehicle2 = Vehicle.objects.create(
            owner=self.client2, brand='Kia', model='K5',
            year=2021, plate_number='01B222BB',
        )

    def login(self, user):
        self.client.force_authenticate(user=user)

    def make_order(self, client=None, vehicle=None,
                   status=Order.Status.COMPLETED, total='200000.00'):
        return Order.objects.create(
            client=client or self.client1,
            vehicle=vehicle or self.vehicle1,
            problem_description='Test',
            status=status,
            total_price=Decimal(total),
        )

    def make_invoice(self, order=None):
        self.login(self.manager)
        order = order or self.make_order()
        resp = self.client.post(URL + 'create_for_order/', {'order': order.id})
        return order, resp


class InvoiceCreateTests(PaymentTestBase):
    def test_create_invoice_for_completed_order(self):
        order, resp = self.make_invoice()
        self.assertEqual(resp.status_code, 201)
        self.assertEqual(Decimal(resp.data['total_amount']), Decimal('200000.00'))
        self.assertEqual(resp.data['status'], 'unpaid')
        self.assertTrue(resp.data['number'].startswith('INV-'))
        self.assertTrue(resp.data['number'].endswith('-0001'))

    def test_invoice_numbers_are_sequential(self):
        self.make_invoice()
        order2 = self.make_order(self.client2, self.vehicle2)
        _, resp = self.make_invoice(order2)
        self.assertTrue(resp.data['number'].endswith('-0002'))

    def test_cannot_create_for_unfinished_order(self):
        order = self.make_order(status=Order.Status.IN_PROGRESS)
        _, resp = self.make_invoice(order)
        self.assertEqual(resp.status_code, 400)

    def test_cannot_create_twice(self):
        order, _ = self.make_invoice()
        resp = self.client.post(URL + 'create_for_order/', {'order': order.id})
        self.assertEqual(resp.status_code, 400)

    def test_unknown_order_fails(self):
        self.login(self.manager)
        resp = self.client.post(URL + 'create_for_order/', {'order': 9999})
        self.assertEqual(resp.status_code, 400)

    def test_client_cannot_create_invoice(self):
        order = self.make_order()
        self.login(self.client1)
        resp = self.client.post(URL + 'create_for_order/', {'order': order.id})
        self.assertEqual(resp.status_code, 403)


class PaymentFlowTests(PaymentTestBase):
    def setUp(self):
        super().setUp()
        self.order, resp = self.make_invoice()
        self.invoice_id = resp.data['id']
        self.pay_url = f'{URL}{self.invoice_id}/pay/'

    def test_partial_payment_keeps_unpaid(self):
        resp = self.client.post(
            self.pay_url, {'amount': '50000.00', 'method': 'cash'},
        )
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.data['status'], 'unpaid')
        self.assertEqual(Decimal(resp.data['paid_amount']), Decimal('50000.00'))
        self.assertEqual(Decimal(resp.data['remaining_amount']), Decimal('150000.00'))
        self.order.refresh_from_db()
        self.assertEqual(self.order.status, 'completed')

    def test_full_payment_marks_order_paid(self):
        resp = self.client.post(
            self.pay_url, {'amount': '200000.00', 'method': 'card'},
        )
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.data['status'], 'paid')
        self.order.refresh_from_db()
        self.assertEqual(self.order.status, 'paid')
        self.assertTrue(
            self.order.status_history.filter(status='paid').exists()
        )

    def test_two_payments_complete_invoice(self):
        self.client.post(self.pay_url, {'amount': '120000.00', 'method': 'cash'})
        resp = self.client.post(
            self.pay_url, {'amount': '80000.00', 'method': 'transfer'},
        )
        self.assertEqual(resp.data['status'], 'paid')
        self.assertEqual(len(resp.data['payments']), 2)

    def test_overpayment_fails(self):
        resp = self.client.post(
            self.pay_url, {'amount': '200000.01', 'method': 'cash'},
        )
        self.assertEqual(resp.status_code, 400)
        self.assertEqual(Invoice.objects.get(pk=self.invoice_id).payments.count(), 0)

    def test_cannot_pay_paid_invoice(self):
        self.client.post(self.pay_url, {'amount': '200000.00', 'method': 'cash'})
        resp = self.client.post(self.pay_url, {'amount': '1.00', 'method': 'cash'})
        self.assertEqual(resp.status_code, 400)

    def test_zero_or_negative_amount_fails(self):
        for amount in ('0', '-5.00'):
            resp = self.client.post(
                self.pay_url, {'amount': amount, 'method': 'cash'},
            )
            self.assertEqual(resp.status_code, 400)

    def test_client_cannot_pay(self):
        self.login(self.client1)
        resp = self.client.post(
            self.pay_url, {'amount': '1000.00', 'method': 'cash'},
        )
        self.assertEqual(resp.status_code, 403)


class InvoiceVisibilityTests(PaymentTestBase):
    def setUp(self):
        super().setUp()
        self.make_invoice()
        self.make_invoice(self.make_order(self.client2, self.vehicle2))

    def test_client_sees_only_own_invoice(self):
        self.login(self.client1)
        self.assertEqual(self.client.get(URL).data['count'], 1)

    def test_manager_sees_all_invoices(self):
        self.login(self.manager)
        self.assertEqual(self.client.get(URL).data['count'], 2)

    def test_mechanic_sees_no_invoices(self):
        self.login(self.mechanic)
        self.assertEqual(self.client.get(URL).data['count'], 0)