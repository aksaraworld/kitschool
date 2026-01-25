import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
// Initialize Firebase Admin (must be before routes)
import './config/firebase';
import firebaseAuthRoutes from './routes/firebaseAuth';
import usersFirestoreRoutes from './routes/usersFirestore';
import classRoutes from './routes/classes';
import attendanceRoutes from './routes/attendance';
import paymentRoutes from './routes/payments';
import scheduleRoutes from './routes/schedules';
import communicationRoutes from './routes/communication';
import invoiceRoutes from './routes/invoicesFirestore';
import schoolRoutes from './routes/school';
import schoolsRoutes from './routes/schools';
import configRoutes from './routes/configFirestore';
import transactionFeeRoutes from './routes/transactionFeesFirestore';
import reportsRoutes from './routes/reportsFirestore';

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT || 8080);

process.on('unhandledRejection', (err) => {
  console.error('❌ Unhandled promise rejection:', err);
});
process.on('uncaughtException', (err) => {
  console.error('❌ Uncaught exception:', err);
});

// Middleware - CORS configuration
const allowedOrigins = [
  process.env.FRONTEND_URL || 'http://localhost:3000',
  'http://localhost:3000',
  'http://localhost:3001',
  'http://localhost:3002',
  'http://localhost:3003',
];

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      // In development, allow any localhost origin
      if (process.env.NODE_ENV !== 'production' && origin.includes('localhost')) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-school-id'],
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Firebase-only backend: MongoDB is disabled.
// (Mongo migration scripts can still live in /src/scripts, but runtime API should not require Mongo.)

// Routes
// Use Firebase Auth routes
app.use('/api/auth', firebaseAuthRoutes);

// Use Firestore routes by default
app.use('/api/users', usersFirestoreRoutes);
app.use('/api/classes', classRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/schedules', scheduleRoutes);
app.use('/api/communications', communicationRoutes);
app.use('/api/invoices', invoiceRoutes);
app.use('/api/school', schoolRoutes);
app.use('/api/schools', schoolsRoutes);
app.use('/api/config', configRoutes);
app.use('/api/transaction-fees', transactionFeeRoutes);
app.use('/api/reports', reportsRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Cognifa API is running' });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Cognifa backend listening on 0.0.0.0:${PORT}`);
});

