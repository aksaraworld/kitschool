'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { firebaseAuthService } from '@/lib/firebaseAuth';
import { UserRole } from '@/lib/types';
import SchoolSwitcher from '../SaaS/SchoolSwitcher';
import {
  LayoutDashboard,
  Users,
  Calendar,
  MessageSquare,
  CreditCard,
  ClipboardCheck,
  BookOpen,
  Settings,
  LogOut,
  Menu,
  X,
  User,
  GraduationCap,
  Building2,
  Wallet,
  FileText
} from 'lucide-react';

interface DashboardLayoutProps {
  children: React.ReactNode;
  userRole: UserRole;
}

const menuItems = {
  [UserRole.SAAS_ADMIN]: [
    { href: '/saas/dashboard', label: 'Ringkasan', icon: LayoutDashboard },
    { href: '/saas/schools', label: 'Sekolah', icon: Building2 },
    { href: '/saas/subscription', label: 'Langganan', icon: CreditCard },
  ],
  [UserRole.STUDENT]: [
    { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/profile', label: 'Profil', icon: User },
    { href: '/attendance', label: 'Kehadiran', icon: ClipboardCheck },
    { href: '/calendar', label: 'Kalender', icon: Calendar },
    { href: '/reports', label: 'Laporan', icon: FileText },
  ],
  [UserRole.PARENT]: [
    { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/profile', label: 'Profil', icon: User },
    { href: '/children', label: 'Anak Saya', icon: User },
    { href: '/invoices', label: 'Tagihan', icon: CreditCard },
    { href: '/attendance', label: 'Kehadiran', icon: ClipboardCheck },
    { href: '/calendar', label: 'Kalender', icon: Calendar },
    { href: '/reports', label: 'Laporan', icon: FileText },
    { href: '/messages', label: 'Pesan', icon: MessageSquare },
  ],
  [UserRole.TEACHER]: [
    { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/profile', label: 'Profil', icon: User },
    { href: '/attendance', label: 'Kehadiran Saya', icon: ClipboardCheck },
    { href: '/classes', label: 'Kelas Saya', icon: BookOpen },
    { href: '/schedules', label: 'Jadwal', icon: Calendar },
    { href: '/calendar', label: 'Kalender', icon: Calendar },
    { href: '/messages', label: 'Pesan', icon: MessageSquare },
  ],
  [UserRole.HOMEROOM_TEACHER]: [
    { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/profile', label: 'Profil', icon: User },
    { href: '/attendance', label: 'Kehadiran Saya', icon: ClipboardCheck },
    { href: '/classes', label: 'Kelas Saya', icon: BookOpen },
    { href: '/schedules', label: 'Jadwal', icon: Calendar },
    { href: '/messages', label: 'Pesan', icon: MessageSquare },
  ],
  [UserRole.STAFF]: [
    { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/profile', label: 'Profil', icon: User },
    { href: '/users', label: 'Pengguna', icon: Users },
    { href: '/classes', label: 'Kelas', icon: GraduationCap },
    { href: '/years', label: 'Tahun Ajaran', icon: Calendar },
    { href: '/majors', label: 'Jurusan', icon: Building2 },
    { href: '/schedules', label: 'Jadwal', icon: Calendar },
    { href: '/attendance', label: 'Kehadiran', icon: ClipboardCheck },
    { href: '/invoices', label: 'Tagihan', icon: Wallet },
    { href: '/school-profile', label: 'Profil Sekolah', icon: Building2 },
  ],
  [UserRole.PRINCIPAL]: [
    { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/profile', label: 'Profil', icon: User },
    { href: '/users', label: 'Pengguna', icon: Users },
    { href: '/classes', label: 'Kelas', icon: GraduationCap },
    { href: '/years', label: 'Tahun Ajaran', icon: Calendar },
    { href: '/majors', label: 'Jurusan', icon: Building2 },
    { href: '/schedules', label: 'Jadwal', icon: Calendar },
    { href: '/attendance', label: 'Kehadiran', icon: ClipboardCheck },
    { href: '/invoices', label: 'Tagihan', icon: Wallet },
    { href: '/reports', label: 'Laporan', icon: FileText },
    { href: '/school-profile', label: 'Profil Sekolah', icon: Building2 },
  ],
  [UserRole.FINANCE]: [
    { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/profile', label: 'Profil', icon: User },
    { href: '/invoices', label: 'Tagihan', icon: CreditCard },
    { href: '/reports', label: 'Laporan', icon: FileText },
  ],
};

export default function DashboardLayout({ children, userRole }: DashboardLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [logoError, setLogoError] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    // Get user on client side only
    setUser(firebaseAuthService.getCurrentUser());
  }, []);

  const handleLogout = () => {
    firebaseAuthService.logout();
    router.push('/login');
  };

  const items = menuItems[userRole] || [];

  return (
    <div className="min-h-screen bg-cognifaNeutral-altBg">
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 z-50 h-full w-64 bg-white shadow-lg transform transition-transform duration-300 ease-in-out ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        <div className="flex flex-col h-full">
          <div className="p-6 border-b border-cognifaNeutral-border bg-cognifaNeutral-bg">
            {!logoError ? (
              <Image src="/logo.png" alt="Cognifa" width={140} height={36} className="h-9 w-auto object-contain" style={{ width: 'auto', height: '2.25rem' }} unoptimized onError={() => setLogoError(true)} />
            ) : (
              <h1 className="font-heading text-xl font-bold text-primary-500">Cognifa</h1>
            )}
            <p className="text-sm text-gray-600 mt-2">Lacak. Terhubung. Percaya. Semua dalam Satu Tempat</p>
          </div>

          <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
            {items.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${
                    isActive
                  ? 'bg-primary-50 text-primary-700 font-medium border-l-4 border-primary-500'
                  : 'text-cognifaNeutral-dark hover:bg-primary-50 hover:text-primary-600'
                  }`}
                  onClick={() => setSidebarOpen(false)}
                >
                  <Icon className="w-5 h-5" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>

          <div className="p-4 border-t">
            <div className="mb-4 px-4 py-2">
              <p className="text-sm font-medium text-gray-900">{user?.name}</p>
              <p className="text-xs text-gray-500 capitalize">
                {userRole === UserRole.SAAS_ADMIN ? 'SaaS Admin' :
                 userRole === UserRole.HOMEROOM_TEACHER ? 'Wali Kelas' : 
                 userRole === UserRole.PRINCIPAL ? 'Kepala Sekolah' :
                 userRole === UserRole.FINANCE ? 'Keuangan' :
                 userRole === UserRole.STAFF ? 'Staf' :
                 userRole === UserRole.TEACHER ? 'Guru' :
                 userRole === UserRole.PARENT ? 'Orang Tua' :
                 userRole === UserRole.STUDENT ? 'Siswa' : userRole}
              </p>
            </div>
            <button
              onClick={handleLogout}
              className="w-full flex items-center space-x-3 px-4 py-3 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            >
              <LogOut className="w-5 h-5" />
              <span>Keluar</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="lg:pl-64">
        {/* Top bar */}
        <header className="bg-cognifaNeutral-bg/95 backdrop-blur-sm shadow-sm sticky top-0 z-30 border-b border-cognifaNeutral-border">
          <div className="px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="lg:hidden p-2 rounded-md text-gray-600 hover:bg-gray-100"
            >
              {sidebarOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
            <div className="flex-1" />
            <div className="flex flex-wrap items-center gap-4 justify-end">
              {userRole === UserRole.SAAS_ADMIN && <SchoolSwitcher />}
              <div className="text-right hidden sm:block">
                <p className="text-sm font-medium text-gray-900">{user?.name}</p>
                <p className="text-xs text-gray-500 capitalize">
                  {userRole === UserRole.SAAS_ADMIN ? 'SaaS Admin' :
                   userRole === UserRole.HOMEROOM_TEACHER ? 'Wali Kelas' : 
                   userRole === UserRole.PRINCIPAL ? 'Kepala Sekolah' :
                   userRole === UserRole.FINANCE ? 'Keuangan' :
                   userRole === UserRole.STAFF ? 'Staf' :
                   userRole === UserRole.TEACHER ? 'Guru' :
                   userRole === UserRole.PARENT ? 'Orang Tua' :
                   userRole === UserRole.STUDENT ? 'Siswa' : userRole}
                </p>
              </div>
              {user?.avatar ? (
                <img
                  src={user.avatar}
                  alt={user.name}
                  className="w-10 h-10 rounded-full"
                />
              ) : (
                <div className="w-10 h-10 rounded-full bg-primary-500 flex items-center justify-center shadow-md">
                  <User className="w-6 h-6 text-white" />
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="p-4 sm:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}

