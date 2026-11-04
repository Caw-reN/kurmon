import { useState, useEffect, useCallback, useMemo } from 'react';
import { Button, Modal, UISelect } from '../../../components/ui.jsx';
import { 
  KeyRound, ShieldCheck, Shield, Key, History, Search, 
  RefreshCw, CheckCircle2, AlertTriangle, Download, 
  Lock, Copy, Check, Eye, EyeOff, User, GraduationCap, 
  Briefcase, BookOpen, Clock, AlertCircle, Filter
} from 'lucide-react';
import { PageHeader } from '../../../components/monitoring/ui/index.js';
import useAuthStore from '../../../store/monitoring/authStore.js';

export default function TabLogPassword(props) {
  const { 
    currentUser, 
    activeTab, 
    setActiveTab, 
    showNotification,
    teachers = [],
    staffs = [],
    students = [],
    adminUser,
    saveDatabaseNow,
    syncAuthSnapshotNow,
    setTeachers,
    setStaffs,
    isSuperAdminRole
  } = props;

  // Resolve admin authorization robustly
  const authUser = useAuthStore(state => state.user);
  const activeRole = String(currentUser?.role || authUser?.role || '').toLowerCase();
  const isAdmin = activeRole === 'admin' || activeRole === 'superadmin' || activeRole === 'super_admin' || (typeof isSuperAdminRole === 'function' && isSuperAdminRole(activeRole));

  // Resolve auth token robustly from props, authStore, or browser storage
  const getAuthToken = () => {
    if (currentUser?.authToken) return currentUser.authToken;
    const storeToken = useAuthStore.getState().user?.authToken;
    if (storeToken) return storeToken;
    try {
      const raw = sessionStorage.getItem('school_schedule_session_v1') || localStorage.getItem('school_schedule_session_v1');
      if (raw) return JSON.parse(raw)?.authToken;
    } catch {}
    return null;
  };

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState([]);
  const [summary, setSummary] = useState({
    totalAll: 0,
    totalChanged: 0,
    totalDefault: 0,
    adoptionPct: 0,
    breakdown: {
      admin: { total: 0, changed: 0, default: 0 },
      guru: { total: 0, changed: 0, default: 0 },
      karyawan: { total: 0, changed: 0, default: 0 },
      siswa: { total: 0, changed: 0, default: 0 }
    }
  });

  const [pagination, setPagination] = useState({
    page: 1,
    limit: 50,
    total: 0,
    totalPages: 1
  });

  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  // Modal Reset Password
  const [resetModalUser, setResetModalUser] = useState(null);
  const [newPassword, setNewPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [copied, setCopied] = useState(false);

  // Local fallback aggregation from props
  const localUsers = useMemo(() => {
    const list = [];
    if (adminUser) {
      list.push({
        id: 'admin',
        code: adminUser.username || 'admin',
        name: adminUser.name || 'Super Administrator',
        category: 'Admin',
        role: 'superadmin',
        subrole: '',
        division: '',
        extraInfo: 'Super Administrator',
        hasChangedPassword: adminUser.hasChangedPassword === true,
        passwordChangedAt: adminUser.passwordChangedAt || null,
        phone: adminUser.phone || adminUser.hp || ''
      });
    }
    (teachers || []).forEach(t => {
      list.push({
        id: t.id,
        code: String(t.code || t.nip || t.id || '').trim(),
        name: t.name || t.nama || 'Guru',
        category: 'Guru',
        role: t.role || 'guru',
        subrole: t.subrole || '',
        division: t.division || '',
        extraInfo: t.subject || t.mapel || t.type || 'Guru Pengajar',
        hasChangedPassword: t.hasChangedPassword === true,
        passwordChangedAt: t.passwordChangedAt || null,
        phone: t.phone || t.hp || t.whatsapp || ''
      });
    });
    (staffs || []).forEach(s => {
      list.push({
        id: s.id,
        code: String(s.staff_code || s.code || s.nip || s.id || '').trim(),
        name: s.name || s.nama || 'Staf / Karyawan',
        category: 'Karyawan',
        role: s.role || 'karyawan',
        subrole: s.subrole || '',
        division: s.division || s.divisi || '',
        extraInfo: s.division || s.divisi || 'Tenaga Kependidikan',
        hasChangedPassword: s.hasChangedPassword === true,
        passwordChangedAt: s.passwordChangedAt || null,
        phone: s.phone || s.hp || s.whatsapp || ''
      });
    });
    (students || []).forEach(s => {
      list.push({
        id: s.id,
        code: String(s.nis || s.nisn || s.code || s.id || '').trim(),
        name: s.name || s.nama || 'Siswa',
        category: 'Siswa',
        role: 'siswa',
        subrole: '',
        division: '',
        extraInfo: s.kelas || s.class_name || s.jurusan || 'Siswa',
        hasChangedPassword: s.hasChangedPassword === true,
        passwordChangedAt: s.passwordChangedAt || null,
        phone: s.phone || s.hp || s.whatsapp || ''
      });
    });
    return list;
  }, [adminUser, teachers, staffs, students]);

  // Fetch data from server with automatic local fallback
  const fetchLogs = useCallback(async (targetPage = 1) => {
    setLoading(true);
    const token = getAuthToken();
    let serverSuccess = false;

    try {
      const params = new URLSearchParams({
        page: String(targetPage),
        limit: String(pagination.limit),
        category: categoryFilter,
        status: statusFilter,
        search: search.trim()
      });

      const res = await fetch(`/api/auth/password-status-logs?${params.toString()}`, {
        headers: {
          'Authorization': token ? `Bearer ${token}` : ''
        }
      });
      const result = await res.json();
      if (result.ok && Array.isArray(result.data)) {
        setData(result.data);
        if (result.summary) setSummary(result.summary);
        if (result.pagination) setPagination(result.pagination);
        serverSuccess = true;
      }
    } catch (err) {
      console.warn('API fetch password-status-logs fallback:', err);
    }

    // If server request was not successful, seamlessly compute from local memory store
    if (!serverSuccess) {
      let filtered = [...localUsers];
      if (categoryFilter !== 'all') {
        filtered = filtered.filter(u => u.category.toLowerCase() === categoryFilter.toLowerCase());
      }
      if (statusFilter === 'changed') {
        filtered = filtered.filter(u => u.hasChangedPassword === true);
      } else if (statusFilter === 'default') {
        filtered = filtered.filter(u => !u.hasChangedPassword);
      }
      if (search.trim()) {
        const q = search.trim().toLowerCase();
        filtered = filtered.filter(u => 
          (u.name && u.name.toLowerCase().includes(q)) ||
          (u.code && String(u.code).toLowerCase().includes(q)) ||
          (u.extraInfo && u.extraInfo.toLowerCase().includes(q))
        );
      }

      const totalAll = localUsers.length;
      const totalChanged = localUsers.filter(u => u.hasChangedPassword).length;
      const totalDefault = totalAll - totalChanged;
      const adoptionPct = totalAll > 0 ? Math.round((totalChanged / totalAll) * 100) : 0;
      const breakdown = {
        admin: { total: localUsers.filter(u => u.category === 'Admin').length, changed: localUsers.filter(u => u.category === 'Admin' && u.hasChangedPassword).length, default: localUsers.filter(u => u.category === 'Admin' && !u.hasChangedPassword).length },
        guru: { total: localUsers.filter(u => u.category === 'Guru').length, changed: localUsers.filter(u => u.category === 'Guru' && u.hasChangedPassword).length, default: localUsers.filter(u => u.category === 'Guru' && !u.hasChangedPassword).length },
        karyawan: { total: localUsers.filter(u => u.category === 'Karyawan').length, changed: localUsers.filter(u => u.category === 'Karyawan' && u.hasChangedPassword).length, default: localUsers.filter(u => u.category === 'Karyawan' && !u.hasChangedPassword).length },
        siswa: { total: localUsers.filter(u => u.category === 'Siswa').length, changed: localUsers.filter(u => u.category === 'Siswa' && u.hasChangedPassword).length, default: localUsers.filter(u => u.category === 'Siswa' && !u.hasChangedPassword).length }
      };

      setSummary({ totalAll, totalChanged, totalDefault, adoptionPct, breakdown });

      const total = filtered.length;
      const limit = pagination.limit;
      const totalPages = Math.max(1, Math.ceil(total / limit));
      const offset = (targetPage - 1) * limit;
      const paged = filtered.slice(offset, offset + limit);

      setData(paged);
      setPagination({ page: targetPage, limit, total, totalPages });
    }

    setLoading(false);
  }, [categoryFilter, statusFilter, search, pagination.limit, localUsers]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchLogs(1);
    }, 200);
    return () => clearTimeout(timer);
  }, [search, categoryFilter, statusFilter, localUsers.length]);

  // Handle direct reset action
  const handleResetPassword = async (resetToDefault = false) => {
    if (!resetModalUser) return;
    if (!resetToDefault && !newPassword.trim()) {
      if (showNotification) showNotification('Kata sandi baru tidak boleh kosong.', 'warning');
      return;
    }
    if (!resetToDefault && newPassword.trim().length < 6) {
      if (showNotification) showNotification('Kata sandi baru minimal 6 karakter.', 'warning');
      return;
    }

    setIsSubmitting(true);
    const token = getAuthToken();

    try {
      const res = await fetch('/api/auth/reset-user-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token ? `Bearer ${token}` : ''
        },
        body: JSON.stringify({
          userId: resetModalUser.code || resetModalUser.id,
          category: resetModalUser.category.toLowerCase(),
          newPassword: newPassword.trim(),
          resetToDefault
        })
      });

      const result = await res.json();
      if (result.ok) {
        if (showNotification) showNotification(result.message || 'Kata sandi berhasil diperbarui.', 'success');
        
        // Synchronize in local store as well
        const cat = resetModalUser.category.toLowerCase();
        const nowIso = new Date().toISOString();
        if (cat === 'guru' && setTeachers) {
          const next = teachers.map(t => (t.code === resetModalUser.code || t.id === resetModalUser.id) ? { ...t, hasChangedPassword: !resetToDefault, passwordChangedAt: nowIso } : t);
          setTeachers(next);
          if (saveDatabaseNow) await saveDatabaseNow({ teachers: next }, 'Admin reset password guru');
        } else if (cat === 'karyawan' && setStaffs) {
          const next = staffs.map(s => (s.code === resetModalUser.code || s.staff_code === resetModalUser.code || s.id === resetModalUser.id) ? { ...s, hasChangedPassword: !resetToDefault, passwordChangedAt: nowIso } : s);
          setStaffs(next);
          if (saveDatabaseNow) await saveDatabaseNow({ staffs: next }, 'Admin reset password staf');
        }

        setResetModalUser(null);
        setNewPassword('');
        fetchLogs(pagination.page);
      } else {
        if (showNotification) showNotification(result.error || 'Gagal memperbarui kata sandi.', 'danger');
      }
    } catch (err) {
      console.error('Reset password error:', err);
      if (showNotification) showNotification('Terjadi kesalahan saat mereset kata sandi.', 'danger');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Export to CSV
  const handleExportCSV = () => {
    if (!data || data.length === 0) {
      if (showNotification) showNotification('Tidak ada data untuk diekspor.', 'warning');
      return;
    }

    const headers = ['No', 'Identitas/Kode', 'Nama', 'Kategori', 'Role/Kelas', 'Status Password', 'Waktu Terakhir Ganti'];
    const rows = data.map((u, i) => [
      i + 1,
      `"${u.code || ''}"`,
      `"${u.name || ''}"`,
      `"${u.category || ''}"`,
      `"${u.extraInfo || u.role || ''}"`,
      `"${u.hasChangedPassword ? 'Sudah Ganti' : 'Belum Pernah Ganti (Default)'}"`,
      `"${u.passwordChangedAt ? new Date(u.passwordChangedAt).toLocaleString('id-ID') : '-'}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `log_status_password_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    if (showNotification) showNotification('Daftar status password berhasil diekspor ke CSV.', 'success');
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!isAdmin) {
    return (
      <div className="p-8 text-center bg-white rounded-[var(--ui-radius-card,20px)] border border-rose-200 shadow-2xs">
        <AlertTriangle size={36} className="mx-auto text-rose-500 mb-2" />
        <h3 className="text-base font-black text-slate-800">Akses Ditolak</h3>
        <p className="text-xs text-slate-500 mt-1">Halaman ini hanya dapat diakses oleh Administrator.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 w-full animate-in fade-in duration-300 relative z-10 pb-16">
      
      {/* ── PAGE HEADER ── */}
      <PageHeader
        title="Log & Status Ganti Password"
        description="Pantau pengguna yang sudah memperbarui kata sandi mandiri dan akun yang masih menggunakan sandi bawaan (default). Hanya Admin yang memiliki hak akses."
        icon={KeyRound}
        tabs={[
          { id: "hak_akses", label: "Hak Akses & Role", icon: ShieldCheck },
          { id: "manajemen_role", label: "Struktur & Jabatan", icon: Shield },
          { id: "pengaturanuser", label: "Akun Pengguna", icon: Key },
          { id: "status_password", label: "Log Ganti Password", icon: KeyRound },
          { id: "audit_log", label: "Audit Log & Aktivitas", icon: History }
        ]}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        customButtons={
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => fetchLogs(pagination.page)}
              className="text-xs font-bold gap-1.5 bg-white shadow-2xs text-slate-700 hover:text-emerald-700"
              title="Sinkronkan data dengan server"
            >
              <RefreshCw size={13} className={loading ? "animate-spin text-emerald-600" : ""} />
              <span>Sinkronkan Data</span>
            </Button>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleExportCSV}
              className="text-xs font-bold gap-1.5 bg-white shadow-2xs text-slate-700 hover:text-indigo-700"
              title="Ekspor CSV"
            >
              <Download size={13} />
              <span>Ekspor CSV</span>
            </Button>
          </div>
        }
      />

      {/* ── KPI STATS CARDS ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Total Akun */}
        <div className="bg-white rounded-[var(--ui-radius-card,16px)] p-4 border border-slate-200/80 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Total Akun Terdaftar</span>
            <div className="text-2xl font-black text-slate-900 mt-1 leading-none">{summary.totalAll.toLocaleString('id-ID')}</div>
            <span className="text-[11px] font-semibold text-slate-500 mt-1 block">Guru, Staf, Siswa & Admin</span>
          </div>
          <div className="w-11 h-11 rounded-xl bg-slate-100 border border-slate-200/70 text-slate-700 flex items-center justify-center shrink-0 shadow-2xs">
            <User size={20} strokeWidth={2.4} />
          </div>
        </div>

        {/* Sudah Ganti Password */}
        <div className="bg-white rounded-[var(--ui-radius-card,16px)] p-4 border border-emerald-200/80 shadow-2xs flex items-center justify-between bg-gradient-to-br from-emerald-50/30 to-white">
          <div>
            <span className="text-[10px] font-black uppercase tracking-wider text-emerald-700">Sudah Ganti Sandi</span>
            <div className="text-2xl font-black text-emerald-900 mt-1 leading-none">{summary.totalChanged.toLocaleString('id-ID')}</div>
            <div className="flex items-center gap-1.5 mt-1">
              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800 text-[10px] font-black">
                {summary.adoptionPct}%
              </span>
              <span className="text-[11px] font-medium text-emerald-700">Tingkat Adopsi Mandiri</span>
            </div>
          </div>
          <div className="w-11 h-11 rounded-xl bg-emerald-100 border border-emerald-300 text-emerald-700 flex items-center justify-center shrink-0 shadow-2xs">
            <CheckCircle2 size={20} strokeWidth={2.4} />
          </div>
        </div>

        {/* Belum Pernah Ganti (Default / Rentan) */}
        <div className="bg-white rounded-[var(--ui-radius-card,16px)] p-4 border border-amber-200/80 shadow-2xs flex items-center justify-between bg-gradient-to-br from-amber-50/30 to-white">
          <div>
            <span className="text-[10px] font-black uppercase tracking-wider text-amber-700">Sandi Bawaan (Default)</span>
            <div className="text-2xl font-black text-amber-900 mt-1 leading-none">{summary.totalDefault.toLocaleString('id-ID')}</div>
            <span className="text-[11px] font-medium text-amber-700 mt-1 block">Rentan belum diperbarui</span>
          </div>
          <div className="w-11 h-11 rounded-xl bg-amber-100 border border-amber-300 text-amber-700 flex items-center justify-center shrink-0 shadow-2xs">
            <AlertTriangle size={20} strokeWidth={2.4} />
          </div>
        </div>

        {/* Rincian Per Kategori */}
        <div className="bg-white rounded-[var(--ui-radius-card,16px)] p-3.5 border border-slate-200/80 shadow-2xs flex flex-col justify-between">
          <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Rincian Per Kategori</span>
          <div className="grid grid-cols-2 gap-1.5 text-[11px] font-semibold text-slate-600 mt-1">
            <div className="flex justify-between items-center bg-slate-50 px-2 py-0.5 rounded">
              <span>Guru:</span>
              <span className="font-mono font-bold text-slate-800">{summary.breakdown.guru.changed}/{summary.breakdown.guru.total}</span>
            </div>
            <div className="flex justify-between items-center bg-slate-50 px-2 py-0.5 rounded">
              <span>Staf:</span>
              <span className="font-mono font-bold text-slate-800">{summary.breakdown.karyawan.changed}/{summary.breakdown.karyawan.total}</span>
            </div>
            <div className="flex justify-between items-center bg-slate-50 px-2 py-0.5 rounded">
              <span>Siswa:</span>
              <span className="font-mono font-bold text-slate-800">{summary.breakdown.siswa.changed}/{summary.breakdown.siswa.total}</span>
            </div>
            <div className="flex justify-between items-center bg-slate-50 px-2 py-0.5 rounded">
              <span>Admin:</span>
              <span className="font-mono font-bold text-emerald-700">{summary.breakdown.admin.changed}/{summary.breakdown.admin.total}</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── TOOLBAR: SEARCH & FILTERS ── */}
      <div className="bg-white rounded-[var(--ui-radius-card,16px)] p-3.5 border border-slate-200/80 shadow-2xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Search */}
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari nama, NIP / NIS / kode akun, atau keterangan..."
            className="w-full h-9 pl-9 pr-3 bg-slate-50 hover:bg-slate-100/70 focus:bg-white rounded-xl text-xs font-semibold text-slate-800 placeholder-slate-400 border border-slate-200/80 focus:border-emerald-500 focus:outline-none transition-all shadow-2xs"
          />
        </div>

        {/* Dropdown Filters */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Category Filter */}
          <UISelect
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="text-xs h-9 w-36"
          >
            <option value="all">Semua Kategori</option>
            <option value="guru">Hanya Guru</option>
            <option value="karyawan">Hanya Karyawan/Staf</option>
            <option value="siswa">Hanya Siswa</option>
            <option value="admin">Hanya SuperAdmin</option>
          </UISelect>

          {/* Status Filter */}
          <UISelect
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="text-xs h-9 w-44"
          >
            <option value="all">Semua Status Sandi</option>
            <option value="changed">Sudah Ganti Sandi</option>
            <option value="default">Sandi Bawaan (Default)</option>
          </UISelect>
        </div>
      </div>

      {/* ── DATA TABLE ── */}
      <div className="bg-white rounded-[var(--ui-radius-card,16px)] border border-slate-200/80 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left border-collapse">
            <thead className="bg-slate-50/90 text-[10px] font-black uppercase text-slate-400 border-b border-slate-200/80 tracking-wider">
              <tr>
                <th className="px-3 py-2.5 text-center w-12">No</th>
                <th className="px-3 py-2.5 text-center w-28">Kode / NIS</th>
                <th className="px-4 py-2.5">Nama Akun Pengguna</th>
                <th className="px-3 py-2.5 text-center">Kategori</th>
                <th className="px-4 py-2.5">Role / Keterangan</th>
                <th className="px-3 py-2.5 text-center">Status Sandi</th>
                <th className="px-4 py-2.5">Terakhir Diubah</th>
                <th className="px-4 py-2.5 text-right w-28">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
              {loading && data.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    <RefreshCw size={24} className="animate-spin mx-auto mb-2 text-emerald-500 opacity-70" />
                    <p className="font-bold text-xs">Memuat data status sandi...</p>
                  </td>
                </tr>
              ) : data.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400 bg-slate-50/30">
                    <Search size={32} className="mx-auto mb-2 opacity-30" />
                    <p className="font-bold">Tidak ada data pengguna yang cocok</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">Coba sesuaikan kata kunci pencarian atau filter kategori.</p>
                  </td>
                </tr>
              ) : (
                data.map((user, idx) => {
                  const num = (pagination.page - 1) * pagination.limit + idx + 1;
                  return (
                    <tr key={`${user.category}_${user.code || user.id}`} className="hover:bg-slate-50/60 transition-colors">
                      <td className="px-3 py-2.5 text-center font-bold text-slate-400">{num}</td>

                      {/* Code / NIS */}
                      <td className="px-3 py-2.5 text-center font-mono font-bold text-slate-700">
                        <span className="px-2 py-0.5 bg-slate-100 rounded text-[11px]">{user.code}</span>
                      </td>

                      {/* Name */}
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-2">
                          <div className={`w-7 h-7 rounded-full flex items-center justify-center font-black text-xs shrink-0 ${
                            user.category === 'Admin' ? 'bg-purple-100 text-purple-800' :
                            user.category === 'Guru' ? 'bg-indigo-100 text-indigo-800' :
                            user.category === 'Karyawan' ? 'bg-cyan-100 text-cyan-800' :
                            'bg-emerald-100 text-emerald-800'
                          }`}>
                            {(user.name || '?')[0].toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <span className="font-extrabold text-slate-800 block truncate leading-tight">{user.name}</span>
                            {user.phone && <span className="text-[10px] text-slate-400 font-mono">{user.phone}</span>}
                          </div>
                        </div>
                      </td>

                      {/* Category Badge */}
                      <td className="px-3 py-2.5 text-center">
                        <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                          user.category === 'Admin' ? 'bg-purple-50 text-purple-700 border border-purple-200' :
                          user.category === 'Guru' ? 'bg-indigo-50 text-indigo-700 border border-indigo-200' :
                          user.category === 'Karyawan' ? 'bg-cyan-50 text-cyan-700 border border-cyan-200' :
                          'bg-slate-100 text-slate-700 border border-slate-200'
                        }`}>
                          {user.category}
                        </span>
                      </td>

                      {/* Extra Info */}
                      <td className="px-4 py-2.5 text-slate-600 truncate max-w-[200px]" title={user.extraInfo}>
                        <span className="text-xs font-semibold">{user.extraInfo || '-'}</span>
                      </td>

                      {/* Password Status Badge */}
                      <td className="px-3 py-2.5 text-center">
                        {user.hasChangedPassword ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-[var(--ui-radius-small,8px)] text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200/80 shadow-2xs">
                            <CheckCircle2 size={11} className="text-emerald-500" strokeWidth={2.5} />
                            <span>Sudah Ganti</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-[var(--ui-radius-small,8px)] text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200/80 shadow-2xs">
                            <AlertTriangle size={11} className="text-amber-500" strokeWidth={2.5} />
                            <span>Default (Bawaan)</span>
                          </span>
                        )}
                      </td>

                      {/* Last Changed Timestamp */}
                      <td className="px-4 py-2.5 font-mono text-[11px] text-slate-500">
                        {user.passwordChangedAt ? (
                          <span className="flex items-center gap-1">
                            <Clock size={11} className="text-slate-400" />
                            {new Date(user.passwordChangedAt).toLocaleString('id-ID', { dateStyle: 'short', timeStyle: 'short' })}
                          </span>
                        ) : (
                          <span className="text-slate-400 italic text-[10px]">- Belum pernah -</span>
                        )}
                      </td>

                      {/* Action */}
                      <td className="px-4 py-2.5 text-right">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setResetModalUser(user);
                            setNewPassword('');
                          }}
                          className="h-7 px-2.5 text-[11px] font-bold text-slate-600 hover:text-emerald-700 gap-1 shadow-2xs bg-white"
                          title="Reset kata sandi pengguna ini"
                        >
                          <Lock size={11} />
                          <span>Reset</span>
                        </Button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        {pagination.totalPages > 1 && (
          <div className="p-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 bg-slate-50/50">
            <div>
              Menampilkan {((pagination.page - 1) * pagination.limit) + 1} - {Math.min(pagination.page * pagination.limit, pagination.total)} dari {pagination.total.toLocaleString('id-ID')} akun
            </div>
            <div className="flex items-center gap-1.5">
              <Button
                size="sm"
                variant="outline"
                disabled={pagination.page <= 1}
                onClick={() => fetchLogs(pagination.page - 1)}
                className="h-7 px-2.5 text-xs font-bold bg-white disabled:opacity-40"
              >
                Sebelumnya
              </Button>
              <span className="px-2 font-bold text-slate-700 text-xs">
                {pagination.page} / {pagination.totalPages}
              </span>
              <Button
                size="sm"
                variant="outline"
                disabled={pagination.page >= pagination.totalPages}
                onClick={() => fetchLogs(pagination.page + 1)}
                className="h-7 px-2.5 text-xs font-bold bg-white disabled:opacity-40"
              >
                Selanjutnya
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* ── MODAL DIRECT RESET PASSWORD ── */}
      {resetModalUser && (
        <Modal
          isOpen={Boolean(resetModalUser)}
          onClose={() => setResetModalUser(null)}
          title={`Reset Sandi: ${resetModalUser.name}`}
          size="md"
        >
          <div className="space-y-4 pt-1">
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 text-xs space-y-1">
              <div className="flex justify-between">
                <span className="text-slate-500">Nama Akun:</span>
                <span className="font-bold text-slate-800">{resetModalUser.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Kode / Identitas:</span>
                <span className="font-mono font-bold text-slate-800">{resetModalUser.code}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Kategori / Role:</span>
                <span className="font-bold text-indigo-700">{resetModalUser.category} ({resetModalUser.extraInfo || resetModalUser.role})</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Status Saat Ini:</span>
                <span className={`font-bold ${resetModalUser.hasChangedPassword ? 'text-emerald-700' : 'text-amber-700'}`}>
                  {resetModalUser.hasChangedPassword ? 'Sudah Pernah Ganti' : 'Default / Bawaan'}
                </span>
              </div>
            </div>

            {/* Input Sandi Baru */}
            <div>
              <label className="block text-xs font-black text-slate-700 mb-1.5 uppercase tracking-wider">
                Masukkan Kata Sandi Baru
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Ketik kata sandi kustom minimal 6 karakter..."
                  className="w-full h-10 pl-3.5 pr-10 rounded-xl bg-slate-50 border border-slate-200/80 text-xs font-semibold focus:outline-none focus:bg-white focus:border-emerald-500 transition-all shadow-2xs"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 border-none bg-transparent cursor-pointer"
                >
                  {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            {/* Actions */}
            <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2">
              <Button
                type="button"
                variant="outline"
                disabled={isSubmitting}
                onClick={() => handleResetPassword(true)}
                className="text-xs font-bold text-amber-700 hover:bg-amber-50 border-amber-300"
                title="Reset ke format bawaan (kode guru/staf atau NIS siswa)"
              >
                Reset ke Sandi Bawaan (Default)
              </Button>

              <div className="flex items-center gap-2 justify-end">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setResetModalUser(null)}
                  className="text-xs font-bold text-slate-500"
                >
                  Batal
                </Button>
                <Button
                  type="button"
                  disabled={isSubmitting || !newPassword.trim()}
                  onClick={() => handleResetPassword(false)}
                  className="text-xs font-bold gap-1 bg-emerald-600 hover:bg-emerald-700 text-white"
                >
                  {isSubmitting ? "Menyimpan..." : "Simpan Sandi Baru"}
                </Button>
              </div>
            </div>
          </div>
        </Modal>
      )}

    </div>
  );
}
