import { useState, useEffect, useMemo } from 'react';
import { useLocation, Link, Outlet, useNavigate } from 'react-router-dom';
import { ChevronLeft, LogIn, ArrowUpRight } from 'lucide-react';
import { subscribeDatabaseSnapshot } from '../../utils/dataSource.js';
import { loadInitialState } from '../../utils/state.js';
import HeaderNavbar from './HeaderNavbar.jsx';
import PublicFooter from './PublicFooter.jsx';
import { PublicHelpModal } from '../landing/LandingModals.jsx';
import { sanitizeHtml } from '../../utils/sanitizeHtml.js';


export default function PublicLayout() {
  const [dataVersion, setDataVersion] = useState(0);
  const location = useLocation();
  const navigate = useNavigate();
  const [schoolProfile, setSchoolProfile] = useState(null);
  const [showPublicHelp, setShowPublicHelp] = useState(false);

  const [activeLang, setActiveLang] = useState(() => {
    try {
      return localStorage.getItem('kurmon_lang') || 'ID';
    } catch {
      return 'ID';
    }
  });

  useEffect(() => {
    const handleLangChange = (e) => {
      if (e?.detail) setActiveLang(e.detail);
    };
    window.addEventListener('kurmon_lang_change', handleLangChange);
    return () => window.removeEventListener('kurmon_lang_change', handleLangChange);
  }, []);

  const t = (idText, enText) => activeLang === 'EN' ? enText : idText;

  useEffect(() => {
    fetch('/api/school-profile')
      .then(res => res.json())
      .then(data => {
        if (data.ok) setSchoolProfile(data.data);
      })
      .catch(() => {});
  }, []);

  const setIsLoginModalOpen = (open) => {
    // Gunakan window.location.href (hard navigation) bukan React navigate
    // untuk menghindari bug removeChild dari Google Translate saat unmount LandingPage
    if (open) window.location.href = "/dashboard";
  };
  const setModalViewMode = () => {};

  useEffect(() => subscribeDatabaseSnapshot(() => setDataVersion((v) => v + 1)), []);
  
  const appSettings = useMemo(() => {
    void dataVersion;
    const defaults = {
      primaryColor: "#059669",
      accentColor: "#c8ed69",
      fontFamily: "Plus Jakarta Sans",
      logoText: "2",
      appName: "KG2 School",
      instansiName: "SMK Karya Guna 2 Bekasi",
      schoolName: "SMK Karya Guna 2 Bekasi",
      footerText: "2026",
      contactEmail: "info@smkkg2.sch.id",
      contactPhone: "085117531733",
      heroTitleColor: "#1e293b",
      heroSubtitleColor: "#64748b",
      heroHighlightColor: "#059669",
    };
    const loaded = loadInitialState("appSettings", defaults);
    return {
      ...defaults,
      ...loaded,
      heroTitleColor: loaded?.heroTitleColor || defaults.heroTitleColor,
      heroSubtitleColor: loaded?.heroSubtitleColor || defaults.heroSubtitleColor,
      heroHighlightColor: loaded?.heroHighlightColor || loaded?.primaryColor || defaults.heroHighlightColor,
    };
  }, [dataVersion]);
  
  const featureSettings = useMemo(() => {
    void dataVersion;
    return loadInitialState("featureSettings", {});
  }, [dataVersion]);

  const { primaryColor, contactEmail, contactPhone } = appSettings;

  const getWaLink = () => {
    const phone = contactPhone || "085117531733";
    const cleanPhone = String(phone).replace(/\D/g, '');
    const waNumber = cleanPhone.startsWith('0') ? '62' + cleanPhone.slice(1) : cleanPhone;
    return `https://wa.me/${waNumber}?text=Halo%20Admin%2C%20saya%20butuh%20bantuan%20terkait%20layanan%20${encodeURIComponent(appSettings.appName || 'KG2 School')}...`;
  };

  return (
    <div 
      className="min-h-screen flex flex-col antialiased relative selection:bg-slate-800 selection:text-white font-sans overflow-x-hidden notranslate bg-[#f8fafc]"
      translate="no"
      style={{
        "--ui-primary": appSettings.primaryColor || "#059669",
        "--ui-accent": appSettings.accentColor || "#c8ed69",
        "--ui-primary-button": appSettings.primaryButtonColor || appSettings.primaryColor || "#059669",
        "--ui-action": appSettings.actionButtonColor || appSettings.accentColor || "#c8ed69",
        "--ui-bg": appSettings.bgColor || "#f8fafc",
        "--ui-surface": appSettings.surfaceColor || "#ffffff",
        "--ui-text": appSettings.textColor || "#0f172a",
        "--ui-radius-card": appSettings.uiRadius === "lg" ? "24px" : appSettings.uiRadius === "md" ? "16px" : appSettings.uiRadius === "full" ? "32px" : "12px",
        "--ui-radius-control": appSettings.uiRadius === "lg" ? "16px" : appSettings.uiRadius === "md" ? "10px" : appSettings.uiRadius === "full" ? "9999px" : "8px",
        "--ui-radius-small": appSettings.uiRadius === "lg" ? "12px" : appSettings.uiRadius === "md" ? "8px" : appSettings.uiRadius === "full" ? "9999px" : "6px",
      }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&display=swap');
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>

      {/* HEADER NAVBAR */}
      {location.pathname !== '/' && (() => {
        const getPageTitle = (path) => {
          switch (path) {
            case '/jadwal': return t('Jadwal Pelajaran', 'Class Schedule');
            case '/denah': return t('Denah Tata Ruang', 'Campus Map');
            case '/silabus':
            case '/materi-ajar': return t('Materi Ajar', 'Teaching Materials');
            case '/kalender': return t('Kalender Akademik', 'Academic Calendar');
            case '/pkl-locations':
            case '/lokasi-pkl': return t('Data Tempat PKL', 'Internship Locations');
            case '/struktur': return t('Struktur Organisasi', 'Organization Structure');
            case '/validasi-siswa': return t('Validasi Data Siswa', 'Student Data Validation');
            default: return t('Layanan Publik', 'Public Service');
          }
        };

        return (
          <>
            {/* Desktop Header (Floating Navbar Card) */}
            <div className="hidden md:block">
              <HeaderNavbar 
                setIsLoginModalOpen={setIsLoginModalOpen} 
                appSettings={appSettings} 
                schoolProfile={schoolProfile} 
              />
            </div>

            {/* Mobile Header (Judul & Tombol Back di Bagian Atas) */}
            <header className="md:hidden w-full fixed top-0 left-0 right-0 z-50 h-16 bg-white/95 backdrop-blur-md border-b border-slate-200/80 px-4 flex items-center justify-between shadow-2xs print:hidden transition-all">
              <button 
                type="button"
                onClick={() => {
                  if (window.history.length > 1) {
                    navigate(-1);
                  } else {
                    navigate('/');
                  }
                }}
                className="w-10 h-10 rounded-full bg-slate-100 hover:bg-slate-200 active:scale-95 text-slate-700 flex items-center justify-center transition-all cursor-pointer border border-slate-200/70 shadow-2xs shrink-0"
                title={t("Kembali", "Back")}
              >
                <ChevronLeft size={22} strokeWidth={2.5} />
              </button>
              
              <div className="flex flex-col items-center justify-center text-center px-2 flex-1 min-w-0">
                <span 
                  className="text-[10px] font-black uppercase tracking-widest leading-none mb-1" 
                  style={{ color: 'var(--ui-primary, #059669)' }}
                >
                  {t("Layanan Publik", "Public Service")}
                </span>
                <h1 className="text-base font-black text-slate-900 tracking-tight leading-none truncate max-w-full">
                  {getPageTitle(location.pathname)}
                </h1>
              </div>
              
              {/* Tombol Masuk di Pojok Kanan Atas */}
              <button 
                type="button"
                onClick={() => setIsLoginModalOpen(true)}
                style={{ 
                  backgroundColor: appSettings.primaryColor || '#059669',
                }}
                className="h-9 px-3 rounded-xl text-white font-extrabold text-xs tracking-wide shadow-xs flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer border-none shrink-0"
                title={t("Masuk ke Aplikasi", "Sign In")}
              >
                <LogIn size={14} strokeWidth={2.5} />
                <span>{t("Masuk", "Sign In")}</span>
              </button>
            </header>
          </>
        );
      })()}

      {/* MAIN CONTENT AREA */}
      <main className={`flex-1 w-full flex flex-col z-30 ${location.pathname === '/' ? 'px-0 pt-0 pb-0' : 'w-full max-w-[1400px] mx-auto px-4 sm:px-6 md:px-8 pt-20 sm:pt-28 pb-28 md:pb-12'}`}>
        <Outlet context={{ appSettings, setIsLoginModalOpen, setModalViewMode }} />
      </main>

      {/* MOBILE BOTTOM ACTION BAR */}
      {location.pathname !== '/' && (
        <div className="md:hidden fixed bottom-0 left-0 right-0 z-[40] bg-white px-5 pt-3 pb-[max(1.25rem,calc(env(safe-area-inset-bottom,0px)+1rem))] select-none border-t border-slate-100/80 shadow-[0_-4px_25px_rgba(0,0,0,0.06)]">
          <div className="w-full max-w-md mx-auto flex items-center gap-3">
            <button
              type="button"
              onClick={() => setIsLoginModalOpen(true)}
              style={{ backgroundColor: appSettings.primaryColor || '#059669' }}
              className="flex-1 h-[50px] sm:h-[54px] rounded-xl text-white font-extrabold text-sm sm:text-base tracking-wide shadow-md flex items-center justify-center transition-all active:scale-[0.98] hover:opacity-90 cursor-pointer border-none"
            >
              {t("Masuk Sekarang", "Sign In Now")}
            </button>

            <button
              type="button"
              onClick={() => setShowPublicHelp(true)}
              title={t("Bantuan & Panduan", "Help & Guide")}
              style={{ backgroundColor: appSettings.primaryColor || '#059669' }}
              className="w-[50px] h-[50px] sm:w-[54px] sm:h-[54px] shrink-0 rounded-xl text-white shadow-md flex items-center justify-center transition-all active:scale-[0.98] hover:opacity-90 cursor-pointer border-none"
            >
              <ArrowUpRight size={22} strokeWidth={2.3} />
            </button>
          </div>
        </div>
      )}

      {/* BANNER KESULITAN MENGAKSES SISTEM? (BANTUAN) */}
      {location.pathname !== '/' && (
        <div className="w-full max-w-[1400px] mx-auto px-5 md:px-8 shrink-0 mb-8 lg:mb-10 relative z-10 text-left">
          <div 
            className="text-white rounded-3xl p-6 sm:p-8 lg:p-9 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 shadow-md w-full overflow-hidden"
            style={{ 
              backgroundColor: appSettings.primaryColor ? `color-mix(in srgb, ${appSettings.primaryColor} 75%, #000000)` : '#0c3928'
            }}
          >
            <div>
              <h3 className="text-xl sm:text-2xl font-black tracking-tight text-white leading-tight">
                {appSettings.helpBannerTitle || t("Kesulitan mengakses sistem?", "Trouble accessing the system?")}
              </h3>
              <p className="text-xs sm:text-sm font-semibold text-emerald-100/80 mt-1.5 leading-relaxed">
                {appSettings.helpBannerSubtitle || t("Baca panduan layanan atau hubungi sekolah untuk bantuan akun.", "Read service guides or contact school admin for account assistance.")}
              </p>
            </div>

            <button
              type="button"
              onClick={() => setShowPublicHelp(true)}
              className="font-black text-xs sm:text-sm px-5 py-3 rounded-xl flex items-center gap-2 shadow-xs transition-all active:scale-95 cursor-pointer border-none shrink-0"
              style={{
                backgroundColor: appSettings.accentColor || '#c8ed69',
                color: appSettings.primaryColor ? `color-mix(in srgb, ${appSettings.primaryColor} 90%, #000000)` : '#153f32'
              }}
            >
              <span>{appSettings.helpBannerButtonText || t("Panduan & Bantuan", "Guide & Support")}</span>
              <ArrowUpRight size={15} strokeWidth={2.8} />
            </button>
          </div>
        </div>
      )}

      {/* UNIFIED DESKTOP FOOTER */}
      {location.pathname !== '/' && (
        <PublicFooter
          appSettings={appSettings}
          schoolProfile={schoolProfile}
          setIsLoginModalOpen={setIsLoginModalOpen}
          setShowPublicHelp={setShowPublicHelp}
          lang={activeLang}
        />
      )}

      {/* PUBLIC HELP BOTTOM SHEET / MODAL */}
      <PublicHelpModal
        isOpen={showPublicHelp}
        onClose={() => setShowPublicHelp(false)}
        contactPhone={contactPhone}
        contactEmail={contactEmail}
        appName={appSettings.appName}
        getWaLink={getWaLink}
        lang={activeLang}
      />
    </div>
  );
}
