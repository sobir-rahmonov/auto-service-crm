from rest_framework.test import APITestCase

from .models import User

USERS = '/api/auth/users/'


class AccountTestBase(APITestCase):
    def setUp(self):
        pw = 'pass12345'
        self.admin = User.objects.create_user('admin1', password=pw, role='admin')
        self.manager = User.objects.create_user('manager1', password=pw, role='manager')
        self.mechanic = User.objects.create_user('mech1', password=pw, role='mechanic')
        self.client1 = User.objects.create_user('client1', password=pw, role='client')

    def login(self, user):
        self.client.force_authenticate(user=user)

    def new_user_data(self, **extra):
        data = {
            'username': 'newuser',
            'password': 'StrongPass#2026',
            'first_name': 'Ali',
            'role': 'client',
        }
        data.update(extra)
        return data


class RegisterAndLoginTests(AccountTestBase):
    def test_register_makes_client_even_if_role_sent(self):
        resp = self.client.post('/api/auth/register/', {
            'username': 'selfreg',
            'password': 'StrongPass#2026',
            'password2': 'StrongPass#2026',
            'role': 'admin',
        })
        self.assertEqual(resp.status_code, 201)
        self.assertEqual(User.objects.get(username='selfreg').role, 'client')

    def test_register_password_mismatch_fails(self):
        resp = self.client.post('/api/auth/register/', {
            'username': 'selfreg',
            'password': 'StrongPass#2026',
            'password2': 'Different#2026',
        })
        self.assertEqual(resp.status_code, 400)

    def test_login_returns_tokens(self):
        resp = self.client.post('/api/auth/login/', {
            'username': 'client1', 'password': 'pass12345',
        })
        self.assertEqual(resp.status_code, 200)
        self.assertIn('access', resp.data)
        self.assertIn('refresh', resp.data)

    def test_blocked_user_cannot_login(self):
        self.client1.is_active = False
        self.client1.save()
        resp = self.client.post('/api/auth/login/', {
            'username': 'client1', 'password': 'pass12345',
        })
        self.assertEqual(resp.status_code, 401)

    def test_profile_cannot_change_role(self):
        self.login(self.client1)
        self.client.patch('/api/auth/profile/', {'role': 'admin'})
        self.client1.refresh_from_db()
        self.assertEqual(self.client1.role, 'client')


class UserManagementTests(AccountTestBase):
    def test_admin_creates_mechanic(self):
        self.login(self.admin)
        resp = self.client.post(USERS, self.new_user_data(role='mechanic'))
        self.assertEqual(resp.status_code, 201)
        user = User.objects.get(username='newuser')
        self.assertEqual(user.role, 'mechanic')
        self.assertTrue(user.check_password('StrongPass#2026'))

    def test_manager_creates_client(self):
        self.login(self.manager)
        resp = self.client.post(USERS, self.new_user_data())
        self.assertEqual(resp.status_code, 201)

    def test_manager_cannot_create_mechanic(self):
        self.login(self.manager)
        resp = self.client.post(USERS, self.new_user_data(role='mechanic'))
        self.assertEqual(resp.status_code, 400)

    def test_client_and_mechanic_cannot_access_users(self):
        for user in (self.client1, self.mechanic):
            self.login(user)
            self.assertEqual(self.client.get(USERS).status_code, 403)

    def test_manager_sees_only_clients(self):
        self.login(self.manager)
        resp = self.client.get(USERS)
        self.assertEqual(resp.data['count'], 1)
        self.assertEqual(resp.data['results'][0]['role'], 'client')

    def test_admin_sees_all_users(self):
        self.login(self.admin)
        self.assertEqual(self.client.get(USERS).data['count'], 4)

    def test_admin_blocks_user(self):
        self.login(self.admin)
        resp = self.client.patch(
            f'{USERS}{self.mechanic.id}/', {'is_active': False},
        )
        self.assertEqual(resp.status_code, 200)
        self.mechanic.refresh_from_db()
        self.assertFalse(self.mechanic.is_active)

    def test_admin_changes_role(self):
        self.login(self.admin)
        resp = self.client.patch(
            f'{USERS}{self.client1.id}/', {'role': 'manager'},
        )
        self.assertEqual(resp.status_code, 200)
        self.client1.refresh_from_db()
        self.assertEqual(self.client1.role, 'manager')

    def test_manager_cannot_change_role_or_block(self):
        self.login(self.manager)
        url = f'{USERS}{self.client1.id}/'
        self.assertEqual(self.client.patch(url, {'role': 'admin'}).status_code, 400)
        self.assertEqual(self.client.patch(url, {'is_active': False}).status_code, 400)

    def test_manager_can_edit_client_phone(self):
        self.login(self.manager)
        resp = self.client.patch(
            f'{USERS}{self.client1.id}/', {'phone': '+998901234567'},
        )
        self.assertEqual(resp.status_code, 200)

    def test_admin_cannot_block_self_or_change_own_role(self):
        self.login(self.admin)
        url = f'{USERS}{self.admin.id}/'
        self.assertEqual(self.client.patch(url, {'is_active': False}).status_code, 400)
        self.assertEqual(self.client.patch(url, {'role': 'client'}).status_code, 400)

    def test_delete_is_not_allowed(self):
        self.login(self.admin)
        resp = self.client.delete(f'{USERS}{self.client1.id}/')
        self.assertEqual(resp.status_code, 405)