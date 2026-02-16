# Firebase Setup - Implementation Complete

## ✅ What's Been Set Up

### Backend
1. ✅ Firebase Admin SDK configuration (`backend/src/config/firebase.ts`)
2. ✅ Firebase Auth middleware (`backend/src/middleware/firebaseAuth.ts`)
3. ✅ Firebase Auth routes (`backend/src/routes/firebaseAuth.ts`)
4. ✅ Firestore User model (`backend/src/models/firestore/User.ts`)
5. ✅ Migration script (`backend/src/scripts/migrate-to-firebase.ts`)
6. ✅ Shared types (`backend/src/types/index.ts`)

### Frontend
1. ✅ Firebase Client SDK configuration (`frontend/lib/firebase.ts`)
2. ✅ Firebase Auth service (`frontend/lib/firebaseAuth.ts`)
3. ✅ Updated API client to use Firebase tokens (`frontend/lib/aksara-api.ts`)

### Dependencies
1. ✅ Added `@aksara/firebase` to backend package.json
2. ✅ Added `@aksara/firebase` to frontend package.json

## 📋 Next Steps

### 1. Install Dependencies

```bash
# Build Aksara packages (including Firebase)
npm run build:packages

# Install backend dependencies
cd backend
npm install
cd ..

# Install frontend dependencies
cd frontend
npm install
cd ..
```

### 2. Set Up Firebase Project

1. Go to https://console.firebase.google.com
2. Create a new project or select existing
3. Enable Authentication (Email/Password)
4. Create Firestore database
5. Enable Storage
6. Download service account key → save as `backend/firebase-service-account.json`

### 3. Configure Environment Variables

**Backend `.env`:**
```env
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_SERVICE_ACCOUNT_PATH=./firebase-service-account.json
```

**Frontend `.env.local`:**
```env
NEXT_PUBLIC_FIREBASE_API_KEY=your-api-key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
NEXT_PUBLIC_FIREBASE_APP_ID=your-app-id
```

### 4. Update Server Routes

In `backend/src/server.ts`, replace:
```typescript
// OLD
import authRoutes from './routes/auth';
app.use('/api/auth', authRoutes);

// NEW
import firebaseAuthRoutes from './routes/firebaseAuth';
app.use('/api/auth', firebaseAuthRoutes);
```

### 5. Update Frontend Login Page

Update `frontend/app/login/page.tsx` to use Firebase Auth:

```typescript
import { firebaseAuthService } from '@/lib/firebaseAuth';

// In your login handler:
const handleLogin = async (e: React.FormEvent) => {
  e.preventDefault();
  try {
    const response = await firebaseAuthService.login({
      email,
      password
    });
    // Redirect to dashboard
    router.push('/dashboard');
  } catch (error) {
    // Handle error
  }
};
```

### 6. Migrate Existing Users (Optional)

If you have existing users in MongoDB:

```bash
cd backend
npm run migrate:firebase
```

**Note:** Users will need to reset their passwords as original passwords cannot be migrated.

### 7. Update All Routes to Use Firestore

Replace MongoDB queries with Firestore queries in all route files:
- `backend/src/routes/users.ts`
- `backend/src/routes/classes.ts`
- `backend/src/routes/attendance.ts`
- etc.

### 8. Update Middleware Usage

In all route files, replace:
```typescript
// OLD
import { authenticate } from '../middleware/auth';

// NEW
import { authenticate } from '../middleware/firebaseAuth';
```

## 🔐 Security Rules

Set up Firestore security rules (see `FIREBASE_MIGRATION_GUIDE.md` for details).

## 📝 Important Notes

1. **Users are in Firebase Auth** - Authentication is handled by Firebase
2. **User data is in Firestore** - Additional data (role, schoolId, etc.) is in Firestore
3. **Custom Claims** - Role and schoolId are stored as custom claims in Firebase Auth tokens
4. **Password Migration** - Original passwords cannot be migrated; users must reset

## 🚀 Testing

1. Test user registration
2. Test user login
3. Test protected routes
4. Test token refresh
5. Test logout

## 📚 Documentation

- See `FIREBASE_MIGRATION_GUIDE.md` for detailed migration steps
- See Firebase documentation: https://firebase.google.com/docs
