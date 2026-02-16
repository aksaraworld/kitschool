# ⚡ Quick Start: Firebase + Vercel Setup

## 🎯 Quick Checklist

### Firebase Setup (15 minutes)

1. ✅ Create Firebase project: https://console.firebase.google.com
2. ✅ Enable Authentication (Email/Password)
3. ✅ Create Firestore database
4. ✅ Enable Storage
5. ✅ Download service account key → `backend/firebase-service-account.json`
6. ✅ Copy client config from Firebase Console
7. ✅ Set environment variables (see below)
8. ✅ Deploy security rules: `firebase deploy --only firestore:rules,storage:rules`

### Vercel Setup (10 minutes)

1. ✅ Sign up: https://vercel.com
2. ✅ Import GitHub repo: `aksaraworld/cognifa`
3. ✅ Set root directory: `.` (project root)
4. ✅ Set build command: `cd frontend && npm run build`
5. ✅ Set output directory: `frontend/.next`
6. ✅ Add environment variables (see below)
7. ✅ Deploy!

## 📝 Environment Variables

### Backend (.env)

```env
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_SERVICE_ACCOUNT_PATH=./firebase-service-account.json
```

### Frontend (Vercel Environment Variables)

```
NEXT_PUBLIC_API_URL=https://your-backend.vercel.app
NEXT_PUBLIC_FIREBASE_API_KEY=AIza...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789
NEXT_PUBLIC_FIREBASE_APP_ID=1:123456789:web:abc123
```

## 🚀 Deploy Commands

### Deploy Security Rules

```bash
firebase login
firebase init
firebase deploy --only firestore:rules,storage:rules
```

### Deploy to Vercel

```bash
# Via CLI
vercel --prod

# Or push to GitHub (auto-deploys)
git push origin main
```

## ✅ Verify Setup

1. **Firebase:**
   - Check Firebase Console → Authentication (should be enabled)
   - Check Firestore Database (should exist)
   - Check Storage (should exist)

2. **Vercel:**
   - Visit your Vercel URL
   - Should see login page
   - Check build logs (no errors)

3. **Test:**
   - Try creating a user
   - Check Firebase Console for user
   - Try uploading a file
   - Check Storage for file

## 📚 Detailed Guides

- **Firebase:** See `FIREBASE_SETUP_COMPLETE_GUIDE.md`
- **Vercel:** See `VERCEL_SETUP_COMPLETE_GUIDE.md`

## 🆘 Quick Troubleshooting

**Build fails?**
- Check root directory is `.`
- Verify `prebuild` script works
- Check build logs in Vercel

**Firebase errors?**
- Verify all environment variables
- Check service account key path
- Verify Firebase project is active

**CORS errors?**
- Add Vercel URL to backend CORS
- Update `FRONTEND_URL` in backend

## 🎉 You're Done!

Your app should now be:
- ✅ Deployed on Vercel
- ✅ Using Firebase Auth
- ✅ Using Firestore
- ✅ Using Firebase Storage

Happy coding! 🚀
