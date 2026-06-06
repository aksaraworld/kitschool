# Aksara School Management Setup Guide

## Prerequisites
- Node.js 18+ and npm
- MongoDB (local or cloud instance)
- Git

## Installation

### 1. Clone the repository
```bash
git clone <repository-url>
cd sekolahkita
```

### 2. Install dependencies
```bash
npm run install:all
```

This will install dependencies for:
- Root package (concurrently for running both servers)
- Frontend (Next.js)
- Backend (Express)

### 3. Environment Setup

#### Backend
1. Copy `backend/.env.example` to `backend/.env`
2. Update the following variables:
```env
PORT=5000
NODE_ENV=development
MONGODB_URI=mongodb://localhost:27017/sekolahkita
JWT_SECRET=your-secret-key-change-in-production
JWT_EXPIRES_IN=7d
FRONTEND_URL=http://localhost:3000
```

#### Frontend
1. Copy `frontend/.env.local.example` to `frontend/.env.local`
2. Update the following variables:
```env
NEXT_PUBLIC_API_URL=http://localhost:5000/api
```

### 4. Start MongoDB
Make sure MongoDB is running on your system:
```bash
# If using local MongoDB
mongod

# Or use MongoDB Atlas cloud instance and update MONGODB_URI in backend/.env
```

### 5. Run the application

#### Development (both servers)
```bash
npm run dev
```

This will start:
- Backend server on http://localhost:5000
- Frontend server on http://localhost:3000

#### Run separately

**Backend only:**
```bash
cd backend
npm run dev
```

**Frontend only:**
```bash
cd frontend
npm run dev
```

### 6. Access the application
- Frontend: http://localhost:3000
- Backend API: http://localhost:5000/api
- Health check: http://localhost:5000/api/health

## Initial Setup

### Create First Admin User
Since there's no registration, you need to create the first admin user (Principal or Staff) through MongoDB directly or create a seed script.

**Option 1: MongoDB Shell**
```javascript
use sekolahkita
db.users.insertOne({
  email: "admin@school.com",
  password: "$2a$10$...", // bcrypt hash of your password
  name: "Admin User",
  role: "principal",
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date()
})
```

**Option 2: Create Seed Script**
Create `backend/src/scripts/seed.ts` to create initial admin user.

## Project Structure

```
sekolahkita/
├── backend/
│   ├── src/
│   │   ├── models/          # MongoDB models
│   │   ├── routes/          # API routes
│   │   ├── middleware/      # Auth middleware
│   │   └── server.ts        # Express server
│   ├── package.json
│   └── tsconfig.json
├── frontend/
│   ├── app/                 # Next.js app router pages
│   ├── components/          # React components
│   ├── lib/                 # Utilities, API client, types
│   ├── package.json
│   └── tsconfig.json
└── package.json             # Root package.json
```

## User Roles

1. **Student**: View calendar, submit attendance, view reports
2. **Parent**: Monitor children, communicate with teachers, make payments, view calendar/reports
3. **Teacher**: Manage attendance, communicate with parents, view schedules
4. **Homeroom Teacher**: All teacher features + create schedules/calendars
5. **Staff**: User management, class/year/major management, schedule creation
6. **Principal**: All staff features + system-wide management
7. **Finance**: View and manage payments

## API Endpoints

### Authentication
- `POST /api/auth/login` - Login
- `GET /api/auth/me` - Get current user

### Users
- `GET /api/users` - Get all users (Staff/Principal only)
- `POST /api/users` - Create user (Staff/Principal only)
- `GET /api/users/:id` - Get user by ID
- `PUT /api/users/:id` - Update user (Staff/Principal only)
- `DELETE /api/users/:id` - Deactivate user (Principal only)

### Classes
- `GET /api/classes` - Get all classes
- `POST /api/classes` - Create class (Staff/Principal only)
- `GET /api/classes/years` - Get all years
- `POST /api/classes/years` - Create year (Staff/Principal only)
- `GET /api/classes/majors` - Get all majors
- `POST /api/classes/majors` - Create major (Staff/Principal only)

### Attendance
- `GET /api/attendance` - Get attendance records
- `POST /api/attendance` - Create attendance record
- `PUT /api/attendance/:id` - Update attendance record

### Payments
- `GET /api/payments` - Get payments
- `POST /api/payments` - Create payment (Finance/Staff/Principal only)
- `PUT /api/payments/:id` - Update payment status

### Schedules
- `GET /api/schedules` - Get schedules
- `POST /api/schedules` - Create schedule (Homeroom/Staff/Principal only)
- `PUT /api/schedules/:id` - Update schedule
- `DELETE /api/schedules/:id` - Delete schedule

### Communications
- `GET /api/communications` - Get messages (inbox/sent)
- `POST /api/communications` - Send message
- `PUT /api/communications/:id/read` - Mark as read

## Development Notes

### Database
- Uses MongoDB with Mongoose ODM
- All models are in `backend/src/models/`
- See `DATABASE_SCHEMA.md` for detailed schema

### Authentication
- JWT-based authentication
- Tokens stored in localStorage (frontend)
- Protected routes using middleware

### Frontend
- Next.js 14 with App Router
- TypeScript for type safety
- Tailwind CSS for styling
- Responsive design (mobile-first)

### Backend
- Express.js with TypeScript
- RESTful API design
- Role-based access control
- Input validation (can be enhanced with Zod)

## Cloud Deployment

### Backend
- Deploy to platforms like Heroku, Railway, or AWS
- Set environment variables in platform settings
- Use MongoDB Atlas for cloud database

### Frontend
- Deploy to Vercel, Netlify, or similar
- Set `NEXT_PUBLIC_API_URL` to production API URL
- Enable server-side rendering if needed

### Database
- Use MongoDB Atlas for cloud MongoDB
- Update `MONGODB_URI` in backend `.env`
- Configure IP whitelist and database user

## Future Enhancements
- Mobile app (React Native webview wrapper)
- Real-time notifications
- File uploads (avatars, receipts, attachments)
- Email notifications
- Advanced reporting and analytics
- Grade management
- Assignment management
- Exam management

## Troubleshooting

### MongoDB Connection Issues
- Check if MongoDB is running
- Verify `MONGODB_URI` in backend `.env`
- Check MongoDB connection string format

### Port Already in Use
- Change PORT in backend `.env`
- Change port in `frontend/package.json` scripts

### Authentication Issues
- Check JWT_SECRET in backend `.env`
- Verify token storage in localStorage
- Check API URL in frontend `.env.local`

### CORS Issues
- Verify FRONTEND_URL in backend `.env`
- Check CORS configuration in `backend/src/server.ts`

