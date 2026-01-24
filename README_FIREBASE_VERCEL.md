# 🔥🚀 Firebase + Vercel Setup - README

## 🎯 Quick Links

- **Quick Start:** [QUICK_START_FIREBASE_VERCEL.md](./QUICK_START_FIREBASE_VERCEL.md)
- **Firebase Setup:** [FIREBASE_SETUP_COMPLETE_GUIDE.md](./FIREBASE_SETUP_COMPLETE_GUIDE.md)
- **Vercel Setup:** [VERCEL_SETUP_COMPLETE_GUIDE.md](./VERCEL_SETUP_COMPLETE_GUIDE.md)
- **Migration Guide:** [FIREBASE_MIGRATION_GUIDE.md](./FIREBASE_MIGRATION_GUIDE.md)

## ✅ What's Ready

All Firebase migration tasks are complete! The system is ready for:

1. ✅ **Firebase Authentication** - Users in Firebase Auth
2. ✅ **Firestore Database** - Data storage
3. ✅ **Firebase Storage** - File uploads
4. ✅ **Vercel Deployment** - Frontend deployment ready
5. ✅ **Security Rules** - Firestore and Storage rules created
6. ✅ **Migration Script** - Move existing data to Firebase

## 🚀 Get Started in 3 Steps

### Step 1: Set Up Firebase (15 min)

1. Create project at https://console.firebase.google.com
2. Enable Auth, Firestore, Storage
3. Download service account key
4. Get client config
5. Deploy security rules

**See:** `FIREBASE_SETUP_COMPLETE_GUIDE.md` for details

### Step 2: Configure Environment Variables

**Backend (.env):**
```env
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_SERVICE_ACCOUNT_PATH=./firebase-service-account.json
```

**Frontend (Vercel):**
```
NEXT_PUBLIC_FIREBASE_API_KEY=...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=...
NEXT_PUBLIC_FIREBASE_PROJECT_ID=...
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=...
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=...
NEXT_PUBLIC_FIREBASE_APP_ID=...
```

### Step 3: Deploy to Vercel (10 min)

1. Connect GitHub repo
2. Set root directory: `.`
3. Add environment variables
4. Deploy!

**See:** `VERCEL_SETUP_COMPLETE_GUIDE.md` for details

## 📁 Project Structure

```
cognifa/
├── backend/
│   ├── src/
│   │   ├── config/
│   │   │   └── firebase.ts          # Firebase Admin setup
│   │   ├── middleware/
│   │   │   └── firebaseAuth.ts      # Firebase Auth middleware
│   │   ├── routes/
│   │   │   ├── firebaseAuth.ts      # Firebase Auth routes
│   │   │   └── usersFirestore.ts    # Example Firestore routes
│   │   ├── models/
│   │   │   └── firestore/
│   │   │       └── User.ts          # Firestore User model
│   │   └── scripts/
│   │       └── migrate-to-firebase.ts
│   └── firebase-service-account.json
├── frontend/
│   ├── lib/
│   │   ├── firebase.ts              # Firebase Client setup
│   │   ├── firebaseAuth.ts          # Firebase Auth service
│   │   └── firebaseStorage.ts       # Storage utilities
│   └── app/
│       └── login/
│           └── page.tsx             # Updated to Firebase Auth
├── firestore.rules                   # Firestore security rules
├── storage.rules                     # Storage security rules
└── vercel.json                       # Vercel configuration
```

## 🎓 Key Concepts

### Users in Firebase Auth
- Authentication handled by Firebase
- Custom claims store role and schoolId
- Tokens automatically refreshed

### Data in Firestore
- User profiles in `users` collection
- All app data in Firestore
- Real-time updates available

### File Uploads
- Use `uploadImage()` for images (auto-compresses)
- Use `uploadFile()` for other files
- Files stored in Firebase Storage

## 🔧 Development

### Local Setup

```bash
# Install dependencies
npm install
npm run build:packages

# Backend
cd backend
npm install
npm run dev

# Frontend (new terminal)
cd frontend
npm install
npm run dev
```

### Migrate Existing Data

```bash
cd backend
npm run migrate:firebase
```

## 📚 Documentation

- **Quick Start:** Fastest path to deployment
- **Firebase Guide:** Complete Firebase setup
- **Vercel Guide:** Complete Vercel setup
- **Migration Guide:** Detailed migration steps
- **Migration Continued:** Patterns and examples

## 🆘 Need Help?

1. Check the relevant guide
2. Review error messages
3. Check Firebase Console
4. Check Vercel build logs
5. Verify environment variables

## 🎉 Ready to Deploy!

Everything is set up and ready. Follow the guides to deploy your app!

**Start here:** `QUICK_START_FIREBASE_VERCEL.md`
