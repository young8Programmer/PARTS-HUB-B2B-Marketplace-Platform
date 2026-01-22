# PARTS HUB — B2B Marketplace Platform

Ehtiyot qismlar va xizmatlar uchun ulgurji savdo platformasi

## 🚀 Features

- **RBAC (Role-Based Access Control)** - Admin, Seller, Buyer rollari
- **JWT Authentication** - Access token va Refresh token
- **Order Management** - To'liq order lifecycle boshqaruvi
- **Payment Integration** - Transaction-based to'lov tizimi
- **Product Management** - Qidiruv, filter, pagination
- **Audit Logging** - Barcha muhim actionlarni log qilish
- **Soft Delete** - Ma'lumotlarni o'chirish
- **Swagger Documentation** - API dokumentatsiyasi

## 📋 Requirements

- Node.js (v18+)
- PostgreSQL (v14+)
- npm/yarn

## 🔧 Installation

```bash
# Dependencies o'rnatish
npm install

# .env fayl yaratish
cp .env.example .env

# Database sozlamalarini o'zgartirish
# .env faylida DB_HOST, DB_PORT, DB_USERNAME, DB_PASSWORD, DB_DATABASE

# Database migration (TypeORM auto-sync development uchun)
npm run start:dev
```

## 🏃 Running the app

```bash
# Development
npm run start:dev

# Production
npm run build
npm run start:prod

# PM2 bilan
pm2 start dist/main.js --name parts-hub
```

## 📚 API Documentation

Swagger dokumentatsiyasi: `http://localhost:3000/api/docs`

## 🏗️ Project Structure

```
src/
├── auth/           # Authentication moduli
├── users/          # Users moduli
├── sellers/        # Sellers moduli
├── products/       # Products moduli
├── categories/     # Categories moduli
├── orders/         # Orders moduli
├── payments/       # Payments moduli
├── audit-log/      # Audit log moduli
├── common/         # Common utilities, guards, decorators
└── database/       # Database konfiguratsiyasi
```

## 👥 Roles

### Admin
- Sellerlarni tasdiqlaydi
- Category yaratadi
- Orderlarni ko'radi
- Statistikani ko'radi
- Userlarni bloklaydi

### Seller
- Product qo'shadi
- Price & stock boshqaradi
- O'z orderlarini ko'radi
- Order statusini o'zgartiradi (shipped)

### Buyer
- Product qidiradi
- Buyurtma beradi
- To'lov qiladi
- Order tarixini ko'radi

## 🔐 Authentication

- Register endpoint
- Login endpoint
- JWT access token (15 min)
- Refresh token (7 days, DBda saqlanadi)
- Role-based guards

## 📝 License

Private project
