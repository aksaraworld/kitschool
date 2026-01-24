# Cognifa - Project Summary

**Lacak. Terhubung. Percaya. Semua dalam Satu Tempat**

## Overview
Cognifa is a comprehensive School Management System (SMS) built as a SaaS platform. It enables schools to manage students, teachers, parents, classes, attendance, payments, schedules, and communications all in one place.

## Tech Stack

### Frontend
- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Icons**: Lucide React
- **HTTP Client**: Axios
- **State Management**: React Hooks + Context (can be extended)

### Backend
- **Framework**: Express.js
- **Language**: TypeScript
- **Database**: MongoDB with Mongoose ODM
- **Authentication**: JWT (JSON Web Tokens)
- **Password Hashing**: bcryptjs
- **Validation**: Zod (ready to implement)

### Infrastructure
- **Database**: MongoDB (local or cloud)
- **Development**: Concurrently (runs both servers)
- **Package Manager**: npm

## Key Features

### 1. Multi-Role Authentication
- **Students**: View calendar, submit attendance, view reports
- **Parents**: Monitor children, communicate with teachers, make payments, view calendar/reports
- **Teachers**: Manage attendance, communicate with parents, create schedules
- **Homeroom Teachers**: All teacher features + class management
- **Staff**: User management, class/year/major management, schedule creation
- **Principal**: All staff features + system-wide management
- **Finance**: View and manage payments

### 2. Student Management
- Student registration (by staff/principal only)
- Class assignment
- Year and major assignment
- Student ID generation
- Activity tracking

### 3. Attendance System
- Student attendance tracking
- Teacher attendance tracking
- Status: Present, Absent, Late, Excused
- Check-in/check-out times
- Daily attendance records
- Attendance reports

### 4. Payment Management
- Monthly fee tracking
- Payment status (Pending, Paid, Overdue, Cancelled)
- Parent payment interface
- Finance dashboard
- Payment history
- Receipt generation (ready for implementation)

### 5. Communication System
- Parent-Teacher messaging
- Inbox/Sent folders
- Read/unread status
- Message threads (reply support)
- Attachment support (ready for implementation)

### 6. Schedule & Calendar
- Class schedules
- School events
- Exams
- Holidays
- Recurring events
- Calendar view (month/week/day)
- Event notifications (ready for implementation)

### 7. Class Management
- Year management
- Major/Program management
- Class creation
- Student assignment to classes
- Homeroom teacher assignment
- Class capacity management

### 8. User Management
- User creation (staff/principal only)
- Role assignment
- User activation/deactivation
- Profile management
- No self-registration (accounts created by staff)

### 9. Reports & Analytics
- Attendance reports
- Payment reports
- Student activity reports
- Academic progress (ready for implementation)

### 10. Parent Monitoring
- View children's attendance
- View children's calendar
- View children's reports
- Payment tracking
- Communication with teachers

### 11. SaaS Multi-Tenancy
- SaaS Admin role untuk mengelola seluruh sekolah klien
- Dashboard SaaS dengan statistik subscription dan admin fee
- School Switcher untuk menentukan konteks sekolah saat mengeksekusi aksi
- Pengaturan subscription global dan override per sekolah
- Manajemen sekolah (aktif/nonaktif, status subscription, fee per murid)

## Database Structure

### Core Collections
1. **Users** - All user accounts with role-based fields
2. **Years** - Academic years
3. **Majors** - School majors/programs
4. **Classes** - Class groups (Year > Major > Class > Students)
5. **Attendance** - Attendance records
6. **Payments** - Payment records
7. **Schedules** - Calendar events and schedules
8. **Communications** - Messages between users
9. **StudentActivities** - Activity logs for parent monitoring

See `DATABASE_SCHEMA.md` for detailed schema documentation.

## Project Structure

```
sekolahkita/
├── backend/
│   ├── src/
│   │   ├── models/          # MongoDB models
│   │   │   ├── User.ts
│   │   │   ├── Year.ts
│   │   │   ├── Major.ts
│   │   │   ├── Class.ts
│   │   │   ├── Attendance.ts
│   │   │   ├── Payment.ts
│   │   │   ├── Schedule.ts
│   │   │   ├── Communication.ts
│   │   │   └── StudentActivity.ts
│   │   ├── routes/          # API routes
│   │   │   ├── auth.ts
│   │   │   ├── users.ts
│   │   │   ├── classes.ts
│   │   │   ├── attendance.ts
│   │   │   ├── payments.ts
│   │   │   ├── schedules.ts
│   │   │   └── communication.ts
│   │   ├── middleware/      # Auth middleware
│   │   │   └── auth.ts
│   │   ├── scripts/         # Utility scripts
│   │   │   └── seed.ts
│   │   └── server.ts        # Express server
│   ├── package.json
│   └── tsconfig.json
├── frontend/
│   ├── app/                 # Next.js app router pages
│   │   ├── login/
│   │   ├── dashboard/
│   │   ├── attendance/
│   │   ├── payments/
│   │   ├── messages/
│   │   ├── calendar/
│   │   ├── users/
│   │   ├── classes/
│   │   ├── schedules/
│   │   ├── children/
│   │   ├── reports/
│   │   └── ...
│   ├── components/          # React components
│   │   ├── Layout/
│   │   │   └── DashboardLayout.tsx
│   │   └── Auth/
│   │       └── ProtectedRoute.tsx
│   ├── lib/                 # Utilities
│   │   ├── api.ts
│   │   ├── auth.ts
│   │   └── types.ts
│   ├── package.json
│   └── tsconfig.json
├── .gitignore
├── package.json
├── README.md
├── SETUP.md
├── DATABASE_SCHEMA.md
└── PROJECT_SUMMARY.md
```

## API Endpoints

### Authentication
- `POST /api/auth/login` - User login
- `GET /api/auth/me` - Get current user

### Users
- `GET /api/users` - Get all users (Staff/Principal)
- `POST /api/users` - Create user (Staff/Principal)
- `GET /api/users/:id` - Get user by ID
- `PUT /api/users/:id` - Update user (Staff/Principal)
- `DELETE /api/users/:id` - Deactivate user (Principal)

### Classes
- `GET /api/classes` - Get all classes
- `POST /api/classes` - Create class (Staff/Principal)
- `GET /api/classes/years` - Get all years
- `POST /api/classes/years` - Create year (Staff/Principal)
- `GET /api/classes/majors` - Get all majors
- `POST /api/classes/majors` - Create major (Staff/Principal)

### Attendance
- `GET /api/attendance` - Get attendance records
- `POST /api/attendance` - Create attendance record
- `PUT /api/attendance/:id` - Update attendance record

### Payments
- `GET /api/payments` - Get payments
- `POST /api/payments` - Create payment (Finance/Staff/Principal)
- `PUT /api/payments/:id` - Update payment status

### Schedules
- `GET /api/schedules` - Get schedules
- `POST /api/schedules` - Create schedule (Teacher/Staff/Principal)
- `PUT /api/schedules/:id` - Update schedule
- `DELETE /api/schedules/:id` - Delete schedule

### Communications
- `GET /api/communications` - Get messages (inbox/sent)
- `POST /api/communications` - Send message
- `PUT /api/communications/:id/read` - Mark as read

## Security Features

1. **JWT Authentication**: Secure token-based authentication
2. **Role-Based Access Control**: Different permissions for each role
3. **Password Hashing**: bcrypt for secure password storage
4. **Protected Routes**: Frontend and backend route protection
5. **Input Validation**: Ready for Zod validation implementation
6. **CORS Configuration**: Configurable CORS for API security

## UI/UX Features

1. **Responsive Design**: Mobile-first approach, works on all devices
2. **Modern UI**: Clean, modern interface with Tailwind CSS
3. **Role-Based Navigation**: Different menus for different roles
4. **Dashboard**: Role-specific dashboards with relevant information
5. **Real-time Updates**: Ready for WebSocket implementation
6. **Loading States**: Proper loading indicators
7. **Error Handling**: User-friendly error messages

## Future Enhancements

### Mobile App
- React Native app (webview wrapper as planned)
- Push notifications
- Offline support

### Additional Features
- Grade management
- Assignment management
- Exam management
- Library management
- Transportation management
- Hostel management
- Fee structure management
- Certificate generation
- Bulk operations
- Data export (PDF, Excel)
- Advanced analytics and reporting
- Email notifications
- SMS notifications
- File uploads (avatars, documents, receipts)
- Document management
- Online exam system
- Video conferencing integration

### Technical Improvements
- Real-time updates (WebSocket)
- Caching strategy (Redis)
- File storage (AWS S3, Cloudinary)
- Email service (SendGrid, AWS SES)
- SMS service integration
- Advanced search and filtering
- Pagination for large datasets
- Data backup and recovery
- Monitoring and logging
- Performance optimization
- Unit and integration tests
- API documentation (Swagger)
- CI/CD pipeline

## Getting Started

1. **Install Dependencies**
   ```bash
   npm run install:all
   ```

2. **Setup Environment Variables**
   - Copy `backend/.env.example` to `backend/.env`
   - Copy `frontend/.env.local.example` to `frontend/.env.local`
   - Update MongoDB URI and JWT secret

3. **Start MongoDB**
   - Local MongoDB or MongoDB Atlas

4. **Seed Database** (Optional)
   ```bash
   npm run seed
   ```
   Creates admin user: admin@school.com / admin123

5. **Run Development Servers**
   ```bash
   npm run dev
   ```

6. **Access Application**
   - Frontend: http://localhost:3000
   - Backend: http://localhost:5000

See `SETUP.md` for detailed setup instructions.

## Cloud Deployment Ready

The application is designed to be cloud-ready:
- Environment-based configuration
- MongoDB Atlas support
- Scalable architecture
- RESTful API design
- Stateless authentication
- Ready for containerization (Docker)
- Ready for cloud platforms (AWS, Azure, GCP, Vercel, Railway, Heroku)

## Notes

- **No Registration**: Accounts are created by staff/principal only
- **Role-Based Access**: Each      eatures and roles

## Support

For issues, questions, or contributions, please refer to the project documentation or contact the development team.

## License

ISC License
