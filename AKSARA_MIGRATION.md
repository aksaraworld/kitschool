# Aksara Framework Migration Guide

## Overview

This document describes the migration of Cognifa School Management System to use the Aksara Framework.

## What Changed

### 1. Framework Integration
- Added Aksara Framework packages to the project
- Set up monorepo workspace structure
- Integrated `@aksara/api`, `@aksara/core`, `@aksara/context`, `@aksara/hooks`, `@aksara/ui`, and `@aksara/formatters`

### 2. API Client Migration
- **Old**: Custom axios-based API client (`lib/api.ts`)
- **New**: Aksara API client with caching (`lib/aksara-api.ts`)
- **Changes**:
  - Direct data return (no `.data` property)
  - Built-in caching support
  - Better error handling
  - JWT authentication integration
  - School context header support

### 3. Updated Files

All frontend API calls have been migrated:
- `app/dashboard/page.tsx`
- `app/users/page.tsx`
- `app/attendance/page.tsx`
- `app/classes/page.tsx`
- `app/messages/page.tsx`
- `app/schedules/page.tsx`
- `app/payments/page.tsx`
- `app/calendar/page.tsx`
- `app/invoices/page.tsx`
- `app/years/page.tsx`
- `app/majors/page.tsx`
- `app/reports/page.tsx`
- `app/school-profile/page.tsx`
- `app/children/page.tsx`
- `app/saas/dashboard/page.tsx`
- `app/saas/schools/page.tsx`
- `app/saas/subscription/page.tsx`
- `components/Payment/PaymentModal.tsx`
- `context/SchoolContext.tsx`
- `lib/auth.ts`

### 4. API Call Pattern Changes

**Before:**
```typescript
const response = await api.get('/users');
setUsers(response.data);
```

**After:**
```typescript
const usersData = await api.get<User[]>('/users');
setUsers(usersData);
```

**Error Handling:**
```typescript
// Before
catch (error: any) {
  alert(error.response?.data?.message || 'Error');
}

// After
catch (error: any) {
  alert(error.message || 'Error');
}
```

## Setup Instructions

### 1. Install Dependencies

```bash
npm install
cd frontend
npm install
```

### 2. Build Aksara Packages

The Aksara packages need to be built before use:

```bash
cd packages/api && npm install && npm run build
cd ../core && npm install && npm run build
cd ../context && npm install && npm run build
cd ../hooks && npm install && npm run build
cd ../ui && npm install && npm run build
cd ../formatters && npm install && npm run build
```

Or build all at once (if you have a build script):
```bash
npm run build --workspaces
```

### 3. Development

```bash
npm run dev
```

## Framework Features Now Available

### 1. API Client (`@aksara/api`)
- Automatic caching
- Request/response interceptors
- Error handling
- TypeScript support

### 2. Core Utilities (`@aksara/core`)
- Utility functions
- Type definitions
- Common helpers

### 3. Context (`@aksara/context`)
- Context creation utilities
- Type-safe context providers

### 4. Hooks (`@aksara/hooks`)
- `useAsync` - Async state management
- `useDebounce` - Debounce values
- `useLocalStorage` - Local storage sync
- `useMounted` - Component mount detection
- `usePrevious` - Previous value tracking
- `useToggle` - Boolean toggle state

### 5. UI Components (`@aksara/ui`)
- Reusable UI components
- Consistent styling

### 6. Formatters (`@aksara/formatters`)
- Currency formatting
- Date formatting
- Number formatting

## Next Steps

1. **Build all packages**: Ensure all Aksara packages are built
2. **Test the application**: Run the dev server and test all features
3. **Migrate context providers**: Consider using `@aksara/context` for SchoolContext
4. **Use framework hooks**: Replace custom hooks with `@aksara/hooks` where applicable
5. **Integrate UI components**: Gradually replace custom components with `@aksara/ui` components
6. **Add caching**: Leverage API client caching for better performance

## Backend Compatibility

The backend (Express.js) remains unchanged. The migration only affects the frontend API client layer. All existing API endpoints continue to work as before.

## Troubleshooting

### Module Not Found Errors
- Ensure all Aksara packages are built (`npm run build` in each package)
- Check that packages are properly linked in the workspace

### Type Errors
- Ensure TypeScript can resolve the workspace packages
- Check `tsconfig.json` paths configuration

### API Errors
- Verify the API client is properly configured in `lib/aksara-api.ts`
- Check that JWT tokens are being sent correctly
- Ensure school context headers are included

## Notes

- The old `lib/api.ts` file can be removed after confirming everything works
- All API calls now return data directly (no `.data` property)
- Error handling is simplified (errors throw directly)
- Caching is available but not yet implemented everywhere
