'use client';

import { useEffect, useState } from 'react';
import ProtectedRoute from '@/components/Auth/ProtectedRoute';
import { UserRole } from '@/lib/types';
import { useAuth } from '@/hooks/useAuth';
import { formatCurrency, formatIDR } from '@aksara/formatters';
import { formatDate, formatDateTime } from '@aksara/formatters';
import api from '@/lib/aksara-api';
import {
  FileText,
  Download,
  Calendar,
  Users,
  CreditCard,
  ClipboardCheck,
  TrendingUp,
  BarChart3,
  Filter,
  Search
} from 'lucide-react';

type ReportType = 'attendance' | 'payments' | 'students' | 'academic' | 'dashboard';

interface ReportData {
  data?: any[];
  statistics?: any;
  overview?: {
    totalStudents: number;
    totalTeachers: number;
    totalClasses: number;
  };
  attendance?: {
    total: number;
    present: number;
    rate: number;
  };
  payments?: {
    totalInvoices: number;
    paidInvoices: number;
    totalAmount: number;
    totalPaid: number;
    paymentRate: string;
  };
  activities?: {
    total: number;
  };
  period?: {
    startDate: Date;
    endDate: Date;
  };
}

// Using @aksara/formatters for currency and date formatting

export default function ReportsPage() {
  const { user } = useAuth();
  const [reportType, setReportType] = useState<ReportType>('dashboard');
  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [filters, setFilters] = useState({
    startDate: '',
    endDate: '',
    classId: '',
    studentId: '',
    status: ''
  });
  const [classes, setClasses] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);

  // Set default date range (last 30 days)
  useEffect(() => {
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - 30);
    setFilters(prev => ({
      ...prev,
      startDate: start.toISOString().split('T')[0],
      endDate: end.toISOString().split('T')[0]
    }));
  }, []);

  // Fetch classes and students for filters
  useEffect(() => {
    const fetchFilters = async () => {
      try {
        if (user?.role === UserRole.STAFF || user?.role === UserRole.PRINCIPAL || user?.role === UserRole.FINANCE) {
          const [classesData, studentsData] = await Promise.all([
            api.get<any[]>('/classes'),
            api.get<any[]>('/users', { params: { role: 'student' } })
          ]);
          setClasses(classesData);
          setStudents(studentsData);
        }
      } catch (error) {
        console.error('Error fetching filter data:', error);
      }
    };
    fetchFilters();
  }, [user]);

  const fetchReport = async () => {
    setLoading(true);
    try {
      const params: any = {};
      if (filters.startDate) params.startDate = filters.startDate;
      if (filters.endDate) params.endDate = filters.endDate;
      if (filters.classId) params.classId = filters.classId;
      if (filters.studentId) params.studentId = filters.studentId;
      if (filters.status) params.status = filters.status;

      const reportDataResult = await api.get<ReportData>(`/reports/${reportType}`, { params });
      setReportData(reportDataResult);
    } catch (error) {
      console.error('Error fetching report:', error);
      alert('Gagal memuat laporan');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (reportType) {
      fetchReport();
    }
  }, [reportType, filters]);

  const exportReport = () => {
    if (!reportData || !reportData.data) return;

    let csv = '';

    switch (reportType) {
      case 'attendance':
        csv = 'Tanggal,Nama Siswa,Kelas,Status,Waktu Masuk\n';
        reportData.data.forEach((item: any) => {
          csv += `${formatDate(item.date)},${item.userId?.name || '-'},${item.classId?.name || '-'},${item.status},${item.checkInTime ? formatDate(item.checkInTime) : '-'}\n`;
        });
        break;
      case 'payments':
        csv = 'No Invoice,Siswa,Orang Tua,Jumlah,Status,Tanggal Jatuh Tempo\n';
        reportData.data.forEach((item: any) => {
          csv += `${item.invoiceNumber},${item.studentId?.name || '-'},${item.parentId?.name || '-'},${item.amount},${item.status},${formatDate(item.dueDate)}\n`;
        });
        break;
      case 'students':
        csv = 'NIS,Nama,Kelas,Tahun,Jurusan\n';
        reportData.data.forEach((item: any) => {
          csv += `${item.studentId || '-'},${item.name},${item.classId?.name || '-'},${item.year || '-'},${item.major || '-'}\n`;
        });
        break;
      case 'academic':
        csv = 'Tanggal,Siswa,Kelas,Tipe Aktivitas,Judul\n';
        reportData.data.forEach((item: any) => {
          csv += `${formatDate(item.date)},${item.studentId?.name || '-'},${item.classId?.name || '-'},${item.type},${item.title}\n`;
        });
        break;
    }

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `laporan_${reportType}_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const reportTypes = [
    { id: 'dashboard' as ReportType, label: 'Dashboard', icon: BarChart3, roles: [UserRole.PRINCIPAL, UserRole.STAFF, UserRole.FINANCE] },
    { id: 'attendance' as ReportType, label: 'Laporan Kehadiran', icon: ClipboardCheck, roles: [UserRole.STUDENT, UserRole.PARENT, UserRole.TEACHER, UserRole.STAFF, UserRole.PRINCIPAL] },
    { id: 'payments' as ReportType, label: 'Laporan Pembayaran', icon: CreditCard, roles: [UserRole.PARENT, UserRole.FINANCE, UserRole.STAFF, UserRole.PRINCIPAL] },
    { id: 'students' as ReportType, label: 'Laporan Siswa', icon: Users, roles: [UserRole.STAFF, UserRole.PRINCIPAL] },
    { id: 'academic' as ReportType, label: 'Laporan Akademik', icon: FileText, roles: [UserRole.STUDENT, UserRole.PARENT, UserRole.TEACHER, UserRole.STAFF, UserRole.PRINCIPAL] }
  ].filter(rt => rt.roles.includes(user?.role as UserRole));

  return (
    <ProtectedRoute>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Laporan</h1>
            <p className="text-gray-600 mt-2">Lihat dan ekspor berbagai laporan sekolah</p>
          </div>
          {reportData && ((reportData.data && reportData.data.length > 0) || reportData.overview) && (
            <button
              onClick={exportReport}
              className="bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 flex items-center space-x-2"
            >
              <Download className="w-5 h-5" />
              <span>Ekspor CSV</span>
            </button>
          )}
        </div>

        {/* Report Type Tabs */}
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex flex-wrap gap-2">
            {reportTypes.map((type) => {
              const Icon = type.icon;
              return (
                <button
                  key={type.id}
                  onClick={() => setReportType(type.id)}
                  className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
                    reportType === type.id
                      ? 'bg-primary-100 text-primary-700 font-medium'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <span>{type.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center space-x-2 mb-4">
            <Filter className="w-5 h-5 text-gray-600" />
            <h2 className="text-lg font-semibold text-gray-900">Filter</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tanggal Mulai</label>
              <input
                type="date"
                value={filters.startDate}
                onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-gray-900 bg-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tanggal Akhir</label>
              <input
                type="date"
                value={filters.endDate}
                onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-gray-900 bg-white"
              />
            </div>
            {(user?.role === UserRole.STAFF || user?.role === UserRole.PRINCIPAL || user?.role === UserRole.FINANCE) && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Kelas</label>
                  <select
                    value={filters.classId}
                    onChange={(e) => setFilters({ ...filters, classId: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-gray-900 bg-white"
                  >
                    <option value="">Semua Kelas</option>
                    {classes.map((cls) => (
                      <option key={cls._id} value={cls._id}>
                        {cls.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Siswa</label>
                  <select
                    value={filters.studentId}
                    onChange={(e) => setFilters({ ...filters, studentId: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-gray-900 bg-white"
                  >
                    <option value="">Semua Siswa</option>
                    {students.map((student) => (
                      <option key={student._id} value={student._id}>
                        {student.name} ({student.studentId})
                      </option>
                    ))}
                  </select>
                </div>
              </>
            )}
            {reportType === 'payments' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <select
                  value={filters.status}
                  onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-gray-900 bg-white"
                >
                  <option value="">Semua Status</option>
                  <option value="pending">Pending</option>
                  <option value="partial">Partial</option>
                  <option value="paid">Paid</option>
                  <option value="overdue">Overdue</option>
                </select>
              </div>
            )}
          </div>
        </div>

        {/* Report Content */}
        {loading ? (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Memuat laporan...</p>
          </div>
        ) : reportData ? (
          <div className="space-y-6">
            {/* Statistics Cards */}
            {reportData.statistics && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {reportType === 'attendance' && reportData.statistics && (
                  <>
                    <div className="bg-white rounded-lg shadow p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-gray-600">Total Kehadiran</p>
                          <p className="text-2xl font-bold text-gray-900 mt-2">{reportData.statistics.total}</p>
                        </div>
                        <div className="bg-blue-100 p-3 rounded-lg">
                          <ClipboardCheck className="w-6 h-6 text-blue-600" />
                        </div>
                      </div>
                    </div>
                    <div className="bg-white rounded-lg shadow p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-gray-600">Hadir</p>
                          <p className="text-2xl font-bold text-green-600 mt-2">{reportData.statistics.present}</p>
                        </div>
                        <div className="bg-green-100 p-3 rounded-lg">
                          <TrendingUp className="w-6 h-6 text-green-600" />
                        </div>
                      </div>
                    </div>
                    <div className="bg-white rounded-lg shadow p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-gray-600">Terlambat</p>
                          <p className="text-2xl font-bold text-yellow-600 mt-2">{reportData.statistics.late}</p>
                        </div>
                        <div className="bg-yellow-100 p-3 rounded-lg">
                          <Calendar className="w-6 h-6 text-yellow-600" />
                        </div>
                      </div>
                    </div>
                    <div className="bg-white rounded-lg shadow p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-gray-600">Tingkat Kehadiran</p>
                          <p className="text-2xl font-bold text-gray-900 mt-2">{reportData.statistics.attendanceRate}%</p>
                        </div>
                        <div className="bg-primary-100 p-3 rounded-lg">
                          <BarChart3 className="w-6 h-6 text-primary-600" />
                        </div>
                      </div>
                    </div>
                  </>
                )}

                {reportType === 'payments' && reportData.statistics && (
                  <>
                    <div className="bg-white rounded-lg shadow p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-gray-600">Total Invoice</p>
                          <p className="text-2xl font-bold text-gray-900 mt-2">{reportData.statistics.totalInvoices}</p>
                        </div>
                        <div className="bg-blue-100 p-3 rounded-lg">
                          <FileText className="w-6 h-6 text-blue-600" />
                        </div>
                      </div>
                    </div>
                    <div className="bg-white rounded-lg shadow p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-gray-600">Total Jumlah</p>
                          <p className="text-xl font-bold text-gray-900 mt-2">{formatCurrency(reportData.statistics.totalAmount)}</p>
                        </div>
                        <div className="bg-green-100 p-3 rounded-lg">
                          <CreditCard className="w-6 h-6 text-green-600" />
                        </div>
                      </div>
                    </div>
                    <div className="bg-white rounded-lg shadow p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-gray-600">Total Dibayar</p>
                          <p className="text-xl font-bold text-green-600 mt-2">{formatCurrency(reportData.statistics.totalPaid)}</p>
                        </div>
                        <div className="bg-green-100 p-3 rounded-lg">
                          <TrendingUp className="w-6 h-6 text-green-600" />
                        </div>
                      </div>
                    </div>
                    <div className="bg-white rounded-lg shadow p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-gray-600">Tingkat Pembayaran</p>
                          <p className="text-2xl font-bold text-gray-900 mt-2">{reportData.statistics.paymentRate}%</p>
                        </div>
                        <div className="bg-primary-100 p-3 rounded-lg">
                          <BarChart3 className="w-6 h-6 text-primary-600" />
                        </div>
                      </div>
                    </div>
                  </>
                )}

                {reportType === 'dashboard' && reportData && (
                  <>
                    <div className="bg-white rounded-lg shadow p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-gray-600">Total Siswa</p>
                          <p className="text-2xl font-bold text-gray-900 mt-2">{reportData.overview?.totalStudents || 0}</p>
                        </div>
                        <div className="bg-blue-100 p-3 rounded-lg">
                          <Users className="w-6 h-6 text-blue-600" />
                        </div>
                      </div>
                    </div>
                    <div className="bg-white rounded-lg shadow p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-gray-600">Total Guru</p>
                          <p className="text-2xl font-bold text-gray-900 mt-2">{reportData.overview?.totalTeachers || 0}</p>
                        </div>
                        <div className="bg-green-100 p-3 rounded-lg">
                          <Users className="w-6 h-6 text-green-600" />
                        </div>
                      </div>
                    </div>
                    <div className="bg-white rounded-lg shadow p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-gray-600">Tingkat Kehadiran</p>
                          <p className="text-2xl font-bold text-gray-900 mt-2">{reportData.attendance?.rate || 0}%</p>
                        </div>
                        <div className="bg-yellow-100 p-3 rounded-lg">
                          <ClipboardCheck className="w-6 h-6 text-yellow-600" />
                        </div>
                      </div>
                    </div>
                    <div className="bg-white rounded-lg shadow p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-gray-600">Tingkat Pembayaran</p>
                          <p className="text-2xl font-bold text-gray-900 mt-2">{reportData.payments?.paymentRate || 0}%</p>
                        </div>
                        <div className="bg-primary-100 p-3 rounded-lg">
                          <CreditCard className="w-6 h-6 text-primary-600" />
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Data Table */}
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900">
                  {reportType === 'attendance' && 'Data Kehadiran'}
                  {reportType === 'payments' && 'Data Pembayaran'}
                  {reportType === 'students' && 'Data Siswa'}
                  {reportType === 'academic' && 'Data Akademik'}
                  {reportType === 'dashboard' && 'Ringkasan Dashboard'}
                </h2>
              </div>
              <div className="overflow-x-auto">
                {(reportData.data && reportData.data.length > 0) || reportData.overview ? (
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        {reportType === 'attendance' && (
                          <>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tanggal</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nama</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Kelas</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Waktu Masuk</th>
                          </>
                        )}
                        {reportType === 'payments' && (
                          <>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">No Invoice</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Siswa</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Orang Tua</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Jumlah</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Jatuh Tempo</th>
                          </>
                        )}
                        {reportType === 'students' && (
                          <>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">NIS</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nama</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Kelas</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tahun</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Jurusan</th>
                          </>
                        )}
                        {reportType === 'academic' && (
                          <>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tanggal</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Siswa</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Kelas</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tipe</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Judul</th>
                          </>
                        )}
                        {reportType === 'dashboard' && (
                          <>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Metrik</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nilai</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Detail</th>
                          </>
                        )}
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {reportType === 'attendance' && reportData.data && reportData.data.map((item: any, index: number) => (
                        <tr key={index}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{formatDate(item.date)}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{item.userId?.name || '-'}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.classId?.name || '-'}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm">
                            <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                              item.status === 'present' ? 'bg-green-100 text-green-800' :
                              item.status === 'late' ? 'bg-yellow-100 text-yellow-800' :
                              'bg-red-100 text-red-800'
                            }`}>
                              {item.status === 'present' ? 'Hadir' : item.status === 'late' ? 'Terlambat' : 'Tidak Hadir'}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {item.checkInTime ? formatDate(item.checkInTime) : '-'}
                          </td>
                        </tr>
                      ))}
                      {reportType === 'payments' && reportData.data && reportData.data.map((item: any, index: number) => (
                        <tr key={index}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{item.invoiceNumber}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{item.studentId?.name || '-'}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.parentId?.name || '-'}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{formatCurrency(item.amount)}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm">
                            <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                              item.status === 'paid' ? 'bg-green-100 text-green-800' :
                              item.status === 'partial' ? 'bg-yellow-100 text-yellow-800' :
                              item.status === 'overdue' ? 'bg-red-100 text-red-800' :
                              'bg-gray-100 text-gray-800'
                            }`}>
                              {item.status === 'paid' ? 'Lunas' : item.status === 'partial' ? 'Sebagian' : item.status === 'overdue' ? 'Terlambat' : 'Pending'}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{formatDate(item.dueDate)}</td>
                        </tr>
                      ))}
                      {reportType === 'students' && reportData.data && reportData.data.map((item: any, index: number) => (
                        <tr key={index}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{item.studentId || '-'}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{item.name}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.classId?.name || '-'}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.year || '-'}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.major || '-'}</td>
                        </tr>
                      ))}
                      {reportType === 'academic' && reportData.data && reportData.data.map((item: any, index: number) => (
                        <tr key={index}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{formatDate(item.date)}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{item.studentId?.name || '-'}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.classId?.name || '-'}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 capitalize">{item.type}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{item.title}</td>
                        </tr>
                      ))}
                      {reportType === 'dashboard' && (
                        <>
                          <tr>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">Total Siswa</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{reportData.overview?.totalStudents || 0}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">Siswa aktif</td>
                          </tr>
                          <tr>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">Total Guru</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{reportData.overview?.totalTeachers || 0}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">Guru aktif</td>
                          </tr>
                          <tr>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">Total Kelas</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{reportData.overview?.totalClasses || 0}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">Kelas aktif</td>
                          </tr>
                          <tr>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">Tingkat Kehadiran</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{reportData.attendance?.rate || 0}%</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{reportData.attendance?.present || 0} dari {reportData.attendance?.total || 0}</td>
                          </tr>
                          <tr>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">Tingkat Pembayaran</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{reportData.payments?.paymentRate || 0}%</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{formatCurrency(reportData.payments?.totalPaid || 0)} dari {formatCurrency(reportData.payments?.totalAmount || 0)}</td>
                          </tr>
                        </>
                      )}
                    </tbody>
                  </table>
                ) : (
                  <div className="p-12 text-center">
                    <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500">Tidak ada data untuk ditampilkan</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">Pilih jenis laporan untuk melihat data</p>
          </div>
        )}
      </div>
    </ProtectedRoute>
  );
}
