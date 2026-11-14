# 🚗 AutoService Manager

Avtoservis ishini bir joyda boshqarish uchun to'liq tizim: buyurtmalar, ustalar, ombor, to'lovlar va hisobotlar.

![Backend](https://img.shields.io/badge/Backend-Django%20REST-0F766E)
![Frontend](https://img.shields.io/badge/Frontend-React%20%2B%20Tailwind-0F766E)
![Tests](https://img.shields.io/badge/Backend%20testlar-100%20ta-brightgreen)

## ✨ Nima qila oladi

Buyurtma quyidagi yo'l bilan o'tadi:

**Yangi buyurtma → Diagnostika → Ustaga biriktirish → Ta'mirlash → Yakunlash → To'lov**

- Har bir buyurtmada xizmatlar va ehtiyot qismlar, narx buyurtma vaqtida qotiriladi
- Ombor qoldig'i avtomatik kamayadi va bekor qilinsa qaytadi
- Hisob-faktura raqamlari: `INV-2026-0001`, qisman to'lov mumkin
- Usta ehtiyot qism so'raydi, menejer tasdiqlaydi
- Mijoz ish tugagach fikr qoldiradi
- Moliyaviy hisobot: tushum, qarz, to'lov usullari bo'yicha

## 👥 Rollar

| Rol | Nima qiladi |
|---|---|
| **Admin** | Hamma bo'limlar va foydalanuvchilar boshqaruvi |
| **Menejer** | Buyurtmalar, mijozlar, xizmatlar, ombor, to'lovlar, hisobotlar |
| **Usta** | O'ziga biriktirilgan ishlar, diagnostika, qism so'rash |
| **Mijoz** | O'z avtomobillari, buyurtmalari va hisoblari |

Har bir rol faqat o'ziga tegishli ma'lumotni ko'radi. Cheklovlar serverda ham, interfeysda ham ishlaydi.

## 🧰 Texnologiyalar

- **Backend:** Python, Django, Django REST Framework, Simple JWT, SQLite, drf-spectacular (Swagger)
- **Frontend:** React, React Router, Axios, Tailwind CSS
- **Testlar:** Django TestCase (backend), Vitest + Testing Library (frontend)

## 🚀 Ishga tushirish

Kerak bo'ladi: **Python 3.10+** va **Node.js 18+**.

### 1. Backend

```bash
cd backend
python -m venv env
env\Scripts\activate          # macOS/Linux: source env/bin/activate
pip install -r requirements.txt
```

Sozlama faylini yarating: `.env.example` ni nusxalab `.env` deb nomlang va `SECRET_KEY` ga o'zingizning kalitingizni yozing.

```bash
py manage.py migrate
py manage.py createsuperuser
py manage.py runserver
```

Server: http://127.0.0.1:8000
API hujjati (Swagger): http://127.0.0.1:8000/api/docs/

### 2. Frontend

Yangi terminal oching:

```bash
cd frontend
npm install
```

`.env.example` ni nusxalab `.env` deb nomlang, so'ng:

```bash
npm run dev
```

Sayt: http://localhost:5173

### 3. Birinchi kirish

1. Superuser login va paroli bilan kiring.
2. **Foydalanuvchilar** bo'limida o'z rolingizni `admin` ga o'rnating va menejer bilan usta yarating.
3. **Xizmatlar** va **Ombor** ga bir nechta yozuv qo'shing.
4. Mijoz sifatida ro'yxatdan o'tib, avtomobil va buyurtma yarating.

## ✅ Testlar

```bash
# Backend (backend papkasida)
py manage.py test

# Frontend (frontend papkasida)
npm test
```

## 📁 Papkalar tuzilishi

```
autoservice-manager/
├── backend/
│   ├── config/         Django sozlamalari va asosiy URL'lar
│   ├── accounts/       Foydalanuvchilar, rollar, profil
│   ├── vehicles/       Avtomobillar
│   ├── services/       Xizmatlar ro'yxati
│   ├── inventory/      Ombor va kirimlar
│   ├── orders/         Buyurtmalar, qism so'rovlari, fikrlar
│   ├── payments/       Hisob-fakturalar va to'lovlar
│   └── reports/        Dashboard va moliyaviy hisobot
└── frontend/
    └── src/
        ├── api/        Server bilan aloqa
        ├── components/ Qayta ishlatiladigan elementlar
        ├── context/    Kirish holati (AuthContext)
        ├── layouts/    Asosiy va kirish sahifalari maketi
        ├── pages/      Sahifalar
        └── routes/     Rolga qarab himoyalangan yo'llar
```

## 🔐 Xavfsizlik

- Kirish JWT orqali: access token 60 daqiqa, refresh token 7 kun
- Maxfiy kalitlar `.env` faylida, u GitHub'ga yuklanmaydi
- Ishlab chiqarishga chiqarishda `DEBUG=False` qiling va `ALLOWED_HOSTS` ni to'ldiring

## 🗺️ Keyingi rejalar

- Barcha jarayonlar uchun to'liq audit jurnali
- Hisob-fakturani PDF qilib yuklab olish
- Xabarnomalar (buyurtma holati o'zgarganda)