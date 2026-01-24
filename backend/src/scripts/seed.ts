import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import User, { UserRole } from '../models/User';
import School, { SubscriptionStatus } from '../models/School';
import Year from '../models/Year';
import Major from '../models/Major';
import Class from '../models/Class';
import Invoice, { InvoiceStatus } from '../models/Invoice';
import PaymentAttempt, { PaymentAttemptStatus, PaymentMethod } from '../models/PaymentAttempt';
import Attendance, { AttendanceStatus } from '../models/Attendance';
import StudentActivity from '../models/StudentActivity';
import Schedule from '../models/Schedule';
import { initializeDefaultConfig } from '../utils/config';

dotenv.config();

// Helper function to create or update user with duplicate key handling
const createOrUpdateUser = async (userData: any, findQuery: any) => {
  let user = await User.findOne(findQuery);
  if (!user) {
    try {
      user = await User.create(userData);
      return { user, created: true };
    } catch (error: any) {
      if (error.code === 11000) {
        // Try to find existing user by email or other unique field
        user = await User.findOne({ email: userData.email });
        if (user) {
          Object.assign(user, userData);
          await user.save();
          return { user, created: false, updated: true };
        }
        return { user: null, created: false, error: 'Duplicate key and user not found' };
      }
      throw error;
    }
  } else {
    Object.assign(user, userData);
    await user.save();
    return { user, created: false, updated: true };
  }
};

const seedDatabase = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/sekolahkita');
    console.log('Connected to MongoDB');

    // Initialize default configuration
    await initializeDefaultConfig();
    console.log('✅ Default configuration initialized');

    // ==================== 1. SAAS ADMIN ====================
    const saasAdminPassword = await bcrypt.hash('saasadmin123', 10);
    const saasAdmin = await User.findOneAndUpdate(
      { email: 'saas@cognifa.com' },
      {
        email: 'saas@cognifa.com',
        password: saasAdminPassword,
        name: 'SaaS Admin',
        role: UserRole.SAAS_ADMIN,
        isActive: true
      },
      { upsert: true, new: true }
    );
    console.log('✅ SaaS Admin created:', saasAdmin.email);

    // ==================== 2. SCHOOL ====================
    const school = await School.findOneAndUpdate(
      { email: 'info@smkdemodepok.sch.id' },
      {
        name: 'SMK Demo Depok',
        address: 'Jl. Raya Depok No. 123',
        city: 'Depok',
        province: 'Jawa Barat',
        postalCode: '16415',
        phone: '021-12345678',
        email: 'info@smkdemodepok.sch.id',
        website: 'https://smkdemodepok.sch.id',
        principalName: 'Dr. Ahmad Hidayat, M.Pd',
        principalEmail: 'principal@smkdemodepok.sch.id',
        principalPhone: '021-12345679',
        bankAccount: {
          bankName: 'Bank BCA',
          accountNumber: '1234567890',
          accountHolder: 'SMK Demo Depok'
        },
        taxId: '01.234.567.8-901.000',
        accreditation: 'A',
        establishedYear: 2010,
        description: 'Sekolah Menengah Kejuruan terbaik di Depok',
        subscriptionStatus: SubscriptionStatus.ACTIVE,
        subscriptionStartDate: new Date(),
        subscriptionEndDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year
        maxUsers: 1000,
        maxStudents: 1000,
        subscriptionFeePerStudent: null, // Use platform default (0)
        isActive: true,
        createdBy: saasAdmin._id
      },
      { upsert: true, new: true }
    );
    console.log('✅ School created:', school.name);

    // ==================== 3. YEARS (Multiple Tahun Ajaran) ====================
    const yearsData = [
      { name: '2023/2024', startDate: '2023-07-01', endDate: '2024-06-30', isActive: false },
      { name: '2024/2025', startDate: '2024-07-01', endDate: '2025-06-30', isActive: true },
      { name: '2025/2026', startDate: '2025-07-01', endDate: '2026-06-30', isActive: false }
    ];

    const years: any[] = [];
    for (const yearData of yearsData) {
      let year = await Year.findOne({ name: yearData.name, schoolId: school._id });
      if (!year) {
        year = await Year.create({
          schoolId: school._id,
          name: yearData.name,
          startDate: new Date(yearData.startDate),
          endDate: new Date(yearData.endDate),
          isActive: yearData.isActive
        });
        console.log(`✅ Year created: ${year.name} (${yearData.isActive ? 'Active' : 'Inactive'})`);
      } else {
        console.log(`✅ Year already exists: ${year.name}`);
      }
      years.push(year);
    }
    
    // Use active year for classes
    const year = years.find(y => y.isActive) || years[1]; // Default to 2024/2025

    // ==================== 4. MAJORS ====================
    const majorsData = [
      { name: 'Teknik Komputer dan Jaringan', code: 'TKJ', description: 'Teknik Komputer dan Jaringan' },
      { name: 'Rekayasa Perangkat Lunak', code: 'RPL', description: 'Rekayasa Perangkat Lunak' },
      { name: 'Multimedia', code: 'MM', description: 'Multimedia' },
      { name: 'Akuntansi', code: 'AK', description: 'Akuntansi' },
      { name: 'Administrasi Perkantoran', code: 'AP', description: 'Administrasi Perkantoran' }
    ];

    const majors: any[] = [];
    for (const majorData of majorsData) {
      const major = await Major.create({ ...majorData, schoolId: school._id, isActive: true });
      majors.push(major);
      console.log('✅ Major created:', major.name);
    }

    // ==================== 5. PRINCIPAL ====================
    const principalPassword = await bcrypt.hash('principal123', 10);
    const principal = await User.create({
      email: 'principal@smkdemodepok.sch.id',
      password: principalPassword,
      name: 'Dr. Ahmad Hidayat, M.Pd',
      role: UserRole.PRINCIPAL,
      schoolId: school._id,
      employeeId: 'PRIN001',
      department: 'Administration',
      phone: '081234567890',
      isActive: true
    });
    console.log('✅ Principal created:', principal.email);

    // ==================== 6. STAFF (4 staff) ====================
    const staffData = [
      { name: 'Budi Santoso', email: 'staff1@smkdemodepok.sch.id', employeeId: 'STAFF001', department: 'Administration', phone: '081234567891' },
      { name: 'Siti Nurhaliza', email: 'staff2@smkdemodepok.sch.id', employeeId: 'STAFF002', department: 'Academic', phone: '081234567892' },
      { name: 'Ahmad Fauzi', email: 'staff3@smkdemodepok.sch.id', employeeId: 'STAFF003', department: 'Student Affairs', phone: '081234567893' },
      { name: 'Dewi Lestari', email: 'staff4@smkdemodepok.sch.id', employeeId: 'STAFF004', department: 'Administration', phone: '081234567894' }
    ];

    const staffUsers: any[] = [];
    const staffPassword = await bcrypt.hash('staff123', 10);
    for (const staffInfo of staffData) {
      const staff = await User.create({
        email: staffInfo.email,
        password: staffPassword,
        name: staffInfo.name,
        role: UserRole.STAFF,
        schoolId: school._id,
        employeeId: staffInfo.employeeId,
        department: staffInfo.department,
        phone: staffInfo.phone,
        isActive: true
      });
      staffUsers.push(staff);
      console.log('✅ Staff created:', staff.name);
    }

    // ==================== 7. FINANCE (4 finance) ====================
    const financeData = [
      { name: 'Dewi Sartika', email: 'finance1@smkdemodepok.sch.id', employeeId: 'FIN001', phone: '081234567895' },
      { name: 'Bambang Wijaya', email: 'finance2@smkdemodepok.sch.id', employeeId: 'FIN002', phone: '081234567896' },
      { name: 'Sari Indira', email: 'finance3@smkdemodepok.sch.id', employeeId: 'FIN003', phone: '081234567897' },
      { name: 'Rizki Pratama', email: 'finance4@smkdemodepok.sch.id', employeeId: 'FIN004', phone: '081234567898' }
    ];

    const financeUsers: any[] = [];
    const financePassword = await bcrypt.hash('finance123', 10);
    for (const financeInfo of financeData) {
      const finance = await User.create({
        email: financeInfo.email,
        password: financePassword,
        name: financeInfo.name,
        role: UserRole.FINANCE,
        schoolId: school._id,
        employeeId: financeInfo.employeeId,
        department: 'Finance',
        phone: financeInfo.phone,
        isActive: true
      });
      financeUsers.push(finance);
      console.log('✅ Finance created:', finance.name);
    }

    // Use first finance for invoice creation
    const finance = financeUsers[0];

    // ==================== 8. TEACHERS (30 teachers) ====================
    const teachersData = [
      // Homeroom Teachers (15)
      { name: 'Prof. Dr. Suryadi, M.Pd', email: 'teacher1@smkdemodepok.sch.id', teacherId: 'T001', isHomeroom: true },
      { name: 'Dra. Indah Permata, M.Pd', email: 'teacher2@smkdemodepok.sch.id', teacherId: 'T002', isHomeroom: true },
      { name: 'Dr. Bambang Wijaya, M.Pd', email: 'teacher3@smkdemodepok.sch.id', teacherId: 'T003', isHomeroom: true },
      { name: 'Siti Aisyah, S.Pd', email: 'teacher4@smkdemodepok.sch.id', teacherId: 'T004', isHomeroom: true },
      { name: 'Ahmad Rizki, S.Pd', email: 'teacher5@smkdemodepok.sch.id', teacherId: 'T005', isHomeroom: true },
      { name: 'Dewi Lestari, M.Pd', email: 'teacher6@smkdemodepok.sch.id', teacherId: 'T006', isHomeroom: true },
      { name: 'Budi Santoso, S.Pd', email: 'teacher7@smkdemodepok.sch.id', teacherId: 'T007', isHomeroom: true },
      { name: 'Citra Dewi, S.Pd', email: 'teacher8@smkdemodepok.sch.id', teacherId: 'T008', isHomeroom: true },
      { name: 'Dedi Kurniawan, S.Pd', email: 'teacher9@smkdemodepok.sch.id', teacherId: 'T009', isHomeroom: true },
      { name: 'Eka Putri, S.Pd', email: 'teacher10@smkdemodepok.sch.id', teacherId: 'T010', isHomeroom: true },
      { name: 'Fajar Nugroho, S.Pd', email: 'teacher11@smkdemodepok.sch.id', teacherId: 'T011', isHomeroom: true },
      { name: 'Gita Sari, S.Pd', email: 'teacher12@smkdemodepok.sch.id', teacherId: 'T012', isHomeroom: true },
      { name: 'Hadi Wijaya, S.Pd', email: 'teacher13@smkdemodepok.sch.id', teacherId: 'T013', isHomeroom: true },
      { name: 'Indah Permata, S.Pd', email: 'teacher14@smkdemodepok.sch.id', teacherId: 'T014', isHomeroom: true },
      { name: 'Joko Susilo, S.Pd', email: 'teacher15@smkdemodepok.sch.id', teacherId: 'T015', isHomeroom: true },
      // Regular Teachers (15)
      { name: 'Kartika Sari, S.Pd', email: 'teacher16@smkdemodepok.sch.id', teacherId: 'T016', isHomeroom: false },
      { name: 'Lukman Hakim, S.Pd', email: 'teacher17@smkdemodepok.sch.id', teacherId: 'T017', isHomeroom: false },
      { name: 'Maya Indira, S.Pd', email: 'teacher18@smkdemodepok.sch.id', teacherId: 'T018', isHomeroom: false },
      { name: 'Nur Hidayat, S.Pd', email: 'teacher19@smkdemodepok.sch.id', teacherId: 'T019', isHomeroom: false },
      { name: 'Oki Setiawan, S.Pd', email: 'teacher20@smkdemodepok.sch.id', teacherId: 'T020', isHomeroom: false },
      { name: 'Putri Ayu, S.Pd', email: 'teacher21@smkdemodepok.sch.id', teacherId: 'T021', isHomeroom: false },
      { name: 'Rizki Pratama, S.Pd', email: 'teacher22@smkdemodepok.sch.id', teacherId: 'T022', isHomeroom: false },
      { name: 'Sari Dewi, S.Pd', email: 'teacher23@smkdemodepok.sch.id', teacherId: 'T023', isHomeroom: false },
      { name: 'Tono Wijaya, S.Pd', email: 'teacher24@smkdemodepok.sch.id', teacherId: 'T024', isHomeroom: false },
      { name: 'Umi Kalsum, S.Pd', email: 'teacher25@smkdemodepok.sch.id', teacherId: 'T025', isHomeroom: false },
      { name: 'Vina Sari, S.Pd', email: 'teacher26@smkdemodepok.sch.id', teacherId: 'T026', isHomeroom: false },
      { name: 'Wahyu Nugroho, S.Pd', email: 'teacher27@smkdemodepok.sch.id', teacherId: 'T027', isHomeroom: false },
      { name: 'Yani Permata, S.Pd', email: 'teacher28@smkdemodepok.sch.id', teacherId: 'T028', isHomeroom: false },
      { name: 'Zaki Ramadhan, S.Pd', email: 'teacher29@smkdemodepok.sch.id', teacherId: 'T029', isHomeroom: false },
      { name: 'Ayu Lestari, S.Pd', email: 'teacher30@smkdemodepok.sch.id', teacherId: 'T030', isHomeroom: false }
    ];

    const teachers: any[] = [];
    const teacherPassword = await bcrypt.hash('teacher123', 10);
    for (const teacherInfo of teachersData) {
      const teacher = await User.create({
        email: teacherInfo.email,
        password: teacherPassword,
        name: teacherInfo.name,
        role: teacherInfo.isHomeroom ? UserRole.HOMEROOM_TEACHER : UserRole.TEACHER,
        schoolId: school._id,
        teacherId: teacherInfo.teacherId,
        phone: `0812${Math.floor(Math.random() * 100000000)}`,
        isActive: true
      });
      teachers.push(teacher);
      console.log(`✅ ${teacherInfo.isHomeroom ? 'Homeroom Teacher' : 'Teacher'} created:`, teacher.name);
    }

    // ==================== 9. CLASSES ====================
    // 3 tahun x 5 jurusan = 15 kelas
    // Setiap kelas ~40 siswa, total 600 siswa
    const classes: any[] = [];
    const classNames = [
      // Tahun 10 (5 kelas)
      '10 TKJ 1', '10 TKJ 2', '10 RPL 1', '10 MM 1', '10 AK 1',
      // Tahun 11 (5 kelas)
      '11 TKJ 1', '11 TKJ 2', '11 RPL 1', '11 MM 1', '11 AP 1',
      // Tahun 12 (5 kelas)
      '12 TKJ 1', '12 TKJ 2', '12 RPL 1', '12 MM 1', '12 AK 1'
    ];

    const majorMap: { [key: string]: any } = {
      'TKJ': majors[0],
      'RPL': majors[1],
      'MM': majors[2],
      'AK': majors[3],
      'AP': majors[4]
    };

    for (let i = 0; i < classNames.length; i++) {
      const className = classNames[i];
      const majorCode = className.split(' ')[1];
      const major = majorMap[majorCode];
      const homeroomTeacher = teachers[i % teachers.length]; // Distribute teachers

      const classDoc = await Class.create({
        schoolId: school._id,
        name: className,
        yearId: year._id,
        majorId: major._id,
        homeroomTeacherId: homeroomTeacher._id,
        studentIds: [],
        capacity: 40,
        isActive: true
      });
      classes.push(classDoc);
      console.log('✅ Class created:', classDoc.name);
    }

    // ==================== 10. STUDENTS (600 students) ====================
    // 200 siswa per tahun, 40 siswa per kelas
    const students: any[] = [];
    const studentPassword = await bcrypt.hash('student123', 10);
    let studentCounter = 1;

    for (const classDoc of classes) {
      const yearLevel = parseInt(classDoc.name.split(' ')[0]);
      const majorCode = classDoc.name.split(' ')[1];
      const majorName = majorMap[majorCode].name;

      // Create 40 students per class
      for (let i = 0; i < 40; i++) {
        const studentId = `S${String(studentCounter).padStart(4, '0')}`;
        const firstName = ['Andi', 'Budi', 'Citra', 'Dedi', 'Eka', 'Fajar', 'Gita', 'Hadi', 'Indah', 'Joko', 'Kartika', 'Lukman', 'Maya', 'Nur', 'Oki', 'Putri', 'Rizki', 'Sari', 'Tono', 'Umi', 'Vina', 'Wahyu', 'Yani', 'Zaki', 'Ayu'][Math.floor(Math.random() * 25)];
        const lastName = ['Pratama', 'Raharjo', 'Dewi', 'Kurniawan', 'Putri', 'Nugroho', 'Sari', 'Wijaya', 'Permata', 'Susilo', 'Sari', 'Hakim', 'Indira', 'Hidayat', 'Setiawan', 'Ayu', 'Pratama', 'Dewi', 'Wijaya', 'Kalsum', 'Sari', 'Nugroho', 'Permata', 'Ramadhan', 'Lestari'][Math.floor(Math.random() * 25)];
        const studentName = `${firstName} ${lastName}`;

        const student = await User.create({
          email: `${studentId.toLowerCase()}@smkdemodepok.sch.id`,
          password: studentPassword,
          name: studentName,
          role: UserRole.STUDENT,
          schoolId: school._id,
          studentId: studentId,
          classId: classDoc._id,
          year: yearLevel,
          major: majorName,
          phone: `0812${Math.floor(Math.random() * 100000000)}`,
          isActive: true
        });
        students.push(student);

        // Add student to class
        await Class.findByIdAndUpdate(classDoc._id, {
          $addToSet: { studentIds: student._id }
        });

        studentCounter++;
      }
      console.log(`✅ Created 40 students for class ${classDoc.name}`);
    }

    // ==================== 11. PARENTS ====================
    // Create parents (1 parent per student, some parents have multiple children)
    const parents: any[] = [];
    const parentPassword = await bcrypt.hash('parent123', 10);
    const parentMap = new Map(); // Track which students belong to which parent

    // Group students - some parents have 2 children
    for (let i = 0; i < students.length; i += 2) {
      const student1 = students[i];
      const student2 = i + 1 < students.length ? students[i + 1] : null;
      
      const parentName = `Bapak/Ibu ${student1.name.split(' ')[0]}`;
      const parentEmail = `parent${String(Math.floor(i / 2) + 1).padStart(4, '0')}@smkdemodepok.sch.id`;
      
      const children = student2 ? [student1._id, student2._id] : [student1._id];
      
      const parent = await User.create({
        email: parentEmail,
        password: parentPassword,
        name: parentName,
        role: UserRole.PARENT,
        schoolId: school._id,
        children: children,
        phone: `0812${Math.floor(Math.random() * 100000000)}`,
        isActive: true
      });
      parents.push(parent);
      
      if ((i / 2 + 1) % 50 === 0) {
        console.log(`✅ Created ${i / 2 + 1} parents...`);
      }
    }
    console.log(`✅ Created ${parents.length} parents`);

    // ==================== 12. INVOICES ====================
    // Create invoices for all students (current month)
    const currentMonth = new Date().getMonth() + 1;
    const currentYear = new Date().getFullYear();
    const invoiceAmount = 500000; // Rp 500,000
    const dueDate = new Date(currentYear, currentMonth, 10);

    const invoices: any[] = [];
    let invoiceCounter = 1;
    
    for (let i = 0; i < students.length; i++) {
      const student = students[i];
      const parent = parents[Math.floor(i / 2)]; // Each parent has 2 children

      // Generate invoice number: INV-YYYYMM-XXXX
      const invoiceNumber = `INV-${currentYear}${String(currentMonth).padStart(2, '0')}-${String(invoiceCounter).padStart(4, '0')}`;
      invoiceCounter++;

      // Random status: 60% paid, 20% partial, 20% pending
      const rand = Math.random();
      let status: InvoiceStatus;
      let paidAmount: number;
      
      if (rand < 0.6) {
        status = InvoiceStatus.PAID;
        paidAmount = invoiceAmount;
      } else if (rand < 0.8) {
        status = InvoiceStatus.PARTIAL;
        paidAmount = invoiceAmount * 0.5;
      } else {
        status = InvoiceStatus.PENDING;
        paidAmount = 0;
      }

      const invoice = await Invoice.create({
        schoolId: school._id,
        invoiceNumber: invoiceNumber,
        studentId: student._id,
        parentId: parent._id,
        amount: invoiceAmount,
        dueDate: dueDate,
        paidAmount: paidAmount,
        remainingAmount: invoiceAmount - paidAmount,
        status: status,
        description: `SPP Bulan ${currentMonth} ${currentYear}`,
        items: [
          {
            description: 'SPP (Sumbangan Pembinaan Pendidikan)',
            quantity: 1,
            price: invoiceAmount,
            total: invoiceAmount
          }
        ],
        month: currentMonth,
        year: currentYear,
        createdBy: finance._id
      });
      invoices.push(invoice);

      if ((i + 1) % 100 === 0) {
        console.log(`✅ Created ${i + 1} invoices...`);
      }
    }
    console.log(`✅ Created ${invoices.length} invoices`);

    // ==================== 13. PAYMENT ATTEMPTS ====================
    // Create payment attempts for paid and partial invoices
    const paidInvoices = invoices.filter(inv => inv.status === InvoiceStatus.PAID || inv.status === InvoiceStatus.PARTIAL);
    
    for (let i = 0; i < Math.min(paidInvoices.length, 300); i++) {
      const invoice = paidInvoices[i];
      const isSuccess = invoice.status === InvoiceStatus.PAID;
      
      await PaymentAttempt.create({
        schoolId: school._id,
        invoiceId: invoice._id,
        studentId: invoice.studentId,
        parentId: invoice.parentId,
        amount: invoice.paidAmount,
        paymentMethod: PaymentMethod.BANK_TRANSFER,
        status: isSuccess ? PaymentAttemptStatus.SUCCESS : PaymentAttemptStatus.PENDING,
        transactionId: isSuccess ? `TXN${Date.now()}${i}` : undefined,
        paymentReference: isSuccess ? `REF${Date.now()}${i}` : undefined,
        processedAt: isSuccess ? new Date() : undefined,
        notes: isSuccess ? 'Pembayaran berhasil' : 'Menunggu konfirmasi'
      });

      if ((i + 1) % 50 === 0) {
        console.log(`✅ Created ${i + 1} payment attempts...`);
      }
    }
    console.log(`✅ Created ${Math.min(paidInvoices.length, 300)} payment attempts`);

    // ==================== 14. ATTENDANCE ====================
    // Create attendance for students (last 7 days)
    const today = new Date();
    let attendanceCount = 0;
    const processedStudents = new Set<string>(); // Track processed students per day
    
    for (let dayOffset = 0; dayOffset < 7; dayOffset++) {
      const date = new Date(today);
      date.setDate(date.getDate() - dayOffset);
      
      // Skip weekends
      if (date.getDay() === 0 || date.getDay() === 6) continue;
      
      // Reset set for each day
      processedStudents.clear();
      
      // Student attendance (sample 200 unique students per day)
      const shuffledStudents = [...students].sort(() => Math.random() - 0.5);
      const studentsToProcess = shuffledStudents.slice(0, Math.min(200, students.length));
      
      for (const student of studentsToProcess) {
        const studentKey = `${student._id.toString()}-${date.toISOString().split('T')[0]}`;
        if (processedStudents.has(studentKey)) continue;
        processedStudents.add(studentKey);
        
        const statuses = [AttendanceStatus.PRESENT, AttendanceStatus.PRESENT, AttendanceStatus.PRESENT, AttendanceStatus.LATE, AttendanceStatus.ABSENT];
        const status = statuses[Math.floor(Math.random() * statuses.length)];
        
        const checkInDate = new Date(date);
        checkInDate.setHours(7, Math.floor(Math.random() * 30), 0, 0);
        
        await Attendance.create({
          schoolId: school._id,
          userId: student._id,
          type: 'student',
          date: date,
          status: status,
          checkInTime: status === AttendanceStatus.PRESENT || status === AttendanceStatus.LATE 
            ? checkInDate
            : undefined,
          classId: student.classId
        });
        attendanceCount++;
      }

      // Teacher attendance
      for (const teacher of teachers) {
        const checkInDate = new Date(date);
        checkInDate.setHours(7, 0, 0, 0);
        const checkOutDate = new Date(date);
        checkOutDate.setHours(15, 0, 0, 0);
        
        await Attendance.create({
          schoolId: school._id,
          userId: teacher._id,
          type: 'teacher',
          date: date,
          status: AttendanceStatus.PRESENT,
          checkInTime: checkInDate,
          checkOutTime: checkOutDate
        });
      }
    }
    console.log(`✅ Created ${attendanceCount} student attendance records and ${teachers.length * 5} teacher attendance records`);

    // ==================== 15. STUDENT ACTIVITIES ====================
    const activityTypes = ['attendance', 'assignment', 'exam', 'achievement', 'behavior'];
    const activityCount = 100; // 100 activities
    
    for (let i = 0; i < activityCount; i++) {
      const student = students[Math.floor(Math.random() * students.length)];
      const type = activityTypes[Math.floor(Math.random() * activityTypes.length)];
      
      const titles = {
        attendance: 'Kehadiran Harian',
        assignment: 'Tugas Praktikum',
        exam: 'Ujian Tengah Semester',
        achievement: 'Juara 1 Lomba Kompetensi',
        behavior: 'Perilaku Baik'
      };
      
      await StudentActivity.create({
        schoolId: school._id,
        studentId: student._id,
        type: type as any,
        title: titles[type as keyof typeof titles],
        description: `Aktivitas ${titles[type as keyof typeof titles]} untuk ${student.name}`,
        date: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000), // Random date in last 30 days
        classId: student.classId,
        createdBy: teachers[Math.floor(Math.random() * teachers.length)]._id
      });
    }
    console.log(`✅ Created ${activityCount} student activities`);

    // ==================== 16. SCHEDULES (Jadwal Pelajaran) ====================
    // Mata pelajaran umum untuk semua jurusan
    const commonSubjects = [
      { name: 'Matematika', code: 'MAT' },
      { name: 'Bahasa Indonesia', code: 'BIN' },
      { name: 'Bahasa Inggris', code: 'BIG' },
      { name: 'Pendidikan Agama', code: 'PAI' },
      { name: 'Pendidikan Kewarganegaraan', code: 'PKN' },
      { name: 'Pendidikan Jasmani', code: 'PJOK' }
    ];

    // Mata pelajaran per jurusan
    const subjectByMajor: { [key: string]: { name: string; code: string }[] } = {
      'TKJ': [
        { name: 'Jaringan Komputer', code: 'JARKOM' },
        { name: 'Sistem Operasi', code: 'SISOP' },
        { name: 'Pemrograman Web', code: 'WEB' },
        { name: 'Administrasi Server', code: 'ADMSER' },
        { name: 'Keamanan Jaringan', code: 'KEJAR' }
      ],
      'RPL': [
        { name: 'Pemrograman Dasar', code: 'PRODAS' },
        { name: 'Pemrograman Berorientasi Objek', code: 'PBO' },
        { name: 'Database', code: 'DB' },
        { name: 'Web Development', code: 'WEBDEV' },
        { name: 'Mobile Development', code: 'MOBILE' }
      ],
      'MM': [
        { name: 'Desain Grafis', code: 'DESGRAF' },
        { name: 'Video Editing', code: 'VIDEO' },
        { name: 'Animasi', code: 'ANIMASI' },
        { name: 'Fotografi', code: 'FOTO' },
        { name: 'Multimedia Interaktif', code: 'MMI' }
      ],
      'AK': [
        { name: 'Akuntansi Dasar', code: 'AKDAS' },
        { name: 'Akuntansi Keuangan', code: 'AKKEU' },
        { name: 'Perpajakan', code: 'PAJAK' },
        { name: 'Komputer Akuntansi', code: 'KOMAK' },
        { name: 'Ekonomi', code: 'EKONOMI' }
      ],
      'AP': [
        { name: 'Administrasi Perkantoran', code: 'ADMPER' },
        { name: 'Korespondensi', code: 'KORESP' },
        { name: 'Kesekretariatan', code: 'SEKRET' },
        { name: 'Manajemen Perkantoran', code: 'MANPER' },
        { name: 'Komunikasi Bisnis', code: 'KOMBIS' }
      ]
    };

    // Waktu pelajaran (Senin-Jumat, 7 jam pelajaran per hari)
    const timeSlots = [
      { start: '07:00', end: '07:45', period: 1 },
      { start: '07:45', end: '08:30', period: 2 },
      { start: '08:30', end: '09:15', period: 3 },
      { start: '09:15', end: '09:30', period: 0 }, // Istirahat
      { start: '09:30', end: '10:15', period: 4 },
      { start: '10:15', end: '11:00', period: 5 },
      { start: '11:00', end: '11:45', period: 6 },
      { start: '11:45', end: '12:30', period: 0 }, // Istirahat
      { start: '12:30', end: '13:15', period: 7 },
      { start: '13:15', end: '14:00', period: 8 }
    ];

    const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
    const dayNames = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat'];
    
    let scheduleCount = 0;
    const yearStart = new Date(year.startDate);
    const yearEnd = new Date(year.endDate);

    // Create schedules for each class
    for (const classDoc of classes) {
      const majorCode = classDoc.name.split(' ')[1]; // Extract major code from class name
      const classSubjects = [
        ...commonSubjects,
        ...(subjectByMajor[majorCode] || [])
      ];

      // Create weekly recurring schedule for this class
      for (let dayIndex = 0; dayIndex < daysOfWeek.length; dayIndex++) {
        const dayName = dayNames[dayIndex];
        let periodIndex = 0;

        // Assign subjects to periods (skip break times)
        for (let slotIndex = 0; slotIndex < timeSlots.length && periodIndex < 8; slotIndex++) {
          const slot = timeSlots[slotIndex];
          if (slot.period === 0) continue; // Skip break times

          const subject = classSubjects[periodIndex % classSubjects.length];
          const assignedTeacher = teachers[Math.floor(Math.random() * teachers.length)];

          // Calculate the first occurrence of this day in the year
          const firstDate = new Date(yearStart);
          const dayOfWeek = dayIndex; // Monday = 0, Friday = 4
          const daysToAdd = (dayOfWeek - firstDate.getDay() + 7) % 7;
          firstDate.setDate(firstDate.getDate() + daysToAdd);

          // Create recurring weekly schedule
          await Schedule.create({
            schoolId: school._id,
            title: `${subject.name} - ${classDoc.name}`,
            description: `Jadwal ${subject.name} untuk kelas ${classDoc.name} setiap ${dayName}`,
            startDate: firstDate,
            endDate: yearEnd,
            startTime: slot.start,
            endTime: slot.end,
            classId: classDoc._id,
            createdBy: principal._id,
            type: 'class',
            isRecurring: true,
            recurringPattern: {
              frequency: 'weekly',
              interval: 1,
              endDate: yearEnd
            },
            isAllDay: false
          });
          scheduleCount++;
          periodIndex++;
        }
      }
      
      if (classes.indexOf(classDoc) % 5 === 0) {
        console.log(`✅ Created schedules for ${classes.indexOf(classDoc) + 1} classes...`);
      }
    }
    console.log(`✅ Created ${scheduleCount} schedule entries (jadwal pelajaran)`);

    // ==================== 17. SCHOOL EVENTS & HOLIDAYS ====================
    const holidays = [
      { title: 'Hari Kemerdekaan RI', date: '2024-08-17', type: 'holiday' },
      { title: 'Hari Raya Idul Fitri', date: '2024-04-10', type: 'holiday' },
      { title: 'Hari Raya Idul Adha', date: '2024-06-17', type: 'holiday' },
      { title: 'Tahun Baru', date: '2025-01-01', type: 'holiday' },
      { title: 'Hari Pendidikan Nasional', date: '2024-05-02', type: 'holiday' }
    ];

    const events = [
      { title: 'Upacara Bendera', date: '2024-08-17', type: 'event' },
      { title: 'Porseni (Pekan Olahraga dan Seni)', date: '2024-10-15', type: 'event' },
      { title: 'Ujian Tengah Semester', date: '2024-10-01', type: 'exam' },
      { title: 'Ujian Akhir Semester', date: '2024-12-15', type: 'exam' }
    ];

    for (const holiday of holidays) {
      await Schedule.create({
        schoolId: school._id,
        title: holiday.title,
        description: `Libur nasional: ${holiday.title}`,
        startDate: new Date(holiday.date),
        endDate: new Date(holiday.date),
        createdBy: principal._id,
        type: holiday.type as any,
        isRecurring: false,
        isAllDay: true
      });
    }

    for (const event of events) {
      await Schedule.create({
        schoolId: school._id,
        title: event.title,
        description: `Acara sekolah: ${event.title}`,
        startDate: new Date(event.date),
        endDate: new Date(event.date),
        createdBy: principal._id,
        type: event.type as any,
        isRecurring: false,
        isAllDay: true
      });
    }
    console.log(`✅ Created ${holidays.length} holidays and ${events.length} school events`);

    // ==================== SUMMARY ====================
    console.log('\n✅ Database seeded successfully!');
    console.log('\n📊 Summary:');
    console.log(`   - 1 SaaS Admin`);
    console.log(`   - 1 School: ${school.name}`);
    console.log(`   - ${years.length} Years (${years.filter(y => y.isActive).length} active)`);
    console.log(`   - ${majors.length} Majors`);
    console.log(`   - ${classes.length} Classes`);
    console.log(`   - 1 Principal`);
    console.log(`   - ${staffUsers.length} Staff`);
    console.log(`   - ${financeUsers.length} Finance`);
    console.log(`   - ${teachers.length} Teachers (${teachers.filter(t => t.role === UserRole.HOMEROOM_TEACHER).length} homeroom)`);
    console.log(`   - ${students.length} Students`);
    console.log(`   - ${parents.length} Parents`);
    console.log(`   - ${invoices.length} Invoices`);
    console.log(`   - ${Math.min(paidInvoices.length, 300)} Payment Attempts`);
    console.log(`   - ${attendanceCount} Student Attendance Records`);
    console.log(`   - ${teachers.length * 5} Teacher Attendance Records`);
    console.log(`   - ${activityCount} Student Activities`);
    console.log(`   - ${scheduleCount} Class Schedules (jadwal pelajaran)`);
    console.log(`   - ${holidays.length} Holidays`);
    console.log(`   - ${events.length} School Events`);

    console.log('\n📋 Login Credentials:');
    console.log('\n1. SaaS Admin:');
    console.log('   Email: saas@cognifa.com');
    console.log('   Password: saasadmin123');
    console.log('\n2. Principal:');
    console.log('   Email: principal@smkdemodepok.sch.id');
    console.log('   Password: principal123');
    console.log('\n3. Staff:');
    console.log('   Email: staff1@smkdemodepok.sch.id');
    console.log('   Password: staff123');
    console.log('\n4. Finance:');
    console.log('   Email: finance1@smkdemodepok.sch.id');
    console.log('   Password: finance123');
    console.log('\n5. Teacher:');
    console.log('   Email: teacher1@smkdemodepok.sch.id');
    console.log('   Password: teacher123');
    console.log('\n6. Student:');
    console.log('   Email: s0001@smkdemodepok.sch.id');
    console.log('   Password: student123');
    console.log('\n7. Parent:');
    console.log('   Email: parent0001@smkdemodepok.sch.id');
    console.log('   Password: parent123');
    console.log('\n⚠️  Please change passwords after first login!');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding database:', error);
    process.exit(1);
  }
};

seedDatabase();
