import { useState, useEffect, useCallback } from 'react';
import { ClipboardList, Plus, Trash2, RefreshCw, AlertCircle, CheckCircle2, X, CalendarDays, Users } from 'lucide-react';

const getSession = () => {
  try {
    const raw = sessionStorage.getItem('school_schedule_session_v1');
    const s = raw ? JSON.parse(raw) : null;
    return s?.authToken && s?.role ? s : null;
  } catch { return null; }
};

const formatDateRange = (date, dateEnd) => {
  const opts = { day: '2-digit', month: 'short', year: 'numeric' };
  const d1 = new Date(date + 'T00:00:00').toLocaleDateString('id-ID', opts);
  if (!dateEnd || dateEnd === date) return d1;
  const d2 = new Date(dateEnd + 'T00:00:00').toLocaleDateString('id-ID', opts);
  return `${d1} – ${d2}`;
};

const EMPTY_FORM = {
  date: '',
  dateEnd: '',
  keterangan: '',
  label: 'Kegiatan Sekolah',
  targetClasses: '',
};

export default function KeteranganMasalAbsensi() {
  const session = getSession();
  const token = session?.authToken;
  const username = session?.username || session?.name || 'Admin';

  const [remarks, setRemarks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [form, setForm] = useState(EMPTY_FORM);
  const [showForm, setShowForm] = useState(false);

  const fetchRemarks = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/monitoring/absensi/bulk-remark', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error(`Gagal memuat data (HTTP ${res.status})`);
      const data = await res.json();
      setRemarks(Array.isArray(data?.data) ? data.data : Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message || 'Gagal memuat keterangan massal.');
      setRemarks([]);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { fetchRemarks(); }, [fetchRemarks]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.date) { setError('Tanggal mulai wajib diisi.'); return; }
    if (!form.keterangan.trim()) { setError('Keterangan wajib diisi.'); return; }
    setSubmitting(true);
    setError('');
    setSuccess('');
    const targetClassesArr = form.targetClasses
      ? form.targetClasses.split(',').map(s => s.trim()).filter(Boolean)
      : [];
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
          targetClasses: targetClassesArr,
          createdBy: username,
        }),
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData?.message || `Gagal menyimpan (HTTP ${res.status})`);
      }
      setSuccess('Keterangan massal berhasil disimpan.');
      setForm(EMPTY_FORM);
      setShowForm(false);
      fetchRemarks();
    } catch (err) {
      setError(err.message || 'Gagal menyimpan keterangan massal.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Hapus keterangan massal ini?')) return;
    setDeletingId(id);
    setError('');
    try {
      const res = await fetch(`/api/monitoring/absensi/bulk-remark/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error(`Gagal menghapus (HTTP ${res.status})`);
      setSuccess('Keterangan berhasil dihapus.');
      setRemarks(prev => prev.filter(r => r.id !== id && r._id !== id));
    } catch (err) {
      setError(err.message || 'Gagal menghapus keterangan.');
    } finally {
      setDeletingId(null);
    }
  };

  const dismissAlert = (type) => {
    if (type === 'error') setError('');
    else setSuccess('');
  };

  return (
    <div className="flex flex-col gap-5 animate-in fade-in duration-300">

      {/* ── Header ── */}
      <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-slate-200/80 shadow-sm p-5">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center shadow-sm shrink-0">
              <ClipboardList size={18} className="text-white" />
            </div>
            <div>
              <h2 className="font-black text-slate-800 text-base">Keterangan Massal Absensi</h2>
              <p className="text-xs text-slate-500">Buat keterangan otomatis untuk absensi siswa secara massal</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={fetchRemarks}
              disabled={loading}
              className="p-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-500 hover:text-slate-700 transition-colors shadow-xs disabled:opacity-50"
              title="Refresh"
            >
              <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
            </button>
            <button
              onClick={() => { setShowForm(v => !v); setError(''); setSuccess(''); }}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 text-white text-sm font-bold shadow-sm hover:opacity-90 transition-opacity"
            >
              <Plus size={15} />
              Buat Keterangan
            </button>
          </div>
        </div>
      </div>

      {/* ── Alerts ── */}
      {error && (
        <div className="flex items-center gap-3 bg-rose-50 border border-rose-200 rounded-xl px-4 py-3 text-rose-700 shadow-xs">
          <AlertCircle size={16} className="shrink-0" />
          <span className="text-sm font-semibold flex-1">{error}</span>
          <button onClick={() => dismissAlert('error')} className="text-rose-400 hover:text-rose-600">
            <X size={14} />
          </button>
        </div>
      )}
      {success && (
        <div className="flex items-center gap-3 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3 text-emerald-700 shadow-xs">
          <CheckCircle2 size={16} className="shrink-0" />
          <span className="text-sm font-semibold flex-1">{success}</span>
          <button onClick={() => dismissAlert('success')} className="text-emerald-400 hover:text-emerald-600">
            <X size={14} />
          </button>
        </div>
      )}

      {/* ── Form Buat Keterangan ── */}
      {showForm && (
        <div className="bg-white rounded-2xl border border-amber-200/80 shadow-sm p-5">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-7 h-7 rounded-lg bg-amber-100 flex items-center justify-center">
              <Plus size={14} className="text-amber-600" />
            </div>
            <h3 className="font-black text-slate-800 text-sm">Buat Keterangan Massal Baru</h3>
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 mb-2 block">
                  Tanggal Mulai <span className="text-rose-500">*</span>
                </label>
                <input
                  type="date"
                  required
                  value={form.date}
                  onChange={e => setForm(f => ({ ...f, date: e.target.value, dateEnd: f.dateEnd || e.target.value }))}
                  className="w-full border-none bg-slate-50 p-3.5 rounded-[var(--ui-radius-small)] text-sm font-bold focus:bg-white focus:outline-[var(--ui-primary)]"
                />
              </div>
              <div>
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 mb-2 block">
                  Tanggal Selesai
                </label>
                <input
                  type="date"
                  value={form.dateEnd}
                  min={form.date}
                  onChange={e => setForm(f => ({ ...f, dateEnd: e.target.value }))}
                  className="w-full border-none bg-slate-50 p-3.5 rounded-[var(--ui-radius-small)] text-sm font-bold focus:bg-white focus:outline-[var(--ui-primary)]"
                />
              </div>
            </div>
            <div>
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 mb-2 block">
                Label Singkat
              </label>
              <input
                type="text"
                value={form.label}
                onChange={e => setForm(f => ({ ...f, label: e.target.value }))}
                className="w-full border-none bg-slate-50 p-3.5 rounded-[var(--ui-radius-small)] text-sm font-bold focus:bg-white focus:outline-[var(--ui-primary)]"
                placeholder="Contoh: Kegiatan Sekolah"
              />
            </div>
            <div>
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 mb-2 block">
                Keterangan Lengkap <span className="text-rose-500">*</span>
              </label>
              <textarea
                required
                rows={3}
                value={form.keterangan}
                onChange={e => setForm(f => ({ ...f, keterangan: e.target.value }))}
                className="w-full border-none bg-slate-50 p-3.5 rounded-[var(--ui-radius-small)] text-sm font-bold focus:bg-white focus:outline-[var(--ui-primary)] resize-none"
                placeholder="Contoh: Lab digunakan untuk Ujian TKA, siswa kelas X TKJ diliburkan"
              />
            </div>
            <div>
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 mb-2 block">
                Kelas yang Terdampak
              </label>
              <input
                type="text"
                value={form.targetClasses}
                onChange={e => setForm(f => ({ ...f, targetClasses: e.target.value }))}
                className="w-full border-none bg-slate-50 p-3.5 rounded-[var(--ui-radius-small)] text-sm font-bold focus:bg-white focus:outline-[var(--ui-primary)]"
                placeholder="Pisah koma, kosong = semua kelas. Contoh: X TKJ 3, X TKJ 1"
              />
              <p className="text-[10px] text-slate-400 font-semibold mt-1 ml-1">
                Kosongkan untuk semua kelas. Pisahkan nama kelas dengan koma.
              </p>
            </div>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => { setShowForm(false); setForm(EMPTY_FORM); setError(''); }}
                className="px-4 py-2 rounded-xl border border-slate-200 bg-white text-slate-600 text-sm font-bold hover:bg-slate-50 transition-colors"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="flex items-center gap-2 px-5 py-2 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 text-white text-sm font-bold shadow-sm hover:opacity-90 transition-opacity disabled:opacity-60"
              >
                {submitting ? <RefreshCw size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
                {submitting ? 'Menyimpan...' : 'Simpan Keterangan'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ── Daftar Keterangan — Desktop Table ── */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <h3 className="font-black text-slate-700 text-sm flex items-center gap-2">
            <ClipboardList size={15} className="text-amber-500" />
            Daftar Keterangan Massal
            {!loading && (
              <span className="ml-1 px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 text-[10px] font-black">
                {remarks.length}
              </span>
            )}
          </h3>
        </div>

        {/* Desktop table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                <th className="text-left text-[10px] font-black text-slate-500 uppercase tracking-widest px-4 py-3">Tanggal</th>
                <th className="text-left text-[10px] font-black text-slate-500 uppercase tracking-widest px-4 py-3">Label</th>
                <th className="text-left text-[10px] font-black text-slate-500 uppercase tracking-widest px-4 py-3">Keterangan</th>
                <th className="text-left text-[10px] font-black text-slate-500 uppercase tracking-widest px-4 py-3">Kelas</th>
                <th className="text-left text-[10px] font-black text-slate-500 uppercase tracking-widest px-4 py-3">Dibuat Oleh</th>
                <th className="text-right text-[10px] font-black text-slate-500 uppercase tracking-widest px-4 py-3">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: 6 }).map((__, j) => (
                      <td key={j} className="px-4 py-3">
                        <div className="h-4 bg-slate-100 rounded animate-pulse" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : remarks.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-slate-400">
                    <ClipboardList size={36} className="mx-auto mb-3 opacity-30" />
                    <p className="font-bold text-sm">Belum ada keterangan massal</p>
                    <p className="text-xs mt-1">Klik "Buat Keterangan" untuk menambahkan.</p>
                  </td>
                </tr>
              ) : (
                remarks.map((r) => {
                  const id = r.id || r._id;
                  const classes = Array.isArray(r.targetClasses) && r.targetClasses.length > 0
                    ? r.targetClasses.join(', ')
                    : 'Semua Kelas';
                  return (
                    <tr key={id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-700">
                          <CalendarDays size={12} className="text-amber-500 shrink-0" />
                          {formatDateRange(r.date, r.dateEnd)}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 text-[10px] font-black">
                          {r.label || 'Kegiatan Sekolah'}
                        </span>
                      </td>
                      <td className="px-4 py-3 max-w-[240px]">
                        <p className="text-xs font-semibold text-slate-600 line-clamp-2">{r.keterangan}</p>
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-slate-600">
                          <Users size={11} className="text-slate-400 shrink-0" />
                          {classes}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs text-slate-500 font-semibold">{r.createdBy || '-'}</span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => handleDelete(id)}
                          disabled={deletingId === id}
                          className="p-2 rounded-xl text-rose-400 hover:bg-rose-50 hover:text-rose-600 transition-colors disabled:opacity-50"
                          title="Hapus"
                        >
                          {deletingId === id
                            ? <RefreshCw size={13} className="animate-spin" />
                            : <Trash2 size={13} />
                          }
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile card view */}
        <div className="md:hidden divide-y divide-slate-100">
          {loading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="p-4 space-y-2 animate-pulse">
                <div className="h-4 bg-slate-100 rounded w-3/4" />
                <div className="h-3 bg-slate-100 rounded w-full" />
                <div className="h-3 bg-slate-100 rounded w-1/2" />
              </div>
            ))
          ) : remarks.length === 0 ? (
            <div className="px-4 py-12 text-center text-slate-400">
              <ClipboardList size={36} className="mx-auto mb-3 opacity-30" />
              <p className="font-bold text-sm">Belum ada keterangan massal</p>
              <p className="text-xs mt-1">Klik "Buat Keterangan" untuk menambahkan.</p>
            </div>
          ) : (
            remarks.map((r) => {
              const id = r.id || r._id;
              const classes = Array.isArray(r.targetClasses) && r.targetClasses.length > 0
                ? r.targetClasses.join(', ')
                : 'Semua Kelas';
              return (
                <div key={id} className="p-4 hover:bg-slate-50/50 transition-colors">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1.5">
                        <span className="inline-flex items-center gap-1 text-xs font-bold text-slate-700">
                          <CalendarDays size={11} className="text-amber-500" />
                          {formatDateRange(r.date, r.dateEnd)}
                        </span>
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 text-[10px] font-black">
                          {r.label || 'Kegiatan Sekolah'}
                        </span>
                      </div>
                      <p className="text-sm font-semibold text-slate-700 mb-1 line-clamp-2">{r.keterangan}</p>
                      <div className="flex items-center gap-3 text-[11px] text-slate-500 font-semibold">
                        <span className="flex items-center gap-1">
                          <Users size={10} /> {classes}
                        </span>
                        {r.createdBy && <span>oleh {r.createdBy}</span>}
                      </div>
                    </div>
                    <button
                      onClick={() => handleDelete(id)}
                      disabled={deletingId === id}
                      className="p-2 rounded-xl text-rose-400 hover:bg-rose-50 hover:text-rose-600 transition-colors disabled:opacity-50 shrink-0"
                    >
                      {deletingId === id
                        ? <RefreshCw size={14} className="animate-spin" />
                        : <Trash2 size={14} />
                      }
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
