import { Button } from '../../../components/ui.jsx';
import React from'react';
import { MonitorSmartphone, LayoutTemplate, Palette, GraduationCap, Building2, Grid, Settings, LayoutDashboard, MessageSquare, KeyRound, DatabaseBackup } from'lucide-react';
import { compressImage } from'../../../utils/imageUtils.js';
import { applyDocumentBranding } from '../../../utils/branding.js';
import { Save, RotateCcw, ImageIcon, Send, Trash2, CheckCircle2 } from'lucide-react';
import { PageHeader } from '../../../components/monitoring/ui/index.js';
;
import { UISelect } from'../../../components/ui.jsx';


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

  React.useEffect(() => {
    setAppSettings({
      ...globalAppSettings,
      heroTitleColor: globalAppSettings.heroTitleColor ||"#1e293b",
      heroSubtitleColor: globalAppSettings.heroSubtitleColor ||"#64748b",
      heroHighlightColor: globalAppSettings.heroHighlightColor || globalAppSettings.primaryColor ||"#00bfa5",
    });
  }, [globalAppSettings]);

  // Real-time live theme preview while editing
  React.useEffect(() => {
    if (appSettings) {
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
            <div className="bg-white border-none rounded-[var(--ui-radius-card)] shadow-sm p-6 flex flex-col">
              <div className="space-y-6">
                {/* Horizontal Tabs & Action Button - Modernized */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-2 border-b border-slate-100">
                  <div className="flex flex-wrap gap-2 p-1.5 bg-slate-50 border-none rounded-[var(--ui-radius-small)] w-fit">
                    {[
                      { id:"umum", label:"Identitas Utama", icon: LayoutTemplate },
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
                              <input type="text" value={appSettings.appName} onChange={(e) => setAppSettings({ ...appSettings, appName: e.target.value })} className="w-full border-none bg-white p-3 rounded-[var(--ui-radius-card)] text-sm font-bold focus:outline-[var(--ui-primary)] shadow-sm" />
                            </div>
                            <div className="sm:col-span-3">
                              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 mb-2 block">Teks Tagline (Atas Logo)</label>
                              <input type="text" placeholder="PORTAL" value={appSettings.logoSmallText !== undefined ? appSettings.logoSmallText :"PORTAL"} onChange={(e) => setAppSettings({ ...appSettings, logoSmallText: e.target.value })} className="w-full border-none bg-white p-3 rounded-[var(--ui-radius-card)] text-sm font-bold focus:outline-[var(--ui-primary)] shadow-sm" />
                            </div>
                            <div className="sm:col-span-3">
                              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 mb-2 block">Subjudul / Versi</label>
                              <input type="text" value={appSettings.appSubtitle ||""} placeholder="Contoh: v0.5.15" onChange={(e) => setAppSettings({ ...appSettings, appSubtitle: e.target.value })} className="w-full border-none bg-white p-3 rounded-[var(--ui-radius-card)] text-sm font-bold focus:outline-[var(--ui-primary)] shadow-sm" />
                            </div>
                            <div className="sm:col-span-2">
                              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 mb-2 block">Logo Singkat</label>
                              <input type="text" maxLength={4} value={appSettings.logoText ||"TS"} onChange={(e) => setAppSettings({ ...appSettings, logoText: e.target.value.toUpperCase() })} className="w-full border-none bg-white p-3 rounded-[var(--ui-radius-card)] text-sm font-bold focus:outline-[var(--ui-primary)] shadow-sm text-center" />
                            </div>
                          </div>
                          
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pt-1">
                            <div>
                              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 mb-2 block">Nama Tampilan Web (Browser Title)</label>
                              <input type="text" placeholder="Contoh: KG2 School | Jadwal & Denah" value={appSettings.siteTitle ||""} onChange={(e) => setAppSettings({ ...appSettings, siteTitle: e.target.value })} className="w-full border-none bg-white p-3 rounded-[var(--ui-radius-card)] text-xs font-bold focus:outline-[var(--ui-primary)] shadow-sm" />
                            </div>
                            <div>
                              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 mb-2 block">Deskripsi Web (Meta Description)</label>
                              <textarea placeholder="Deskripsi ringkas website untuk pencarian Google / SEO..." value={appSettings.siteDescription ||""} onChange={(e) => setAppSettings({ ...appSettings, siteDescription: e.target.value })} className="w-full border-none bg-white p-3 rounded-[var(--ui-radius-card)] text-xs font-bold focus:outline-[var(--ui-primary)] shadow-sm h-11 resize-none" />
                            </div>
                            <div>
                              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 mb-2 block">Ukuran Kertas Default (PDF/Cetak)</label>
                              <UISelect value={appSettings.defaultPaperSize ||"A4"} onChange={(e) => setAppSettings({ ...appSettings, defaultPaperSize: e.target.value })} className="w-full border-none bg-white p-2.5 rounded-[var(--ui-radius-card)] text-xs font-bold focus:outline-[var(--ui-primary)] shadow-sm h-11">
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
                          <div>
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 mb-2 block">Headline Utama</label>
                            <input type="text" value={appSettings.heroTitle} onChange={(e) => setAppSettings({ ...appSettings, heroTitle: e.target.value })} className="w-full border-none bg-white p-3 rounded-[var(--ui-radius-card)] text-sm font-bold focus:outline-[var(--ui-primary)] shadow-sm" />
                          </div>
                          <div>
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 mb-2 block">Subjudul Penjelasan</label>
                            <textarea value={appSettings.heroSubtitle} onChange={(e) => setAppSettings({ ...appSettings, heroSubtitle: e.target.value })} className="w-full border-none bg-white p-3 rounded-[var(--ui-radius-card)] text-sm font-bold focus:outline-[var(--ui-primary)] shadow-sm h-24 resize-none"></textarea>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            <div>
                              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 mb-2 block">Warna Teks Headline</label>
                              <input type="color" value={appSettings.heroTitleColor ||"#1e293b"} onChange={(e) => setAppSettings({ ...appSettings, heroTitleColor: e.target.value })} className="w-full h-8 border-none bg-white rounded-[var(--ui-radius-small)] cursor-pointer shadow-sm" />
                            </div>
                            <div>
                              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 mb-2 block">Warna Teks Subjudul</label>
                              <input type="color" value={appSettings.heroSubtitleColor ||"#64748b"} onChange={(e) => setAppSettings({ ...appSettings, heroSubtitleColor: e.target.value })} className="w-full h-8 border-none bg-white rounded-[var(--ui-radius-small)] cursor-pointer shadow-sm" />
                            </div>
                            <div>
                              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 mb-2 block">Warna Garis Coretan</label>
                              <input type="color" value={appSettings.heroHighlightColor || appSettings.primaryColor ||"#00bfa5"} onChange={(e) => setAppSettings({ ...appSettings, heroHighlightColor: e.target.value })} className="w-full h-8 border-none bg-white rounded-[var(--ui-radius-small)] cursor-pointer shadow-sm" />
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
                                className="flex-1 border-none bg-white p-2 rounded-[var(--ui-radius-card)] text-sm font-medium focus:outline-[var(--ui-primary)] shadow-sm file:mr-3 file:py-1.5 file:px-4 file:rounded-[var(--ui-radius-card)] file:border-0 file:text-xs file:font-bold file:bg-[var(--ui-primary)] file:text-white hover:file:opacity-90 file:cursor-pointer" 
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
                            <textarea value={appSettings.footerDescription ||""} onChange={(e) => setAppSettings({ ...appSettings, footerDescription: e.target.value })} className="w-full border-none bg-white p-3 rounded-[var(--ui-radius-card)] text-sm font-bold focus:outline-[var(--ui-primary)] shadow-sm h-24 resize-none"></textarea>
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

                    {/* Menu Layanan */}
                    {tampilanTab ==="layanan" && (
                      <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
                        <div className="border-none rounded-[var(--ui-radius-small)] p-5 bg-slate-50/50 space-y-4">
                          <div>
                            <p className="text-[11px] font-black text-slate-800 uppercase tracking-widest">Kustomisasi Menu Layanan Publik</p>
                            <p className="text-[10px] font-bold text-slate-500 mt-0.5">Ubah nama teks, warna tema, dan upload file icon kustom Anda untuk 7 menu utama di halaman beranda.</p>
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
                      <p className="text-[11px] font-black text-slate-800 uppercase tracking-widest">Informasi Jurusan / Program</p>
                      <div>
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 mb-2 block">Teks Pengantar</label>
                        <input type="text" value={appSettings.trustedByText ||""} onChange={(e) => setAppSettings({ ...appSettings, trustedByText: e.target.value })} className="w-full border-none bg-white p-3 rounded-[var(--ui-radius-card)] text-xs font-bold focus:outline-[var(--ui-primary)] shadow-sm" />
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {[1, 2, 3, 4].map((number) => {
                          const iconKey = `partnerIcon${number}`;
                          const selectedIcon = appSettings[iconKey] || ["book","chat","grid","users"][number - 1];
                          const selectedColor = appSettings[`partnerColor${number}`] || ["red","blue","purple","emerald"][number - 1];
                          const BANNER_COLORS = [
                            { value:"red", label:"Merah", bg:"bg-rose-500" },
                            { value:"blue", label:"Biru", bg:"bg-blue-500" },
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
                                <div>
                                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 mb-1 block">Nama Jurusan</label>
                                  <input
                                    type="text"
                                    placeholder="Contoh: Rekayasa Perangkat Lunak"
                                    value={appSettings[`partner${number}`] ||""}
                                    onChange={(e) => setAppSettings({ ...appSettings, [`partner${number}`]: e.target.value })}
                                    className="w-full bg-white border border-slate-200 px-3 py-2 text-sm rounded-[var(--ui-radius-small)] focus:outline-none focus:border-[var(--ui-primary)] focus:ring-1 focus:ring-[var(--ui-primary)] transition-all font-bold text-slate-800"
                                  />
                                </div>
                                <div>
                                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 mb-1 block">Deskripsi Singkat</label>
                                  <input
                                    type="text"
                                    placeholder="Penjelasan singkat jurusan..."
                                    value={appSettings[`partnerDesc${number}`] ||""}
                                    onChange={(e) => setAppSettings({ ...appSettings, [`partnerDesc${number}`]: e.target.value })}
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
                          <input type="email" value={appSettings.contactEmail ||""} onChange={(e) => setAppSettings({ ...appSettings, contactEmail: e.target.value })} placeholder="admin@school.sch.id" className="w-full border-none bg-white p-3 rounded-[var(--ui-radius-card)] text-xs font-bold focus:outline-[var(--ui-primary)] shadow-sm" />
                        </div>
                        <div>
                          <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 mb-2 block">Telepon</label>
                          <input type="text" value={appSettings.contactPhone ||""} onChange={(e) => setAppSettings({ ...appSettings, contactPhone: e.target.value })} placeholder="+62 123-456-789" className="w-full border-none bg-white p-3 rounded-[var(--ui-radius-card)] text-xs font-bold focus:outline-[var(--ui-primary)] shadow-sm" />
                        </div>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 mb-2 block">Nama Instansi / Sekolah (Footer)</label>
                          <input type="text" value={appSettings.instansiName ||""} onChange={(e) => setAppSettings({ ...appSettings, instansiName: e.target.value })} placeholder="Institusi Pendidikan Terpadu" className="w-full border-none bg-white p-3 rounded-[var(--ui-radius-card)] text-xs font-bold focus:outline-[var(--ui-primary)] shadow-sm" />
                        </div>
                        <div>
                          <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 mb-2 block">Teks Footer (Copyright)</label>
                          <input type="text" value={appSettings.footerText ||""} onChange={(e) => setAppSettings({ ...appSettings, footerText: e.target.value })} placeholder="© 2026..." className="w-full border-none bg-white p-3 rounded-[var(--ui-radius-card)] text-xs font-bold focus:outline-[var(--ui-primary)] shadow-sm" />
                        </div>
                      </div>

                      <div className="pt-2 border-t border-slate-200/60 mt-4">
                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 mb-3">Tautan Media Sosial</p>
                        <div className="space-y-3">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-[var(--ui-radius-small)] bg-pink-100 text-pink-500 flex items-center justify-center shrink-0"><Instagram size={14} /></div>
                            <input type="text" placeholder="https://instagram.com/..." value={appSettings.socialInstagram ||""} onChange={(e) => setAppSettings({ ...appSettings, socialInstagram: e.target.value })} className="flex-1 border-none bg-white p-2 rounded-[var(--ui-radius-card)] text-xs font-bold focus:outline-[var(--ui-primary)] shadow-sm" />
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-[var(--ui-radius-small)] bg-blue-100 text-blue-500 flex items-center justify-center shrink-0"><Send size={14} /></div>
                            <input type="text" placeholder="https://t.me/..." value={appSettings.socialTelegram ||""} onChange={(e) => setAppSettings({ ...appSettings, socialTelegram: e.target.value })} className="flex-1 border-none bg-white p-2 rounded-[var(--ui-radius-card)] text-xs font-bold focus:outline-[var(--ui-primary)] shadow-sm" />
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-[var(--ui-radius-small)] bg-blue-100 text-blue-700 flex items-center justify-center shrink-0"><Facebook size={14} /></div>
                            <input type="text" placeholder="https://facebook.com/..." value={appSettings.socialFacebook ||""} onChange={(e) => setAppSettings({ ...appSettings, socialFacebook: e.target.value })} className="flex-1 border-none bg-white p-2 rounded-[var(--ui-radius-card)] text-xs font-bold focus:outline-[var(--ui-primary)] shadow-sm" />
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-[var(--ui-radius-small)] bg-red-100 text-rose-600 flex items-center justify-center shrink-0"><Youtube size={14} /></div>
                            <input type="text" placeholder="https://youtube.com/..." value={appSettings.socialYoutube ||""} onChange={(e) => setAppSettings({ ...appSettings, socialYoutube: e.target.value })} className="flex-1 border-none bg-white p-2 rounded-[var(--ui-radius-card)] text-xs font-bold focus:outline-[var(--ui-primary)] shadow-sm" />
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
                          variant="outline" 
                          type="button" 
                          onClick={applySafeColors}
                          className="bg-emerald-700 text-white hover:bg-emerald-800 border-none font-black text-xs px-4 py-2.5 rounded-[var(--ui-radius-card)] shadow-xs cursor-pointer flex items-center gap-2"
                        >
                          🛡️ Setel Ke Warna Aman &amp; Standar
                        </Button>
                        <Button variant="outline" type="button" onClick={applyAutoRecommendedTheme} >Auto Rekomendasi Tema</Button>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-2">
                        {THEME_PRESETS.map((p) => (
                          <Button variant="outline" key={p.name} type="button" onClick={() =>applyThemePreset(p)} className="cursor-pointer">
                            {p.name}</Button>
                        ))}
                      </div>
                      <div className="grid grid-cols-3 gap-3 pt-3">
                        <div>
                          <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 mb-1 block">Utama</label>
                          <input type="color" value={appSettings.primaryColor ||"#064e3b"} onChange={(e) => setAppSettings({ ...appSettings, primaryColor: e.target.value })} className="w-full h-8 border-none bg-white rounded-[var(--ui-radius-small)] cursor-pointer" />
                        </div>
                        <div>
                          <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 mb-1 block">Aksen</label>
                          <input type="color" value={appSettings.accentColor ||"#a3e635"} onChange={(e) => setAppSettings({ ...appSettings, accentColor: e.target.value })} className="w-full h-8 border-none bg-white rounded-[var(--ui-radius-small)] cursor-pointer" />
                        </div>
                        <div>
                          <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 mb-1 block">Tombol Primary</label>
                          <input type="color" value={appSettings.primaryButtonColor || appSettings.primaryColor ||"#064e3b"} onChange={(e) => setAppSettings({ ...appSettings, primaryButtonColor: e.target.value })} className="w-full h-8 border-none bg-white rounded-[var(--ui-radius-small)] cursor-pointer" />
                        </div>
                        <div>
                          <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 mb-1 block">Tombol Aksen</label>
                          <input type="color" value={appSettings.actionButtonColor || appSettings.accentColor ||"#a3e635"} onChange={(e) => setAppSettings({ ...appSettings, actionButtonColor: e.target.value })} className="w-full h-8 border-none bg-white rounded-[var(--ui-radius-small)] cursor-pointer" />
                        </div>
                        <div>
                          <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 mb-1 block">Background Web (BG)</label>
                          <input type="color" value={appSettings.bgColor ||"#f8fafc"} onChange={(e) => setAppSettings({ ...appSettings, bgColor: e.target.value })} className="w-full h-8 border-none bg-white rounded-[var(--ui-radius-small)] cursor-pointer" />
                        </div>
                        <div>
                          <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 mb-1 block">Warna Kartu/Box (Surface)</label>
                          <input type="color" value={appSettings.surfaceColor ||"#ffffff"} onChange={(e) => setAppSettings({ ...appSettings, surfaceColor: e.target.value })} className="w-full h-8 border-none bg-white rounded-[var(--ui-radius-small)] cursor-pointer" />
                        </div>
                        <div>
                          <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 mb-1 block">Teks Utama</label>
                          <input type="color" value={appSettings.textColor ||"#0f172a"} onChange={(e) => setAppSettings({ ...appSettings, textColor: e.target.value })} className="w-full h-8 border-none bg-white rounded-[var(--ui-radius-small)] cursor-pointer" />
                        </div>
                        <div>
                          <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 mb-1 block">Teks Kartu/Box</label>
                          <input type="color" value={appSettings.cardTextColor || (appSettings.textColor || "#0f172a")} onChange={(e) => setAppSettings({ ...appSettings, cardTextColor: e.target.value })} className="w-full h-8 border-none bg-white rounded-[var(--ui-radius-small)] cursor-pointer" />
                        </div>
                      </div>
                      <div className="pt-2 grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 mb-2 block">Font Family</label>
                          <UISelect value={appSettings.fontFamily ||"Lexend"} onChange={(e) => setAppSettings({ ...appSettings, fontFamily: e.target.value })} className="w-full border-none bg-white p-3 rounded-[var(--ui-radius-card)] text-xs font-bold focus:outline-[var(--ui-primary)] shadow-sm">
                            <option value="Lexend">Lexend</option><option value="Poppins">Poppins</option><option value="Nunito">Nunito</option>
                          </UISelect>
                        </div>
                        <div>
                          <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 mb-2 block">Gaya Sudut (Radius)</label>
                          <UISelect value={appSettings.uiRadius ||"md"} onChange={(e) => setAppSettings({ ...appSettings, uiRadius: e.target.value })} className="w-full border-none bg-white p-3 rounded-[var(--ui-radius-card)] text-xs font-bold focus:outline-[var(--ui-primary)] shadow-sm">
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
                            <UISelect value={appSettings.layoutMode ||"full"} onChange={(e) => setAppSettings({ ...appSettings, layoutMode: e.target.value })} className="w-full border-none bg-white p-3 rounded-[var(--ui-radius-card)] text-xs font-bold focus:outline-[var(--ui-primary)] shadow-sm">
                              <option value="full">Layar Penuh (Full Width)</option>
                              <option value="boxed">Terkotak di Tengah (Boxed Container)</option>
                            </UISelect>
                          </div>
                          <div>
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 mb-2 block">Gaya Sidebar Kiri</label>
                            <UISelect value={appSettings.sidebarStyle ||"putih"} onChange={(e) => setAppSettings({ ...appSettings, sidebarStyle: e.target.value })} className="w-full border-none bg-white p-3 rounded-[var(--ui-radius-card)] text-xs font-bold focus:outline-[var(--ui-primary)] shadow-sm">
                              <option value="putih">Putih Bersih (Clean White)</option>
                              <option value="abu-abu">Abu-abu Lembut (Slate Soft)</option>
                              <option value="tema-utama">Berwarna (Primary Gradient)</option>
                            </UISelect>
                          </div>
                          <div>
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 mb-2 block">Logo & Teks Sidebar</label>
                            <UISelect value={appSettings.sidebarLogoMode ||"both"} onChange={(e) => setAppSettings({ ...appSettings, sidebarLogoMode: e.target.value })} className="w-full border-none bg-white p-3 rounded-[var(--ui-radius-card)] text-xs font-bold focus:outline-[var(--ui-primary)] shadow-sm">
                              <option value="both">Tampilkan Logo & Nama Instansi</option>
                              <option value="logo">Hanya Logo (Logo Only)</option>
                              <option value="text">Hanya Teks (Text Only)</option>
                            </UISelect>
                          </div>
                          <div>
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 mb-2 block">Gaya Header Atas</label>
                            <UISelect value={appSettings.headerStyle ||"primary"} onChange={(e) => setAppSettings({ ...appSettings, headerStyle: e.target.value })} className="w-full border-none bg-white p-3 rounded-[var(--ui-radius-card)] text-xs font-bold focus:outline-[var(--ui-primary)] shadow-sm">
                              <option value="primary">Berwarna Utama (Primary Brand)</option>
                              <option value="glass">Efek Transparan (Glassmorphism)</option>
                              <option value="solid">Putih Solid (Classic Card)</option>
                              <option value="minimal">Minimalis Tanpa Batas (Borderless)</option>
                            </UISelect>
                          </div>
                          <div>
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 mb-2 block">Desain Card / Panel</label>
                            <UISelect value={appSettings.cardStyle ||"border"} onChange={(e) => setAppSettings({ ...appSettings, cardStyle: e.target.value })} className="w-full border-none bg-white p-3 rounded-[var(--ui-radius-card)] text-xs font-bold focus:outline-[var(--ui-primary)] shadow-sm">
                              <option value="border">Garis Batas Halus (Clean Border)</option>
                              <option value="shadow">Bayangan Mengambang (Elevated Shadow)</option>
                              <option value="flat">Warna Datar Padat (Flat Filled)</option>
                            </UISelect>
                          </div>
                          <div>
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 mb-2 block">Vibransi Warna & Efek</label>
                            <UISelect value={appSettings.themeVibrancy ||"gradasi"} onChange={(e) => setAppSettings({ ...appSettings, themeVibrancy: e.target.value })} className="w-full border-none bg-white p-3 rounded-[var(--ui-radius-card)] text-xs font-bold focus:outline-[var(--ui-primary)] shadow-sm">
                              <option value="soft">Lembut & Kalem (Soft Pastel)</option>
                              <option value="vibrant">Sangat Berwarna (Vibrant Bright)</option>
                              <option value="gradasi">Seni Gradasi (Elegant Gradient)</option>
                            </UISelect>
                          </div>
                          <div>
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 mb-2 block">Gaya Latar Belakang</label>
                            <UISelect value={appSettings.bgGridType ||"grid"} onChange={(e) => setAppSettings({ ...appSettings, bgGridType: e.target.value })} className="w-full border-none bg-white p-3 rounded-[var(--ui-radius-card)] text-xs font-bold focus:outline-[var(--ui-primary)] shadow-sm">
                              <option value="grid">Garis Grid Modern (Modern Grid)</option>
                              <option value="dots">Titik Polkadot Lembut (Soft Polka Dots)</option>
                              <option value="gradient">Warna Radial Kalem (Radial Gradients)</option>
                              <option value="plain">Polos Tanpa Pola (Plain Backdrop)</option>
                            </UISelect>
                          </div>
                          <div>
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 mb-2 block">Animasi Transisi Halaman</label>
                            <UISelect value={appSettings.pageTransition ||"smooth"} onChange={(e) => setAppSettings({ ...appSettings, pageTransition: e.target.value })} className="w-full border-none bg-white p-3 rounded-[var(--ui-radius-card)] text-xs font-bold focus:outline-[var(--ui-primary)] shadow-sm">
                              <option value="smooth">Fade-In Lambat (Slow Smooth)</option>
                              <option value="slide">Geser Halus (Slide In)</option>
                              <option value="none">Tanpa Animasi (Fast Instant)</option>
                            </UISelect>
                          </div>
                          <div>
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 mb-2 block">Gaya Tombol (Button Style)</label>
                            <UISelect value={appSettings.buttonStyle ||"solid"} onChange={(e) => setAppSettings({ ...appSettings, buttonStyle: e.target.value })} className="w-full border-none bg-white p-3 rounded-[var(--ui-radius-card)] text-xs font-bold focus:outline-[var(--ui-primary)] shadow-sm">
                              <option value="solid">Warna Padat (Solid Color)</option>
                              <option value="flat">Datar Tanpa Bayangan (Flat No Shadow)</option>
                              <option value="outline">Garis Tepi (Clean Outline)</option>
                              <option value="shadow">Bayangan Bersinar (Glow Shadow)</option>
                              <option value="gradient">Seni Gradasi (Vibrant Gradient)</option>
                            </UISelect>
                          </div>
                        </div>
                      </div>
                      <div className="pt-4 border-t border-slate-200/60 mt-4 space-y-4">
                        <p className="text-[11px] font-black text-slate-850 uppercase tracking-widest">Aksesibilitas & Ukuran Teks</p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 mb-2 block">Ukuran Teks Global</label>
                            <UISelect value={appSettings.fontSizeScale || "normal"} onChange={(e) => setAppSettings({ ...appSettings, fontSizeScale: e.target.value })} className="w-full border-none bg-white p-3 rounded-[var(--ui-radius-card)] text-xs font-bold focus:outline-[var(--ui-primary)] shadow-sm">
                              <option value="kecil">Kecil (Compact — 13px)</option>
                              <option value="normal">Normal (Default — 15px)</option>
                              <option value="besar">Besar (Comfortable — 16.5px)</option>
                              <option value="sangat-besar">Sangat Besar (Accessible — 18px)</option>
                            </UISelect>
                          </div>
                          <div>
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 mb-2 block">Ukuran Tombol Sentuh</label>
                            <UISelect value={appSettings.touchTargetSize || "normal"} onChange={(e) => setAppSettings({ ...appSettings, touchTargetSize: e.target.value })} className="w-full border-none bg-white p-3 rounded-[var(--ui-radius-card)] text-xs font-bold focus:outline-[var(--ui-primary)] shadow-sm">
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
                  <div className="border-none rounded-[var(--ui-radius-card)] p-5 bg-white shadow-sm flex flex-col sm:flex-row gap-5 items-center">
                    <div className="flex-1 w-full">
                      <p className="text-[10px] font-black text-slate-500 uppercase mb-2">Preview Tema</p>
                      <div className="rounded-[var(--ui-radius-small)] p-5 text-white shadow-inner" style={{ background: appSettings.primaryColor ||"var(--ui-primary)" }}>
                        <div className="inline-block px-2.5 py-1 rounded-[var(--ui-radius-small)] text-xs font-bold text-black" style={{ background: appSettings.accentColor ||"var(--ui-accent)" }}>{appSettings.logoText ||"TS"}</div>
                        <h4 className="font-black mt-3 text-lg line-clamp-1">{appSettings.appName}</h4>
                        <p className="text-[10px] opacity-90 leading-tight mt-1 line-clamp-2">{appSettings.heroTitle}</p>
                      </div>
                    </div>
                    <div className="w-full sm:w-40 text-center sm:text-left space-y-2 shrink-0">
                      <p className="text-[10px] font-black text-slate-700 uppercase tracking-widest">Kontras</p>
                      <p className="text-xl font-black text-slate-800">{contrastRatio(appSettings.textColor ||"#0f172a", appSettings.bgColor ||"#f8fafc").toFixed(2)} : 1</p>
                      {contrastRatio(appSettings.textColor ||"#0f172a", appSettings.bgColor ||"#f8fafc") < 4.5 ? (
                        <p className="text-rose-600 text-[10px] font-bold bg-red-50 p-2 rounded-[var(--ui-radius-small)] border border-red-100">⚠️ Sulit dibaca.</p>
                      ) : (
                        <p className="text-emerald-600 text-[10px] font-bold bg-emerald-50 p-2 rounded-[var(--ui-radius-small)] border border-emerald-100"><CheckCircle2 size={14} className="inline mr-1" /> Ideal.</p>
                      )}
                      <button type="button" onClick={autoFixContrast} className="w-full mt-1 cursor-pointer">Perbaiki Kontras</button>
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
