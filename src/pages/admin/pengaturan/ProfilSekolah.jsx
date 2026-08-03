import { Button } from '../../../components/ui.jsx';
import { useState, useEffect, useRef } from'react';
import { School, BookOpen, MessageSquare, MonitorSmartphone, Wifi, Palette, MapPin, Users, Sparkles } from'lucide-react';
import { compressImage } from'../../../utils/imageUtils.js';
import { Star, Upload, Globe, Save, Plus, Edit2, Trash2, Printer, ImageIcon, X, AlertCircle, CheckCircle2 } from'lucide-react';
import { PageHeader } from '../../../components/monitoring/ui/index.js';
;
import { UISelect } from'../../../components/ui.jsx';


const SCHOOL_FIELDS = [
  { key:'nama_sekolah', label:'Nama Sekolah', placeholder:'SMK Negeri 1 ...' },
  { key:'npsn', label:'NPSN', placeholder:'20XXXXXXXX' },
  { key:'nss', label:'NSS', placeholder:'Nomor Statistik Sekolah' },
  { key:'alamat', label:'Alamat Lengkap', placeholder:'Jl. ...', multiline: true },
  { key:'kota', label:'Kota / Kabupaten', placeholder:'Kota ...' },
  { key:'provinsi', label:'Provinsi', placeholder:'Jawa Barat' },
  { key:'kode_pos', label:'Kode Pos', placeholder:'12345' },
  { key:'telepon', label:'Telepon / Fax', placeholder:'(021) XXXXXXXX' },
  { key:'email', label:'Email Sekolah', placeholder:'info@smkn1.sch.id' },
  { key:'website', label:'Website', placeholder:'https://smkn1.sch.id' },
  { key:'kepala_sekolah', label:'Nama Kepala Sekolah', placeholder:'Drs. ..., M.Pd.' },
  { key:'nip_kepsek', label:'NIP Kepala Sekolah', placeholder:'19XXXXXXXXXXXXXXXX' },
  { key:'akreditasi', label:'Akreditasi', placeholder:'A' },
  { key:'tahun_berdiri', label:'Tahun Berdiri', placeholder:'1985' },
  { key:'max_poin_pelanggaran', label:'Batas Maksimal Poin Pelanggaran (DO)', placeholder:'100' },
  { key:'attendance_start_date', label:'Tanggal Mulai Absensi Efektif (Abaikan data sebelum tanggal ini)', type:'date', placeholder:'' },
];

const MAJOR_ICON_OPTIONS = [
  { value:"book", label:"Buku / Mapel", icon: BookOpen },
  { value:"chat", label:"Komunikasi", icon: MessageSquare },
  { value:"monitor", label:"Komputer", icon: MonitorSmartphone },
  { value:"wifi", label:"Jaringan", icon: Wifi },
  { value:"palette", label:"Desain", icon: Palette },
  { value:"map", label:"Denah", icon: MapPin },
  { value:"users", label:"Siswa", icon: Users },
  { value:"sparkles", label:"Unggulan", icon: Sparkles },
];

export default function ProfilSekolah({ appSettings = {}, setAppSettings = () => {}, onSave = () => {} }) {
  const [profile, setProfile] = useState(appSettings?.schoolProfile || {});
  const [academicYears, setAcademicYears] = useState(appSettings?.academicYears || []);
  const [isSaving, setIsSaving] = useState(false);
  const [toast, setToast] = useState(null);
  const [activeTab, setActiveTab] = useState('profil');
  const [logoPreview, setLogoPreview] = useState(appSettings?.schoolProfile?.logo_url || appSettings?.logoUrl ||'');
  const [logoMobilePreview, setLogoMobilePreview] = useState(appSettings?.logoMobileUrl ||'');
  const [logoWebPreview, setLogoWebPreview] = useState(appSettings?.logoWebUrl ||'');
  const [showYearModal, setShowYearModal] = useState(false);
  const [editingYear, setEditingYear] = useState(null);
  const [yearForm, setYearForm] = useState({ nama:'', semester:'Ganjil', tanggal_mulai:'', tanggal_selesai:'' });
  
  const logoInputRef = useRef();
  const logoMobileInputRef = useRef();
  const logoWebInputRef = useRef();

  const showToast = (message, type ='success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  useEffect(() => {
    setProfile(appSettings?.schoolProfile || {});
    setLogoPreview(appSettings?.schoolProfile?.logo_url || appSettings?.logoUrl ||'');
    setLogoMobilePreview(appSettings?.logoMobileUrl ||'');
    setLogoWebPreview(appSettings?.logoWebUrl ||'');
    setAcademicYears(appSettings?.academicYears || []);
  }, [appSettings?.schoolProfile, appSettings?.academicYears, appSettings?.logoUrl, appSettings?.logoMobileUrl, appSettings?.logoWebUrl]);

  const handleSaveProfile = async () => {
    setIsSaving(true);
    try {
      const updatedSettings = { 
        ...appSettings, 
        schoolProfile: profile, 
        logoUrl: logoPreview,
        logoMobileUrl: logoMobilePreview,
        logoWebUrl: logoWebPreview
      };
      setAppSettings(updatedSettings);
      await onSave({ appSettings: updatedSettings });
      showToast('Profil sekolah berhasil disimpan!');
    } catch { showToast('Gagal menyimpan profil.','error'); }
    setIsSaving(false);
  };

  const handleLogoChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    compressImage(file, { maxWidth: 500, maxHeight: 500, quality: 0.8 }).then(dataUrl => {
      setLogoPreview(dataUrl);
      setProfile(prev => ({ ...prev, logo_url: dataUrl }));
      const updatedSettings = { ...appSettings, logoUrl: dataUrl };
      setAppSettings(updatedSettings);
      onSave({ appSettings: updatedSettings });
    });
  };

  const handleLogoMobileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    compressImage(file, { maxWidth: 500, maxHeight: 500, quality: 0.8 }).then(dataUrl => {
      setLogoMobilePreview(dataUrl);
      const updatedSettings = { ...appSettings, logoMobileUrl: dataUrl };
      setAppSettings(updatedSettings);
      onSave({ appSettings: updatedSettings });
    });
  };

  const handleLogoWebChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    compressImage(file, { maxWidth: 500, maxHeight: 500, quality: 0.8 }).then(dataUrl => {
      setLogoWebPreview(dataUrl);
      const updatedSettings = { ...appSettings, logoWebUrl: dataUrl };
      setAppSettings(updatedSettings);
      onSave({ appSettings: updatedSettings });
    });
  };

  const handleSaveYear = async () => {
    if (!yearForm.nama.trim()) return showToast('Nama tahun ajaran wajib diisi.','error');
    try {
      let currentYears = [...(appSettings.academicYears || [])];
      
      if (editingYear) {
        currentYears = currentYears.map(y => y.id === editingYear.id ? { ...y, ...yearForm } : y);
      } else {
        const newYear = { ...yearForm, id: Date.now(), is_active: currentYears.length === 0 };
        currentYears.push(newYear);
      }
      
      const updatedSettings = { ...appSettings, academicYears: currentYears };
      setAppSettings(updatedSettings);
      await onSave({ appSettings: updatedSettings });
      
      showToast(editingYear ?'Tahun Ajaran diperbarui!' :'Tahun Ajaran ditambahkan!');
      setShowYearModal(false);
    } catch { showToast('Gagal menyimpan tahun ajaran.','error'); }
  };

  const handleSetActive = async (id) => {
    try {
      let currentYears = [...(appSettings.academicYears || [])];
      currentYears = currentYears.map(y => ({ ...y, is_active: y.id === id }));
      
      const updatedSettings = { ...appSettings, academicYears: currentYears };
      setAppSettings(updatedSettings);
      await onSave({ appSettings: updatedSettings });
      
      showToast('Tahun Ajaran aktif diperbarui!');
    } catch { showToast('Gagal mengatur status aktif.','error'); }
  };

  const handleDeleteYear = async (id) => {
    if (!await window.confirmAsync('Hapus tahun ajaran ini?')) return;
    try {
      let currentYears = [...(appSettings.academicYears || [])];
      currentYears = currentYears.filter(y => y.id !== id);
      
      const updatedSettings = { ...appSettings, academicYears: currentYears };
      setAppSettings(updatedSettings);
      await onSave({ appSettings: updatedSettings });
      
      showToast('Tahun Ajaran dihapus!');
    } catch { showToast('Gagal menghapus.','error'); }
  };

  const openAddYear = () => {
    setEditingYear(null);
    setYearForm({ nama:'', semester:'Ganjil', tanggal_mulai:'', tanggal_selesai:'' });
    setShowYearModal(true);
  };

  const openEditYear = (year) => {
    setEditingYear(year);
    setYearForm({
      nama: year.nama,
      semester: year.semester,
      tanggal_mulai: year.tanggal_mulai ? year.tanggal_mulai.split('T')[0] :'',
      tanggal_selesai: year.tanggal_selesai ? year.tanggal_selesai.split('T')[0] :'',
    });
    setShowYearModal(true);
  };

  const activeYear = academicYears.find(y => y.is_active);

  const tabs = [
    { id:'profil', label:'Profil Sekolah' }, 
    { id:'tahun', label:'Tahun Ajaran' },
    { id:'kop', label:'Kop Surat' }
  ];

  return (
    <div className="space-y-4 relative animate-in fade-in duration-300">
      {/* Header */}
      <PageHeader
        title="Profil Sekolah & Tahun Ajaran"
        icon={School}
        description="Kelola identitas sekolah, logo, dan manajemen tahun ajaran."
        tabs={tabs}
        activeTab={activeTab}
        onTabChange={setActiveTab}
      />
      {activeYear && (
        <div className="flex justify-end mb-4">
          <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 text-emerald-700 px-4 py-2 rounded-[var(--ui-radius-small)] text-sm font-semibold shadow-sm w-fit">
            <Star size={14} className="fill-emerald-500 text-emerald-500" />
            TA Aktif: {activeYear.nama} {activeYear.semester}
          </div>
        </div>
      )}

      {/* PROFIL TAB */}
      {activeTab ==='profil' && (
        <div className="ui-card p-6 space-y-6">
          {/* Logo Section */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pb-6 border-b border-slate-100">
            {/* 1. Logo Umum */}
            <div className="flex flex-col items-center text-center p-4 bg-slate-50/50 rounded-[var(--ui-radius-small)] border border-slate-150">
              <div className="w-20 h-20 rounded-[var(--ui-radius-small)] border border-slate-200 flex items-center justify-center overflow-hidden bg-white shrink-0 mb-3">
                {logoPreview ? <img src={logoPreview} alt="Logo Umum" className="w-full h-full object-contain" /> :
                  <School className="text-slate-300" size={32} />}
              </div>
              <p className="font-bold text-slate-700 text-xs mb-0.5">Logo Umum (Kartu/Laporan)</p>
              <p className="text-[10px] text-slate-400 mb-3 max-w-[180px]">Digunakan pada Kartu Pelajar, Kop Surat, dan dokumen cetak.</p>
              <input type="file" accept="image/*" ref={logoInputRef} onChange={handleLogoChange} className="hidden" />
              <Button variant="outline" onClick={() =>logoInputRef.current?.click()} className="flex items-center gap-1.5 cursor-pointer">
                <Upload size={12} /> Upload Logo</Button>
            </div>

            {/* 2. Logo Mobile */}
            <div className="flex flex-col items-center text-center p-4 bg-slate-50/50 rounded-[var(--ui-radius-small)] border border-slate-150">
              <div className="w-20 h-20 rounded-[var(--ui-radius-small)] border border-slate-200 flex items-center justify-center overflow-hidden bg-white shrink-0 mb-3">
                {logoMobilePreview ? <img src={logoMobilePreview} alt="Logo Mobile" className="w-full h-full object-contain" /> :
                  <MonitorSmartphone className="text-slate-350" size={32} />}
              </div>
              <p className="font-bold text-slate-700 text-xs mb-0.5">Logo Mobile (Landing Page)</p>
              <p className="text-[10px] text-slate-400 mb-3 max-w-[180px]">Digunakan pada header Landing Page Mobile sekolah.</p>
              <input type="file" accept="image/*" ref={logoMobileInputRef} onChange={handleLogoMobileChange} className="hidden" />
              <Button variant="outline" onClick={() =>logoMobileInputRef.current?.click()} className="flex items-center gap-1.5 cursor-pointer">
                <Upload size={12} /> Upload Logo</Button>
            </div>

            {/* 3. Logo Website */}
            <div className="flex flex-col items-center text-center p-4 bg-slate-50/50 rounded-[var(--ui-radius-small)] border border-slate-150">
              <div className="w-20 h-20 rounded-[var(--ui-radius-small)] border border-slate-200 flex items-center justify-center overflow-hidden bg-white shrink-0 mb-3">
                {logoWebPreview ? <img src={logoWebPreview} alt="Logo Website" className="w-full h-full object-contain" /> :
                  <Globe className="text-slate-355" size={32} />}
              </div>
              <p className="font-bold text-slate-700 text-xs mb-0.5">Logo Website (Desktop)</p>
              <p className="text-[10px] text-slate-400 mb-3 max-w-[180px]">Digunakan pada header panel Dashboard & Sidebar Web Admin.</p>
              <input type="file" accept="image/*" ref={logoWebInputRef} onChange={handleLogoWebChange} className="hidden" />
              <Button variant="outline" onClick={() =>logoWebInputRef.current?.click()} className="flex items-center gap-1.5 cursor-pointer">
                <Upload size={12} /> Upload Logo</Button>
            </div>
          </div>

          {/* Fields */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {SCHOOL_FIELDS.map(field => (
              <div key={field.key} className={field.multiline ?'col-span-full' :''}>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">{field.label}</label>
                {field.multiline ? (
                  <textarea rows={3} value={profile[field.key] ||''} onChange={e => setProfile(prev => ({ ...prev, [field.key]: e.target.value }))}
                    placeholder={field.placeholder}
                    className="w-full px-3 py-2 bg-slate-50 border-none rounded-[var(--ui-radius-small)] text-sm font-medium focus:outline-none focus:border-[var(--ui-primary)] resize-none" />
                ) : (
                  <input type={field.type || 'text'} value={profile[field.key] ||''} onChange={e => setProfile(prev => ({ ...prev, [field.key]: e.target.value }))}
                    placeholder={field.placeholder}
                    className="w-full px-3 py-2 bg-slate-50 border-none rounded-[var(--ui-radius-small)] text-sm font-medium focus:outline-none focus:border-[var(--ui-primary)]" />
                )}
              </div>
            ))}
          </div>

          <div className="flex justify-end pt-4 border-t border-slate-100">
            <Button onClick={handleSaveProfile} disabled={isSaving} className="flex items-center gap-2">
              <Save size={14} /> {isSaving ?'Menyimpan...' :'Simpan Profil'}
            </Button>
          </div>
        </div>
      )}

      {/* TAHUN AJARAN TAB */}
      {activeTab ==='tahun' && (
        <div className="ui-card p-6 space-y-6">
          <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 border-b border-slate-100 pb-4">
            <div>
              <h2 className="text-sm font-black text-slate-800 uppercase tracking-widest">Manajemen Tahun Ajaran</h2>
              <p className="text-xs text-slate-500 mt-1">Kelola data tahun akademik aktif, semester ganjil/genap, dan rentang periode sekolah.</p>
            </div>
            <Button onClick={openAddYear} className="flex items-center gap-2 sm:self-center">
              <Plus size={14} /> Tambah Tahun Ajaran
            </Button>
          </div>
          <div className="overflow-x-auto border border-slate-150 rounded-[var(--ui-radius-small)]">
            <table className="w-full text-sm">
              <thead className="text-xs text-slate-500 uppercase bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-6 py-4 font-bold text-left">Tahun Ajaran</th>
                  <th className="px-6 py-4 font-bold text-left">Semester</th>
                  <th className="px-6 py-4 font-bold text-left">Periode</th>
                  <th className="px-6 py-4 font-bold text-center">Status</th>
                  <th className="px-6 py-4 font-bold text-right">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {academicYears.length === 0 ? (
                  <tr><td colSpan={5} className="px-6 py-8 text-center text-slate-400">Belum ada tahun ajaran. Tambahkan yang pertama!</td></tr>
                ) : academicYears.map(year => (
                  <tr key={year.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 font-bold text-slate-800">{year.nama}</td>
                    <td className="px-6 py-4 text-slate-600">{year.semester}</td>
                    <td className="px-6 py-4 text-slate-500 text-xs">
                      {year.tanggal_mulai ? new Date(year.tanggal_mulai).toLocaleDateString('id-ID', { day:'2-digit', month:'short', year:'numeric' }) :'-'}
                      {' →'}
                      {year.tanggal_selesai ? new Date(year.tanggal_selesai).toLocaleDateString('id-ID', { day:'2-digit', month:'short', year:'numeric' }) :'-'}
                    </td>
                    <td className="px-6 py-4 text-center">
                      {year.is_active ? (
                        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-[var(--ui-radius-small)] text-xs font-bold bg-emerald-100 text-emerald-700">
                          <Star size={10} className="fill-emerald-600 text-emerald-600" /> Aktif
                        </span>
                      ) : (
                        <Button variant="outline" onClick={() =>handleSetActive(year.id)}
                          >
                          Set Aktif</Button>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex justify-end gap-2">
                        <Button variant="outline" onClick={() =>openEditYear(year)} ><Edit2 size={14} /></Button>
                        <Button variant="outline" onClick={() =>handleDeleteYear(year.id)} ><Trash2 size={14} /></Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* KOP SURAT TAB */}
      {activeTab ==='kop' && (
        <div className="ui-card p-6 space-y-6 animate-in fade-in duration-300">
          <div className="flex justify-between items-center border-b border-slate-100 pb-3 mb-4">
            <h2 className="text-sm font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
              <Printer size={18} className="text-slate-400" /> Kop Surat Resmi (Untuk Cetak)
            </h2>
            <div className="flex items-center gap-2">
              <label className="flex items-center gap-2.5 cursor-pointer bg-slate-50 border-none px-3.5 py-1.5 rounded-[var(--ui-radius-small)] hover:bg-slate-100/50 transition-colors">
                <input
                  type="checkbox"
                  checked={!!appSettings.useKopSuratGambar}
                  onChange={(e) => setAppSettings({ ...appSettings, useKopSuratGambar: e.target.checked })}
                  className="rounded-[var(--ui-radius-small)] text-[var(--ui-primary)] focus:ring-[var(--ui-primary)] cursor-pointer"
                />
                <span className="text-xs font-black text-slate-700 cursor-pointer">Gunakan File Gambar Kop Surat Utuh</span>
              </label>
            </div>
          </div>
          
          {appSettings.useKopSuratGambar ? (
            <div className="bg-slate-50/50 border-none rounded-[var(--ui-radius-small)] p-6 flex flex-col md:flex-row gap-6 items-center">
              <div className="w-full md:w-[480px] h-32 rounded-[var(--ui-radius-small)] border-2 border-dashed border-slate-300 flex items-center justify-center overflow-hidden bg-white shrink-0 shadow-sm">
                {appSettings.kopSuratGambar ? (
                  <img src={appSettings.kopSuratGambar} alt="Gambar Kop Surat" className="w-full h-full object-contain p-1" />
                ) : (
                  <ImageIcon className="text-slate-300" size={32} />
                )}
              </div>
              <div className="flex-1 flex flex-col gap-3">
                <h4 className="text-sm font-black text-slate-800">Unggah Gambar Kop Surat Utuh</h4>
                <p className="text-xs text-slate-500 font-medium leading-relaxed">
                  Format gambar yang disarankan adalah PNG/JPG dengan rasio mendatar/lebar (landscape) yang proporsional untuk menggantikan seluruh teks Kop Surat di bagian atas cetak.
                </p>
                <div className="flex flex-wrap items-center gap-3 mt-2">
                  <input 
                    type="file" 
                    accept="image/*" 
                    onChange={(e) => {
                      const file = e.target.files[0];
                      if (file) {
                        compressImage(file, { maxWidth: 1000, maxHeight: 500, quality: 0.8 }).then(compressedBase64 => {
                          setAppSettings({ ...appSettings, kopSuratGambar: compressedBase64 });
                        });
                      }
                    }}
                    className="text-xs file:mr-3 file:py-1.5 file:px-4 file:rounded-[var(--ui-radius-small)] file:border-0 file:font-semibold file:bg-[var(--ui-primary)] file:text-white hover:file:opacity-90 cursor-pointer"
                  />
                  {appSettings.kopSuratGambar && (
                    <Button variant="outline" 
                      type="button" 
                      onClick={() =>setAppSettings({ ...appSettings, kopSuratGambar:"" })} 
                    >
                      Hapus Gambar Kop</Button>
                  )}
                </div>
                <div className="pt-4 mt-2 border-t border-slate-200">
                  <Button variant="outline" onClick={() =>onSave({ appSettings })} className="w-full md:w-auto flex items-center gap-2">
                    <Save size={14} /> Simpan Gambar Kop Surat</Button>
                </div>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 animate-in fade-in duration-300">
              <div className="space-y-5">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Logo Kop Surat</label>
                  <div className="flex gap-4 items-center">
                    <div className="w-20 h-20 rounded-[var(--ui-radius-small)] border-2 border-dashed border-slate-300 flex items-center justify-center overflow-hidden bg-slate-50 shrink-0">
                      {appSettings.kopSuratLogo ? (
                        <img src={appSettings.kopSuratLogo} alt="Logo Kop" className="w-full h-full object-contain p-1" />
                      ) : (
                        <ImageIcon className="text-slate-300" size={24} />
                      )}
                    </div>
                    <div className="flex flex-col gap-2">
                      <input 
                        type="file" 
                        accept="image/*" 
                        onChange={(e) => {
                          const file = e.target.files[0];
                          if (file) {
                            compressImage(file, { maxWidth: 500, maxHeight: 500, quality: 0.8 }).then(compressedBase64 => {
                              setAppSettings({ ...appSettings, kopSuratLogo: compressedBase64 });
                            });
                          }
                        }}
                        className="text-xs file:mr-3 file:py-1.5 file:px-4 file:rounded-[var(--ui-radius-small)] file:border-0 file:font-semibold file:bg-[var(--ui-primary)] file:text-white hover:file:opacity-90 cursor-pointer"
                      />
                      {appSettings.kopSuratLogo && (
                        <Button variant="outline" 
                          type="button" 
                          onClick={() =>setAppSettings({ ...appSettings, kopSuratLogo:"" })} 
                        >
                          Hapus Logo Khusus</Button>
                      )}
                      <p className="text-[10px] text-slate-400 max-w-[200px] leading-tight">Gunakan logo ini khusus untuk kop surat. Jika kosong, akan menggunakan logo sekolah utama.</p>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Baris 1 (Pemerintah)</label>
                  <input type="text" value={appSettings.kopSuratBaris1 ||""} onChange={(e) => setAppSettings({ ...appSettings, kopSuratBaris1: e.target.value })} placeholder="Pemerintah Provinsi Jawa Barat" className="w-full px-3 py-2 bg-slate-50 border-none rounded-[var(--ui-radius-small)] text-sm font-medium focus:outline-none focus:border-[var(--ui-primary)]" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Baris 2 (Instansi/Dinas)</label>
                  <input type="text" value={appSettings.kopSuratBaris2 ||""} onChange={(e) => setAppSettings({ ...appSettings, kopSuratBaris2: e.target.value })} placeholder="Dinas Pendidikan" className="w-full px-3 py-2 bg-slate-50 border-none rounded-[var(--ui-radius-small)] text-sm font-medium focus:outline-none focus:border-[var(--ui-primary)]" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Baris 3 (Nama Sekolah)</label>
                  <input type="text" value={appSettings.kopSuratBaris3 ||""} onChange={(e) => setAppSettings({ ...appSettings, kopSuratBaris3: e.target.value })} placeholder="SMK NEGERI 1 INKSCOD" className="w-full px-3 py-2 bg-slate-50 border-none rounded-[var(--ui-radius-small)] text-sm font-bold focus:outline-none focus:border-[var(--ui-primary)] text-[var(--ui-primary)]" />
                </div>
              </div>

              <div className="space-y-5">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Alamat Lengkap</label>
                  <textarea rows={3} value={appSettings.kopSuratAlamat ||""} onChange={(e) => setAppSettings({ ...appSettings, kopSuratAlamat: e.target.value })} placeholder="Jl. Pendidikan No. 123..." className="w-full px-3 py-2 bg-slate-50 border-none rounded-[var(--ui-radius-small)] text-sm font-medium focus:outline-none focus:border-[var(--ui-primary)] resize-none" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Kontak (Telp/Email/Web)</label>
                  <textarea rows={2} value={appSettings.kopSuratKontak ||""} onChange={(e) => setAppSettings({ ...appSettings, kopSuratKontak: e.target.value })} placeholder="Telp: (022) 1234567 | Email: info@..." className="w-full px-3 py-2 bg-slate-50 border-none rounded-[var(--ui-radius-small)] text-sm font-medium focus:outline-none focus:border-[var(--ui-primary)] resize-none" />
                </div>
                
                <div className="mt-6 pt-4 border-t border-slate-100">
                  <p className="text-xs text-slate-500 mb-4 bg-blue-50 text-blue-700 p-3 rounded-[var(--ui-radius-small)] border border-blue-100">Pratinjau kop surat akan terlihat pada dokumen cetak jadwal, absen, dan laporan.</p>
                  <Button variant="outline" onClick={() =>onSave({ appSettings })} className="w-full flex items-center justify-center gap-2">
                    <Save size={16} /> Simpan Format Kop Surat</Button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Year Modal */}
      {showYearModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white rounded-[var(--ui-radius-small)] shadow-sm w-full max-w-md overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <h3 className="font-bold text-slate-800">{editingYear ?'Edit Tahun Ajaran' :'Tambah Tahun Ajaran'}</h3>
              <Button variant="outline" onClick={() =>setShowYearModal(false)} ><X size={20} /></Button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Nama Tahun Ajaran</label>
                <input type="text" value={yearForm.nama} onChange={e => setYearForm(p => ({ ...p, nama: e.target.value }))}
                  placeholder="2025/2026"
                  className="w-full px-3 py-2 bg-slate-50 border-none rounded-[var(--ui-radius-small)] text-sm font-semibold focus:outline-none focus:border-[var(--ui-primary)]" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Semester</label>
                <UISelect value={yearForm.semester} onChange={e => setYearForm(p => ({ ...p, semester: e.target.value }))}
                  className="w-full px-3 py-2 bg-slate-50 border-none rounded-[var(--ui-radius-small)] text-sm font-semibold focus:outline-none focus:border-[var(--ui-primary)]">
                  <option value="Ganjil">Ganjil</option>
                  <option value="Genap">Genap</option>
                </UISelect>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Tanggal Mulai</label>
                  <input type="date" value={yearForm.tanggal_mulai} onChange={e => setYearForm(p => ({ ...p, tanggal_mulai: e.target.value }))}
                    className="w-full px-3 py-2 bg-slate-50 border-none rounded-[var(--ui-radius-small)] text-sm font-semibold focus:outline-none focus:border-[var(--ui-primary)]" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Tanggal Selesai</label>
                  <input type="date" value={yearForm.tanggal_selesai} onChange={e => setYearForm(p => ({ ...p, tanggal_selesai: e.target.value }))}
                    className="w-full px-3 py-2 bg-slate-50 border-none rounded-[var(--ui-radius-small)] text-sm font-semibold focus:outline-none focus:border-[var(--ui-primary)]" />
                </div>
              </div>
              <div className="pt-4 flex justify-end gap-3">
                <Button variant="outline" type="button" onClick={() =>setShowYearModal(false)}>Batal</Button>
                <Button onClick={handleSaveYear} >Simpan</Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div className={`fixed bottom-6 right-6 px-4 py-3 rounded-[var(--ui-radius-small)] shadow-sm font-medium text-sm flex items-center gap-2 animate-in slide-in-from-bottom-5 text-white ${toast.type ==='error' ?'bg-red-600' :'bg-emerald-600'}`}>
          {toast.type ==='error' ? <AlertCircle size={18} /> : <CheckCircle2 size={18} />} {toast.message}
        </div>
      )}
    </div>
  );
}
