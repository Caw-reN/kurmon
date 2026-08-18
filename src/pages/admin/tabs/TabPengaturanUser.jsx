import { useState, useMemo } from 'react';
import { Button, Modal, UISelect } from '../../../components/ui.jsx';
import { useAppStore } from '../../../store/useAppStore.js';
import useFiturStore from '../../../store/monitoring/fiturStore.js';
import { 
  Users, ShieldCheck, Key, History, Shield, Edit2, Search, 
  Plus, Activity, Trash2, Lock, Sparkles, CheckCircle2, 
  AlertCircle, RefreshCw, Smartphone, UserPlus, Building2, 
  BookOpen, Briefcase, GraduationCap, Copy, Check
} from 'lucide-react';
import { PageHeader } from '../../../components/monitoring/ui/index.js';
import { hashPassword } from '../../../utils/auth.js';
import { getRoleKeyLabel, normalizeUserRole, getRoleOption, getWakaDivisionOption, WAKA_DIVISION_OPTIONS } from '../../../utils/constants.js';

export default function TabPengaturanUser(props) {
  const normalizeText = (value) => String(value ?? "").trim().replace(/\s+/g, "").toLowerCase();
  const sameText = (a, b) => normalizeText(a) === normalizeText(b);

  const { 
    teachers = [], 
    staffs = [], 
    setTeachers, 
    setStaffs, 
    adminUser, 
    openModal, 
    appSettings, 
    currentUser, 
    handleDelete, 
    saveDatabaseNow, 
    showNotification, 
    syncAuthSnapshotNow, 
    activeTab, 
    setActiveTab, 
    students = [], 
    setStudents 
  } = props;

  const [search, setSearch] = useState('');
  const [filterRole, setFilterRole] = useState('semua');
  const [filterSource, setFilterSource] = useState('semua'); // 'semua' | 'guru' | 'karyawan'

  // Admin Direct Reset Password Modal
  const [resetModalUser, setResetModalUser] = useState(null);
  const [manualPassword, setManualPassword] = useState('');
  const [isResetting, setIsResetting] = useState(false);
  const [copiedPass, setCopiedPass] = useState(false);

  // Password reset request queue
  const passwordResetRequests = useAppStore((state) => state.passwordResetRequests);
  const updatePasswordResetRequest = useAppStore((state) => state.updatePasswordResetRequest);
  const pendingRequests = (passwordResetRequests || []).filter(r => r.status === "pending");
  const [processingIds, setProcessingIds] = useState(new Set());

  // Merge all users into normalized format
  const allUsers = useMemo(() => {
    const teacherRows = (teachers || []).map(t => {
      const role = normalizeUserRole(t.role || 'guru');
      return {
        ...t,
        _source: 'teachers',
        sourceLabel: 'Guru',
        code: String(t.code || t.id || '').trim(),
        name: t.name || t.nama || 'Tanpa Nama',
        role: role,
        division: t.division || '',
        subrole: t.subrole || '',
        mapel: t.subject || t.mapel || t.type || '-'
      };
    });

    const staffRows = (staffs || []).map(s => {
      let role = String(s.role || '').toLowerCase().trim();
      const div = String(s.division || s.divisi || '').toLowerCase();
      if (!role || role === 'guru') {
        if (div.includes('tata usaha') || div.includes('tu') || div.includes('bendahara') || div.includes('administrasi')) {
          role = 'tu';
        } else {
          role = 'karyawan';
        }
      }
      return {
        ...s,
        _source: 'staffs',
        sourceLabel: 'Karyawan',
        code: String(s.code || s.staff_code || s.id || '').trim(),
        name: s.name || s.nama || 'Tanpa Nama',
        role: role,
        division: s.division || s.divisi || '',
        subrole: s.subrole || '',
        mapel: s.division || s.divisi || 'Staf Umum'
      };
    });

    return [...teacherRows, ...staffRows];
  }, [teachers, staffs]);

  // Filtered users
  const filteredUsers = useMemo(() => {
    return allUsers.filter(user => {
      // Search match
      const query = normalizeText(search);
      const matchSearch = !query || 
        normalizeText(user.code).includes(query) ||
        normalizeText(user.name).includes(query) ||
        normalizeText(user.role).includes(query) ||
        normalizeText(user.division).includes(query) ||
        normalizeText(user.subrole).includes(query) ||
        normalizeText(user.mapel).includes(query);

      // Role filter
      let matchRole = true;
      if (filterRole !== 'semua') {
        if (filterRole === 'waka') matchRole = user.role === 'waka';
        else if (filterRole === 'kepsek') matchRole = user.role === 'kepsek';
        else if (filterRole === 'tu') matchRole = user.role === 'tu' || user.subrole?.includes('tu') || user.subrole === 'bendahara';
        else if (filterRole === 'bpbk') matchRole = user.subrole === 'bpbk';
        else if (filterRole === 'pembina_osis') matchRole = user.subrole === 'pembina_osis';
        else if (filterRole === 'guru') matchRole = user.role === 'guru' && !user.subrole;
        else if (filterRole === 'karyawan') matchRole = user.role === 'karyawan' || user._source === 'staffs';
      }

      // Source filter
      let matchSource = true;
      if (filterSource === 'guru') matchSource = user._source === 'teachers';
      if (filterSource === 'karyawan') matchSource = user._source === 'staffs';

      return matchSearch && matchRole && matchSource;
    }).sort((a, b) => String(a.name || '').localeCompare(String(b.name || ''), 'id', { sensitivity: 'base' }));
  }, [allUsers, search, filterRole, filterSource]);

  // Statistics counts
  const stats = useMemo(() => {
    let admin = 1;
    let kepsek = 0;
    let waka = 0;
    let guru = 0;
    let tu = 0;
    let karyawan = 0;

    allUsers.forEach(u => {
      if (u.role === 'kepsek') kepsek++;
      else if (u.role === 'waka') waka++;
      else if (u.role === 'tu' || u.subrole?.includes('tu') || u.subrole === 'bendahara') tu++;
      else if (u._source === 'staffs' || u.role === 'karyawan') karyawan++;
      else guru++;
    });

    return { admin, kepsek, waka, guru, tu, karyawan, total: allUsers.length + 1 };
  }, [allUsers]);

  // Handle Approve Password Request Queue
  const handleApproveReset = async (request) => {
    if (processingIds.has(request.id)) return;
    setProcessingIds(prev => new Set([...prev, request.id]));

    const charset = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let newPassword = "";
    for (let i = 0; i < 6; i++) {
      newPassword += charset.charAt(Math.floor(Math.random() * charset.length));
    }
    
    const nextPasswordHash = await hashPassword(newPassword);
    let success = false;
    let targetName = "";

    if (request.role === "guru" || request.role === "waka" || request.role === "kepsek") {
      const targetTeacher = teachers.find(t => sameText(t.code, request.username) || sameText(t.name, request.username));
      if (targetTeacher) {
        targetName = targetTeacher.name;
        const nextTeachers = teachers.map(t => sameText(t.code, targetTeacher.code) ? { ...t, password: nextPasswordHash } : t);
        if (setTeachers) setTeachers(nextTeachers);
        const nextRequests = passwordResetRequests.map(r => r.id === request.id ? { ...r, status: "approved" } : r);
        updatePasswordResetRequest(request.id, { status: "approved" });
        await saveDatabaseNow({ teachers: nextTeachers, passwordResetRequests: nextRequests }, "reset password user");
        if (syncAuthSnapshotNow) await syncAuthSnapshotNow(adminUser, nextTeachers, "sinkronisasi reset password");
        success = true;
      }
    } else if (request.role === "karyawan") {
      const targetStaff = (staffs || []).find(s => sameText(s.code, request.username) || sameText(s.staff_code, request.username) || sameText(s.name, request.username));
      if (targetStaff) {
        targetName = targetStaff.name;
        const nextStaffs = (staffs || []).map(s => (sameText(s.code, targetStaff.code) || sameText(s.staff_code, targetStaff.staff_code)) ? { ...s, password: nextPasswordHash } : s);
        if (setStaffs) setStaffs(nextStaffs);
        const nextRequests = passwordResetRequests.map(r => r.id === request.id ? { ...r, status: "approved" } : r);
        updatePasswordResetRequest(request.id, { status: "approved" });
        await saveDatabaseNow({ staffs: nextStaffs, passwordResetRequests: nextRequests }, "reset password karyawan");
        success = true;
      }
    }

    if (success) {
      const whatsappMsg = `Halo ${targetName || request.username}, permintaan reset sandi akun sekolah Anda telah disetujui.\n\nSandi baru Anda: *${newPassword}*\nSilakan gunakan sandi ini untuk login ke sistem.`;
      const { isFiturAktif } = useFiturStore.getState();
      const isWaAutoPassword = isFiturAktif('wa_auto_password') ?? true;

      let waStatus = "dimatikan";
      if (isWaAutoPassword && request.whatsapp) {
        waStatus = "proses";
        try {
          const res = await fetch("/api/whatsapp/send", {
            method: "POST",
            headers: { "Content-Type": "application/json", "Authorization": `Bearer ${currentUser?.authToken}` },
            body: JSON.stringify({
              phone: request.whatsapp,
              recipient_name: targetName || request.username,
              message: whatsappMsg,
              trigger_type: "reset_password_admin"
            })
          });
          const waData = await res.json();
          waStatus = waData.ok ? "terkirim" : "gagal";
        } catch (err) {
          waStatus = "gagal";
        }
      }

      showNotification(`Password baru (${newPassword}) untuk ${targetName || request.username} berhasil di-set${isWaAutoPassword ? ` & dikirim ke WA (Status: ${waStatus})` : ''}`, "success");
    } else {
      showNotification(`User dengan identitas ${request.username} tidak ditemukan!`, "warning");
    }
    setProcessingIds(prev => { const next = new Set(prev); next.delete(request.id); return next; });
  };

  // Direct Admin Password Reset
  const handleDirectPasswordReset = async () => {
    if (!resetModalUser) return;
    const cleanPass = String(manualPassword || '').trim();
    if (!cleanPass) {
      showNotification('Kata sandi tidak boleh kosong.', 'warning');
      return;
    }

    setIsResetting(true);
    try {
      const nextHash = await hashPassword(cleanPass);
      const isTeacher = resetModalUser._source === 'teachers';

      if (isTeacher) {
        const nextTeachers = (teachers || []).map(t => 
          sameText(t.code || t.id, resetModalUser.code) ? { ...t, password: nextHash } : t
        );
        if (setTeachers) setTeachers(nextTeachers);
        await saveDatabaseNow({ teachers: nextTeachers }, 'admin ganti password guru');
        if (syncAuthSnapshotNow) await syncAuthSnapshotNow(adminUser, nextTeachers, 'sync password change');
      } else {
        const nextStaffs = (staffs || []).map(s => 
          sameText(s.code || s.staff_code || s.id, resetModalUser.code) ? { ...s, password: nextHash } : s
        );
        if (setStaffs) setStaffs(nextStaffs);
        await saveDatabaseNow({ staffs: nextStaffs }, 'admin ganti password staff');
      }

      showNotification(`Password untuk ${resetModalUser.name} berhasil diubah menjadi "${cleanPass}".`, 'success');
      setResetModalUser(null);
      setManualPassword('');
    } catch (err) {
      showNotification('Gagal mengubah password.', 'error');
    } finally {
      setIsResetting(false);
    }
  };

  const generateRandomPassword = () => {
    const chars = "abcdefghjkmnpqrstuvwxyz23456789";
    let gen = "";
    for (let i = 0; i < 6; i++) {
      gen += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setManualPassword(gen);
  };

  return (
    <div className="space-y-5 w-full animate-in fade-in duration-200 relative pb-16">
      
      {/* Page Header */}
      <PageHeader
        title="Pengaturan Akun Pengguna"
        description="Kelola akun login SuperAdmin, Pendidik (Guru), dan Tenaga Kependidikan (Staf TU/Karyawan)."
        icon={Users}
        tabs={[
          { id: "hak_akses", label: "Hak Akses & Role", icon: ShieldCheck },
          { id: "pengaturanuser", label: "Akun Pengguna", icon: Key },
          { id: "audit_log", label: "Audit Log & Aktivitas", icon: History }
        ]}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        customButtons={
          <div className="flex items-center gap-2">
            <Button
              type="button"
              onClick={() => openModal("guru", "add")}
              className="text-xs font-bold gap-1.5 shadow-xs"
            >
              <UserPlus size={14} /> + Tambah Guru
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => openModal("karyawan", "add")}
              className="text-xs font-bold gap-1.5 bg-white shadow-xs"
            >
              <Plus size={14} /> + Tambah Staf
            </Button>
          </div>
        }
      />

      {/* TOP SECTION: SUPERADMIN PROFILE & KPI SUMMARY */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        
        {/* SuperAdmin Card */}
        <div className="lg:col-span-4 bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950 rounded-[var(--ui-radius-card)] p-4 text-white shadow-sm flex items-center justify-between border border-slate-700/60 relative overflow-hidden">
          <div className="flex items-center gap-3.5 relative z-10 min-w-0">
            <div className="w-12 h-12 rounded-[var(--ui-radius-small)] bg-white/10 border border-white/20 flex items-center justify-center shrink-0 shadow-xs">
              <Shield size={22} className="text-white" />
            </div>
            <div className="min-w-0">
              <span className="text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                SuperAdmin
              </span>
              <h3 className="text-sm font-black text-white truncate mt-1 leading-tight">
                {adminUser?.name || "Administrator"}
              </h3>
              <p className="text-[11px] text-white/70 font-mono">
                Username: @{adminUser?.username || "admin"}
              </p>
            </div>
          </div>

          <Button
            type="button"
            variant="outline"
            onClick={() => openModal("admin", "edit", adminUser)}
            className="text-xs font-bold bg-white/10 hover:bg-white/20 text-white border-white/20 shrink-0 gap-1"
          >
            <Edit2 size={12} /> Ubah
          </Button>
        </div>

        {/* KPI Roles Summary Grid */}
        <div className="lg:col-span-8 grid grid-cols-3 sm:grid-cols-6 gap-2.5">
          
          {/* Admin */}
          <div className="bg-white border border-slate-200/80 rounded-[var(--ui-radius-card)] p-3 shadow-xs flex flex-col justify-between">
            <div className="w-7 h-7 rounded-[var(--ui-radius-small)] bg-purple-50 text-purple-700 flex items-center justify-center mb-1">
              <Shield size={14} />
            </div>
            <div>
              <p className="text-lg font-black text-slate-800 leading-none">{stats.admin}</p>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-1">Admin</p>
            </div>
          </div>

          {/* Kepsek */}
          <div className="bg-white border border-slate-200/80 rounded-[var(--ui-radius-card)] p-3 shadow-xs flex flex-col justify-between">
            <div className="w-7 h-7 rounded-[var(--ui-radius-small)] bg-blue-50 text-blue-700 flex items-center justify-center mb-1">
              <Building2 size={14} />
            </div>
            <div>
              <p className="text-lg font-black text-slate-800 leading-none">{stats.kepsek}</p>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-1">Kepsek</p>
            </div>
          </div>

          {/* Waka */}
          <div className="bg-white border border-slate-200/80 rounded-[var(--ui-radius-card)] p-3 shadow-xs flex flex-col justify-between">
            <div className="w-7 h-7 rounded-[var(--ui-radius-small)] bg-amber-50 text-amber-700 flex items-center justify-center mb-1">
              <Sparkles size={14} />
            </div>
            <div>
              <p className="text-lg font-black text-slate-800 leading-none">{stats.waka}</p>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-1">Waka</p>
            </div>
          </div>

          {/* Guru */}
          <div className="bg-white border border-slate-200/80 rounded-[var(--ui-radius-card)] p-3 shadow-xs flex flex-col justify-between">
            <div className="w-7 h-7 rounded-[var(--ui-radius-small)] bg-emerald-50 text-emerald-700 flex items-center justify-center mb-1">
              <BookOpen size={14} />
            </div>
            <div>
              <p className="text-lg font-black text-slate-800 leading-none">{stats.guru}</p>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-1">Guru</p>
            </div>
          </div>

          {/* TU */}
          <div className="bg-white border border-slate-200/80 rounded-[var(--ui-radius-card)] p-3 shadow-xs flex flex-col justify-between">
            <div className="w-7 h-7 rounded-[var(--ui-radius-small)] bg-cyan-50 text-cyan-700 flex items-center justify-center mb-1">
              <GraduationCap size={14} />
            </div>
            <div>
              <p className="text-lg font-black text-slate-800 leading-none">{stats.tu}</p>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-1">TU</p>
            </div>
          </div>

          {/* Karyawan */}
          <div className="bg-white border border-slate-200/80 rounded-[var(--ui-radius-card)] p-3 shadow-xs flex flex-col justify-between">
            <div className="w-7 h-7 rounded-[var(--ui-radius-small)] bg-slate-100 text-slate-700 flex items-center justify-center mb-1">
              <Briefcase size={14} />
            </div>
            <div>
              <p className="text-lg font-black text-slate-800 leading-none">{stats.karyawan}</p>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-1">Staf</p>
            </div>
          </div>

        </div>
      </div>

      {/* PENDING RESET PASSWORD QUEUE (IF ANY) */}
      {pendingRequests && pendingRequests.length > 0 && (
        <div className="bg-white border border-amber-200/80 rounded-[var(--ui-radius-card)] p-4 sm:p-5 shadow-xs space-y-3">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-[var(--ui-radius-small)] bg-amber-100 text-amber-700 flex items-center justify-center">
                <Lock size={16} />
              </div>
              <div>
                <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider">
                  Permintaan Lupa Password ({pendingRequests.length})
                </h4>
                <p className="text-[11px] text-slate-500">
                  Pengguna meminta reset sandi melalui form lupa password.
                </p>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-400 font-bold uppercase text-[10px]">
                <tr>
                  <th className="px-4 py-2">Identitas User</th>
                  <th className="px-4 py-2">Peran</th>
                  <th className="px-4 py-2">No. WhatsApp</th>
                  <th className="px-4 py-2">Waktu Pengajuan</th>
                  <th className="px-4 py-2 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {pendingRequests.map(req => (
                  <tr key={req.id} className="hover:bg-slate-50/50">
                    <td className="px-4 py-2.5 font-bold text-slate-800">{req.username}</td>
                    <td className="px-4 py-2.5">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700 uppercase">
                        {req.role}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 font-mono">{req.whatsapp || '-'}</td>
                    <td className="px-4 py-2.5 text-slate-500 font-mono text-[11px]">
                      {new Date(req.requestedAt).toLocaleString("id-ID")}
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      <div className="flex justify-end gap-1.5">
                        <Button
                          size="sm"
                          onClick={() => handleApproveReset(req)}
                          disabled={processingIds.has(req.id)}
                          className="text-xs font-bold gap-1 h-7"
                        >
                          {processingIds.has(req.id) ? "Memproses..." : "ACC & Reset"}
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={async () => {
                            const nextRequests = passwordResetRequests.map(r => r.id === req.id ? { ...r, status: "rejected" } : r);
                            updatePasswordResetRequest(req.id, { status: "rejected" });
                            await saveDatabaseNow({ passwordResetRequests: nextRequests }, "tolak reset password");
                          }}
                          className="text-xs font-bold text-rose-600 hover:bg-rose-50 h-7"
                        >
                          Tolak
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* USER LIST DATATABLE */}
      <div className="bg-white border border-slate-200/80 rounded-[var(--ui-radius-card)] p-4 sm:p-5 shadow-xs space-y-4">
        
        {/* Toolbar: Search + Filters */}
        <div className="flex flex-col md:flex-row gap-3 items-center justify-between">
          <div className="relative flex-1 w-full">
            <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Cari nama, kode user, role, atau mapel..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200/80 rounded-[var(--ui-radius-small)] text-xs font-semibold focus:outline-none focus:bg-white focus:ring-2 focus:ring-[var(--ui-primary)]/20 transition-all"
            />
          </div>

          <div className="flex items-center gap-2 w-full md:w-auto">
            {/* Filter Category */}
            <UISelect
              value={filterSource}
              onChange={e => setFilterSource(e.target.value)}
              className="text-xs w-36"
            >
              <option value="semua">Semua Akun</option>
              <option value="guru">Hanya Guru</option>
              <option value="karyawan">Hanya Karyawan</option>
            </UISelect>

            {/* Filter Role */}
            <UISelect
              value={filterRole}
              onChange={e => setFilterRole(e.target.value)}
              className="text-xs w-44"
            >
              <option value="semua">Semua Role</option>
              <option value="kepsek">Kepala Sekolah</option>
              <option value="waka">Waka (Semua)</option>
              <option value="tu">Tata Usaha (TU)</option>
              <option value="bpbk">Guru BP/BK</option>
              <option value="pembina_osis">Pembina OSIS</option>
              <option value="guru">Guru Pengajar</option>
              <option value="karyawan">Staf / Karyawan</option>
            </UISelect>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto rounded-[var(--ui-radius-small)] border border-slate-200/80">
          <table className="w-full text-left border-collapse text-xs">
            <thead className="bg-slate-50/90 text-slate-500 font-bold uppercase tracking-wider text-[10px] border-b border-slate-200/80">
              <tr>
                <th className="px-3 py-2.5 text-center w-12">No</th>
                <th className="px-3 py-2.5 w-16 text-center">Kode</th>
                <th className="px-4 py-2.5">Nama Pengguna</th>
                <th className="px-3 py-2.5 text-center">Kategori</th>
                <th className="px-4 py-2.5">Role / Hak Akses</th>
                <th className="px-3 py-2.5 text-center">Status</th>
                <th className="px-4 py-2.5 text-right w-36">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400 bg-slate-50/30">
                    <Search size={32} className="mx-auto mb-2 opacity-30" />
                    <p className="font-bold">Tidak ada pengguna yang cocok</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">Coba sesuaikan kata kunci pencarian atau filter.</p>
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user, idx) => {
                  const isCurrentSession = currentUser?.code && sameText(currentUser.code, user.code);
                  const isStaff = user._source === 'staffs';
                  const roleLabel = getRoleKeyLabel(user.subrole || user.role);

                  return (
                    <tr key={`${user._source}_${user.code}`} className="hover:bg-slate-50/70 transition-colors">
                      <td className="px-3 py-2.5 text-center text-slate-400 font-bold">{idx + 1}</td>
                      
                      {/* Code */}
                      <td className="px-3 py-2.5 text-center font-mono font-black text-slate-700">
                        <span className="px-2 py-0.5 bg-slate-100 rounded text-[11px]">{user.code}</span>
                      </td>

                      {/* Name & Mapel / Divisi */}
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-2.5">
                          <div className={`w-7 h-7 rounded-full flex items-center justify-center font-black text-xs shrink-0 ${
                            isStaff ? 'bg-cyan-100 text-cyan-800' : 'bg-blue-100 text-blue-800'
                          }`}>
                            {(user.name || '?')[0].toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <p className="font-extrabold text-slate-800 truncate">{user.name}</p>
                            <p className="text-[10px] text-slate-400 font-medium truncate">
                              {user.mapel && user.mapel !== '-' ? user.mapel : (isStaff ? 'Tenaga Kependidikan' : 'Guru Pengajar')}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Source Badge */}
                      <td className="px-3 py-2.5 text-center">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          isStaff ? 'bg-cyan-50 text-cyan-700 border border-cyan-200' : 'bg-blue-50 text-blue-700 border border-blue-200'
                        }`}>
                          {user.sourceLabel}
                        </span>
                      </td>

                      {/* Role Badge */}
                      <td className="px-4 py-2.5">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-black border ${
                          user.role === 'kepsek' ? 'bg-blue-50 text-blue-800 border-blue-200' :
                          user.role === 'waka' ? 'bg-amber-50 text-amber-800 border-amber-200' :
                          user.role === 'tu' ? 'bg-cyan-50 text-cyan-800 border-cyan-200' :
                          isStaff ? 'bg-slate-100 text-slate-700 border-slate-200' :
                          'bg-emerald-50 text-emerald-800 border-emerald-200'
                        }`}>
                          <Shield size={10} />
                          <span>{roleLabel.label || user.role}</span>
                          {user.division && user.role === 'waka' && (
                            <span className="text-[9px] font-normal opacity-80">({user.division})</span>
                          )}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="px-3 py-2.5 text-center">
                        {isCurrentSession ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-black bg-amber-50 text-amber-700 border border-amber-200 uppercase">
                            <Activity size={10} /> Sesi Anda
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 uppercase">
                            Aktif
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-2.5 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {/* Edit User */}
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => openModal(isStaff ? 'karyawan' : 'guru', "edit", user)}
                            className="h-7 px-2 text-xs font-bold text-slate-600 hover:text-blue-600"
                            title="Edit Data User"
                          >
                            <Edit2 size={12} />
                          </Button>

                          {/* Direct Password Reset */}
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setResetModalUser(user);
                              setManualPassword('');
                              setCopiedPass(false);
                            }}
                            className="h-7 px-2 text-xs font-bold text-slate-600 hover:text-amber-600"
                            title="Ganti / Reset Password User"
                          >
                            <Key size={12} />
                          </Button>

                          {/* Delete User */}
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDelete(isStaff ? 'Karyawan' : 'guru', user.code)}
                            disabled={!!isCurrentSession}
                            className={`h-7 px-2 text-xs font-bold ${
                              isCurrentSession 
                                ? 'text-slate-300 cursor-not-allowed' 
                                : 'text-slate-400 hover:text-rose-600 hover:bg-rose-50'
                            }`}
                            title={isCurrentSession ? "Tidak dapat menghapus sesi sendiri" : "Hapus Akun"}
                          >
                            <Trash2 size={12} />
                          </Button>
                        </div>
                      </td>

                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Footer info */}
        <div className="flex justify-between items-center text-[11px] text-slate-400 font-bold uppercase tracking-wider pt-2">
          <span>Menampilkan {filteredUsers.length} pengguna</span>
          <span>Total: {allUsers.length} Guru & Staf terdaftar</span>
        </div>

      </div>

      {/* MODAL: DIRECT PASSWORD RESET BY ADMIN */}
      {resetModalUser && (
        <Modal
          isOpen={true}
          onClose={() => setResetModalUser(null)}
          title={`Ganti Password: ${resetModalUser.name}`}
        >
          <div className="p-5 space-y-4 max-w-md w-full">
            
            {/* User Info Banner */}
            <div className="p-3 rounded-[var(--ui-radius-small)] bg-slate-50 border border-slate-200 flex items-center gap-3">
              <div className="w-10 h-10 rounded-[var(--ui-radius-small)] bg-blue-100 text-blue-800 font-black flex items-center justify-center shrink-0 text-sm">
                {(resetModalUser.name || '?')[0].toUpperCase()}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-black text-slate-800 truncate">{resetModalUser.name}</p>
                <p className="text-[10px] text-slate-500 font-mono">
                  Kode: {resetModalUser.code} ({resetModalUser.sourceLabel})
                </p>
              </div>
            </div>

            {/* Password Input & Generator */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-[11px] font-black text-slate-700 uppercase tracking-wider">
                  Kata Sandi Baru
                </label>
                <button
                  type="button"
                  onClick={generateRandomPassword}
                  className="text-[10px] font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1 cursor-pointer"
                >
                  <Sparkles size={11} /> Acak Sandi
                </button>
              </div>
              
              <div className="relative">
                <input
                  type="text"
                  placeholder="Masukkan kata sandi baru..."
                  value={manualPassword}
                  onChange={e => setManualPassword(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-[var(--ui-radius-small)] text-xs font-mono font-bold focus:outline-none focus:bg-white focus:ring-2 focus:ring-[var(--ui-primary)]/20 pr-10"
                />
                {manualPassword && (
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(manualPassword);
                      setCopiedPass(true);
                      setTimeout(() => setCopiedPass(false), 2000);
                    }}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-blue-600 p-1 cursor-pointer"
                    title="Salin password"
                  >
                    {copiedPass ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
                  </button>
                )}
              </div>
              <p className="text-[10px] text-slate-400 mt-1">
                Password akan di-hash secara aman dan langsung dapat digunakan oleh user untuk login.
              </p>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setResetModalUser(null)}
                disabled={isResetting}
                className="text-xs"
              >
                Batal
              </Button>
              <Button
                type="button"
                onClick={handleDirectPasswordReset}
                disabled={isResetting || !manualPassword}
                className="text-xs font-black gap-1.5"
              >
                {isResetting ? "Menyimpan..." : "Simpan Password Baru"}
              </Button>
            </div>

          </div>
        </Modal>
      )}

    </div>
  );
}
