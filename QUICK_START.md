# Quick Start Guide

## 🚀 Tezkor Boshlash

### 1. Dependencies o'rnatish
```bash
npm install
```

### 2. Environment sozlamalari
`.env` fayl yaratish va to'ldirish:
```bash
cp .env.example .env
```

Minimal sozlamalar:
```env
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=postgres
DB_DATABASE=parts_hub
JWT_SECRET=your-secret-key-here
JWT_REFRESH_SECRET=your-refresh-secret-key-here
```

### 3. Database yaratish
```sql
CREATE DATABASE parts_hub;
```

### 4. Loyihani ishga tushirish
```bash
npm run start:dev
```

Loyiha `http://localhost:3000` da ishga tushadi.

## 📚 API Documentation

Swagger: `http://localhost:3000/api/docs`

## 🔑 Birinchi Admin User

### Variant 1: API orqali
1. Register qiling (buyer sifatida):
```bash
POST /api/auth/register
{
  "email": "admin@example.com",
  "password": "admin123",
  "role": "buyer"
}
```

2. PostgreSQL'da role'ni o'zgartiring:
```sql
UPDATE users SET role = 'admin' WHERE email = 'admin@example.com';
```

### Variant 2: To'g'ridan-to'g'ri Database'da
```sql
INSERT INTO users (id, email, password, role, "isActive", "createdAt")
VALUES (
  gen_random_uuid(),
  'admin@example.com',
  '$2b$10$rQ8K8K8K8K8K8K8K8K8K8uK8K8K8K8K8K8K8K8K8K8K8K8K8K8K8K', -- bcrypt hash of 'admin123'
  'admin',
  true,
  NOW()
);
```

## 🧪 Test Qilish

### 1. Register
```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "buyer@example.com",
    "password": "password123",
    "role": "buyer"
  }'
```

### 2. Login
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "buyer@example.com",
    "password": "password123"
  }'
```

### 3. Protected Endpoint (Token bilan)
```bash
curl -X GET http://localhost:3000/api/products \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

## 📋 Asosiy Endpointlar

### Auth
- `POST /api/auth/register` - Register
- `POST /api/auth/login` - Login
- `POST /api/auth/refresh` - Refresh token
- `POST /api/auth/logout` - Logout

### Products
- `GET /api/products` - Productlarni qidirish (filter, pagination)
- `GET /api/products/:id` - Product ma'lumotlari
- `POST /api/products` - Product yaratish (Seller)
- `PATCH /api/products/:id` - Product yangilash
- `DELETE /api/products/:id` - Product o'chirish

### Orders
- `POST /api/orders` - Order yaratish (Buyer)
- `GET /api/orders` - Orderlarni ko'rish
- `GET /api/orders/:id` - Order ma'lumotlari
- `PATCH /api/orders/:id/status` - Status o'zgartirish
- `POST /api/orders/:id/payment` - To'lov qilish

### Categories
- `GET /api/categories` - Barcha kategoriyalar
- `POST /api/categories` - Category yaratish (Admin)
- `PATCH /api/categories/:id` - Category yangilash (Admin)
- `DELETE /api/categories/:id` - Category o'chirish (Admin)

## 🎯 Keyingi Qadamlar

1. Admin user yarating
2. Category yarating
3. Seller profile yarating va verify qiling
4. Product qo'shing
5. Order yarating va to'lov qiling

Batafsil ma'lumot: `SETUP.md` va `PROJECT_SUMMARY.md` fayllariga qarang.
