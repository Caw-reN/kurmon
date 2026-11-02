import { useState, useEffect } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { LogIn, X, Menu, HelpCircle, Info, MessageSquare, Mail, BookOpen, ArrowUpRight } from 'lucide-react';


export default function HeaderNavbar({ setIsLoginModalOpen, appSettings, schoolProfile, onPanduanClick }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeLang, setActiveLangState] = useState(() => {
    try {
      return localStorage.getItem('kurmon_lang') || 'ID';
    } catch {
      return 'ID';
    }
  });

  const setActiveLang = (lang) => {
    setActiveLangState(lang);
    try {
      localStorage.setItem('kurmon_lang', lang);
      window.dispatchEvent(new CustomEvent('kurmon_lang_change', { detail: lang }));
    } catch {
      // ignore
    }
  };

  const t = (idText, enText) => activeLang === 'EN' ? enText : idText;

  // Modal states
  const [isBantuanOpen, setIsBantuanOpen] = useState(false);
  const [isPanduanOpen, setIsPanduanOpen] = useState(false);

  useEffect(() => {
    const handleLangChange = (e) => {
      if (e?.detail) setActiveLangState(e.detail);
    };
    window.addEventListener('kurmon_lang_change', handleLangChange);
    return () => window.removeEventListener('kurmon_lang_change', handleLangChange);
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Resolve dynamic settings from admin
  const logoUrl = appSettings?.logoWebUrl || schoolProfile?.logo_url || appSettings?.logoUrl;
  const logoText = appSettings?.logoText || '2';
  const appName = appSettings?.appName || 'KG2 School';
  const rawSchool = 
    appSettings?.instansiName || 
    (appSettings?.schoolName && appSettings.schoolName !== 'SMK Negeri 1' ? appSettings.schoolName : null) || 
    schoolProfile?.nama_sekolah || 
    'SMK Karya Guna 2 Bekasi';
  const schoolName = (rawSchool && rawSchool.toLowerCase().includes('negeri 1'))
    ? 'SMK Karya Guna 2 Bekasi'
    : (rawSchool || 'SMK Karya Guna 2 Bekasi');

  // Dynamic colors from admin settings
  const primaryColor = appSettings?.primaryColor || '#059669';
  const accentColor = appSettings?.accentColor || '#c8ed69';
  const primaryButtonColor = appSettings?.primaryButtonColor || primaryColor;
  const contactEmail = appSettings?.contactEmail || 'admin@school.sch.id';
  const contactPhone = appSettings?.contactPhone || '+62 123-456-789';

  // Helper to convert hex to rgba
  const hexToRgba = (hexColor, alpha = 1) => {
    try {
      const cleanHex = String(hexColor).replace('#', '').trim();
      if (cleanHex.length === 3) {
        const r = parseInt(cleanHex[0] + cleanHex[0], 16);
        const g = parseInt(cleanHex[1] + cleanHex[1], 16);
        const b = parseInt(cleanHex[2] + cleanHex[2], 16);
        return `rgba(${r}, ${g}, ${b}, ${alpha})`;
      } else if (cleanHex.length === 6) {
        const r = parseInt(cleanHex.slice(0, 2), 16);
        const g = parseInt(cleanHex.slice(2, 4), 16);
        const b = parseInt(cleanHex.slice(4, 6), 16);
        return `rgba(${r}, ${g}, ${b}, ${alpha})`;
      }
    } catch (e) {
      console.warn("Gagal parse hex color", hexColor, e);
    }
    return hexColor;
  };

  // Format WhatsApp number
  const getWaLink = () => {
    const cleanPhone = String(contactPhone).replace(/\D/g, '');
    const waNumber = cleanPhone.startsWith('0') ? '62' + cleanPhone.slice(1) : cleanPhone;
    return `https://wa.me/${waNumber}?text=Halo%20Admin%2C%20saya%20butuh%20bantuan%20terkait%20aplikasi%20${encodeURIComponent(appName)}...`;
  };

  const getAbsoluteUrl = (url) => {
    if (!url) return '';
    const trimmed = String(url).trim();
    if (/^https?:\/\//i.test(trimmed)) {
      return trimmed;
    }
    return `https://${trimmed}`;
  };

  // Improved Crisp Mini Flags for Language Switcher
  const IndoFlagMini = () => (
    <div className="w-4 h-3 rounded-[2px] overflow-hidden border border-slate-300/80 flex flex-col shrink-0 shadow-2xs">
      <div className="bg-[#EF4444] h-1/2 w-full"></div>
      <div className="bg-white h-1/2 w-full"></div>
    </div>
  );

  const UKFlagMini = () => (
    <svg viewBox="0 0 60 30" className="w-4 h-3 rounded-[2px] overflow-hidden border border-slate-300/80 shrink-0 shadow-2xs">
      <rect width="60" height="30" fill="#012169"/>
      <path d="M0,0 L60,30 M60,0 L0,30" stroke="#fff" strokeWidth="6"/>
      <path d="M0,0 L60,30 M60,0 L0,30" stroke="#C8102E" strokeWidth="4"/>
      <path d="M30,0 L30,30 M0,15 L60,15" stroke="#fff" strokeWidth="10"/>
      <path d="M30,0 L30,30 M0,15 L60,15" stroke="#C8102E" strokeWidth="6"/>
    </svg>
  );

  const scrollToLayanan = (e) => {
    e?.preventDefault?.();
    if (location.pathname !== '/') {
      navigate('/#layanan-akademik');
      setTimeout(() => {
        document.getElementById('layanan-akademik')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 150);
    } else {
      document.getElementById('layanan-akademik')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
    setMobileMenuOpen(false);
  };

  const scrollToAksesAkun = (e) => {
    e?.preventDefault?.();
    if (location.pathname !== '/') {
      navigate('/#akses-akun');
      setTimeout(() => {
        document.getElementById('akses-akun')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 150);
    } else {
      const el = document.getElementById('akses-akun');
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      } else if (setIsLoginModalOpen) {
        setIsLoginModalOpen(true);
      }
    }
    setMobileMenuOpen(false);
  };

  const handleOpenBantuan = (e) => {
    e?.preventDefault?.();
    setIsBantuanOpen(true);
    setMobileMenuOpen(false);
  };

  return (
    <>
      <header role="banner" className="landing-navbar fixed top-0 left-0 right-0 w-full z-50 flex flex-col shadow-xs select-none">
        {/* 1. TOP RIBBON: SMK KARYA GUNA 2 BEKASI & PORTAL LAYANAN */}
        <div 
          className="w-full text-white text-[11px] font-bold py-2 border-b transition-colors"
          style={{ 
            backgroundColor: appSettings?.topRibbonColor || primaryColor || '#153f32',
            borderBottomColor: 'rgba(255, 255, 255, 0.15)'
          }}
        >
          <div className="max-w-[1400px] mx-auto px-6 md:px-8 flex items-center justify-between">
            <span className="tracking-wider uppercase font-mono font-bold text-white">
              {appSettings?.topRibbonLeftText || schoolName.toUpperCase()}
            </span>
            <span className="text-emerald-100/80 font-medium hidden sm:inline text-[11.5px]">
              {appSettings?.topRibbonRightText || `${t('Portal layanan akademik - ', 'Academic service portal - ')}${schoolName}`}
            </span>
          </div>
        </div>

        {/* 2. MAIN NAVBAR: LOGO, BRAND, NAV LINKS, IMPROVED LANGUAGE SWITCHER & MASUK BUTTON */}
        <div className="w-full bg-white/95 backdrop-blur-xl border-b border-slate-200/90 shadow-2xs">
          <div className="max-w-[1400px] mx-auto px-6 md:px-8 h-[68px] sm:h-[72px] flex items-center justify-between">
            {/* Kiri: Logo Kotak Hijau & Teks Brand */}
            <Link to="/" className="flex items-center gap-3.5 select-none no-underline group">
              <div 
                className="w-10 h-10 lg:w-11 lg:h-11 rounded-2xl flex items-center justify-center text-white font-black text-lg shadow-2xs group-hover:scale-105 transition-all duration-300 shrink-0"
                style={{ backgroundColor: primaryColor || '#153f32' }}
              >
                {logoUrl ? (
                  <img src={logoUrl} alt="Logo" className="w-7 h-7 object-contain" />
                ) : (
                  <span>{logoText || "2"}</span>
                )}
              </div>

              <div className="flex flex-col text-left">
                <div className="flex items-baseline">
                  <span 
                    className="text-lg lg:text-[21px] font-black tracking-tight leading-none"
                    style={{ color: '#0f172a' }}
                  >
                    {appName}
                  </span>
                  <span className="font-black text-lg lg:text-[21px] leading-none ml-0.5" style={{ color: primaryColor || '#059669' }}>
                    .
                  </span>
                </div>
                <span 
                  className="text-[9.5px] lg:text-[10px] font-black uppercase tracking-[0.2em] mt-1 leading-none font-mono"
                  style={{ color: '#64748b' }}
                >
                  {appSettings?.logoSmallText || t("SISTEM INFORMASI AKADEMIK", "ACADEMIC INFORMATION SYSTEM")}
                </span>
              </div>
            </Link>

            {/* Kanan: Navigasi Menu, Ganti Bahasa, dan Tombol Masuk Akun (Desktop) */}
            <div className="hidden md:flex items-center gap-7 lg:gap-8">
              <nav className="flex items-center gap-6 lg:gap-7 font-sans">
                <button
                  type="button"
                  onClick={scrollToLayanan}
                  className="text-xs lg:text-[13.5px] font-bold transition-colors cursor-pointer bg-transparent border-none p-0 hover:text-[var(--ui-primary)]"
                  style={{ color: '#334155' }}
                >
                  {t('Layanan', 'Services')}
                </button>
                <button
                  type="button"
                  onClick={scrollToAksesAkun}
                  className="text-xs lg:text-[13.5px] font-bold transition-colors cursor-pointer bg-transparent border-none p-0 hover:text-[var(--ui-primary)]"
                  style={{ color: '#334155' }}
                >
                  {t('Akses Akun', 'Account Access')}
                </button>
                <button
                  type="button"
                  onClick={handleOpenBantuan}
                  className="text-xs lg:text-[13.5px] font-bold transition-colors cursor-pointer bg-transparent border-none p-0 hover:text-[var(--ui-primary)]"
                  style={{ color: '#334155' }}
                >
                  {t('Bantuan', 'Help')}
                </button>
              </nav>

              {/* Improved Language Switcher (Segmented Control dengan Radius Serasi) */}
              <div 
                className="inline-flex items-center p-1 rounded-xl bg-slate-100/90 border border-slate-200/90 shadow-2xs"
                style={{ borderRadius: '12px' }}
              >
                <button
                  type="button"
                  onClick={() => setActiveLang('ID')}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs transition-all cursor-pointer border-none ${
                    activeLang === 'ID'
                      ? 'bg-white shadow-2xs font-extrabold'
                      : 'bg-transparent hover:text-slate-900 font-semibold'
                  }`}
                  style={{
                    borderRadius: '8px',
                    color: activeLang === 'ID' ? '#0f172a' : '#64748b'
                  }}
                  title="Bahasa Indonesia"
                >
                  <IndoFlagMini />
                  <span>ID</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveLang('EN')}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs transition-all cursor-pointer border-none ${
                    activeLang === 'EN'
                      ? 'bg-white shadow-2xs font-extrabold'
                      : 'bg-transparent hover:text-slate-900 font-semibold'
                  }`}
                  style={{
                    borderRadius: '8px',
                    color: activeLang === 'EN' ? '#0f172a' : '#64748b'
                  }}
                  title="English"
                >
                  <UKFlagMini />
                  <span>EN</span>
                </button>
              </div>

              {/* Tombol Masuk Akun */}
              <button
                type="button"
                onClick={() => setIsLoginModalOpen && setIsLoginModalOpen(true)}
                className="rounded-xl text-white text-xs lg:text-sm font-bold flex items-center gap-2 px-5 py-2.5 shadow-xs hover:shadow-md hover:scale-[1.02] active:scale-95 transition-all cursor-pointer border-none"
                style={{ backgroundColor: primaryButtonColor, color: '#ffffff' }}
                title={t("Buka Portal & Masuk Akun", "Open Portal & Sign In")}
              >
                <span>{t("Masuk Akun", "Sign In")}</span>
                <ArrowUpRight size={15} strokeWidth={2.6} />
              </button>
            </div>

            {/* Hamburger Menu Button (Mobile) */}
            <div className="flex items-center gap-2.5 md:hidden">
              {/* Quick Language Toggle */}
              <div 
                className="inline-flex items-center p-0.5 rounded-xl bg-slate-100 border border-slate-200/80"
                style={{ borderRadius: '10px' }}
              >
                <button
                  type="button"
                  onClick={() => setActiveLang('ID')}
                  className={`px-2 py-0.5 rounded-lg text-[10.5px] font-bold border-none cursor-pointer ${
                    activeLang === 'ID' ? 'bg-white text-slate-900 shadow-2xs font-black' : 'bg-transparent text-slate-400'
                  }`}
                  style={{ borderRadius: '7px' }}
                >
                  ID
                </button>
                <button
                  type="button"
                  onClick={() => setActiveLang('EN')}
                  className={`px-2 py-0.5 rounded-lg text-[10.5px] font-bold border-none cursor-pointer ${
                    activeLang === 'EN' ? 'bg-white text-slate-900 shadow-2xs font-black' : 'bg-transparent text-slate-400'
                  }`}
                  style={{ borderRadius: '7px' }}
                >
                  EN
                </button>
              </div>
              
              <button
                type="button"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="p-2 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer bg-white"
              >
                {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Drawer Navigation */}
      {mobileMenuOpen && (
        <div 
          className="md:hidden fixed top-[110px] left-4 right-4 bg-white/98 backdrop-blur-xl border border-slate-200/90 rounded-2xl z-40 flex flex-col p-5 gap-4 animate-in slide-in-from-top-2 duration-200 shadow-lg text-left"
        >
          <nav className="flex flex-col gap-2">
            <button
              type="button"
              onClick={scrollToLayanan}
              className="text-sm font-bold text-slate-800 hover:text-emerald-800 p-2.5 rounded-xl hover:bg-slate-50 text-left cursor-pointer border-none bg-transparent"
            >
              {t('Layanan', 'Services')}
            </button>
            <button
              type="button"
              onClick={scrollToAksesAkun}
              className="text-sm font-bold text-slate-800 hover:text-emerald-800 p-2.5 rounded-xl hover:bg-slate-50 text-left cursor-pointer border-none bg-transparent"
            >
              {t('Akses Akun', 'Account Access')}
            </button>
            <button
              type="button"
              onClick={handleOpenBantuan}
              className="text-sm font-bold text-slate-800 hover:text-emerald-800 p-2.5 rounded-xl hover:bg-slate-50 text-left cursor-pointer border-none bg-transparent"
            >
              {t('Bantuan', 'Help')}
            </button>
          </nav>
          
          <div className="border-t border-slate-100 pt-3 flex items-center justify-between">
            <span className="text-[11px] font-black uppercase tracking-wider text-slate-400 font-mono">
              {t('Portal & Akses', 'Portal & Access')}
            </span>
            <button
              type="button"
              onClick={() => {
                setMobileMenuOpen(false);
                if (setIsLoginModalOpen) setIsLoginModalOpen(true);
              }}
              className="flex items-center gap-2 rounded-xl text-xs font-bold text-white px-4 py-2.5 cursor-pointer border-none shadow-xs"
              style={{ backgroundColor: primaryButtonColor }}
            >
              <span>{t('Masuk Akun', 'Sign In')}</span>
              <ArrowUpRight size={14} strokeWidth={2.6} />
            </button>
          </div>
        </div>
      )}

      {/* MODAL BANTUAN */}
      {isBantuanOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/80 animate-in fade-in duration-200">
          <div className="bg-white rounded-[var(--ui-radius-card)] shadow-xs w-full max-w-md overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="px-6 py-4 border-b border-slate-150 flex items-center justify-between bg-slate-50/50">
              <h3 className="font-extrabold text-slate-800 text-sm flex items-center gap-2">
                <HelpCircle className="text-indigo-500 animate-pulse" size={18} />
                {t('Pusat Bantuan & Layanan', 'Help Center & Services')}
              </h3>
              <button 
                onClick={() => setIsBantuanOpen(false)} 
                className="text-slate-400 hover:text-slate-600 border-none bg-transparent cursor-pointer p-1"
              >
                <X size={20} />
              </button>
            </div>
            
            {/* Body */}
            <div className="p-6 space-y-4 text-xs font-semibold text-slate-600 max-h-[70vh] overflow-y-auto">
              <div className="bg-indigo-50 border border-indigo-100 rounded-[var(--ui-radius-small)] p-4 text-indigo-800 flex items-start gap-2.5">
                <Info size={16} className="shrink-0 mt-0.5" />
                <p className="leading-relaxed">
                  {t(
                    'Butuh bantuan untuk masuk ke sistem atau memiliki pertanyaan seputar KBM? Silakan cek FAQ atau hubungi admin di bawah.',
                    'Need assistance signing in to the system or have academic questions? Please check the FAQ or contact the school admin below.'
                  )}
                </p>
              </div>

              <div className="space-y-3">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  {t('Pertanyaan Umum (FAQ)', 'Frequently Asked Questions (FAQ)')}
                </p>
                <div className="border border-slate-100 rounded-[var(--ui-radius-small)] p-3 bg-slate-50/40">
                  <p className="font-extrabold text-slate-800 mb-1">
                    {t('Bagaimana cara masuk ke sistem?', 'How do I sign in to the portal?')}
                  </p>
                  <p className="leading-relaxed font-medium">
                    {t(
                      'Klik tombol "Masuk" di kanan atas halaman, lalu gunakan username dan password resmi yang diberikan sekolah.',
                      'Click the "Sign In" button at the top right, then use the official username and password provided by the school.'
                    )}
                  </p>
                </div>
                <div className="border border-slate-100 rounded-[var(--ui-radius-small)] p-3 bg-slate-50/40">
                  <p className="font-extrabold text-slate-800 mb-1">
                    {t('Lupa password atau tidak bisa login?', 'Forgot password or unable to log in?')}
                  </p>
                  <p className="leading-relaxed font-medium">
                    {t(
                      'Silakan hubungi administrator sekolah untuk melakukan reset password akun Anda.',
                      'Please contact the school IT administrator to reset your account credentials.'
                    )}
                  </p>
                </div>
              </div>

              <div className="space-y-2.5 pt-2">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  {t('Hubungi Admin Sekolah', 'Contact School Admin')}
                </p>
                
                {contactPhone && (
                  <a 
                    href={getWaLink()} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 p-3 border border-slate-100 hover:border-emerald-200 hover:bg-emerald-50/30 rounded-[var(--ui-radius-small)] transition-all text-slate-700 no-underline cursor-pointer group"
                  >
                    <div className="w-8 h-8 rounded-[var(--ui-radius-small)] bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                      <MessageSquare size={16} />
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
                    <div className="w-8 h-8 rounded-[var(--ui-radius-small)] bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                      <Mail size={16} />
                    </div>
                    <div>
                      <p className="font-extrabold text-[12px] text-slate-800 leading-none mb-1">Email Layanan</p>
                      <p className="text-[10.5px] font-bold text-slate-400 leading-none">{contactEmail}</p>
                    </div>
                  </a>
                )}

                {appSettings?.socialInstagram && (
                  <a 
                    href={getAbsoluteUrl(appSettings.socialInstagram)} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 p-3 border border-slate-100 hover:border-pink-200 hover:bg-pink-50/30 rounded-[var(--ui-radius-small)] transition-all text-slate-700 no-underline cursor-pointer group"
                  >
                    <div className="w-8 h-8 rounded-[var(--ui-radius-small)] bg-pink-50 text-pink-600 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line></svg>
                    </div>
                    <div>
                      <p className="font-extrabold text-[12px] text-slate-800 leading-none mb-1">Instagram Instansi</p>
                      <p className="text-[10.5px] font-bold text-slate-400 leading-none">Kunjungi Profil</p>
                    </div>
                  </a>
                )}

                {appSettings?.socialFacebook && (
                  <a 
                    href={getAbsoluteUrl(appSettings.socialFacebook)} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 p-3 border border-slate-100 hover:border-indigo-200 hover:bg-indigo-50/30 rounded-[var(--ui-radius-small)] transition-all text-slate-700 no-underline cursor-pointer group"
                  >
                    <div className="w-8 h-8 rounded-[var(--ui-radius-small)] bg-indigo-50 text-indigo-700 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"></path></svg>
                    </div>
                    <div>
                      <p className="font-extrabold text-[12px] text-slate-800 leading-none mb-1">Facebook Instansi</p>
                      <p className="text-[10.5px] font-bold text-slate-400 leading-none">Kunjungi Profil</p>
                    </div>
                  </a>
                )}

                {appSettings?.socialYoutube && (
                  <a 
                    href={getAbsoluteUrl(appSettings.socialYoutube)} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 p-3 border border-slate-100 hover:border-rose-200 hover:bg-rose-50/30 rounded-[var(--ui-radius-small)] transition-all text-slate-700 no-underline cursor-pointer group"
                  >
                    <div className="w-8 h-8 rounded-[var(--ui-radius-small)] bg-rose-50 text-rose-600 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22.54 6.42a2.78 2.78 0 0 0-1.94-2C18.88 4 12 4 12 4s-6.88 0-8.6.46a2.78 2.78 0 0 0-1.94 2A29 29 0 0 0 1 11.75a29 29 0 0 0 .46 5.33 2.78 2.78 0 0 0 1.94 2c1.72.46 8.6.46 8.6.46s6.88 0 8.6-.46a2.78 2.78 0 0 0 1.94-2 29 29 0 0 0 .46-5.33 29 29 0 0 0-.46-5.33z"></path><polygon points="9.75 15.02 15.5 11.75 9.75 8.48 9.75 15.02"></polygon></svg>
                    </div>
                    <div>
                      <p className="font-extrabold text-[12px] text-slate-800 leading-none mb-1">YouTube Instansi</p>
                      <p className="text-[10.5px] font-bold text-slate-400 leading-none">Kunjungi Profil</p>
                    </div>
                  </a>
                )}
              </div>
            </div>
            
            {/* Footer */}
            <div className="px-6 py-3 border-t border-slate-100 bg-slate-50/50 flex justify-end">
              <button 
                onClick={() => setIsBantuanOpen(false)}
                className="bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-[var(--ui-radius-small)] cursor-pointer border-none transition-colors h-10 px-4 text-sm font-bold"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL PANDUAN (Fallback for subpages where PublicGuideModal is not mounted) */}
      {isPanduanOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/80 animate-in fade-in duration-200">
          <div className="bg-white rounded-[var(--ui-radius-card)] shadow-xs w-full max-w-md overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="px-6 py-4 border-b border-slate-150 flex items-center justify-between bg-slate-50/50">
              <h3 className="font-extrabold text-slate-800 text-sm flex items-center gap-2">
                <BookOpen className="text-emerald-500 animate-pulse" size={18} />
                Panduan Penggunaan
              </h3>
              <button 
                onClick={() => setIsPanduanOpen(false)} 
                className="text-slate-400 hover:text-slate-600 border-none bg-transparent cursor-pointer p-1"
              >
                <X size={20} />
              </button>
            </div>
            
            {/* Body */}
            <div className="p-6 space-y-4 text-xs font-semibold text-slate-600 max-h-[70vh] overflow-y-auto">
              <div className="space-y-3">
                <div className="flex gap-3 items-start">
                  <div className="w-6 h-6 rounded-full bg-slate-100 text-slate-800 font-black flex items-center justify-center text-[11px] shrink-0">1</div>
                  <div>
                    <p className="font-extrabold text-slate-800 mb-0.5">Cek Jadwal Pelajaran</p>
                    <p className="leading-relaxed text-slate-400 font-medium">Buka halaman utama lalu tekan menu'Jadwal Pelajaran' untuk memantau jam mengajar guru atau jam KBM aktif.</p>
                  </div>
                </div>

                <div className="flex gap-3 items-start">
                  <div className="w-6 h-6 rounded-full bg-slate-100 text-slate-800 font-black flex items-center justify-center text-[11px] shrink-0">2</div>
                  <div>
                    <p className="font-extrabold text-slate-800 mb-0.5">Akses Denah Kelas</p>
                    <p className="leading-relaxed text-slate-400 font-medium">Lihat tata letak ruangan, letak bangku kelas secara interaktif di menu'Denah Kelas'.</p>
                  </div>
                </div>

                <div className="flex gap-3 items-start">
                  <div className="w-6 h-6 rounded-full bg-slate-100 text-slate-800 font-black flex items-center justify-center text-[11px] shrink-0">3</div>
                  <div>
                    <p className="font-extrabold text-slate-800 mb-0.5">Unduh Modul Ajar</p>
                    <p className="leading-relaxed text-slate-400 font-medium">Cari materi belajar digital yang disediakan oleh guru secara online di menu'Modul Ajar'.</p>
                  </div>
                </div>

                <div className="flex gap-3 items-start">
                  <div className="w-6 h-6 rounded-full bg-slate-100 text-slate-800 font-black flex items-center justify-center text-[11px] shrink-0">4</div>
                  <div>
                    <p className="font-extrabold text-slate-800 mb-0.5">Masuk ke Portal Internal</p>
                    <p className="leading-relaxed text-slate-400 font-medium">Gunakan tombol'Masuk' di header kanan untuk masuk ke aplikasi absensi, piket, kedisiplinan, atau logbook PKL.</p>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Footer */}
            <div className="px-6 py-3 border-t border-slate-100 bg-slate-50/50 flex justify-end">
              <button 
                onClick={() => setIsPanduanOpen(false)}
                className="bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-[var(--ui-radius-small)] cursor-pointer border-none transition-colors h-10 px-4 text-sm font-bold"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
