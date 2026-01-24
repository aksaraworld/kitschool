import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const dropDatabase = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/sekolahkita');
    console.log('Connected to MongoDB');

    const dbName = mongoose.connection.db.databaseName;
    console.log(`Dropping database: ${dbName}`);

    await mongoose.connection.db.dropDatabase();
    console.log('✅ Database dropped successfully');

    await mongoose.connection.close();
    console.log('Connection closed');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error dropping database:', error);
    process.exit(1);
  }
};

dropDatabase();


