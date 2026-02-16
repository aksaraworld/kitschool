# Local login (Firebase Admin)

Login needs **Firebase Admin** credentials so `/api/auth/me` can verify the token and read the user from Firestore.

## Steps

1. **Download service account key**
   - Open [Firebase Console](https://console.firebase.google.com/) → project **cognifa-16209**
   - ⚙️ **Project settings** → **Service accounts**
   - Click **Generate new private key** → save the JSON file

2. **Put the file in the frontend folder**
   - Move/copy the JSON into the `frontend` folder
   - Example name: `cognifa-firebase-adminsdk.json`  
   - (This path is in `.gitignore`; do not commit it.)

3. **Set the path in `.env.local`**
   - Open `frontend/.env.local`
   - Uncomment or add (path relative to `frontend`):
   ```env
   FIREBASE_SERVICE_ACCOUNT_PATH=./cognifa-firebase-adminsdk.json
   ```
   - Use the actual filename if different.

4. **Restart the dev server**
   - Stop (`Ctrl+C`) and run again: `npm run dev`

Then try logging in again (e.g. `saas@cognifa.com` / `saasadmin123` if you have seeded Firestore).
