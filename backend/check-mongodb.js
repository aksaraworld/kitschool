// Quick script to test MongoDB connection
require('dotenv').config();
const mongoose = require('mongoose');

const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/sekolahkita';

console.log('🔍 Testing MongoDB connection...');
console.log(`📍 URI: ${mongoUri.replace(/\/\/.*@/, '//***:***@')}`); // Hide password

mongoose.connect(mongoUri, {
  serverSelectionTimeoutMS: 5000,
})
  .then(() => {
    console.log('✅ MongoDB connection successful!');
    console.log('✅ Database ready to use');
    process.exit(0);
  })
  .catch((err) => {
    console.error('❌ MongoDB connection failed!');
    console.error('\nError details:');
    console.error(err.message);
    console.error('\n💡 Solutions:');
    console.error('1. Local MongoDB: Pastikan MongoDB service berjalan');
    console.error('   - Windows: net start MongoDB');
    console.error('   - Check: mongosh (test connection)');
    console.error('\n2. MongoDB Atlas:');
    console.error('   - Check connection string di .env');
    console.error('   - Pastikan IP whitelist sudah di-set (0.0.0.0/0 untuk dev)');
    console.error('   - Pastikan username & password benar');
    console.error('\n3. Lihat MONGODB_SETUP.md untuk panduan lengkap');
    process.exit(1);
  });


