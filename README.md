# Aksara School Management

**Lacak. Terhubung. Percaya. Semua dalam Satu Tempat**

A comprehensive SaaS platform for school management with multi-role support, built with the **Aksara Framework**.

## ✨ Features

- **Multi-tenant SaaS** - Manage multiple schools from one platform
- **Multi-role authentication** - 8 roles (SaaS Admin, Principal, Staff, Finance, Teacher, Homeroom Teacher, Student, Parent)
- **Student attendance tracking** - GPS-based attendance with status tracking
- **Parent-teacher communication** - Messaging system
- **Payment management** - Invoice generation, payment tracking, gateway integration
- **Class, Year, and Major management** - Complete academic structure
- **Schedule and calendar management** - Class schedules, events, holidays
- **Student activity monitoring** - Parents can track children's activities
- **Reports and analytics** - Comprehensive reporting system
- **Light blue/dark blue theme** - Modern, professional UI

## 🛠️ Tech Stack

### Frontend
- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Framework**: Aksara Framework (@aksara/api, @aksara/context, @aksara/hooks, @aksara/ui, @aksara/formatters)
- **Icons**: Lucide React

### Backend
- **Framework**: Express.js
- **Language**: TypeScript
- **Database**: MongoDB with Mongoose ODM
- **Authentication**: JWT (JSON Web Tokens)
- **Password Hashing**: bcryptjs
- **Validation**: Zod

## 📁 Project Structure

```
<repo>/
├── frontend/          # Next.js frontend application
├── backend/           # Express backend API
├── packages/          # Aksara Framework packages
│   ├── api/          # API client with caching
│   ├── core/         # Core utilities
│   ├── context/      # React context providers
│   ├── hooks/        # React hooks
│   ├── ui/           # UI components
│   └── formatters/   # Formatting utilities
└── README.md
```

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- MongoDB (local or Atlas)
- npm 8+

### Quick Start

1. **Install dependencies:**
```bash
npm run install:all
```

2. **Build Aksara Framework packages:**
```bash
# Windows
.\build-packages.ps1

# Linux/Mac
chmod +x build-packages.sh
./build-packages.sh
```

3. **Setup MongoDB:**
   - Local: Ensure MongoDB is running at `mongodb://localhost:27017`
   - Cloud: Use MongoDB Atlas and update `MONGODB_URI` in `backend/.env`

4. **Setup environment variables:**
```bash
# Backend
cd backend
# Create .env file with:
# MONGODB_URI=mongodb://localhost:27017/sekolahkita
# JWT_SECRET=your-secret-key-here
# PORT=5000
# FRONTEND_URL=http://localhost:3000

# Frontend (optional)
cd ../frontend
# Create .env.local with:
# NEXT_PUBLIC_API_URL=http://localhost:5000
```

5. **Seed database (creates demo accounts):**
```bash
npm run seed
```

6. **Run application:**
```bash
npm run dev
```

7. **Access application:**
   - Frontend: http://localhost:3000 (or 3001, 3002, etc.)
   - Backend API: http://localhost:5000/api

### Demo logins (passwords)

| Role        | Example email                    | Password      |
|------------|-----------------------------------|---------------|
| SaaS Admin | `saas@cognifa.com`               | `saasadmin123` |
| Principal  | `principal@smkdemodepok.sch.id`   | `principal123` |
| Staff      | `staff1@smkdemodepok.sch.id`     | `staff123`     |
| Finance    | `finance1@smkdemodepok.sch.id`   | `finance123`   |
| Teacher    | `teacher1@smkdemodepok.sch.id`    | `teacher123`   |
| Student    | `s0001@smkdemodepok.sch.id`       | `student123`   |
| Parent     | `parent0001@smkdemodepok.sch.id` | `parent123`    |

Full list of 50 accounts: [DEMO_ACCOUNTS.md](./DEMO_ACCOUNTS.md).

**See [SETUP_AKSARA.md](./SETUP_AKSARA.md) for detailed setup guide.**

## 👥 User Roles

- **SaaS Admin**: Manage all schools, subscriptions, platform settings
- **Principal**: Full school management, user management, reports
- **Staff**: User management, class/year/major management, schedule creation
- **Finance**: View and manage payments, invoices, financial reports
- **Teacher**: Manage attendance, communicate with parents, create schedules
- **Homeroom Teacher**: All teacher features + class management
- **Student**: View calendar, submit attendance, view reports
- **Parent**: Monitor children, communicate with teachers, make payments, view calendar/reports

## 📚 Documentation

- [DEMO_ACCOUNTS.md](./DEMO_ACCOUNTS.md) – Demo account credentials (50 accounts)
- [DATABASE_SCHEMA.md](./DATABASE_SCHEMA.md) – Database structure
- [DATABASE_AND_STORAGE.md](./DATABASE_AND_STORAGE.md) – Firestore & Firebase Storage integration
- [SERVERLESS.md](./SERVERLESS.md) – Serverless API (auth/me, register)
- [SETUP_AKSARA.md](./SETUP_AKSARA.md) – Aksara Framework setup

## 🎨 Theme

The application uses a **light blue and dark blue** color scheme for a modern, professional appearance.

## 📦 Aksara Framework

This project uses the [Aksara Framework](https://github.com/aksaraworld/aksara-framework) for:
- API client with caching
- Context providers
- React hooks
- UI components
- Formatting utilities

## 📄 License

ISC License
