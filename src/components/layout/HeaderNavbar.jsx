import { useState, useEffect } from'react';
import { useLocation } from'react-router-dom';
import { Link } from'react-router-dom';
import { LogIn, X, Menu, HelpCircle, Info, MessageSquare, Mail, BookOpen } from'lucide-react';


export default function HeaderNavbar({ setIsLoginModalOpen, appSettings, schoolProfile, onPanduanClick }) {
  const location = useLocation();
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeLang, setActiveLang] = useState('ID');

  // Modal states
  const [isBantuanOpen, setIsBantuanOpen] = useState(false);
  const [isPanduanOpen, setIsPanduanOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    // Check initial scroll state immediately
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navLinks = [
    { to:'/', label:'Beranda' },
    { to:'#bantuan', label:'Bantuan', isBantuan: true },
    { to:'#panduan', label:'Panduan', isPanduan: true },
  ];

  // Resolve dynamic settings
  const logoUrl = appSettings?.logoWebUrl || schoolProfile?.logo_url || appSettings?.logoUrl;
  const logoText = appSettings?.logoText ||'TS';
  const appName = appSettings?.appName ||'Sistem Akademik';

  // Fallback to reactive props directly, ensuring exact sync
  const primaryColor = appSettings?.primaryColor ||'#064e3b';
  const surfaceColor = appSettings?.surfaceColor || appSettings?.bgColor ||'#ffffff';
  const contactEmail = appSettings?.contactEmail ||'admin@school.sch.id';
  const contactPhone = appSettings?.contactPhone ||'+62 123-456-789';

  // Helper to convert hex to rgba for maximum browser compatibility without color-mix
  const hexToRgba = (hexColor, alpha = 1) => {
    try {
      const cleanHex = String(hexColor).replace('#','').trim();
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
    const cleanPhone = String(contactPhone).replace(/\D/g,'');
    const waNumber = cleanPhone.startsWith('0') ?'62' + cleanPhone.slice(1) : cleanPhone;
    return `https://wa.me/${waNumber}?text=Halo%20Admin%2C%20saya%20butuh%20bantuan%20terkait%20aplikasi%20${encodeURIComponent(appName)}...`;
  };

  const getAbsoluteUrl = (url) => {
    if (!url) return'';
    const trimmed = String(url).trim();
    if (/^https?:\/\//i.test(trimmed)) {
      return trimmed;
    }
    return `https://${trimmed}`;
  };

  // Indo Flag Component (Red-White)
  const IndoFlag = () => (
    <div 
      onClick={() => setActiveLang('ID')}
      className={`w-7 h-[18px] rounded-[3px] overflow-hidden border flex flex-col cursor-pointer transition-all duration-200 ${
        activeLang ==='ID' 
          ?'scale-105 border-transparent shadow-xs' 
          :'border-slate-200 opacity-60 hover:opacity-100'
      }`}
      style={{
        boxShadow: activeLang ==='ID' 
          ? `0 0 0 2px ${scrolled ? surfaceColor : primaryColor}` 
          :'none'
      }}
      title="Bahasa Indonesia"
    >
      <div className="bg-[#EF4444] h-1/2 w-full"></div>
      <div className="bg-white h-1/2 w-full"></div>
    </div>
  );

  // UK Flag Component (Union Jack SVG)
  const UKFlag = () => (
    <svg 
      onClick={() => setActiveLang('EN')}
      viewBox="0 0 60 30" 
      className={`w-7 h-[18px] rounded-[3px] overflow-hidden border cursor-pointer transition-all duration-200 ${
        activeLang ==='EN' 
          ?'scale-105 border-transparent shadow-xs' 
          :'border-slate-200 opacity-60 hover:opacity-100'
      }`}
      style={{
        boxShadow: activeLang ==='EN' 
          ? `0 0 0 2px ${scrolled ? surfaceColor : primaryColor}` 
          :'none'
      }}
      title="English"
    >
      <rect width="60" height="30" fill="#012169"/>
      <path d="M0,0 L60,30 M60,0 L0,30" stroke="#fff" strokeWidth="6"/>
      <path d="M0,0 L60,30 M60,0 L0,30" stroke="#C8102E" strokeWidth="4"/>
      <path d="M30,0 L30,30 M0,15 L60,15" stroke="#fff" strokeWidth="10"/>
      <path d="M30,0 L30,30 M0,15 L60,15" stroke="#C8102E" strokeWidth="6"/>
    </svg>
  );

  const handleLinkClick = (e, link) => {
    if (link.isBantuan || link.isPanduan) {
      e.preventDefault();
      if (link.isBantuan) {
        setIsBantuanOpen(true);
      } else if (link.isPanduan) {
        setIsPanduanOpen(true);
      }
    }
    setMobileMenuOpen(false);
  };

  const [buttonHovered, setButtonHovered] = useState(false);

  // Determine dynamic styles based on headerStyle config
  const headerStyle = appSettings?.headerStyle || 'primary'; // 'primary', 'glass', 'solid', 'minimal'
  
  let headerBgColor = primaryColor;
  let headerBorderColor = hexToRgba(surfaceColor, 0.15);
  let headerTextColor = surfaceColor; 
  let headerMutedTextColor = hexToRgba(surfaceColor, 0.8);
  let headerBackdropFilter = 'blur(12px)';
  let headerShadow = '0 10px 25px -5px rgba(0,0,0,0.15), 0 8px 10px -6px rgba(0,0,0,0.1)';
  
  let buttonBorderColor = surfaceColor;
  let buttonTextColor = surfaceColor;
  let buttonBgColor = 'transparent';
  let buttonHoverBgColor = surfaceColor;
  let buttonHoverTextColor = primaryColor;

  if (headerStyle === 'solid') {
    headerBgColor = surfaceColor; // solid white/surface
    headerBorderColor = 'rgba(0,0,0,0.08)';
    headerTextColor = '#1e293b';
    headerMutedTextColor = '#64748b';
    headerBackdropFilter = 'none';
    headerShadow = '0 4px 6px -1px rgba(0, 0, 0, 0.05)';
    
    buttonBorderColor = primaryColor;
    buttonTextColor = primaryColor;
    buttonHoverBgColor = primaryColor;
    buttonHoverTextColor = surfaceColor;
  } else if (headerStyle === 'glass') {
    headerBgColor = hexToRgba(surfaceColor, 0.7); // translucent
    headerBorderColor = 'rgba(0,0,0,0.05)';
    headerTextColor = '#1e293b';
    headerMutedTextColor = '#64748b';
    headerBackdropFilter = 'blur(16px)';
    headerShadow = '0 4px 6px -1px rgba(0, 0, 0, 0.05)';
    
    buttonBorderColor = primaryColor;
    buttonTextColor = primaryColor;
    buttonHoverBgColor = primaryColor;
    buttonHoverTextColor = surfaceColor;
  } else if (headerStyle === 'minimal') {
    headerBgColor = hexToRgba(surfaceColor, 0.45); // subtle thin glass box
    headerBorderColor = 'rgba(255, 255, 255, 0.25)';
    headerTextColor = primaryColor;
    headerMutedTextColor = hexToRgba(primaryColor, 0.8);
    headerBackdropFilter = 'blur(12px)';
    headerShadow = '0 8px 32px 0 rgba(0, 0, 0, 0.04)';
    
    buttonBorderColor = primaryColor;
    buttonTextColor = primaryColor;
    buttonHoverBgColor = primaryColor;
    buttonHoverTextColor = surfaceColor;
  }

  return (
    <>
      <div 
        role="banner"
        className="fixed top-4 left-6 md:left-8 right-6 md:right-8 mx-auto max-w-[1336px] z-50 py-2 pl-4 md:pl-5 pr-6 md:pr-8 flex items-center justify-between transition-all duration-300 border rounded-[var(--ui-radius-card)]"
        style={{
          backgroundColor: headerBgColor,
          borderColor: headerBorderColor,
          backdropFilter: headerBackdropFilter,
          WebkitBackdropFilter: headerBackdropFilter,
          boxShadow: headerShadow,
        }}
      >
        <div className="w-full flex items-center justify-between">
          {/* Kiri: Logo Dinamis & Portal Teks */}
          <Link to="/" className="flex items-center gap-2.5 shrink-0 select-none group no-underline">
            {/* Logo image or fallback initials */}
            <div className="relative shrink-0 w-[30px] h-[30px] flex items-center justify-center transition-transform duration-300 group-hover:scale-105">
              {logoUrl ? (
                <img
                  src={logoUrl}
                  alt="Logo"
                  className="h-full w-full object-contain"
                />
              ) : (
                <div
                  className="h-full w-full rounded-md flex items-center justify-center font-black text-[10px] shrink-0 shadow-sm transition-colors duration-300"
                  style={{ 
                    backgroundColor: headerStyle === 'primary' ? surfaceColor : primaryColor,
                    color: headerStyle === 'primary' ? primaryColor : surfaceColor
                  }}
                >
                  {logoText}
                </div>
              )}
            </div>
            {/* Brand text */}
            <div className="flex flex-col text-left justify-center leading-none">
              <span 
                className="text-[9.5px] font-bold uppercase tracking-[0.18em] leading-none mb-[3px] transition-colors duration-300"
                style={{ color: headerMutedTextColor }}
              >
                {appSettings?.logoSmallText !== undefined ? appSettings.logoSmallText :"PORTAL"}
              </span>
              <span 
                className="font-extrabold text-[15.5px] tracking-tight leading-none uppercase transition-colors duration-300"
                style={{ color: headerTextColor }}
              >
                {appName}
              </span>
            </div>
          </Link>

          {/* Kanan: Navigasi, Bendera, dan Masuk (Desktop) */}
          <div className="hidden md:flex items-center gap-8 lg:gap-10">
            <nav className="flex items-center gap-6 lg:gap-8 font-sans">
              {navLinks.map((link) => {
                const isActive = location.pathname === link.to && !link.isBantuan && !link.isPanduan;
                return (
                  <Link
                    key={link.label}
                    to={link.to}
                    onClick={(e) => handleLinkClick(e, link)}
                    className="text-[14px] font-medium transition-colors duration-300 no-underline tracking-wide"
                    style={{
                      color: headerTextColor,
                      opacity: isActive ? 1 : 0.75
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.opacity ='1';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.opacity = isActive ?'1' :'0.75';
                    }}
                  >
                    {link.label}
                  </Link>
                );
              })}
            </nav>

            {/* Bendera Negara */}
            <div className="flex items-center gap-2 border-l border-slate-200/20 pl-6 lg:pl-8 h-5">
              <IndoFlag />
              <UKFlag />
            </div>

            {/* Tombol Masuk */}
            <button
              onClick={() => setIsLoginModalOpen && setIsLoginModalOpen(true)}
              className="rounded-[var(--ui-radius-small)] border text-[13.5px] transition-all duration-300 cursor-pointer flex items-center gap-1.5 h-10 px-4 text-sm font-bold"
              style={{
                borderColor: buttonBorderColor,
                color: buttonHovered ? buttonHoverTextColor : buttonTextColor,
                backgroundColor: buttonHovered ? buttonHoverBgColor : buttonBgColor
              }}
              onMouseEnter={() => setButtonHovered(true)}
              onMouseLeave={() => setButtonHovered(false)}
              title="Masuk ke Aplikasi"
            >
              <LogIn size={15} strokeWidth={2.5} />
              Masuk
            </button>
          </div>

          {/* Hamburger Menu Button (Mobile) */}
          <div className="flex items-center gap-3 md:hidden">
            {/* Quick Language Toggle */}
            <div className="flex items-center gap-1.5 mr-2">
              <IndoFlag />
              <UKFlag />
            </div>
            
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-1.5 rounded-[var(--ui-radius-small)] border transition-colors cursor-pointer bg-transparent"
              style={{
                borderColor: hexToRgba(headerTextColor, 0.3),
                color: headerTextColor
              }}
            >
              {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer Navigation */}
      {mobileMenuOpen && (
        <div 
          className="md:hidden fixed top-[75px] left-4 right-4 backdrop-blur-md border rounded-[var(--ui-radius-card)] z-40 flex flex-col p-5 gap-4 animate-in slide-in-from-top-2 duration-200 shadow-sm"
          style={{
            backgroundColor: headerBgColor === 'transparent' ? primaryColor : headerBgColor,
            borderColor: headerBorderColor
          }}
        >
          <nav className="flex flex-col gap-3.5">
            {navLinks.map((link) => {
              const isActive = location.pathname === link.to && !link.isBantuan && !link.isPanduan;
              return (
                <Link
                  key={link.label}
                  to={link.to}
                  onClick={(e) => handleLinkClick(e, link)}
                  className="text-[14px] rounded-[var(--ui-radius-small)] transition-colors duration-200 no-underline text-left block h-10 px-4 text-sm font-bold"
                  style={{
                    color: isActive ? (headerStyle === 'primary' ? primaryColor : surfaceColor) : headerTextColor,
                    backgroundColor: isActive ? (headerStyle === 'primary' ? surfaceColor : primaryColor) : 'transparent'
                  }}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>
          
          <div className="border-t border-slate-200/20 pt-4 flex items-center justify-between">
            <span 
              className="text-[12px] font-medium uppercase tracking-wider"
              style={{ color: headerMutedTextColor }}
            >
              Portal & Akses
            </span>
            <button
              onClick={() => {
                setMobileMenuOpen(false);
                if (setIsLoginModalOpen) setIsLoginModalOpen(true);
              }}
              className="flex items-center gap-2 border rounded-[var(--ui-radius-small)] text-[13px] transition-colors cursor-pointer h-10 px-4 text-sm font-bold"
              style={{
                borderColor: surfaceColor,
                color: surfaceColor,
                backgroundColor:'transparent'
              }}
            >
              <LogIn size={14} strokeWidth={2.5} />
              Masuk Sistem
            </button>
          </div>
        </div>
      )}

      {/* MODAL BANTUAN */}
      {isBantuanOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-[var(--ui-radius-card)] shadow-xs w-full max-w-md overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="px-6 py-4 border-b border-slate-150 flex items-center justify-between bg-slate-50/50">
              <h3 className="font-extrabold text-slate-800 text-sm flex items-center gap-2">
                <HelpCircle className="text-blue-500 animate-pulse" size={18} />
                Pusat Bantuan & Layanan
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
              <div className="bg-blue-50 border border-blue-100 rounded-[var(--ui-radius-small)] p-4 text-blue-800 flex items-start gap-2.5">
                <Info size={16} className="shrink-0 mt-0.5" />
                <p className="leading-relaxed">
                  Butuh bantuan untuk masuk ke sistem atau memiliki pertanyaan seputar KBM? Silakan cek FAQ atau hubungi admin di bawah.
                </p>
              </div>

              <div className="space-y-3">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Pertanyaan Umum (FAQ)</p>
                <div className="border border-slate-100 rounded-[var(--ui-radius-small)] p-3 bg-slate-50/40">
                  <p className="font-extrabold text-slate-800 mb-1">Bagaimana cara masuk ke sistem?</p>
                  <p className="leading-relaxed font-medium">Klik tombol"Masuk" di kanan atas halaman, lalu gunakan username dan password resmi yang diberikan sekolah.</p>
                </div>
                <div className="border border-slate-100 rounded-[var(--ui-radius-small)] p-3 bg-slate-50/40">
                  <p className="font-extrabold text-slate-800 mb-1">Lupa password atau tidak bisa login?</p>
                  <p className="leading-relaxed font-medium">Silakan hubungi administrator sekolah untuk melakukan reset password akun Anda.</p>
                </div>
              </div>

              <div className="space-y-2.5 pt-2">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Hubungi Admin Sekolah</p>
                
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
                    className="flex items-center gap-3 p-3 border border-slate-100 hover:border-blue-200 hover:bg-blue-50/30 rounded-[var(--ui-radius-small)] transition-all text-slate-700 no-underline cursor-pointer group"
                  >
                    <div className="w-8 h-8 rounded-[var(--ui-radius-small)] bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
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
                    className="flex items-center gap-3 p-3 border border-slate-100 hover:border-blue-200 hover:bg-blue-50/30 rounded-[var(--ui-radius-small)] transition-all text-slate-700 no-underline cursor-pointer group"
                  >
                    <div className="w-8 h-8 rounded-[var(--ui-radius-small)] bg-blue-50 text-blue-700 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
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
                    className="flex items-center gap-3 p-3 border border-slate-100 hover:border-red-200 hover:bg-red-50/30 rounded-[var(--ui-radius-small)] transition-all text-slate-700 no-underline cursor-pointer group"
                  >
                    <div className="w-8 h-8 rounded-[var(--ui-radius-small)] bg-red-50 text-rose-600 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
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
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
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
