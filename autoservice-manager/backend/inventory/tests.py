from decimal import Decimal

from rest_framework.test import APITestCase

from accounts.models import User

from .models import Part

STOCK_IN = '/api/inventory/stock-in/'
PARTS = '/api/inventory/'


class InventoryTests(APITestCase):
    def setUp(self):
        pw = 'pass12345'
        self.admin = User.objects.create_user('admin1', password=pw, role='admin')
        self.manager = User.objects.create_user('manager1', password=pw, role='manager')
        self.mechanic = User.objects.create_user('mech1', password=pw, role='mechanic')
        self.client1 = User.objects.create_user('client1', password=pw, role='client')
        self.part = Part.objects.create(
            name='Moy filtri', sku='OF-T1', price=Decimal('45000.00'), quantity=5,
        )

    def login(self, user):
        self.client.force_authenticate(user=user)

    def test_stock_in_increases_quantity(self):
        self.login(self.manager)
        resp = self.client.post(STOCK_IN, {
            'part': self.part.id, 'quantity': 20,
            'unit_cost': '30000.00', 'supplier': 'Avto Plus',
        })
        self.assertEqual(resp.status_code, 201)
        self.assertEqual(resp.data['received_by'], self.manager.id)
        self.part.refresh_from_db()
        self.assertEqual(self.part.quantity, 25)

    def test_zero_or_negative_quantity_fails(self):
        self.login(self.manager)
        for qty in (0, -3):
            resp = self.client.post(STOCK_IN, {'part': self.part.id, 'quantity': qty})
            self.assertEqual(resp.status_code, 400)
        self.part.refresh_from_db()
        self.assertEqual(self.part.quantity, 5)

    def test_mechanic_and_client_cannot_stock_in(self):
        for user in (self.mechanic, self.client1):
            self.login(user)
            resp = self.client.post(STOCK_IN, {'part': self.part.id, 'quantity': 1})
            self.assertEqual(resp.status_code, 403)

    def test_stock_in_cannot_be_edited_or_deleted(self):
        self.login(self.admin)
        sid = self.client.post(
            STOCK_IN, {'part': self.part.id, 'quantity': 1},
        ).data['id']
        self.assertEqual(self.client.patch(f'{STOCK_IN}{sid}/', {'quantity': 99}).status_code, 405)
        self.assertEqual(self.client.delete(f'{STOCK_IN}{sid}/').status_code, 405)

    def test_quantity_cannot_be_patched_directly(self):
        self.login(self.manager)
        self.client.patch(f'{PARTS}{self.part.id}/', {'quantity': 999})
        self.part.refresh_from_db()
        self.assertEqual(self.part.quantity, 5)

    def test_new_part_starts_with_zero_stock(self):
        self.login(self.manager)
        resp = self.client.post(PARTS, {
            'name': 'Havo filtri', 'sku': 'AF-T1', 'price': '60000.00',
            'quantity': 50,
        })
        self.assertEqual(resp.status_code, 201)
        self.assertEqual(Part.objects.get(sku='AF-T1').quantity, 0)

    def test_mechanic_can_view_parts_but_client_cannot(self):
        self.login(self.mechanic)
        self.assertEqual(self.client.get(PARTS).status_code, 200)
        self.login(self.client1)
        self.assertEqual(self.client.get(PARTS).status_code, 403)

    def test_low_stock_endpoint(self):
        self.login(self.manager)
        resp = self.client.get(PARTS + 'low-stock/')
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(len(resp.data), 1)