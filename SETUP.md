# PARTS HUB - Setup Guide

## 📋 Talablar

- Node.js (v18 yoki yuqori)
- PostgreSQL (v14 yoki yuqori)
- npm yoki yarn

## 🚀 O'rnatish

### 1. Dependencies o'rnatish

```bash
npm install
```

### 2. Environment sozlamalari

`.env` fayl yaratish va quyidagi sozlamalarni to'ldirish:

```env
# Database
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=postgres
DB_DATABASE=parts_hub

# JWT
JWT_SECRET=your-super-secret-jwt-key-change-in-production
JWT_EXPIRES_IN=15m
JWT_REFRESH_SECRET=your-super-secret-refresh-key-change-in-production
JWT_REFRESH_EXPIRES_IN=7d

# Application
PORT=3000
NODE_ENV=development

# Rate Limiting
THROTTLE_TTL=60
THROTTLE_LIMIT=10
```

### 3. Database yaratish

PostgreSQL'da database yaratish:

```sql
CREATE DATABASE parts_hub;
```

### 4. Loyihani ishga tushirish

```bash
# Development mode
npm run start:dev

# Production build
npm run build
npm run start:prod

# PM2 bilan
pm2 start ecosystem.config.js
```

## 👤 Birinchi Admin User yaratish

Database yaratilgandan keyin, birinchi admin userni yaratish:

### Variant 1: PostgreSQL orqali

```sql
INSERT INTO users (id, email, password, role, "isActive", "createdAt")
VALUES (
  gen_random_uuid(),
  'admin@example.com',
  '$2b$10$YourHashedPasswordHere', -- bcrypt hash
  'admin',
  true,
  NOW()
);
```

### Variant 2: API orqali

1. Avval buyer sifatida register qiling
2. Database'da role'ni 'admin'ga o'zgartiring
3. Yoki seed script yarating

## 🔐 Authentication Flow

### Register
```bash
POST /api/auth/register
{
  "email": "user@example.com",
  "password": "password123",
  "role": "buyer" // optional, default: buyer
}
```

### Login
```bash
POST /api/auth/login
{
  "email": "user@example.com",
  "password": "password123"
}
```

Response:
- `accessToken` - JWT token (15 min)
- `refreshToken` - Refresh token (7 kun, cookie'da ham saqlanadi)

### Protected Endpoints

Barcha protected endpointlar uchun header'da token yuborish:

```
Authorization: Bearer <accessToken>
```

### Refresh Token

```bash
POST /api/auth/refresh
{
  "refreshToken": "your-refresh-token"
}
```

## 📚 API Documentation

Swagger dokumentatsiyasi: `http://localhost:3000/api/docs`

## 🏗️ Loyiha Strukturasi

```
src/
├── auth/              # Authentication & Authorization
├── users/             # User management
├── sellers/           # Seller profiles
├── products/          # Product management
├── categories/       # Category management
├── orders/           # Order management
├── payments/         # Payment processing
├── audit-log/        # Audit logging
├── common/           # Common utilities, guards, decorators
└── database/         # Database configuration
```

## 🔑 Rolelar va Ruxsatlar

### Admin
- Barcha sellerlarni ko'rish va tasdiqlash
- Category yaratish, o'zgartirish, o'chirish
- Barcha orderlarni ko'rish
- Userlarni bloklash/blokdan chiqarish
- Audit loglarni ko'rish

### Seller
- O'z profilini yaratish va yangilash
- Product qo'shish, yangilash, o'chirish
- O'z productlaridagi orderlarni ko'rish
- Order statusini 'shipped'ga o'zgartirish

### Buyer
- Productlarni qidirish va filter qilish
- Order yaratish
- To'lov qilish
- O'z orderlarini ko'rish
- Order statusini 'completed' yoki 'canceled'ga o'zgartirish

## 💳 Payment Providers

Hozircha mock payment provider ishlaydi. Keyinchalik Click va Payme integratsiya qilinadi.

## 🔄 Order Lifecycle

```
pending → paid → shipped → completed
         ↘ canceled
```

- **pending**: Order yaratildi
- **paid**: To'lov qilindi (stock kamayadi)
- **shipped**: Seller yubordi
- **completed**: Buyer qabul qildi
- **canceled**: Bekor qilindi

## 🛡️ Security Features

- Password hashing (bcrypt)
- JWT authentication
- Refresh token (DBda saqlanadi)
- Role-based access control
- Rate limiting
- Input validation (class-validator)
- SQL injection protection (TypeORM)

## 📊 Transaction Logic

To'lov qilinayotganda:
1. Payment yaratiladi
2. Order status 'paid'ga o'zgaradi
3. Product stock kamayadi

Hammasi bitta transaction ichida - agar bittasi xato bo'lsa, hammasi rollback qilinadi.

## 🧪 Testing

```bash
# Unit tests
npm run test

# E2E tests
npm run test:e2e

# Coverage
npm run test:cov
```

## 🚀 Production Deployment

1. Environment variables'ni production qiymatlariga o'zgartiring
2. `NODE_ENV=production` qo'ying
3. `synchronize: false` qiling (migration ishlating)
4. PM2 yoki boshqa process manager ishlating
5. Nginx reverse proxy sozlang
6. SSL sertifikat o'rnating

## 📝 Notes

- Development mode'da TypeORM auto-sync ishlaydi
- Production'da migration ishlatish tavsiya etiladi
- Refresh tokenlar avtomatik tozalanadi (expired tokenlar o'chiriladi)
