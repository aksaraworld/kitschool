/**
 * Migration Script: MongoDB to Firebase
 * Migrates users from MongoDB to Firebase Auth + Firestore
 * 
 * Usage: npm run migrate:firebase
 */

import mongoose from 'mongoose';
import User from '../models/User';
import { firebaseAuth, firestore, setUserRole } from '../config/firebase';
import { USERS_COLLECTION } from '../models/firestore/User';
import dotenv from 'dotenv';

dotenv.config();

async function migrateUsers() {
  try {
    // Connect to MongoDB
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/sekolahkita';
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB');

    // Get all users from MongoDB
    const users = await User.find({}).lean();
    console.log(`📊 Found ${users.length} users to migrate`);

    let successCount = 0;
    let errorCount = 0;
    const errors: Array<{ email: string; error: string }> = [];

    for (const user of users) {
      try {
        console.log(`\n🔄 Migrating user: ${user.email}`);

        // Check if user already exists in Firebase Auth
        let firebaseUser;
        try {
          firebaseUser = await firebaseAuth.getUserByEmail(user.email);
          console.log(`  ⚠️  User already exists in Firebase Auth, skipping creation`);
        } catch (error: any) {
          if (error.code === 'auth/user-not-found') {
            // User doesn't exist, create it
            // Note: We can't migrate passwords, so we'll create with a temporary password
            // Users will need to reset their password
            const tempPassword = `Temp${Date.now()}${Math.random().toString(36).substring(7)}`;
            
            firebaseUser = await firebaseAuth.createUser({
              email: user.email,
              password: tempPassword, // Temporary password
              displayName: user.name,
              disabled: !user.isActive,
              emailVerified: false
            });
            console.log(`  ✅ Created user in Firebase Auth`);
          } else {
            throw error;
          }
        }

        // Set custom claims (role and schoolId)
        await setUserRole(
          firebaseUser.uid,
          user.role,
          user.schoolId?.toString()
        );
        console.log(`  ✅ Set custom claims (role: ${user.role})`);

        // Create/update user document in Firestore
        const userData = {
          email: user.email,
          name: user.name,
          role: user.role,
          schoolId: user.schoolId?.toString(),
          phone: user.phone,
          avatar: user.avatar,
          isActive: user.isActive,
          studentId: user.studentId,
          teacherId: user.teacherId,
          employeeId: user.employeeId,
          classId: user.classId?.toString(),
          year: user.year,
          major: user.major,
          department: user.department,
          children: user.children?.map((id: any) => id.toString()),
          assignedClasses: user.assignedClasses?.map((id: any) => id.toString()),
          isHomeroom: user.isHomeroom,
          homeroomClassId: user.homeroomClassId?.toString(),
          createdAt: user.createdAt || new Date(),
          updatedAt: user.updatedAt || new Date()
        };

        await firestore.collection(USERS_COLLECTION).doc(firebaseUser.uid).set(userData);
        console.log(`  ✅ Created user document in Firestore`);

        successCount++;
      } catch (error: any) {
        console.error(`  ❌ Error migrating user ${user.email}:`, error.message);
        errorCount++;
        errors.push({ email: user.email, error: error.message });
      }
    }

    console.log('\n📊 Migration Summary:');
    console.log(`  ✅ Success: ${successCount}`);
    console.log(`  ❌ Errors: ${errorCount}`);
    
    if (errors.length > 0) {
      console.log('\n❌ Errors:');
      errors.forEach(({ email, error }) => {
        console.log(`  - ${email}: ${error}`);
      });
    }

    console.log('\n⚠️  Important Notes:');
    console.log('  1. Users have been created with temporary passwords');
    console.log('  2. Users need to reset their passwords via "Forgot Password"');
    console.log('  3. Original passwords cannot be migrated (security)');
    console.log('  4. Consider sending password reset emails to all users');

    await mongoose.disconnect();
    console.log('\n✅ Migration complete!');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

// Run migration
migrateUsers();
