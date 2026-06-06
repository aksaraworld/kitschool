# 🚀 Complete Vercel Setup Guide

## Step 1: Create Vercel Account

1. Go to https://vercel.com
2. Sign up with GitHub (recommended) or email
3. Verify your email if needed

## Step 2: Install Vercel CLI (Optional)

```bash
npm install -g vercel
```

## Step 3: Connect GitHub Repository

### Option A: Via Vercel Dashboard (Recommended)

1. Go to https://vercel.com/dashboard
2. Click **"Add New"** → **"Project"**
3. Import your GitHub repository:
   - Select repository: `aksaraworld/cognifa`
   - Click **"Import"**

### Option B: Via CLI

```bash
# From project root
vercel login
vercel
```

## Step 4: Configure Project Settings

### 4.1 Framework Preset

- **Framework Preset:** Next.js (auto-detected)

### 4.2 Root Directory

**IMPORTANT:** Set root directory to project root (`.`), NOT `frontend`

- **Root Directory:** `.` (project root)

### 4.3 Build Settings

- **Build Command:** `cd frontend && npm run build`
  - The `prebuild` hook will automatically build packages
- **Output Directory:** `frontend/.next`
- **Install Command:** `cd .. && npm install && npm install`
  - First `npm install` installs root dependencies
  - Second `npm install` installs frontend dependencies

### 4.4 Environment Variables

Add these in Vercel dashboard (Settings > Environment Variables):

#### Required Variables

**Frontend:**
```
NEXT_PUBLIC_API_URL=https://your-backend-url.vercel.app
NEXT_PUBLIC_FIREBASE_API_KEY=your-firebase-api-key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
NEXT_PUBLIC_FIREBASE_APP_ID=your-app-id
```

**Backend (if deploying separately):**
```
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_SERVICE_ACCOUNT_PATH=./firebase-service-account.json
# OR
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@your-project.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
```

## Step 5: Deploy

### First Deployment

1. Click **"Deploy"** in Vercel dashboard
2. Wait for build to complete (2-5 minutes)
3. Check build logs for any errors

### Subsequent Deployments

- **Automatic:** Every push to `main` branch
- **Manual:** Click "Redeploy" in dashboard

## Step 6: Configure Custom Domain (Optional)

1. Go to Project Settings > Domains
2. Add your domain
3. Follow DNS configuration instructions
4. Wait for DNS propagation (5-60 minutes)

## Step 7: Backend Deployment

### Option A: Deploy Backend to Vercel (Serverless)

1. Create new Vercel project for backend
2. Root Directory: `backend`
3. Build Command: `npm run build`
4. Output Directory: `dist`
5. Install Command: `npm install`
6. Add environment variables

### Option B: Deploy Backend to Railway/Render

1. Connect GitHub repository
2. Set root directory to `backend`
3. Build command: `npm run build`
4. Start command: `npm start`
5. Add environment variables

### Option C: Keep Backend Local (Development)

- Run backend locally: `cd backend && npm run dev`
- Update `NEXT_PUBLIC_API_URL` to `http://localhost:5000`

## Step 8: Verify Deployment

1. **Check Frontend:**
   - Visit your Vercel URL
   - Should see login page
   - Check browser console for errors

2. **Check Backend:**
   - Visit `https://your-backend-url/api/health`
   - Should return: `{"status":"ok","message":"Aksara School Management API is running"}`

3. **Test Authentication:**
   - Try to login
   - Check Firebase Console for user creation

## Step 9: Continuous Deployment

### Automatic Deployments

- **Production:** Deploys from `main` branch
- **Preview:** Deploys from pull requests

### Manual Deployment

```bash
vercel --prod
```

## Troubleshooting

### Build Fails: "Module not found '@aksara/...'"

**Solution:**
1. Ensure root directory is `.` (project root)
2. Check `prebuild` script in `frontend/package.json`
3. Verify packages are built before Next.js build

### Build Fails: "bash is not recognized"

**Solution:**
- The `build-packages.js` (Node.js) should work on Vercel
- If not, check that root directory is correct

### Environment Variables Not Working

**Solution:**
1. Check variable names (case-sensitive)
2. Ensure `NEXT_PUBLIC_` prefix for frontend variables
3. Redeploy after adding variables

### CORS Errors

**Solution:**
1. Add frontend URL to backend CORS allowed origins
2. Update `FRONTEND_URL` in backend environment variables

### Firebase Errors

**Solution:**
1. Verify all `NEXT_PUBLIC_FIREBASE_*` variables are set
2. Check Firebase project is active
3. Verify service account key is correct (backend)

## Vercel Configuration Files

### vercel.json (Already Created)

```json
{
  "version": 2,
  "buildCommand": "npm run build",
  "outputDirectory": ".next",
  "installCommand": "cd .. && npm install",
  "framework": "nextjs"
}
```

### .vercelignore (Already Created)

Excludes unnecessary files from deployment.

## Production Checklist

- [ ] GitHub repository connected
- [ ] Root directory set to `.`
- [ ] Build command configured
- [ ] Environment variables added
- [ ] First deployment successful
- [ ] Backend deployed (separate or same project)
- [ ] Custom domain configured (optional)
- [ ] Firebase configured
- [ ] CORS configured
- [ ] Test login works
- [ ] Test file uploads work

## Monitoring

### Vercel Analytics

1. Go to Project Settings > Analytics
2. Enable Vercel Analytics (optional)
3. View deployment logs and errors

### Error Tracking

Consider adding:
- Sentry
- LogRocket
- Or Firebase Crashlytics

## Next Steps

1. ✅ Vercel account created
2. ✅ Repository connected
3. ✅ Project configured
4. ✅ Environment variables set
5. ✅ First deployment successful
6. ⏭️ Configure custom domain
7. ⏭️ Set up monitoring
8. ⏭️ Configure CI/CD

## Resources

- [Vercel Dashboard](https://vercel.com/dashboard)
- [Vercel Docs](https://vercel.com/docs)
- [Next.js on Vercel](https://vercel.com/docs/frameworks/nextjs)
