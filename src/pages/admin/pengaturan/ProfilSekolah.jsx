import { useState, useEffect, useRef, useMemo } from 'react';
import { 
  School, BookOpen, MessageSquare, MonitorSmartphone, Wifi, Palette, 
  MapPin, Users, Sparkles, Star, Upload, Globe, Save, Plus, Edit2, 
  Trash2, Printer, ImageIcon, X, AlertCircle, CheckCircle2, RefreshCw, 
  Layers, Check, Calendar, Phone, Mail, Building2, Sliders, AlignCenter, 
  AlignLeft, MoveVertical, MoveHorizontal, RotateCcw
} from 'lucide-react';
import { compressImage } from '../../../utils/imageUtils.js';
import { PageHeader } from '../../../components/monitoring/ui/index.js';
import { Button, Modal } from '../../../components/ui.jsx';
import { CustomSelect } from '../../../components/CustomSelect.jsx';
import useAuthStore from '../../../store/monitoring/authStore.js';

const SCHOOL_FIELDS = [
  { key: 'nama_sekolah', label: 'Nama Resmi Sekolah', placeholder: 'SMK Karya Guna 2 Bekasi', required: true },
  { key: 'npsn', label: 'NPSN', placeholder: '20107777' },
  { key: 'nss', label: 'NSS', placeholder: 'Nomor Statistik Sekolah' },
  { key: 'alamat', label: 'Alamat Lengkap', placeholder: 'Jl. Karang Satria RT.10/16...', multiline: true },
  { key: 'kota', label: 'Kota / Kabupaten', placeholder: 'Kota Bekasi' },
  { key: 'provinsi', label: 'Provinsi', placeholder: 'Jawa Barat' },
  { key: 'kode_pos', label: 'Kode Pos', placeholder: '17111' },
  { key: 'telepon', label: 'Telepon / WhatsApp', placeholder: '085117551755' },
  { key: 'email', label: 'Email Sekolah', placeholder: 'info@smkkg2.sch.id' },
  { key: 'website', label: 'Website Sekolah', placeholder: 'https://smkkg2.sch.id' },
  { key: 'kepala_sekolah', label: 'Nama Kepala Sekolah', placeholder: 'Yunie Purwiasih, M.Pd' },
  { key: 'nip_kepsek', label: 'NIP Kepala Sekolah', placeholder: '19750512 200501 2 003' },
  { key: 'akreditasi', label: 'Akreditasi', placeholder: 'A (Unggul)' },
  { key: 'tahun_berdiri', label: 'Tahun Berdiri', placeholder: '1985' },
];

export default function ProfilSekolah({ appSettings = {}, setAppSettings = () => {}, onSave = () => {}, showNotification }) {
  const [profile, setProfile] = useState(appSettings?.schoolProfile || {});
  const [academicYears, setAcademicYears] = useState(appSettings?.academicYears || []);
  const [isSaving, setIsSaving] = useState(false);
  const [toast, setToast] = useState(null);
  const [activeTab, setActiveTab] = useState('profil'); // 'profil' | 'tahun' | 'kop'
  
  // Logos
  const [logoPreview, setLogoPreview] = useState(appSettings?.schoolProfile?.logo_url || appSettings?.logoUrl || '');
  const [logoMobilePreview, setLogoMobilePreview] = useState(appSettings?.logoMobileUrl || '');
  const [logoWebPreview, setLogoWebPreview] = useState(appSettings?.logoWebUrl || '');
  
  // Kop Surat & Margin Settings State
  const [kopState, setKopState] = useState({
    useKopSuratGambar: !!appSettings?.useKopSuratGambar,
    kopSuratGambar: appSettings?.kopSuratGambar || '',
    kopSuratLogo: appSettings?.kopSuratLogo || '',
    kopSuratBaris1: appSettings?.kopSuratBaris1 || 'PEMERINTAH DAERAH PROVINSI JAWA BARAT',
    kopSuratBaris2: appSettings?.kopSuratBaris2 || 'DINAS PENDIDIKAN',
    kopSuratBaris3: appSettings?.kopSuratBaris3 || appSettings?.schoolProfile?.nama_sekolah || 'SMK KARYA GUNA 2 BEKASI',
    kopSuratAlamat: appSettings?.kopSuratAlamat || appSettings?.schoolProfile?.alamat || 'Jl. Karang Satria RT.10/16, Kelurahan Duren Jaya, Kecamatan Bekasi Timur',
    kopSuratKontak: appSettings?.kopSuratKontak || 'Telp: 085117551755 | Website: smkkg2.sch.id | Email: info@smkkg2.sch.id',
    
    // Layout & Margins (in mm / px)
    kopMarginTop: appSettings?.kopMarginTop ?? 15,
    kopMarginSide: appSettings?.kopMarginSide ?? 20,
    kopMarginBottom: appSettings?.kopMarginBottom ?? 15,
    kopSpacing: appSettings?.kopSpacing ?? 20,
    kopBannerHeight: appSettings?.kopBannerHeight ?? 130,
    kopLogoSize: appSettings?.kopLogoSize ?? 72,
    kopAlign: appSettings?.kopAlign || 'center', // 'center' | 'left'
    kopDivider: appSettings?.kopDivider || (appSettings?.useKopSuratGambar ? 'none' : 'double'), // 'double' | 'single' | 'thick' | 'dashed' | 'none'
  });

  // Modal State
  const [showYearModal, setShowYearModal] = useState(false);
  const [editingYear, setEditingYear] = useState(null);
  const [yearForm, setYearForm] = useState({ nama: '', semester: 'Ganjil', tanggal_mulai: '', tanggal_selesai: '' });
  
  const logoInputRef = useRef();
  const logoMobileInputRef = useRef();
  const logoWebInputRef = useRef();
  const kopLogoInputRef = useRef();
  const kopGambarInputRef = useRef();

  const authToken = useAuthStore(state => state.user?.authToken);

  const showToast = (message, type = 'success') => {
    if (showNotification) showNotification(message, type);
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  useEffect(() => {
    if (appSettings?.schoolProfile) setProfile(appSettings.schoolProfile);
    if (appSettings?.academicYears) setAcademicYears(appSettings.academicYears);
    setLogoPreview(appSettings?.schoolProfile?.logo_url || appSettings?.logoUrl || '');
    setLogoMobilePreview(appSettings?.logoMobileUrl || '');
    setLogoWebPreview(appSettings?.logoWebUrl || '');
    
    setKopState({
      useKopSuratGambar: !!appSettings?.useKopSuratGambar,
      kopSuratGambar: appSettings?.kopSuratGambar || '',
      kopSuratLogo: appSettings?.kopSuratLogo || '',
      kopSuratBaris1: appSettings?.kopSuratBaris1 || 'PEMERINTAH DAERAH PROVINSI JAWA BARAT',
      kopSuratBaris2: appSettings?.kopSuratBaris2 || 'DINAS PENDIDIKAN',
      kopSuratBaris3: appSettings?.kopSuratBaris3 || appSettings?.schoolProfile?.nama_sekolah || 'SMK KARYA GUNA 2 BEKASI',
      kopSuratAlamat: appSettings?.kopSuratAlamat || appSettings?.schoolProfile?.alamat || 'Jl. Karang Satria RT.10/16, Kelurahan Duren Jaya, Kecamatan Bekasi Timur',
      kopSuratKontak: appSettings?.kopSuratKontak || 'Telp: 085117551755 | Website: smkkg2.sch.id | Email: info@smkkg2.sch.id',
      kopMarginTop: appSettings?.kopMarginTop ?? 15,
      kopMarginSide: appSettings?.kopMarginSide ?? 20,
      kopMarginBottom: appSettings?.kopMarginBottom ?? 15,
      kopSpacing: appSettings?.kopSpacing ?? 20,
      kopBannerHeight: appSettings?.kopBannerHeight ?? 130,
      kopLogoSize: appSettings?.kopLogoSize ?? 72,
      kopAlign: appSettings?.kopAlign || 'center',
      kopDivider: appSettings?.kopDivider || (appSettings?.useKopSuratGambar ? 'none' : 'double'),
    });
  }, [appSettings]);

  // Save Profil Sekolah
  const handleSaveProfile = async () => {
    setIsSaving(true);
    try {
      const updatedProfile = { 
        ...profile, 
        logo_url: logoPreview 
      };
      
      const updatedSettings = { 
        ...appSettings, 
        schoolProfile: updatedProfile, 
        logoUrl: logoPreview,
        logoMobileUrl: logoMobilePreview,
        logoWebUrl: logoWebPreview,
        schoolName: updatedProfile.nama_sekolah || appSettings.schoolName,
        kepsekName: updatedProfile.kepala_sekolah || appSettings.kepsekName,
        kepsekNip: updatedProfile.nip_kepsek || appSettings.kepsekNip
      };
      
      setAppSettings(updatedSettings);
      
      if (onSave) {
        await onSave({ appSettings: updatedSettings }, "menyimpan profil sekolah");
      }

      if (authToken) {
        await fetch('/api/school-profile', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authToken}` },
          body: JSON.stringify(updatedProfile)
        });
      }

      showToast('Profil sekolah berhasil disimpan dan diperbarui!');
    } catch { 
      showToast('Gagal menyimpan profil sekolah.', 'error'); 
    }
    setIsSaving(false);
  };

  // Save Kop Surat & Layout
  const handleSaveKopSurat = async () => {
    setIsSaving(true);
    try {
      const updatedSettings = {
        ...appSettings,
        useKopSuratGambar: kopState.useKopSuratGambar,
        kopSuratGambar: kopState.kopSuratGambar,
        kopSuratLogo: kopState.kopSuratLogo,
        kopSuratBaris1: kopState.kopSuratBaris1,
        kopSuratBaris2: kopState.kopSuratBaris2,
        kopSuratBaris3: kopState.kopSuratBaris3,
        kopSuratAlamat: kopState.kopSuratAlamat,
        kopSuratKontak: kopState.kopSuratKontak,
        kopMarginTop: kopState.kopMarginTop,
        kopMarginSide: kopState.kopMarginSide,
        kopMarginBottom: kopState.kopMarginBottom,
        kopSpacing: kopState.kopSpacing,
        kopBannerHeight: kopState.kopBannerHeight,
        kopLogoSize: kopState.kopLogoSize,
        kopAlign: kopState.kopAlign,
        kopDivider: kopState.kopDivider
      };

      setAppSettings(updatedSettings);
      if (onSave) {
        await onSave({ appSettings: updatedSettings }, "menyimpan format kop surat");
      }

      showToast('Format & margin Kop Surat berhasil disimpan!');
    } catch {
      showToast('Gagal menyimpan format kop surat.', 'error');
    }
    setIsSaving(false);
  };

  // Preset Handlers
  const applyPreset = (type) => {
    if (type === 'resmi') {
      setKopState(prev => ({
        ...prev,
        useKopSuratGambar: false,
        kopMarginTop: 15,
        kopMarginSide: 20,
        kopMarginBottom: 15,
        kopSpacing: 20,
        kopLogoSize: 72,
        kopAlign: 'center',
        kopDivider: 'double'
      }));
      showToast('Preset Standar Dinas Resmi diterapkan.');
    } else if (type === 'banner') {
      setKopState(prev => ({
        ...prev,
        useKopSuratGambar: true,
        kopMarginTop: 12,
        kopMarginSide: 15,
        kopMarginBottom: 15,
        kopSpacing: 18,
        kopBannerHeight: 130,
        kopDivider: 'none'
      }));
      showToast('Preset Banner Gambar Utuh diterapkan.');
    } else if (type === 'compact') {
      setKopState(prev => ({
        ...prev,
        useKopSuratGambar: false,
        kopMarginTop: 10,
        kopMarginSide: 15,
        kopMarginBottom: 10,
        kopSpacing: 12,
        kopLogoSize: 56,
        kopAlign: 'center',
        kopDivider: 'single'
      }));
      showToast('Preset Kompak & Hemat Ruang diterapkan.');
    }
  };

  // Upload Handlers
  const handleLogoChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    compressImage(file, { maxWidth: 500, maxHeight: 500, quality: 0.8 }).then(dataUrl => {
      setLogoPreview(dataUrl);
      setProfile(prev => ({ ...prev, logo_url: dataUrl }));
      showToast('Logo umum berhasil diunggah.');
    });
  };

  const handleLogoMobileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    compressImage(file, { maxWidth: 500, maxHeight: 500, quality: 0.8 }).then(dataUrl => {
      setLogoMobilePreview(dataUrl);
      showToast('Logo mobile berhasil diunggah.');
    });
  };

  const handleLogoWebChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    compressImage(file, { maxWidth: 500, maxHeight: 500, quality: 0.8 }).then(dataUrl => {
      setLogoWebPreview(dataUrl);
      showToast('Logo web desktop berhasil diunggah.');
    });
  };

  const handleKopLogoChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    compressImage(file, { maxWidth: 500, maxHeight: 500, quality: 0.8 }).then(dataUrl => {
      setKopState(prev => ({ ...prev, kopSuratLogo: dataUrl }));
      showToast('Logo khusus kop surat berhasil diperbarui.');
    });
  };

  const handleKopGambarChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    compressImage(file, { maxWidth: 1200, maxHeight: 400, quality: 0.85 }).then(dataUrl => {
      setKopState(prev => ({ ...prev, kopSuratGambar: dataUrl }));
      showToast('Gambar banner kop surat berhasil diunggah.');
    });
  };

  // Academic Year Handlers
  const handleSaveYear = async () => {
    if (!yearForm.nama.trim()) return showToast('Nama tahun ajaran wajib diisi.', 'error');
    try {
      let currentYears = [...(academicYears || [])];
      if (editingYear) {
        currentYears = currentYears.map(y => y.id === editingYear.id ? { ...y, ...yearForm } : y);
      } else {
        const newYear = { ...yearForm, id: Date.now(), is_active: currentYears.length === 0 };
        currentYears.push(newYear);
      }
      setAcademicYears(currentYears);
      const updatedSettings = { ...appSettings, academicYears: currentYears };
      setAppSettings(updatedSettings);
      if (onSave) await onSave({ appSettings: updatedSettings });
      showToast(editingYear ? 'Tahun Ajaran diperbarui!' : 'Tahun Ajaran ditambahkan!');
      setShowYearModal(false);
    } catch { showToast('Gagal menyimpan tahun ajaran.', 'error'); }
  };

  const handleSetActiveYear = async (id) => {
    try {
      const currentYears = (academicYears || []).map(y => ({ ...y, is_active: y.id === id }));
      setAcademicYears(currentYears);
      const updatedSettings = { ...appSettings, academicYears: currentYears };
      setAppSettings(updatedSettings);
      if (onSave) await onSave({ appSettings: updatedSettings });
      showToast('Tahun Ajaran aktif berhasil diperbarui!');
    } catch { showToast('Gagal mengatur tahun ajaran aktif.', 'error'); }
  };

  const handleDeleteYear = async (id) => {
    if (typeof window !== 'undefined' && window.confirm) {
      if (!window.confirm('Hapus tahun ajaran ini?')) return;
    }
    try {
      const currentYears = (academicYears || []).filter(y => y.id !== id);
      setAcademicYears(currentYears);
      const updatedSettings = { ...appSettings, academicYears: currentYears };
      setAppSettings(updatedSettings);
      if (onSave) await onSave({ appSettings: updatedSettings });
      showToast('Tahun Ajaran berhasil dihapus!');
    } catch { showToast('Gagal menghapus tahun ajaran.', 'error'); }
  };

  const activeYear = academicYears.find(y => y.is_active);

  return (
    <div className="space-y-4 sm:space-y-5 animate-in fade-in duration-300 pb-10">
      {/* Clean Page Header */}
      <PageHeader
        icon={School}
        title="Profil Sekolah & Identitas Resmi"
        description="Kelola identitas induk sekolah, logo aplikasi, tahun ajaran aktif, dan tata letak margin kop surat dinas."
        rightContent={
          activeTab === 'profil' ? (
            <Button 
              variant="primary" 
              size="sm"
              onClick={handleSaveProfile} 
              disabled={isSaving}
              className="flex items-center gap-1.5 font-bold shadow-[var(--ui-shadow-control)]"
            >
              {isSaving ? <RefreshCw size={13} className="animate-spin" /> : <Save size={13} strokeWidth={2.5} />}
              <span>Simpan Profil</span>
            </Button>
          ) : activeTab === 'kop' ? (
            <Button 
              variant="primary" 
              size="sm"
              onClick={handleSaveKopSurat} 
              disabled={isSaving}
              className="flex items-center gap-1.5 font-bold shadow-[var(--ui-shadow-control)]"
            >
              {isSaving ? <RefreshCw size={13} className="animate-spin" /> : <Save size={13} strokeWidth={2.5} />}
              <span>Simpan Format & Margin</span>
            </Button>
          ) : null
        }
      />

      {/* Unified Tab Switcher Bar */}
      <div className="bg-white p-1.5 rounded-[var(--ui-radius-card)] border border-slate-200/80 shadow-[var(--ui-shadow-card)] flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
        <div className="flex items-center p-1 bg-[var(--ui-surface-muted)] rounded-[var(--ui-radius-control)] border border-[var(--ui-border-muted)] w-full sm:w-auto">
          <button
            type="button"
            onClick={() => setActiveTab('profil')}
            className={`flex-1 sm:flex-none px-3.5 py-1.5 rounded-[var(--ui-radius-small)] text-xs font-black transition-all cursor-pointer border-none flex items-center justify-center gap-1.5 ${
              activeTab === 'profil'
                ? 'bg-white text-slate-800 shadow-xs'
                : 'bg-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <School size={14} />
            <span>Profil & Logo Sekolah</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('tahun')}
            className={`flex-1 sm:flex-none px-3.5 py-1.5 rounded-[var(--ui-radius-small)] text-xs font-black transition-all cursor-pointer border-none flex items-center justify-center gap-1.5 ${
              activeTab === 'tahun'
                ? 'bg-white text-slate-800 shadow-xs'
                : 'bg-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Calendar size={14} />
            <span>Tahun Ajaran ({academicYears.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('kop')}
            className={`flex-1 sm:flex-none px-3.5 py-1.5 rounded-[var(--ui-radius-small)] text-xs font-black transition-all cursor-pointer border-none flex items-center justify-center gap-1.5 ${
              activeTab === 'kop'
                ? 'bg-white text-slate-800 shadow-xs'
                : 'bg-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Printer size={14} />
            <span>Kop Surat & Margin Dokumen</span>
          </button>
        </div>

        {activeYear && (
          <div className="flex items-center gap-1.5 bg-emerald-50 border border-emerald-200 text-emerald-800 px-3 py-1 rounded-[var(--ui-radius-control)] text-xs font-extrabold w-fit self-end sm:self-center">
            <Star size={13} className="fill-emerald-500 text-emerald-500" />
            <span>TA Aktif: {activeYear.nama} {activeYear.semester}</span>
          </div>
        )}
      </div>

      {/* ─── TAB 1: PROFIL & LOGO SEKOLAH ─────────────────────────────────── */}
      {activeTab === 'profil' && (
        <div className="bg-white rounded-[var(--ui-radius-card)] p-4 sm:p-6 border border-slate-200/80 shadow-[var(--ui-shadow-card)] space-y-6">
          {/* Logo Management Grid */}
          <div>
            <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider mb-3 flex items-center gap-2">
              <ImageIcon size={15} className="text-slate-400" /> Logo & Identitas Visual
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 bg-[var(--ui-surface-muted)] rounded-[var(--ui-radius-control)] border border-[var(--ui-border-soft)] flex flex-col items-center text-center">
                <div className="w-20 h-20 rounded-[var(--ui-radius-control)] border border-slate-200 flex items-center justify-center overflow-hidden bg-white shrink-0 mb-3 shadow-xs">
                  {logoPreview ? (
                    <img src={logoPreview} alt="Logo Umum" className="w-full h-full object-contain p-1" />
                  ) : (
                    <School className="text-slate-300" size={32} />
                  )}
                </div>
                <p className="font-extrabold text-slate-800 text-xs mb-0.5">Logo Utama Sekolah</p>
                <p className="text-[10px] text-slate-400 mb-3 max-w-[200px]">Digunakan pada Kartu Pelajar, Kop Surat, dan laporan PDF.</p>
                <input type="file" accept="image/*" ref={logoInputRef} onChange={handleLogoChange} className="hidden" />
                <Button variant="outline" size="sm" onClick={() => logoInputRef.current?.click()} className="flex items-center gap-1.5 text-xs font-bold">
                  <Upload size={12} /> Ganti Logo
                </Button>
              </div>

              <div className="p-4 bg-[var(--ui-surface-muted)] rounded-[var(--ui-radius-control)] border border-[var(--ui-border-soft)] flex flex-col items-center text-center">
                <div className="w-20 h-20 rounded-[var(--ui-radius-control)] border border-slate-200 flex items-center justify-center overflow-hidden bg-white shrink-0 mb-3 shadow-xs">
                  {logoMobilePreview ? (
                    <img src={logoMobilePreview} alt="Logo Mobile" className="w-full h-full object-contain p-1" />
                  ) : (
                    <MonitorSmartphone className="text-slate-300" size={32} />
                  )}
                </div>
                <p className="font-extrabold text-slate-800 text-xs mb-0.5">Logo Mobile Header</p>
                <p className="text-[10px] text-slate-400 mb-3 max-w-[200px]">Tampil pada header Landing Page Mobile & PWA.</p>
                <input type="file" accept="image/*" ref={logoMobileInputRef} onChange={handleLogoMobileChange} className="hidden" />
                <Button variant="outline" size="sm" onClick={() => logoMobileInputRef.current?.click()} className="flex items-center gap-1.5 text-xs font-bold">
                  <Upload size={12} /> Ganti Logo
                </Button>
              </div>

              <div className="p-4 bg-[var(--ui-surface-muted)] rounded-[var(--ui-radius-control)] border border-[var(--ui-border-soft)] flex flex-col items-center text-center">
                <div className="w-20 h-20 rounded-[var(--ui-radius-control)] border border-slate-200 flex items-center justify-center overflow-hidden bg-white shrink-0 mb-3 shadow-xs">
                  {logoWebPreview ? (
                    <img src={logoWebPreview} alt="Logo Website" className="w-full h-full object-contain p-1" />
                  ) : (
                    <Globe className="text-slate-300" size={32} />
                  )}
                </div>
                <p className="font-extrabold text-slate-800 text-xs mb-0.5">Logo Web & Panel Admin</p>
                <p className="text-[10px] text-slate-400 mb-3 max-w-[200px]">Tampil pada Sidebar navigasi dan Favicon web.</p>
                <input type="file" accept="image/*" ref={logoWebInputRef} onChange={handleLogoWebChange} className="hidden" />
                <Button variant="outline" size="sm" onClick={() => logoWebInputRef.current?.click()} className="flex items-center gap-1.5 text-xs font-bold">
                  <Upload size={12} /> Ganti Logo
                </Button>
              </div>
            </div>
          </div>

          {/* Form Fields Grid */}
          <div className="pt-4 border-t border-slate-100">
            <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider mb-4 flex items-center gap-2">
              <Building2 size={15} className="text-slate-400" /> Informasi Data Induk Sekolah
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {SCHOOL_FIELDS.map(f => (
                <div key={f.key} className={f.multiline ? "sm:col-span-2 lg:col-span-3" : ""}>
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider block mb-1">
                    {f.label} {f.required && <span className="text-rose-500">*</span>}
                  </label>
                  {f.multiline ? (
                    <textarea
                      rows={2}
                      value={profile[f.key] || ''}
                      onChange={e => setProfile({ ...profile, [f.key]: e.target.value })}
                      placeholder={f.placeholder}
                      className="w-full px-3 py-2 bg-[var(--ui-surface-muted)] hover:bg-white border border-[var(--ui-border-soft)] rounded-[var(--ui-radius-control)] text-xs font-bold text-slate-800 focus:bg-white focus:outline-none focus:border-[var(--ui-primary)] transition-all resize-none"
                    />
                  ) : (
                    <input
                      type="text"
                      value={profile[f.key] || ''}
                      onChange={e => setProfile({ ...profile, [f.key]: e.target.value })}
                      placeholder={f.placeholder}
                      className="w-full px-3 py-2 bg-[var(--ui-surface-muted)] hover:bg-white border border-[var(--ui-border-soft)] rounded-[var(--ui-radius-control)] text-xs font-bold text-slate-800 focus:bg-white focus:outline-none focus:border-[var(--ui-primary)] transition-all"
                    />
                  )}
                </div>
              ))}
            </div>

            <div className="pt-6 mt-6 border-t border-slate-100 flex justify-end">
              <Button 
                variant="primary" 
                onClick={handleSaveProfile} 
                disabled={isSaving}
                className="flex items-center gap-2 font-bold px-6 py-2.5 shadow-[var(--ui-shadow-control)] w-full sm:w-auto justify-center"
              >
                {isSaving ? <RefreshCw size={15} className="animate-spin" /> : <Save size={15} strokeWidth={2.5} />}
                <span>Simpan Perubahan Profil</span>
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ─── TAB 2: TAHUN AJARAN ─────────────────────────────────────────── */}
      {activeTab === 'tahun' && (
        <div className="bg-white rounded-[var(--ui-radius-card)] p-4 sm:p-6 border border-slate-200/80 shadow-[var(--ui-shadow-card)] space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider">Daftar Tahun Ajaran & Semester</h3>
              <p className="text-[11px] text-slate-400">Atur periode tahun ajaran aktif untuk filter jadwal dan presensi.</p>
            </div>

            <Button 
              variant="primary" 
              size="sm"
              onClick={() => { setEditingYear(null); setYearForm({ nama: '', semester: 'Ganjil', tanggal_mulai: '', tanggal_selesai: '' }); setShowYearModal(true); }}
              className="flex items-center gap-1.5 font-bold shadow-[var(--ui-shadow-control)]"
            >
              <Plus size={14} strokeWidth={2.5} />
              <span>+ Tambah Tahun Ajaran</span>
            </Button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="border-b border-slate-200 text-slate-400 uppercase text-[10px] font-black">
                  <th className="py-2.5 px-3">Tahun Ajaran</th>
                  <th className="py-2.5 px-3">Semester</th>
                  <th className="py-2.5 px-3">Periode Tanggal</th>
                  <th className="py-2.5 px-3 text-center">Status</th>
                  <th className="py-2.5 px-3 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {academicYears.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-slate-400 font-bold">
                      Belum ada data tahun ajaran. Klik tombol Tambah Tahun Ajaran di atas.
                    </td>
                  </tr>
                ) : (
                  academicYears.map(y => (
                    <tr key={y.id} className="hover:bg-slate-50 transition-colors font-bold text-slate-700">
                      <td className="py-3 px-3 font-extrabold text-slate-900">{y.nama}</td>
                      <td className="py-3 px-3">
                        <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-black ${
                          y.semester === 'Ganjil' ? 'bg-amber-50 text-amber-700 border border-amber-200' : 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                        }`}>
                          {y.semester}
                        </span>
                      </td>
                      <td className="py-3 px-3 font-mono text-[11px] text-slate-500">
                        {y.tanggal_mulai || '-'} s/d {y.tanggal_selesai || '-'}
                      </td>
                      <td className="py-3 px-3 text-center">
                        {y.is_active ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-black uppercase">
                            <Star size={11} className="fill-emerald-500" /> Aktif
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleSetActiveYear(y.id)}
                            className="px-2 py-0.5 rounded text-[10px] font-bold text-slate-500 bg-slate-100 hover:bg-emerald-50 hover:text-emerald-700 border border-slate-200 transition-colors cursor-pointer"
                          >
                            Set Aktif
                          </button>
                        )}
                      </td>
                      <td className="py-3 px-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => {
                              setEditingYear(y);
                              setYearForm({ nama: y.nama, semester: y.semester, tanggal_mulai: y.tanggal_mulai || '', tanggal_selesai: y.tanggal_selesai || '' });
                              setShowYearModal(true);
                            }}
                            className="p-1 rounded text-slate-500 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 cursor-pointer"
                          >
                            <Edit2 size={13} />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteYear(y.id)}
                            className="p-1 rounded text-slate-400 hover:text-rose-600 bg-slate-100 hover:bg-rose-50 cursor-pointer"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ─── TAB 3: KOP SURAT & MARGIN DOKUMEN ───────────────────────────── */}
      {activeTab === 'kop' && (
        <div className="space-y-5">
          {/* Preset Quick Actions & Mode Toggle */}
          <div className="bg-white rounded-[var(--ui-radius-card)] p-3.5 sm:p-4 border border-slate-200/80 shadow-[var(--ui-shadow-card)] flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider mr-1">Preset Cepat:</span>
              <button
                type="button"
                onClick={() => applyPreset('resmi')}
                className="px-2.5 py-1 rounded-[var(--ui-radius-control)] bg-slate-100 hover:bg-emerald-50 hover:text-emerald-700 text-slate-700 text-xs font-bold border border-slate-200 transition-colors flex items-center gap-1 cursor-pointer"
              >
                🏛️ Standar Dinas Resmi
              </button>
              <button
                type="button"
                onClick={() => applyPreset('banner')}
                className="px-2.5 py-1 rounded-[var(--ui-radius-control)] bg-slate-100 hover:bg-indigo-50 hover:text-indigo-700 text-slate-700 text-xs font-bold border border-slate-200 transition-colors flex items-center gap-1 cursor-pointer"
              >
                🖼️ Banner Gambar Utuh
              </button>
              <button
                type="button"
                onClick={() => applyPreset('compact')}
                className="px-2.5 py-1 rounded-[var(--ui-radius-control)] bg-slate-100 hover:bg-amber-50 hover:text-amber-700 text-slate-700 text-xs font-bold border border-slate-200 transition-colors flex items-center gap-1 cursor-pointer"
              >
                📄 Kompak Minimalis
              </button>
            </div>

            <div className="flex items-center gap-2">
              <label className="flex items-center gap-2 cursor-pointer bg-[var(--ui-surface-muted)] border border-[var(--ui-border-soft)] px-3 py-1.5 rounded-[var(--ui-radius-control)] hover:bg-slate-100 transition-colors">
                <input
                  type="checkbox"
                  checked={kopState.useKopSuratGambar}
                  onChange={e => setKopState({ ...kopState, useKopSuratGambar: e.target.checked })}
                  className="rounded text-[var(--ui-primary)] focus:ring-[var(--ui-primary)] cursor-pointer"
                />
                <span className="text-xs font-extrabold text-slate-700 cursor-pointer">Gunakan File Banner Gambar Utuh</span>
              </label>
            </div>
          </div>

          {/* Realtime Live Preview Paper Box */}
          <div className="bg-slate-900 rounded-[var(--ui-radius-card)] p-4 sm:p-6 shadow-xl relative overflow-hidden">
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-800 text-xs">
              <span className="font-extrabold text-amber-400 flex items-center gap-1.5">
                <Sparkles size={14} /> Pratinjau Kertas Dokumen A4 Realtime dengan Margin
              </span>
              <span className="text-[10px] text-slate-400 font-mono">
                Top: {kopState.kopMarginTop}mm • Side: {kopState.kopMarginSide}mm • Bottom: {kopState.kopMarginBottom}mm
              </span>
            </div>

            <div className="overflow-x-auto pb-4">
              <div 
                style={{
                  paddingTop: `${kopState.kopMarginTop}mm`,
                  paddingLeft: `${kopState.kopMarginSide}mm`,
                  paddingRight: `${kopState.kopMarginSide}mm`,
                  paddingBottom: `${kopState.kopMarginBottom}mm`,
                }}
                className="bg-white rounded-[var(--ui-radius-small)] shadow-sm border border-slate-200 text-sm leading-relaxed font-serif text-slate-900 w-full max-w-[210mm] min-h-[160mm] mx-auto select-none transition-all duration-200"
              >
                {kopState.useKopSuratGambar ? (
                  kopState.kopSuratGambar ? (
                    <div style={{ marginBottom: `${kopState.kopSpacing}px` }} className="w-full flex justify-center">
                      <img 
                        src={kopState.kopSuratGambar} 
                        alt="Kop Surat Banner" 
                        style={{ maxHeight: `${kopState.kopBannerHeight}px` }}
                        className="w-full h-auto object-contain mx-auto" 
                      />
                    </div>
                  ) : (
                    <div className="py-12 text-center text-slate-400 font-bold text-xs bg-slate-50 border border-dashed border-slate-300 rounded mb-4">
                      <ImageIcon size={36} className="mx-auto mb-2 opacity-40" />
                      Belum ada file gambar banner kop surat. Silakan unggah file gambar di formulir bawah.
                    </div>
                  )
                ) : (
                  <div 
                    style={{ marginBottom: `${kopState.kopSpacing}px` }}
                    className={`flex items-center gap-4 pb-3 ${
                      kopState.kopDivider === 'double' ? 'border-b-4 border-double border-slate-900' :
                      kopState.kopDivider === 'single' ? 'border-b border-slate-900' :
                      kopState.kopDivider === 'thick' ? 'border-b-2 border-slate-900' :
                      kopState.kopDivider === 'dashed' ? 'border-b-2 border-dashed border-slate-900' : ''
                    }`}
                  >
                    <img 
                      src={kopState.kopSuratLogo || logoPreview || "https://placehold.co/120x120/064e3b/ffffff?text=SMK"} 
                      alt="Logo Kop" 
                      style={{ width: `${kopState.kopLogoSize}px`, height: `${kopState.kopLogoSize}px` }}
                      className="object-contain shrink-0" 
                    />
                    <div className={`flex-1 ${kopState.kopAlign === 'left' ? 'text-left' : 'text-center'}`}>
                      <p className="text-[11px] font-sans uppercase font-extrabold tracking-widest text-slate-600">
                        {kopState.kopSuratBaris1 || 'PEMERINTAH DAERAH PROVINSI JAWA BARAT'}
                      </p>
                      {kopState.kopSuratBaris2 && (
                        <p className="text-xs font-sans uppercase font-bold text-slate-700">
                          {kopState.kopSuratBaris2}
                        </p>
                      )}
                      <h2 className="font-black text-lg sm:text-xl uppercase tracking-wider font-sans text-slate-900 leading-tight">
                        {kopState.kopSuratBaris3 || profile.nama_sekolah || 'SMK KARYA GUNA 2 BEKASI'}
                      </h2>
                      <p className="text-[11.5px] font-sans mt-0.5">
                        {kopState.kopSuratAlamat || profile.alamat || 'Jl. Karang Satria RT.10/16, Kelurahan Duren Jaya, Kecamatan Bekasi Timur'}
                      </p>
                      <p className="text-[11px] font-sans text-slate-600">
                        {kopState.kopSuratKontak || 'Telp: 085117551755 | Website: smkkg2.sch.id | Email: info@smkkg2.sch.id'}
                      </p>
                    </div>
                  </div>
                )}

                {/* Dummy Document Content for visual representation */}
                <div className="space-y-2 opacity-60 text-[12px] font-serif">
                  <p className="font-bold text-center underline uppercase">SURAT PANGGILAN / KETERANGAN RESMI</p>
                  <p className="text-center font-mono text-[10px]">Nomor: 421.5/001/DISDIK/2026</p>
                  <p className="mt-4">Yang bertanda tangan di bawah ini Kepala Sekolah menerangkan bahwa siswa yang bersangkutan terdaftar aktif mengikuti KBM...</p>
                </div>
              </div>
            </div>
          </div>

          {/* Configuration Form Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
            
            {/* Left: Margins & Placement Controls (6 cols) */}
            <div className="lg:col-span-6 bg-white rounded-[var(--ui-radius-card)] p-4 sm:p-5 border border-slate-200/80 shadow-[var(--ui-shadow-card)] space-y-4">
              <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-2 border-b border-slate-100 pb-2.5">
                <Sliders size={14} className="text-slate-400" /> Pengaturan Margin & Penempatan Kertas
              </h4>

              {/* Slider 1: Top Margin */}
              <div>
                <div className="flex justify-between items-center text-xs font-bold mb-1">
                  <span className="text-slate-700">Margin Atas Dokumen (Top Margin)</span>
                  <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-800 font-mono text-[11px]">
                    {kopState.kopMarginTop} mm
                  </span>
                </div>
                <input 
                  type="range" 
                  min="5" 
                  max="45" 
                  value={kopState.kopMarginTop} 
                  onChange={e => setKopState({ ...kopState, kopMarginTop: Number(e.target.value) })}
                  className="w-full accent-[var(--ui-primary)] cursor-pointer"
                />
              </div>

              {/* Slider 2: Side Margins */}
              <div>
                <div className="flex justify-between items-center text-xs font-bold mb-1">
                  <span className="text-slate-700">Margin Kiri & Kanan (Horizontal Margin)</span>
                  <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-800 font-mono text-[11px]">
                    {kopState.kopMarginSide} mm
                  </span>
                </div>
                <input 
                  type="range" 
                  min="10" 
                  max="40" 
                  value={kopState.kopMarginSide} 
                  onChange={e => setKopState({ ...kopState, kopMarginSide: Number(e.target.value) })}
                  className="w-full accent-[var(--ui-primary)] cursor-pointer"
                />
              </div>

              {/* Slider 3: Bottom Margin */}
              <div>
                <div className="flex justify-between items-center text-xs font-bold mb-1">
                  <span className="text-slate-700">Margin Bawah Dokumen (Bottom Margin)</span>
                  <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-800 font-mono text-[11px]">
                    {kopState.kopMarginBottom} mm
                  </span>
                </div>
                <input 
                  type="range" 
                  min="5" 
                  max="35" 
                  value={kopState.kopMarginBottom} 
                  onChange={e => setKopState({ ...kopState, kopMarginBottom: Number(e.target.value) })}
                  className="w-full accent-[var(--ui-primary)] cursor-pointer"
                />
              </div>

              {/* Slider 4: Spacing between Kop and Body */}
              <div>
                <div className="flex justify-between items-center text-xs font-bold mb-1">
                  <span className="text-slate-700">Jarak Pemisah Kop & Isi Surat (Spacing)</span>
                  <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-800 font-mono text-[11px]">
                    {kopState.kopSpacing} px
                  </span>
                </div>
                <input 
                  type="range" 
                  min="5" 
                  max="50" 
                  value={kopState.kopSpacing} 
                  onChange={e => setKopState({ ...kopState, kopSpacing: Number(e.target.value) })}
                  className="w-full accent-[var(--ui-primary)] cursor-pointer"
                />
              </div>

              {/* Mode-Specific Sliders */}
              {kopState.useKopSuratGambar ? (
                <div>
                  <div className="flex justify-between items-center text-xs font-bold mb-1">
                    <span className="text-slate-700">Tinggi Maksimal Gambar Banner Kop</span>
                    <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-800 font-mono text-[11px]">
                      {kopState.kopBannerHeight} px
                    </span>
                  </div>
                  <input 
                    type="range" 
                    min="50" 
                    max="220" 
                    value={kopState.kopBannerHeight} 
                    onChange={e => setKopState({ ...kopState, kopBannerHeight: Number(e.target.value) })}
                    className="w-full accent-[var(--ui-primary)] cursor-pointer"
                  />
                </div>
              ) : (
                <>
                  <div>
                    <div className="flex justify-between items-center text-xs font-bold mb-1">
                      <span className="text-slate-700">Ukuran Logo Kop Surat</span>
                      <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-800 font-mono text-[11px]">
                        {kopState.kopLogoSize} px
                      </span>
                    </div>
                    <input 
                      type="range" 
                      min="40" 
                      max="110" 
                      value={kopState.kopLogoSize} 
                      onChange={e => setKopState({ ...kopState, kopLogoSize: Number(e.target.value) })}
                      className="w-full accent-[var(--ui-primary)] cursor-pointer"
                    />
                  </div>

                  {/* Alignment Selection */}
                  <div>
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider block mb-1.5">
                      Perataan Teks Kop (Alignment)
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setKopState({ ...kopState, kopAlign: 'center' })}
                        className={`py-1.5 px-3 rounded-[var(--ui-radius-control)] text-xs font-bold border transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                          kopState.kopAlign === 'center' 
                            ? 'bg-[var(--ui-primary)]/10 border-[var(--ui-primary)] text-[var(--ui-primary)] shadow-xs font-extrabold' 
                            : 'bg-slate-50 border-slate-200 text-slate-600'
                        }`}
                      >
                        <AlignCenter size={14} /> Rata Tengah (Center)
                      </button>
                      <button
                        type="button"
                        onClick={() => setKopState({ ...kopState, kopAlign: 'left' })}
                        className={`py-1.5 px-3 rounded-[var(--ui-radius-control)] text-xs font-bold border transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                          kopState.kopAlign === 'left' 
                            ? 'bg-[var(--ui-primary)]/10 border-[var(--ui-primary)] text-[var(--ui-primary)] shadow-xs font-extrabold' 
                            : 'bg-slate-50 border-slate-200 text-slate-600'
                        }`}
                      >
                        <AlignLeft size={14} /> Rata Kiri (Left)
                      </button>
                    </div>
                  </div>

                  {/* Divider Line Selection */}
                  <div>
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider block mb-1.5">
                      Garis Pembatas Kop (Divider)
                    </label>
                    <div className="grid grid-cols-3 gap-1.5">
                      {[
                        { id: 'double', label: '═ Ganda' },
                        { id: 'single', label: '─ Tunggal' },
                        { id: 'thick', label: '━ Tebal' },
                        { id: 'dashed', label: '╌ Putus' },
                        { id: 'none', label: '🚫 Tanpa Garis' }
                      ].map(d => (
                        <button
                          key={d.id}
                          type="button"
                          onClick={() => setKopState({ ...kopState, kopDivider: d.id })}
                          className={`py-1 px-2 rounded-[var(--ui-radius-control)] text-[11px] font-bold border transition-all text-center cursor-pointer ${
                            kopState.kopDivider === d.id 
                              ? 'bg-[var(--ui-primary)]/10 border-[var(--ui-primary)] text-[var(--ui-primary)] font-extrabold' 
                              : 'bg-slate-50 border-slate-200 text-slate-600'
                          }`}
                        >
                          {d.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Right: Upload & Content Details (6 cols) */}
            <div className="lg:col-span-6 bg-white rounded-[var(--ui-radius-card)] p-4 sm:p-5 border border-slate-200/80 shadow-[var(--ui-shadow-card)] space-y-4">
              <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider border-b border-slate-100 pb-2.5">
                {kopState.useKopSuratGambar ? 'File Banner Gambar Kop' : 'Isi Teks & Logo Resmi'}
              </h4>

              {kopState.useKopSuratGambar ? (
                <div className="space-y-3">
                  <p className="text-xs text-slate-500 leading-relaxed font-medium">
                    Unggah file banner kop surat instansi berbentuk memanjang/landscape (*PNG atau JPG*) dengan resolusi tinggi.
                  </p>

                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    <input 
                      type="file" 
                      accept="image/*" 
                      ref={kopGambarInputRef}
                      onChange={handleKopGambarChange} 
                      className="hidden"
                    />
                    <Button variant="outline" size="sm" onClick={() => kopGambarInputRef.current?.click()} className="flex items-center gap-1.5 font-bold text-xs">
                      <Upload size={13} /> {kopState.kopSuratGambar ? 'Ganti Banner Gambar' : 'Unggah Banner Gambar'}
                    </Button>
                    {kopState.kopSuratGambar && (
                      <Button variant="ghost" size="sm" onClick={() => setKopState({ ...kopState, kopSuratGambar: '' })} className="text-rose-600 hover:bg-rose-50 font-bold text-xs">
                        Hapus Gambar
                      </Button>
                    )}
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  {/* Logo Kop */}
                  <div className="flex items-center gap-3 p-2.5 bg-[var(--ui-surface-muted)] rounded-[var(--ui-radius-control)] border border-[var(--ui-border-soft)]">
                    <div className="w-12 h-12 rounded border border-slate-200 flex items-center justify-center overflow-hidden bg-white shrink-0">
                      <img 
                        src={kopState.kopSuratLogo || logoPreview || "https://placehold.co/120x120/064e3b/ffffff?text=SMK"} 
                        alt="Logo Kop" 
                        className="w-full h-full object-contain p-0.5" 
                      />
                    </div>
                    <div className="flex-1">
                      <p className="text-xs font-bold text-slate-800">Logo Khusus Kop</p>
                      <input type="file" accept="image/*" ref={kopLogoInputRef} onChange={handleKopLogoChange} className="hidden" />
                      <div className="flex items-center gap-2 mt-1">
                        <button
                          type="button"
                          onClick={() => kopLogoInputRef.current?.click()}
                          className="text-[11px] font-bold text-[var(--ui-primary)] hover:underline cursor-pointer"
                        >
                          Unggah Logo Baru
                        </button>
                        {kopState.kopSuratLogo && (
                          <button
                            type="button"
                            onClick={() => setKopState({ ...kopState, kopSuratLogo: '' })}
                            className="text-[11px] font-bold text-rose-600 hover:underline cursor-pointer"
                          >
                            Pakai Logo Utama
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Text Inputs */}
                  <div>
                    <label className="text-[9.5px] font-black text-slate-500 uppercase block mb-1">Baris 1 (Pemerintah / Yayasan)</label>
                    <input
                      type="text"
                      value={kopState.kopSuratBaris1}
                      onChange={e => setKopState({ ...kopState, kopSuratBaris1: e.target.value })}
                      placeholder="PEMERINTAH DAERAH PROVINSI JAWA BARAT"
                      className="w-full px-2.5 py-1.5 bg-[var(--ui-surface-muted)] hover:bg-white border border-[var(--ui-border-soft)] rounded-[var(--ui-radius-control)] text-xs font-bold focus:bg-white focus:outline-none focus:border-[var(--ui-primary)]"
                    />
                  </div>

                  <div>
                    <label className="text-[9.5px] font-black text-slate-500 uppercase block mb-1">Baris 2 (Dinas / Instansi)</label>
                    <input
                      type="text"
                      value={kopState.kopSuratBaris2}
                      onChange={e => setKopState({ ...kopState, kopSuratBaris2: e.target.value })}
                      placeholder="DINAS PENDIDIKAN"
                      className="w-full px-2.5 py-1.5 bg-[var(--ui-surface-muted)] hover:bg-white border border-[var(--ui-border-soft)] rounded-[var(--ui-radius-control)] text-xs font-bold focus:bg-white focus:outline-none focus:border-[var(--ui-primary)]"
                    />
                  </div>

                  <div>
                    <label className="text-[9.5px] font-black text-slate-500 uppercase block mb-1">Baris 3 (Nama Resmi Sekolah)</label>
                    <input
                      type="text"
                      value={kopState.kopSuratBaris3}
                      onChange={e => setKopState({ ...kopState, kopSuratBaris3: e.target.value })}
                      placeholder="SMK KARYA GUNA 2 BEKASI"
                      className="w-full px-2.5 py-1.5 bg-[var(--ui-surface-muted)] hover:bg-white border border-[var(--ui-border-soft)] rounded-[var(--ui-radius-control)] text-xs font-black text-slate-900 focus:bg-white focus:outline-none focus:border-[var(--ui-primary)]"
                    />
                  </div>

                  <div>
                    <label className="text-[9.5px] font-black text-slate-500 uppercase block mb-1">Alamat Lengkap</label>
                    <textarea
                      rows={2}
                      value={kopState.kopSuratAlamat}
                      onChange={e => setKopState({ ...kopState, kopSuratAlamat: e.target.value })}
                      placeholder="Jl. Karang Satria RT.10/16..."
                      className="w-full px-2.5 py-1.5 bg-[var(--ui-surface-muted)] hover:bg-white border border-[var(--ui-border-soft)] rounded-[var(--ui-radius-control)] text-xs font-medium focus:bg-white focus:outline-none focus:border-[var(--ui-primary)] resize-none"
                    />
                  </div>

                  <div>
                    <label className="text-[9.5px] font-black text-slate-500 uppercase block mb-1">Kontak (Telp / Web / Email)</label>
                    <input
                      type="text"
                      value={kopState.kopSuratKontak}
                      onChange={e => setKopState({ ...kopState, kopSuratKontak: e.target.value })}
                      placeholder="Telp: 085117551755 | Website: smkkg2.sch.id"
                      className="w-full px-2.5 py-1.5 bg-[var(--ui-surface-muted)] hover:bg-white border border-[var(--ui-border-soft)] rounded-[var(--ui-radius-control)] text-xs font-medium focus:bg-white focus:outline-none focus:border-[var(--ui-primary)]"
                    />
                  </div>
                </div>
              )}

              <div className="pt-3 border-t border-slate-100 flex justify-end">
                <Button 
                  variant="primary" 
                  onClick={handleSaveKopSurat} 
                  disabled={isSaving}
                  className="flex items-center gap-1.5 font-bold px-5 py-2 shadow-[var(--ui-shadow-control)] w-full sm:w-auto justify-center text-xs"
                >
                  {isSaving ? <RefreshCw size={13} className="animate-spin" /> : <Save size={13} strokeWidth={2.5} />}
                  <span>Simpan Format & Margin</span>
                </Button>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* Year Modal */}
      {showYearModal && (
        <Modal
          isOpen={showYearModal}
          onClose={() => setShowYearModal(false)}
          title={editingYear ? 'Edit Tahun Ajaran' : 'Tambah Tahun Ajaran Baru'}
          maxWidth="max-w-md"
        >
          <div className="space-y-4 text-xs">
            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Nama Tahun Ajaran</label>
              <input 
                type="text" 
                value={yearForm.nama} 
                onChange={e => setYearForm(p => ({ ...p, nama: e.target.value }))}
                placeholder="Contoh: 2025/2026"
                className="w-full px-3 py-2 bg-[var(--ui-surface-muted)] border border-[var(--ui-border-soft)] rounded-[var(--ui-radius-control)] font-bold text-xs" 
              />
            </div>

            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Semester</label>
              <CustomSelect 
                value={yearForm.semester} 
                onChange={val => setYearForm(p => ({ ...p, semester: val }))}
                options={[
                  { value: 'Ganjil', label: 'Semester Ganjil' },
                  { value: 'Genap', label: 'Semester Genap' }
                ]}
                searchable={false}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Tanggal Mulai</label>
                <input 
                  type="date" 
                  value={yearForm.tanggal_mulai} 
                  onChange={e => setYearForm(p => ({ ...p, tanggal_mulai: e.target.value }))}
                  className="w-full px-3 py-2 bg-[var(--ui-surface-muted)] border border-[var(--ui-border-soft)] rounded-[var(--ui-radius-control)] font-bold text-xs" 
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Tanggal Selesai</label>
                <input 
                  type="date" 
                  value={yearForm.tanggal_selesai} 
                  onChange={e => setYearForm(p => ({ ...p, tanggal_selesai: e.target.value }))}
                  className="w-full px-3 py-2 bg-[var(--ui-surface-muted)] border border-[var(--ui-border-soft)] rounded-[var(--ui-radius-control)] font-bold text-xs" 
                />
              </div>
            </div>

            <div className="pt-3 flex justify-end gap-2 border-t border-slate-100">
              <Button variant="outline" size="sm" type="button" onClick={() => setShowYearModal(false)}>Batal</Button>
              <Button variant="primary" size="sm" onClick={handleSaveYear}>Simpan</Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Toast Notification */}
      {toast && (
        <div className={`fixed bottom-6 right-6 px-4 py-3 rounded-[var(--ui-radius-control)] shadow-[var(--ui-shadow-modal)] font-bold text-xs flex items-center gap-2 animate-in slide-in-from-bottom-5 text-white z-[100] ${
          toast.type === 'error' ? 'bg-rose-600' : 'bg-emerald-600'
        }`}>
          {toast.type === 'error' ? <AlertCircle size={16} /> : <CheckCircle2 size={16} />} 
          <span>{toast.message}</span>
        </div>
      )}
    </div>
  );
}
