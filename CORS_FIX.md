# CORS Fix - Port 3001 Support

## Issue
Frontend running on `http://localhost:3001` but backend only allowed `http://localhost:3000`.

## Solution Applied
Updated `backend/src/server.ts` to allow multiple origins:
- `http://localhost:3000`
- `http://localhost:3001`
- `http://localhost:3002`
- `http://localhost:3003`
- Any localhost origin in development mode

## Next Steps

### 1. Restart Backend Server
The backend server needs to be restarted for CORS changes to take effect:

```bash
# Stop the current backend server (Ctrl+C)
# Then restart:
cd backend
npm run dev
```

### 2. Verify CORS is Working
After restarting, try logging in again. The CORS error should be resolved.

## Configuration Details

The CORS configuration now:
- ✅ Allows multiple localhost ports (3000-3003)
- ✅ Allows requests with no origin (mobile apps, curl)
- ✅ In development, allows any localhost origin
- ✅ Supports credentials (cookies, auth headers)
- ✅ Allows all necessary HTTP methods
- ✅ Includes custom headers (x-school-id)

## Alternative: Set Environment Variable

You can also set the frontend URL in backend `.env`:

```env
FRONTEND_URL=http://localhost:3001
```

But the current fix should work for any port automatically in development.

## Production Note

In production, make sure to set `FRONTEND_URL` in your environment variables to your actual frontend domain.
