# Firebase Migration Guide (Future)

## Overview
Panduan untuk migrasi dari MongoDB lokal ke Firebase Firestore di masa depan.

## Current Architecture

### MongoDB Collections
- `users` - User accounts
- `years` - Academic years
- `majors` - School majors
- `classes` - Classes
- `attendance` - Attendance records
- `invoices` - Invoices
- `paymentattempts` - Payment attempts
- `schedules` - Schedules
- `communications` - Messages
- `studentactivities` - Student activities
- `schools` - School profile

## Firebase Firestore Structure

### Collections Mapping

```
users/ → users/
years/ → academicYears/
majors/ → majors/
classes/ → classes/
attendance/ → attendance/
invoices/ → invoices/
paymentattempts/ → paymentAttempts/
schedules/ → schedules/
communications/ → communications/
studentactivities/ → studentActivities/
schools/ → schools/
```

## Migration Strategy

### Phase 1: Setup Firebase
1. Create Firebase project
2. Enable Firestore
3. Setup authentication
4. Configure security rules

### Phase 2: Data Migration
1. Export MongoDB data
2. Transform data format
3. Import to Firestore
4. Verify data integrity

### Phase 3: Code Migration
1. Replace Mongoose with Firestore SDK
2. Update API routes
3. Update frontend API calls
4. Test all features

### Phase 4: Deployment
1. Deploy to Firebase Hosting
2. Setup Cloud Functions (if needed)
3. Configure domain
4. Go live

## Code Changes Needed

### Backend Changes

**Before (MongoDB):**
```typescript
import mongoose from 'mongoose';
import User from './models/User';

const user = await User.findById(id);
```

**After (Firebase):**
```typescript
import { getFirestore, doc, getDoc } from 'firebase-admin/firestore';

const db = getFirestore();
const userRef = doc(db, 'users', id);
const userSnap = await getDoc(userRef);
const user = userSnap.data();
```

### Frontend Changes

**Before:**
```typescript
import api from '@/lib/api';
const response = await api.get('/users');
```

**After:**
```typescript
import { getFirestore, collection, getDocs } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

const db = getFirestore();
const usersRef = collection(db, 'users');
const usersSnap = await getDocs(usersRef);
```

## Firebase Setup Checklist

- [ ] Create Firebase project
- [ ] Enable Firestore Database
- [ ] Setup Authentication (Email/Password)
- [ ] Configure Firestore Security Rules
- [ ] Setup Firebase Admin SDK (backend)
- [ ] Setup Firebase Client SDK (frontend)
- [ ] Create Firestore collections
- [ ] Migrate data
- [ ] Update backend code
- [ ] Update frontend code
- [ ] Test all features
- [ ] Deploy

## Security Rules Example

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users collection
    match /users/{userId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && 
                      (request.auth.uid == userId || 
                       get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role in ['staff', 'principal']);
    }
    
    // Invoices collection
    match /invoices/{invoiceId} {
      allow read: if request.auth != null && 
                     (resource.data.parentId == request.auth.uid || 
                      get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role in ['finance', 'staff', 'principal']);
      allow create: if request.auth != null && 
                       get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role in ['finance', 'staff', 'principal'];
    }
    
    // Add more rules for other collections...
  }
}
```

## Benefits of Firebase

1. **Real-time Updates**: Firestore real-time listeners
2. **Offline Support**: Built-in offline persistence
3. **Scalability**: Auto-scaling
4. **Security**: Built-in security rules
5. **Hosting**: Firebase Hosting untuk frontend
6. **Functions**: Cloud Functions untuk backend logic
7. **Analytics**: Built-in analytics
8. **Storage**: Firebase Storage untuk files

## Migration Script Example

```typescript
// scripts/migrate-to-firebase.ts
import mongoose from 'mongoose';
import { getFirestore } from 'firebase-admin/firestore';
import User from '../models/User';

async function migrateUsers() {
  const db = getFirestore();
  const users = await User.find();
  
  for (const user of users) {
    await db.collection('users').doc(user._id.toString()).set({
      email: user.email,
      name: user.name,
      role: user.role,
      // ... other fields
    });
  }
}
```

## Notes

- Current MongoDB structure sudah compatible dengan Firestore
- Models sudah normalized, mudah untuk migrasi
- API structure bisa tetap sama, hanya implementasi yang berubah
- Frontend bisa gradual migration (hybrid approach)

## Timeline (Estimated)

- **Phase 1**: 1-2 days
- **Phase 2**: 2-3 days
- **Phase 3**: 5-7 days
- **Phase 4**: 2-3 days

**Total**: ~2 weeks untuk full migration

## Resources

- Firebase Docs: https://firebase.google.com/docs
- Firestore Docs: https://firebase.google.com/docs/firestore
- Migration Guide: https://firebase.google.com/docs/firestore/manage-data/migrate-data

---

**Note**: Dokumentasi ini untuk referensi masa depan. Untuk sekarang, gunakan MongoDB lokal untuk development.


