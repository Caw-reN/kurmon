import { Button, UISelect } from '../../../components/ui.jsx';
import React from'react';
import { MonitorSmartphone, LayoutTemplate, Palette, GraduationCap, Building2, Grid, Settings, LayoutDashboard, MessageSquare, KeyRound, DatabaseBackup, Navigation, Plus, Link2, ExternalLink, Globe, HelpCircle, Eye, EyeOff, Layers, Check } from'lucide-react';
import { compressImage } from'../../../utils/imageUtils.js';
import { applyDocumentBranding } from '../../../utils/branding.js';
import { Save, RotateCcw, ImageIcon, Send, Trash2, CheckCircle2, ShieldCheck, AlertTriangle } from'lucide-react';
import { PageHeader } from '../../../components/monitoring/ui/index.js';
import { getMajorAbbreviation } from '../../../utils/constants.js';


const Instagram = ({ size = 16, className ="", style = {} }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    style={style}
  >
    <rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect>
    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path>
    <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line>
  </svg>
);

const Facebook = ({ size = 16, className ="", style = {} }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="currentColor"
    className={className}
    style={style}
  >
    <path d="M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.879V14.89h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.989C18.343 21.129 22 16.99 22 12z" />
  </svg>
);

const Youtube = ({ size = 16, className ="", style = {} }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    style={style}
  >
    <path d="M22.54 6.42a2.78 2.78 0 0 0-1.94-2C18.88 4 12 4 12 4s-6.88 0-8.6.46a2.78 2.78 0 0 0-1.94 2A29 29 0 0 0 1 11.75a29 29 0 0 0 .46 5.33 2.78 2.78 0 0 0 1.94 2c1.72.46 8.6.46 8.6.46s6.88 0 8.6-.46a2.78 2.78 0 0 0 1.94-2 29 29 0 0 0 .46-5.33 29 29 0 0 0-.46-5.33z"></path>
    <polygon points="9.75 15.02 15.5 11.75 9.75 8.48 9.75 15.02"></polygon>
  </svg>
);

export default function TabTampilan(props) {
  const { activeTab, setActiveTab, tampilanTab, setTampilanTab, uiTheme, setUiTheme, resetToDefaultTheme, saveDatabaseNow, isSavingModal, setIsSavingModal, showNotification, appSettings: globalAppSettings, setAppSettings: globalSetAppSettings, MAJOR_ICON_OPTIONS, THEME_PRESETS, applyThemePreset: parentApplyThemePreset, applyAutoRecommendedTheme: parentApplyAutoRecommendedTheme, contrastRatio, autoFixContrast: parentAutoFixContrast, newPresetName, setNewPresetName, saveCurrentAsPreset: parentSaveCurrentAsPreset, customThemePresets, setCustomThemePresets, resetThemeDefaults: parentResetThemeDefaults, exportThemeJson: parentExportThemeJson, importThemeJson: parentImportThemeJson } = props;

  const [appSettings, setAppSettings] = React.useState(() => ({
    ...globalAppSettings,
    heroTitleColor: globalAppSettings.heroTitleColor ||"#1e293b",
    heroSubtitleColor: globalAppSettings.heroSubtitleColor ||"#64748b",
    heroHighlightColor: globalAppSettings.heroHighlightColor || globalAppSettings.primaryColor ||"#00bfa5",
  }));



  // Set status preview aktif hanya pada saat komponen mount/unmount
  React.useEffect(() => {
    window.__THEME_PREVIEW_ACTIVE__ = true;
    return () => {
      window.__THEME_PREVIEW_ACTIVE__ = false;
      window.__THEME_PREVIEW_SETTINGS__ = null;
      applyDocumentBranding(globalAppSettings);
    };
  }, []);

  // Update preview secara live setiap kali appSettings berubah
  React.useEffect(() => {
    if (appSettings) {
      window.__THEME_PREVIEW_SETTINGS__ = appSettings;
      applyDocumentBranding(appSettings);
    }
  }, [appSettings]);

  const applyThemePreset = (preset) => {
    setAppSettings(prev => ({
      ...prev,
      primaryColor: preset.primaryColor,
      accentColor: preset.accentColor,
      primaryButtonColor: preset.primaryButtonColor,
      actionButtonColor: preset.actionButtonColor,
      bgColor: preset.bgColor,
      surfaceColor: preset.surfaceColor,
      textColor: preset.textColor
    }));
    showNotification(`Tema"${preset.name}" diterapkan secara lokal. Klik"Simpan Perubahan" untuk menyimpan.`,"success");
  };

  const applyAutoRecommendedTheme = () => {
    const hour = new Date().getHours();
    const preset = THEME_PRESETS[hour < 12 ? 0 : 1];
    applyThemePreset(preset);
  };

  const autoFixContrast = () => {
    const bg = appSettings.bgColor ||"#f8fafc";
    const surface = appSettings.surfaceColor ||"#ffffff";
    const black ="#0f172a";
    const white ="#ffffff";
    const bestForBg = contrastRatio(black, bg) >= contrastRatio(white, bg) ? black : white;
    const bestForSurface = contrastRatio(black, surface) >= contrastRatio(white, surface) ? black : white;
    const nextText = contrastRatio(bestForBg, bg) >= contrastRatio(bestForSurface, surface) ? bestForBg : bestForSurface;
    setAppSettings(prev => ({
      ...prev,
      textColor: nextText
    }));
    showNotification(`Auto-fix kontras diterapkan (${nextText}). Klik"Simpan Perubahan" untuk menyimpan.`,"success");
  };

  const applySafeColors = () => {
    setAppSettings(prev => ({
      ...prev,
      primaryColor: "#064e3b",
      accentColor: "#f59e0b",
      primaryButtonColor: "#064e3b",
      actionButtonColor: "#f59e0b",
      bgColor: "#eef2f7",
      surfaceColor: "#ffffff",
      textColor: "#0f172a",
      cardTextColor: "#0f172a",
    }));
    showNotification("Warna berhasil dikembalikan ke Setelan Aman & Standar (Clean Enterprise).", "success");
  };

  const resetThemeDefaults = () => {
    setAppSettings(prev => ({
      ...prev,
      logoText:"TS",
      primaryColor:"#064e3b",
      accentColor:"#a3e635",
      primaryButtonColor:"#064e3b",
      actionButtonColor:"#a3e635",
      bgColor:"#eef2f7",
      surfaceColor:"#ffffff",
      textColor:"#0f172a",
      cardTextColor:"#0f172a",
      fontFamily:"Lexend"
    }));
    showNotification("Tema dikembalikan ke default secara lokal. Klik \"Simpan Perubahan\" untuk menyimpan.","success");
  };

  const saveCurrentAsPreset = () => {
    const name = (newPresetName ||"").trim();
    if (!name) {
      showNotification("Isi nama preset terlebih dahulu.","warning");
      return;
    }
    const preset = {
      name,
      primaryColor: appSettings.primaryColor,
      accentColor: appSettings.accentColor,
      primaryButtonColor: appSettings.primaryButtonColor,
      actionButtonColor: appSettings.actionButtonColor,
      bgColor: appSettings.bgColor,
      surfaceColor: appSettings.surfaceColor,
      textColor: appSettings.textColor
    };
    const next = [...customThemePresets.filter(p => p.name !== name), preset];
    setCustomThemePresets(next);
    setNewPresetName("");
    showNotification(`Preset"${name}" disimpan secara lokal.`,"success");
  };

  const exportThemeJson = () => {
    const payload = {
      primaryColor: appSettings.primaryColor,
      accentColor: appSettings.accentColor,
      primaryButtonColor: appSettings.primaryButtonColor,
      actionButtonColor: appSettings.actionButtonColor,
      bgColor: appSettings.bgColor,
      surfaceColor: appSettings.surfaceColor,
      textColor: appSettings.textColor,
      fontFamily: appSettings.fontFamily ||"Lexend"
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type:"application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download ="kurmon_theme.json";
    a.click();
    URL.revokeObjectURL(url);
  };

  const importThemeJson = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = JSON.parse(evt.target.result);
        setAppSettings(prev => ({
          ...prev,
          ...data
        }));
        showNotification("Tema berhasil di-import secara lokal. Klik \"Simpan Perubahan\" untuk menyimpan.","success");
      } catch (err) {
        showNotification("File JSON tidak valid.","error");
      }
    };
    reader.readAsText(file);
  };

  const [navbarPreviewLang, setNavbarPreviewLang] = React.useState('ID');

  const resetNavbarDefaults = () => {
    if (!window.confirm("Kembalikan pengaturan menu navbar ke konfigurasi standar?")) return;
    setAppSettings(prev => ({
      ...prev,
      navbarShowLayanan: true,
      navbarLabelLayanan: "Layanan",
      navbarLabelLayananEn: "Services",
      navbarTypeLayanan: "scroll",
      navbarTargetLayanan: "#layanan-akademik",

      navbarShowAksesAkun: true,
      navbarLabelAksesAkun: "Akses Akun",
      navbarLabelAksesAkunEn: "Account Access",
      navbarTypeAksesAkun: "scroll",
      navbarTargetAksesAkun: "#akses-akun",

      navbarShowBantuan: true,
      navbarLabelBantuan: "Bantuan",
      navbarLabelBantuanEn: "Help",
      navbarTypeBantuan: "modal_bantuan",
      navbarTargetBantuan: "modal_bantuan",

      navbarCustomMenus: [],
      navbarShowLoginButton: true,
      navbarLoginButtonText: "Masuk Akun",
      navbarLoginButtonTextEn: "Sign In",
      navbarShowLanguageSwitch: true,
    }));
    showNotification("Pengaturan menu navbar berhasil direset ke standar. Klik 'Simpan Perubahan' untuk menyimpan.", "success");
  };

  const handleAddCustomMenu = (preset = null) => {
    const newId = `menu_${Date.now()}`;
    const newItem = preset || {
      id: newId,
      label: "Menu Baru",
      labelEn: "New Menu",
      type: "route",
      target: "/prestasi",
      isVisible: true,
      openInNewTab: false
    };
    const current = Array.isArray(appSettings.navbarCustomMenus) ? [...appSettings.navbarCustomMenus] : [];
    setAppSettings(prev => ({
      ...prev,
      navbarCustomMenus: [...current, { ...newItem, id: newId }]
    }));
    showNotification("Menu kustom berhasil ditambahkan. Silakan lengkapi label dan tujuannya.", "info");
  };

  const handleUpdateCustomMenu = (id, key, value) => {
    const current = Array.isArray(appSettings.navbarCustomMenus) ? [...appSettings.navbarCustomMenus] : [];
    const updated = current.map(item => item.id === id ? { ...item, [key]: value } : item);
    setAppSettings(prev => ({
      ...prev,
      navbarCustomMenus: updated
    }));
  };

  const handleDeleteCustomMenu = (id) => {
    const current = Array.isArray(appSettings.navbarCustomMenus) ? [...appSettings.navbarCustomMenus] : [];
    const updated = current.filter(item => item.id !== id);
    setAppSettings(prev => ({
      ...prev,
      navbarCustomMenus: updated
    }));
    showNotification("Menu kustom telah dihapus.", "info");
  };

  const handleAddFaqItem = () => {
    const defaultFaqs = [
      {
        q: "Bagaimana cara masuk ke sistem?",
        qEn: "How do I sign in to the portal?",
        a: "Klik tombol 'Masuk' di kanan atas halaman, lalu gunakan username dan password resmi yang diberikan sekolah.",
        aEn: "Click the 'Sign In' button at the top right, then use your official credentials provided by the school."
      },
      {
        q: "Lupa password atau tidak bisa login?",
        qEn: "Forgot password or unable to log in?",
        a: "Silakan hubungi administrator sekolah untuk melakukan reset password akun Anda.",
        aEn: "Please contact the school administrator to reset your account password."
      },
      {
        q: "Jadwal pelajaran atau presensi bermasalah?",
        qEn: "Schedule or attendance issue?",
        a: "Setiap pembaruan jadwal atau data kehadiran sinkron secara real-time. Hubungi waka kurikulum bila data kelas Anda membutuhkan penyesuaian.",
        aEn: "All schedule and attendance updates sync in real-time. Contact the academic curriculum team if your class data requires adjustment."
      }
    ];

    const currentFaqs = Array.isArray(appSettings.helpModalFaqs) && appSettings.helpModalFaqs.length > 0
      ? [...appSettings.helpModalFaqs]
      : [...defaultFaqs];

    setAppSettings(prev => ({
      ...prev,
      helpModalFaqs: [
        ...currentFaqs,
        {
          q: "Pertanyaan Baru",
          qEn: "New Question",
          a: "Tuliskan jawaban penjelasan di sini.",
          aEn: "Write answer details here."
        }
      ]
    }));
    showNotification("Pertanyaan FAQ baru ditambahkan. Klik 'Simpan Perubahan' setelah selesai.", "info");
  };

  const handleUpdateFaqItem = (index, field, value) => {
    const defaultFaqs = [
      {
        q: "Bagaimana cara masuk ke sistem?",
        qEn: "How do I sign in to the portal?",
        a: "Klik tombol 'Masuk' di kanan atas halaman, lalu gunakan username dan password resmi yang diberikan sekolah.",
        aEn: "Click the 'Sign In' button at the top right, then use your official credentials provided by the school."
      },
      {
        q: "Lupa password atau tidak bisa login?",
        qEn: "Forgot password or unable to log in?",
        a: "Silakan hubungi administrator sekolah untuk melakukan reset password akun Anda.",
        aEn: "Please contact the school administrator to reset your account password."
      },
      {
        q: "Jadwal pelajaran atau presensi bermasalah?",
        qEn: "Schedule or attendance issue?",
        a: "Setiap pembaruan jadwal atau data kehadiran sinkron secara real-time. Hubungi waka kurikulum bila data kelas Anda membutuhkan penyesuaian.",
        aEn: "All schedule and attendance updates sync in real-time. Contact the academic curriculum team if your class data requires adjustment."
      }
    ];
    const currentFaqs = Array.isArray(appSettings.helpModalFaqs) && appSettings.helpModalFaqs.length > 0
      ? [...appSettings.helpModalFaqs]
      : [...defaultFaqs];

    if (currentFaqs[index]) {
      currentFaqs[index] = { ...currentFaqs[index], [field]: value };
      setAppSettings(prev => ({ ...prev, helpModalFaqs: currentFaqs }));
    }
  };

  const handleDeleteFaqItem = (index) => {
    const currentFaqs = Array.isArray(appSettings.helpModalFaqs) ? [...appSettings.helpModalFaqs] : [];
    currentFaqs.splice(index, 1);
    setAppSettings(prev => ({ ...prev, helpModalFaqs: currentFaqs }));
    showNotification("Pertanyaan FAQ telah dihapus.", "info");
  };

  const handleResetFaqsToDefault = () => {
    if (!window.confirm("Kembalikan daftar pertanyaan & jawaban FAQ ke standar bawaan?")) return;
    setAppSettings(prev => ({
      ...prev,
      helpModalFaqs: [
        {
          q: "Bagaimana cara masuk ke sistem?",
          qEn: "How do I sign in to the portal?",
          a: "Klik tombol 'Masuk' di kanan atas halaman, lalu gunakan username dan password resmi yang diberikan sekolah.",
          aEn: "Click the 'Sign In' button at the top right, then use your official credentials provided by the school."
        },
        {
          q: "Lupa password atau tidak bisa login?",
          qEn: "Forgot password or unable to log in?",
          a: "Silakan hubungi administrator sekolah untuk melakukan reset password akun Anda.",
          aEn: "Please contact the school administrator to reset your account password."
        },
        {
          q: "Jadwal pelajaran atau presensi bermasalah?",
          qEn: "Schedule or attendance issue?",
          a: "Setiap pembaruan jadwal atau data kehadiran sinkron secara real-time. Hubungi waka kurikulum bila data kelas Anda membutuhkan penyesuaian.",
          aEn: "All schedule and attendance updates sync in real-time. Contact the academic curriculum team if your class data requires adjustment."
        }
      ]
    }));
    showNotification("FAQ berhasil dikembalikan ke standar bawaan.", "success");
  };

  return (
    <div className="w-full flex flex-col gap-4 animate-in fade-in duration-300 relative z-10">
            <PageHeader 
              title="Kustomisasi Tampilan Web"
              description="Personalisasi identitas, warna, dan informasi sekolah Anda."
              icon={MonitorSmartphone}
              tabs={[
                { id:"fitur", label:"Fitur", icon: Settings },
                { id:"tampilan", label:"Tampilan Web", icon: LayoutDashboard },
                { id:"whatsapp", label:"WhatsApp", icon: MessageSquare },
                { id:"api_keys", label:"API Key", icon: KeyRound },
                { id:"gdrive_backup", label:"Backup", icon: DatabaseBackup }
              ]}
              activeTab={activeTab}
              onTabChange={setActiveTab}
            />
            <div className="ui-card rounded-[var(--ui-radius-card)] bg-white border border-[var(--ui-card-border-color,transparent)] shadow-[var(--ui-card-shadow,var(--ui-shadow-card))] p-6 flex flex-col">
              <div className="space-y-6">
                {/* Horizontal Tabs & Action Button - Modernized */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-2 border-b border-slate-100">
                  <div className="flex flex-wrap gap-2 p-1.5 bg-slate-50 border-none rounded-[var(--ui-radius-small)] w-fit">
                    {[
                      { id:"umum", label:"Identitas Utama", icon: LayoutTemplate },
                      { id:"navbar", label:"Menu Navbar", icon: Navigation },
                      { id:"layanan", label:"Menu Layanan", icon: Grid },
                      { id:"footer", label:"Informasi Jurusan", icon: GraduationCap },
                      { id:"mitra", label:"Mitra Kerjasama", icon: Building2 },
                      { id:"tema", label:"Warna & Tema", icon: Palette },
                    ].map(tab => {
                      const Icon = tab.icon;
                      const isActive = tampilanTab === tab.id;
                      return (
                      <Button variant="outline"
                        key={tab.id}
                        type="button"
                        onClick={() =>setTampilanTab(tab.id)}
                        className={`flex items-center gap-2 ${isActive ?"bg-white text-[var(--ui-primary)] shadow-sm ring-1 ring-slate-200/50" :"text-slate-500 hover:text-slate-700 hover:bg-slate-100/50"}`}
                      >
                        <Icon size={15} className={isActive ?"text-[var(--ui-primary)]" :"text-slate-400"} />
                        {tab.label}</Button>
                    )})}
                  </div>
                  <Button variant="outline"
                    type="button"
                    disabled={isSavingModal}
                    onClick={async () =>{
                      try {
                        globalSetAppSettings(appSettings);
                        await saveDatabaseNow({ appSettings },"menyimpan tampilan web");
                        showNotification("Tampilan web berhasil diperbarui!","success");
                      } catch (error) {
                        showNotification(error?.message ||"Gagal menyimpan perubahan.","error");
                      }
                    }}
                    className="flex items-center gap-2 sm:self-center"
                  >
                    <Save size={16} /> Simpan Perubahan</Button>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                  {/* MAIN CONTENT AREA */}
                  <div className="lg:col-span-8 space-y-6">
                    {/* Identitas Brand */}
                    {tampilanTab ==="umum" && (
                      <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
                        <div className="border-none rounded-[var(--ui-radius-small)] p-5 bg-slate-50/50 space-y-4">
                          <div>
                            <p className="text-[11px] font-black text-slate-800 uppercase tracking-widest">Identitas Brand & Teks Utama</p>
                            <p className="text-[10px] font-bold text-slate-500 mt-0.5">Atur nama, logo, dan kalimat sapaan aplikasi.</p>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-12 gap-4">
                            <div className="sm:col-span-4">
                              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 mb-2 block">Nama Aplikasi</label>
                              <input type="text" value={appSettings.appName} onChange={(e) => setAppSettings({ ...appSettings, appName: e.target.value })} className="w-full border border-slate-200 bg-white p-2.5 rounded-[var(--ui-radius-control)] text-sm font-bold focus:outline-[var(--ui-primary)] shadow-xs" />
                            </div>
                            <div className="sm:col-span-3">
                              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 mb-2 block">Teks Tagline (Atas Logo)</label>
                              <input type="text" placeholder="PORTAL" value={appSettings.logoSmallText !== undefined ? appSettings.logoSmallText :"PORTAL"} onChange={(e) => setAppSettings({ ...appSettings, logoSmallText: e.target.value })} className="w-full border border-slate-200 bg-white p-2.5 rounded-[var(--ui-radius-control)] text-sm font-bold focus:outline-[var(--ui-primary)] shadow-xs" />
                            </div>
                            <div className="sm:col-span-3">
                              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 mb-2 block">Subjudul / Versi</label>
                              <input type="text" value={appSettings.appSubtitle ||""} placeholder="Contoh: v0.5.15" onChange={(e) => setAppSettings({ ...appSettings, appSubtitle: e.target.value })} className="w-full border border-slate-200 bg-white p-2.5 rounded-[var(--ui-radius-control)] text-sm font-bold focus:outline-[var(--ui-primary)] shadow-xs" />
                            </div>
                            <div className="sm:col-span-2">
                              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 mb-2 block">Logo Singkat</label>
                              <input type="text" maxLength={4} value={appSettings.logoText ||"TS"} onChange={(e) => setAppSettings({ ...appSettings, logoText: e.target.value.toUpperCase() })} className="w-full border border-slate-200 bg-white p-2.5 rounded-[var(--ui-radius-control)] text-sm font-bold focus:outline-[var(--ui-primary)] shadow-xs text-center" />
                            </div>
                          </div>
                          
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pt-1">
                            <div>
                              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 mb-2 block">Nama Tampilan Web (Browser Title)</label>
                              <input type="text" placeholder="Contoh: KG2 School | Jadwal & Denah" value={appSettings.siteTitle ||""} onChange={(e) => setAppSettings({ ...appSettings, siteTitle: e.target.value })} className="w-full border border-slate-200 bg-white p-2.5 rounded-[var(--ui-radius-control)] text-xs font-bold focus:outline-[var(--ui-primary)] shadow-xs" />
                            </div>
                            <div>
                              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 mb-2 block">Deskripsi Web (Meta Description)</label>
                              <textarea placeholder="Deskripsi ringkas website untuk pencarian Google / SEO..." value={appSettings.siteDescription ||""} onChange={(e) => setAppSettings({ ...appSettings, siteDescription: e.target.value })} className="w-full border border-slate-200 bg-white p-2.5 rounded-[var(--ui-radius-control)] text-xs font-bold focus:outline-[var(--ui-primary)] shadow-xs h-11 resize-none" />
                            </div>
                            <div>
                              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 mb-2 block">Ukuran Kertas Default (PDF/Cetak)</label>
                              <UISelect value={appSettings.defaultPaperSize ||"A4"} onChange={(e) => setAppSettings({ ...appSettings, defaultPaperSize: e.target.value })} className="w-full">
                                <option value="A4">A4 (Standar)</option>
                                <option value="F4">F4 (Folio/HVS)</option>
                              </UISelect>
                            </div>
                          </div>

                          <div className="rounded-[var(--ui-radius-small)] border-none bg-white p-4">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                              <div>
                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block">Icon Browser / Favicon</label>
                                <p className="text-[10px] font-bold text-slate-400 mt-1">Muncul di tab browser, bookmark, dan shortcut web. Disarankan PNG/SVG persegi.</p>
                              </div>
                              <div className="w-12 h-12 rounded-[var(--ui-radius-small)] border-none bg-slate-50 flex items-center justify-center overflow-hidden shrink-0">
                                {appSettings.faviconImage ? (
                                  <img src={appSettings.faviconImage} alt="Preview favicon" className="w-full h-full object-contain p-1.5" />
                                ) : (
                                  <span className="text-[11px] font-black text-[var(--ui-primary)]">{appSettings.logoText ||"TS"}</span>
                                )}
                              </div>
                            </div>
                            <div className="mt-3 flex gap-2">
                              <input
                                type="file"
                                accept="image/png,image/jpeg,image/svg+xml,image/webp,image/x-icon"
                                onChange={(e) => {
                                  const file = e.target.files?.[0];
                                  if (!file) return;
                                  if (file.size > 512 * 1024) {
                                    showNotification("Ukuran icon maksimal 512KB agar website tetap cepat.","error");
                                    return;
                                  }
                                  compressImage(file, { maxWidth: 256, maxHeight: 256, quality: 0.8 }).then(compressedBase64 => {
                                    setAppSettings({ ...appSettings, faviconImage: compressedBase64 });
                                  });
                                }}
                                className="flex-1 border-none bg-slate-50 p-2 rounded-[var(--ui-radius-small)] text-xs font-bold focus:outline-[var(--ui-primary)] shadow-sm file:mr-3 file:py-1.5 file:px-3 file:rounded-[var(--ui-radius-small)] file:border-0 file:text-[10px] file:font-black file:bg-[var(--ui-primary)] file:text-white file:cursor-pointer"
                              />
                              {appSettings.faviconImage && (
                                <Button variant="outline"
                                  type="button"
                                  onClick={() =>setAppSettings({ ...appSettings, faviconImage:"" })}
                                  
                                >
                                  Hapus</Button>
                              )}
                            </div>
                          </div>
                          {/* Pita Header Atas (Top Ribbon) */}
                          <div className="p-4 rounded-[var(--ui-radius-card)] bg-slate-50/80 border border-slate-200/80 flex flex-col gap-3">
                            <div>
                              <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider">
                                Pita Header Atas (Top Ribbon)
                              </h4>
                              <p className="text-[11px] text-slate-500 font-medium mt-0.5">Kustomisasi teks dan warna pada pita atas navbar publik.</p>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              <div>
                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 mb-1.5 block">Teks Sisi Kiri (Nama Sekolah / Instansi)</label>
                                <input 
                                  type="text" 
                                  placeholder="Default: Nama Sekolah" 
                                  value={appSettings.topRibbonLeftText || ""} 
                                  onChange={(e) => setAppSettings({ ...appSettings, topRibbonLeftText: e.target.value })} 
                                  className="w-full border border-slate-200 bg-white p-2.5 rounded-[var(--ui-radius-control)] text-xs font-bold focus:outline-[var(--ui-primary)] shadow-xs" 
                                />
                              </div>
                              <div>
                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 mb-1.5 block">Teks Sisi Kanan (Portal Layanan)</label>
                                <input 
                                  type="text" 
                                  placeholder="Default: Portal layanan akademik - [Nama Sekolah]" 
                                  value={appSettings.topRibbonRightText || ""} 
                                  onChange={(e) => setAppSettings({ ...appSettings, topRibbonRightText: e.target.value })} 
                                  className="w-full border border-slate-200 bg-white p-2.5 rounded-[var(--ui-radius-control)] text-xs font-bold focus:outline-[var(--ui-primary)] shadow-xs" 
                                />
                              </div>
                            </div>
                            <div>
                              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 mb-1.5 block">Warna Latar Pita Atas</label>
                              <div className="flex items-center gap-3">
                                <input 
                                  type="color" 
                                  value={appSettings.topRibbonColor || appSettings.primaryColor || "#153f32"} 
                                  onChange={(e) => setAppSettings({ ...appSettings, topRibbonColor: e.target.value })} 
                                  className="w-14 h-9 border border-slate-200 bg-white rounded-[var(--ui-radius-small)] cursor-pointer shadow-xs p-0.5" 
                                />
                                <span className="text-xs font-mono font-bold text-slate-600 uppercase">{appSettings.topRibbonColor || appSettings.primaryColor || "#153f32"}</span>
                              </div>
                            </div>
                          </div>

                          {/* Quick Shortcut to Menu Navbar Tab */}
                          <div className="p-3.5 rounded-[var(--ui-radius-card)] bg-emerald-50/70 border border-emerald-200/70 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-2xs">
                                <Navigation size={15} />
                              </div>
                              <div>
                                <h5 className="text-xs font-bold text-slate-800">Menu Navigasi Publik (Layanan, Akses Akun, Bantuan)</h5>
                                <p className="text-[11px] text-slate-500 font-medium">Kini dapat dikustomisasi secara terpisah: ubah nama, aksi tautan, atau sembunyikan menu.</p>
                              </div>
                            </div>
                            <Button 
                              variant="outline" 
                              type="button" 
                              onClick={() => setTampilanTab("navbar")}
                              className="text-xs font-bold text-emerald-800 bg-white hover:bg-emerald-100 border-emerald-300 shrink-0 self-start sm:self-auto cursor-pointer"
                            >
                              Buka Tab Menu Navbar
                            </Button>
                          </div>

                          <div>
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 mb-2 block">Teks Badge / Tag Portal Hero (Opsional)</label>
                            <input 
                              type="text" 
                              placeholder="Kosongkan jika ingin menghilangkan box badge ini" 
                              value={appSettings.heroBadgeText || ""} 
                              onChange={(e) => setAppSettings({ ...appSettings, heroBadgeText: e.target.value })} 
                              className="w-full border border-slate-200 bg-white p-2.5 rounded-[var(--ui-radius-control)] text-sm font-bold focus:outline-[var(--ui-primary)] shadow-xs" 
                            />
                            <p className="text-[11px] text-slate-400 mt-1 ml-1 font-medium">Teks tag kapsul di atas headline landing page. Jika dikosongkan, kotak badge akan dihilangkan sepenuhnya.</p>
                          </div>
                          <div>
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 mb-2 block">Headline Utama</label>
                            <input type="text" value={appSettings.heroTitle} onChange={(e) => setAppSettings({ ...appSettings, heroTitle: e.target.value })} className="w-full border border-slate-200 bg-white p-2.5 rounded-[var(--ui-radius-control)] text-sm font-bold focus:outline-[var(--ui-primary)] shadow-xs" />
                          </div>
                          <div>
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 mb-2 block">Subjudul Penjelasan</label>
                            <textarea value={appSettings.heroSubtitle} onChange={(e) => setAppSettings({ ...appSettings, heroSubtitle: e.target.value })} className="w-full border border-slate-200 bg-white p-2.5 rounded-[var(--ui-radius-control)] text-sm font-bold focus:outline-[var(--ui-primary)] shadow-xs h-24 resize-none"></textarea>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            <div>
                              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 mb-2 block">Warna Teks Headline</label>
                              <input type="color" value={appSettings.heroTitleColor ||"#1e293b"} onChange={(e) => setAppSettings({ ...appSettings, heroTitleColor: e.target.value })} className="w-full h-8 border border-slate-200 bg-white rounded-[var(--ui-radius-small)] cursor-pointer shadow-xs" />
                            </div>
                            <div>
                              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 mb-2 block">Warna Teks Subjudul</label>
                              <input type="color" value={appSettings.heroSubtitleColor ||"#64748b"} onChange={(e) => setAppSettings({ ...appSettings, heroSubtitleColor: e.target.value })} className="w-full h-8 border border-slate-200 bg-white rounded-[var(--ui-radius-small)] cursor-pointer shadow-xs" />
                            </div>
                            <div>
                              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 mb-2 block">Warna Garis Coretan</label>
                              <input type="color" value={appSettings.heroHighlightColor || appSettings.primaryColor ||"#00bfa5"} onChange={(e) => setAppSettings({ ...appSettings, heroHighlightColor: e.target.value })} className="w-full h-8 border border-slate-200 bg-white rounded-[var(--ui-radius-small)] cursor-pointer shadow-xs" />
                            </div>
                          </div>
                          <div>
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 mb-2 block">Gambar Landing Page</label>
                            <div className="flex gap-2">
                              <input 
                                type="file" 
                                accept="image/*" 
                                onChange={(e) => {
                                  const file = e.target.files?.[0];
                                  if (file) {
                                    if (file.size > 2 * 1024 * 1024) {
                                      showNotification("Ukuran gambar maksimal 2MB!","error");
                                      return;
                                    }
                                    if (file.type ==="image/svg+xml" || file.name.endsWith(".svg")) {
                                      const reader = new FileReader();
                                      reader.onload = (event) => {
                                        setAppSettings({ ...appSettings, heroImage: event.target.result });
                                      };
                                      reader.readAsDataURL(file);
                                    } else {
                                      compressImage(file, { maxWidth: 1200, maxHeight: 1200, quality: 0.8 }).then(compressedBase64 => {
                                        setAppSettings({ ...appSettings, heroImage: compressedBase64 });
                                      });
                                    }
                                  }
                                }} 
                                className="flex-1 border border-slate-200 bg-white p-2 rounded-[var(--ui-radius-control)] text-sm font-medium focus:outline-[var(--ui-primary)] shadow-xs file:mr-3 file:py-1.5 file:px-4 file:rounded-[var(--ui-radius-control)] file:border-0 file:text-xs file:font-bold file:bg-[var(--ui-primary)] file:text-white hover:file:opacity-90 file:cursor-pointer" 
                              />
                              {appSettings.heroImage && (
                                <Button variant="outline" 
                                  type="button" 
                                  onClick={() =>setAppSettings({ ...appSettings, heroImage:"" })} 
                                  
                                >
                                  Hapus</Button>
                              )}
                            </div>
                            {appSettings.heroImage && (
                              <div className="mt-3 p-2 border-none rounded-[var(--ui-radius-small)] bg-slate-50 inline-block">
                                <img src={appSettings.heroImage} alt="Preview Hero" className="h-24 object-contain rounded-[var(--ui-radius-small)]" />
                              </div>
                            )}
                          </div>
                          <div>
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 mb-2 block">Teks Deskripsi Footer</label>
                            <textarea value={appSettings.footerDescription ||""} onChange={(e) => setAppSettings({ ...appSettings, footerDescription: e.target.value })} className="w-full border border-slate-200 bg-white p-2.5 rounded-[var(--ui-radius-control)] text-sm font-bold focus:outline-[var(--ui-primary)] shadow-xs h-24 resize-none"></textarea>
                          </div>

                          <div className="p-4 sm:p-5 rounded-[var(--ui-radius-card)] bg-slate-50/80 border border-slate-200/80 space-y-4 shadow-2xs">
                            <div className="border-b border-slate-200/80 pb-2.5">
                              <h4 className="text-xs font-black uppercase tracking-wider text-slate-800">Pengaturan Kartu Akses Akun (Landing Page)</h4>
                              <p className="text-[11px] text-slate-500 font-medium mt-0.5">Kustomisasi seluruh teks pada kartu putih akses akun di samping hero headline.</p>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              <div>
                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 mb-1 block">Badge Kartu</label>
                                <input 
                                  type="text" 
                                  placeholder="Akses Akun" 
                                  value={appSettings.loginCardBadge || ""} 
                                  onChange={(e) => setAppSettings({ ...appSettings, loginCardBadge: e.target.value })} 
                                  className="w-full border border-slate-200 bg-white p-2 rounded-[var(--ui-radius-control)] text-xs font-bold focus:outline-[var(--ui-primary)] shadow-xs" 
                                />
                              </div>
                              <div>
                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 mb-1 block">Judul Sambutan Kartu</label>
                                <input 
                                  type="text" 
                                  placeholder="Selamat datang kembali." 
                                  value={appSettings.loginCardTitle || ""} 
                                  onChange={(e) => setAppSettings({ ...appSettings, loginCardTitle: e.target.value })} 
                                  className="w-full border border-slate-200 bg-white p-2 rounded-[var(--ui-radius-control)] text-xs font-bold focus:outline-[var(--ui-primary)] shadow-xs" 
                                />
                              </div>
                            </div>

                            <div>
                              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 mb-1 block">Subjudul Sambutan</label>
                              <input 
                                type="text" 
                                placeholder="Lanjutkan melalui akun sekolah yang sudah kamu miliki." 
                                value={appSettings.loginCardSubtitle || ""} 
                                onChange={(e) => setAppSettings({ ...appSettings, loginCardSubtitle: e.target.value })} 
                                className="w-full border border-slate-200 bg-white p-2 rounded-[var(--ui-radius-control)] text-xs font-bold focus:outline-[var(--ui-primary)] shadow-xs" 
                              />
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 border-t border-slate-200/60">
                              <div>
                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 mb-1 block">Peran 01 - Judul</label>
                                <input 
                                  type="text" 
                                  placeholder="Siswa" 
                                  value={appSettings.loginCardRole1Title || ""} 
                                  onChange={(e) => setAppSettings({ ...appSettings, loginCardRole1Title: e.target.value })} 
                                  className="w-full border border-slate-200 bg-white p-2 rounded-[var(--ui-radius-control)] text-xs font-bold focus:outline-[var(--ui-primary)] shadow-xs" 
                                />
                              </div>
                              <div>
                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 mb-1 block">Peran 01 - Keterangan</label>
                                <input 
                                  type="text" 
                                  placeholder="Akses kegiatan belajar dan layanan siswa." 
                                  value={appSettings.loginCardRole1Subtitle || ""} 
                                  onChange={(e) => setAppSettings({ ...appSettings, loginCardRole1Subtitle: e.target.value })} 
                                  className="w-full border border-slate-200 bg-white p-2 rounded-[var(--ui-radius-control)] text-xs font-bold focus:outline-[var(--ui-primary)] shadow-xs" 
                                />
                              </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              <div>
                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 mb-1 block">Peran 02 - Judul</label>
                                <input 
                                  type="text" 
                                  placeholder="Guru & tenaga kependidikan" 
                                  value={appSettings.loginCardRole2Title || ""} 
                                  onChange={(e) => setAppSettings({ ...appSettings, loginCardRole2Title: e.target.value })} 
                                  className="w-full border border-slate-200 bg-white p-2 rounded-[var(--ui-radius-control)] text-xs font-bold focus:outline-[var(--ui-primary)] shadow-xs" 
                                />
                              </div>
                              <div>
                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 mb-1 block">Peran 02 - Keterangan</label>
                                <input 
                                  type="text" 
                                  placeholder="Akses layanan sesuai kewenangan akun." 
                                  value={appSettings.loginCardRole2Subtitle || ""} 
                                  onChange={(e) => setAppSettings({ ...appSettings, loginCardRole2Subtitle: e.target.value })} 
                                  className="w-full border border-slate-200 bg-white p-2 rounded-[var(--ui-radius-control)] text-xs font-bold focus:outline-[var(--ui-primary)] shadow-xs" 
                                />
                              </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1 border-t border-slate-200/60">
                              <div>
                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 mb-1 block">Teks Tombol Masuk</label>
                                <input 
                                  type="text" 
                                  placeholder="Buka Portal & Masuk Akun" 
                                  value={appSettings.loginCardButtonText || ""} 
                                  onChange={(e) => setAppSettings({ ...appSettings, loginCardButtonText: e.target.value })} 
                                  className="w-full border border-slate-200 bg-white p-2 rounded-[var(--ui-radius-control)] text-xs font-bold focus:outline-[var(--ui-primary)] shadow-xs" 
                                />
                              </div>
                              <div>
                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 mb-1 block">Catatan Bawah Tombol</label>
                                <input 
                                  type="text" 
                                  placeholder="Proses masuk dilanjutkan di sistem akademik sekolah." 
                                  value={appSettings.loginCardFooterNote || ""} 
                                  onChange={(e) => setAppSettings({ ...appSettings, loginCardFooterNote: e.target.value })} 
                                  className="w-full border border-slate-200 bg-white p-2 rounded-[var(--ui-radius-control)] text-xs font-bold focus:outline-[var(--ui-primary)] shadow-xs" 
                                />
                              </div>
                              <div>
                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 mb-1 block">Teks Bantuan Akses</label>
                                <input 
                                  type="text" 
                                  placeholder="Butuh bantuan akses akun?" 
                                  value={appSettings.loginCardHelpText || ""} 
                                  onChange={(e) => setAppSettings({ ...appSettings, loginCardHelpText: e.target.value })} 
                                  className="w-full border border-slate-200 bg-white p-2 rounded-[var(--ui-radius-control)] text-xs font-bold focus:outline-[var(--ui-primary)] shadow-xs" 
                                />
                              </div>
                            </div>
                          </div>
                          
                          <div>
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 mb-2 block">Fitur Ekstra Landing Page (Maksimal 5)</label>
                            <div className="grid grid-cols-1 gap-3">
                              {[1, 2, 3, 4, 5].map((number) => {
                                const iconKey = `extraFeature${number}Icon`;
                                const defaultIcon = ["user","booktext","shield","",""][number - 1];
                                const selectedIcon = appSettings[iconKey] || defaultIcon;
                                const defaultLabel = ["Buku Tamu","Perpustakaan","Pengaturan","",""][number - 1];
                                return (
                                  <div key={number} className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_auto] gap-2">
                                    <input
                                      type="text"
                                      placeholder={`Nama Fitur ${number} (Kosongkan jika tidak dipakai)`}
                                      value={appSettings[`extraFeature${number}`] !== undefined ? appSettings[`extraFeature${number}`] : defaultLabel}
                                      onChange={(e) => setAppSettings({ ...appSettings, [`extraFeature${number}`]: e.target.value })}
                                      className="w-full border-none bg-white p-3 rounded-[var(--ui-radius-card)] text-xs font-bold focus:outline-[var(--ui-primary)] shadow-sm"
                                    />
                                    <div className="flex flex-wrap gap-1.5 rounded-[var(--ui-radius-control)] border-none bg-white p-1.5 shadow-sm">
                                      {MAJOR_ICON_OPTIONS.map((option) => {
                                        const Icon = option.icon;
                                        const isSelected = selectedIcon === option.value;
                                        return (
                                          <Button variant="outline"
                                            key={`${number}-${option.value}`}
                                            type="button"
                                            title={option.label}
                                            onClick={() =>setAppSettings({ ...appSettings, [iconKey]: option.value })}
                                            className={`flex items-center justify-center cursor-pointer`}
                                          >
                                            <Icon size={16} strokeWidth={isSelected ? 2.8 : 2.2} /></Button>
                                        );
                                      })}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>                          
                        </div>
                      </div>
                    )}

                    {/* Menu Navbar */}
                    {tampilanTab === "navbar" && (
                      <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
                        {/* Header Box */}
                        <div className="border-none rounded-[var(--ui-radius-small)] p-5 bg-slate-50/50 space-y-4">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                            <div>
                              <p className="text-[11px] font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
                                <Navigation size={14} className="text-[var(--ui-primary)]" />
                                Kustomisasi Menu Navigasi Header (Navbar)
                              </p>
                              <p className="text-[10px] font-bold text-slate-500 mt-0.5">
                                Atur visibilitas, teks label bilingual (ID / EN), dan tipe aksi/tautan untuk menu publik di navbar atas.
                              </p>
                            </div>
                            <Button
                              variant="outline"
                              type="button"
                              onClick={resetNavbarDefaults}
                              className="text-xs font-bold text-slate-600 hover:text-slate-900 flex items-center gap-1.5 self-start sm:self-auto cursor-pointer"
                              title="Kembalikan semua menu navbar ke setelan bawaan"
                            >
                              <RotateCcw size={13} />
                              Reset Standar
                            </Button>
                          </div>

                          {/* Live Interactive Preview Box */}
                          <div className="rounded-[var(--ui-radius-card)] bg-white border border-slate-200/90 shadow-xs overflow-hidden">
                            <div className="px-4 py-2.5 bg-slate-100/70 border-b border-slate-200/80 flex items-center justify-between">
                              <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 font-mono flex items-center gap-1.5">
                                <Eye size={12} className="text-emerald-600" />
                                Pratinjau Bilah Navigasi Langsung (Live Preview)
                              </span>
                              <div className="flex items-center gap-1.5">
                                <span className="text-[10px] font-bold text-slate-400 mr-1">Bahasa Pratinjau:</span>
                                <button
                                  type="button"
                                  onClick={() => setNavbarPreviewLang('ID')}
                                  className={`px-2 py-0.5 rounded text-[10px] font-bold border-none cursor-pointer transition-all ${
                                    navbarPreviewLang === 'ID' ? 'bg-emerald-600 text-white shadow-2xs font-black' : 'bg-slate-200 text-slate-600'
                                  }`}
                                >
                                  ID
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setNavbarPreviewLang('EN')}
                                  className={`px-2 py-0.5 rounded text-[10px] font-bold border-none cursor-pointer transition-all ${
                                    navbarPreviewLang === 'EN' ? 'bg-emerald-600 text-white shadow-2xs font-black' : 'bg-slate-200 text-slate-600'
                                  }`}
                                >
                                  EN
                                </button>
                              </div>
                            </div>

                            {/* Simulated Top Ribbon */}
                            <div 
                              className="w-full text-white text-[10px] font-bold py-1.5 px-4 flex items-center justify-between transition-colors"
                              style={{ backgroundColor: appSettings.topRibbonColor || appSettings.primaryColor || '#153f32' }}
                            >
                              <span className="tracking-wider uppercase font-mono font-bold truncate">
                                {appSettings.topRibbonLeftText || (appSettings.schoolName || "SMK KARYA GUNA 2 BEKASI").toUpperCase()}
                              </span>
                              <span className="text-emerald-100/80 font-medium hidden sm:inline text-[10px] truncate ml-2">
                                {appSettings.topRibbonRightText || `${navbarPreviewLang === 'EN' ? 'Academic service portal - ' : 'Portal layanan akademik - '}${appSettings.schoolName || 'SMK Karya Guna 2'}`}
                              </span>
                            </div>

                            {/* Simulated Main Navbar */}
                            <div className="w-full bg-white px-4 py-3 flex items-center justify-between border-b border-slate-150">
                              {/* Logo & Brand */}
                              <div className="flex items-center gap-2.5">
                                <div 
                                  className="w-8 h-8 rounded-xl flex items-center justify-center text-white font-black text-sm shadow-2xs shrink-0"
                                  style={{ backgroundColor: appSettings.primaryColor || '#153f32' }}
                                >
                                  {appSettings.logoWebUrl || appSettings.logoUrl ? (
                                    <img src={appSettings.logoWebUrl || appSettings.logoUrl} alt="Logo" className="w-5 h-5 object-contain" />
                                  ) : (
                                    <span>{appSettings.logoText || "2"}</span>
                                  )}
                                </div>
                                <div className="flex flex-col text-left">
                                  <div className="flex items-baseline">
                                    <span className="text-sm font-black tracking-tight leading-none text-slate-800">
                                      {appSettings.appName || "KG2 School"}
                                    </span>
                                    <span className="font-black text-sm leading-none ml-0.5 text-emerald-600">.</span>
                                  </div>
                                  <span className="text-[8px] font-black uppercase tracking-wider text-slate-400 leading-none font-mono mt-0.5">
                                    {appSettings.logoSmallText || (navbarPreviewLang === 'EN' ? "ACADEMIC PORTAL" : "SISTEM INFORMASI AKADEMIK")}
                                  </span>
                                </div>
                              </div>

                              {/* Nav Menus Preview */}
                              <div className="flex items-center gap-3 sm:gap-4 flex-wrap justify-end">
                                <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
                                  {/* Layanan */}
                                  {appSettings.navbarShowLayanan !== false && (
                                    <span className="px-2.5 py-1 rounded-lg text-xs font-bold text-slate-700 bg-slate-100/80 border border-slate-200/60 shadow-2xs">
                                      {navbarPreviewLang === 'EN' 
                                        ? (appSettings.navbarLabelLayananEn || 'Services')
                                        : (appSettings.navbarLabelLayanan || 'Layanan')}
                                    </span>
                                  )}
                                  {/* Akses Akun */}
                                  {appSettings.navbarShowAksesAkun !== false && (
                                    <span className="px-2.5 py-1 rounded-lg text-xs font-bold text-slate-700 bg-slate-100/80 border border-slate-200/60 shadow-2xs">
                                      {navbarPreviewLang === 'EN' 
                                        ? (appSettings.navbarLabelAksesAkunEn || 'Account Access')
                                        : (appSettings.navbarLabelAksesAkun || 'Akses Akun')}
                                    </span>
                                  )}
                                  {/* Bantuan */}
                                  {appSettings.navbarShowBantuan !== false && (
                                    <span className="px-2.5 py-1 rounded-lg text-xs font-bold text-slate-700 bg-slate-100/80 border border-slate-200/60 shadow-2xs">
                                      {navbarPreviewLang === 'EN' 
                                        ? (appSettings.navbarLabelBantuanEn || 'Help')
                                        : (appSettings.navbarLabelBantuan || 'Bantuan')}
                                    </span>
                                  )}
                                  {/* Custom Menus */}
                                  {Array.isArray(appSettings.navbarCustomMenus) && appSettings.navbarCustomMenus
                                    .filter(item => item && item.isVisible !== false)
                                    .map((item, idx) => (
                                      <span key={item.id || idx} className="px-2.5 py-1 rounded-lg text-xs font-bold text-emerald-800 bg-emerald-50 border border-emerald-200/70 shadow-2xs flex items-center gap-1">
                                        <span>{navbarPreviewLang === 'EN' ? (item.labelEn || item.label) : (item.label || item.labelEn)}</span>
                                        {item.type === 'external' && <ExternalLink size={10} className="text-emerald-600" />}
                                      </span>
                                    ))}
                                </div>

                                {/* Language Switcher Pill */}
                                {appSettings.navbarShowLanguageSwitch !== false && (
                                  <div className="inline-flex items-center p-0.5 rounded-lg bg-slate-100 border border-slate-200 text-[10px] font-bold text-slate-600">
                                    <span className="px-1.5 py-0.5 rounded bg-white text-slate-800 shadow-2xs font-extrabold">ID</span>
                                    <span className="px-1.5 py-0.5 text-slate-400">EN</span>
                                  </div>
                                )}

                                {/* Sign In Button */}
                                {appSettings.navbarShowLoginButton !== false && (
                                  <button
                                    type="button"
                                    className="px-3.5 py-1.5 rounded-xl text-white text-xs font-bold flex items-center gap-1.5 shadow-2xs border-none"
                                    style={{ backgroundColor: appSettings.primaryButtonColor || appSettings.primaryColor || '#059669' }}
                                  >
                                    <span>
                                      {navbarPreviewLang === 'EN' 
                                        ? (appSettings.navbarLoginButtonTextEn || 'Sign In')
                                        : (appSettings.navbarLoginButtonText || 'Masuk Akun')}
                                    </span>
                                    <ExternalLink size={11} strokeWidth={2.5} />
                                  </button>
                                )}
                              </div>
                            </div>

                            <div className="p-2.5 bg-slate-50/60 border-t border-slate-150 text-[10.5px] text-slate-400 flex items-center gap-1.5 font-medium">
                              <CheckCircle2 size={13} className="text-emerald-600 shrink-0" />
                              <span>Menu yang dimatikan/disembunyikan tidak akan tampil di navbar desktop maupun menu mobile.</span>
                            </div>
                          </div>

                          {/* Section 1: Standard Menus (Layanan, Akses Akun, Bantuan) */}
                          <div className="space-y-3 pt-2">
                            <div>
                              <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
                                <Layers size={14} className="text-emerald-600" />
                                1. Pengaturan Tiga Menu Bawaan (Default Menus)
                              </h4>
                              <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                                Kustomisasi teks nama, visibilitas tampil/sembunyi, dan tipe tindakan saat menu diklik oleh pengguna.
                              </p>
                            </div>

                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                              {/* Menu 1: Layanan */}
                              <div className={`p-4 rounded-[var(--ui-radius-card)] border transition-all ${
                                appSettings.navbarShowLayanan !== false ? 'bg-white border-slate-200/90 shadow-2xs' : 'bg-slate-100/60 border-dashed border-slate-300 opacity-75'
                              }`}>
                                <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-100">
                                  <div className="flex items-center gap-2">
                                    <span className="w-6 h-6 rounded-lg bg-emerald-100 text-emerald-800 text-[11px] font-black flex items-center justify-center">1</span>
                                    <span className="text-xs font-black text-slate-800">Menu Layanan</span>
                                  </div>
                                  <label className="relative inline-flex items-center cursor-pointer">
                                    <input
                                      type="checkbox"
                                      checked={appSettings.navbarShowLayanan !== false}
                                      onChange={(e) => setAppSettings({ ...appSettings, navbarShowLayanan: e.target.checked })}
                                      className="sr-only peer"
                                    />
                                    <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-600"></div>
                                  </label>
                                </div>

                                <div className="space-y-3">
                                  <div>
                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-1">
                                      Label Teks (Indonesia)
                                    </label>
                                    <input
                                      type="text"
                                      placeholder="Layanan"
                                      value={appSettings.navbarLabelLayanan || ""}
                                      onChange={(e) => setAppSettings({ ...appSettings, navbarLabelLayanan: e.target.value })}
                                      className="w-full border border-slate-200 bg-white p-2 rounded-[var(--ui-radius-control)] text-xs font-bold focus:outline-[var(--ui-primary)] shadow-xs"
                                    />
                                  </div>

                                  <div>
                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-1">
                                      Label Teks (English)
                                    </label>
                                    <input
                                      type="text"
                                      placeholder="Services"
                                      value={appSettings.navbarLabelLayananEn || ""}
                                      onChange={(e) => setAppSettings({ ...appSettings, navbarLabelLayananEn: e.target.value })}
                                      className="w-full border border-slate-200 bg-white p-2 rounded-[var(--ui-radius-control)] text-xs font-bold focus:outline-[var(--ui-primary)] shadow-xs"
                                    />
                                  </div>

                                  <div>
                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-1">
                                      Tipe Aksi Saat Diklik
                                    </label>
                                    <UISelect
                                      value={appSettings.navbarTypeLayanan || "scroll"}
                                      onChange={(e) => setAppSettings({ ...appSettings, navbarTypeLayanan: e.target.value })}
                                      className="w-full text-xs"
                                    >
                                      <option value="scroll">Scroll ke Bagian Halaman (Anchor #)</option>
                                      <option value="route">Buka Halaman Internal (Router /...)</option>
                                      <option value="external">Buka Tautan Eksternal (URL)</option>
                                    </UISelect>
                                  </div>

                                  <div>
                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-1">
                                      Target / Anchor / Path
                                    </label>
                                    <input
                                      type="text"
                                      placeholder="#layanan-akademik"
                                      value={appSettings.navbarTargetLayanan || ""}
                                      onChange={(e) => setAppSettings({ ...appSettings, navbarTargetLayanan: e.target.value })}
                                      className="w-full border border-slate-200 bg-white p-2 rounded-[var(--ui-radius-control)] text-xs font-mono font-bold focus:outline-[var(--ui-primary)] shadow-xs"
                                    />
                                    <span className="text-[9.5px] text-slate-400 mt-1 block">Default: #layanan-akademik</span>
                                  </div>
                                </div>
                              </div>

                              {/* Menu 2: Akses Akun */}
                              <div className={`p-4 rounded-[var(--ui-radius-card)] border transition-all ${
                                appSettings.navbarShowAksesAkun !== false ? 'bg-white border-slate-200/90 shadow-2xs' : 'bg-slate-100/60 border-dashed border-slate-300 opacity-75'
                              }`}>
                                <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-100">
                                  <div className="flex items-center gap-2">
                                    <span className="w-6 h-6 rounded-lg bg-emerald-100 text-emerald-800 text-[11px] font-black flex items-center justify-center">2</span>
                                    <span className="text-xs font-black text-slate-800">Menu Akses Akun</span>
                                  </div>
                                  <label className="relative inline-flex items-center cursor-pointer">
                                    <input
                                      type="checkbox"
                                      checked={appSettings.navbarShowAksesAkun !== false}
                                      onChange={(e) => setAppSettings({ ...appSettings, navbarShowAksesAkun: e.target.checked })}
                                      className="sr-only peer"
                                    />
                                    <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-600"></div>
                                  </label>
                                </div>

                                <div className="space-y-3">
                                  <div>
                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-1">
                                      Label Teks (Indonesia)
                                    </label>
                                    <input
                                      type="text"
                                      placeholder="Akses Akun"
                                      value={appSettings.navbarLabelAksesAkun || ""}
                                      onChange={(e) => setAppSettings({ ...appSettings, navbarLabelAksesAkun: e.target.value })}
                                      className="w-full border border-slate-200 bg-white p-2 rounded-[var(--ui-radius-control)] text-xs font-bold focus:outline-[var(--ui-primary)] shadow-xs"
                                    />
                                  </div>

                                  <div>
                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-1">
                                      Label Teks (English)
                                    </label>
                                    <input
                                      type="text"
                                      placeholder="Account Access"
                                      value={appSettings.navbarLabelAksesAkunEn || ""}
                                      onChange={(e) => setAppSettings({ ...appSettings, navbarLabelAksesAkunEn: e.target.value })}
                                      className="w-full border border-slate-200 bg-white p-2 rounded-[var(--ui-radius-control)] text-xs font-bold focus:outline-[var(--ui-primary)] shadow-xs"
                                    />
                                  </div>

                                  <div>
                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-1">
                                      Tipe Aksi Saat Diklik
                                    </label>
                                    <UISelect
                                      value={appSettings.navbarTypeAksesAkun || "scroll"}
                                      onChange={(e) => setAppSettings({ ...appSettings, navbarTypeAksesAkun: e.target.value })}
                                      className="w-full text-xs"
                                    >
                                      <option value="scroll">Scroll ke Bagian Akses Akun (#akses-akun)</option>
                                      <option value="modal_login">Buka Pop-up Dialog Masuk Akun</option>
                                      <option value="route">Buka Halaman Internal (Router /...)</option>
                                      <option value="external">Buka Tautan Eksternal (URL)</option>
                                    </UISelect>
                                  </div>

                                  <div>
                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-1">
                                      Target / Anchor / Path
                                    </label>
                                    <input
                                      type="text"
                                      placeholder="#akses-akun"
                                      disabled={appSettings.navbarTypeAksesAkun === 'modal_login'}
                                      value={appSettings.navbarTypeAksesAkun === 'modal_login' ? 'Buka Dialog Masuk' : (appSettings.navbarTargetAksesAkun || "")}
                                      onChange={(e) => setAppSettings({ ...appSettings, navbarTargetAksesAkun: e.target.value })}
                                      className="w-full border border-slate-200 bg-white p-2 rounded-[var(--ui-radius-control)] text-xs font-mono font-bold focus:outline-[var(--ui-primary)] shadow-xs disabled:bg-slate-100 disabled:text-slate-400"
                                    />
                                    <span className="text-[9.5px] text-slate-400 mt-1 block">Default: #akses-akun</span>
                                  </div>
                                </div>
                              </div>

                              {/* Menu 3: Bantuan */}
                              <div className={`p-4 rounded-[var(--ui-radius-card)] border transition-all ${
                                appSettings.navbarShowBantuan !== false ? 'bg-white border-slate-200/90 shadow-2xs' : 'bg-slate-100/60 border-dashed border-slate-300 opacity-75'
                              }`}>
                                <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-100">
                                  <div className="flex items-center gap-2">
                                    <span className="w-6 h-6 rounded-lg bg-emerald-100 text-emerald-800 text-[11px] font-black flex items-center justify-center">3</span>
                                    <span className="text-xs font-black text-slate-800">Menu Bantuan</span>
                                  </div>
                                  <label className="relative inline-flex items-center cursor-pointer">
                                    <input
                                      type="checkbox"
                                      checked={appSettings.navbarShowBantuan !== false}
                                      onChange={(e) => setAppSettings({ ...appSettings, navbarShowBantuan: e.target.checked })}
                                      className="sr-only peer"
                                    />
                                    <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-600"></div>
                                  </label>
                                </div>

                                <div className="space-y-3">
                                  <div>
                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-1">
                                      Label Teks (Indonesia)
                                    </label>
                                    <input
                                      type="text"
                                      placeholder="Bantuan"
                                      value={appSettings.navbarLabelBantuan || ""}
                                      onChange={(e) => setAppSettings({ ...appSettings, navbarLabelBantuan: e.target.value })}
                                      className="w-full border border-slate-200 bg-white p-2 rounded-[var(--ui-radius-control)] text-xs font-bold focus:outline-[var(--ui-primary)] shadow-xs"
                                    />
                                  </div>

                                  <div>
                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-1">
                                      Label Teks (English)
                                    </label>
                                    <input
                                      type="text"
                                      placeholder="Help"
                                      value={appSettings.navbarLabelBantuanEn || ""}
                                      onChange={(e) => setAppSettings({ ...appSettings, navbarLabelBantuanEn: e.target.value })}
                                      className="w-full border border-slate-200 bg-white p-2 rounded-[var(--ui-radius-control)] text-xs font-bold focus:outline-[var(--ui-primary)] shadow-xs"
                                    />
                                  </div>

                                  <div>
                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-1">
                                      Tipe Aksi Saat Diklik
                                    </label>
                                    <UISelect
                                      value={appSettings.navbarTypeBantuan || "modal_bantuan"}
                                      onChange={(e) => setAppSettings({ ...appSettings, navbarTypeBantuan: e.target.value })}
                                      className="w-full text-xs"
                                    >
                                      <option value="modal_bantuan">Buka Dialog Pop-up Pusat Bantuan</option>
                                      <option value="wa_direct">Chat WhatsApp Admin Langsung</option>
                                      <option value="scroll">Scroll ke Bagian Halaman (Anchor #)</option>
                                      <option value="route">Buka Halaman Internal (Router /...)</option>
                                      <option value="external">Buka Tautan Eksternal (URL)</option>
                                    </UISelect>
                                  </div>

                                  <div>
                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-1">
                                      Target / Anchor / Path
                                    </label>
                                    <input
                                      type="text"
                                      placeholder="modal_bantuan"
                                      disabled={appSettings.navbarTypeBantuan === 'modal_bantuan' || appSettings.navbarTypeBantuan === 'wa_direct'}
                                      value={
                                        appSettings.navbarTypeBantuan === 'modal_bantuan' 
                                          ? 'Buka Pop-up Pusat Bantuan' 
                                          : appSettings.navbarTypeBantuan === 'wa_direct'
                                            ? 'Buka WhatsApp Otomatis'
                                            : (appSettings.navbarTargetBantuan || "")
                                      }
                                      onChange={(e) => setAppSettings({ ...appSettings, navbarTargetBantuan: e.target.value })}
                                      className="w-full border border-slate-200 bg-white p-2 rounded-[var(--ui-radius-control)] text-xs font-mono font-bold focus:outline-[var(--ui-primary)] shadow-xs disabled:bg-slate-100 disabled:text-slate-400"
                                    />
                                    <span className="text-[9.5px] text-slate-400 mt-1 block">Default: Dialog Pusat Bantuan</span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Sub-Section: Pengaturan Detail Dialog Pop-up Pusat Bantuan & FAQ */}
                          <div className="p-4 rounded-[var(--ui-radius-card)] border border-emerald-200/90 bg-emerald-50/20 shadow-2xs space-y-4">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-emerald-100">
                              <div>
                                <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
                                  <HelpCircle size={15} className="text-emerald-600" />
                                  Pengaturan Konten Pop-up Pusat Bantuan & FAQ
                                </h4>
                                <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                                  Sesuaikan judul, pesan bantuan, jam operasional, dan pertanyaan umum (FAQ) pada modal bantuan web.
                                </p>
                              </div>
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <Button
                                  variant="outline"
                                  type="button"
                                  onClick={handleResetFaqsToDefault}
                                  className="text-[11px] font-bold text-slate-600 bg-white hover:bg-slate-50 border-slate-200 py-1 px-2.5 shadow-2xs cursor-pointer"
                                >
                                  Reset FAQ Standar
                                </Button>
                                <Button
                                  variant="primary"
                                  type="button"
                                  onClick={handleAddFaqItem}
                                  className="text-[11px] font-bold text-white bg-emerald-600 hover:bg-emerald-700 py-1 px-2.5 shadow-xs cursor-pointer flex items-center gap-1"
                                >
                                  <Plus size={12} />
                                  <span>Tambah FAQ</span>
                                </Button>
                              </div>
                            </div>

                            {/* Grid 2 Kolom: Subtitle & Jam Operasional */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                              <div>
                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-1">
                                  Sub-Judul Modal (Indonesia)
                                </label>
                                <input
                                  type="text"
                                  placeholder="Informasi akses akun, FAQ & kontak resmi sekolah"
                                  value={appSettings.helpModalSubtitle || ""}
                                  onChange={(e) => setAppSettings({ ...appSettings, helpModalSubtitle: e.target.value })}
                                  className="w-full border border-slate-200 bg-white p-2 rounded-[var(--ui-radius-control)] text-xs font-bold focus:outline-[var(--ui-primary)] shadow-xs"
                                />
                              </div>
                              <div>
                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-1">
                                  Sub-Judul Modal (English)
                                </label>
                                <input
                                  type="text"
                                  placeholder="Account access info, FAQ & official school contacts"
                                  value={appSettings.helpModalSubtitleEn || ""}
                                  onChange={(e) => setAppSettings({ ...appSettings, helpModalSubtitleEn: e.target.value })}
                                  className="w-full border border-slate-200 bg-white p-2 rounded-[var(--ui-radius-control)] text-xs font-bold focus:outline-[var(--ui-primary)] shadow-xs"
                                />
                              </div>

                              <div>
                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-1">
                                  Jam Operasional Layanan (Indonesia)
                                </label>
                                <input
                                  type="text"
                                  placeholder="Senin – Jumat (07.00 – 16.00 WIB)"
                                  value={appSettings.helpModalHours || ""}
                                  onChange={(e) => setAppSettings({ ...appSettings, helpModalHours: e.target.value })}
                                  className="w-full border border-slate-200 bg-white p-2 rounded-[var(--ui-radius-control)] text-xs font-bold focus:outline-[var(--ui-primary)] shadow-xs"
                                />
                              </div>
                              <div>
                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-1">
                                  Jam Operasional Layanan (English)
                                </label>
                                <input
                                  type="text"
                                  placeholder="Mon – Fri (07.00 – 16.00 WIB)"
                                  value={appSettings.helpModalHoursEn || ""}
                                  onChange={(e) => setAppSettings({ ...appSettings, helpModalHoursEn: e.target.value })}
                                  className="w-full border border-slate-200 bg-white p-2 rounded-[var(--ui-radius-control)] text-xs font-bold focus:outline-[var(--ui-primary)] shadow-xs"
                                />
                              </div>

                              <div className="md:col-span-2">
                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-1">
                                  Teks Banner Pemberitahuan (Indonesia)
                                </label>
                                <textarea
                                  rows={2}
                                  placeholder="Butuh bantuan untuk masuk ke sistem atau memiliki pertanyaan seputar KBM? Silakan cek FAQ atau hubungi admin di bawah."
                                  value={appSettings.helpModalNotice || ""}
                                  onChange={(e) => setAppSettings({ ...appSettings, helpModalNotice: e.target.value })}
                                  className="w-full border border-slate-200 bg-white p-2 rounded-[var(--ui-radius-control)] text-xs font-medium focus:outline-[var(--ui-primary)] shadow-xs"
                                />
                              </div>
                            </div>

                            {/* Daftar Pertanyaan FAQ */}
                            <div className="space-y-2 pt-2">
                              <span className="text-[11px] font-black text-slate-700 block uppercase tracking-wider">
                                Daftar Pertanyaan & Jawaban FAQ
                              </span>
                              
                              {(() => {
                                const faqsList = Array.isArray(appSettings.helpModalFaqs) && appSettings.helpModalFaqs.length > 0
                                  ? appSettings.helpModalFaqs
                                  : [
                                      {
                                        q: "Bagaimana cara masuk ke sistem?",
                                        qEn: "How do I sign in to the portal?",
                                        a: "Klik tombol 'Masuk' di kanan atas halaman, lalu gunakan username dan password resmi yang diberikan sekolah.",
                                        aEn: "Click the 'Sign In' button at the top right, then use your official credentials provided by the school."
                                      },
                                      {
                                        q: "Lupa password atau tidak bisa login?",
                                        qEn: "Forgot password or unable to log in?",
                                        a: "Silakan hubungi administrator sekolah untuk melakukan reset password akun Anda.",
                                        aEn: "Please contact the school administrator to reset your account password."
                                      },
                                      {
                                        q: "Jadwal pelajaran atau presensi bermasalah?",
                                        qEn: "Schedule or attendance issue?",
                                        a: "Setiap pembaruan jadwal atau data kehadiran sinkron secara real-time. Hubungi waka kurikulum bila data kelas Anda membutuhkan penyesuaian.",
                                        aEn: "All schedule and attendance updates sync in real-time. Contact the academic curriculum team if your class data requires adjustment."
                                      }
                                    ];

                                return (
                                  <div className="space-y-2.5">
                                    {faqsList.map((item, idx) => (
                                      <div key={idx} className="p-3 bg-white border border-slate-200 rounded-[var(--ui-radius-control)] shadow-2xs space-y-2">
                                        <div className="flex items-center justify-between pb-1.5 border-b border-slate-100">
                                          <div className="flex items-center gap-2">
                                            <span className="w-5 h-5 rounded-md bg-emerald-100 text-emerald-800 text-[10px] font-black flex items-center justify-center">
                                              {idx + 1}
                                            </span>
                                            <span className="text-xs font-extrabold text-slate-800">
                                              FAQ #{idx + 1}
                                            </span>
                                          </div>
                                          <button
                                            type="button"
                                            onClick={() => handleDeleteFaqItem(idx)}
                                            className="text-slate-400 hover:text-rose-600 p-1 rounded-md hover:bg-rose-50 transition-colors border-none bg-transparent cursor-pointer"
                                            title="Hapus Pertanyaan FAQ"
                                          >
                                            <Trash2 size={13} />
                                          </button>
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                          <div>
                                            <label className="text-[9.5px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">
                                              Pertanyaan (ID)
                                            </label>
                                            <input
                                              type="text"
                                              placeholder="Tulis pertanyaan..."
                                              value={item.q || ""}
                                              onChange={(e) => handleUpdateFaqItem(idx, 'q', e.target.value)}
                                              className="w-full border border-slate-200 bg-slate-50/50 p-1.5 rounded-[var(--ui-radius-small)] text-xs font-bold focus:outline-[var(--ui-primary)]"
                                            />
                                          </div>
                                          <div>
                                            <label className="text-[9.5px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">
                                              Pertanyaan (EN)
                                            </label>
                                            <input
                                              type="text"
                                              placeholder="Question in English..."
                                              value={item.qEn || ""}
                                              onChange={(e) => handleUpdateFaqItem(idx, 'qEn', e.target.value)}
                                              className="w-full border border-slate-200 bg-slate-50/50 p-1.5 rounded-[var(--ui-radius-small)] text-xs font-bold focus:outline-[var(--ui-primary)]"
                                            />
                                          </div>
                                          <div className="md:col-span-2">
                                            <label className="text-[9.5px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">
                                              Jawaban (ID)
                                            </label>
                                            <textarea
                                              rows={2}
                                              placeholder="Tulis jawaban..."
                                              value={item.a || ""}
                                              onChange={(e) => handleUpdateFaqItem(idx, 'a', e.target.value)}
                                              className="w-full border border-slate-200 bg-slate-50/50 p-1.5 rounded-[var(--ui-radius-small)] text-xs font-medium focus:outline-[var(--ui-primary)]"
                                            />
                                          </div>
                                          <div className="md:col-span-2">
                                            <label className="text-[9.5px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">
                                              Jawaban (EN)
                                            </label>
                                            <textarea
                                              rows={2}
                                              placeholder="Answer in English..."
                                              value={item.aEn || ""}
                                              onChange={(e) => handleUpdateFaqItem(idx, 'aEn', e.target.value)}
                                              className="w-full border border-slate-200 bg-slate-50/50 p-1.5 rounded-[var(--ui-radius-small)] text-xs font-medium focus:outline-[var(--ui-primary)]"
                                            />
                                          </div>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                );
                              })()}
                            </div>
                          </div>

                          {/* Section 2: Custom Extra Menus */}
                          <div className="space-y-3 pt-3">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                              <div>
                                <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
                                  <Plus size={14} className="text-emerald-600" />
                                  2. Menu Navigasi Tambahan (Kustom)
                                </h4>
                                <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                                  Tambahkan link menu baru di navbar seperti Prestasi Siswa, Jadwal, Kalender, PPDB, atau web eksternal.
                                </p>
                              </div>
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <Button
                                  variant="outline"
                                  type="button"
                                  onClick={() => handleAddCustomMenu({
                                    label: "Prestasi",
                                    labelEn: "Achievements",
                                    type: "route",
                                    target: "/prestasi",
                                    isVisible: true,
                                    openInNewTab: false
                                  })}
                                  className="text-[11px] font-bold text-slate-700 bg-white hover:bg-slate-50 border-slate-200 shadow-2xs cursor-pointer py-1 px-2.5"
                                >
                                  + Prestasi Siswa
                                </Button>
                                <Button
                                  variant="outline"
                                  type="button"
                                  onClick={() => handleAddCustomMenu({
                                    label: "Jadwal",
                                    labelEn: "Schedule",
                                    type: "route",
                                    target: "/jadwal",
                                    isVisible: true,
                                    openInNewTab: false
                                  })}
                                  className="text-[11px] font-bold text-slate-700 bg-white hover:bg-slate-50 border-slate-200 shadow-2xs cursor-pointer py-1 px-2.5"
                                >
                                  + Jadwal
                                </Button>
                                <Button
                                  variant="outline"
                                  type="button"
                                  onClick={() => handleAddCustomMenu({
                                    label: "Kalender",
                                    labelEn: "Calendar",
                                    type: "route",
                                    target: "/kalender",
                                    isVisible: true,
                                    openInNewTab: false
                                  })}
                                  className="text-[11px] font-bold text-slate-700 bg-white hover:bg-slate-50 border-slate-200 shadow-2xs cursor-pointer py-1 px-2.5"
                                >
                                  + Kalender
                                </Button>
                                <Button
                                  type="button"
                                  onClick={() => handleAddCustomMenu()}
                                  className="text-[11px] font-bold text-white bg-emerald-600 hover:bg-emerald-700 shadow-2xs cursor-pointer py-1 px-3 border-none flex items-center gap-1 rounded-[var(--ui-radius-control)]"
                                >
                                  <Plus size={13} strokeWidth={2.5} />
                                  Tambah Menu
                                </Button>
                              </div>
                            </div>

                            {/* List of Custom Menus */}
                            {(!Array.isArray(appSettings.navbarCustomMenus) || appSettings.navbarCustomMenus.length === 0) ? (
                              <div className="p-6 rounded-[var(--ui-radius-card)] border border-dashed border-slate-200 bg-white text-center flex flex-col items-center justify-center">
                                <Link2 size={24} className="text-slate-300 mb-1.5" />
                                <p className="text-xs font-bold text-slate-600">Belum ada menu kustom tambahan</p>
                                <p className="text-[11px] text-slate-400 mt-0.5">
                                  Gunakan tombol pintas di atas untuk menambahkan menu halaman internal atau link eksternal.
                                </p>
                              </div>
                            ) : (
                              <div className="space-y-3">
                                {appSettings.navbarCustomMenus.map((item, idx) => (
                                  <div 
                                    key={item.id || idx}
                                    className={`p-4 rounded-[var(--ui-radius-card)] border transition-all ${
                                      item.isVisible !== false ? 'bg-white border-slate-200/90 shadow-2xs' : 'bg-slate-100/60 border-dashed border-slate-300 opacity-75'
                                    }`}
                                  >
                                    <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-100">
                                      <div className="flex items-center gap-2">
                                        <span className="w-5 h-5 rounded bg-emerald-50 text-emerald-700 text-[10px] font-black flex items-center justify-center font-mono">
                                          {idx + 1}
                                        </span>
                                        <span className="text-xs font-black text-slate-800">
                                          {item.label || `Menu Kustom #${idx + 1}`}
                                        </span>
                                      </div>

                                      <div className="flex items-center gap-3">
                                        <label className="flex items-center gap-1.5 cursor-pointer text-xs font-bold text-slate-600 select-none">
                                          <input
                                            type="checkbox"
                                            checked={item.isVisible !== false}
                                            onChange={(e) => handleUpdateCustomMenu(item.id, 'isVisible', e.target.checked)}
                                            className="rounded text-emerald-600 focus:ring-emerald-500"
                                          />
                                          <span className="text-[11px] font-bold">Aktif</span>
                                        </label>

                                        <button
                                          type="button"
                                          onClick={() => handleDeleteCustomMenu(item.id)}
                                          className="text-slate-400 hover:text-red-500 p-1 rounded hover:bg-red-50 border-none bg-transparent cursor-pointer transition-colors"
                                          title="Hapus Menu Ini"
                                        >
                                          <Trash2 size={15} />
                                        </button>
                                      </div>
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                                      <div>
                                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-1">
                                          Label (Indonesia)
                                        </label>
                                        <input
                                          type="text"
                                          placeholder="Contoh: Prestasi"
                                          value={item.label || ""}
                                          onChange={(e) => handleUpdateCustomMenu(item.id, 'label', e.target.value)}
                                          className="w-full border border-slate-200 bg-white p-2 rounded-[var(--ui-radius-control)] text-xs font-bold focus:outline-[var(--ui-primary)] shadow-xs"
                                        />
                                      </div>

                                      <div>
                                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-1">
                                          Label (English)
                                        </label>
                                        <input
                                          type="text"
                                          placeholder="Contoh: Achievements"
                                          value={item.labelEn || ""}
                                          onChange={(e) => handleUpdateCustomMenu(item.id, 'labelEn', e.target.value)}
                                          className="w-full border border-slate-200 bg-white p-2 rounded-[var(--ui-radius-control)] text-xs font-bold focus:outline-[var(--ui-primary)] shadow-xs"
                                        />
                                      </div>

                                      <div>
                                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-1">
                                          Tipe Aksi
                                        </label>
                                        <UISelect
                                          value={item.type || "route"}
                                          onChange={(e) => handleUpdateCustomMenu(item.id, 'type', e.target.value)}
                                          className="w-full text-xs"
                                        >
                                          <option value="route">Halaman Internal (Router /...)</option>
                                          <option value="scroll">Scroll ke Bagian (Anchor #...)</option>
                                          <option value="external">Tautan Eksternal (URL Website)</option>
                                        </UISelect>
                                      </div>

                                      <div>
                                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-1">
                                          Target Path / URL
                                        </label>
                                        <input
                                          type="text"
                                          placeholder={item.type === 'external' ? 'https://...' : item.type === 'scroll' ? '#section-id' : '/path'}
                                          value={item.target || ""}
                                          onChange={(e) => handleUpdateCustomMenu(item.id, 'target', e.target.value)}
                                          className="w-full border border-slate-200 bg-white p-2 rounded-[var(--ui-radius-control)] text-xs font-mono font-bold focus:outline-[var(--ui-primary)] shadow-xs"
                                        />
                                      </div>
                                    </div>

                                    {item.type === 'external' && (
                                      <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center gap-2">
                                        <label className="flex items-center gap-1.5 cursor-pointer text-xs font-bold text-slate-600 select-none">
                                          <input
                                            type="checkbox"
                                            checked={item.openInNewTab !== false}
                                            onChange={(e) => handleUpdateCustomMenu(item.id, 'openInNewTab', e.target.checked)}
                                            className="rounded text-emerald-600 focus:ring-emerald-500"
                                          />
                                          <span className="text-[11px] text-slate-500 font-medium">Buka tautan di tab browser baru (target="_blank")</span>
                                        </label>
                                      </div>
                                    )}
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>

                          {/* Section 3: Right-Side Controls (Sign In Button & Language Switcher) */}
                          <div className="space-y-3 pt-3">
                            <div>
                              <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
                                <Globe size={14} className="text-emerald-600" />
                                3. Tombol Masuk Akun & Pengalih Bahasa
                              </h4>
                              <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                                Atur tampilan tombol aksi portal kanan dan pengalih bahasa ID / EN.
                              </p>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              {/* Tombol Masuk Akun */}
                              <div className="p-4 rounded-[var(--ui-radius-card)] bg-white border border-slate-200/90 shadow-2xs space-y-3">
                                <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                                  <span className="text-xs font-black text-slate-800">Tombol Masuk Akun</span>
                                  <label className="relative inline-flex items-center cursor-pointer">
                                    <input
                                      type="checkbox"
                                      checked={appSettings.navbarShowLoginButton !== false}
                                      onChange={(e) => setAppSettings({ ...appSettings, navbarShowLoginButton: e.target.checked })}
                                      className="sr-only peer"
                                    />
                                    <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-600"></div>
                                  </label>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                  <div>
                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-1">
                                      Teks Tombol (ID)
                                    </label>
                                    <input
                                      type="text"
                                      placeholder="Masuk Akun"
                                      value={appSettings.navbarLoginButtonText || ""}
                                      onChange={(e) => setAppSettings({ ...appSettings, navbarLoginButtonText: e.target.value })}
                                      className="w-full border border-slate-200 bg-white p-2 rounded-[var(--ui-radius-control)] text-xs font-bold focus:outline-[var(--ui-primary)] shadow-xs"
                                    />
                                  </div>
                                  <div>
                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-1">
                                      Teks Tombol (EN)
                                    </label>
                                    <input
                                      type="text"
                                      placeholder="Sign In"
                                      value={appSettings.navbarLoginButtonTextEn || ""}
                                      onChange={(e) => setAppSettings({ ...appSettings, navbarLoginButtonTextEn: e.target.value })}
                                      className="w-full border border-slate-200 bg-white p-2 rounded-[var(--ui-radius-control)] text-xs font-bold focus:outline-[var(--ui-primary)] shadow-xs"
                                    />
                                  </div>
                                </div>
                              </div>

                              {/* Pengalih Bahasa */}
                              <div className="p-4 rounded-[var(--ui-radius-card)] bg-white border border-slate-200/90 shadow-2xs space-y-3">
                                <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                                  <span className="text-xs font-black text-slate-800">Pengalih Bahasa (ID / EN)</span>
                                  <label className="relative inline-flex items-center cursor-pointer">
                                    <input
                                      type="checkbox"
                                      checked={appSettings.navbarShowLanguageSwitch !== false}
                                      onChange={(e) => setAppSettings({ ...appSettings, navbarShowLanguageSwitch: e.target.checked })}
                                      className="sr-only peer"
                                    />
                                    <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-600"></div>
                                  </label>
                                </div>
                                <p className="text-[11px] text-slate-500 font-medium">
                                  Aktifkan tombol kontrol segmented untuk beralih antara Bahasa Indonesia dan English secara instan pada header navbar.
                                </p>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Menu Layanan */}
                    {tampilanTab ==="layanan" && (
                      <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
                        <div className="border-none rounded-[var(--ui-radius-small)] p-5 bg-slate-50/50 space-y-4">
                          <div>
                            <p className="text-[11px] font-black text-slate-800 uppercase tracking-widest">Kustomisasi Menu Layanan Publik</p>
                            <p className="text-[10px] font-bold text-slate-500 mt-0.5">Ubah nama teks, warna tema, dan upload file icon kustom Anda untuk 8 menu utama di halaman beranda.</p>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 mt-4">
                            {[
                              { id: 1, defaultName:"Jadwal Pelajaran", defaultColor:"#D97706" },
                              { id: 2, defaultName:"Denah Kelas", defaultColor:"#0284C7" },
                              { id: 3, defaultName:"Modul Ajar", defaultColor:"#7C3AED" },
                              { id: 4, defaultName:"Kalender Akademik", defaultColor:"#15803D" },
                              { id: 5, defaultName:"Tempat PKL", defaultColor:"#DB2777" },
                              { id: 6, defaultName:"Struktur Organisasi", defaultColor:"#E11D48" },
                              { id: 7, defaultName:"Peraturan Sekolah", defaultColor:"#E11D48" },
                              { id: 8, defaultName:"Prestasi Siswa", defaultColor:"#EAB308" },
                            ].map((menu) => {
                              const labelKey = `serviceLabel${menu.id}`;
                              const colorKey = `serviceColor${menu.id}`;
                              const iconKey = `serviceIconImage${menu.id}`;

                              const currentLabel = appSettings[labelKey] !== undefined ? appSettings[labelKey] : menu.defaultName;
                              const currentColor = appSettings[colorKey] || menu.defaultColor;
                              const currentIcon = appSettings[iconKey] ||"";

                              return (
                                <div key={menu.id} className="border-none bg-white rounded-[var(--ui-radius-card)] p-4 flex flex-col gap-3.5 shadow-sm relative">
                                  <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Menu {menu.id}</span>
                                    <Button variant="outline"
                                      type="button"
                                      onClick={() =>{
                                        setAppSettings({
                                          ...appSettings,
                                          [labelKey]: menu.defaultName,
                                          [colorKey]: menu.defaultColor,
                                          [iconKey]:""
                                        });
                                      }}
                                      className="cursor-pointer flex items-center gap-1"
                                      title="Reset ke Default"
                                    >
                                      <RotateCcw size={10} /> Reset</Button>
                                  </div>

                                  {/* Input: Label */}
                                  <div>
                                    <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1 mb-1 block">Nama Menu</label>
                                    <input
                                      type="text"
                                      value={currentLabel}
                                      onChange={(e) => setAppSettings({ ...appSettings, [labelKey]: e.target.value })}
                                      className="w-full border-none bg-slate-50 p-2.5 rounded-[var(--ui-radius-small)] text-xs font-bold focus:outline-[var(--ui-primary)]"
                                    />
                                  </div>

                                  {/* Input: Warna */}
                                  <div>
                                    <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1 mb-1 block">Warna Icon</label>
                                    <div className="flex items-center gap-2">
                                      <input
                                        type="color"
                                        value={currentColor}
                                        onChange={(e) => setAppSettings({ ...appSettings, [colorKey]: e.target.value })}
                                        className="w-8 h-8 rounded-[var(--ui-radius-small)] border border-slate-200 cursor-pointer overflow-hidden p-0 bg-transparent shrink-0"
                                      />
                                      <input
                                        type="text"
                                        value={currentColor}
                                        onChange={(e) => setAppSettings({ ...appSettings, [colorKey]: e.target.value })}
                                        className="w-full border-none bg-slate-50 p-2.5 rounded-[var(--ui-radius-small)] text-xs font-mono font-bold uppercase focus:outline-[var(--ui-primary)]"
                                      />
                                    </div>
                                  </div>

                                  {/* Input: Custom Icon Image */}
                                  <div>
                                    <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1 mb-1.5 block">Icon Kustom (PNG/SVG/WebP)</label>
                                    <div className="flex gap-2 items-center">
                                      <div className="w-12 h-12 bg-slate-50 border-none rounded-[var(--ui-radius-small)] overflow-hidden flex items-center justify-center shrink-0">
                                        {currentIcon ? (
                                          <img src={currentIcon} alt="Icon Preview" className="w-full h-full object-contain p-1" />
                                        ) : (
                                          <ImageIcon size={18} className="text-slate-300" />
                                        )}
                                      </div>
                                      <div className="flex-1">
                                        <input
                                          type="file"
                                          accept="image/png,image/jpeg,image/svg+xml,image/webp"
                                          onChange={(e) => {
                                            const file = e.target.files?.[0];
                                            if (!file) return;
                                            if (file.size > 100 * 1024) {
                                              showNotification("Ukuran file maksimal 100KB agar loading cepat.","error");
                                              return;
                                            }
                                            compressImage(file, { maxWidth: 128, maxHeight: 128, quality: 0.8 }).then(compressedBase64 => {
                                              setAppSettings({ ...appSettings, [iconKey]: compressedBase64 });
                                            });
                                          }}
                                          className="w-full border-none bg-slate-50 p-1.5 rounded-[var(--ui-radius-small)] text-[10px] font-bold focus:outline-[var(--ui-primary)] file:mr-2 file:py-1 file:px-2 file:rounded-[var(--ui-radius-small)] file:border-0 file:text-[9px] file:font-black file:bg-[var(--ui-primary)] file:text-white file:cursor-pointer"
                                        />
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Informasi Jurusan */}
                    {tampilanTab ==="footer" && (
                      <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
                    <div className="border-none rounded-[var(--ui-radius-small)] p-5 bg-slate-50/50 space-y-4">
                      <div>
                        <p className="text-[11px] font-black text-slate-800 uppercase tracking-widest">Informasi Program Keahlian / Jurusan Unggulan</p>
                        <p className="text-[10px] font-bold text-slate-500 mt-0.5">Kelola judul, subjudul, nama jurusan, singkatan badge, tagline, dan status akreditasi pada 4 card beranda.</p>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 mb-1.5 block">Judul Bagian</label>
                          <input 
                            type="text" 
                            placeholder="Program Keahlian Unggulan"
                            value={appSettings.trustedByText || ""} 
                            onChange={(e) => setAppSettings({ ...appSettings, trustedByText: e.target.value })} 
                            className="w-full border border-slate-200 bg-white p-2.5 rounded-[var(--ui-radius-control)] text-xs font-bold focus:outline-[var(--ui-primary)] shadow-xs" 
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 mb-1.5 block">Sub-Judul / Keterangan</label>
                          <input 
                            type="text" 
                            placeholder="Kompetensi keahlian terakreditasi berstandar industri & siap kerja global"
                            value={appSettings.trustedBySubtitle || ""} 
                            onChange={(e) => setAppSettings({ ...appSettings, trustedBySubtitle: e.target.value })} 
                            className="w-full border border-slate-200 bg-white p-2.5 rounded-[var(--ui-radius-control)] text-xs font-bold focus:outline-[var(--ui-primary)] shadow-xs" 
                          />
                        </div>
                      </div>

                      <div>
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 mb-1.5 block">Label Status Default (Kiri Bawah Card)</label>
                        <input 
                          type="text" 
                          placeholder="Standar Industri"
                          value={appSettings.programBottomTag || ""} 
                          onChange={(e) => setAppSettings({ ...appSettings, programBottomTag: e.target.value })} 
                          className="w-full border border-slate-200 bg-white p-2.5 rounded-[var(--ui-radius-control)] text-xs font-bold focus:outline-[var(--ui-primary)] shadow-xs" 
                        />
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {[1, 2, 3, 4].map((number) => {
                          const iconKey = `partnerIcon${number}`;
                          const selectedIcon = appSettings[iconKey] || ["book","chat","grid","users"][number - 1];
                          const selectedColor = appSettings[`partnerColor${number}`] || ["red","blue","purple","emerald"][number - 1];
                          const BANNER_COLORS = [
                            { value:"red", label:"Merah", bg:"bg-rose-500" },
                            { value:"blue", label:"Biru", bg:"bg-indigo-500" },
                            { value:"emerald", label:"Hijau", bg:"bg-emerald-500" },
                            { value:"purple", label:"Ungu", bg:"bg-purple-500" },
                            { value:"orange", label:"Oranye", bg:"bg-orange-500" },
                            { value:"cyan", label:"Sian", bg:"bg-cyan-500" },
                            { value:"pink", label:"Pink", bg:"bg-pink-500" },
                          ];
                          
                          return (
                            <div key={number} className="border-none rounded-[var(--ui-radius-small)] bg-white overflow-hidden shadow-sm flex flex-col">
                              <div className="bg-slate-50 border-b border-slate-200 px-4 py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                <span className="text-[11px] font-black text-slate-700 uppercase tracking-widest">Banner Jurusan {number}</span>
                                <div className="flex items-center gap-2.5">
                                  {/* Custom color input */}
                                  <div className="flex items-center gap-1">
                                    <input 
                                      type="color" 
                                      value={selectedColor.startsWith('#') ? selectedColor :"#3b82f6"} 
                                      onChange={(e) => setAppSettings({ ...appSettings, [`partnerColor${number}`]: e.target.value })}
                                      className="w-5 h-5 rounded-full border border-slate-200 cursor-pointer overflow-hidden p-0 bg-transparent shrink-0"
                                      title="Pilih Warna Kustom"
                                    />
                                    {selectedColor.startsWith('#') && (
                                      <span className="text-[9px] font-mono font-bold uppercase text-slate-500">{selectedColor}</span>
                                    )}
                                  </div>
                                  <div className="flex gap-1.5">
                                    {BANNER_COLORS.map(c => (
                                      <button
                                        key={c.value} 
                                        type="button"
                                        title={c.label}
                                        onClick={() =>setAppSettings({ ...appSettings, [`partnerColor${number}`]: c.value })}
                                        className={`w-5 h-5 rounded-full block border-2 transition-transform cursor-pointer ${c.bg} ${selectedColor === c.value ?'border-slate-800 scale-110' :'border-transparent hover:scale-110'}`}
                                      />
                                    ))}
                                  </div>
                                </div>
                              </div>
                              <div className="p-4 space-y-3 flex-1 flex flex-col">
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                                  <div className="sm:col-span-2">
                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 mb-1 block">Nama Jurusan</label>
                                    <input
                                      type="text"
                                      placeholder={["Teknik Kendaraan Ringan", "Teknik Komputer Jaringan", "Manajemen Perkantoran", "Akuntansi Keuangan"][number - 1] || "Nama Jurusan"}
                                      value={appSettings[`partner${number}`] || ""}
                                      onChange={(e) => setAppSettings({ ...appSettings, [`partner${number}`]: e.target.value })}
                                      className="w-full bg-white border border-slate-200 px-3 py-2 text-sm rounded-[var(--ui-radius-small)] focus:outline-none focus:border-[var(--ui-primary)] focus:ring-1 focus:ring-[var(--ui-primary)] transition-all font-bold text-slate-800"
                                    />
                                  </div>
                                  <div>
                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 mb-1 block">Singkatan / Badge</label>
                                    <input
                                      type="text"
                                      placeholder={getMajorAbbreviation(appSettings[`partner${number}`] || ["Teknik Kendaraan Ringan", "Teknik Komputer Jaringan", "Manajemen Perkantoran", "Akuntansi Keuangan"][number - 1], number)}
                                      value={appSettings[`partnerBadge${number}`] || ""}
                                      onChange={(e) => setAppSettings({ ...appSettings, [`partnerBadge${number}`]: e.target.value })}
                                      className="w-full bg-white border border-slate-200 px-3 py-2 text-sm rounded-[var(--ui-radius-small)] focus:outline-none focus:border-[var(--ui-primary)] focus:ring-1 focus:ring-[var(--ui-primary)] transition-all font-bold text-slate-800 uppercase"
                                    />
                                  </div>
                                </div>

                                <div>
                                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 mb-1 block">Deskripsi / Tagline Jurusan</label>
                                  <input
                                    type="text"
                                    placeholder={["Otomotif & Manufaktur Modern", "Jaringan & Komputasi Cloud", "Manajemen & Bisnis Digital", "Finansial & Lembaga Keuangan"][number - 1] || "Penjelasan singkat jurusan..."}
                                    value={appSettings[`partnerDesc${number}`] || ""}
                                    onChange={(e) => setAppSettings({ ...appSettings, [`partnerDesc${number}`]: e.target.value })}
                                    className="w-full bg-white border border-slate-200 px-3 py-2 text-sm rounded-[var(--ui-radius-small)] focus:outline-none focus:border-[var(--ui-primary)] focus:ring-1 focus:ring-[var(--ui-primary)] transition-all font-medium text-slate-600"
                                  />
                                </div>

                                <div>
                                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 mb-1 block">Teks Status / Label Bawah</label>
                                  <input
                                    type="text"
                                    placeholder={appSettings.programBottomTag || "Standar Industri"}
                                    value={appSettings[`partnerTag${number}`] || ""}
                                    onChange={(e) => setAppSettings({ ...appSettings, [`partnerTag${number}`]: e.target.value })}
                                    className="w-full bg-white border border-slate-200 px-3 py-2 text-sm rounded-[var(--ui-radius-small)] focus:outline-none focus:border-[var(--ui-primary)] focus:ring-1 focus:ring-[var(--ui-primary)] transition-all font-medium text-slate-600"
                                  />
                                </div>
                                <div>
                                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 mb-1 block">Ikon Banner</label>
                                  <div className="flex flex-wrap gap-1.5 rounded-[var(--ui-radius-small)] border border-slate-200 bg-white p-1.5" aria-label={`Pilih ikon jurusan ${number}`}>
                                    {MAJOR_ICON_OPTIONS.map((option) => {
                                      const Icon = option.icon;
                                      const isSelected = selectedIcon === option.value;
                                      return (
                                        <button
                                          key={`${number}-${option.value}`}
                                          type="button"
                                          title={option.label}
                                          onClick={() => setAppSettings({ ...appSettings, [iconKey]: option.value })}
                                          className={`flex items-center justify-center w-7 h-7 rounded-[var(--ui-radius-small)] transition-colors cursor-pointer border-none ${
                                            isSelected
                                              ?"bg-slate-800 text-white shadow-sm"
                                              :"bg-transparent text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                                          }`}
                                        >
                                          <Icon size={14} strokeWidth={isSelected ? 2.5 : 2} /></button>
                                      );
                                    })}
                                  </div>
                                </div>
                                <div className="mt-auto pt-2">
                                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 mb-1 block">Ilustrasi (Opsional, PNG Transparan)</label>
                                  <div className="flex items-center gap-2">
                                    <div className="w-12 h-12 rounded-[var(--ui-radius-small)] shrink-0 bg-slate-100 border-none flex items-center justify-center overflow-hidden">
                                      {appSettings[`partnerImage${number}`] ? (
                                        <img src={appSettings[`partnerImage${number}`]} alt="Preview" className="w-full h-full object-contain p-1" />
                                      ) : (
                                        <ImageIcon size={16} className="text-slate-300" />
                                      )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <input 
                                        type="file" 
                                        accept="image/png,image/webp,image/jpeg" 
                                        onChange={(e) => {
                                          const file = e.target.files?.[0];
                                          if (file) {
                                            if (file.size > 1024 * 1024) {
                                              showNotification("Ukuran maksimal gambar adalah 1MB!","error");
                                              return;
                                            }
                                            compressImage(file, { maxWidth: 400, maxHeight: 400, quality: 0.8 }).then(compressedBase64 => {
                                              setAppSettings({ ...appSettings, [`partnerImage${number}`]: compressedBase64 });
                                            });
                                          }
                                        }} 
                                        className="w-full text-[10px] file:mr-2 file:py-1.5 file:px-3 file:rounded-[var(--ui-radius-small)] file:border-0 file:text-[10px] file:font-black file:bg-[var(--ui-primary)] file:text-white file:cursor-pointer hover:file:bg-[var(--ui-primary)]/90 cursor-pointer"
                                      />
                                      {appSettings[`partnerImage${number}`] && (
                                        <button 
                                          type="button" 
                                          onClick={() =>setAppSettings({ ...appSettings, [`partnerImage${number}`]:"" })}
                                          className="mt-2 text-[10px] font-bold text-rose-500 hover:text-rose-600 border border-rose-200 hover:border-rose-300 bg-rose-50 rounded-[var(--ui-radius-small)] px-3 py-1 cursor-pointer transition-colors w-max"
                                        >
                                          Hapus Ilustrasi
                                        </button>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                    </div>
                    )}



                    {/* KOLOM KANAN -> Footer & Kontak*/}
                    {tampilanTab ==="footer" && (
                      <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
                    {/* Kontak & Footer */}
                    <div className="border-none rounded-[var(--ui-radius-small)] p-5 bg-slate-50/50 space-y-4">
                      <p className="text-[11px] font-black text-slate-800 uppercase tracking-widest">Kontak & Footer Publik</p>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 mb-2 block">Email Kontak</label>
                          <input type="email" value={appSettings.contactEmail ||""} onChange={(e) => setAppSettings({ ...appSettings, contactEmail: e.target.value })} placeholder="admin@school.sch.id" className="w-full border border-slate-200 bg-white p-2.5 rounded-[var(--ui-radius-control)] text-xs font-bold focus:outline-[var(--ui-primary)] shadow-xs" />
                        </div>
                        <div>
                          <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 mb-2 block">Telepon</label>
                          <input type="text" value={appSettings.contactPhone ||""} onChange={(e) => setAppSettings({ ...appSettings, contactPhone: e.target.value })} placeholder="+62 123-456-789" className="w-full border border-slate-200 bg-white p-2.5 rounded-[var(--ui-radius-control)] text-xs font-bold focus:outline-[var(--ui-primary)] shadow-xs" />
                        </div>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 mb-2 block">Nama Instansi / Sekolah (Footer)</label>
                          <input type="text" value={appSettings.instansiName ||""} onChange={(e) => setAppSettings({ ...appSettings, instansiName: e.target.value, schoolName: e.target.value })} placeholder="Institusi Pendidikan Terpadu" className="w-full border border-slate-200 bg-white p-2.5 rounded-[var(--ui-radius-control)] text-xs font-bold focus:outline-[var(--ui-primary)] shadow-xs" />
                        </div>
                        <div>
                          <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 mb-2 block">Teks Footer (Copyright)</label>
                          <input type="text" value={appSettings.footerText ||""} onChange={(e) => setAppSettings({ ...appSettings, footerText: e.target.value })} placeholder="© 2026..." className="w-full border border-slate-200 bg-white p-2.5 rounded-[var(--ui-radius-control)] text-xs font-bold focus:outline-[var(--ui-primary)] shadow-xs" />
                        </div>
                      </div>

                      <div className="pt-2 border-t border-slate-200/60 mt-4">
                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 mb-3">Tautan Media Sosial</p>
                        <div className="space-y-3">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-[var(--ui-radius-small)] bg-pink-100 text-pink-500 flex items-center justify-center shrink-0"><Instagram size={14} /></div>
                            <input type="text" placeholder="https://instagram.com/..." value={appSettings.socialInstagram ||""} onChange={(e) => setAppSettings({ ...appSettings, socialInstagram: e.target.value })} className="flex-1 border border-slate-200 bg-white p-2 rounded-[var(--ui-radius-control)] text-xs font-bold focus:outline-[var(--ui-primary)] shadow-xs" />
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-[var(--ui-radius-small)] bg-indigo-100 text-indigo-500 flex items-center justify-center shrink-0"><Send size={14} /></div>
                            <input type="text" placeholder="https://t.me/..." value={appSettings.socialTelegram ||""} onChange={(e) => setAppSettings({ ...appSettings, socialTelegram: e.target.value })} className="flex-1 border border-slate-200 bg-white p-2 rounded-[var(--ui-radius-control)] text-xs font-bold focus:outline-[var(--ui-primary)] shadow-xs" />
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-[var(--ui-radius-small)] bg-indigo-100 text-indigo-700 flex items-center justify-center shrink-0"><Facebook size={14} /></div>
                            <input type="text" placeholder="https://facebook.com/..." value={appSettings.socialFacebook ||""} onChange={(e) => setAppSettings({ ...appSettings, socialFacebook: e.target.value })} className="flex-1 border border-slate-200 bg-white p-2 rounded-[var(--ui-radius-control)] text-xs font-bold focus:outline-[var(--ui-primary)] shadow-xs" />
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-[var(--ui-radius-small)] bg-rose-100 text-rose-600 flex items-center justify-center shrink-0"><Youtube size={14} /></div>
                            <input type="text" placeholder="https://youtube.com/..." value={appSettings.socialYoutube ||""} onChange={(e) => setAppSettings({ ...appSettings, socialYoutube: e.target.value })} className="flex-1 border border-slate-200 bg-white p-2 rounded-[var(--ui-radius-control)] text-xs font-bold focus:outline-[var(--ui-primary)] shadow-xs" />
                          </div>
                        </div>
                      </div>
                    </div>
                    </div>
                    )}

                    {/* Mitra Kerjasama */}
                    {tampilanTab ==="mitra" && (
                      <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
                        <div className="border-none rounded-[var(--ui-radius-small)] p-5 bg-slate-50/50 space-y-4">
                          <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2">
                            <div>
                              <p className="text-[11px] font-black text-slate-800 uppercase tracking-widest">Mitra Perusahaan / Sertifikasi</p>
                              <p className="text-[10px] font-bold text-slate-500 mt-0.5">Daftar logo perusahaan/institusi yang akan tampil meluncur di halaman beranda.</p>
                            </div>
                            <Button variant="outline" 
                              type="button" 
                              onClick={() =>{
                                const currentMitras = appSettings.mitraKerjasama || [];
                                setAppSettings({ 
                                  ...appSettings, 
                                  mitraKerjasama: [...currentMitras, { id: Date.now(), name:"", image:"" }] 
                                });
                              }}
                              
                            >
                              + Tambah Mitra</Button>
                          </div>
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                            {(appSettings.mitraKerjasama || []).map((mitra, index) => (
                              <div key={mitra.id || index} className="border-none bg-white rounded-[var(--ui-radius-card)] p-4 flex gap-4 shadow-sm items-center relative group">
                                <div className="w-16 h-16 bg-slate-50 border-none rounded-[var(--ui-radius-small)] overflow-hidden flex-shrink-0 flex items-center justify-center">
                                  {mitra.image ? (
                                    <img src={mitra.image} alt={mitra.name} className="w-full h-full object-contain p-2" />
                                  ) : (
                                    <ImageIcon size={20} className="text-slate-300" />
                                  )}
                                </div>
                                <div className="flex-1 min-w-0 flex flex-col gap-2">
                                  <input 
                                    type="text" 
                                    placeholder="Nama Mitra" 
                                    value={mitra.name}
                                    onChange={(e) => {
                                      const newMitras = [...(appSettings.mitraKerjasama || [])];
                                      newMitras[index] = { ...mitra, name: e.target.value };
                                      setAppSettings({ ...appSettings, mitraKerjasama: newMitras });
                                    }}
                                    className="w-full border-none bg-slate-50 p-2 rounded-[var(--ui-radius-small)] text-xs font-bold focus:outline-[var(--ui-primary)]"
                                  />
                                  <input 
                                    type="file" 
                                    accept="image/png,image/jpeg,image/webp,image/svg+xml"
                                    onChange={(e) => {
                                      const file = e.target.files?.[0];
                                      if (file) {
                                        if (file.size > 1024 * 1024) {
                                          showNotification("Ukuran maksimal 1MB!","error");
                                          return;
                                        }
                                        compressImage(file, { maxWidth: 400, maxHeight: 400, quality: 0.8 }).then(compressedBase64 => {
                                          const newMitras = [...(appSettings.mitraKerjasama || [])];
                                          newMitras[index] = { ...mitra, image: compressedBase64 };
                                          setAppSettings({ ...appSettings, mitraKerjasama: newMitras });
                                        });
                                      }
                                    }}
                                    className="w-full text-[10px] file:mr-2 file:py-1 file:px-2 file:rounded-[var(--ui-radius-small)] file:border-0 file:text-[10px] file:font-bold file:bg-[var(--ui-primary)] file:text-white file:cursor-pointer hover:file:opacity-90"
                                  />
                                </div>
                                <Button variant="outline" 
                                  type="button" 
                                  onClick={async () =>{
                                    if(await window.confirmAsync("Hapus mitra ini?")) {
                                      const newMitras = [...(appSettings.mitraKerjasama || [])];
                                      newMitras.splice(index, 1);
                                      setAppSettings({ ...appSettings, mitraKerjasama: newMitras });
                                    }
                                  }}
                                  className="absolute top-2 right-2"
                                  title="Hapus"
                                >
                                  <Trash2 size={14} /></Button>
                              </div>
                            ))}
                            {(!appSettings.mitraKerjasama || appSettings.mitraKerjasama.length === 0) && (
                              <div className="col-span-full py-8 text-center border-2 border-dashed border-slate-200 rounded-[var(--ui-radius-small)] text-slate-500 font-bold text-xs">
                                Belum ada mitra. Klik"Tambah Mitra" untuk mulai.
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Pengaturan Tema */}
                    {tampilanTab ==="tema" && (
                      <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
                    <div className="border-none rounded-[var(--ui-radius-small)] p-5 bg-slate-50/50 space-y-4">
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <Button 
                          type="button"
                          onClick={applySafeColors}
                          className="bg-emerald-700 text-white hover:bg-emerald-800 border-none font-black text-xs px-4 py-2.5 rounded-[var(--ui-radius-control)] shadow-xs cursor-pointer flex items-center gap-2"
                        >
                          <ShieldCheck size={14} />
                          <span>Setel Ke Warna Aman & Standar</span>
                        </Button>
                        <Button variant="outline" type="button" onClick={applyAutoRecommendedTheme} >Auto Rekomendasi Tema</Button>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-2">
                        {THEME_PRESETS.map((p) => (
                          <Button variant="outline" key={p.name} type="button" onClick={() =>applyThemePreset(p)} className="cursor-pointer">
                            {p.name}</Button>
                        ))}
                      </div>
                      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 pt-3">
                        {[
                          { label: "Utama", key: "primaryColor", fallback: "#064e3b" },
                          { label: "Aksen", key: "accentColor", fallback: "#a3e635" },
                          { label: "Tombol Primary", key: "primaryButtonColor", fallback: appSettings.primaryColor || "#064e3b" },
                          { label: "Tombol Aksen", key: "actionButtonColor", fallback: appSettings.accentColor || "#a3e635" },
                        ].map((colorItem) => (
                          <div key={colorItem.key} className="flex flex-col gap-1.5">
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 block">
                              {colorItem.label}
                            </label>
                            <div className="flex items-center gap-2">
                              <input 
                                type="color" 
                                value={appSettings[colorItem.key] || colorItem.fallback} 
                                onChange={(e) => setAppSettings({ ...appSettings, [colorItem.key]: e.target.value })} 
                                className="w-8 h-8 rounded-[var(--ui-radius-small)] border border-slate-200 cursor-pointer overflow-hidden p-0 bg-transparent shrink-0" 
                              />
                              <input 
                                type="text" 
                                value={appSettings[colorItem.key] || colorItem.fallback} 
                                onChange={(e) => setAppSettings({ ...appSettings, [colorItem.key]: e.target.value })} 
                                className="w-full border-none bg-white p-2 rounded-[var(--ui-radius-control)] text-[10px] font-mono font-bold uppercase focus:outline-[var(--ui-primary)] shadow-sm" 
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                      <div className="pt-2 grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 mb-2 block">Font Family</label>
                          <UISelect value={appSettings.fontFamily ||"Lexend"} onChange={(e) => setAppSettings({ ...appSettings, fontFamily: e.target.value })} className="w-full">
                            <option value="Lexend">Lexend</option><option value="Poppins">Poppins</option><option value="Nunito">Nunito</option>
                          </UISelect>
                        </div>
                        <div>
                          <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 mb-2 block">Gaya Sudut (Radius)</label>
                          <UISelect value={appSettings.uiRadius ||"md"} onChange={(e) => setAppSettings({ ...appSettings, uiRadius: e.target.value })} className="w-full">
                            <option value="sm">Kotak Halus (Small)</option>
                            <option value="md">Modern (Medium)</option>
                            <option value="lg">Melengkung (Large)</option>
                            <option value="full">Pil / Bulat (Full)</option>
                          </UISelect>
                        </div>
                      </div>

                      <div className="pt-4 border-t border-slate-200/60 mt-4 space-y-4">
                        <p className="text-[11px] font-black text-slate-850 uppercase tracking-widest">Desain Gaya & Estetika Visual (Premium & Berwarna)</p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 mb-2 block">Lebar Konten Layar (Layout Mode)</label>
                            <UISelect value={appSettings.layoutMode ||"full"} onChange={(e) => setAppSettings({ ...appSettings, layoutMode: e.target.value })} className="w-full">
                              <option value="full">Layar Penuh (Full Width)</option>
                              <option value="boxed">Terkotak di Tengah (Boxed Container)</option>
                            </UISelect>
                          </div>
                          <div>
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 mb-2 block">Gaya Sidebar Kiri</label>
                            <UISelect value={appSettings.sidebarStyle ||"putih"} onChange={(e) => setAppSettings({ ...appSettings, sidebarStyle: e.target.value })} className="w-full">
                              <option value="putih">Putih Bersih (Clean White)</option>
                              <option value="abu-abu">Abu-abu Lembut (Slate Soft)</option>
                              <option value="tema-utama">Berwarna (Primary Gradient)</option>
                            </UISelect>
                          </div>
                          <div>
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 mb-2 block">Logo & Teks Sidebar</label>
                            <UISelect value={appSettings.sidebarLogoMode ||"both"} onChange={(e) => setAppSettings({ ...appSettings, sidebarLogoMode: e.target.value })} className="w-full">
                              <option value="both">Tampilkan Logo & Nama Instansi</option>
                              <option value="logo">Hanya Logo (Logo Only)</option>
                              <option value="text">Hanya Teks (Text Only)</option>
                            </UISelect>
                          </div>
                          <div>
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 mb-2 block">Gaya Header Atas</label>
                            <UISelect value={appSettings.headerStyle ||"primary"} onChange={(e) => setAppSettings({ ...appSettings, headerStyle: e.target.value })} className="w-full">
                              <option value="primary">Berwarna Utama (Primary Brand)</option>
                              <option value="glass">Efek Transparan (Glassmorphism)</option>
                              <option value="solid">Putih Solid (Classic Card)</option>
                              <option value="minimal">Minimalis Tanpa Batas (Borderless)</option>
                            </UISelect>
                          </div>
                          <div>
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 mb-2 block">Desain Card / Panel</label>
                            <UISelect value={appSettings.cardStyle ||"border"} onChange={(e) => setAppSettings({ ...appSettings, cardStyle: e.target.value })} className="w-full">
                              <option value="border">Garis Batas Halus (Clean Border)</option>
                              <option value="shadow-sm">Bayangan Mengambang (Elevated Shadow)</option>
                              <option value="flat">Warna Datar Padat (Flat Filled)</option>
                            </UISelect>
                          </div>
                          <div>
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 mb-2 block">Intensitas Bayangan (Shadow System)</label>
                            <UISelect value={appSettings.shadowIntensity ||"default"} onChange={(e) => setAppSettings({ ...appSettings, shadowIntensity: e.target.value })} className="w-full">
                              <option value="default">Premium Berlapis (Subtle Glass)</option>
                              <option value="strong">Tegas & Menonjol (Strong Elevated)</option>
                              <option value="flat">Datar / Tipis (Flat Minimalist)</option>
                            </UISelect>
                          </div>
                          <div>
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 mb-2 block">Gaya Latar Belakang</label>
                            <UISelect value={appSettings.bgGridType ||"grid"} onChange={(e) => setAppSettings({ ...appSettings, bgGridType: e.target.value })} className="w-full">
                              <option value="grid">Garis Grid Modern (Modern Grid)</option>
                              <option value="dots">Titik Polkadot Lembut (Soft Polka Dots)</option>
                              <option value="gradient">Warna Radial Kalem (Radial Gradients)</option>
                              <option value="plain">Polos Tanpa Pola (Plain Backdrop)</option>
                            </UISelect>
                          </div>
                          <div>
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 mb-2 block">Gaya Form Input</label>
                            <UISelect value={appSettings.inputStyle ||"outline"} onChange={(e) => setAppSettings({ ...appSettings, inputStyle: e.target.value })} className="w-full">
                              <option value="outline">Garis Luar (Outline - Default)</option>
                              <option value="filled">Warna Latar (Filled / Muted)</option>
                              <option value="underline">Garis Bawah (Underline Modern)</option>
                            </UISelect>
                          </div>
                          <div>
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 mb-2 block">Gaya TabBar Mobile (Bawah)</label>
                            <UISelect 
                              value={appSettings.tabbarStyle || "top_line"} 
                              onChange={(e) => {
                                const val = e.target.value;
                                setAppSettings({ ...appSettings, tabbarStyle: val });
                                localStorage.setItem('kurmon_tabbar_nav_style', val);
                                window.dispatchEvent(new Event('kurmon_tabbar_style_changed'));
                              }} 
                              className="w-full"
                            >
                              <option value="top_line">Gaya 2: Garis Indikator Atas (Top Indicator Line)</option>
                              <option value="minimal">Gaya 1: Minimalis Bersih (Clean Minimal)</option>
                            </UISelect>
                          </div>
                        </div>
                      </div>
                      <div className="pt-4 border-t border-slate-200/60 mt-4 space-y-4">
                        <p className="text-[11px] font-black text-slate-850 uppercase tracking-widest">Aksesibilitas & Ukuran Teks</p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 mb-2 block">Ukuran Teks Global</label>
                            <UISelect value={appSettings.fontSizeScale || "normal"} onChange={(e) => setAppSettings({ ...appSettings, fontSizeScale: e.target.value })} className="w-full border-none bg-white p-3 rounded-[var(--ui-radius-control)] text-xs font-bold focus:outline-[var(--ui-primary)] shadow-sm">
                              <option value="kecil">Kecil (Compact — 13px)</option>
                              <option value="normal">Normal (Default — 15px)</option>
                              <option value="besar">Besar (Comfortable — 16.5px)</option>
                              <option value="sangat-besar">Sangat Besar (Accessible — 18px)</option>
                            </UISelect>
                          </div>
                          <div>
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 mb-2 block">Ukuran Tombol Sentuh</label>
                            <UISelect value={appSettings.touchTargetSize || "normal"} onChange={(e) => setAppSettings({ ...appSettings, touchTargetSize: e.target.value })} className="w-full border-none bg-white p-3 rounded-[var(--ui-radius-control)] text-xs font-bold focus:outline-[var(--ui-primary)] shadow-sm">
                              <option value="normal">Normal (Standard — 36px)</option>
                              <option value="besar">Besar (Accessible — 48px)</option>
                            </UISelect>
                          </div>
                        </div>
                      </div>
                      </div>
                    </div>
                    )}
                  </div>

                  {/* AREA BAWAH (PREVIEW + ADVANCED ACTIONS) */}
                  <div className="lg:col-span-4 space-y-6">
                  {/* Preview */}
                  <div className="ui-card rounded-[var(--ui-radius-card)] p-5 bg-white border border-[var(--ui-card-border-color,transparent)] shadow-[var(--ui-card-shadow,var(--ui-shadow-card))] flex flex-col sm:flex-row gap-5 items-center">
                    <div className="flex-1 w-full">
                      <p className="text-[10px] font-black text-slate-500 uppercase mb-2">Preview Tema</p>
                      <div className="rounded-[var(--ui-radius-small)] p-5 text-white shadow-inner flex flex-col gap-4 relative overflow-hidden group" style={{ background: appSettings.primaryColor ||"var(--ui-primary)", fontFamily: appSettings.fontFamily }}>
                        {/* Background accent */}
                        <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full blur-2xl -mr-10 -mt-10 pointer-events-none" />
                        
                        {/* Header Mini */}
                        <div className="flex items-center justify-between relative z-10">
                          <div className="flex items-center gap-2">
                            <div className="inline-block px-2.5 py-1 rounded-[var(--ui-radius-small)] text-xs font-bold shadow-sm" style={{ background: appSettings.accentColor ||"var(--ui-accent)", color: contrastRatio("#000000", appSettings.accentColor ||"#ffffff") > 4.5 ? "#000000" : "#ffffff" }}>{appSettings.logoText ||"TS"}</div>
                            <h4 className="font-black text-sm sm:text-base line-clamp-1 tracking-tight">{appSettings.appName}</h4>
                          </div>
                          <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center shadow-inner">
                            <div className="w-2 h-2 rounded-full bg-white animate-pulse" />
                          </div>
                        </div>

                        {/* Typography & Interactive Content */}
                        <div className="relative z-10 flex flex-col gap-3">
                          <div className="space-y-1">
                            <p className="text-[10px] font-black uppercase opacity-70 tracking-widest">{appSettings.fontFamily || "Font Utama"}</p>
                            <p className="text-xs font-medium opacity-90 leading-relaxed line-clamp-2">
                              {appSettings.heroTitle || "Aplikasi pengelolaan akademik inovatif dengan fitur absensi dan jurnal harian real-time."}
                            </p>
                          </div>
                          
                          {/* Mini Card & Buttons */}
                          <div className="bg-black/10 backdrop-blur-sm p-3 rounded-[var(--ui-radius-card)] border border-white/10 flex flex-wrap gap-2.5 items-center justify-between mt-1 transition-all hover:bg-black/15">
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div className="w-7 h-7 rounded-[var(--ui-radius-small)] flex items-center justify-center shadow-xs shrink-0" style={{ background: appSettings.primaryButtonColor ||"var(--ui-primary-btn)" }}>
                                <CheckCircle2 size={13} className="text-white" />
                              </div>
                              <div className="flex flex-col min-w-0">
                                <span className="text-[9px] font-bold opacity-80 uppercase tracking-wider truncate">Status Sistem</span>
                                <span className="text-[11px] font-black truncate">Aktif & Optimal</span>
                              </div>
                            </div>
                            <button type="button" className="text-[10px] font-black px-3 py-1.5 rounded-[var(--ui-radius-small)] shadow-sm hover:scale-105 active:scale-95 transition-all shrink-0 cursor-pointer border-none" style={{ background: appSettings.actionButtonColor ||"var(--ui-accent-btn)", color: contrastRatio("#000000", appSettings.actionButtonColor ||"#ffffff") > 4.5 ? "#000000" : "#ffffff" }}>
                              Coba Hover
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="w-full sm:w-40 text-center sm:text-left space-y-2 shrink-0">
                      <p className="text-[10px] font-black text-slate-700 uppercase tracking-widest">Kontras</p>
                      <p className="text-xl font-black text-slate-800">{contrastRatio(appSettings.textColor ||"#0f172a", appSettings.bgColor ||"#f8fafc").toFixed(2)} : 1</p>
                      {contrastRatio(appSettings.textColor ||"#0f172a", appSettings.bgColor ||"#f8fafc") < 4.5 ? (
                        <p className="text-rose-600 text-[10px] font-bold bg-rose-50 p-2 rounded-[var(--ui-radius-small)] border border-rose-100"><AlertTriangle size={14} className="inline mr-1" /> Sulit dibaca.</p>
                      ) : (
                        <p className="text-emerald-600 text-[10px] font-bold bg-emerald-50 p-2 rounded-[var(--ui-radius-small)] border border-emerald-100"><CheckCircle2 size={14} className="inline mr-1" /> Ideal.</p>
                      )}
                      <Button variant="outline" type="button" onClick={autoFixContrast} className="w-full mt-2 text-xs font-bold border-slate-200 hover:bg-slate-50 shadow-sm">Perbaiki Kontras</Button>
                    </div>
                  </div>

                  {/* Preset Custom & Export */}
                  <div className="border-none rounded-[var(--ui-radius-small)] p-5 bg-slate-50/50 space-y-4">
                    <p className="text-[11px] font-black text-slate-800 uppercase tracking-widest">Preset & Export</p>
                    <div className="flex gap-2">
                      <input type="text" value={newPresetName} onChange={(e) => setNewPresetName(e.target.value)} placeholder="Nama preset baru..." className="flex-1 border-none bg-white px-3 py-2 rounded-[var(--ui-radius-small)] text-xs font-bold shadow-sm" />
                      <Button variant="outline" type="button" onClick={saveCurrentAsPreset} >Simpan</Button>
                    </div>
                    {customThemePresets && customThemePresets.length > 0 && (
                      <div className="grid grid-cols-1 gap-2 max-h-24 overflow-y-auto custom-scrollbar">
                        {customThemePresets.map((p) => (
                          <div key={p.name} className="flex items-center justify-between gap-2 border-none bg-white rounded-[var(--ui-radius-small)] px-3 py-2 shadow-sm">
                            <span className="text-xs font-bold text-slate-700 truncate">{p.name}</span>
                            <div className="flex gap-1 shrink-0">
                              <Button variant="outline" type="button" onClick={() =>applyThemePreset(p)} className="cursor-pointer">Pakai</Button>
                              <Button variant="outline" type="button" onClick={() =>setCustomThemePresets(customThemePresets.filter((x) => x.name !== p.name))} className="cursor-pointer">Hapus</Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                    <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-200">
                      <Button variant="outline" type="button" onClick={resetThemeDefaults} >Reset Default</Button>
                      <Button variant="outline" type="button" onClick={exportThemeJson} >Export JSON</Button>
                      <label className="text-xs font-bold border-none rounded-[var(--ui-radius-small)] px-4 py-2 bg-white cursor-pointer hover:bg-slate-50 shadow-sm transition-all flex items-center justify-center">
                        Import JSON
                        <input type="file" accept=".json" onChange={importThemeJson} className="hidden" />
                      </label>
                    </div>
                  </div>
                </div>

                </div>
                </div>
            </div>
          </div>
        );

}
