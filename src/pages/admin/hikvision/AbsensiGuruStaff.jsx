import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Calendar, 
  Plus, 
  Search, 
  FileText, 
  Eye, 
  Trash2, 
  UploadCloud, 
  X, 
  AlertTriangle,
  User,
  Users,
  Briefcase,
  Download,
  Check,
  Building,
  RefreshCw,
  Award
} from 'lucide-react';
import { useDataStore } from '../../../store/useDataStore';
import { useAppStore } from '../../../store/useAppStore';
import { Button } from '../../../components/ui.jsx';
import { CustomSelect } from '../../../components/CustomSelect.jsx';

export default function AbsensiGuruStaff({ personType = 'guru' }) {
  const currentUser = useAppStore(state => state.user) || {};
  const teachers = useDataStore(state => state.teachers) || [];
  const staffs = useDataStore(state => state.staffs) || [];

  const userRole = String(currentUser?.role || '').toLowerCase().trim();
  const hasApprovalPermission = 
    ['admin', 'superadmin', 'super_admin', 'kepsek', 'tu', 'tata_usaha'].includes(userRole) || 
    userRole.startsWith('waka') || 
    currentUser?.username === 'admin';

  // Filters
  const [activePersonType, setActivePersonType] = useState(personType);
  const [filterStatus, setFilterStatus] = useState('all'); // all | pending | Izin | Sakit | Dinas Luar | rejected
  const [search, setSearch] = useState('');
  const [filterMonth, setFilterMonth] = useState(() => new Date().getMonth() + 1);
  const [filterYear, setFilterYear] = useState(() => new Date().getFullYear());
  
  // Data state
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [toastMsg, setToastMsg] = useState(null);

  // Modals
  const [showInputModal, setShowInputModal] = useState(false);
  const [previewItem, setPreviewItem] = useState(null);

  // Form Input State
  const [formPersonType, setFormPersonType] = useState(personType === 'karyawan' ? 'karyawan' : 'guru');
  const [selectedPersonCode, setSelectedPersonCode] = useState('');
  const [personSearchQuery, setPersonSearchQuery] = useState('');
  const [formStatus, setFormStatus] = useState('Izin');
  const [formStartDate, setFormStartDate] = useState(() => new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Jakarta' }));
  const [formEndDate, setFormEndDate] = useState(() => new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Jakarta' }));
  const [formNote, setFormNote] = useState('');
  const [formFileData, setFormFileData] = useState('');
  const [formFileName, setFormFileName] = useState('');
  const [formError, setFormError] = useState('');

  const showToast = (msg, type = 'success') => {
    setToastMsg({ text: msg, type });
    setTimeout(() => setToastMsg(null), 3500);
  };

  const getAuthToken = () => {
    return currentUser?.authToken
      || JSON.parse(sessionStorage.getItem('school_schedule_session_v1') || '{}')?.authToken
      || JSON.parse(localStorage.getItem('school_schedule_session_v1') || '{}')?.authToken
      || localStorage.getItem('token')
      || sessionStorage.getItem('token')
      || '';
  };

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const token = getAuthToken();
      let url = `/api/hikvision/guru-permits?person_type=${activePersonType}&month=${filterMonth}&year=${filterYear}`;
      if (search) url += `&search=${encodeURIComponent(search)}`;

      const res = await fetch(url, {
        headers: {
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        }
      });
      const json = await res.json();
      if (res.ok && json.ok) {
        setItems(json.data || []);
      } else {
        setItems([]);
      }
    } catch (err) {
      console.error('Gagal mengambil data perizinan:', err);
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [activePersonType, filterMonth, filterYear, search]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Filtering on client side
  const filteredItems = useMemo(() => {
    return items.filter(item => {
      if (filterStatus === 'all') return true;
      if (filterStatus === 'pending') return item.approval_status === 'pending';
      if (filterStatus === 'rejected') return item.approval_status === 'rejected';
      return item.status === filterStatus;
    });
  }, [items, filterStatus]);

  // Status Counts
  const counts = useMemo(() => {
    return {
      all: items.length,
      pending: items.filter(i => i.approval_status === 'pending').length,
      Izin: items.filter(i => i.status === 'Izin' && i.approval_status !== 'rejected').length,
      Sakit: items.filter(i => i.status === 'Sakit' && i.approval_status !== 'rejected').length,
      DinasLuar: items.filter(i => i.status === 'Dinas Luar' && i.approval_status !== 'rejected').length,
      rejected: items.filter(i => i.approval_status === 'rejected').length,
    };
  }, [items]);

  // Handle Approve / ACC
  const handleApprove = async (recordId) => {
    if (!hasApprovalPermission) return;
    setActionLoading(true);
    try {
      const token = getAuthToken();
      const res = await fetch('/api/hikvision/guru-permits', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ action: 'approve', recordId })
      });
      const json = await res.json();
      if (res.ok && json.ok) {
        showToast(json.message || 'Surat izin/sakit berhasil disetujui (ACC).');
        fetchData();
      } else {
        showToast(json.error || 'Gagal menyetujui izin.', 'error');
      }
    } catch (err) {
      console.error(err);
      showToast('Terjadi kesalahan jaringan.', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // Handle Reject
  const handleReject = async (recordId) => {
    if (!hasApprovalPermission) return;
    if (!window.confirm('Yakin ingin menolak surat izin/sakit ini?')) return;
    setActionLoading(true);
    try {
      const token = getAuthToken();
      const res = await fetch('/api/hikvision/guru-permits', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ action: 'reject', recordId })
      });
      const json = await res.json();
      if (res.ok && json.ok) {
        showToast(json.message || 'Surat izin/sakit telah ditolak.');
        fetchData();
      } else {
        showToast(json.error || 'Gagal menolak izin.', 'error');
      }
    } catch (err) {
      console.error(err);
      showToast('Terjadi kesalahan jaringan.', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // Handle Delete
  const handleDelete = async (recordId) => {
    if (!hasApprovalPermission) return;
    if (!window.confirm('Hapus riwayat izin/sakit ini?')) return;
    setActionLoading(true);
    try {
      const token = getAuthToken();
      const res = await fetch('/api/hikvision/guru-permits', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ action: 'delete', recordId })
      });
      const json = await res.json();
      if (res.ok && json.ok) {
        showToast('Data izin/sakit berhasil dihapus.');
        fetchData();
      } else {
        showToast(json.error || 'Gagal menghapus data.', 'error');
      }
    } catch (err) {
      console.error(err);
      showToast('Terjadi kesalahan jaringan.', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // Form File Handler
  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      alert('Ukuran file maksimal 5 MB');
      return;
    }
    setFormFileName(file.name);
    const reader = new FileReader();
    reader.onload = () => setFormFileData(reader.result);
    reader.readAsDataURL(file);
  };

  // Handle Form Submit (Input by Admin/TU)
  const handleSubmitInput = async (e) => {
    e.preventDefault();
    if (!selectedPersonCode) {
      setFormError('Pilih pegawai / pendidik yang bersangkutan.');
      return;
    }
    setFormError('');
    setActionLoading(true);

    try {
      const token = getAuthToken();
      const payload = {
        personType: formPersonType,
        teacherCode: selectedPersonCode,
        startDate: formStartDate,
        endDate: formEndDate,
        status: formStatus,
        note: formNote.trim(),
        fileData: formFileData || null
      };

      const res = await fetch('/api/hikvision/guru-permits', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify(payload)
      });

      const json = await res.json();
      if (res.ok && json.ok) {
        showToast(json.message || 'Surat izin/sakit berhasil disimpan.');
        setShowInputModal(false);
        // Reset form
        setSelectedPersonCode('');
        setPersonSearchQuery('');
        setFormNote('');
        setFormFileData('');
        setFormFileName('');
        fetchData();
      } else {
        setFormError(json.error || 'Gagal menyimpan data.');
      }
    } catch (err) {
      console.error(err);
      setFormError('Terjadi kesalahan jaringan.');
    } finally {
      setActionLoading(false);
    }
  };

  // List of people for the modal dropdown
  const availablePeople = useMemo(() => {
    const list = formPersonType === 'karyawan' ? staffs : teachers;
    if (!personSearchQuery.trim()) return list.slice(0, 60);
    const q = personSearchQuery.toLowerCase();
    return list.filter(p => {
      const name = String(p.name || p.nama || '').toLowerCase();
      const code = String(p.code || p.nip || p.id || '').toLowerCase();
      const div = String(p.division || p.type || '').toLowerCase();
      return name.includes(q) || code.includes(q) || div.includes(q);
    }).slice(0, 60);
  }, [formPersonType, teachers, staffs, personSearchQuery]);

  const selectedPersonObj = useMemo(() => {
    const list = formPersonType === 'karyawan' ? staffs : teachers;
    return list.find(p => String(p.code || p.nip || p.id) === selectedPersonCode);
  }, [formPersonType, teachers, staffs, selectedPersonCode]);

  // Month Options
  const monthOptions = [
    { value: 1, label: 'Januari' }, { value: 2, label: 'Februari' },
    { value: 3, label: 'Maret' }, { value: 4, label: 'April' },
    { value: 5, label: 'Mei' }, { value: 6, label: 'Juni' },
    { value: 7, label: 'Juli' }, { value: 8, label: 'Agustus' },
    { value: 9, label: 'September' }, { value: 10, label: 'Oktober' },
    { value: 11, label: 'November' }, { value: 12, label: 'Desember' }
  ];

  const yearOptions = [
    { value: 2025, label: '2025' },
    { value: 2026, label: '2026' },
    { value: 2027, label: '2027' }
  ];

  return (
    <div className="flex flex-col w-full gap-4 animate-in fade-in duration-300 relative z-10">
      
      {/* Toast Notification */}
      {toastMsg && (
        <div className={`fixed top-5 right-5 z-[200] px-4 py-3 rounded-[var(--ui-radius-small)] shadow-md border text-xs font-black flex items-center gap-2 animate-in slide-in-from-top-2 duration-200 ${
          toastMsg.type === 'error' ? 'bg-rose-50 border-rose-200 text-rose-700' : 'bg-emerald-50 border-emerald-200 text-emerald-800'
        }`}>
          {toastMsg.type === 'error' ? <AlertTriangle size={16} /> : <CheckCircle2 size={16} />}
          <span>{toastMsg.text}</span>
        </div>
      )}

      {/* KPI Cards Row */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
        {[
          { label: 'Semua Data', count: counts.all, color: 'text-slate-800', bg: 'bg-white', border: 'border-slate-200/80', filter: 'all' },
          { label: 'Menunggu ACC', count: counts.pending, color: 'text-amber-700', bg: 'bg-amber-50/70', border: 'border-amber-200', filter: 'pending' },
          { label: 'Total Izin', count: counts.Izin, color: 'text-[var(--ui-primary)]', bg: 'bg-indigo-50/70', border: 'border-indigo-200', filter: 'Izin' },
          { label: 'Total Sakit', count: counts.Sakit, color: 'text-amber-600', bg: 'bg-amber-50/70', border: 'border-amber-200', filter: 'Sakit' },
          { label: 'Dinas Luar', count: counts.DinasLuar, color: 'text-teal-700', bg: 'bg-teal-50/70', border: 'border-teal-200', filter: 'Dinas Luar' },
          { label: 'Ditolak', count: counts.rejected, color: 'text-rose-700', bg: 'bg-rose-50/70', border: 'border-rose-200', filter: 'rejected' },
        ].map(kpi => (
          <button
            key={kpi.label}
            type="button"
            onClick={() => setFilterStatus(kpi.filter)}
            className={`p-3 rounded-[var(--ui-radius-card)] border ${kpi.border} ${kpi.bg} shadow-xs text-left cursor-pointer transition-all hover:-translate-y-0.5 active:scale-95 flex flex-col justify-between ${
              filterStatus === kpi.filter ? 'ring-2 ring-[var(--ui-primary)]/40 shadow-sm' : ''
            }`}
          >
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block truncate">
              {kpi.label}
            </span>
            <span className={`text-xl font-black mt-1 ${kpi.color}`}>
              {kpi.count}
            </span>
          </button>
        ))}
      </div>

      {/* Main Card Container */}
      <div className="ui-card bg-white border border-slate-200/80 rounded-[var(--ui-radius-card)] shadow-xs overflow-hidden flex flex-col">
        
        {/* Quick Filter Status Pills Row */}
        <div className="p-3.5 sm:p-4 border-b border-slate-100 bg-slate-50/40 flex flex-wrap items-center justify-between gap-2.5">
          <div className="flex flex-wrap items-center gap-2">
            {[
              { id: 'all', label: 'Semua Record', count: counts.all, activeBg: 'bg-slate-800 text-white border-slate-800' },
              { id: 'pending', label: 'Menunggu ACC', count: counts.pending, activeBg: 'bg-amber-500 text-white border-amber-500' },
              { id: 'Izin', label: 'Izin', count: counts.Izin, activeBg: 'bg-[var(--ui-primary)] text-white border-[var(--ui-primary)]' },
              { id: 'Sakit', label: 'Sakit', count: counts.Sakit, activeBg: 'bg-amber-600 text-white border-amber-600' },
              { id: 'Dinas Luar', label: 'Dinas Luar', count: counts.DinasLuar, activeBg: 'bg-teal-600 text-white border-teal-600' },
              { id: 'rejected', label: 'Ditolak', count: counts.rejected, activeBg: 'bg-rose-600 text-white border-rose-600' },
            ].map(tab => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setFilterStatus(tab.id)}
                className={`px-3 py-1.5 rounded-[var(--ui-radius-small)] text-xs font-extrabold transition-all cursor-pointer border flex items-center gap-2 active:scale-95 ${
                  filterStatus === tab.id
                    ? `${tab.activeBg} font-black shadow-xs`
                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100/80'
                }`}
              >
                <span>{tab.label}</span>
                <span className={`text-[10px] font-black px-1.5 py-0.2 rounded-full ${
                  filterStatus === tab.id ? 'bg-white/25 text-white' : 'bg-slate-100 text-slate-500'
                }`}>
                  {tab.count}
                </span>
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={fetchData}
              title="Refresh Data"
              className="w-8 h-8 rounded-[var(--ui-radius-small)] bg-white border border-slate-200 text-slate-500 hover:text-slate-800 hover:bg-slate-50 flex items-center justify-center cursor-pointer transition-colors shadow-xs"
            >
              <RefreshCw size={14} className={loading ? 'animate-spin text-[var(--ui-primary)]' : ''} />
            </button>
          </div>
        </div>

        {/* Toolbar Row */}
        <div className="p-3.5 sm:p-4 bg-white border-b border-slate-100 flex flex-col md:flex-row gap-3 justify-between items-start md:items-center">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 w-full md:w-auto flex-1">
            {/* Search Input */}
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
              <input
                type="text"
                placeholder="Cari nama guru, staf, NIP, atau alasan..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full pl-9 pr-3.5 py-2 bg-slate-50 border border-slate-200/80 rounded-[var(--ui-radius-small)] text-xs font-semibold text-slate-800 focus:outline-none focus:border-[var(--ui-primary)] focus:bg-white transition-all"
              />
            </div>

            {/* Filter Person Type */}
            <div className="w-full sm:w-[150px]">
              <CustomSelect
                options={[
                  { value: 'all', label: 'Guru & Karyawan' },
                  { value: 'guru', label: 'Hanya Guru' },
                  { value: 'karyawan', label: 'Hanya Karyawan' }
                ]}
                value={activePersonType}
                onChange={val => setActivePersonType(val)}
              />
            </div>

            {/* Month & Year Selectors */}
            <div className="w-full sm:w-[130px]">
              <CustomSelect
                options={monthOptions}
                value={filterMonth}
                onChange={val => setFilterMonth(parseInt(val))}
              />
            </div>
            <div className="w-full sm:w-[100px]">
              <CustomSelect
                options={yearOptions}
                value={filterYear}
                onChange={val => setFilterYear(parseInt(val))}
              />
            </div>
          </div>

          {/* Action CTA Buttons */}
          <div className="flex items-center gap-2 w-full md:w-auto shrink-0 justify-end">
            <button
              type="button"
              onClick={() => {
                setFormPersonType(activePersonType === 'karyawan' ? 'karyawan' : 'guru');
                setSelectedPersonCode('');
                setPersonSearchQuery('');
                setFormNote('');
                setFormFileData('');
                setFormFileName('');
                setFormError('');
                setShowInputModal(true);
              }}
              className="px-4 py-2 bg-[var(--ui-primary)] hover:opacity-90 text-white font-extrabold text-xs rounded-[var(--ui-radius-small)] shadow-xs flex items-center gap-1.5 active:scale-95 transition-all cursor-pointer border-none"
            >
              <Plus size={15} strokeWidth={2.5} />
              <span>Input Surat Izin/Sakit</span>
            </button>
          </div>
        </div>

        {/* Desktop Table View */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200/80 bg-slate-50/60 text-[10px] font-black text-slate-500 uppercase tracking-wider">
                <th className="py-3 px-4 w-12 text-center">No</th>
                <th className="py-3 px-4 w-28">Tanggal</th>
                <th className="py-3 px-4">Nama & NIP</th>
                <th className="py-3 px-4 w-28 text-center">Kategori</th>
                <th className="py-3 px-4 w-28 text-center">Status</th>
                <th className="py-3 px-4 min-w-[180px]">Alasan / Catatan</th>
                <th className="py-3 px-4 w-32 text-center">Status ACC</th>
                <th className="py-3 px-4 w-36 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="text-xs font-medium text-slate-700 divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan="8" className="px-6 py-12 text-center text-slate-400 font-bold">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <div className="w-6 h-6 border-2 border-[var(--ui-primary)] border-t-transparent rounded-full animate-spin" />
                      <span>Memuat data surat izin/sakit...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredItems.length === 0 ? (
                <tr>
                  <td colSpan="8" className="px-6 py-14 text-center text-slate-400 font-medium">
                    <div className="flex flex-col items-center justify-center gap-2.5 max-w-sm mx-auto">
                      <div className="w-12 h-12 rounded-full bg-slate-50 text-slate-400 flex items-center justify-center shadow-xs border border-slate-200">
                        <CheckCircle2 size={24} strokeWidth={2} />
                      </div>
                      <span className="font-extrabold text-slate-800 text-sm">Tidak ada data surat izin / sakit</span>
                      <span className="text-xs text-slate-400 text-center leading-relaxed">
                        Belum ada permohonan izin/sakit guru atau staf pada periode dan filter ini. Tekan tombol <strong>Input Surat Izin/Sakit</strong> untuk mencatat data baru.
                      </span>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredItems.map((item, idx) => {
                  const isPending = item.approval_status === 'pending';
                  const isApproved = item.approval_status === 'approved';
                  const isRejected = item.approval_status === 'rejected';
                  const hasFile = Boolean(item.gdrive_url);

                  return (
                    <tr key={item.record_id || idx} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3.5 px-4 text-center font-bold text-slate-400">
                        {idx + 1}
                      </td>
                      <td className="py-3.5 px-4 font-bold text-slate-800 whitespace-nowrap">
                        {new Date(item.tanggal).toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric', month: 'short' })}
                      </td>
                      <td className="py-3.5 px-4">
                        <p className="font-extrabold text-slate-900">{item.name || item.teacher_code}</p>
                        <p className="text-[10px] font-mono text-slate-400 mt-0.5">NIP/Kode: {item.nip || item.teacher_code}</p>
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span className={`inline-block px-2.5 py-0.5 rounded-[var(--ui-radius-small)] text-[9.5px] font-extrabold uppercase border ${
                          item.person_type === 'karyawan'
                            ? 'bg-purple-50 text-purple-700 border-purple-200'
                            : 'bg-blue-50 text-blue-700 border-blue-200'
                        }`}>
                          {item.person_type === 'karyawan' ? 'Karyawan' : 'Guru'}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span className={`inline-block px-2.5 py-1 rounded-[var(--ui-radius-pill)] text-[10px] font-black uppercase tracking-wider border shadow-2xs ${
                          item.status === 'Sakit'
                            ? 'bg-amber-100 text-amber-800 border-amber-200'
                            : item.status === 'Dinas Luar'
                            ? 'bg-teal-100 text-teal-800 border-teal-200'
                            : 'bg-indigo-100 text-indigo-800 border-indigo-200'
                        }`}>
                          {item.status}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="flex flex-col gap-1">
                          <span className="text-slate-700 font-medium leading-relaxed">
                            {item.note || <span className="text-slate-400 italic">Tanpa catatan</span>}
                          </span>
                          {hasFile && (
                            <button
                              type="button"
                              onClick={() => setPreviewItem(item)}
                              className="self-start text-[10.5px] font-bold text-[var(--ui-primary)] hover:underline flex items-center gap-1 cursor-pointer mt-0.5"
                            >
                              <FileText size={12} />
                              <span>Lihat Bukti Surat</span>
                            </button>
                          )}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        {isPending ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-[var(--ui-radius-pill)] bg-amber-100 text-amber-800 border border-amber-300 text-[10px] font-black uppercase tracking-wider shadow-2xs animate-pulse">
                            <Clock size={11} />
                            <span>Menunggu ACC</span>
                          </span>
                        ) : isApproved ? (
                          <div className="flex flex-col items-center">
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-[var(--ui-radius-pill)] bg-emerald-100 text-emerald-800 border border-emerald-300 text-[10px] font-black uppercase tracking-wider shadow-2xs">
                              <Check size={11} strokeWidth={3} />
                              <span>Disetujui</span>
                            </span>
                            {item.approved_by_name && (
                              <span className="text-[8.5px] text-slate-400 font-semibold mt-0.5">
                                oleh {item.approved_by_name}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-[var(--ui-radius-pill)] bg-rose-100 text-rose-800 border border-rose-300 text-[10px] font-black uppercase tracking-wider shadow-2xs">
                            <X size={11} strokeWidth={3} />
                            <span>Ditolak</span>
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          {isPending && hasApprovalPermission && (
                            <>
                              <button
                                type="button"
                                onClick={() => handleApprove(item.record_id)}
                                disabled={actionLoading}
                                title="Setujui Permohonan (ACC)"
                                className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-[var(--ui-radius-small)] font-bold text-[10.5px] flex items-center gap-1 shadow-xs cursor-pointer border-none active:scale-95 transition-all"
                              >
                                <Check size={12} strokeWidth={3} />
                                <span>ACC</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => handleReject(item.record_id)}
                                disabled={actionLoading}
                                title="Tolak Permohonan"
                                className="px-2 py-1 bg-white hover:bg-rose-50 text-rose-600 border border-rose-200 rounded-[var(--ui-radius-small)] font-bold text-[10.5px] flex items-center gap-1 shadow-xs cursor-pointer active:scale-95 transition-all"
                              >
                                <X size={12} strokeWidth={3} />
                                <span>Tolak</span>
                              </button>
                            </>
                          )}

                          {hasApprovalPermission && (
                            <button
                              type="button"
                              onClick={() => handleDelete(item.record_id)}
                              disabled={actionLoading}
                              title="Hapus Data"
                              className="p-1.5 rounded-[var(--ui-radius-small)] bg-slate-100 hover:bg-rose-100 hover:text-rose-700 text-slate-500 cursor-pointer transition-colors"
                            >
                              <Trash2 size={13} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile Responsive Cards View */}
        <div className="md:hidden p-3 space-y-3">
          {loading ? (
            <div className="py-8 text-center text-slate-400 font-bold flex flex-col items-center gap-2">
              <div className="w-6 h-6 border-2 border-[var(--ui-primary)] border-t-transparent rounded-full animate-spin" />
              <span>Memuat data absensi...</span>
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="py-10 text-center text-slate-400 p-4 border border-dashed border-slate-200 rounded-[var(--ui-radius-card)]">
              <CheckCircle2 size={32} className="text-slate-400 opacity-60 mx-auto mb-2" />
              <div className="font-extrabold text-slate-700 text-xs">Tidak ada data surat izin / sakit</div>
            </div>
          ) : (
            filteredItems.map((item, idx) => {
              const isPending = item.approval_status === 'pending';
              const isApproved = item.approval_status === 'approved';
              const hasFile = Boolean(item.gdrive_url);

              return (
                <div key={item.record_id || idx} className="p-3.5 bg-white border border-slate-200/80 rounded-[var(--ui-radius-card)] shadow-xs flex flex-col gap-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-slate-800">
                      {new Date(item.tanggal).toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric', month: 'short' })}
                    </span>
                    <span className={`inline-flex px-2.5 py-0.5 rounded-[var(--ui-radius-pill)] text-[9.5px] font-black uppercase border ${
                      item.status === 'Sakit'
                        ? 'bg-amber-100 text-amber-800 border-amber-200'
                        : item.status === 'Dinas Luar'
                        ? 'bg-teal-100 text-teal-800 border-teal-200'
                        : 'bg-indigo-100 text-indigo-800 border-indigo-200'
                    }`}>
                      {item.status}
                    </span>
                  </div>

                  <div>
                    <div className="flex items-center justify-between">
                      <p className="font-extrabold text-slate-900 text-xs">{item.name || item.teacher_code}</p>
                      <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${
                        item.person_type === 'karyawan' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'
                      }`}>
                        {item.person_type === 'karyawan' ? 'Karyawan' : 'Guru'}
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-400 font-mono mt-0.5">NIP/Kode: {item.nip || item.teacher_code}</p>
                  </div>

                  {item.note && (
                    <p className="text-xs text-slate-700 bg-slate-50 p-2.5 rounded-[var(--ui-radius-small)] font-medium leading-relaxed">
                      {item.note}
                    </p>
                  )}

                  {/* Status & Actions Footer */}
                  <div className="flex items-center justify-between pt-2.5 border-t border-slate-100">
                    <div>
                      {isPending ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-black text-amber-700 uppercase">
                          <Clock size={12} />
                          <span>Menunggu ACC</span>
                        </span>
                      ) : isApproved ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-black text-emerald-700 uppercase">
                          <Check size={12} strokeWidth={3} />
                          <span>Disetujui</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[10px] font-black text-rose-700 uppercase">
                          <X size={12} strokeWidth={3} />
                          <span>Ditolak</span>
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      {hasFile && (
                        <button
                          type="button"
                          onClick={() => setPreviewItem(item)}
                          className="px-2.5 py-1 text-xs font-bold text-[var(--ui-primary)] bg-[var(--ui-primary)]/10 rounded-[var(--ui-radius-small)] flex items-center gap-1"
                        >
                          <Eye size={12} />
                          <span>Bukti</span>
                        </button>
                      )}

                      {isPending && hasApprovalPermission && (
                        <>
                          <button
                            type="button"
                            onClick={() => handleApprove(item.record_id)}
                            className="px-3 py-1 bg-emerald-600 text-white rounded-[var(--ui-radius-small)] font-black text-xs shadow-xs"
                          >
                            ACC
                          </button>
                          <button
                            type="button"
                            onClick={() => handleReject(item.record_id)}
                            className="px-2 py-1 bg-rose-50 text-rose-600 border border-rose-200 rounded-[var(--ui-radius-small)] font-black text-xs"
                          >
                            Tolak
                          </button>
                        </>
                      )}

                      {hasApprovalPermission && (
                        <button
                          type="button"
                          onClick={() => handleDelete(item.record_id)}
                          className="p-1 text-slate-400 hover:text-rose-600"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

      </div>

      {/* ── MODAL INPUT SURAT IZIN / SAKIT GURU & KARYAWAN ── */}
      {showInputModal && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-[var(--ui-radius-card)] shadow-[var(--ui-shadow-card)] max-w-lg w-full overflow-hidden border border-slate-200 animate-in zoom-in-95 duration-200 flex flex-col max-h-[92vh]">
            
            {/* Header */}
            <div className="px-5 py-4 border-b border-slate-100 bg-slate-50/80 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-[var(--ui-radius-small)] bg-[var(--ui-primary)]/10 border border-[var(--ui-primary)]/20 flex items-center justify-center text-[var(--ui-primary)] shadow-xs">
                  <FileText size={18} />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-800">Input Surat Izin / Sakit Pegawai</h3>
                  <p className="text-[10px] text-slate-400 font-medium">Catat izin, sakit, atau dinas luar untuk guru & karyawan</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowInputModal(false)}
                className="w-8 h-8 rounded-[var(--ui-radius-small)] hover:bg-slate-200 text-slate-400 flex items-center justify-center cursor-pointer transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            {/* Form Body */}
            <form onSubmit={handleSubmitInput} className="p-5 overflow-y-auto space-y-4 text-xs flex-1">
              {formError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-[var(--ui-radius-small)] text-rose-700 flex items-center gap-2 font-semibold text-xs">
                  <AlertTriangle size={15} className="shrink-0 text-rose-600" />
                  <span>{formError}</span>
                </div>
              )}

              {/* 1. Kategori: Guru atau Karyawan */}
              <div>
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider block mb-1.5">
                  1. Kategori Pegawai
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => { setFormPersonType('guru'); setSelectedPersonCode(''); setPersonSearchQuery(''); }}
                    className={`py-2 px-3 rounded-[var(--ui-radius-small)] text-xs font-extrabold border transition-all cursor-pointer flex items-center justify-center gap-2 ${
                      formPersonType === 'guru'
                        ? 'border-[var(--ui-primary)] bg-[var(--ui-primary)] text-white shadow-xs'
                        : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <Users size={14} />
                    <span>Guru Pendidik</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => { setFormPersonType('karyawan'); setSelectedPersonCode(''); setPersonSearchQuery(''); }}
                    className={`py-2 px-3 rounded-[var(--ui-radius-small)] text-xs font-extrabold border transition-all cursor-pointer flex items-center justify-center gap-2 ${
                      formPersonType === 'karyawan'
                        ? 'border-purple-600 bg-purple-600 text-white shadow-xs'
                        : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <Briefcase size={14} />
                    <span>Staf / Karyawan</span>
                  </button>
                </div>
              </div>

              {/* 2. Pilih Person */}
              <div>
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider block mb-1.5">
                  2. Pilih {formPersonType === 'karyawan' ? 'Staf Karyawan' : 'Guru Pendidik'}
                </label>
                <div className="relative mb-2">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder={`Cari nama atau NIP ${formPersonType}...`}
                    value={personSearchQuery}
                    onChange={e => setPersonSearchQuery(e.target.value)}
                    className="w-full pl-8 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-[var(--ui-radius-small)] text-xs font-semibold focus:outline-none focus:bg-white focus:border-[var(--ui-primary)]"
                  />
                </div>

                <div className="max-h-36 overflow-y-auto border border-slate-200 rounded-[var(--ui-radius-small)] divide-y divide-slate-100 bg-white">
                  {availablePeople.length === 0 ? (
                    <div className="p-3 text-center text-slate-400 text-xs">Tidak ditemukan</div>
                  ) : (
                    availablePeople.map(p => {
                      const code = String(p.code || p.nip || p.id);
                      const isSelected = selectedPersonCode === code;
                      return (
                        <div
                          key={code}
                          onClick={() => setSelectedPersonCode(code)}
                          className={`p-2.5 flex items-center justify-between cursor-pointer transition-colors ${
                            isSelected ? 'bg-[var(--ui-primary)]/10 text-[var(--ui-primary)] font-black' : 'hover:bg-slate-50 text-slate-700'
                          }`}
                        >
                          <div>
                            <p className="font-extrabold text-xs">{p.name || p.nama}</p>
                            <p className="text-[10px] text-slate-400">Kode/NIP: {p.nip || p.code || p.id} {p.division ? `• ${p.division}` : ''}</p>
                          </div>
                          {isSelected && <Check size={16} className="text-[var(--ui-primary)] shrink-0" />}
                        </div>
                      );
                    })
                  )}
                </div>

                {selectedPersonObj && (
                  <div className="mt-2 p-2.5 bg-emerald-50 border border-emerald-200 rounded-[var(--ui-radius-small)] text-emerald-800 text-xs font-bold flex items-center justify-between">
                    <span>Terpilih: <strong>{selectedPersonObj.name || selectedPersonObj.nama}</strong></span>
                    <span className="text-[10px] bg-emerald-600 text-white px-2 py-0.5 rounded-full">Siap</span>
                  </div>
                )}
              </div>

              {/* 3. Status Kehadiran */}
              <div>
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider block mb-1.5">
                  3. Status Izin
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {['Izin', 'Sakit', 'Dinas Luar'].map(st => (
                    <button
                      key={st}
                      type="button"
                      onClick={() => setFormStatus(st)}
                      className={`py-2 px-2.5 rounded-[var(--ui-radius-small)] text-xs font-extrabold border transition-all cursor-pointer text-center ${
                        formStatus === st
                          ? 'border-[var(--ui-primary)] bg-[var(--ui-primary)] text-white shadow-xs'
                          : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      {st}
                    </button>
                  ))}
                </div>
              </div>

              {/* 4. Periode Tanggal */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider block mb-1.5">
                    Tanggal Mulai
                  </label>
                  <input
                    type="date"
                    value={formStartDate}
                    onChange={e => setFormStartDate(e.target.value)}
                    required
                    className="w-full h-9 bg-slate-50 border border-slate-200 px-3 rounded-[var(--ui-radius-small)] text-xs font-bold text-slate-800 focus:bg-white focus:outline-none focus:border-[var(--ui-primary)]"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider block mb-1.5">
                    Tanggal Selesai (Opsional)
                  </label>
                  <input
                    type="date"
                    value={formEndDate}
                    onChange={e => setFormEndDate(e.target.value)}
                    min={formStartDate}
                    className="w-full h-9 bg-slate-50 border border-slate-200 px-3 rounded-[var(--ui-radius-small)] text-xs font-bold text-slate-800 focus:bg-white focus:outline-none focus:border-[var(--ui-primary)]"
                  />
                </div>
              </div>

              {/* 5. Alasan / Catatan */}
              <div>
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider block mb-1.5">
                  5. Keterangan / Alasan
                </label>
                <textarea
                  value={formNote}
                  onChange={e => setFormNote(e.target.value)}
                  rows={2}
                  placeholder="Contoh: Mengikuti pelatihan dinas di LPMP / Sakit flu surat dokter terlampir"
                  className="w-full bg-slate-50 border border-slate-200 p-2.5 rounded-[var(--ui-radius-small)] text-xs font-medium text-slate-800 focus:bg-white focus:outline-none focus:border-[var(--ui-primary)] resize-none"
                />
              </div>

              {/* 6. Upload Bukti Surat */}
              <div>
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider block mb-1.5">
                  6. Upload Surat / Bukti (Foto/PDF)
                </label>
                <label className="border-2 border-dashed border-slate-300 hover:border-[var(--ui-primary)] rounded-[var(--ui-radius-small)] p-3 flex flex-col items-center justify-center gap-1.5 cursor-pointer bg-slate-50 hover:bg-slate-100/60 transition-colors">
                  <UploadCloud size={20} className="text-slate-400" />
                  <span className="text-xs font-bold text-slate-600">
                    {formFileName ? formFileName : 'Pilih file dokumen / foto surat'}
                  </span>
                  <span className="text-[9.5px] text-slate-400 font-medium">PNG, JPG, PDF (Maks 5 MB)</span>
                  <input
                    type="file"
                    accept="image/*,application/pdf"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </label>
              </div>

              {/* Footer */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowInputModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold text-xs rounded-[var(--ui-radius-small)] cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-5 py-2 bg-[var(--ui-primary)] hover:opacity-90 text-white font-black text-xs rounded-[var(--ui-radius-small)] shadow-xs cursor-pointer border-none flex items-center gap-1.5"
                >
                  {actionLoading ? 'Menyimpan...' : 'Simpan Surat Izin'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL PREVIEW SURAT BUKTI ── */}
      {previewItem && (
        <div className="fixed inset-0 z-[160] flex items-center justify-center bg-black/70 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-[var(--ui-radius-card)] shadow-lg max-w-xl w-full overflow-hidden border border-slate-200 flex flex-col max-h-[90vh]">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div>
                <h4 className="font-extrabold text-slate-800 text-sm">Bukti Surat {previewItem.status}</h4>
                <p className="text-[10px] text-slate-400 font-medium">{previewItem.name} ({previewItem.tanggal})</p>
              </div>
              <button
                type="button"
                onClick={() => setPreviewItem(null)}
                className="w-7 h-7 rounded-[var(--ui-radius-small)] hover:bg-slate-200 text-slate-400 flex items-center justify-center cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>
            <div className="p-4 overflow-y-auto flex-1 flex items-center justify-center bg-slate-100/50 min-h-[300px]">
              {previewItem.gdrive_url?.startsWith('data:image') ? (
                <img
                  src={previewItem.gdrive_url}
                  alt="Bukti Surat"
                  className="max-w-full max-h-[70vh] rounded-[var(--ui-radius-small)] shadow-xs object-contain"
                />
              ) : previewItem.gdrive_url?.startsWith('data:application/pdf') ? (
                <iframe
                  src={previewItem.gdrive_url}
                  title="PDF Preview"
                  className="w-full h-[60vh] rounded-[var(--ui-radius-small)] border border-slate-200"
                />
              ) : previewItem.gdrive_url ? (
                <a
                  href={previewItem.gdrive_url}
                  target="_blank"
                  rel="noreferrer"
                  className="px-4 py-2 bg-[var(--ui-primary)] text-white rounded-[var(--ui-radius-small)] font-bold text-xs flex items-center gap-2 shadow-xs"
                >
                  <Download size={14} />
                  <span>Buka Dokumen di Tab Baru</span>
                </a>
              ) : (
                <div className="text-slate-400 text-xs font-bold">Tidak ada file lampiran</div>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
