# Multi-Tenancy Architecture

## Overview

Cognifa is a multi-tenant SaaS application where:
- **SaaS Admin** manages the platform and all schools
- **Schools** are the clients (tenants)
- Each school has its own users, classes, students, payments, etc.
- Data is isolated by `schoolId` at the database level

## Architecture

### Hierarchy

```
SaaS Platform (SekolahKita)
  └── School 1 (SMA Negeri 1 Jakarta)
      ├── Principal/Admin
      ├── Staff
      ├── Finance
      ├── Teachers
      ├── Parents
      └── Students
  └── School 2 (SMA Negeri 2 Bandung)
      ├── Principal/Admin
      ├── Staff
      └── ...
```

### Roles

1. **SAAS_ADMIN** - Platform administrator
   - Can create/manage schools
   - Can view all schools and their data
   - Can update subscription plans
   - No schoolId required

2. **PRINCIPAL** - School administrator
   - Manages their school
   - Can create users, classes, schedules
   - Can view all school data
   - Has schoolId

3. **STAFF** - School staff
   - Can manage school data
   - Can create users, classes
   - Has schoolId

4. **FINANCE** - Finance staff
   - Manages payments and invoices
   - Has schoolId

5. **TEACHER/HOMEROOM_TEACHER** - Teachers
   - Can view their classes
   - Can create schedules
   - Has schoolId

6. **PARENT** - Parents
   - Can view their children's data
   - Can make payments
   - Has schoolId

7. **STUDENT** - Students
   - Can view their own data
   - Can submit attendance
   - Has schoolId

## Database Schema

### Multi-Tenancy Fields

All models (except User for SAAS_ADMIN) include:
- `schoolId: ObjectId` - Reference to School
- Indexed for performance: `{ schoolId: 1 }`

### Models with schoolId

- User (optional - required except for SAAS_ADMIN)
- School (no schoolId - top level)
- Year
- Major
- Class
- Attendance
- Invoice
- PaymentAttempt
- Payment
- Schedule
- Communication
- StudentActivity

## Middleware

### `setSchoolContext`

- Sets `req.schoolId` from user's school
- SAAS_ADMIN: Can optionally specify schoolId in query/params
- Other users: Automatically uses their schoolId
- Validates school is active and subscription is valid

### `requireSchoolContext`

- Ensures schoolId is set (except for SAAS_ADMIN)
- Returns 403 if school context is missing

### `getSchoolQuery`

- Returns query object for school-scoped queries
- SAAS_ADMIN: Returns `{}` (all) or `{ schoolId: ... }` if specified
- Other users: Returns `{ schoolId: req.schoolId }`

## API Routes

### School Management (SaaS Admin)

- `GET /api/schools` - List all schools
- `GET /api/schools/:id` - Get school details
- `POST /api/schools` - Create new school
- `PUT /api/schools/:id` - Update school
- `PUT /api/schools/:id/subscription` - Update subscription

### School Profile (School Users)

- `GET /api/school` - Get current school profile
- `PUT /api/school` - Update school profile (cannot update subscription)

### All Other Routes

All routes automatically filter by schoolId:
- `/api/users` - School-scoped users
- `/api/classes` - School-scoped classes
- `/api/attendance` - School-scoped attendance
- `/api/invoices` - School-scoped invoices
- `/api/payments` - School-scoped payments
- `/api/schedules` - School-scoped schedules
- `/api/communications` - School-scoped communications

## Subscription Management

### Subscription Status

- `trial` - Trial period
- `active` - Active subscription
- `suspended` - Suspended (cannot access)
- `cancelled` - Cancelled
- `expired` - Expired

### Subscription Plans

- `free` - Free tier
- `basic` - Basic tier
- `premium` - Premium tier
- `enterprise` - Enterprise tier

### Subscription Fields

- `subscriptionStatus` - Current status
- `subscriptionPlan` - Plan type
- `subscriptionStartDate` - Start date
- `subscriptionEndDate` - End date
- `trialEndDate` - Trial end date
- `monthlyFee` - Monthly fee
- `maxUsers` - Maximum users
- `maxStudents` - Maximum students
- `settlementAccount` - Bank account for settlement

## Security

### Data Isolation

- All queries automatically filter by schoolId
- Users cannot access data from other schools
- SAAS_ADMIN can access all schools (for management)

### Access Control

- School context is validated on every request
- Subscription status is checked before allowing access
- Inactive schools are blocked

## Seeding

Run `npm run seed` to create:
1. SaaS Admin user (`saas@sekolahkita.com` / `saasadmin123`)
2. Sample school (SMA Negeri 1 Jakarta)
3. Principal user (`principal@school.com` / `principal123`)
4. Sample year and majors

## Future Enhancements

- School switching for SAAS_ADMIN
- Subscription renewal automation
- Usage tracking per school
- Billing automation
- Multi-currency support
- School-specific configurations

