import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  ClipboardList, 
  Plus, 
  Trash2, 
  RefreshCw, 
  AlertCircle, 
  CheckCircle2, 
  X, 
  CalendarDays, 
  Users, 
  Search, 
  Sparkles, 
  Filter, 
  Clock, 
  Check 
} from 'lucide-react';
import { Modal, Button } from '../components/ui.jsx';

const getSession = () => {
  try {
    const raw = sessionStorage.getItem('school_schedule_session_v1');
    const s = raw ? JSON.parse(raw) : null;
    if (s?.authToken) return s;
  } catch {}
  try {
    const raw = localStorage.getItem('school_schedule_session_v1');
    const s = raw ? JSON.parse(raw) : null;
    if (s?.authToken) return s;
  } catch {}
  try {
    const raw = localStorage.getItem('auth_store');
    const s = raw ? JSON.parse(raw) : null;
    if (s?.state?.user?.authToken) return s.state.user;
  } catch {}
  return null;
};

const formatDateRange = (date, dateEnd) => {
  if (!date) return '-';
  const opts = { day: '2-digit', month: 'short', year: 'numeric' };
  const d1 = new Date(date + 'T00:00:00').toLocaleDateString('id-ID', opts);
  if (!dateEnd || dateEnd === date) return d1;
  const d2 = new Date(dateEnd + 'T00:00:00').toLocaleDateString('id-ID', opts);
  return `${d1} – ${d2}`;
};

const getDaysDiff = (date, dateEnd) => {
  if (!date) return 1;
  const d1 = new Date(date + 'T00:00:00');
  const d2 = new Date((dateEnd || date) + 'T00:00:00');
  const diffTime = Math.abs(d2 - d1);
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
};

const EMPTY_FORM = {
  date: new Date().toISOString().split('T')[0],
  dateEnd: new Date().toISOString().split('T')[0],
  keterangan: '',
  label: 'Kegiatan Sekolah',
  targetClasses: [],
};

const PRESETS = [
  {
    title: 'Ujian TKA (Kelas XII - 3 Sesi Bebas Absensi)',
    label: 'Ujian TKA',
    keterangan: 'Siswa kelas XII mengikuti Ujian TKA dibagi 3 sesi. Presensi harian dibebaskan (otomatis hadir).',
    level: 'XII',
    badgeTone: 'bg-emerald-100 text-emerald-800 border-emerald-200'
  },
  {
    title: 'Lab Dipakai Ujian TKA (Kelas Diliburkan)',
    label: 'Lab Dipakai Ujian',
    keterangan: 'Ruang Lab Komputer digunakan untuk pelaksanaan Ujian TKA. Siswa kelas terdampak diliburkan / belajar mandiri di rumah.',
    level: 'specific',
    badgeTone: 'bg-amber-100 text-amber-800 border-amber-200'
  },
  {
    title: 'Dispensasi Lomba / Acara Sekolah',
    label: 'Dispensasi Kegiatan',
    keterangan: 'Dispensasi kehadiran resmi untuk siswa yang mewakili sekolah dalam kegiatan perlombaan atau dinas luar.',
    level: 'all',
    badgeTone: 'bg-indigo-100 text-indigo-800 border-indigo-200'
  },
  {
    title: 'Classmeeting / Kegiatan Pasca Asesmen',
    label: 'Classmeeting',
    keterangan: 'Kegiatan jeda semester / classmeeting sekolah seluruh tingkatan kelas.',
    level: 'all',
    badgeTone: 'bg-purple-100 text-purple-800 border-purple-200'
  }
];

export default function KeteranganMasalAbsensi({ authToken: propToken, username: propUsername, classes = [] }) {
  const session = getSession();
  const token = propToken || session?.authToken;
  const username = propUsername || session?.username || session?.name || 'Admin';

  const [remarks, setRemarks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [toast, setToast] = useState(null);
  const [search, setSearch] = useState('');
  const [periodFilter, setPeriodFilter] = useState('all'); // 'all' | 'active' | 'upcoming' | 'past'
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [classSearch, setClassSearch] = useState('');

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  // Normalisasi list nama kelas dari prop classes
  const normalizedClasses = useMemo(() => {
    if (!Array.isArray(classes) || classes.length === 0) {
      return [
        'X TKJ 1', 'X TKJ 2', 'X TKJ 3', 'X RPL 1', 'X RPL 2',
        'XI TKJ 1', 'XI TKJ 2', 'XI TKJ 3', 'XI RPL 1', 'XI RPL 2',
        'XII TKJ 1', 'XII TKJ 2', 'XII TKJ 3', 'XII RPL 1', 'XII RPL 2'
      ];
    }
    return classes.map(c => {
      if (typeof c === 'string') return c.trim();
      return (c.name || c.class_name || c.id || '').trim();
    }).filter(Boolean);
  }, [classes]);

  const filteredClassOptions = useMemo(() => {
    if (!classSearch) return normalizedClasses;
    const q = classSearch.toLowerCase();
    return normalizedClasses.filter(c => c.toLowerCase().includes(q));
  }, [normalizedClasses, classSearch]);

  const fetchRemarks = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/monitoring/absensi/bulk-remark', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setRemarks(Array.isArray(data?.data) ? data.data : Array.isArray(data) ? data : []);
    } catch {
      setRemarks([]);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchRemarks();
  }, [fetchRemarks]);

  const handleApplyPreset = (preset) => {
    let target = [];
    if (preset.level === 'XII') {
      target = normalizedClasses.filter(c => c.toUpperCase().includes('XII') || c.startsWith('12'));
    } else if (preset.level === 'XI') {
      target = normalizedClasses.filter(c => c.toUpperCase().includes('XI') || c.startsWith('11'));
    } else if (preset.level === 'X') {
      target = normalizedClasses.filter(c => (c.toUpperCase().includes('X ') || c.startsWith('10')) && !c.toUpperCase().includes('XI') && !c.toUpperCase().includes('XII'));
    }
    setForm(prev => ({
      ...prev,
      label: preset.label,
      keterangan: preset.keterangan,
      targetClasses: target
    }));
  };

  const toggleTargetClass = (clsName) => {
    setForm(prev => {
      const exists = prev.targetClasses.includes(clsName);
      if (exists) {
        return { ...prev, targetClasses: prev.targetClasses.filter(c => c !== clsName) };
      }
      return { ...prev, targetClasses: [...prev.targetClasses, clsName] };
    });
  };

  const selectLevelClasses = (lvl) => {
    let matched = [];
    if (lvl === 'all') {
      matched = [];
    } else if (lvl === 'XII') {
      matched = normalizedClasses.filter(c => c.toUpperCase().includes('XII') || c.startsWith('12'));
    } else if (lvl === 'XI') {
      matched = normalizedClasses.filter(c => (c.toUpperCase().includes('XI') || c.startsWith('11')) && !c.toUpperCase().includes('XII'));
    } else if (lvl === 'X') {
      matched = normalizedClasses.filter(c => (c.toUpperCase().includes('X ') || c.startsWith('10')) && !c.toUpperCase().includes('XI') && !c.toUpperCase().includes('XII'));
    }
    setForm(prev => ({ ...prev, targetClasses: matched }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.date) {
      showToast('Tanggal mulai wajib diisi.', 'error');
      return;
    }
    if (!form.keterangan.trim()) {
      showToast('Keterangan absensi wajib diisi.', 'error');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/monitoring/absensi/bulk-remark', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          date: form.date,
          dateEnd: form.dateEnd || form.date,
          keterangan: form.keterangan.trim(),
          label: form.label.trim() || 'Kegiatan Sekolah',
          targetClasses: form.targetClasses,
          createdBy: username,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || data?.message || 'Gagal menyimpan keterangan');

      showToast('Keterangan massal absensi berhasil diterapkan!');
      setForm(EMPTY_FORM);
      setIsModalOpen(false);
      fetchRemarks();
    } catch (err) {
      showToast(err.message || 'Gagal menyimpan.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Yakin ingin menghapus keterangan massal ini? Status absensi siswa pada tanggal tersebut akan kembali normal.')) return;
    setDeletingId(id);
    try {
      const res = await fetch(`/api/monitoring/absensi/bulk-remark/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Gagal menghapus');
      showToast('Keterangan massal berhasil dihapus.');
      setRemarks(prev => prev.filter(r => r.id !== id && r._id !== id));
    } catch (err) {
      showToast(err.message || 'Gagal menghapus.', 'error');
    } finally {
      setDeletingId(null);
    }
  };

  const todayStr = new Date().toISOString().split('T')[0];

  const processedRemarks = useMemo(() => {
    return remarks.map(r => {
      const start = r.date;
      const end = r.dateEnd || r.date;
      let statusTime = 'active';
      if (end < todayStr) statusTime = 'past';
      else if (start > todayStr) statusTime = 'upcoming';

      return {
        ...r,
        id: r.id || r._id,
        statusTime,
        daysCount: getDaysDiff(start, end)
      };
    });
  }, [remarks, todayStr]);

  const filteredRemarks = useMemo(() => {
    return processedRemarks.filter(r => {
      if (periodFilter === 'active' && r.statusTime !== 'active') return false;
      if (periodFilter === 'upcoming' && r.statusTime !== 'upcoming') return false;
      if (periodFilter === 'past' && r.statusTime !== 'past') return false;

      if (!search) return true;
      const q = search.toLowerCase();
      const matchLabel = (r.label || '').toLowerCase().includes(q);
      const matchKet = (r.keterangan || '').toLowerCase().includes(q);
      const matchClasses = Array.isArray(r.targetClasses) && r.targetClasses.some(c => String(c).toLowerCase().includes(q));
      return matchLabel || matchKet || matchClasses;
    });
  }, [processedRemarks, periodFilter, search]);

  const activeCount = processedRemarks.filter(r => r.statusTime === 'active').length;
  const upcomingCount = processedRemarks.filter(r => r.statusTime === 'upcoming').length;

  return (
    <div className="flex flex-col gap-5 w-full animate-in fade-in duration-300">
      
      {/* Toast Notification */}
      {toast && (
        <div className={`fixed bottom-5 right-5 z-50 px-4 py-3 rounded-[var(--ui-radius-card)] shadow-md border text-sm font-bold flex items-center gap-2.5 transition-all animate-in slide-in-from-bottom-3 ${
          toast.type === 'error' ? 'bg-rose-50 border-rose-200 text-rose-700' : 'bg-emerald-50 border-emerald-200 text-emerald-800'
        }`}>
          {toast.type === 'error' ? <AlertCircle size={17} className="text-rose-600" /> : <CheckCircle2 size={17} className="text-emerald-600" />}
          <span>{toast.message}</span>
          <button onClick={() => setToast(null)} className="ml-2 text-slate-400 hover:text-slate-600"><X size={14} /></button>
        </div>
      )}

      {/* Top Banner & Action Bar */}
      <div className="bg-white rounded-[var(--ui-radius-card)] border border-slate-200/80 shadow-xs p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start gap-3.5">
          <div className="w-10 h-10 rounded-[var(--ui-radius-small)] bg-amber-500/10 text-amber-600 flex items-center justify-center shrink-0 border border-amber-200">
            <ClipboardList size={20} />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-base font-black text-slate-800 tracking-tight">Keterangan Massal Absensi Siswa</h2>
              <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-[var(--ui-radius-small)] bg-amber-50 text-amber-700 border border-amber-200">
                Otomatis Bebas Alpa
              </span>
            </div>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Atur dispensasi atau keterangan libur/ujian (misal: Ujian TKA kelas XII atau Lab dipakai) untuk seluruh kelas atau kelas tertentu.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start md:self-center shrink-0">
          <button
            type="button"
            onClick={fetchRemarks}
            disabled={loading}
            className="p-2.5 rounded-[var(--ui-radius-small)] border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 transition-colors shadow-2xs cursor-pointer disabled:opacity-50"
            title="Refresh Data"
          >
            <RefreshCw size={15} className={loading ? "animate-spin text-amber-500" : ""} />
          </button>
          <Button
            type="button"
            onClick={() => {
              setForm(EMPTY_FORM);
              setIsModalOpen(true);
            }}
            className="flex items-center gap-2 shadow-xs cursor-pointer font-bold"
            style={{
              background: "var(--ui-primary)",
              color: "#ffffff"
            }}
          >
            <Plus size={16} />
            <span>Buat Keterangan Baru</span>
          </Button>
        </div>
      </div>

      {/* KPI Stats Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white rounded-[var(--ui-radius-card)] p-3.5 border border-slate-200/80 shadow-2xs">
          <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Keterangan</div>
          <div className="text-xl font-black text-slate-800 mt-0.5">{remarks.length}</div>
        </div>
        <div className="bg-white rounded-[var(--ui-radius-card)] p-3.5 border border-emerald-100 shadow-2xs bg-emerald-50/20">
          <div className="text-[10px] font-black text-emerald-600 uppercase tracking-widest flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Sedang Berjalan
          </div>
          <div className="text-xl font-black text-emerald-700 mt-0.5">{activeCount}</div>
        </div>
        <div className="bg-white rounded-[var(--ui-radius-card)] p-3.5 border border-amber-100 shadow-2xs bg-amber-50/20">
          <div className="text-[10px] font-black text-amber-600 uppercase tracking-widest flex items-center gap-1">
            <Clock size={11} />
            Akan Datang
          </div>
          <div className="text-xl font-black text-amber-700 mt-0.5">{upcomingCount}</div>
        </div>
        <div className="bg-white rounded-[var(--ui-radius-card)] p-3.5 border border-slate-200/80 shadow-2xs">
          <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Database Kelas</div>
          <div className="text-xl font-black text-slate-800 mt-0.5">{normalizedClasses.length} Kelas</div>
        </div>
      </div>

      {/* Search & Filter Toolbar */}
      <div className="bg-white rounded-[var(--ui-radius-card)] p-3 border border-slate-200/80 shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Cari keterangan, label, atau kelas..."
            className="w-full pl-9 pr-3 py-1.5 rounded-[var(--ui-radius-small)] bg-slate-50 border border-slate-200 text-xs font-bold text-slate-700 placeholder:text-slate-400 focus:bg-white focus:outline-[var(--ui-primary)]"
          />
        </div>

        <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
          <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider flex items-center gap-1 shrink-0">
            <Filter size={11} /> Filter:
          </span>
          {[
            { id: 'all', label: 'Semua' },
            { id: 'active', label: 'Sedang Aktif' },
            { id: 'upcoming', label: 'Mendatang' },
            { id: 'past', label: 'Selesai' }
          ].map(p => (
            <button
              key={p.id}
              type="button"
              onClick={() => setPeriodFilter(p.id)}
              className={`px-2.5 py-1 rounded-[var(--ui-radius-small)] text-xs font-bold transition-all cursor-pointer border ${
                periodFilter === p.id 
                  ? 'bg-slate-800 text-white border-slate-800 shadow-2xs' 
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Main Content: Table View on Desktop & Card View on Mobile */}
      <div className="bg-white rounded-[var(--ui-radius-card)] border border-slate-200/80 shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-400">
            <RefreshCw size={24} className="animate-spin mx-auto mb-2 text-amber-500" />
            <p className="text-xs font-bold">Memuat data keterangan massal...</p>
          </div>
        ) : filteredRemarks.length === 0 ? (
          <div className="p-12 text-center text-slate-400">
            <ClipboardList size={40} className="mx-auto mb-3 opacity-30 text-amber-500" />
            <p className="text-sm font-bold text-slate-700">Belum Ada Keterangan Massal</p>
            <p className="text-xs text-slate-400 max-w-md mx-auto mt-1">
              Tambahkan keterangan khusus seperti Ujian TKA atau kegiatan lab untuk membebaskan absensi siswa tertentu tanpa tercatat Alpa.
            </p>
            <Button
              type="button"
              onClick={() => { setForm(EMPTY_FORM); setIsModalOpen(true); }}
              className="mt-4 gap-2 text-xs font-bold"
              size="sm"
            >
              <Plus size={14} /> Buat Keterangan Sekarang
            </Button>
          </div>
        ) : (
          <>
            {/* Desktop Table */}
            <div className="hidden lg:block overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200/80 text-[10px] font-black uppercase tracking-wider text-slate-500">
                    <th className="py-3 px-4">Periode Tanggal</th>
                    <th className="py-3 px-4">Label & Status</th>
                    <th className="py-3 px-4">Keterangan / Alasan</th>
                    <th className="py-3 px-4">Target Kelas</th>
                    <th className="py-3 px-4">Pembuat</th>
                    <th className="py-3 px-4 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredRemarks.map((item) => {
                    const isAllClasses = !item.targetClasses || item.targetClasses.length === 0;
                    return (
                      <tr key={item.id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="py-3 px-4 whitespace-nowrap">
                          <div className="flex items-center gap-1.5 font-bold text-slate-800">
                            <CalendarDays size={13} className="text-amber-500 shrink-0" />
                            <span>{formatDateRange(item.date, item.dateEnd)}</span>
                          </div>
                          <span className="text-[10px] text-slate-400 font-semibold ml-5">
                            Durasi: {item.daysCount} hari
                          </span>
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap">
                          <div className="flex flex-col gap-1 items-start">
                            <span className="px-2 py-0.5 rounded-[var(--ui-radius-small)] bg-amber-50 text-amber-800 border border-amber-200/80 font-black text-[10.5px]">
                              {item.label || 'Kegiatan Sekolah'}
                            </span>
                            {item.statusTime === 'active' && (
                              <span className="text-[9px] font-bold text-emerald-600 flex items-center gap-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> Sedang Berjalan
                              </span>
                            )}
                            {item.statusTime === 'upcoming' && (
                              <span className="text-[9px] font-bold text-amber-600">
                                Akan Datang
                              </span>
                            )}
                            {item.statusTime === 'past' && (
                              <span className="text-[9px] font-semibold text-slate-400">
                                Sudah Selesai
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <p className="font-semibold text-slate-700 leading-relaxed max-w-sm">
                            {item.keterangan}
                          </p>
                        </td>
                        <td className="py-3 px-4">
                          {isAllClasses ? (
                            <span className="px-2 py-0.5 rounded-[var(--ui-radius-small)] bg-indigo-50 text-indigo-700 border border-indigo-200 text-[10px] font-bold inline-flex items-center gap-1">
                              <Users size={11} /> Semua Kelas
                            </span>
                          ) : (
                            <div className="flex flex-wrap gap-1 max-w-xs">
                              {item.targetClasses.map((cls, idx) => (
                                <span key={idx} className="px-1.5 py-0.5 rounded-[var(--ui-radius-small)] bg-slate-100 text-slate-700 text-[10px] font-black border border-slate-200">
                                  {cls}
                                </span>
                              ))}
                            </div>
                          )}
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap text-slate-500 font-medium">
                          {item.createdBy || 'Admin'}
                        </td>
                        <td className="py-3 px-4 text-right whitespace-nowrap">
                          <button
                            type="button"
                            onClick={() => handleDelete(item.id)}
                            disabled={deletingId === item.id}
                            className="p-1.5 rounded-[var(--ui-radius-small)] text-slate-400 hover:text-rose-600 hover:bg-rose-50 border border-transparent hover:border-rose-200 transition-all cursor-pointer"
                            title="Hapus Keterangan"
                          >
                            <Trash2 size={15} className={deletingId === item.id ? "animate-spin text-rose-500" : ""} />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile Card View */}
            <div className="lg:hidden divide-y divide-slate-100">
              {filteredRemarks.map((item) => {
                const isAllClasses = !item.targetClasses || item.targetClasses.length === 0;
                return (
                  <div key={item.id} className="p-4 space-y-2.5">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="px-2 py-0.5 rounded-[var(--ui-radius-small)] bg-amber-50 text-amber-800 border border-amber-200 text-[10px] font-black">
                          {item.label || 'Kegiatan Sekolah'}
                        </span>
                        {item.statusTime === 'active' && (
                          <span className="text-[9px] font-bold text-emerald-600 flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> Aktif
                          </span>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => handleDelete(item.id)}
                        disabled={deletingId === item.id}
                        className="p-1 rounded-[var(--ui-radius-small)] text-slate-400 hover:text-rose-600 cursor-pointer"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>

                    <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
                      <CalendarDays size={13} className="text-amber-500 shrink-0" />
                      <span>{formatDateRange(item.date, item.dateEnd)}</span>
                      <span className="text-[10px] text-slate-400 font-semibold">({item.daysCount} hari)</span>
                    </div>

                    <p className="text-xs text-slate-600 font-medium leading-relaxed">
                      {item.keterangan}
                    </p>

                    <div className="flex items-center gap-1.5 flex-wrap pt-1 border-t border-slate-50">
                      <span className="text-[10px] font-bold text-slate-400">Kelas:</span>
                      {isAllClasses ? (
                        <span className="px-1.5 py-0.2 rounded bg-indigo-50 text-indigo-700 text-[10px] font-bold">Semua Kelas</span>
                      ) : (
                        item.targetClasses.map((cls, i) => (
                          <span key={i} className="px-1.5 py-0.2 rounded bg-slate-100 text-slate-700 text-[9.5px] font-bold border border-slate-200">
                            {cls}
                          </span>
                        ))
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* Modern Modal Buat Keterangan */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Buat Keterangan Massal Absensi"
        maxWidth="max-w-2xl"
      >
        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          
          {/* Preset 1-Click Buttons */}
          <div className="bg-slate-50 p-3 rounded-[var(--ui-radius-card)] border border-slate-200/80">
            <div className="flex items-center gap-1.5 text-[10.5px] font-black text-slate-500 uppercase tracking-wider mb-2">
              <Sparkles size={12} className="text-amber-500" />
              Template Cepat (1-Klik Isi Form):
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {PRESETS.map((p, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleApplyPreset(p)}
                  className="p-2 rounded-[var(--ui-radius-small)] bg-white hover:bg-amber-50/60 border border-slate-200/90 text-left transition-all cursor-pointer shadow-2xs hover:border-amber-300"
                >
                  <div className="font-bold text-slate-800 text-[11px] truncate">{p.title}</div>
                  <div className="text-[9.5px] text-slate-400 truncate mt-0.5">{p.label}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Dates Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-1">
                Tanggal Mulai <span className="text-rose-500">*</span>
              </label>
              <input
                type="date"
                required
                value={form.date}
                onChange={e => setForm(f => ({ ...f, date: e.target.value, dateEnd: f.dateEnd < e.target.value ? e.target.value : f.dateEnd }))}
                className="w-full bg-slate-50 border border-slate-200 p-2.5 rounded-[var(--ui-radius-small)] font-bold text-xs focus:bg-white focus:outline-[var(--ui-primary)]"
              />
            </div>
            <div>
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-1">
                Tanggal Selesai <span className="text-rose-500">*</span>
              </label>
              <input
                type="date"
                required
                min={form.date}
                value={form.dateEnd}
                onChange={e => setForm(f => ({ ...f, dateEnd: e.target.value }))}
                className="w-full bg-slate-50 border border-slate-200 p-2.5 rounded-[var(--ui-radius-small)] font-bold text-xs focus:bg-white focus:outline-[var(--ui-primary)]"
              />
            </div>
          </div>

          {/* Label Singkat */}
          <div>
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-1">
              Label Singkat Badge <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={form.label}
              onChange={e => setForm(f => ({ ...f, label: e.target.value }))}
              placeholder="Contoh: Ujian TKA / Lab Dipakai Ujian / Dispensasi Lomba"
              className="w-full bg-slate-50 border border-slate-200 p-2.5 rounded-[var(--ui-radius-small)] font-bold text-xs focus:bg-white focus:outline-[var(--ui-primary)]"
            />
          </div>

          {/* Keterangan Lengkap */}
          <div>
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-1">
              Keterangan Lengkap / Alasan <span className="text-rose-500">*</span>
            </label>
            <textarea
              required
              rows={2}
              value={form.keterangan}
              onChange={e => setForm(f => ({ ...f, keterangan: e.target.value }))}
              placeholder="Jelaskan alasan pembebasan absensi agar tercatat rapi di rekapitulasi..."
              className="w-full bg-slate-50 border border-slate-200 p-2.5 rounded-[var(--ui-radius-small)] font-bold text-xs focus:bg-white focus:outline-[var(--ui-primary)] resize-none"
            />
          </div>

          {/* Interactive Class Selector */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                Target Kelas yang Terdampak
              </label>
              <span className="text-[10px] font-bold text-slate-500">
                {form.targetClasses.length === 0 ? 'Semua Kelas (Seluruh Sekolah)' : `${form.targetClasses.length} kelas dipilih`}
              </span>
            </div>

            {/* Quick Preset Buttons for Classes */}
            <div className="flex items-center gap-1.5 flex-wrap mb-2">
              <button
                type="button"
                onClick={() => selectLevelClasses('all')}
                className={`px-2 py-1 rounded-[var(--ui-radius-small)] text-[10px] font-black border transition-colors cursor-pointer ${
                  form.targetClasses.length === 0 ? 'bg-slate-800 text-white border-slate-800' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                }`}
              >
                Semua Kelas
              </button>
              <button
                type="button"
                onClick={() => selectLevelClasses('XII')}
                className="px-2 py-1 rounded-[var(--ui-radius-small)] text-[10px] font-black bg-white text-slate-600 border border-slate-200 hover:bg-slate-50 transition-colors cursor-pointer"
              >
                + Semua Kelas XII
              </button>
              <button
                type="button"
                onClick={() => selectLevelClasses('XI')}
                className="px-2 py-1 rounded-[var(--ui-radius-small)] text-[10px] font-black bg-white text-slate-600 border border-slate-200 hover:bg-slate-50 transition-colors cursor-pointer"
              >
                + Semua Kelas XI
              </button>
              <button
                type="button"
                onClick={() => selectLevelClasses('X')}
                className="px-2 py-1 rounded-[var(--ui-radius-small)] text-[10px] font-black bg-white text-slate-600 border border-slate-200 hover:bg-slate-50 transition-colors cursor-pointer"
              >
                + Semua Kelas X
              </button>
            </div>

            {/* Filter Search Input for Classes */}
            <div className="relative mb-2">
              <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={classSearch}
                onChange={e => setClassSearch(e.target.value)}
                placeholder="Ketik untuk memfilter nama kelas..."
                className="w-full pl-7 pr-2.5 py-1 rounded-[var(--ui-radius-small)] bg-slate-50 border border-slate-200 text-[11px] font-bold text-slate-700 placeholder:text-slate-400 focus:bg-white focus:outline-[var(--ui-primary)]"
              />
            </div>

            {/* Class Chips Checklist */}
            <div className="border border-slate-200 rounded-[var(--ui-radius-small)] p-2.5 max-h-36 overflow-y-auto bg-slate-50/50 flex flex-wrap gap-1.5">
              {filteredClassOptions.map((cls) => {
                const isSelected = form.targetClasses.includes(cls);
                return (
                  <button
                    key={cls}
                    type="button"
                    onClick={() => toggleTargetClass(cls)}
                    className={`px-2 py-1 rounded-[var(--ui-radius-small)] text-[10.5px] font-black transition-all flex items-center gap-1 border cursor-pointer ${
                      isSelected 
                        ? 'bg-[var(--ui-primary)] text-white border-[var(--ui-primary)] shadow-2xs' 
                        : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {isSelected && <Check size={11} strokeWidth={3} />}
                    <span>{cls}</span>
                  </button>
                );
              })}
            </div>
            <p className="text-[10px] text-slate-400 mt-1">
              *Jika tidak ada kelas yang dipilih, keterangan berlaku untuk <strong>seluruh kelas</strong> di sekolah.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsModalOpen(false)}
            >
              Batal
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={submitting}
              className="flex items-center gap-1.5 font-bold"
              style={{
                background: "var(--ui-primary)",
                color: "#ffffff"
              }}
            >
              {submitting ? <RefreshCw size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
              {submitting ? 'Menyimpan...' : 'Simpan & Terapkan'}
            </Button>
          </div>
        </form>
      </Modal>

    </div>
  );
}
