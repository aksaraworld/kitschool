# Firebase Migration - Continued Implementation

## ✅ What's Been Completed

### Frontend Updates
1. ✅ **Login Page** - Updated to use `firebaseAuthService`
2. ✅ **useAuth Hook** - Updated to use Firebase Auth with state listeners
3. ✅ **Firebase Storage** - Created utilities for file uploads (`frontend/lib/firebaseStorage.ts`)
   - `uploadFile()` - Upload single file
   - `uploadFiles()` - Upload multiple files
   - `uploadImage()` - Upload with image compression
   - `deleteFile()` - Delete file from storage
   - `getFileUrl()` - Get download URL

### Backend Updates
1. ✅ **Firestore Service** - Generic CRUD operations (`backend/src/services/firestoreService.ts`)
2. ✅ **Users Routes (Firestore)** - Example implementation (`backend/src/routes/usersFirestore.ts`)
   - Shows how to migrate from MongoDB to Firestore
   - Includes authentication and authorization
   - Handles school context filtering

## 📋 Next Steps

### 1. Update Payment Modal to Use Firebase Storage

Update `frontend/components/Payment/PaymentModal.tsx`:

```typescript
import { uploadImage } from '@/lib/firebaseStorage';

// In the form handler:
const handleFileUpload = async (file: File) => {
  try {
    const url = await uploadImage(file, {
      folder: 'payments',
      maxWidth: 1920,
      quality: 0.8
    });
    setFormData({ ...formData, proofOfPayment: url });
  } catch (error) {
    console.error('Upload error:', error);
  }
};
```

### 2. Migrate All Backend Routes

Replace MongoDB queries with Firestore in:
- `backend/src/routes/classes.ts`
- `backend/src/routes/attendance.ts`
- `backend/src/routes/payments.ts`
- `backend/src/routes/schedules.ts`
- `backend/src/routes/school.ts`
- etc.

**Example Migration Pattern:**

**Before (MongoDB):**
```typescript
const users = await User.find({ schoolId: req.user.schoolId });
```

**After (Firestore):**
```typescript
const snapshot = await firestore
  .collection('users')
  .where('schoolId', '==', req.user.schoolId)
  .get();
const users = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
```

### 3. Update Server to Use Firestore Routes

In `backend/src/server.ts`:

```typescript
// Option 1: Replace old routes
import usersRoutes from './routes/usersFirestore';
app.use('/api/users', usersRoutes);

// Option 2: Keep both during migration
import usersRoutes from './routes/users';
import usersFirestoreRoutes from './routes/usersFirestore';
app.use('/api/users', usersRoutes); // Old MongoDB
app.use('/api/users-v2', usersFirestoreRoutes); // New Firestore
```

### 4. Update Frontend Components

Update components that upload files:
- Payment proof uploads
- Avatar uploads
- Document uploads
- etc.

### 5. Set Up Firestore Security Rules

Create `firestore.rules`:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users
    match /users/{userId} {
      allow read: if request.auth != null && (
        request.auth.uid == userId ||
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role in ['saas_admin', 'principal', 'staff']
      );
      allow write: if request.auth != null && (
        request.auth.uid == userId ||
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role in ['saas_admin', 'principal']
      );
    }
    
    // Schools
    match /schools/{schoolId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && 
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role in ['saas_admin', 'principal'];
    }
    
    // Add more collections...
  }
}
```

### 6. Set Up Storage Security Rules

Create `storage.rules`:

```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /payments/{allPaths=**} {
      allow read: if request.auth != null;
      allow write: if request.auth != null;
    }
    
    match /avatars/{allPaths=**} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

## 🔧 Usage Examples

### Upload File in Component

```typescript
import { uploadImage } from '@/lib/firebaseStorage';

const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
  const file = e.target.files?.[0];
  if (!file) return;
  
  try {
    const url = await uploadImage(file, {
      folder: 'payments',
      fileName: `payment_${Date.now()}`,
      maxWidth: 1920,
      quality: 0.8
    });
    console.log('File uploaded:', url);
  } catch (error) {
    console.error('Upload failed:', error);
  }
};
```

### Query Firestore in Backend

```typescript
import { firestore } from '../config/firebase';

// Get all classes for a school
const classesSnapshot = await firestore
  .collection('classes')
  .where('schoolId', '==', schoolId)
  .get();

const classes = classesSnapshot.docs.map(doc => ({
  id: doc.id,
  ...doc.data()
}));
```

## 📝 Migration Checklist

- [x] Firebase Auth setup
- [x] Firestore models created
- [x] Frontend auth service updated
- [x] Login page updated
- [x] useAuth hook updated
- [x] Firebase Storage utilities created
- [x] Example Firestore routes created
- [ ] All backend routes migrated
- [ ] All file uploads use Firebase Storage
- [ ] Firestore security rules deployed
- [ ] Storage security rules deployed
- [ ] Frontend components updated
- [ ] Testing completed
- [ ] MongoDB dependencies removed

## 🚀 Testing

1. Test user login with Firebase Auth
2. Test file uploads to Firebase Storage
3. Test Firestore queries
4. Test security rules
5. Test custom claims (role, schoolId)

## 📚 Resources

- [Firebase Auth Docs](https://firebase.google.com/docs/auth)
- [Firestore Docs](https://firebase.google.com/docs/firestore)
- [Firebase Storage Docs](https://firebase.google.com/docs/storage)
