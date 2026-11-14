from decimal import Decimal

from rest_framework.test import APITestCase

from accounts.models import User
from inventory.models import Part
from services.models import Service
from vehicles.models import Vehicle

from .models import Order

URL = '/api/orders/'


class OrderTestBase(APITestCase):
    """Barcha testlar uchun umumiy tayyorgarlik."""

    def setUp(self):
        pw = 'pass12345'
        self.admin = User.objects.create_user('admin1', password=pw, role='admin')
        self.manager = User.objects.create_user('manager1', password=pw, role='manager')
        self.mechanic = User.objects.create_user('mech1', password=pw, role='mechanic')
        self.mechanic2 = User.objects.create_user('mech2', password=pw, role='mechanic')
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

        self.service = Service.objects.create(
            name='Moy almashtirish', price=Decimal('150000.00'),
        )
        self.part = Part.objects.create(
            name='Moy filtri', sku='OF-T1',
            price=Decimal('45000.00'), quantity=10,
        )

    def login(self, user):
        self.client.force_authenticate(user=user)

    def make_order(self, client=None, vehicle=None):
        return Order.objects.create(
            client=client or self.client1,
            vehicle=vehicle or self.vehicle1,
            problem_description='Test muammo',
        )


class OrderCreateTests(OrderTestBase):
    def test_client_creates_own_order(self):
        self.login(self.client1)
        resp = self.client.post(URL, {
            'vehicle': self.vehicle1.id,
            'problem_description': 'Motor ovoz chiqaryapti',
        })
        self.assertEqual(resp.status_code, 201)
        self.assertEqual(resp.data['client'], self.client1.id)
        self.assertEqual(resp.data['status'], 'new')
        self.assertEqual(len(resp.data['status_history']), 1)

    def test_client_cannot_use_other_clients_vehicle(self):
        self.login(self.client1)
        resp = self.client.post(URL, {
            'vehicle': self.vehicle2.id,
            'problem_description': 'Boshqaning mashinasi',
        })
        self.assertEqual(resp.status_code, 400)

    def test_manager_creates_order_for_client(self):
        self.login(self.manager)
        resp = self.client.post(URL, {
            'client': self.client1.id,
            'vehicle': self.vehicle1.id,
            'problem_description': 'Tormoz ishlamayapti',
        })
        self.assertEqual(resp.status_code, 201)
        self.assertEqual(resp.data['client'], self.client1.id)

    def test_manager_must_specify_client(self):
        self.login(self.manager)
        resp = self.client.post(URL, {
            'vehicle': self.vehicle1.id,
            'problem_description': 'Mijoz ko\'rsatilmagan',
        })
        self.assertEqual(resp.status_code, 400)

    def test_mechanic_cannot_create_order(self):
        self.login(self.mechanic)
        resp = self.client.post(URL, {
            'client': self.client1.id,
            'vehicle': self.vehicle1.id,
            'problem_description': 'Usta yaratmoqchi',
        })
        self.assertEqual(resp.status_code, 403)

    def test_anonymous_cannot_access(self):
        resp = self.client.get(URL)
        self.assertEqual(resp.status_code, 401)


class OrderVisibilityTests(OrderTestBase):
    def test_client_sees_only_own_orders(self):
        self.make_order(self.client1, self.vehicle1)
        self.make_order(self.client2, self.vehicle2)
        self.login(self.client1)
        resp = self.client.get(URL)
        self.assertEqual(resp.data['count'], 1)

    def test_mechanic_sees_only_assigned_orders(self):
        order = self.make_order()
        self.make_order(self.client2, self.vehicle2)
        order.mechanic = self.mechanic
        order.save()
        self.login(self.mechanic)
        self.assertEqual(self.client.get(URL).data['count'], 1)
        self.login(self.mechanic2)
        self.assertEqual(self.client.get(URL).data['count'], 0)

    def test_manager_sees_all_orders(self):
        self.make_order(self.client1, self.vehicle1)
        self.make_order(self.client2, self.vehicle2)
        self.login(self.manager)
        self.assertEqual(self.client.get(URL).data['count'], 2)



class OrderPricingTests(OrderTestBase):
    def setUp(self):
        super().setUp()
        self.order = self.make_order()
        self.base = f'{URL}{self.order.id}/'

    def test_add_service_updates_total(self):
        self.login(self.manager)
        resp = self.client.post(
            self.base + 'add-service/', {'service': self.service.id},
        )
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(Decimal(resp.data['total_price']), Decimal('150000.00'))

    def test_cannot_add_same_service_twice(self):
        self.login(self.manager)
        self.client.post(self.base + 'add-service/', {'service': self.service.id})
        resp = self.client.post(
            self.base + 'add-service/', {'service': self.service.id},
        )
        self.assertEqual(resp.status_code, 400)

    def test_price_is_frozen_at_order_time(self):
        self.login(self.manager)
        self.client.post(self.base + 'add-service/', {'service': self.service.id})
        self.service.price = Decimal('999999.00')
        self.service.save()
        self.order.refresh_from_db()
        self.assertEqual(self.order.total_price, Decimal('150000.00'))

    def test_add_part_updates_total_and_stock(self):
        self.login(self.manager)
        resp = self.client.post(
            self.base + 'add-part/', {'part': self.part.id, 'quantity': 2},
        )
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(Decimal(resp.data['total_price']), Decimal('90000.00'))
        self.part.refresh_from_db()
        self.assertEqual(self.part.quantity, 8)

    def test_total_is_services_plus_parts(self):
        self.login(self.manager)
        self.client.post(self.base + 'add-service/', {'service': self.service.id})
        resp = self.client.post(
            self.base + 'add-part/', {'part': self.part.id, 'quantity': 2},
        )
        # 150000 + 2 * 45000
        self.assertEqual(Decimal(resp.data['total_price']), Decimal('240000.00'))

    def test_not_enough_stock_fails(self):
        self.login(self.manager)
        resp = self.client.post(
            self.base + 'add-part/', {'part': self.part.id, 'quantity': 11},
        )
        self.assertEqual(resp.status_code, 400)
        self.part.refresh_from_db()
        self.assertEqual(self.part.quantity, 10)

    def test_remove_part_returns_stock(self):
        self.login(self.manager)
        resp = self.client.post(
            self.base + 'add-part/', {'part': self.part.id, 'quantity': 3},
        )
        item_id = resp.data['order_parts'][0]['id']
        resp = self.client.delete(f'{self.base}remove-part/{item_id}/')
        self.assertEqual(resp.status_code, 200)
        self.part.refresh_from_db()
        self.assertEqual(self.part.quantity, 10)
        self.assertEqual(Decimal(resp.data['total_price']), Decimal('0.00'))

    def test_remove_service_updates_total(self):
        self.login(self.manager)
        resp = self.client.post(
            self.base + 'add-service/', {'service': self.service.id},
        )
        item_id = resp.data['order_services'][0]['id']
        resp = self.client.delete(f'{self.base}remove-service/{item_id}/')
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(Decimal(resp.data['total_price']), Decimal('0.00'))

    def test_client_cannot_add_service(self):
        self.login(self.client1)
        resp = self.client.post(
            self.base + 'add-service/', {'service': self.service.id},
        )
        self.assertEqual(resp.status_code, 403)

    def test_mechanic_cannot_add_part(self):
        self.order.mechanic = self.mechanic
        self.order.save()
        self.login(self.mechanic)
        resp = self.client.post(
            self.base + 'add-part/', {'part': self.part.id, 'quantity': 1},
        )
        self.assertEqual(resp.status_code, 403)        




class OrderWorkflowTests(OrderTestBase):
    def setUp(self):
        super().setUp()
        self.order = self.make_order()
        self.base = f'{URL}{self.order.id}/'

    def assign(self, mechanic=None):
        self.login(self.manager)
        return self.client.post(
            self.base + 'assign/', {'mechanic': (mechanic or self.mechanic).id},
        )

    def change(self, user, status):
        self.login(user)
        return self.client.post(self.base + 'change-status/', {'status': status})

    def test_assign_sets_status_and_history(self):
        resp = self.assign()
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.data['status'], 'assigned')
        self.assertEqual(resp.data['mechanic'], self.mechanic.id)
        self.assertEqual(len(resp.data['status_history']), 1)

    def test_cannot_assign_non_mechanic(self):
        self.login(self.manager)
        resp = self.client.post(
            self.base + 'assign/', {'mechanic': self.client1.id},
        )
        self.assertEqual(resp.status_code, 400)

    def test_client_cannot_assign(self):
        self.login(self.client1)
        resp = self.client.post(
            self.base + 'assign/', {'mechanic': self.mechanic.id},
        )
        self.assertEqual(resp.status_code, 403)

    def test_diagnosis_moves_new_to_diagnostics(self):
        self.login(self.manager)
        resp = self.client.post(
            self.base + 'diagnosis/', {'diagnosis': 'Tormoz diski yeyilgan'},
        )
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.data['status'], 'diagnostics')
        self.assertEqual(resp.data['diagnosis'], 'Tormoz diski yeyilgan')

    def test_cannot_skip_new_to_completed(self):
        resp = self.change(self.manager, 'completed')
        self.assertEqual(resp.status_code, 400)

    def test_cannot_set_assigned_via_change_status(self):
        resp = self.change(self.manager, 'assigned')
        self.assertEqual(resp.status_code, 400)

    def test_mechanic_full_flow(self):
        self.assign()
        resp = self.change(self.mechanic, 'in_progress')
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.data['status'], 'in_progress')

        # Xizmat qo'shmasdan yakunlab bo'lmaydi
        resp = self.change(self.mechanic, 'completed')
        self.assertEqual(resp.status_code, 400)

        self.login(self.manager)
        self.client.post(self.base + 'add-service/', {'service': self.service.id})

        resp = self.change(self.mechanic, 'completed')
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.data['status'], 'completed')
        self.assertIsNotNone(resp.data['completed_at'])
        # new emas: assigned, in_progress, completed
        self.assertEqual(len(resp.data['status_history']), 3)

    def test_other_mechanic_cannot_change_status(self):
        self.assign()
        resp = self.change(self.mechanic2, 'in_progress')
        # mechanic2 buyurtmani ko'rmaydi (queryset cheklovi)
        self.assertEqual(resp.status_code, 404)

    def test_mechanic_cannot_mark_paid(self):
        self.assign()
        self.change(self.mechanic, 'in_progress')
        self.login(self.manager)
        self.client.post(self.base + 'add-service/', {'service': self.service.id})
        self.change(self.mechanic, 'completed')
        resp = self.change(self.mechanic, 'paid')
        self.assertEqual(resp.status_code, 403)

    def test_cancel_returns_parts_to_stock(self):
        self.login(self.manager)
        self.client.post(
            self.base + 'add-part/', {'part': self.part.id, 'quantity': 4},
        )
        self.part.refresh_from_db()
        self.assertEqual(self.part.quantity, 6)
        resp = self.change(self.manager, 'cancelled')
        self.assertEqual(resp.status_code, 200)
        self.part.refresh_from_db()
        self.assertEqual(self.part.quantity, 10)

    def test_cannot_edit_cancelled_order(self):
        self.change(self.manager, 'cancelled')
        resp = self.client.post(
            self.base + 'add-service/', {'service': self.service.id},
        )
        self.assertEqual(resp.status_code, 400)

    def test_client_cannot_change_status(self):
        resp = self.change(self.client1, 'cancelled')
        self.assertEqual(resp.status_code, 403)     





class PartRequestTests(OrderTestBase):
    def setUp(self):
        super().setUp()
        self.order = self.make_order()
        self.order.mechanic = self.mechanic
        self.order.status = Order.Status.ASSIGNED
        self.order.save()
        self.req_url = f'{URL}{self.order.id}/request-part/'
        self.list_url = f'{URL}part-requests/'

    def create_request(self, quantity=2):
        self.login(self.mechanic)
        return self.client.post(self.req_url, {
            'part': self.part.id,
            'quantity': quantity,
            'comment': 'Eskisi yeyilgan',
        })

    def test_mechanic_creates_request(self):
        resp = self.create_request()
        self.assertEqual(resp.status_code, 201)
        self.assertEqual(resp.data['status'], 'pending')
        self.assertEqual(resp.data['requested_by'], self.mechanic.id)
        # So'rov omborga tegmaydi
        self.part.refresh_from_db()
        self.assertEqual(self.part.quantity, 10)

    def test_other_mechanic_cannot_request(self):
        self.login(self.mechanic2)
        resp = self.client.post(self.req_url, {'part': self.part.id, 'quantity': 1})
        # mechanic2 buyurtmani ko'rmaydi
        self.assertEqual(resp.status_code, 404)

    def test_manager_cannot_use_request_part(self):
        self.login(self.manager)
        resp = self.client.post(self.req_url, {'part': self.part.id, 'quantity': 1})
        self.assertEqual(resp.status_code, 403)

    def test_cannot_request_for_new_order(self):
        self.order.status = Order.Status.NEW
        self.order.save()
        resp = self.create_request()
        self.assertEqual(resp.status_code, 400)

    def test_approve_adds_part_and_reduces_stock(self):
        req_id = self.create_request(quantity=3).data['id']
        self.login(self.manager)
        resp = self.client.post(f'{self.list_url}{req_id}/approve/')
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.data['status'], 'approved')
        self.assertEqual(resp.data['reviewed_by'], self.manager.id)
        self.part.refresh_from_db()
        self.assertEqual(self.part.quantity, 7)
        self.order.refresh_from_db()
        # 3 x 45000
        self.assertEqual(self.order.total_price, Decimal('135000.00'))

    def test_approve_fails_when_stock_is_not_enough(self):
        req_id = self.create_request(quantity=11).data['id']
        self.login(self.manager)
        resp = self.client.post(f'{self.list_url}{req_id}/approve/')
        self.assertEqual(resp.status_code, 400)
        self.part.refresh_from_db()
        self.assertEqual(self.part.quantity, 10)
        # So'rov pending holatda qoladi
        self.assertEqual(
            self.client.get(f'{self.list_url}{req_id}/').data['status'],
            'pending',
        )

    def test_reject_does_not_touch_stock(self):
        req_id = self.create_request().data['id']
        self.login(self.manager)
        resp = self.client.post(
            f'{self.list_url}{req_id}/reject/', {'review_note': 'Kerak emas'},
        )
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.data['status'], 'rejected')
        self.assertEqual(resp.data['review_note'], 'Kerak emas')
        self.part.refresh_from_db()
        self.assertEqual(self.part.quantity, 10)

    def test_cannot_review_twice(self):
        req_id = self.create_request().data['id']
        self.login(self.manager)
        self.client.post(f'{self.list_url}{req_id}/approve/')
        resp = self.client.post(f'{self.list_url}{req_id}/reject/')
        self.assertEqual(resp.status_code, 400)

    def test_mechanic_cannot_approve(self):
        req_id = self.create_request().data['id']
        self.login(self.mechanic)
        resp = self.client.post(f'{self.list_url}{req_id}/approve/')
        self.assertEqual(resp.status_code, 403)

    def test_mechanic_sees_only_own_requests(self):
        self.create_request()
        self.login(self.mechanic)
        self.assertEqual(self.client.get(self.list_url).data['count'], 1)
        self.login(self.mechanic2)
        self.assertEqual(self.client.get(self.list_url).data['count'], 0)

    def test_manager_sees_all_and_client_sees_none(self):
        self.create_request()
        self.login(self.manager)
        self.assertEqual(self.client.get(self.list_url).data['count'], 1)
        self.login(self.client1)
        self.assertEqual(self.client.get(self.list_url).data['count'], 0)





class ReviewTests(OrderTestBase):
    def setUp(self):
        super().setUp()
        self.order = self.make_order()
        self.order.status = Order.Status.COMPLETED
        self.order.mechanic = self.mechanic
        self.order.save()
        self.url = f'{URL}reviews/'

    def post_review(self, user=None, rating=5, order=None):
        self.login(user or self.client1)
        return self.client.post(self.url, {
            'order': (order or self.order).id,
            'rating': rating,
            'comment': 'Yaxshi xizmat',
        })

    def test_client_creates_review_for_completed_order(self):
        resp = self.post_review()
        self.assertEqual(resp.status_code, 201)
        self.assertEqual(resp.data['rating'], 5)
        self.assertEqual(resp.data['client'], self.client1.id)

    def test_review_allowed_for_paid_order(self):
        self.order.status = Order.Status.PAID
        self.order.save()
        self.assertEqual(self.post_review().status_code, 201)

    def test_cannot_review_unfinished_order(self):
        self.order.status = Order.Status.IN_PROGRESS
        self.order.save()
        self.assertEqual(self.post_review().status_code, 400)

    def test_cannot_review_twice(self):
        self.post_review()
        self.assertEqual(self.post_review().status_code, 400)

    def test_cannot_review_other_clients_order(self):
        self.assertEqual(self.post_review(user=self.client2).status_code, 400)

    def test_rating_must_be_between_1_and_5(self):
        for rating in (0, 6):
            self.assertEqual(self.post_review(rating=rating).status_code, 400)

    def test_staff_cannot_create_review(self):
        for user in (self.manager, self.admin, self.mechanic):
            self.assertEqual(self.post_review(user=user).status_code, 403)

    def test_visibility(self):
        self.post_review()
        self.login(self.client1)
        self.assertEqual(self.client.get(self.url).data['count'], 1)
        self.login(self.client2)
        self.assertEqual(self.client.get(self.url).data['count'], 0)
        self.login(self.mechanic)
        self.assertEqual(self.client.get(self.url).data['count'], 1)
        self.login(self.mechanic2)
        self.assertEqual(self.client.get(self.url).data['count'], 0)
        self.login(self.manager)
        self.assertEqual(self.client.get(self.url).data['count'], 1)