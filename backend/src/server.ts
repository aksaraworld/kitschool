import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import authRoutes from './routes/auth';
import userRoutes from './routes/users';
import classRoutes from './routes/classes';
import attendanceRoutes from './routes/attendance';
import paymentRoutes from './routes/payments';
import scheduleRoutes from './routes/schedules';
import communicationRoutes from './routes/communication';
import invoiceRoutes from './routes/invoices';
import schoolRoutes from './routes/school';
import schoolsRoutes from './routes/schools';
import configRoutes from './routes/config';
import transactionFeeRoutes from './routes/transaction-fees';
import reportsRoutes from './routes/reports';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

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

// Database connection
const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/sekolahkita';

mongoose.connect(mongoUri)
  .then(() => {
    console.log('✅ MongoDB connected successfully');
    console.log(`📊 Database: ${mongoUri.split('/').pop()?.split('?')[0]}`);
  })
  .catch((err) => {
    console.error('❌ MongoDB connection error:', err.message);
    console.error('\n💡 Troubleshooting:');
    console.error('1. Pastikan MongoDB berjalan (local) atau connection string benar (Atlas)');
    console.error('2. Check MONGODB_URI di backend/.env');
    console.error('3. Untuk Atlas: pastikan IP whitelist sudah di-set');
    console.error('4. Lihat MONGODB_SETUP.md untuk panduan lengkap\n');
    process.exit(1);
  });

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
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

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

