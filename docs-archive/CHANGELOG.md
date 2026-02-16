# Changelog

## [Unreleased]

### Added
- **SaaS Admin Experience**: Antarmuka multi-tenant lengkap untuk admin internal
  - Dashboard SaaS menampilkan ringkasan sekolah, subscription status, dan statistik admin fee
  - Halaman manajemen sekolah dengan pencarian, toggle status, dan aksi pilih sekolah (school switching)
  - Halaman pengaturan subscription untuk mengubah admin fee, fee per murid, dan override per sekolah
  - School Switcher global di layout untuk memilih konteks sekolah saat beroperasi sebagai SaaS Admin

- **Payment System**: Sistem pembayaran lengkap dengan invoice dan payment tracking
  - Invoice model dengan auto-generated invoice number
  - PaymentAttempt model untuk tracking semua percobaan pembayaran
  - Reusable payment components (PaymentModal, InvoiceCard)
  - Invoice management page
  - Payment attempt tracking

- **School Profile**: Halaman profil sekolah
  - School model dengan informasi lengkap
  - School profile page dengan edit functionality
  - Managed by Staff and Principal only

- **Bahasa Indonesia UI**: Semua UI text diterjemahkan ke Bahasa Indonesia
  - Menu items
  - Page titles
  - Form labels
  - Buttons
  - Status labels
  - Error messages

### Changed
- Payment pages sekarang menggunakan sistem invoice baru
- Menu items di sidebar menggunakan Bahasa Indonesia
- Dashboard stats menggunakan Bahasa Indonesia

### Fixed
- Invoice model pre-save hook untuk menghindari race condition
- Payment status calculation

## [1.0.0] - Initial Release

### Added
- Multi-role authentication system
- Student management
- Attendance tracking
- Class management (Year > Major > Class)
- Schedule and calendar
- Communication system (parent-teacher messaging)
- Payment management (legacy)
- User management
- Role-based access control
- Responsive UI design

