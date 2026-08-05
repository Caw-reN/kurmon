import { useState, useEffect, useCallback } from 'react';
import useAuthStore from '../../../store/monitoring/authStore';
import useFiturStore from '../../../store/monitoring/fiturStore';
import { 
  Lock, CheckCircle2, BookOpen, Calendar, Clock, AlertCircle, X, ImagePlus, Loader2, 
  PenTool, FileText, Check, ShieldAlert, Sparkles, UserCheck, Trash2, Plus, ArrowRight, ShieldCheck 
} from 'lucide-react';
import { Button } from '../../../components/ui.jsx';

/**
 * student/Logbook.jsx
 * Halaman Logbook & Jurnal Kegiatan Harian PKL Siswa.
 * Redesigned with Full SVG Lucide Icons, NO Emojis, Form & History Views.
 */

const Logbook = () => {
  const { user } = useAuthStore();
  const { isFiturAktif } = useFiturStore();
  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];

  const [activeSubTab, setActiveSubTab] = useState('write'); // 'write' | 'history'

  const [form, setForm] = useState({
    tanggal: todayStr,
    kegiatan: '',
    kendala: '',
    solusi: '',
    jamMasuk: '08:00',
    jamKeluar: '17:00',
  });
  const [photos, setPhotos] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitDone, setSubmitDone] = useState(false);
  const [errors, setErrors] = useState({});
  const [submitError, setSubmitError] = useState('');
  const [photoError, setPhotoError] = useState('');
  const [toast, setToast] = useState(null);

  // History Data State
  const [historyList, setHistoryList] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  const fetchHistory = useCallback(async () => {
    setLoadingHistory(true);
    try {
      const sessionData = JSON.parse(sessionStorage.getItem('school_schedule_session_v1') || '{}');
      const authToken = sessionData?.authToken;
      const res = await fetch('/api/pkl/logbooks/student', {
        headers: { 'Authorization': `Bearer ${authToken}` }
      });
      const data = await res.json();
      if (data.ok && Array.isArray(data.data)) {
        setHistoryList(data.data);
      }
    } catch (e) {
      console.error(e);
    }
    setLoadingHistory(false);
  }, []);

  useEffect(() => {
    if (activeSubTab === 'history') {
      fetchHistory();
    }
  }, [activeSubTab, fetchHistory]);

  const handleChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: '' }));
  };

  const handlePhotoAdd = (e) => {
    const files = Array.from(e.target.files);
    if (photos.length + files.length > 5) {
      setPhotoError('Maksimal 5 foto dokumentasi.');
      return;
    }
    setPhotoError('');
    const newPhotos = files.map((file) => ({
      id: Date.now() + Math.random(),
      file,
      preview: URL.createObjectURL(file),
    }));
    setPhotos((prev) => [...prev, ...newPhotos]);
  };

  const removePhoto = (id) => {
    setPhotos((prev) => {
      const removed = prev.find((p) => p.id === id);
      if (removed) URL.revokeObjectURL(removed.preview);
      return prev.filter((p) => p.id !== id);
    });
  };

  const validate = () => {
    const errs = {};
    if (!form.kegiatan.trim() || form.kegiatan.trim().length < 20)
      errs.kegiatan = 'Deskripsi kegiatan minimal 20 karakter.';
    if (!form.kendala.trim())
      errs.kendala = 'Isi kolom kendala (tulis "Tidak ada kendala" jika lancar).';
    if (!form.solusi.trim())
      errs.solusi = 'Isi kolom solusi.';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setSubmitError('');
    setIsSubmitting(true);
    try {
      const sessionData = JSON.parse(sessionStorage.getItem('school_schedule_session_v1') || '{}');
      const authToken = sessionData?.authToken;
      const res = await fetch('/api/pkl/logbooks/student', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${authToken}` },
        body: JSON.stringify(form)
      });
      const data = await res.json();
      if (data.ok) {
        setSubmitDone(true);
        showToast('Jurnal berhasil disimpan');
      } else {
        setSubmitError(data.error || 'Gagal menyimpan logbook');
      }
    } catch {
      setSubmitError('Terjadi kesalahan saat menyimpan');
    }
    setIsSubmitting(false);
  };

  if (!isFiturAktif('jurnal')) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] px-6 text-center">
        <div className="w-20 h-20 rounded-full bg-slate-100 flex items-center justify-center mb-4 border border-slate-200">
          <Lock size={36} className="text-slate-400" />
        </div>
        <h2 className="text-xl font-black text-slate-800 mb-2">Fitur Jurnal Dinonaktifkan</h2>
        <p className="text-xs text-slate-500 max-w-xs leading-relaxed">
          Pengisian jurnal harian PKL saat ini dinonaktifkan oleh Admin/Sekolah.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 w-full animate-in fade-in slide-in-from-bottom-4 duration-300">
      
      {/* ── UNIFIED HERO HEADER ──────────────────────────────────────── */}
      <div 
        className="rounded-[var(--ui-radius-card)] p-6 md:p-8 text-white relative overflow-hidden shadow-[var(--ui-shadow-card)] flex flex-col md:flex-row md:items-center justify-between gap-6"
        style={{ background: 'linear-gradient(135deg, var(--ui-primary,#064e3b) 0%, color-mix(in srgb, var(--ui-primary,#064e3b) 80%, #0f172a) 100%)' }}
      >
        <div className="pointer-events-none absolute -top-12 -right-12 w-56 h-56 rounded-full bg-white/10 blur-2xl" />
        <div className="pointer-events-none absolute -bottom-10 -left-10 w-44 h-44 rounded-full bg-cyan-400/10 blur-xl" />

        <div className="relative z-10 space-y-1">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 text-white text-[10px] font-black uppercase tracking-wider border border-white/20 mb-1">
            <BookOpen size={14} /> Jurnal Harian PKL
          </div>
          <h1 className="text-2xl md:text-3xl font-black text-white tracking-tight leading-tight">
            Logbook Jurnal Kegiatan
          </h1>
          <p className="text-white/80 text-xs md:text-sm font-medium">
            Dokumentasikan seluruh aktivitas, kendala, dan foto kegiatan PKL Anda hari ini.
          </p>
        </div>

        {/* View Switcher Buttons */}
        <div className="relative z-10 flex items-center gap-2 bg-white/10 backdrop-blur-md p-1.5 rounded-[var(--ui-radius-control)] border border-white/20 shrink-0">
          <button
            type="button"
            onClick={() => { setActiveSubTab('write'); setSubmitDone(false); }}
            className={`px-4 py-2 rounded-[var(--ui-radius-small)] text-xs font-black transition-colors flex items-center gap-1.5 border-none cursor-pointer ${
              activeSubTab === 'write' ? 'bg-white text-[var(--ui-primary,#064e3b)] shadow-sm' : 'text-white hover:bg-white/10'
            }`}
          >
            <PenTool size={14} /> Tulis Jurnal
          </button>
          <button
            type="button"
            onClick={() => setActiveSubTab('history')}
            className={`px-4 py-2 rounded-[var(--ui-radius-small)] text-xs font-black transition-colors flex items-center gap-1.5 border-none cursor-pointer ${
              activeSubTab === 'history' ? 'bg-white text-[var(--ui-primary,#064e3b)] shadow-sm' : 'text-white hover:bg-white/10'
            }`}
          >
            <BookOpen size={14} /> Riwayat Jurnal
          </button>
        </div>
      </div>

      {/* ── SUCCESS STATE ───────────────────────────────────────────── */}
      {submitDone && activeSubTab === 'write' && (
        <div className="ui-card p-8 md:p-10 max-w-xl mx-auto text-center space-y-4 border border-slate-200/80">
          <div className="w-16 h-16 rounded-[var(--ui-radius-card)] bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto border border-emerald-200 shadow-inner">
            <CheckCircle2 size={36} />
          </div>
          <h2 className="text-xl font-black text-slate-800">Jurnal Hari Ini Tersimpan!</h2>
          <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
            Laporan kegiatan tanggal <span className="font-bold text-slate-800">{new Date(form.tanggal).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</span> telah berhasil dikirim.
          </p>

          <div className="p-3.5 rounded-[var(--ui-radius-control)] bg-amber-50 border border-amber-200 text-amber-800 text-xs font-semibold flex items-center justify-center gap-2">
            <Clock size={15} className="text-amber-600 shrink-0" />
            <span>Menunggu validasi dan tinjauan Guru Pembimbing PKL.</span>
          </div>

          <div className="pt-3 flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              type="button"
              onClick={() => {
                setSubmitDone(false);
                setForm({ ...form, kegiatan: '', kendala: '', solusi: '' });
                setPhotos([]);
              }}
              className="w-full sm:w-auto px-5 py-2.5 rounded-[var(--ui-radius-control)] bg-[var(--ui-primary,#064e3b)] text-white text-xs font-black hover:opacity-95 border-none cursor-pointer shadow-xs"
            >
              + Tulis Jurnal Lainnya
            </button>
            <button
              type="button"
              onClick={() => setActiveSubTab('history')}
              className="w-full sm:w-auto px-5 py-2.5 rounded-[var(--ui-radius-control)] bg-slate-100 text-slate-700 text-xs font-bold hover:bg-slate-200 border-none cursor-pointer"
            >
              Lihat Riwayat Jurnal &rarr;
            </button>
          </div>
        </div>
      )}

      {/* ── WRITE JOURNAL FORM ───────────────────────────────────────── */}
      {!submitDone && activeSubTab === 'write' && (
        <div className="space-y-5">
          {/* Waktu & Tanggal Card */}
          <div className="ui-card p-5 md:p-6 space-y-4 border border-slate-200/80">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
              <Calendar size={18} className="text-[var(--ui-primary,#064e3b)]" />
              <h2 className="text-xs font-black uppercase tracking-wider text-slate-800">Waktu &amp; Tanggal Kegiatan PKL</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-black text-slate-700 flex items-center gap-1">
                  <Calendar size={13} className="text-slate-400" /> Tanggal Kegiatan
                </label>
                <input
                  type="date"
                  value={form.tanggal}
                  max={todayStr}
                  onChange={(e) => handleChange('tanggal', e.target.value)}
                  className="w-full p-3 rounded-[var(--ui-radius-control)] border border-slate-200 text-xs font-bold text-slate-800 focus:outline-none focus:border-[var(--ui-primary,#064e3b)]"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-black text-slate-700 flex items-center gap-1">
                  <Clock size={13} className="text-slate-400" /> Jam Masuk
                </label>
                <input
                  type="time"
                  value={form.jamMasuk}
                  onChange={(e) => handleChange('jamMasuk', e.target.value)}
                  className="w-full p-3 rounded-[var(--ui-radius-control)] border border-slate-200 text-xs font-bold text-slate-800 focus:outline-none focus:border-[var(--ui-primary,#064e3b)]"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-black text-slate-700 flex items-center gap-1">
                  <Clock size={13} className="text-slate-400" /> Jam Keluar
                </label>
                <input
                  type="time"
                  value={form.jamKeluar}
                  onChange={(e) => handleChange('jamKeluar', e.target.value)}
                  className="w-full p-3 rounded-[var(--ui-radius-control)] border border-slate-200 text-xs font-bold text-slate-800 focus:outline-none focus:border-[var(--ui-primary,#064e3b)]"
                />
              </div>
            </div>
          </div>

          {/* Form Content Cards */}
          <div className="ui-card p-5 md:p-6 space-y-5 border border-slate-200/80">
            {/* Deskripsi */}
            <div className="space-y-1.5">
              <label className="text-xs font-black text-slate-800 flex items-center gap-1">
                <FileText size={15} className="text-[var(--ui-primary,#064e3b)]" /> Deskripsi Kegiatan Hari Ini *
              </label>
              <textarea
                rows={5}
                value={form.kegiatan}
                onChange={(e) => handleChange('kegiatan', e.target.value)}
                placeholder="Tuliskan secara rinci pekerjaan atau tugas yang Anda laksanakan hari ini..."
                className={`w-full p-3.5 rounded-[var(--ui-radius-control)] border text-xs font-medium text-slate-800 focus:outline-none focus:border-[var(--ui-primary,#064e3b)] transition-all ${
                  errors.kegiatan ? 'border-rose-500 bg-rose-50' : 'border-slate-200'
                }`}
              />
              <div className="flex items-center justify-between text-[11px] font-semibold text-slate-400">
                {errors.kegiatan ? (
                  <span className="text-rose-600 font-bold flex items-center gap-1">
                    <ShieldAlert size={13} /> {errors.kegiatan}
                  </span>
                ) : (
                  <span>{form.kegiatan.length} Karakter (Min. 20 Karakter)</span>
                )}
              </div>
            </div>

            {/* Kendala */}
            <div className="space-y-1.5">
              <label className="text-xs font-black text-slate-800 flex items-center gap-1">
                <AlertCircle size={15} className="text-amber-600" /> Kendala yang Dihadapi *
              </label>
              <textarea
                rows={2}
                value={form.kendala}
                onChange={(e) => handleChange('kendala', e.target.value)}
                placeholder="Tuliskan kendala atau hambatan. Jika tidak ada, tulis 'Tidak ada kendala'."
                className={`w-full p-3.5 rounded-[var(--ui-radius-control)] border text-xs font-medium text-slate-800 focus:outline-none focus:border-[var(--ui-primary,#064e3b)] transition-all ${
                  errors.kendala ? 'border-rose-500 bg-rose-50' : 'border-slate-200'
                }`}
              />
              {errors.kendala && (
                <span className="text-rose-600 text-[11px] font-bold flex items-center gap-1">
                  <ShieldAlert size={13} /> {errors.kendala}
                </span>
              )}
            </div>

            {/* Solusi */}
            <div className="space-y-1.5">
              <label className="text-xs font-black text-slate-800 flex items-center gap-1">
                <CheckCircle2 size={15} className="text-emerald-600" /> Solusi / Langkah Penyelesaian *
              </label>
              <textarea
                rows={2}
                value={form.solusi}
                onChange={(e) => handleChange('solusi', e.target.value)}
                placeholder="Bagaimana langkah Anda mengatasi kendala di atas?"
                className={`w-full p-3.5 rounded-[var(--ui-radius-control)] border text-xs font-medium text-slate-800 focus:outline-none focus:border-[var(--ui-primary,#064e3b)] transition-all ${
                  errors.solusi ? 'border-rose-500 bg-rose-50' : 'border-slate-200'
                }`}
              />
              {errors.solusi && (
                <span className="text-rose-600 text-[11px] font-bold flex items-center gap-1">
                  <ShieldAlert size={13} /> {errors.solusi}
                </span>
              )}
            </div>

            {/* Foto Dokumentasi */}
            <div className="space-y-2 pt-2 border-t border-slate-100">
              <label className="text-xs font-black text-slate-800 flex items-center gap-1">
                <ImagePlus size={15} className="text-sky-600" /> Foto Dokumentasi (Opsional, Maks 5 Foto)
              </label>

              {photos.length > 0 ? (
                <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
                  {photos.map((p) => (
                    <div key={p.id} className="relative aspect-square rounded-[var(--ui-radius-control)] overflow-hidden border border-slate-200 group">
                      <img src={p.preview} alt="Dokumentasi" className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => removePhoto(p.id)}
                        className="absolute top-1.5 right-1.5 p-1 rounded-full bg-slate-900/70 text-white hover:bg-slate-900 border-none cursor-pointer"
                      >
                        <X size={13} />
                      </button>
                    </div>
                  ))}

                  {photos.length < 5 && (
                    <label className="aspect-square rounded-[var(--ui-radius-control)] border-2 border-dashed border-slate-200 hover:border-slate-400 bg-slate-50 flex flex-col items-center justify-center cursor-pointer">
                      <ImagePlus size={20} className="text-slate-400 mb-1" />
                      <span className="text-[10px] font-bold text-slate-600">+ Tambah</span>
                      <input type="file" accept="image/*" multiple onChange={handlePhotoAdd} className="hidden" />
                    </label>
                  )}
                </div>
              ) : (
                <label className="flex flex-col items-center justify-center p-8 rounded-[var(--ui-radius-control)] border-2 border-dashed border-slate-200 hover:border-slate-400 bg-slate-50 cursor-pointer text-center">
                  <ImagePlus size={32} className="text-slate-400 mb-2" />
                  <p className="text-xs font-black text-slate-700">Upload Foto Dokumentasi PKL</p>
                  <p className="text-[11px] text-slate-400 font-medium mt-0.5">Klik untuk memilih foto (Maks 5 foto)</p>
                  <input type="file" accept="image/*" multiple onChange={handlePhotoAdd} className="hidden" />
                </label>
              )}

              {photoError && (
                <p className="text-rose-600 text-[11px] font-bold flex items-center gap-1">
                  <ShieldAlert size={13} /> {photoError}
                </p>
              )}
            </div>

            {submitError && (
              <div className="p-3.5 rounded-[var(--ui-radius-control)] bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold flex items-center gap-2">
                <ShieldAlert size={16} /> {submitError}
              </div>
            )}

            <button
              type="button"
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="w-full py-3.5 rounded-[var(--ui-radius-control)] bg-[var(--ui-primary,#064e3b)] text-white text-xs font-black hover:opacity-95 border-none cursor-pointer shadow-md flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={16} className="animate-spin" /> Menyimpan Jurnal Hari Ini...
                </>
              ) : (
                <>
                  <CheckCircle2 size={16} /> Kirim Jurnal Hari Ini
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* ── HISTORY LOGBOOK VIEW ──────────────────────────────────────── */}
      {activeSubTab === 'history' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-black text-slate-800 flex items-center gap-2">
              <BookOpen size={18} className="text-[var(--ui-primary,#064e3b)]" /> Riwayat Logbook Jurnal PKL
            </h2>
            <button
              type="button"
              onClick={fetchHistory}
              className="px-3 py-1.5 rounded-[var(--ui-radius-control)] bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold border-none cursor-pointer flex items-center gap-1.5"
            >
              <RefreshCw size={13} className={loadingHistory ? 'animate-spin' : ''} /> Muat Ulang
            </button>
          </div>

          {loadingHistory ? (
            <div className="p-12 text-center text-slate-400 font-bold flex flex-col items-center justify-center gap-3">
              <Loader2 className="animate-spin text-[var(--ui-primary,#064e3b)]" size={32} />
              <span className="text-xs font-semibold text-slate-500">Memuat riwayat jurnal harian...</span>
            </div>
          ) : historyList.length === 0 ? (
            <div className="ui-card p-10 text-center flex flex-col items-center justify-center border border-slate-200/80">
              <div className="w-16 h-16 rounded-[var(--ui-radius-card)] bg-emerald-50 text-[var(--ui-primary,#064e3b)] flex items-center justify-center mb-3 border border-emerald-100">
                <BookOpen size={32} />
              </div>
              <h3 className="font-black text-slate-800 text-base mb-1">Belum Ada Riwayat Jurnal</h3>
              <p className="text-slate-500 text-xs max-w-sm mb-4">
                Anda belum pernah mengirimkan logbook jurnal kegiatan harian.
              </p>
              <button
                type="button"
                onClick={() => setActiveSubTab('write')}
                className="px-4 py-2.5 rounded-[var(--ui-radius-control)] bg-[var(--ui-primary,#064e3b)] text-white text-xs font-black border-none cursor-pointer shadow-xs"
              >
                + Tulis Jurnal Sekarang
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {historyList.map((item) => (
                <div key={item.id || item.tanggal} className="ui-card p-5 border border-slate-200/80 space-y-3 hover:border-slate-300 transition-colors">
                  <div className="flex items-center justify-between gap-3 border-b border-slate-100 pb-3">
                    <div className="flex items-center gap-2">
                      <Calendar size={16} className="text-[var(--ui-primary,#064e3b)]" />
                      <span className="font-black text-slate-800 text-sm">
                        {new Date(item.tanggal).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                      </span>
                    </div>

                    <span className={`px-2.5 py-1 rounded-[var(--ui-radius-small)] text-[10px] font-black uppercase tracking-wider ${
                      item.validated ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-amber-50 text-amber-800 border border-amber-200'
                    }`}>
                      {item.validated ? 'Tervalidasi Guru ✅' : 'Menunggu Validasi ⏳'}
                    </span>
                  </div>

                  <div className="space-y-2 text-xs">
                    <div>
                      <p className="font-black text-slate-500 uppercase text-[9.5px]">Kegiatan</p>
                      <p className="font-medium text-slate-800 leading-relaxed mt-0.5">{item.kegiatan}</p>
                    </div>

                    {item.kendala && (
                      <div>
                        <p className="font-black text-amber-700 uppercase text-[9.5px]">Kendala</p>
                        <p className="font-medium text-slate-700 mt-0.5">{item.kendala}</p>
                      </div>
                    )}

                    {item.solusi && (
                      <div>
                        <p className="font-black text-emerald-700 uppercase text-[9.5px]">Solusi</p>
                        <p className="font-medium text-slate-700 mt-0.5">{item.solusi}</p>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Toast Notification */}
      {toast && (
        <div className={`fixed bottom-6 right-6 px-4 py-3 rounded-[var(--ui-radius-control)] shadow-lg font-bold text-xs flex items-center gap-2 text-white z-[100] ${toast.type === 'error' ? 'bg-rose-600' : 'bg-emerald-600'}`}>
          {toast.type === 'error' ? <ShieldAlert size={16} /> : <CheckCircle2 size={16} />} {toast.message}
        </div>
      )}
    </div>
  );
};

export default Logbook;
