# 🎓 Demo Accounts - Cognifa School Management System

## Overview

This document contains all demo account credentials for testing the Cognifa system. All accounts are created when you run the seed script.

## 🔐 Login Credentials

### 1. SaaS Admin
**Access Level:** Full system access, manages all schools
- **Email:** `saas@cognifa.com`
- **Password:** `saasadmin123`
- **Features:**
  - View all schools
  - Manage subscriptions
  - Configure platform settings
  - View system-wide statistics

---

### 2. Principal (Kepala Sekolah)
**Access Level:** Full school management
- **Email:** `principal@smkdemodepok.sch.id`
- **Password:** `principal123`
- **Features:**
  - Full access to all school features
  - User management
  - Class management
  - Reports and analytics
  - School profile management

---

### 3. Staff
**Access Level:** Administrative access
- **Email:** `staff1@smkdemodepok.sch.id`
- **Password:** `staff123`
- **Additional Staff Accounts:**
  - `staff2@smkdemodepok.sch.id` (Password: `staff123`)
  - `staff3@smkdemodepok.sch.id` (Password: `staff123`)
  - `staff4@smkdemodepok.sch.id` (Password: `staff123`)
- **Features:**
  - User management
  - Class management
  - Year and major management
  - Schedule creation
  - Attendance management
  - Invoice management

---

### 4. Finance
**Access Level:** Financial management
- **Email:** `finance1@smkdemodepok.sch.id`
- **Password:** `finance123`
- **Additional Finance Accounts:**
  - `finance2@smkdemodepok.sch.id` (Password: `finance123`)
  - `finance3@smkdemodepok.sch.id` (Password: `finance123`)
  - `finance4@smkdemodepok.sch.id` (Password: `finance123`)
- **Features:**
  - View and manage invoices
  - Payment tracking
  - Financial reports
  - Payment approval

---

### 5. Teacher (Guru)
**Access Level:** Teaching and class management
- **Email:** `teacher1@smkdemodepok.sch.id`
- **Password:** `teacher123`
- **Additional Teacher Accounts:**
  - `teacher2@smkdemodepok.sch.id` through `teacher30@smkdemodepok.sch.id`
  - All use password: `teacher123`
- **Features:**
  - View own attendance
  - View assigned classes
  - View schedules
  - Send messages to parents
  - View calendar

---

### 6. Homeroom Teacher (Wali Kelas)
**Access Level:** Class management + teaching
- **Email:** `teacher1@smkdemodepok.sch.id` (First 15 teachers are homeroom teachers)
- **Password:** `teacher123`
- **Features:**
  - All teacher features
  - Manage class attendance
  - Class management
  - Student monitoring

---

### 7. Student (Siswa)
**Access Level:** Student portal
- **Email:** `s0001@smkdemodepok.sch.id`
- **Password:** `student123`
- **Additional Student Accounts:**
  - `s0002@smkdemodepok.sch.id` through `s0600@smkdemodepok.sch.id`
  - All use password: `student123`
- **Features:**
  - View own attendance
  - View calendar and schedules
  - View reports
  - Submit attendance

---

### 8. Parent (Orang Tua)
**Access Level:** Parent portal
- **Email:** `parent0001@smkdemodepok.sch.id`
- **Password:** `parent123`
- **Additional Parent Accounts:**
  - `parent0002@smkdemodepok.sch.id` through `parent0300@smkdemodepok.sch.id`
  - All use password: `parent123`
- **Features:**
  - View children's attendance
  - View children's calendar
  - View invoices and make payments
  - View reports
  - Communicate with teachers

---

## 📊 Demo Data Summary

The seed script creates:

- **1 School:** SMK Demo Depok
- **3 Academic Years:** 2023/2024, 2024/2025 (active), 2025/2026
- **5 Majors:** TKJ, RPL, MM, AK, AP
- **15 Classes:** 3 years × 5 majors
- **600 Students:** ~40 students per class
- **300 Parents:** Some parents have 2 children
- **30 Teachers:** 15 homeroom + 15 regular
- **4 Staff members**
- **4 Finance staff**
- **600 Invoices:** Current month invoices
- **300 Payment Attempts**
- **Attendance Records:** Last 7 days
- **100 Student Activities**
- **Class Schedules:** Full weekly schedules
- **Holidays & Events:** Sample school events

---

## 🚀 Quick Start

1. **Run the seed script:**
   ```bash
   cd backend
   npm run seed
   ```

2. **Start the application:**
   ```bash
   npm run dev
   ```

3. **Login with any account above**

---

## ⚠️ Security Note

**IMPORTANT:** These are demo accounts for development/testing only. 

- Change all passwords in production
- Use strong, unique passwords
- Implement proper authentication policies
- Never use these credentials in production environments

---

## 🎯 Testing Scenarios

### Test SaaS Features
- Login as: `saas@cognifa.com`
- Switch between schools
- View subscription management
- Configure platform settings

### Test School Management
- Login as: `principal@smkdemodepok.sch.id`
- Create users
- Manage classes
- View reports

### Test Financial Operations
- Login as: `finance1@smkdemodepok.sch.id`
- View invoices
- Approve payments
- Generate financial reports

### Test Parent Portal
- Login as: `parent0001@smkdemodepok.sch.id`
- View children's information
- Make payments
- Communicate with teachers

### Test Student Portal
- Login as: `s0001@smkdemodepok.sch.id`
- View attendance
- View calendar
- Submit attendance

---

## 📝 Notes

- All passwords follow the pattern: `{role}123`
- Student emails: `s{number}@smkdemodepok.sch.id`
- Parent emails: `parent{number}@smkdemodepok.sch.id`
- Teacher emails: `teacher{number}@smkdemodepok.sch.id`
- Staff emails: `staff{number}@smkdemodepok.sch.id`
- Finance emails: `finance{number}@smkdemodepok.sch.id`

---

**Happy Testing! 🎉**
