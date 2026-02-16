# Fix localStorage Error - Server-Side Rendering

## Problem
`localStorage is not defined` error terjadi karena Next.js melakukan Server-Side Rendering (SSR), dan `localStorage` hanya tersedia di browser (client-side).

## Solution

### 1. Updated Auth Service (`frontend/lib/auth.ts`)
- Added check: `typeof window !== 'undefined'` sebelum akses localStorage
- Semua fungsi sekarang aman untuk SSR
- Return `null` atau `false` jika di server-side

### 2. Created useAuth Hook (`frontend/hooks/useAuth.ts`)
- Custom hook untuk get user data
- Menggunakan `useState` dan `useEffect` untuk client-side only
- Mengembalikan `{ user, isLoading, isAuthenticated }`

### 3. Updated All Pages
- Mengganti `authService.getCurrentUser()` langsung dengan `useAuth()` hook
- Semua pages sekarang menggunakan hook yang aman untuk SSR

### 4. Updated API Interceptor (`frontend/lib/api.ts`)
- Added check untuk client-side sebelum akses localStorage
- Token hanya diambil jika di client-side

## Files Changed

1. `frontend/lib/auth.ts` - Added client-side checks
2. `frontend/lib/api.ts` - Added client-side checks in interceptor
3. `frontend/hooks/useAuth.ts` - New hook for auth
4. `frontend/components/Layout/DashboardLayout.tsx` - Use useEffect
5. All page components - Use `useAuth()` hook instead of direct call

## How It Works

1. **Server-Side Rendering:**
   - `localStorage` tidak diakses (check `typeof window !== 'undefined'`)
   - Return `null` atau default values
   - Component render dengan loading state

2. **Client-Side Hydration:**
   - `useEffect` runs setelah component mount
   - `localStorage` diakses dengan aman
   - User data di-set ke state
   - Component re-render dengan user data

## Usage

### Before (Error):
```tsx
const user = authService.getCurrentUser(); // ❌ Error on SSR
```

### After (Fixed):
```tsx
const { user, isLoading } = useAuth(); // ✅ Safe for SSR
```

## Benefits

1. ✅ No SSR errors
2. ✅ Proper loading states
3. ✅ Client-side only localStorage access
4. ✅ Reusable hook
5. ✅ Type-safe

## Testing

1. Refresh page - no errors
2. Navigate between pages - works correctly
3. Login/logout - works correctly
4. Protected routes - works correctly

## Notes

- `ProtectedRoute` component sudah handle authentication dengan benar
- All pages inside `ProtectedRoute` sudah aman
- `useAuth` hook optional - bisa digunakan jika perlu user data di component


