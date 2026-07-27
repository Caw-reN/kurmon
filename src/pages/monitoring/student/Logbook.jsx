import { Button } from '../../../components/ui.jsx';
import { useState } from'react';
import useFiturStore from'../../../store/monitoring/fiturStore';
import { Lock, CheckCircle2, BookOpen, Calendar, Clock, AlertCircle, X, ImagePlus, Loader2 } from'lucide-react';


/**
 * student/Logbook.jsx
 * Halaman form Logbook / Jurnal Harian PKL.
 * Fitur: Form kegiatan, upload foto dokumentasi dengan preview.
 * Mobile-optimized.
 */




const Logbook = () => {
  const { isFiturAktif } = useFiturStore();
  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];

  const [form, setForm] = useState({
    tanggal: todayStr,
    kegiatan:'',
    kendala:'',
    solusi:'',
    jamMasuk:'08:00',
    jamKeluar:'17:00',
  });
  const [photos, setPhotos] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState({});
  const [submitError, setSubmitError] = useState('');
  const [photoError, setPhotoError] = useState('');
  const [toast, setToast] = useState(null);

  const showToast = (message, type ='success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  // ──────────────────────────────────────────
  // Form handlers
  // ──────────────────────────────────────────
  const handleChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]:'' }));
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

  // ──────────────────────────────────────────
  // Validasi
  // ──────────────────────────────────────────
  const validate = () => {
    const errs = {};
    if (!form.kegiatan.trim() || form.kegiatan.trim().length < 20)
      errs.kegiatan ='Deskripsi kegiatan minimal 20 karakter.';
    if (!form.kendala.trim())
      errs.kendala ='Isi kolom kendala (tulis"Tidak ada" jika tidak ada).';
    if (!form.solusi.trim())
      errs.solusi ='Isi kolom solusi.';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setSubmitError('');
    setIsSubmitting(true);
    try {
      const authToken = JSON.parse(sessionStorage.getItem('school_schedule_session_v1'))?.authToken;
      const res = await fetch('/api/pkl/logbooks/student', {
        method:'POST',
        headers: {'Content-Type':'application/json','Authorization': `Bearer ${authToken}` },
        body: JSON.stringify(form)
      });
      const data = await res.json();
      if (data.ok) {
        setSubmitDone(true);
      } else {
        setSubmitError(data.error || 'Gagal menyimpan logbook');
      }
    } catch {
      setSubmitError('Terjadi kesalahan saat menyimpan');
    }
    setIsSubmitting(false);
  };

  // ──────────────────────────────────────────
  // Fitur Guard — blocked if disabled by admin
  // ──────────────────────────────────────────
  if (!isFiturAktif('jurnal')) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] px-6 text-center">
        <div className="w-20 h-20 rounded-full bg-slate-100 flex items-center justify-center mb-4">
          <Lock size={36} className="text-slate-400" />
        </div>
        <h2 className="text-xl font-extrabold text-slate-800 mb-2">Fitur Jurnal Dinonaktifkan</h2>
        <p className="text-sm text-slate-400 max-w-xs">
          Fitur jurnal sedang dinonaktifkan oleh Admin. Hubungi guru atau pihak sekolah untuk informasi lebih lanjut.
        </p>
      </div>
    );
  }

  // ──────────────────────────────────────────
  // Success State
  // ──────────────────────────────────────────
  if (submitDone) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] px-6 text-center">
        <div className="w-20 h-20 rounded-full bg-[var(--ui-primary)]/10 flex items-center justify-center mb-4">
          <CheckCircle2 size={40} className="text-[var(--ui-primary)]" />
        </div>
        <h2 className="text-xl font-extrabold text-slate-800 mb-2">Jurnal Tersimpan!</h2>
        <p className="text-sm text-slate-400 mb-4">
          Jurnal tanggal {new Date(form.tanggal).toLocaleDateString('id-ID', {
            day:'numeric', month:'long', year:'numeric',
          })} berhasil dikirim.
        </p>
        <p className="text-xs text-slate-400 bg-amber-50 border border-amber-200 rounded-[var(--ui-radius-small)] px-4 py-3 max-w-xs">
          ⏳ Jurnal Anda sedang menunggu validasi dari Guru Pembimbing.
        </p>
        <Button variant="outline"
          onClick={() =>{ setSubmitDone(false); setForm({ ...form, kegiatan:'', kendala:'', solusi:'' }); setPhotos([]); }}
          className="mt-6"
        >
          + Tulis Jurnal Lainnya</Button>
      </div>
    );
  }

  return (
    <div className="px-4 pb-8 pt-4 max-w-3xl mx-auto w-full">
      {/* Header */}
      <div className="flex items-center gap-2.5 mb-5">
        <div className="w-10 h-10 bg-[var(--ui-primary)]/10 rounded-[var(--ui-radius-small)] flex items-center justify-center">
          <BookOpen size={20} className="text-[var(--ui-primary)]" />
        </div>
        <div>
          <h1 className="text-lg font-extrabold text-slate-800">Logbook Harian</h1>
          <p className="text-xs text-slate-400">Dokumentasikan kegiatan PKL Anda</p>
        </div>
      </div>

      <div className="space-y-4">
        {/* ─────── Tanggal & Jam ─────── */}
        <div className="bg-white border-none rounded-[var(--ui-radius-small)] p-4">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
            Waktu Kegiatan
          </p>
          <div className="grid grid-cols-3 gap-3">
            {/* Tanggal */}
            <div className="col-span-3">
              <label className="text-xs font-semibold text-gray-700 mb-1 flex items-center gap-1">
                <Calendar size={12} /> Tanggal
              </label>
              <input
                type="date"
                value={form.tanggal}
                max={todayStr}
                onChange={(e) => handleChange('tanggal', e.target.value)}
                className="w-full border-none rounded-[var(--ui-radius-small)] px-3 py-2.5 text-sm
                  focus:outline-none focus:ring-2 focus:ring-[var(--ui-primary)] focus:border-[var(--ui-primary)] transition-all"
              />
            </div>
            {/* Jam Masuk */}
            <div>
              <label className="text-xs font-semibold text-gray-700 mb-1 flex items-center gap-1">
                <Clock size={12} /> Jam Masuk
              </label>
              <input
                type="time"
                value={form.jamMasuk}
                onChange={(e) => handleChange('jamMasuk', e.target.value)}
                className="w-full border-none rounded-[var(--ui-radius-small)] px-3 py-2.5 text-sm
                  focus:outline-none focus:ring-2 focus:ring-[var(--ui-primary)] focus:border-[var(--ui-primary)] transition-all"
              />
            </div>
            {/* Jam Keluar */}
            <div className="col-span-2">
              <label className="text-xs font-semibold text-gray-700 mb-1 flex items-center gap-1">
                <Clock size={12} /> Jam Keluar
              </label>
              <input
                type="time"
                value={form.jamKeluar}
                onChange={(e) => handleChange('jamKeluar', e.target.value)}
                className="w-full border-none rounded-[var(--ui-radius-small)] px-3 py-2.5 text-sm
                  focus:outline-none focus:ring-2 focus:ring-[var(--ui-primary)] focus:border-[var(--ui-primary)] transition-all"
              />
            </div>
          </div>
        </div>

        {/* ─────── Deskripsi Kegiatan ─────── */}
        <div>
          <label className="text-sm font-bold text-slate-800 mb-1.5 block">
            Deskripsi Kegiatan Hari Ini *
          </label>
          <textarea
            rows={5}
            value={form.kegiatan}
            onChange={(e) => handleChange('kegiatan', e.target.value)}
            className={`w-full border rounded-[var(--ui-radius-small)] px-4 py-3 text-sm resize-none
              focus:outline-none focus:ring-2 focus:ring-[var(--ui-primary)] transition-all
              ${errors.kegiatan ?'border-rose-500 bg-rose-50' :'border-slate-200'}`}
          />
          <div className="flex items-center justify-between mt-1">
            {errors.kegiatan ? (
              <p className="text-xs text-rose-500 flex items-center gap-1 font-bold">
                <AlertCircle size={11} /> {errors.kegiatan}
              </p>
            ) : (
              <p className="text-xs text-slate-400">{form.kegiatan.length} karakter</p>
            )}
            <p className="text-xs text-slate-400">Min. 20 karakter</p>
          </div>
        </div>

        {/* ─────── Kendala ─────── */}
        <div>
          <label className="text-sm font-bold text-slate-800 mb-1.5 block">
            Kendala yang Dihadapi *
          </label>
          <textarea
            rows={3}
            value={form.kendala}
            onChange={(e) => handleChange('kendala', e.target.value)}
            placeholder="Tuliskan kendala atau hambatan. Jika tidak ada, tulis'Tidak ada kendala'."
            className={`w-full border rounded-[var(--ui-radius-small)] px-4 py-3 text-sm resize-none
              focus:outline-none focus:ring-2 focus:ring-[var(--ui-primary)] transition-all
              ${errors.kendala ?'border-rose-500 bg-rose-50' :'border-slate-200'}`}
          />
          {errors.kendala && (
            <p className="text-xs text-rose-500 mt-1 flex items-center gap-1 font-bold">
              <AlertCircle size={11} /> {errors.kendala}
            </p>
          )}
        </div>

        {/* ─────── Solusi ─────── */}
        <div>
          <label className="text-sm font-bold text-slate-800 mb-1.5 block">
            Solusi / Tindakan *
          </label>
          <textarea
            rows={3}
            value={form.solusi}
            onChange={(e) => handleChange('solusi', e.target.value)}
            placeholder="Bagaimana Anda mengatasi kendala di atas?"
            className={`w-full border rounded-[var(--ui-radius-small)] px-4 py-3 text-sm resize-none
              focus:outline-none focus:ring-2 focus:ring-[var(--ui-primary)] transition-all
              ${errors.solusi ?'border-rose-500 bg-rose-50' :'border-slate-200'}`}
          />
          {errors.solusi && (
            <p className="text-xs text-rose-500 mt-1 flex items-center gap-1 font-bold">
              <AlertCircle size={11} /> {errors.solusi}
            </p>
          )}
        </div>

        {/* ─────── Upload Foto Dokumentasi ─────── */}
        <div>
          <label className="text-sm font-bold text-slate-800 mb-1.5 block">
            Foto Dokumentasi{''}
            <span className="text-slate-400 font-normal">(Opsional, maks 5 foto)</span>
          </label>

          {/* Photo grid */}
          {photos.length > 0 && (
            <div className="grid grid-cols-3 gap-2 mb-3">
              {photos.map((p) => (
                <div key={p.id} className="relative aspect-square">
                  <img
                    src={p.preview}
                    alt="dokumentasi"
                    className="w-full h-full object-cover rounded-[var(--ui-radius-small)]"
                  />
                  <button type="button"
                    onClick={() =>removePhoto(p.id)}
                    className="absolute top-1 right-1 w-6 h-6 bg-black/60 rounded-full
                      flex items-center justify-center hover:bg-black/80 transition-colors border-none cursor-pointer"
                  >
                    <X size={11} className="text-white" /></button>
                </div>
              ))}

              {/* Add more button (if less than 5) */}
              {photos.length < 5 && (
                <label className="aspect-square border-2 border-dashed border-slate-200 rounded-[var(--ui-radius-small)] flex flex-col items-center justify-center cursor-pointer
                  hover:border-[var(--ui-primary)] hover:bg-[var(--ui-primary)]/10 transition-all">
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={handlePhotoAdd}
                  />
                  <ImagePlus size={20} className="text-gray-400 mb-1" />
                  <span className="text-[10px] text-slate-400">Tambah</span>
                </label>
              )}
            </div>
          )}

          {photos.length === 0 && (
            <label className="block cursor-pointer">
              <input
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={handlePhotoAdd}
              />
              <div className="border-2 border-dashed border-slate-200 rounded-[var(--ui-radius-small)] p-8
                flex flex-col items-center justify-center text-center
                hover:border-[var(--ui-primary)] hover:bg-[var(--ui-primary)]/10 transition-all">
                <ImagePlus size={28} className="text-gray-400 mb-2" />
                <p className="text-sm font-medium text-gray-600">Tambahkan foto dokumentasi</p>
                <p className="text-xs text-slate-400 mt-0.5">Klik untuk memilih foto</p>
              </div>
            </label>
          )}
          {photoError && (
            <p className="text-xs text-rose-500 mt-1.5 flex items-center gap-1 font-bold">
              <AlertCircle size={11} /> {photoError}
            </p>
          )}
        </div>

        {/* ─────── Submit ─────── */}
        {submitError && (
          <div className="p-3 bg-rose-50 border border-rose-100 rounded-[var(--ui-radius-small)] flex items-start gap-2 text-rose-600 text-xs font-semibold animate-in zoom-in-95 duration-200 mt-2">
            <AlertCircle size={14} className="shrink-0 mt-0.5" />
            <span className="leading-relaxed">{submitError}</span>
          </div>
        )}
        <Button
          onClick={handleSubmit}
          disabled={isSubmitting}
          className="w-full flex items-center justify-center gap-2 mt-2"
        >
          {isSubmitting ? (
            <><Loader2 size={18} className="animate-spin" /> Menyimpan Jurnal...</>
          ) : (
            <><CheckCircle2 size={18} /> Kirim Jurnal Hari Ini</>
          )}
        </Button>
      </div>

      {toast && (
        <div className={`fixed bottom-6 right-6 px-4 py-3 rounded-[var(--ui-radius-small)] shadow-lg font-medium text-sm flex items-center gap-2 animate-in slide-in-from-bottom-5 text-white z-[100] ${toast.type ==='error' ?'bg-red-600' :'bg-emerald-600'}`}>
          {toast.type ==='error' ? <AlertCircle size={18} /> : <CheckCircle2 size={18} />} {toast.message}
        </div>
      )}
    </div>
  );
};

export default Logbook;
