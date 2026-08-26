import { useState, useEffect, useMemo } from'react';
import { useLocation } from'react-router-dom';
import { Home, CalendarDays, Map, BookOpen, Calendar, Building2 } from'lucide-react';
import { subscribeDatabaseSnapshot } from'../../utils/dataSource.js';
import { loadInitialState } from'../../utils/state.js';
import { Link, Outlet } from'react-router-dom';
import { ChevronLeft, MessageSquare } from'lucide-react';
import HeaderNavbar from'./HeaderNavbar.jsx';


export default function PublicLayout() {
  const [dataVersion, setDataVersion] = useState(0);
  const location = useLocation();
  const [scrolled, setScrolled] = useState(false);
  const [schoolProfile, setSchoolProfile] = useState(null);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    fetch('/api/school-profile')
      .then(res => res.json())
      .then(data => {
        if (data.ok) setSchoolProfile(data.data);
      })
      .catch(() => {});
      
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const isLoginModalOpen = false;
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
      primaryColor:"#064e3b", accentColor:"#a3e635", fontFamily:"Lexend", logoText:"TS",
      appName:"TimeSchedule",
      footerText:"© 2026 TimeSchedule by Admin.",
      contactEmail:"admin@school.sch.id",
      contactPhone:"+62 123-456-789",
      heroTitleColor:"#1e293b",
      heroSubtitleColor:"#64748b",
      heroHighlightColor:"#00bfa5",
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
  
  const isFeatureEnabled = (key) => featureSettings?.[key] !== false;

  const publicLinks = [
    { to:"/", label:"Beranda", icon: Home },
    { to:"/jadwal", label:"Jadwal", icon: CalendarDays },
    { to:"/denah", label:"Denah", featureKey:"publicDenah", icon: Map },
    { to:"/materi-ajar", label:"Materi Ajar", icon: BookOpen },
    { to:"/kalender", label:"Kalender", featureKey:"publicCalendar", icon: Calendar },
    { to:"/pkl-locations", label:"Tempat PKL", icon: Building2 },
  ].filter((link) => !link.featureKey || isFeatureEnabled(link.featureKey));

  const { primaryColor, accentColor, fontFamily, appName, logoText, footerText, contactEmail, contactPhone } = appSettings;
  const accentDark = accentColor ||"#a3e635";

  const handleFeedbackClick = () => {
    const cleanPhone = String(contactPhone ||"6281234567890").replace(/\D/g,'');
    const waUrl = `https://wa.me/${cleanPhone.startsWith('0') ?'62' + cleanPhone.slice(1) : cleanPhone}?text=Halo%20Admin,%20saya%20ingin%20memberikan%20masukan%20terkait%20layanan%20sekolah.`;
    window.open(waUrl,'_blank');
  };

  return (
    <div 
      className="min-h-screen flex flex-col antialiased relative selection:bg-slate-800 selection:text-white font-sans overflow-x-hidden notranslate"
      translate="no"
      style={{"--ui-primary": appSettings.primaryColor ||"#064e3b","--ui-accent": appSettings.accentColor ||"#a3e635","--ui-primary-button": appSettings.primaryButtonColor || appSettings.primaryColor ||"#064e3b","--ui-action": appSettings.actionButtonColor || appSettings.accentColor ||"#a3e635","--ui-bg": appSettings.bgColor ||"#f8fafc","--ui-surface": appSettings.surfaceColor ||"#ffffff","--ui-text": appSettings.textColor ||"#0f172a","--ui-radius-card": appSettings.uiRadius ==="lg" ?"24px" : appSettings.uiRadius ==="md" ?"16px" : appSettings.uiRadius ==="full" ?"32px" :"12px","--ui-radius-control": appSettings.uiRadius ==="lg" ?"16px" : appSettings.uiRadius ==="md" ?"10px" : appSettings.uiRadius ==="full" ?"9999px" :"8px","--ui-radius-small": appSettings.uiRadius ==="lg" ?"12px" : appSettings.uiRadius ==="md" ?"8px" : appSettings.uiRadius ==="full" ?"9999px" :"6px",
      }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Pretendard:wght@300;400;500;600;700;800&display=swap');
        @keyframes lp-fadeIn { from{opacity:0; transform: translateY(-10px)} to{opacity:1; transform: translateY(0)} }
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        .glass-input {
          background: #ffffff;
          border: 1px solid #e2e8f0;
          transition: all 0.3s ease;
        }
        .glass-input:focus-within {
          border-color: var(--ui-primary);
          box-shadow: 0 0 0 3px rgba(75, 123, 229, 0.1);
        }`}</style>

      {/* GLOBAL DECORATIVE BACKGROUND */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-[-1]">
        {/* Soft Wash Gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-white/90 via-purple-50/30 to-blue-50/40 backdrop-blur-[100px] public-layout-bg"></div>
        {/* Glowing Blobs */}
        <div className="absolute -top-[10%] -right-[5%] w-[600px] h-[600px] opacity-[0.08] rounded-[var(--ui-radius-small)] blur-[150px]" style={{ backgroundColor: primaryColor }}></div>
        <div className="absolute bottom-[-10%] left-[-5%] w-[700px] h-[700px] opacity-[0.08] rounded-[var(--ui-radius-small)] blur-[150px]" style={{ backgroundColor: accentDark }}></div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[1000px] h-[1000px] opacity-[0.03] rounded-[var(--ui-radius-small)] blur-[150px]" style={{ backgroundColor: primaryColor }}></div>
      </div>

      {/* HEADER NAVBAR */}
      {location.pathname !=='/' && (() => {
        const headerStyle = appSettings?.headerStyle || 'primary';
        const surfaceColor = appSettings?.surfaceColor || '#ffffff';
        
        let mobHeaderBg = 'bg-white/85 backdrop-blur-lg border-b border-slate-100/80';
        let mobHeaderTextColor = 'text-slate-800';
        let mobBackButtonClass = 'bg-slate-50 border border-slate-200/50 text-slate-700';
        let mobHeaderStyleAttr = {};

        if (headerStyle === 'primary') {
          mobHeaderBg = 'border-b';
          mobHeaderTextColor = 'text-white';
          mobBackButtonClass = 'bg-white/10 border border-white/20 text-white';
          mobHeaderStyleAttr = { backgroundColor: primaryColor, borderColor: 'rgba(255, 255, 255, 0.15)' };
        } else if (headerStyle === 'solid') {
          mobHeaderBg = 'border-b border-slate-100';
          mobHeaderTextColor = 'text-slate-800';
          mobBackButtonClass = 'bg-slate-50 border border-slate-200/50 text-slate-700';
          mobHeaderStyleAttr = { backgroundColor: surfaceColor };
        } else if (headerStyle === 'glass') {
          mobHeaderBg = 'backdrop-blur-lg border-b border-slate-100/80';
          mobHeaderTextColor = 'text-slate-800';
          mobBackButtonClass = 'bg-slate-50 border border-slate-200/50 text-slate-700';
          mobHeaderStyleAttr = { backgroundColor: `rgba(255, 255, 255, 0.7)` };
        } else if (headerStyle === 'minimal') {
          mobHeaderBg = '';
          mobHeaderTextColor = 'text-slate-800';
          mobBackButtonClass = 'bg-slate-50 border border-slate-200/50 text-slate-700';
          mobHeaderStyleAttr = { backgroundColor: 'transparent', borderBottom: 'none' };
        }

        return (
          <>
            {/* Desktop Header */}
            <div className="hidden md:block">
              <HeaderNavbar setIsLoginModalOpen={setIsLoginModalOpen} appSettings={appSettings} schoolProfile={schoolProfile} />
            </div>

            {/* Mobile Header */}
            <header 
              className={`md:hidden w-full fixed top-0 left-0 right-0 z-50 py-3.5 px-4 flex items-center justify-between print:hidden ${mobHeaderBg}`}
              style={mobHeaderStyleAttr}
            >
              <Link to="/" className={`w-9 h-9 rounded-full flex items-center justify-center active:translate-y-[1px] transition-all no-underline ${mobBackButtonClass}`}>
                <ChevronLeft size={18} strokeWidth={2.5} />
              </Link>
              <span className={`font-black text-[14.5px] tracking-tight ${mobHeaderTextColor}`}>
                {location.pathname ==='/jadwal' ?'Jadwal Pelajaran' :
                 location.pathname ==='/denah' ?'Denah Kelas' :
                 location.pathname ==='/silabus' ?'Modul Ajar' :
                 location.pathname ==='/materi-ajar' ?'Materi Ajar' :
                 location.pathname ==='/kalender' ?'Kalender Akademik' :
                 location.pathname ==='/pkl-locations' ?'Tempat PKL' :
                 location.pathname ==='/struktur' ?'Struktur Organisasi' :'Informasi'}
              </span>
              <div className="w-9 h-9 opacity-0"></div>
            </header>
          </>
        );
      })()}

      {/* MAIN CONTENT AREA */}
      <main className={`flex-1 w-full flex flex-col z-30 ${location.pathname === '/' ? 'px-0 pt-0 pb-0' : 'max-w-[1400px] mx-auto px-4 md:px-8 pt-20 sm:pt-28 pb-24 md:pb-12'}`}>
        <Outlet context={{ appSettings, setIsLoginModalOpen, setModalViewMode }} />
      </main>

      {/* MOBILE BOTTOM NAVIGATION BAR */}
      {location.pathname !=='/' && (
        <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t border-slate-200/50 z-50 flex justify-around items-center pt-2 pb-5 px-1 shadow-[0_-4px_16px_rgba(0,0,0,0.04)] print:hidden">
          {publicLinks.map((l) => {
            const IconComponent = l.icon;
            const isActive = location.pathname === l.to;
            return (
              <Link 
                key={l.to} 
                to={l.to} 
                className="flex flex-col items-center justify-center gap-1.5 flex-1 py-1 cursor-pointer active:translate-y-[1px] transition-all select-none"
              >
                <div 
                  className="transition-colors duration-300 relative flex items-center justify-center"
                  style={{ color: isActive ? primaryColor :'#94a3b8' }}
                >
                  <IconComponent size={20} strokeWidth={isActive ? 2.5 : 2} />
                  {isActive && (
                    <span 
                      className="absolute -bottom-1.5 w-1 h-1 rounded-full" 
                      style={{ backgroundColor: primaryColor }}
                    />
                  )}
                </div>
                <span 
                  className="text-[9.5px] font-black tracking-tight transition-colors duration-300"
                  style={{ color: isActive ? primaryColor :'#64748b' }}
                >
                  {l.label ==='Beranda' ?'Beranda' :
                   l.label ==='Jadwal' ?'Jadwal' :
                   l.label ==='Denah' ?'Denah' :
                   l.label ==='Modul Ajar' ?'Ajar' :
                   l.label ==='Materi Ajar' ?'Materi' :
                   l.label ==='Kalender' ?'Kalender' :
                   l.label ==='Tempat PKL' ?'PKL' : l.label}
                </span>
              </Link>
            );
          })}
        </div>
      )}

      {/* CTA BANNER (Hidden on homepage) */}
      {location.pathname !== '/' && (
        <section className="hidden sm:block relative z-10 w-full max-w-[1400px] mx-auto px-5 md:px-8 mb-10 mt-8 animate-in fade-in duration-300 print:hidden">
          <div className="w-full rounded-[var(--ui-radius-small)] flex flex-col sm:flex-row items-center justify-between p-6 md:p-8 relative overflow-hidden shadow-sm" style={{ backgroundColor: primaryColor }}>
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/4"></div>
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-black/10 rounded-full blur-2xl translate-y-1/2 -translate-x-1/4"></div>
            
            <div className="relative z-10 flex flex-col md:flex-row items-center gap-6 md:gap-10 w-full">
              <div className="flex-1 text-center md:text-left">
                <p className="text-white font-extrabold text-[15px] md:text-[18px] tracking-wide mb-1">
                  Ada ide atau saran untuk pengembangan layanan sekolah?
                </p>
                <p className="text-white/80 font-medium text-[12px] md:text-[13px]">
                  Masukan Anda sangat berarti bagi kemajuan sistem informasi akademik kami.
                </p>
              </div>
              
              <button onClick={handleFeedbackClick} className="bg-white/20 hover:bg-white/30 text-white rounded-[var(--ui-radius-small)] transition-all flex items-center gap-2 shrink-0 cursor-pointer border-none h-10 px-4 text-sm font-bold">
                 <MessageSquare size={18} /> Kirim Masukan
              </button>
            </div>
          </div>
        </section>
      )}


      {/* FOOTER (Hidden on homepage as requested) */}
      {location.pathname !== '/' && (
        <footer className="hidden sm:block relative z-10 w-full bg-transparent border-t border-slate-200 mt-auto print:hidden">
          <div className="w-full max-w-[1400px] mx-auto px-5 md:px-8 py-10 md:py-12">
            
            {/* Row 1: Content */}
            <div className="flex flex-col md:flex-row items-center justify-between gap-6 md:gap-10">
              
              {/* Left: Logo & Basic Info */}
              <div className="flex flex-col items-center md:items-start text-center md:text-left gap-2">
                <div className="flex items-center gap-3">
                  {schoolProfile?.logo_url ? (
                    <img src={schoolProfile.logo_url} alt="Logo" className="w-10 h-10 object-contain" />
                  ) : (
                    <div className="w-10 h-10 rounded-[var(--ui-radius-small)] flex items-center justify-center text-white font-black text-[14px] shadow-sm" style={{ backgroundColor: primaryColor }}>
                      {logoText ||"TS"}
                    </div>
                  )}
                  <div className="flex flex-col">
                    <span className="font-extrabold text-slate-800 text-[16px] tracking-tight leading-none mb-1">{appName ||'Sistem Akademik'}</span>
                    <span className="text-slate-500 text-[11px] font-bold">{appSettings.instansiName ||'Institusi Pendidikan Terpadu'}</span>
                  </div>
                </div>
                <p className="text-slate-500 text-[11px] font-medium max-w-sm mt-1">
                  {schoolProfile?.alamat || appSettings.schoolProfile?.alamat ||'Jl. Pendidikan No. 1, Kota Pelajar'} • {contactPhone ||'+62 123 4567 890'}
                </p>
              </div>

              {/* Right: Links & Social */}
              <div className="flex flex-col items-center md:items-end gap-3.5">
                <div className="flex flex-wrap justify-center md:justify-end items-center gap-4 text-[12px] font-bold text-slate-600">
                  <Link to="/" className="hover:text-[var(--ui-primary)] transition-colors">Portal Utama</Link>
                  <Link to="/jadwal" className="hover:text-[var(--ui-primary)] transition-colors">Jadwal</Link>
                  <Link to="/kalender" className="hover:text-[var(--ui-primary)] transition-colors">Kalender</Link>
                  <Link to="/dashboard" className="hover:text-[var(--ui-primary)] transition-colors">Masuk Sistem</Link>
                </div>
                <div className="flex items-center gap-2">
                  {(() => {
                    const getAbsoluteUrl = (url) => {
                      if (!url) return'';
                      const trimmed = String(url).trim();
                      if (/^https?:\/\//i.test(trimmed)) {
                        return trimmed;
                      }
                      return `https://${trimmed}`;
                    };
                    return (
                      <>
                        {appSettings.socialFacebook && (
                          <a href={getAbsoluteUrl(appSettings.socialFacebook)} target="_blank" rel="noopener noreferrer" className="w-7 h-7 rounded-[var(--ui-radius-small)] bg-slate-200/60 flex items-center justify-center text-slate-500 hover:bg-[var(--ui-primary)] hover:text-white transition-all" title="Facebook">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"></path></svg>
                          </a>
                        )}
                        {appSettings.socialInstagram && (
                          <a href={getAbsoluteUrl(appSettings.socialInstagram)} target="_blank" rel="noopener noreferrer" className="w-7 h-7 rounded-[var(--ui-radius-small)] bg-slate-200/60 flex items-center justify-center text-slate-500 hover:bg-[var(--ui-primary)] hover:text-white transition-all" title="Instagram">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line></svg>
                          </a>
                        )}
                        {appSettings.socialYoutube && (
                          <a href={getAbsoluteUrl(appSettings.socialYoutube)} target="_blank" rel="noopener noreferrer" className="w-7 h-7 rounded-[var(--ui-radius-small)] bg-slate-200/60 flex items-center justify-center text-slate-500 hover:bg-[var(--ui-primary)] hover:text-white transition-all" title="YouTube">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22.54 6.42a2.78 2.78 0 0 0-1.94-2C18.88 4 12 4 12 4s-6.88 0-8.6.46a2.78 2.78 0 0 0-1.94 2A29 29 0 0 0 1 11.75a29 29 0 0 0 .46 5.33 2.78 2.78 0 0 0 1.94 2c1.72.46 8.6.46 8.6.46s6.88 0 8.6-.46a2.78 2.78 0 0 0 1.94-2 29 29 0 0 0 .46-5.33 29 29 0 0 0-.46-5.33z"></path><polygon points="9.75 15.02 15.5 11.75 9.75 8.48 9.75 15.02"></polygon></svg>
                          </a>
                        )}
                      </>
                    );
                  })()}
                </div>
              </div>

            </div>

            {/* Row 2: Copyright */}
            <div className="w-full border-t border-slate-200 mt-8 pt-6 flex flex-col md:flex-row items-center justify-between gap-4 text-[11px] font-semibold text-slate-400">
              <p>{footerText || `© ${new Date().getFullYear()} ${appName ||'Sistem Akademik'}. All rights reserved.`}</p>
              <div className="flex items-center gap-4">
                <span className="hover:text-[var(--ui-primary)] cursor-pointer transition-colors text-slate-500">Kebijakan Privasi</span>
                <span className="w-1 h-1 bg-slate-300 rounded-full"></span>
                <span className="hover:text-[var(--ui-primary)] cursor-pointer transition-colors text-slate-500">Syarat & Ketentuan</span>
              </div>
            </div>
            
          </div>
        </footer>
      )}
    </div>
  );
}
