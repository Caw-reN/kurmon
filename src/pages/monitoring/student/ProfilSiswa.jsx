import { useState, useEffect } from 'react';
import { User, GraduationCap, Shield, CheckCircle2, MapPin, Fingerprint, Phone, BookOpen } from 'lucide-react';
import useAuthStore from '../../../store/monitoring/authStore';
import { useAppStore } from '../../../store/useAppStore.js';

/**
 * student/ProfilSiswa.jsx — Full Student Profile synced with admin via useAppStore + API
 */
const ProfilSiswa = () => {
  const { user } = useAuthStore();
  const appSettings = useAppStore((state) => state.appSettings) || {};
  const schoolName = appSettings.kopSuratBaris1 || 'SMK';
  const schoolLogo = appSettings.kopSuratLogo || appSettings.logoUrl || null;

  const [pklData, setPklData] = useState(null);
  const [perusahaan, setPerusahaan] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passForm, setPassForm] = useState({ oldPass: '', newPass: '', confirmPass: '' });
  const [passError, setPassError] = useState('');
  const [passSuccess, setPassSuccess] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const authToken = user?.authToken;
  const nama = user?.name || user?.username || 'Siswa';
  const nis = user?.username || user?.nis || '-';
  const kelas = user?.kelas || user?.class_name || user?.class || '-';
  const initials = nama.substring(0, 2).toUpperCase();

  useEffect(() => {
    if (!authToken) { setLoading(false); return; }
    setLoading(true);
    Promise.all([
      fetch('/api/monitoring/pkl-students', { headers: { 'Authorization': 'Bearer ' + authToken } }).then(r => r.json()),
      fetch('/api/monitoring/lokasi-pkl/public').then(r => r.json()),
    ]).then(([studentsRes, lokasiRes]) => {
      if (studentsRes.ok && Array.isArray(studentsRes.data)) {
        const myRecord = studentsRes.data.find(s => s.nis === user?.username || s.nis === user?.nis);
        setPklData(myRecord || null);
        if (myRecord?.location_id && lokasiRes.ok && Array.isArray(lokasiRes.data)) {
          setPerusahaan(lokasiRes.data.find(p => p.id === myRecord.location_id) || null);
        }
      }
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [authToken, user]);

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setPassError('');
    setPassSuccess('');
    if (!passForm.newPass || passForm.newPass.length < 6) { setPassError('Password baru minimal 6 karakter.'); return; }
    if (passForm.newPass !== passForm.confirmPass) { setPassError('Konfirmasi password tidak cocok.'); return; }
    setSubmitting(true);
    try {
      const res = await fetch('/api/auth/change-password', {
        method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + authToken },
        body: JSON.stringify({ oldPassword: passForm.oldPass, newPassword: passForm.newPass })
      });
      const data = await res.json();
      if (data.ok) { setPassSuccess('Password berhasil diperbarui!'); setPassForm({ oldPass: '', newPass: '', confirmPass: '' }); setTimeout(() => { setShowPasswordModal(false); setPassSuccess(''); }, 1500); }
      else { setPassError(data.error || 'Gagal mengubah password.'); }
    } catch { setPassError('Terjadi kesalahan sistem.'); }
    setSubmitting(false);
  };

  const photoUrl = pklData?.photo_url || pklData?.photo || null;
  const jurusan = pklData?.major || pklData?.jurusan || user?.jurusan || user?.major || '-';
  const pembimbing = pklData?.teacher_code || pklData?.teacher_name || 'Belum Ditugaskan';
  const statusPKL = pklData?.status || 'Siswa Aktif';
  const isAktif = pklData?.status && pklData.status !== 'Belum Aktif';

  return (
    <div className="pb-8 space-y-5 w-full animate-in fade-in slide-in-from-bottom-4 duration-300">

      {/* ── HERO CARD ──────────────────────────────────────────── */}
      <div
        className="rounded-[var(--ui-radius-card)] overflow-hidden shadow-[var(--ui-shadow-card)] relative"
        style={{ background: 'linear-gradient(135deg, var(--ui-primary,#064e3b) 0%, color-mix(in srgb, var(--ui-primary,#064e3b) 80%, #0f172a) 100%)' }}
      >
        <div className="absolute top-4 right-4 opacity-10 pointer-events-none">
          {schoolLogo
            ? <img src={schoolLogo} alt="logo" className="w-20 h-20 object-contain" />
            : <GraduationCap size={64} className="text-white" />
          }
        </div>
        <div className="relative z-10 p-6 md:p-8 flex flex-col md:flex-row items-center md:items-start gap-6">
          <div className="w-24 h-24 md:w-28 md:h-28 rounded-[var(--ui-radius-control)] overflow-hidden bg-white/20 border-2 border-white/30 flex items-center justify-center shrink-0 shadow-sm">
            {loading ? (
              <Loader2 size={32} className="text-white animate-spin" />
            ) : photoUrl ? (
              <img src={photoUrl} alt="Foto Siswa" className="w-full h-full object-cover" />
            ) : (
              <span className="text-4xl font-black text-white">{initials}</span>
            )}
          </div>
          <div className="flex-1 text-center md:text-left space-y-2">
            <div>
              <h1 className="text-xl md:text-2xl font-black text-white leading-tight">{nama}</h1>
              <p className="text-white/70 text-xs font-bold mt-1">NIS: {nis} &nbsp;&bull;&nbsp; Kelas: {kelas}</p>
              {jurusan !== '-' && <p className="text-white/60 text-xs font-semibold mt-0.5">{jurusan}</p>}
            </div>
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-2">
              <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-[var(--ui-radius-pill)] text-[10px] font-black uppercase tracking-wider border ${isAktif ? 'bg-emerald-400/20 text-emerald-200 border-emerald-300/30' : 'bg-white/10 text-white/70 border-white/20'}`}>
                <CheckCircle2 size={12} className={isAktif ? 'text-emerald-300' : 'text-white/50'} />
                {statusPKL}
              </span>
              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-[var(--ui-radius-pill)] bg-white/10 text-white/70 border border-white/20 text-[10px] font-black uppercase tracking-wider">
                <Shield size={12} className="text-cyan-300" /> Terverifikasi
              </span>
            </div>
          </div>
          <div className="hidden md:flex flex-col items-end gap-1">
            <p className="text-white/40 text-[9px] font-black uppercase tracking-widest">Portal Resmi Siswa</p>
            <p className="text-white/60 text-[10px] font-bold max-w-[200px] text-right leading-tight">{schoolName}</p>
          </div>
        </div>
      </div>

      {/* ── DATA AKUN & PKL ──────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Identitas Akun */}
        <div className="ui-card overflow-hidden">
          <div className="px-5 py-4 border-b border-[var(--ui-border-muted)] bg-slate-50/50 flex items-center gap-2">
            <User size={16} className="text-slate-500" />
            <h3 className="font-black text-sm text-slate-800 uppercase tracking-wider">Identitas Akun</h3>
          </div>
          <div className="divide-y divide-slate-100">
            {[
              { label: 'NIS / NISN', value: nis, Icon: Shield, color: 'text-indigo-500', bg: 'bg-indigo-50 border-indigo-200' },
              { label: 'Nama Lengkap', value: nama, Icon: User, color: 'text-slate-500', bg: 'bg-slate-100 border-slate-200' },
              { label: 'Kelas', value: kelas, Icon: GraduationCap, color: 'text-cyan-500', bg: 'bg-cyan-50 border-cyan-200' },
              { label: 'Jurusan', value: jurusan, Icon: BookOpen, color: 'text-purple-500', bg: 'bg-purple-50 border-purple-200' },
              { label: 'Status Akun', value: statusPKL, Icon: CheckCircle2, color: 'text-emerald-500', bg: 'bg-emerald-50 border-emerald-200' },
            ].map(({ label, value, Icon, color, bg }) => (
              <div key={label} className="flex items-center gap-4 px-5 py-3.5 hover:bg-slate-50/60 transition-colors">
                <div className={`w-9 h-9 rounded-[var(--ui-radius-small)] ${bg} border flex items-center justify-center shrink-0`}>
                  <Icon size={16} className={color} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] text-slate-400 font-black uppercase tracking-wider mb-0.5">{label}</p>
                  <p className="text-sm font-bold text-slate-800 leading-snug truncate">{value}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Status PKL & Perusahaan */}
        <div className="ui-card overflow-hidden">
          <div className="px-5 py-4 border-b border-[var(--ui-border-muted)] bg-slate-50/50 flex items-center gap-2">
            <Building size={16} className="text-slate-500" />
            <h3 className="font-black text-sm text-slate-800 uppercase tracking-wider">Status PKL & Penempatan</h3>
          </div>
          <div className="p-5 space-y-4">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-8 gap-2 text-slate-400">
                <Loader2 size={24} className="animate-spin" />
                <span className="text-xs font-semibold">Memuat data PKL...</span>
              </div>
            ) : perusahaan ? (
              <div className="space-y-3">
                <div className="p-4 rounded-[var(--ui-radius-control)] bg-[color-mix(in_srgb,var(--ui-primary,#064e3b)_8%,transparent)] border border-[color-mix(in_srgb,var(--ui-primary,#064e3b)_20%,transparent)]">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-[var(--ui-radius-small)] bg-[var(--ui-primary,#064e3b)] flex items-center justify-center shrink-0">
                      <Building2 size={18} className="text-white" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[10px] text-slate-400 font-black uppercase tracking-wider">Perusahaan PKL</p>
                      <p className="text-sm font-black text-slate-800 truncate">{perusahaan.nama_perusahaan || '-'}</p>
                      {perusahaan.bidang && <p className="text-xs text-slate-500 font-medium mt-0.5">{perusahaan.bidang}</p>}
                    </div>
                  </div>
                </div>
                {[
                  { label: 'Alamat', value: perusahaan.alamat || '-', Icon: MapPin },
                  { label: 'Guru Pembimbing', value: pembimbing, Icon: Fingerprint },
                  { label: 'Kontak / Telp', value: perusahaan.telp || perusahaan.kontak || '-', Icon: Phone },
                ].map(({ label, value, Icon }) => (
                  <div key={label} className="flex items-start gap-3 py-1">
                    <div className="w-8 h-8 rounded-[var(--ui-radius-small)] bg-slate-100 border border-slate-200 flex items-center justify-center shrink-0 mt-0.5">
                      <Icon size={15} className="text-slate-500" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[10px] text-slate-400 font-black uppercase tracking-wider">{label}</p>
                      <p className="text-xs font-bold text-slate-700 leading-snug">{value}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-10 gap-3 text-center">
                <div className="w-14 h-14 rounded-[var(--ui-radius-card)] bg-slate-100 border border-slate-200 flex items-center justify-center">
                  <Building size={26} className="text-slate-300" />
                </div>
                <div>
                  <p className="text-sm font-black text-slate-700">Belum Ada Penempatan PKL</p>
                  <p className="text-xs text-slate-400 font-medium mt-1">Data penempatan PKL belum diatur oleh pihak sekolah.</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── KEAMANAN AKUN ─────────────────────────────────────── */}
      <div className="ui-card overflow-hidden">
        <div className="px-5 py-4 border-b border-[var(--ui-border-muted)] bg-slate-50/50 flex items-center gap-2">
          <Lock size={16} className="text-slate-500" />
          <h3 className="font-black text-sm text-slate-800 uppercase tracking-wider">Keamanan Akun</h3>
        </div>
        <div className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <p className="text-sm font-bold text-slate-800">Ganti Kata Sandi</p>
            <p className="text-xs text-slate-400 font-medium mt-0.5">Perbarui kata sandi Anda secara berkala demi keamanan akun.</p>
          </div>
          <button
            type="button"
            onClick={() => setShowPasswordModal(true)}
            className="w-full sm:w-auto px-5 h-10 rounded-[var(--ui-radius-control)] bg-[var(--ui-primary,#064e3b)] text-white text-xs font-black hover:opacity-95 transition-opacity cursor-pointer border-none shadow-xs shrink-0 flex items-center justify-center gap-2"
          >
            <Lock size={14} /> Ubah Password
          </button>
        </div>
      </div>

      {/* ── MODAL GANTI PASSWORD ─────────────────────────────── */}
      {showPasswordModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs" onClick={() => setShowPasswordModal(false)}>
          <div className="bg-white w-full max-w-sm rounded-[var(--ui-radius-card)] p-6 space-y-4 shadow-xs overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-[var(--ui-radius-small)] bg-indigo-50 text-indigo-600 flex items-center justify-center border border-indigo-200"><Lock size={16} /></div>
                <h3 className="font-black text-slate-800 text-base">Ganti Kata Sandi</h3>
              </div>
              <button type="button" onClick={() => { setShowPasswordModal(false); setPassError(''); }} className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 border-none cursor-pointer text-xs font-black">✕</button>
            </div>
            {passError && <div className="p-3 rounded-[var(--ui-radius-control)] bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold">{passError}</div>}
            {passSuccess && <div className="p-3 rounded-[var(--ui-radius-control)] bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-bold">{passSuccess}</div>}
            <form onSubmit={handleChangePassword} className="space-y-3">
              {[
                { key: 'oldPass', label: 'Password Lama / Bawaan', placeholder: 'Masukkan password saat ini...' },
                { key: 'newPass', label: 'Password Baru', placeholder: 'Minimal 6 karakter...' },
                { key: 'confirmPass', label: 'Konfirmasi Password Baru', placeholder: 'Ulangi password baru...' },
              ].map(({ key, label, placeholder }) => (
                <div key={key} className="space-y-1">
                  <label className="text-xs font-black text-slate-700">{label}</label>
                  <input type="password" value={passForm[key]} onChange={(e) => setPassForm(prev => ({ ...prev, [key]: e.target.value }))} placeholder={placeholder} className="w-full p-2.5 rounded-[var(--ui-radius-control)] border border-slate-200 text-xs font-bold text-slate-800 focus:outline-none focus:border-[var(--ui-primary,#064e3b)]" />
                </div>
              ))}
              <div className="flex gap-2 pt-2">
                <button type="button" onClick={() => setShowPasswordModal(false)} className="flex-1 py-2.5 rounded-[var(--ui-radius-control)] bg-slate-100 text-slate-700 text-xs font-bold hover:bg-slate-200 border-none cursor-pointer">Batal</button>
                <button type="submit" disabled={submitting} className="flex-1 py-2.5 rounded-[var(--ui-radius-control)] bg-[var(--ui-primary,#064e3b)] text-white text-xs font-black hover:opacity-95 border-none cursor-pointer shadow-xs disabled:opacity-60">{submitting ? 'Menyimpan...' : 'Simpan Password'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProfilSiswa;
