import { useState, useEffect, useMemo } from'react';
import { useLocation } from'react-router-dom';
import { Home, CalendarDays, Map, BookOpen, Calendar, Building2 } from'lucide-react';
import { subscribeDatabaseSnapshot } from'../../utils/dataSource.js';
import { loadInitialState } from'../../utils/state.js';
import { Link, Outlet, useNavigate } from 'react-router-dom';
import { ChevronLeft, MessageSquare, HelpCircle, X, Info, Mail, LogIn } from 'lucide-react';
import HeaderNavbar from'./HeaderNavbar.jsx';


export default function PublicLayout() {
  const [dataVersion, setDataVersion] = useState(0);
  const location = useLocation();
  const navigate = useNavigate();
  const [scrolled, setScrolled] = useState(false);
  const [schoolProfile, setSchoolProfile] = useState(null);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [showPublicHelp, setShowPublicHelp] = useState(false);

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
    { to:"/jadwal", label:"Jadwal", icon: CalendarDays },
    { to:"/denah", label:"Denah", featureKey:"publicDenah", icon: Map },
    { to:"/materi-ajar", label:"Materi Ajar", icon: BookOpen },
    { to:"/kalender", label:"Kalender", featureKey:"publicCalendar", icon: Calendar },
    { to:"/pkl-locations", label:"Tempat PKL", icon: Building2 },
  ].filter((link) => !link.featureKey || isFeatureEnabled(link.featureKey));

  const { primaryColor, accentColor, fontFamily, appName, logoText, footerText, contactEmail, contactPhone } = appSettings;
  const accentDark = accentColor ||"#a3e635";

  const getWaLink = () => {
    const phone = contactPhone || "+62 123-456-789";
    const cleanPhone = String(phone).replace(/\D/g, '');
    const waNumber = cleanPhone.startsWith('0') ? '62' + cleanPhone.slice(1) : cleanPhone;
    return `https://wa.me/${waNumber}?text=Halo%20Admin%2C%20saya%20butuh%20bantuan%20terkait%20aplikasi%20${encodeURIComponent(appName || 'Sistem Akademik')}...`;
  };

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
        <div className="absolute inset-0 bg-gradient-to-br from-white/90 via-purple-50/30 to-sky-50/40 backdrop-blur-[100px] public-layout-bg"></div>
        {/* Glowing Blobs */}
        <div className="absolute -top-[10%] -right-[5%] w-[600px] h-[600px] opacity-[0.08] rounded-[var(--ui-radius-small)] blur-[150px]" style={{ backgroundColor: primaryColor }}></div>
        <div className="absolute bottom-[-10%] left-[-5%] w-[700px] h-[700px] opacity-[0.08] rounded-[var(--ui-radius-small)] blur-[150px]" style={{ backgroundColor: accentDark }}></div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[1000px] h-[1000px] opacity-[0.03] rounded-[var(--ui-radius-small)] blur-[150px]" style={{ backgroundColor: primaryColor }}></div>
      </div>

      {/* HEADER NAVBAR */}
      {location.pathname !== '/' && (() => {
        const getPageTitle = (path) => {
          switch (path) {
            case '/jadwal': return 'Jadwal Pelajaran';
            case '/denah': return 'Denah Tata Ruang';
            case '/silabus':
            case '/materi-ajar': return 'Materi Ajar';
            case '/kalender': return 'Kalender Akademik';
            case '/pkl-locations': return 'Data Tempat PKL';
            case '/struktur': return 'Struktur Organisasi';
            case '/validasi-siswa': return 'Validasi Data Siswa';
            default: return 'Layanan Publik';
          }
        };

        return (
          <>
            {/* Desktop Header (Floating Navbar Card) */}
            <div className="hidden md:block">
              <HeaderNavbar setIsLoginModalOpen={setIsLoginModalOpen} appSettings={appSettings} schoolProfile={schoolProfile} />
            </div>

            {/* Mobile Header (Judul & Tombol Back di Bagian Atas - Ukuran Lebih Proporsional & Nyaman) */}
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
                title="Kembali"
              >
                <ChevronLeft size={22} strokeWidth={2.5} />
              </button>
              
              <div className="flex flex-col items-center justify-center text-center px-2 flex-1 min-w-0">
                <span 
                  className="text-[10px] font-black uppercase tracking-widest leading-none mb-1" 
                  style={{ color: 'var(--ui-primary, #059669)' }}
                >
                  Layanan Publik
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
                  backgroundColor: appSettings.primaryColor || '#3DAA37',
                }}
                className="h-9 px-3 rounded-xl text-white font-extrabold text-xs tracking-wide shadow-xs flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer border-none shrink-0"
                title="Masuk ke Aplikasi"
              >
                <LogIn size={14} strokeWidth={2.5} />
                <span>Masuk</span>
              </button>
            </header>
          </>
        );
      })()}

      {/* MAIN CONTENT AREA (Sejajar Persis dengan HeaderNavbar) */}
      <main className={`flex-1 w-full flex flex-col z-30 ${location.pathname === '/' ? 'px-0 pt-0 pb-0' : 'w-full max-w-[1336px] mx-auto px-4 sm:px-6 md:px-8 min-[1400px]:px-0 pt-20 sm:pt-28 pb-28 md:pb-12'}`}>
        <Outlet context={{ appSettings, setIsLoginModalOpen, setModalViewMode }} />
      </main>

      {/* MOBILE BOTTOM ACTION BAR (Sama Persis dengan Landing Page Mobile: Masuk Sekarang & Bantuan) */}
      {location.pathname !== '/' && (
        <div className="md:hidden fixed bottom-0 left-0 right-0 z-[40] bg-white px-5 pt-3 pb-[max(1.25rem,calc(env(safe-area-inset-bottom,0px)+1rem))] select-none border-t border-slate-100/80 shadow-[0_-4px_25px_rgba(0,0,0,0.06)]">
          <div className="w-full max-w-md mx-auto flex items-center gap-3">
            {/* Tombol Pertama: Masuk Sekarang */}
            <button
              type="button"
              onClick={() => setIsLoginModalOpen(true)}
              style={{ backgroundColor: appSettings.primaryColor || '#3DAA37' }}
              className="flex-1 h-[50px] sm:h-[54px] rounded-xl text-white font-extrabold text-sm sm:text-base tracking-wide shadow-md shadow-green-950/20 flex items-center justify-center transition-all active:scale-[0.98] hover:opacity-90 cursor-pointer border-none"
            >
              Masuk Sekarang
            </button>

            {/* Tombol Kedua: Bantuan */}
            <button
              type="button"
              onClick={() => setShowPublicHelp(true)}
              title="Bantuan & Panduan"
              style={{ backgroundColor: appSettings.primaryColor || '#3DAA37' }}
              className="w-[50px] h-[50px] sm:w-[54px] sm:h-[54px] shrink-0 rounded-xl text-white shadow-md shadow-green-950/20 flex items-center justify-center transition-all active:scale-[0.98] hover:opacity-90 cursor-pointer border-none"
            >
              <HelpCircle size={23} strokeWidth={2.3} />
            </button>
          </div>
        </div>
      )}

      {/* PUBLIC HELP BOTTOM SHEET (Bisa diakses dari tombol bantuan di setiap menu) */}
      <PublicHelpModal
        isOpen={showPublicHelp}
        onClose={() => setShowPublicHelp(false)}
        contactPhone={contactPhone}
        contactEmail={contactEmail}
        getWaLink={getWaLink}
      />

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

// ── Bantuan bottom sheet modal component for mobile view
const PublicHelpModal = ({ isOpen, onClose, contactPhone, contactEmail, getWaLink }) => {
  const [openFaqIndex, setOpenFaqIndex] = useState(null);

  if (!isOpen) return null;

  const faqs = [
    {
      q: "Bagaimana cara masuk ke sistem?",
      a: "Klik tombol \"Masuk Sekarang\" di bar bawah (atau tombol \"Masuk\" di pojok kanan atas untuk desktop), lalu gunakan username dan password resmi yang diberikan oleh administrator sekolah."
    },
    {
      q: "Lupa password atau tidak bisa login?",
      a: "Silakan hubungi administrator IT sekolah atau wali kelas Anda untuk mereset password akun Anda."
    },
    {
      q: "Apakah jadwal pelajaran real-time?",
      a: "Ya, setiap perubahan jadwal piket, guru pengganti, atau perubahan kelas yang dilakukan oleh admin kurikulum akan langsung diperbarui seketika di portal ini."
    }
  ];

  return (
    <div className="fixed inset-0 z-[100] flex items-end md:items-center justify-center bg-slate-900/70 backdrop-blur-xs animate-in fade-in duration-300 p-0 md:p-4 text-left">
      <div className="absolute inset-0 z-0 cursor-pointer" onClick={onClose} />

      <div className="bg-white rounded-t-[28px] md:rounded-[var(--ui-radius-card,24px)] w-full max-w-md md:max-w-xl overflow-hidden shadow-2xl border border-slate-100 flex flex-col animate-in slide-in-from-bottom md:zoom-in-95 duration-300 ease-out z-10 max-h-[85vh]">
        <div className="w-12 h-1.5 bg-slate-200 hover:bg-slate-300 rounded-full mx-auto my-3 shrink-0 md:hidden cursor-pointer" onClick={onClose} />

        <div className="px-6 pb-3 pt-2 md:pt-6 flex items-center justify-between">
          <span className="font-black text-slate-800 text-[18px] md:text-[20px] tracking-tight">Hubungi &amp; Bantuan</span>
          <button onClick={onClose} className="cursor-pointer flex items-center justify-center w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 transition-colors border-none">
            <X size={16} strokeWidth={2.5} />
          </button>
        </div>

        <div className="px-6 py-4 space-y-5 overflow-y-auto custom-scrollbar select-text max-h-[55vh]">
          <div className="bg-indigo-50 border border-indigo-100 rounded-[var(--ui-radius-small)] p-4 text-indigo-800 flex items-start gap-2.5">
            <Info size={16} className="shrink-0 mt-0.5" style={{ color:'#1d4ed8' }} />
            <p className="leading-relaxed font-semibold text-left text-indigo-900 text-[11.5px]">
              Butuh bantuan untuk masuk ke sistem atau memiliki pertanyaan seputar KBM? Silakan cek FAQ atau hubungi admin di bawah.
            </p>
          </div>

          <div className="space-y-3">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Pertanyaan Umum (FAQ)</p>
            <div className="space-y-2">
              {faqs.map((faq, idx) => {
                const isOpen = openFaqIndex === idx;
                return (
                  <div key={idx} className="border border-slate-100 rounded-[var(--ui-radius-small)] overflow-hidden bg-slate-50/40 text-left transition-all">
                    <button
                      onClick={() => setOpenFaqIndex(isOpen ? null : idx)}
                      className="w-full px-4 py-3.5 flex items-center justify-between bg-transparent border-none text-slate-800 font-extrabold text-[12px] cursor-pointer hover:bg-slate-100/50 transition-colors"
                    >
                      <span className="text-left leading-tight pr-4">{faq.q}</span>
                      <ChevronLeft 
                        size={15} 
                        className={`text-slate-400 transition-transform duration-350 ${isOpen ? '-rotate-90' : 'rotate-180'}`} 
                      />
                    </button>
                    {isOpen && (
                      <div className="px-4 pb-4 pt-1 text-[11.5px] font-medium text-slate-500 leading-relaxed border-t border-slate-100 bg-white">
                        {faq.a}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="space-y-2.5">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Hubungi Admin Sekolah</p>
            
            {contactPhone && (
              <a 
                href={getWaLink ? getWaLink() : '#'} 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex items-center gap-3 p-3 border border-slate-100 hover:border-emerald-200 hover:bg-emerald-50/30 rounded-[var(--ui-radius-small)] transition-all text-slate-700 no-underline cursor-pointer group"
              >
                <div className="w-8.5 h-8.5 rounded-[var(--ui-radius-small)] bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform shadow-xs">
                  <MessageSquare size={16} strokeWidth={2.2} />
                </div>
                <div>
                  <p className="font-extrabold text-[12px] text-slate-800 leading-none mb-1">WhatsApp Admin</p>
                  <p className="text-[10.5px] font-bold text-slate-400 leading-none">{contactPhone}</p>
                </div>
              </a>
            )}

            {contactEmail && (
              <a 
                href={`mailto:${contactEmail}`}
                className="flex items-center gap-3 p-3 border border-slate-100 hover:border-indigo-200 hover:bg-indigo-50/30 rounded-[var(--ui-radius-small)] transition-all text-slate-700 no-underline cursor-pointer group"
              >
                <div className="w-8.5 h-8.5 rounded-[var(--ui-radius-small)] bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform shadow-xs">
                  <Mail size={16} strokeWidth={2.2} />
                </div>
                <div>
                  <p className="font-extrabold text-[12px] text-slate-800 leading-none mb-1">Email Layanan</p>
                  <p className="text-[10.5px] font-bold text-slate-400 leading-none">{contactEmail}</p>
                </div>
              </a>
            )}
          </div>
        </div>

        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/50">
          <button 
            onClick={onClose}
            className="w-full h-11 flex items-center justify-center cursor-pointer border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 rounded-[var(--ui-radius-small)] font-bold text-xs uppercase tracking-wider transition-all active:scale-[0.98]"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};
