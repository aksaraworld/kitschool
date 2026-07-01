'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import SchoolLogo from '@/components/Brand/SchoolLogo';
import BrandLogo from '@/components/Brand/BrandLogo';
import PoweredByFooter from '@/components/Brand/PoweredByFooter';
import { brand } from '@/lib/branding';
import { useDisplaySchool } from '@/hooks/useDisplaySchool';
import { useRouter, usePathname } from 'next/navigation';
import { firebaseAuthService } from '@/lib/firebaseAuth';
import { UserRole, getEffectiveRoles, ROLE_LABELS } from '@/lib/types';
import SchoolSwitcher from '../SaaS/SchoolSwitcher';
import UnitSwitcher from './UnitSwitcher';
import NotificationBell from './NotificationBell';
import ChatFab from '@/components/Chat/ChatFab';
import { NotificationsProvider } from '@/context/NotificationsContext';
import {
  LayoutDashboard,
  Users,
  Calendar,
  MessageSquare,
  CreditCard,
  ClipboardCheck,
  BookOpen,
  BookMarked,
  Settings,
  LogOut,
  Menu,
  X,
  User,
  GraduationCap,
  Building2,
  Wallet,
  FileText,
  Award,
  BedDouble,
  ClipboardList,
  Banknote,
  BookUser,
  Shield,
} from 'lucide-react';

interface DashboardLayoutProps {
  children: React.ReactNode;
  user: { role?: string; roles?: string[] };
}

const menuItems: Record<string, { href: string; label: string; icon: React.ComponentType<{ className?: string }> }[]> = {
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
    { href: '/lms/learn', label: 'Belajar', icon: GraduationCap },
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
    { href: '/tickets', label: 'Masukan & Keluhan', icon: ClipboardList },
  ],
  [UserRole.TEACHER]: [
    { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/profile', label: 'Profil', icon: User },
    { href: '/attendance', label: 'Kehadiran Saya', icon: ClipboardCheck },
    { href: '/classes', label: 'Kelas Saya', icon: BookOpen },
    { href: '/schedules', label: 'Jadwal', icon: Calendar },
    { href: '/calendar', label: 'Kalender', icon: Calendar },
    { href: '/bk', label: 'BK & Kedisiplinan', icon: Shield },
    { href: '/lms', label: 'LMS / Silabus', icon: GraduationCap },
    { href: '/messages', label: 'Pesan', icon: MessageSquare },
  ],
  [UserRole.HOMEROOM_TEACHER]: [
    { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/profile', label: 'Profil', icon: User },
    { href: '/attendance', label: 'Kehadiran Saya', icon: ClipboardCheck },
    { href: '/classes', label: 'Kelas Saya', icon: BookOpen },
    { href: '/schedules', label: 'Jadwal', icon: Calendar },
    { href: '/bk', label: 'BK & Kedisiplinan', icon: Shield },
    { href: '/lms', label: 'LMS / Silabus', icon: GraduationCap },
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
    { href: '/pos', label: 'POS', icon: Banknote },
    { href: '/finance/catalog', label: 'Katalog Biaya', icon: BookOpen },
    { href: '/finance/reports', label: 'Laporan Keuangan', icon: Wallet },
    { href: '/invoices', label: 'Tagihan', icon: CreditCard },
    { href: '/school-profile', label: 'Profil Sekolah', icon: Building2 },
    { href: '/guest-book', label: 'Buku Tamu', icon: BookUser },
    { href: '/bk', label: 'BK & Kedisiplinan', icon: Shield },
    { href: '/boarding', label: 'Asrama', icon: BedDouble },
    { href: '/messages', label: 'Pesan', icon: MessageSquare },
    { href: '/tickets', label: 'Tiket & CRM', icon: ClipboardList },
  ],
  [UserRole.KETUA_YAYASAN]: [
    { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/users', label: 'Pengguna', icon: Users },
    { href: '/school-profile', label: 'Profil Sekolah', icon: Building2 },
    { href: '/guest-book', label: 'Laporan Tamu', icon: BookUser },
    { href: '/bk', label: 'BK & Kedisiplinan', icon: Shield },
    { href: '/boarding', label: 'Asrama', icon: BedDouble },
    { href: '/finance/catalog', label: 'Katalog Biaya', icon: BookOpen },
    { href: '/finance/reports', label: 'Laporan Keuangan', icon: Wallet },
    { href: '/tickets', label: 'Tiket & CRM', icon: ClipboardList },
    { href: '/reports', label: 'Laporan', icon: FileText },
    { href: '/messages', label: 'Pesan', icon: MessageSquare },
  ],
  [UserRole.KETUA_PESANTREN]: [
    { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/users', label: 'Pengguna', icon: Users },
    { href: '/school-profile', label: 'Profil Sekolah', icon: Building2 },
    { href: '/guest-book', label: 'Laporan Tamu', icon: BookUser },
    { href: '/bk', label: 'BK & Kedisiplinan', icon: Shield },
    { href: '/boarding', label: 'Asrama', icon: BedDouble },
    { href: '/finance/catalog', label: 'Katalog Biaya', icon: BookOpen },
    { href: '/tickets', label: 'Tiket & CRM', icon: ClipboardList },
    { href: '/reports', label: 'Laporan', icon: FileText },
    { href: '/messages', label: 'Pesan', icon: MessageSquare },
  ],
  [UserRole.PRINCIPAL]: [
    { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/profile', label: 'Profil', icon: User },
    { href: '/users', label: 'Pengguna', icon: Users },
    { href: '/role-management', label: 'Kelola Peran', icon: Settings },
    { href: '/classes', label: 'Kelas', icon: GraduationCap },
    { href: '/subjects', label: 'Mata Pelajaran', icon: BookMarked },
    { href: '/years', label: 'Tahun Ajaran', icon: Calendar },
    { href: '/majors', label: 'Jurusan', icon: Building2 },
    { href: '/schedules', label: 'Jadwal', icon: Calendar },
    { href: '/attendance', label: 'Kehadiran', icon: ClipboardCheck },
    { href: '/beasiswa', label: 'Beasiswa', icon: Award },
    { href: '/pos', label: 'POS', icon: Banknote },
    { href: '/finance/catalog', label: 'Katalog Biaya', icon: BookOpen },
    { href: '/finance/reports', label: 'Laporan Keuangan', icon: Wallet },
    { href: '/cash-flow', label: 'Cash Flow', icon: Wallet },
    { href: '/reports', label: 'Laporan', icon: FileText },
    { href: '/guest-book', label: 'Laporan Tamu', icon: BookUser },
    { href: '/bk', label: 'BK & Kedisiplinan', icon: Shield },
    { href: '/school-profile', label: 'Profil Sekolah', icon: Building2 },
    { href: '/boarding', label: 'Asrama', icon: BedDouble },
    { href: '/messages', label: 'Pesan', icon: MessageSquare },
    { href: '/tickets', label: 'Tiket & CRM', icon: ClipboardList },
  ],
  [UserRole.SECURITY]: [
    { href: '/guest-book', label: 'Buku Tamu', icon: BookUser },
    { href: '/profile', label: 'Profil', icon: User },
  ],
  [UserRole.FINANCE]: [
    { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/profile', label: 'Profil', icon: User },
    { href: '/pos', label: 'POS', icon: Banknote },
    { href: '/finance/catalog', label: 'Katalog Biaya', icon: BookOpen },
    { href: '/invoices', label: 'Tagihan', icon: CreditCard },
    { href: '/finance/reports', label: 'Laporan Keuangan', icon: Wallet },
    { href: '/messages', label: 'Pesan', icon: MessageSquare },
  ],
};

const MENU_PRIORITY: UserRole[] = [
  UserRole.SAAS_ADMIN,
  UserRole.KETUA_YAYASAN,
  UserRole.KETUA_PESANTREN,
  UserRole.PRINCIPAL,
  UserRole.WAKASEK_KURIKULUM,
  UserRole.WAKASEK_KESISWAAN,
  UserRole.WAKASEK_SARANA,
  UserRole.KEPALA_PROGRAM_KEAHLIAN,
  UserRole.KOORDINATOR_BK_ESKUL,
  UserRole.KOORDINATOR_LAB_PERPUS,
  UserRole.KAPRODI,
  UserRole.STAFF,
  UserRole.SECURITY,
  UserRole.FINANCE,
  UserRole.HOMEROOM_TEACHER,
  UserRole.GURU_PRODUKTIF,
  UserRole.TEACHER,
  UserRole.PARENT,
  UserRole.STUDENT,
];

function getPrimaryMenuRole(user: { role?: string; roles?: string[] }): UserRole {
  const effective = getEffectiveRoles(user);
  for (const r of MENU_PRIORITY) {
    if (effective.includes(r)) return r;
  }
  return (user.role as UserRole) ?? UserRole.STUDENT;
}

export default function DashboardLayout({ children, user: layoutUser }: DashboardLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [user, setUser] = useState<any>(null);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    setUser(firebaseAuthService.getCurrentUser());
  }, []);

  const handleLogout = () => {
    firebaseAuthService.logout();
    router.push('/login');
  };

  const { logo: schoolLogo, name: schoolName, isPlatformAdmin } = useDisplaySchool();
  const primaryRole = getPrimaryMenuRole(layoutUser);
  const staffMenu = menuItems[UserRole.STAFF] ?? [];
  const teacherMenu = menuItems[UserRole.TEACHER] ?? [];
  const items =
    menuItems[primaryRole] ??
    ([UserRole.WAKASEK_KURIKULUM, UserRole.WAKASEK_KESISWAAN, UserRole.WAKASEK_SARANA, UserRole.KEPALA_PROGRAM_KEAHLIAN, UserRole.KOORDINATOR_BK_ESKUL, UserRole.KOORDINATOR_LAB_PERPUS, UserRole.KAPRODI].includes(primaryRole as UserRole)
      ? staffMenu
      : primaryRole === UserRole.GURU_PRODUKTIF
        ? teacherMenu
        : staffMenu);

  return (
    <NotificationsProvider>
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
            {isPlatformAdmin ? (
              <>
                <BrandLogo
                  width={100}
                  height={32}
                  textClassName="font-heading text-base font-bold text-primary-600 text-center leading-tight"
                />
                <p className="text-xs text-center text-gray-600 mt-2 font-medium">{brand.name}</p>
              </>
            ) : (
              <>
                <SchoolLogo
                  logo={schoolLogo}
                  name={schoolName}
                  width={88}
                  height={32}
                  textClassName="font-heading text-base font-bold text-primary-600 text-center leading-tight"
                />
                {schoolName && (
                  <p className="text-xs text-center text-gray-600 mt-2 font-medium">{schoolName}</p>
                )}
              </>
            )}
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
              <p className="text-xs text-gray-500">
                {layoutUser ? getEffectiveRoles(layoutUser).map((r) => ROLE_LABELS[r] ?? r).join(', ') : ''}
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
            <div className="flex-1 flex items-center min-w-0 px-2 lg:px-4">
              <UnitSwitcher />
            </div>
            <div className="flex flex-wrap items-center gap-3 justify-end shrink-0">
              <NotificationBell />
              {layoutUser && getEffectiveRoles(layoutUser).includes(UserRole.SAAS_ADMIN) && <SchoolSwitcher />}
              <div className="text-right hidden sm:block">
                <p className="text-sm font-medium text-gray-900">{user?.name}</p>
                <p className="text-xs text-gray-500">
                  {layoutUser ? getEffectiveRoles(layoutUser).map((r) => ROLE_LABELS[r] ?? r).join(', ') : ''}
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
        <main className="min-h-[calc(100vh-4rem)] flex flex-col">
          <div className="flex-1 p-4 sm:p-6 lg:p-8">{children}</div>
          <PoweredByFooter schoolName={schoolName} />
        </main>
      </div>

      {layoutUser && <ChatFab user={layoutUser} />}
    </div>
    </NotificationsProvider>
  );
}

