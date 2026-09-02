import { Button } from '../components/ui.jsx';
import React, { useState, useEffect, useMemo } from'react';
import { useOutletContext, useNavigate, Link } from'react-router-dom';
import { Lock, User, CalendarDays, MapPin, BookOpenText, Calendar, Briefcase, HelpCircle, ShieldCheck, BookOpen, MessageSquare, MonitorSmartphone, Wifi, Palette, Users, Sparkles, LogIn, GraduationCap } from'lucide-react';
import { X, Search, ArrowRight, ChevronLeft, Check, Info, Mail } from'lucide-react';
import HeaderNavbar from '../components/layout/HeaderNavbar.jsx';



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
  } catch (e) {}
  return hexColor;
};

const ICON_MAP = {
  book: BookOpen, chat: MessageSquare, monitor: MonitorSmartphone, wifi: Wifi,
  palette: Palette, map: MapPin, users: Users, sparkles: Sparkles,
  user: User, booktext: BookOpenText, shield: ShieldCheck
};

export default function LandingPage() {
  const { appSettings, setIsLoginModalOpen, setModalViewMode } = useOutletContext();
  const navigate = useNavigate();

  const [isMobile, setIsMobile] = useState(false);
  const [screenWidth, setScreenWidth] = useState(window.innerWidth);
  const [screenHeight, setScreenHeight] = useState(window.innerHeight);
  const isShortScreen = isMobile && (screenHeight <= 750 || screenWidth <= 390);
  const isTinyScreen = isMobile && (screenHeight <= 580 || screenWidth <= 340);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [showPublicGuide, setShowPublicGuide] = useState(false);
  const [showPublicHelp, setShowPublicHelp] = useState(false);
  const [isNavScrolled, setIsNavScrolled] = useState(false);

  const [showRulesModal, setShowRulesModal] = useState(false);
  const [activeRulesTab, setActiveRulesTab] = useState("pdf"); //"pdf" or"data"
  const [masterRules, setMasterRules] = useState([]);
  const [rulesSearch, setRulesSearch] = useState("");
  const [rulesFilterType, setRulesFilterType] = useState("all");
  const [loadingRules, setLoadingRules] = useState(false);
  const [hasPdf, setHasPdf] = useState(false);

  const getWaLink = () => {
    const contactPhone = appSettings?.contactPhone ||'+62 123-456-789';
    const cleanPhone = String(contactPhone).replace(/\D/g,'');
    const waNumber = cleanPhone.startsWith('0') ?'62' + cleanPhone.slice(1) : cleanPhone;
    return `https://wa.me/${waNumber}?text=Halo%20Admin%2C%20saya%20butuh%20bantuan%20terkait%20aplikasi%20${encodeURIComponent(appSettings.appName ||'Sistem Akademik')}...`;
  };

  const checkPdfExists = async () => {
    try {
      const res = await fetch('/api/kedisiplinan/rules.pdf', { method:'HEAD' });
      setHasPdf(res.ok);
    } catch {
      setHasPdf(false);
    }
  };

  useEffect(() => {
    checkPdfExists();
  }, []);

  // Scroll-aware navbar: transparent at top, solid when scrolled
  useEffect(() => {
    const handleScroll = () => {
      setIsNavScrolled(window.scrollY > 30);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    if (showRulesModal && activeRulesTab ==="data" && masterRules.length === 0) {
      setLoadingRules(true);
      fetch("/api/kedisiplinan/master")
        .then(res => res.json())
        .then(data => {
          if (data.ok) {
            setMasterRules(data.data || []);
          }
        })
        .catch(err => console.error(err))
        .finally(() => setLoadingRules(false));
    }
  }, [showRulesModal, activeRulesTab, masterRules.length]);

  const filteredRules = useMemo(() => {
    return masterRules.filter(r => {
      const matchSearch = !rulesSearch || r.nama_tindakan?.toLowerCase().includes(rulesSearch.toLowerCase());
      const matchType = rulesFilterType ==='all' || r.jenis === rulesFilterType;
      return matchSearch && matchType;
    });
  }, [masterRules, rulesSearch, rulesFilterType]);

  const renderRulesModal = () => {
    if (!showRulesModal) return null;
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/80 animate-in fade-in duration-200">
        <div className="bg-white rounded-[var(--ui-radius-card)] border border-slate-100 shadow-xs w-full max-w-4xl h-[80vh] overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
          
          {/* Header */}
          <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50 shrink-0">
            <div className="text-left">
              <h3 className="font-black text-slate-800 text-[16px] tracking-tight flex items-center gap-2">
                <div className="w-8 h-8 rounded-[var(--ui-radius-small)] bg-rose-50 flex items-center justify-center text-rose-500">
                  <ShieldCheck size={18} strokeWidth={2.5} />
                </div>
                Peraturan &amp; Tata Tertib Sekolah
              </h3>
              <p className="text-[11.5px] text-slate-400 font-medium mt-1">Dokumen resmi tata tertib, kriteria pelanggaran, dan prestasi siswa</p>
            </div>
            <button 
              onClick={() => setShowRulesModal(false)} 
              className="cursor-pointer flex items-center justify-center w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 transition-colors border-none"
            >
              <X size={16} strokeWidth={2.5} />
            </button>
          </div>

          {/* Underline Tabs */}
          <div className="flex border-b border-slate-100 bg-white shrink-0 px-6">
            <button
              type="button"
              onClick={() => setActiveRulesTab("pdf")}
              className={`px-4 py-3 text-xs font-black transition-all duration-300 cursor-pointer border-b-2 ${
                activeRulesTab === 'pdf'
                  ? 'text-[var(--ui-primary)] border-[var(--ui-primary)]'
                  : 'text-slate-500 border-transparent hover:text-slate-800'
              }`}
            >
              Dokumen Resmi (PDF)
            </button>
            <button
              type="button"
              onClick={() => setActiveRulesTab("data")}
              className={`px-4 py-3 text-xs font-black transition-all duration-300 cursor-pointer border-b-2 ${
                activeRulesTab === 'data'
                  ? 'text-[var(--ui-primary)] border-[var(--ui-primary)]'
                  : 'text-slate-500 border-transparent hover:text-slate-800'
              }`}
            >
              Kriteria Skor Poin (Data)
            </button>
          </div>

          {/* Content Body */}
          <div className="flex-1 min-h-0 bg-slate-50">
            {activeRulesTab === "pdf" ? (
              hasPdf ? (
                <iframe
                  src="/api/kedisiplinan/rules.pdf"
                  className="w-full h-full border-none"
                  title="Peraturan Sekolah PDF"
                />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center p-8 bg-slate-50 text-center">
                  <div className="w-16 h-16 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mb-3">
                    <ShieldCheck size={32} strokeWidth={1.5} />
                  </div>
                  <h4 className="text-sm font-black text-slate-700">Dokumen PDF Belum Tersedia</h4>
                  <p className="text-[12px] text-slate-400 max-w-sm mt-1.5 font-medium leading-relaxed">Admin belum mengunggah dokumen PDF peraturan sekolah. Silakan cek tab "Kriteria Skor Poin" untuk melihat daftar aturan.</p>
                </div>
              )
            ) : (
              <div className="flex flex-col h-full bg-white p-6">
                
                {/* Search & Filter Header */}
                <div className="flex flex-col md:flex-row gap-4 mb-4 justify-between items-center shrink-0">
                  <div className="relative w-full md:w-80">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
                    <input
                      type="text"
                      placeholder="Cari aturan/tata tertib..."
                      value={rulesSearch}
                      onChange={e => setRulesSearch(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-[var(--ui-radius-small)] text-[12px] focus:outline-none focus:ring-2 focus:ring-[var(--ui-primary)]/10 focus:border-[var(--ui-primary)] font-semibold transition-all"
                    />
                  </div>
                  
                  <div className="flex items-center gap-2 overflow-x-auto no-scrollbar shrink-0 w-full md:w-auto">
                    {['all', 'pelanggaran', 'prestasi'].map((type) => (
                      <Button
                        key={type}
                        variant={rulesFilterType === type ? 'primary' : 'ghost'}
                        onClick={() => setRulesFilterType(type)}
                        className={`flex-1 md:flex-none shrink-0 text-[11px] font-black uppercase tracking-wider ${
                          rulesFilterType !== type ? 'text-slate-500' : ''
                        }`}
                      >
                        {type === 'all' ? 'Semua' : type}
                      </Button>
                    ))}
                  </div>
                </div>

                {/* Table Area */}
                <div className="flex-1 overflow-y-auto border border-slate-100 rounded-[var(--ui-radius-card)] custom-scrollbar text-left">
                  {loadingRules ? (
                    <div className="p-12 text-center text-slate-400 text-xs font-semibold">Memuat kriteria poin...</div>
                  ) : filteredRules.length === 0 ? (
                    <div className="p-12 text-center text-slate-400 text-xs font-medium">Tidak ditemukan kriteria poin.</div>
                  ) : (
                    <table className="w-full text-left text-xs border-collapse">
                      <thead className="bg-slate-50 text-slate-400 uppercase font-black tracking-wider sticky top-0 border-b border-slate-100 text-[10px]">
                        <tr>
                          <th className="px-5 py-3">Tata Tertib / Tindakan</th>
                          <th className="px-5 py-3 text-center w-28">Tipe</th>
                          <th className="px-5 py-3 text-right w-24">Skor Poin</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-bold text-slate-600">
                        {filteredRules.map((r) => {
                          const isPrestasi = r.jenis === 'prestasi';
                          return (
                            <tr key={r.id} className="hover:bg-slate-50/50 transition-colors">
                              <td className="px-5 py-3.5 align-middle break-words text-slate-700 text-[12px]">{r.nama_tindakan}</td>
                              <td className="px-5 py-3.5 text-center align-middle">
                                <span className={`px-2.5 py-0.5 rounded-[var(--ui-radius-pill)] text-[9.5px] font-extrabold border ${
                                  isPrestasi
                                    ? 'bg-emerald-50 text-emerald-600 border-emerald-100'
                                    : 'bg-rose-50 text-rose-600 border-rose-100'
                                }`}>
                                  {isPrestasi ? 'Prestasi' : 'Pelanggaran'}
                                </span>
                              </td>
                              <td className={`px-5 py-3.5 text-right font-black text-sm align-middle ${
                                isPrestasi ? 'text-emerald-600' : 'text-rose-600'
                              }`}>
                                {isPrestasi ? '-' : '+'}{r.nilai_poin}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/50 flex justify-end gap-3 shrink-0">
            {activeRulesTab === "pdf" && hasPdf && (
              <a
                href="/api/kedisiplinan/rules.pdf"
                download="peraturan_sekolah.pdf"
                className="px-5 py-2 text-white rounded-[var(--ui-radius-small)] font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 cursor-pointer text-center no-underline transition-all hover:opacity-90"
                style={{ backgroundColor: 'var(--ui-primary)' }}
              >
                Unduh PDF
              </a>
            )}
            <Button
              variant="outline"
              onClick={() => setShowRulesModal(false)}
            >
              Tutup
            </Button>
          </div>

        </div>
      </div>
    );
  };

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
      setScreenWidth(window.innerWidth);
      setScreenHeight(window.innerHeight);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const { primaryColor, accentColor, heroTitle, heroSubtitle, logoText } = appSettings;
  const cleanText = (txt) => {
    if (!txt) return "";
    return txt
      .replace(/modul ajar/gi, "materi ajar")
      .replace(/Modul Ajar/gi, "Materi Ajar")
      .replace(/modul/gi, "materi")
      .replace(/Modul/gi, "Materi");
  };
  const cleanHeroSubtitle = cleanText(heroSubtitle || "Sistem informasi terpadu guru dan siswa untuk jadwal, denah, hingga materi ajar.");

  const [searchQuery, setSearchQuery] = useState("");
  const [userName, setUserName] = useState("Pengunjung");

  useEffect(() => {
    try {
      const stored = localStorage.getItem("school_schedule_session_v1") || sessionStorage.getItem("school_schedule_session_v1");
      if (stored) {
        const userObj = JSON.parse(stored);
        if (userObj && (userObj.nama || userObj.username)) {
          setUserName(userObj.nama || userObj.username);
        }
      }
    } catch (e) {
      console.error(e);
    }
  }, []);

  const [activeSlide, setActiveSlide] = useState(0);

  // Touch/Swipe State for Carousel
  const [touchStart, setTouchStart] = useState(0);
  const [touchEnd, setTouchEnd] = useState(0);
  const [dragStart, setDragStart] = useState(0);
  const [dragEnd, setDragEnd] = useState(0);
  const [isDragging, setIsDragging] = useState(false);

  const handleTouchStart = (e) => {
    setTouchStart(e.targetTouches[0].clientX);
  };

  const handleTouchMove = (e) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const handleTouchEnd = () => {
    const totalItems = partners.length || 1;
    if (totalItems <= 1) return;
    const swipeThreshold = 40;
    const diff = touchStart - touchEnd;
    if (Math.abs(diff) > swipeThreshold && touchEnd !== 0) {
      if (diff > 0) {
        setActiveSlide(prev => (prev + 1) % totalItems);
      } else {
        setActiveSlide(prev => (prev - 1 + totalItems) % totalItems);
      }
    }
    setTouchStart(0);
    setTouchEnd(0);
  };

  const handleMouseDown = (e) => {
    setDragStart(e.clientX);
    setIsDragging(true);
  };

  const handleMouseMove = (e) => {
    if (!isDragging) return;
    setDragEnd(e.clientX);
  };

  const handleMouseUp = () => {
    if (!isDragging) return;
    const totalItems = partners.length || 1;
    if (totalItems <= 1) return;
    const swipeThreshold = 40;
    const diff = dragStart - dragEnd;
    if (Math.abs(diff) > swipeThreshold && dragEnd !== 0) {
      if (diff > 0) {
        setActiveSlide(prev => (prev + 1) % totalItems);
      } else {
        setActiveSlide(prev => (prev - 1 + totalItems) % totalItems);
      }
    }
    setIsDragging(false);
    setDragStart(0);
    setDragEnd(0);
  };

  const partners = useMemo(() => {
    return [1, 2, 3, 4].map(idx => {
      const name = appSettings[`partner${idx}`];
      if (!name) return null;
      return {
        name,
        desc: appSettings[`partnerDesc${idx}`] ||"Pelajari selengkapnya tentang program ini.",
        icon: appSettings[`partnerIcon${idx}`] ||"book",
        color: appSettings[`partnerColor${idx}`] ||"blue",
        image: appSettings[`partnerImage${idx}`]
      };
    }).filter(Boolean);
  }, [appSettings]);

  useEffect(() => {
    const totalItems = partners.length || 1;
    if (totalItems <= 1) return;
    const interval = setInterval(() => {
      setActiveSlide(prev => (prev + 1) % totalItems);
    }, 5000);
    return () => clearInterval(interval);
  }, [partners.length]);

  const handleFeedbackClick = () => {
    const phone = appSettings.contactPhone ||"+62123456789";
    const cleanPhone = phone.replace(/[^0-9+]/g,"");
    const waUrl = `https://wa.me/${cleanPhone}?text=Halo%20Admin%2C%20saya%20ingin%20memberikan%20saran%20mengenai%20aplikasi%20TimeSchedule...`;
    window.open(waUrl,"_blank");
  };

  const handleExtraFeatureClick = (label) => {
    const phone = appSettings.contactPhone ||"+62123456789";
    const cleanPhone = phone.replace(/[^0-9+]/g,"");
    const waUrl = `https://wa.me/${cleanPhone}?text=Halo%20Admin%2C%20saya%20ingin%20melaporkan%20atau%20tanya%20mengenai%20${encodeURIComponent(label)}...`;
    window.open(waUrl,"_blank");
  };



  const publicServices = [
    { label: cleanText(appSettings.serviceLabel1 !== undefined ? appSettings.serviceLabel1 :"Jadwal Pelajaran"), subtitle:"Semester 1", svgIcon:"060-calendar.svg", icon: CalendarDays, defaultColor:"#D97706", customColor: appSettings.serviceColor1, customIcon: appSettings.serviceIconImage1, path:"/jadwal" },
    { label: cleanText(appSettings.serviceLabel2 !== undefined ? appSettings.serviceLabel2 :"Denah Kelas"), subtitle:"Gedung Utama", svgIcon:"016-map pin.svg", icon: MapPin, defaultColor:"#0284C7", customColor: appSettings.serviceColor2, customIcon: appSettings.serviceIconImage2, path:"/denah" },
    { label: cleanText(appSettings.serviceLabel3 !== undefined ? appSettings.serviceLabel3 :"Materi Ajar"), subtitle:"Bahan Belajar", svgIcon:"066-education.svg", icon: BookOpenText, defaultColor:"#7C3AED", customColor: appSettings.serviceColor3, customIcon: appSettings.serviceIconImage3, path:"/materi-ajar" },
    { label: cleanText(appSettings.serviceLabel4 !== undefined ? appSettings.serviceLabel4 :"Kalender Akademik"), subtitle:"Agenda Sekolah", svgIcon:"086-calendar.svg", icon: Calendar, defaultColor:"#15803D", customColor: appSettings.serviceColor4, customIcon: appSettings.serviceIconImage4, path:"/kalender" },
    { label: cleanText(appSettings.serviceLabel5 !== undefined ? appSettings.serviceLabel5 :"Tempat PKL"), subtitle:"Mitra Industri", svgIcon:"008-warehouse.svg", icon: Briefcase, defaultColor:"#DB2777", customColor: appSettings.serviceColor5, customIcon: appSettings.serviceIconImage5, path:"/pkl-locations" },
    { label: cleanText(appSettings.serviceLabel6 !== undefined ? appSettings.serviceLabel6 :"Struktur Organisasi"), subtitle:"Profil Pengurus", svgIcon:"045-account.svg", icon: Users, defaultColor:"#E11D48", customColor: appSettings.serviceColor6, customIcon: appSettings.serviceIconImage6, path:"/struktur" },
    { label: cleanText(appSettings.serviceLabel7 !== undefined ? appSettings.serviceLabel7 :"Peraturan Sekolah"), subtitle:"Tatib & Poin", svgIcon:"013-shield.svg", icon: ShieldCheck, defaultColor:"#E11D48", customColor: appSettings.serviceColor7, customIcon: appSettings.serviceIconImage7, isPdfRules: true },
  ];

  const filteredServices = publicServices.filter(s =>
    s.label.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const colorMap = {
    red:"from-rose-500 to-rose-600",
    blue:"from-sky-500 to-sky-600",
    emerald:"from-emerald-500 to-emerald-600",
    purple:"from-purple-500 to-purple-600",
    orange:"from-orange-500 to-orange-600",
    cyan:"from-cyan-500 to-cyan-600",
    pink:"from-pink-500 to-pink-600"
  };

  const getShortLabel = (label) => {
    if (!label) return "";
    const lower = String(label).toLowerCase();
    if (lower.includes("pkl")) return "PKL";
    if (lower.includes("jadwal")) return "Jadwal";
    if (lower.includes("denah")) return "Denah";
    if (lower.includes("materi")) return "Materi";
    if (lower.includes("kalender")) return "Kalender";
    if (lower.includes("struktur")) return "Struktur";
    if (lower.includes("peraturan")) return "Peraturan";
    if (lower.includes("lainnya")) return "Lainnya";
    return label.charAt(0).toUpperCase() + label.slice(1);
  };

  return (
    <div className="relative flex flex-col min-h-screen w-full bg-[var(--ui-bg)] overflow-x-hidden font-sans" style={{'--accent-color': accentColor ||'#a3e635','--ui-primary': primaryColor ||'#4B7BE5' }}>

      {/* GLOBAL DECORATIVE BACKGROUND */}
      {appSettings.heroImage ? (
        <img
          src={appSettings.heroImage}
          fetchpriority="high"
          loading="eager"
          className="hidden md:block absolute top-0 left-0 w-full h-[54vh] pointer-events-none z-0 opacity-100 transition-all duration-700 object-cover object-center"
          alt="Hero Background"
        />
      ) : (
        <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
          {/* Soft Wash Gradient */}
          <div className="absolute inset-0 bg-gradient-to-br from-white via-slate-50 to-slate-100"></div>
          {/* Glowing Blobs */}
          <div className="absolute -top-[10%] -right-[5%] w-[600px] h-[600px] opacity-[0.08] rounded-[var(--ui-radius-small)] blur-[150px]" style={{ backgroundColor: primaryColor }}></div>
          <div className="absolute bottom-[-10%] left-[-5%] w-[700px] h-[700px] opacity-[0.08] rounded-[var(--ui-radius-small)] blur-[150px]" style={{ backgroundColor: accentColor ||'#a3e635' }}></div>
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[1000px] h-[1000px] opacity-[0.03] rounded-[var(--ui-radius-small)] blur-[150px]" style={{ backgroundColor: primaryColor }}></div>

          {/* Floating Accents */}
          <div className="absolute top-[15%] right-[12%] opacity-30" style={{ color: primaryColor }}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0l2.5 8.5L23 11l-8.5 2.5L12 22l-2.5-8.5L1 11l8.5-2.5z" /></svg>
          </div>
          <div className="absolute bottom-[20%] left-[8%] opacity-30" style={{ color: accentColor ||'#a3e635' }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0l2.5 8.5L23 11l-8.5 2.5L12 22l-2.5-8.5L1 11l8.5-2.5z" /></svg>
          </div>
          <div className="absolute top-[40%] left-[5%] w-3 h-3 rounded-full opacity-30" style={{ backgroundColor: accentColor ||'#a3e635' }}></div>
          <div className="absolute bottom-[30%] right-[8%] w-4 h-4 rounded-full opacity-30" style={{ backgroundColor: primaryColor }}></div>
          <div className="absolute top-[60%] right-[5%] opacity-20 rotate-45" style={{ color: primaryColor }}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"></path><path d="M12 5l7 7-7 7"></path></svg>
          </div>
        </div>
      )}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Pretendard:wght@300;400;500;600;700;800&display=swap');`}</style>

      {/* DESKTOP FULL-WIDTH HEADER */}
      <div className="hidden md:block">
        <HeaderNavbar setIsLoginModalOpen={setIsLoginModalOpen} appSettings={appSettings} onPanduanClick={() => setShowPublicGuide(true)} />
      </div>

      {/* MOBILE APP LANDING VIEW (100dvh App Screen) */}
      <div className="md:hidden flex flex-col h-[100dvh] max-h-[100dvh] w-full bg-[#F5F6FA] overflow-hidden select-none relative font-sans">
        
        {/* 1. AREA HEADER (ATAS - MEMAKAN SEKITAR 45% TINGGI LAYAR DENGAN WARNA HIJAU DESKTOP) */}
        <div 
          className="relative w-full h-[45%] min-h-[270px] max-h-[360px] flex flex-col justify-center items-center overflow-hidden text-white shrink-0"
          style={{
            background: `linear-gradient(165deg, ${primaryColor || '#064e3b'} 0%, #054031 42%, #033126 80%, #021f18 100%)`
          }}
        >
          {/* Efek Embun Air (Water Drops) Transparan di Area Hijau */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
            <div className="absolute top-[8%] left-[10%] w-3.5 h-5 rounded-full bg-white/20 blur-[0.3px] shadow-[inset_0_1px_2px_rgba(255,255,255,0.8),0_2px_4px_rgba(0,0,0,0.08)] rotate-[-12deg]" />
            <div className="absolute top-[15%] right-[16%] w-4 h-6 rounded-full bg-white/15 blur-[0.3px] shadow-[inset_0_1px_2px_rgba(255,255,255,0.7)] rotate-[15deg]" />
            <div className="absolute top-[22%] left-[26%] w-2.5 h-3.5 rounded-full bg-white/15 blur-[0.2px] rotate-[-5deg]" />
            <div className="absolute top-[12%] right-[38%] w-2 h-3 rounded-full bg-white/20 blur-[0.2px] rotate-[8deg]" />
            <div className="absolute top-[34%] left-[8%] w-3 h-4.5 rounded-full bg-white/15 blur-[0.3px] rotate-[-20deg]" />
            <div className="absolute top-[50%] right-[14%] w-4 h-5.5 rounded-full bg-white/15 blur-[0.3px] rotate-[18deg]" />
            <div className="absolute top-[62%] left-[20%] w-3 h-4 rounded-full bg-white/15 blur-[0.2px] rotate-[-10deg]" />
            <div className="absolute top-[42%] right-[28%] w-2.5 h-3.5 rounded-full bg-white/15 blur-[0.2px]" />
          </div>

          {/* Floating Decorative Elements: Bintang, Tas Sekolah, Kartu Identitas */}
          {/* Sparkling Stars */}
          <div className="absolute top-[14%] left-[8%] text-amber-300/80 animate-pulse pointer-events-none z-10">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 0l2.5 8.5L23 11l-8.5 2.5L12 22l-2.5-8.5L1 11l8.5-2.5z" />
            </svg>
          </div>
          <div className="absolute top-[20%] right-[9%] text-amber-400 drop-shadow-md pointer-events-none transform rotate-12 z-10">
            <svg width="30" height="30" viewBox="0 0 24 24" fill="currentColor">
              <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26" />
            </svg>
          </div>
          <div className="absolute top-[28%] left-[26%] text-white/50 pointer-events-none animate-pulse z-10">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 0l2 8.5L22 12l-8 2L12 22l-2-8-8-2 8-2z" />
            </svg>
          </div>
          <div className="absolute top-[36%] right-[24%] text-amber-300/80 pointer-events-none z-10">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 0l2 8.5L22 12l-8 2L12 22l-2-8-8-2 8-2z" />
            </svg>
          </div>
          <div className="absolute bottom-[20%] right-[12%] text-amber-300/70 pointer-events-none z-10 animate-pulse">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 0l2.5 8.5L23 11l-8.5 2.5L12 22l-2.5-8.5L1 11l8.5-2.5z" />
            </svg>
          </div>

          {/* Floating Tas Sekolah */}
          <div className="absolute top-[18%] left-[7%] w-12 h-12 sm:w-14 sm:h-14 pointer-events-none z-10 transform -rotate-12 drop-shadow-xl">
            <div className="w-full h-full rounded-2xl bg-white/95 p-2 shadow-lg border border-white/60 flex items-center justify-center">
              <img 
                src="/icons/038-school bag.svg" 
                alt="Tas" 
                className="w-full h-full object-contain" 
                onError={(e) => { e.currentTarget.src = "/icons/008-warehouse.svg"; }} 
              />
            </div>
          </div>

          {/* Floating Kartu Identitas Pelajar */}
          <div className="absolute top-[16%] right-[8%] w-14 h-10 sm:w-15 sm:h-11 pointer-events-none z-10 transform rotate-6 drop-shadow-xl">
            <div className="w-full h-full rounded-xl bg-white/95 p-1.5 shadow-lg border border-white/60 flex items-center gap-1.5">
              <div 
                className="w-5 h-6.5 rounded border flex items-center justify-center shrink-0"
                style={{ 
                  backgroundColor: 'color-mix(in srgb, var(--ui-primary, #064e3b) 15%, #ffffff)',
                  borderColor: 'color-mix(in srgb, var(--ui-primary, #064e3b) 30%, transparent)'
                }}
              >
                <User size={12} style={{ color: 'var(--ui-primary, #064e3b)' }} />
              </div>
              <div className="flex flex-col gap-1 w-full">
                <div className="w-full h-1 rounded-full" style={{ backgroundColor: 'var(--ui-primary, #064e3b)', opacity: 0.5 }} />
                <div className="w-3/4 h-1 rounded-full" style={{ backgroundColor: 'var(--ui-primary, #064e3b)', opacity: 0.35 }} />
                <div className="w-1/2 h-0.5 rounded-full" style={{ backgroundColor: 'var(--ui-primary, #064e3b)', opacity: 0.2 }} />
              </div>
            </div>
          </div>

          {/* Konten Teks Header: Judul & Sapaan (Centered & Balanced) */}
          <div className="px-6 text-center z-20 relative my-auto pt-2 pb-6">
            <h1 className="text-[28px] sm:text-[34px] font-black tracking-tight text-white leading-none drop-shadow-lg">
              {appSettings.appName || 'KG2 School'}
            </h1>
            <p className="text-[10px] sm:text-[11.5px] font-black tracking-[0.28em] text-emerald-100 uppercase opacity-90 mt-2 drop-shadow-sm">
              MOBILE
            </p>

            <div className="mt-4 text-center">
              <p className="text-sm sm:text-base font-bold text-white/90 leading-tight drop-shadow-md">
                Halo, {userName === 'Pengunjung' ? '[Nama Pengguna]' : userName}
              </p>
              <p className="text-lg sm:text-xl font-black text-white leading-tight drop-shadow-md mt-1">
                Selamat Datang!
              </p>
            </div>
          </div>

          {/* Garis Batas Bawah Melengkung Menjorok ke Atas (Convex Curve SVG) */}
          <div className="absolute bottom-0 left-0 w-full z-20 pointer-events-none leading-none">
            <svg 
              viewBox="0 0 100 24" 
              preserveAspectRatio="none" 
              className="w-full h-7 sm:h-9 fill-[#F5F6FA] block"
            >
              <path d="M 0,24 Q 50,-4 100,24 L 100,24 L 0,24 Z" />
            </svg>
          </div>

        </div>

        {/* 2. AREA KONTEN: LAYANAN PUBLIK (BAWAH - 8 ICON: 4 ATAS 4 BAWAH, BG #F5F6FA) */}
        <div className="relative w-full flex-1 bg-[#F5F6FA] px-4 pt-2.5 pb-[96px] flex flex-col justify-start items-center z-30 overflow-y-auto">
          
          <div className="w-full max-w-md mx-auto flex flex-col items-center">
            
            {/* Judul: Layanan Publik + Ikon Info */}
            <div className="flex items-center justify-center gap-1.5 mb-3.5">
              <span 
                className="text-xs sm:text-sm font-black uppercase tracking-wider"
                style={{ color: primaryColor || '#064e3b' }}
              >
                Layanan Publik
              </span>
              <button
                type="button"
                onClick={() => setShowPublicGuide(true)}
                className="hover:opacity-80 cursor-pointer transition-opacity p-0.5"
                style={{ color: primaryColor || '#064e3b' }}
                title="Informasi Layanan"
              >
                <Info size={14} strokeWidth={2.3} />
              </button>
            </div>

            {/* Grid 8 Item: 4 Atas, 4 Bawah dengan Icon Desktop */}
            <div className="grid grid-cols-4 gap-x-2 gap-y-3.5 sm:gap-x-4 sm:gap-y-4 w-full px-1">
              {(() => {
                const gridServices = [
                  ...publicServices,
                  { label: "Lainnya", subtitle: "Bantuan", svgIcon: "056-question.svg", icon: HelpCircle, isLainnya: true, defaultColor: "#64748b" }
                ];
                return gridServices.slice(0, 8).map((service, idx) => {
                  const activeColor = service.customColor || service.defaultColor;
                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        if (service.isLainnya) {
                          setShowPublicGuide(true);
                        } else if (service.isPdfRules) {
                          setShowRulesModal(true);
                        } else {
                          navigate(service.path);
                        }
                      }}
                      className="flex flex-col items-center gap-1.5 group cursor-pointer focus:outline-none transition-transform active:scale-95 w-full"
                    >
                      {/* Desain Icon Card Sesuai Desktop */}
                      <div 
                        className="w-[50px] h-[50px] sm:w-[56px] sm:h-[56px] rounded-2xl flex items-center justify-center transition-all duration-300 group-hover:scale-105 shadow-xs"
                        style={{ 
                          backgroundColor: hexToRgba(activeColor, 0.08),
                          border: `1.5px solid ${hexToRgba(activeColor, 0.16)}`
                        }}
                      >
                        {service.customIcon ? (
                          <img src={service.customIcon} alt="" className="w-6 h-6 object-contain" />
                        ) : (
                          <img src={`/icons/${service.svgIcon}`} alt="" className="w-6 h-6 object-contain" />
                        )}
                      </div>
                      <span className="text-[10px] sm:text-[10.5px] font-bold text-slate-700 tracking-tight leading-tight text-center truncate w-full">
                        {getShortLabel(service.label)}
                      </span>
                    </button>
                  );
                });
              })()}
            </div>

          </div>

        </div>

      </div>

      {/* DESKTOP VIEW COMPACT WRAPPER */}
      <div className="hidden md:flex flex-col h-screen max-h-screen justify-between w-full max-w-[1400px] mx-auto px-6 md:px-8 overflow-hidden relative z-10 select-none pt-[62px] desktop-layout-wrapper">
        <style>{`
          @media (max-height: 850px) {
            .desktop-layout-wrapper {
              padding-top: 48px !important;
            }
            .middle-layanan-section {
              padding-top: 6px !important;
              margin-top: 6px !important;
            }
            .middle-layanan-section h2 {
              font-size: 13px !important;
              margin-bottom: 6px !important;
            }
            .middle-layanan-section button {
              width: 80px !important;
              height: 80px !important;
              padding: 6px !important;
            }
            .middle-layanan-section button span {
              font-size: 9px !important;
            }
            .bottom-jurusan-section {
              padding-top: 6px !important;
              margin-top: 6px !important;
            }
            .bottom-jurusan-section h2 {
              font-size: 14px !important;
            }
            .bottom-jurusan-section p {
              font-size: 8px !important;
            }
            .bottom-jurusan-section .grid {
              gap: 8px !important;
            }
            .bottom-jurusan-section .group {
              min-height: 85px !important;
              height: 85px !important;
            }
            .mitra-kerjasama-section {
              padding-top: 4px !important;
              margin-top: 4px !important;
            }
            .mitra-kerjasama-section h3 {
              font-size: 9px !important;
              margin-bottom: 4px !important;
            }
            .mitra-kerjasama-section .group {
              height: 30px !important;
            }
          }`}</style>


        {/* TOP ROW: HERO & ILLUSTRATION */}
        <div className="flex-1 flex flex-row items-center justify-between gap-12 min-h-0 relative z-10">

          {/* Left Column (Banner/Hero Text) */}
          <div className="flex-1 flex flex-col justify-center min-h-0 text-left">
            <h1 className="text-[28px] lg:text-[40px] font-black leading-[1.15] tracking-tight mb-4 max-w-[550px]" style={{ color: appSettings.heroTitleColor ||'#1e293b' }}>
              {(() => {
                const str = heroTitle ||"Aplikasi Jadwal, Denah & Materi Ajar Sekolah Terpadu";
                if (str ==="Aplikasi Jadwal, Denah & Materi Ajar Sekolah Terpadu" || str ==="Aplikasi Jadwal, Denah & Materi Ajar Sekolah" || str ==="Aplikasi Jadwal, Denah & Materi Sekolah Terpadu" || str ==="Aplikasi Jadwal, Denah & Materi Sekolah") {
                  return (
                    <>
                      Aplikasi <span className="font-script font-bold relative inline-block" style={{ color: appSettings.heroHighlightColor || primaryColor }}>
                        Jadwal, Denah & Materi Ajar
                        <svg className="absolute -bottom-2 left-0 w-full opacity-80" style={{ color: appSettings.heroHighlightColor || primaryColor }} viewBox="0 0 200 12" fill="none" preserveAspectRatio="none"><path d="M2 9c40-4 100-8 196-2" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" /></svg>
                      </span><br />Sekolah Terpadu
                    </>
                  );
                }
                if (str.includes('*')) {
                  const parts = str.split('*');
                  return (
                    <>
                      {parts.map((part, index) => {
                        if (index % 2 === 1) {
                          return (
                            <span key={index} className="font-script font-bold relative inline-block" style={{ color: appSettings.heroHighlightColor || primaryColor }}>
                              {part}
                              <svg className="absolute -bottom-2 left-0 w-full opacity-80" style={{ color: appSettings.heroHighlightColor || primaryColor }} viewBox="0 0 200 12" fill="none" preserveAspectRatio="none"><path d="M2 9c40-4 100-8 196-2" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" /></svg>
                            </span>
                          );
                        }
                        return part.split('\\n').map((line, i, arr) => <React.Fragment key={i}>{line}{i < arr.length - 1 && <br />}</React.Fragment>);
                      })}
                    </>
                  );
                }
                return str;
              })()}
            </h1>

            <p className="text-[13.5px] lg:text-[14.5px] font-medium leading-relaxed max-w-[480px] mb-6" style={{ color: appSettings.heroSubtitleColor ||'#64748b' }}>
              {cleanHeroSubtitle}
            </p>

            <div className="flex flex-row items-center gap-4">
              <button 
                onClick={() => setIsLoginModalOpen(true)} 
                data-slot="button"
                data-variant="primary"
                className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-[var(--ui-radius-small)] text-white font-black text-xs uppercase tracking-wider hover:scale-[1.03] transition-all duration-300 cursor-pointer border-none btn-primary-theme"
                style={{ backgroundColor: 'var(--ui-primary-btn, var(--ui-primary, #064e3b))' }}
              >
                Masuk ke Aplikasi <ArrowRight size={14} strokeWidth={3} />
              </button>
            </div>
          </div>

          {/* Right Column (Illustration) - Only render if custom background image is NOT set */}
          {!appSettings.heroImage && (
            <div className="w-[380px] lg:w-[450px] flex items-center justify-center shrink-0 min-h-0">
              <div className="w-full max-w-[320px] lg:max-w-[380px] aspect-square flex items-center justify-center p-6 bg-slate-800 rounded-[var(--ui-radius-card)] border border-slate-700 shadow-xs relative overflow-hidden">
                {/* Glowing decorative background behind illustration */}
                <div className="absolute inset-4 rounded-full blur-2xl opacity-10 bg-gradient-to-tr from-sky-500 to-purple-500"></div>
                <div className="flex flex-col items-center justify-center gap-4 text-white/90">
                  <MonitorSmartphone size={80} strokeWidth={1.5} className="animate-pulse" />
                  <div className="flex gap-4">
                    <BookOpen size={40} strokeWidth={1.5} className="text-indigo-300" />
                    <Sparkles size={40} strokeWidth={1.5} className="text-purple-300" />
                  </div>
                </div>
              </div>
            </div>
          )}

        </div>

        {/* MIDDLE SECTION: LAYANAN PUBLIK */}
        <div className="shrink-0 pt-3 pb-3 mt-3 middle-layanan-section relative z-10">
          <div className="bg-white rounded-[var(--ui-radius-card)] border border-[var(--ui-border-muted)] shadow-[var(--ui-shadow-card)] py-4 md:py-5 px-4 md:px-8 w-full">
            <h2 className="text-sm lg:text-base font-extrabold text-slate-800 mb-3 text-center">Layanan Publik</h2>
            <div className="grid grid-cols-7 gap-2 lg:gap-4 w-full items-center">
              {publicServices.map((service, idx) => {
                const activeColor = service.customColor || service.defaultColor;
                return (
                  <button
                    key={idx}
                    onClick={() =>{
                      if (service.isPdfRules) {
                        setShowRulesModal(true);
                      } else {
                        navigate(service.path);
                      }
                    }}
                    className="flex flex-col items-center justify-center gap-2.5 hover:-translate-y-0.5 transition-all duration-300 cursor-pointer bg-transparent border-none py-1 group w-full relative mx-auto"
                  >
                    <div 
                      className="w-12 h-12 rounded-[var(--ui-radius-card)] flex items-center justify-center transition-transform duration-300 group-hover:scale-110 relative z-10 shrink-0 shadow-xs"
                      style={{ 
                        backgroundColor: hexToRgba(activeColor, 0.08),
                        border: `1px solid ${hexToRgba(activeColor, 0.12)}`
                      }}
                    >
                      {service.customIcon ? (
                        <img src={service.customIcon} alt="" className="w-5.5 h-5.5 object-contain" />
                      ) : (
                        <img src={`/icons/${service.svgIcon}`} alt="" className="w-5.5 h-5.5 object-contain" />
                      )}
                    </div>
                    <span className="text-[10.5px] lg:text-[11.5px] font-black text-slate-700 tracking-tight leading-none text-center w-full truncate px-1 relative z-10">
                      {getShortLabel(service.label)}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* JURUSAN / PROGRAM (Colorful Flat Cards without Box in Box) */}
        <div className="shrink-0 mt-8 mb-6 bottom-jurusan-section relative z-10">
          {/* Centered Title like Layanan Publik */}
          <div className="flex flex-col items-center justify-center text-center mb-5">
            <h2 className="text-base lg:text-lg font-black text-slate-800 tracking-tight leading-none">
              {appSettings.trustedByText || "Program Keahlian Unggulan"}
            </h2>
            <p className="text-[11px] text-slate-400 font-semibold mt-1">Kompetensi keahlian terakreditasi berstandar industri</p>
          </div>

          {/* 4 Colorful Borderless Flat Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-5 w-full">
            {[1, 2, 3, 4].map((idx) => {
              const name = appSettings[`partner${idx}`];
              if (!name) return null;

              const iconStr = appSettings[`partnerIcon${idx}`] || "book";
              const IconComponent = ICON_MAP[iconStr] || HelpCircle;
              const imageSrc = appSettings[`partnerImage${idx}`];
              
              const rawColor = appSettings[`partnerColor${idx}`];
              const defaultGradients = [
                "bg-gradient-to-br from-amber-500 to-orange-600",
                "bg-gradient-to-br from-sky-600 to-indigo-700",
                "bg-gradient-to-br from-emerald-600 to-teal-700",
                "bg-gradient-to-br from-rose-500 to-pink-600"
              ];
              const colorMap = {
                red: "bg-gradient-to-br from-rose-500 to-rose-600",
                blue: "bg-gradient-to-br from-sky-600 to-indigo-700",
                emerald: "bg-gradient-to-br from-emerald-600 to-teal-700",
                green: "bg-gradient-to-br from-emerald-600 to-teal-700",
                purple: "bg-gradient-to-br from-purple-600 to-indigo-700",
                orange: "bg-gradient-to-br from-amber-500 to-orange-600",
                cyan: "bg-gradient-to-br from-cyan-500 to-sky-600",
                pink: "bg-gradient-to-br from-rose-500 to-pink-600"
              };
              
              const isHexColor = rawColor && rawColor.startsWith('#');
              const bgClass = isHexColor ? '' : (colorMap[rawColor] || defaultGradients[idx - 1] || "bg-gradient-to-br from-emerald-600 to-teal-700");

              return (
                <div 
                  key={idx} 
                  className={`group relative rounded-[var(--ui-radius-card)] p-4 shadow-sm hover:shadow-md hover:-translate-y-1 transition-all duration-300 flex items-center justify-between gap-3.5 min-h-[96px] lg:min-h-[102px] w-full overflow-hidden cursor-pointer select-none text-white ${bgClass}`}
                  style={isHexColor ? { backgroundColor: rawColor } : {}}
                >
                  {/* Subtle ambient decorative backdrop light */}
                  <div className="absolute -top-6 -right-6 w-20 h-20 bg-white/15 rounded-full blur-lg pointer-events-none group-hover:scale-150 transition-transform duration-500" />
                  
                  {/* Left text content */}
                  <div className="relative z-10 flex flex-col justify-center text-left min-w-0 flex-1">
                    <span className="text-[9px] font-black uppercase tracking-wider text-white/80 block mb-1">
                      Keahlian 0{idx}
                    </span>
                    <div className="min-h-[34px] flex items-center">
                      <h4 className="text-[13px] lg:text-[14px] font-black text-white tracking-tight leading-snug uppercase drop-shadow-xs line-clamp-2">
                        {name}
                      </h4>
                    </div>
                  </div>

                  {/* Right logo badge container */}
                  <div className="relative z-10 w-12 h-12 lg:w-13 lg:h-13 rounded-[var(--ui-radius-small)] bg-white/95 backdrop-blur-md shadow-xs p-1.5 flex items-center justify-center shrink-0 group-hover:scale-108 group-hover:rotate-2 transition-transform duration-300">
                    {imageSrc ? (
                      <img src={imageSrc} alt={name} loading="lazy" className="w-full h-full object-contain" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-slate-700">
                        <IconComponent size={24} strokeWidth={2} />
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* MITRA & KERJASAMA (Clean Spacious Borderless Marquee) */}
        {appSettings.mitraKerjasama && appSettings.mitraKerjasama.length > 0 && (
          <div className="shrink-0 mt-10 mb-8 mitra-kerjasama-section relative z-10">
            <div className="bg-white/90 backdrop-blur-md rounded-[var(--ui-radius-card)] shadow-xs py-3.5 px-6 md:px-8 w-full flex items-center gap-5">
              <span className="text-[10px] lg:text-[10.5px] font-black text-slate-400 uppercase tracking-wider shrink-0 whitespace-nowrap">
                Mitra Industri & Kerjasama
              </span>
              <div className="h-4 w-px bg-slate-200 shrink-0" />
              <div className="relative flex-1 overflow-hidden flex py-0.5">
                <div className="absolute left-0 top-0 w-12 h-full bg-gradient-to-r from-white to-transparent z-10 pointer-events-none"></div>
                <div className="absolute right-0 top-0 w-12 h-full bg-gradient-to-l from-white to-transparent z-10 pointer-events-none"></div>

                <div className="flex w-max animate-marquee gap-8 lg:gap-12 items-center px-4 hover:[animation-play-state:paused]">
                  {[...appSettings.mitraKerjasama, ...appSettings.mitraKerjasama, ...appSettings.mitraKerjasama, ...appSettings.mitraKerjasama].map((mitra, idx) => (
                    <div key={`${mitra.id ||'m'}-${idx}`} className="w-[70px] lg:w-[90px] h-[30px] lg:h-[35px] flex items-center justify-center shrink-0 group grayscale opacity-45 hover:grayscale-0 hover:opacity-100 transition-all duration-300 cursor-pointer">
                      {mitra.image ? (
                        <img src={mitra.image} alt={mitra.name} loading="lazy" className="max-w-full max-h-full object-contain group-hover:scale-105 transition-transform" title={mitra.name} />
                      ) : (
                        <span className="text-[10.5px] font-black text-slate-700 tracking-tight text-center">{mitra.name}</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

      </div>

      {/* DESKTOP FOOTER */}
      <footer className="hidden md:block w-full bg-white/85 backdrop-blur-xl border-t border-slate-200/90 relative z-20 mt-auto print:hidden">
        <div className="w-full max-w-[1440px] mx-auto px-6 lg:px-12 py-10">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-8 lg:gap-12">
            
            {/* Column 1: Brand Profile & Status (5 cols) */}
            <div className="md:col-span-5 flex flex-col items-start text-left gap-3">
              <div className="flex items-center gap-3">
                {appSettings.logoImage ? (
                  <img src={appSettings.logoImage} alt="Logo" className="w-11 h-11 object-contain rounded-[var(--ui-radius-small)]" />
                ) : (
                  <div 
                    className="w-11 h-11 rounded-[var(--ui-radius-small)] flex items-center justify-center text-white font-black text-base shadow-xs"
                    style={{ backgroundColor: primaryColor || 'var(--ui-primary, #059669)' }}
                  >
                    {appSettings.logoText || "TS"}
                  </div>
                )}
                <div className="flex flex-col">
                  <span className="font-black text-slate-800 text-[17px] tracking-tight leading-tight">
                    {appSettings.appName || "Sistem Akademik & Kurikulum"}
                  </span>
                  <span className="text-slate-500 text-xs font-bold mt-0.5">
                    {appSettings.instansiName || "Institusi Pendidikan Terpadu"}
                  </span>
                </div>
              </div>

              <p className="text-slate-500 text-xs font-medium leading-relaxed max-w-md mt-1">
                {appSettings.schoolAddress || appSettings.schoolProfile?.alamat || "Portal resmi manajemen pembelajaran, jadwal pelajaran terpadu, presensi digital, dan sistem informasi akademik."}
              </p>
            </div>

            {/* Column 2: Layanan Publik (4 cols) */}
            <div className="md:col-span-4 flex flex-col text-left">
              <h4 className="text-xs font-black uppercase tracking-wider text-slate-400 mb-3.5">
                Layanan & Menu Informasi
              </h4>
              <div className="grid grid-cols-2 gap-y-2.5 gap-x-4 text-xs font-bold text-slate-600">
                <Link to="/jadwal" className="hover:text-[var(--ui-primary)] transition-colors flex items-center gap-1.5 no-underline text-slate-600">
                  <CalendarDays size={13} className="text-slate-400 shrink-0" />
                  <span>Jadwal Pelajaran</span>
                </Link>
                <Link to="/denah" className="hover:text-[var(--ui-primary)] transition-colors flex items-center gap-1.5 no-underline text-slate-600">
                  <MapPin size={13} className="text-slate-400 shrink-0" />
                  <span>Denah Ruang</span>
                </Link>
                <Link to="/materi-ajar" className="hover:text-[var(--ui-primary)] transition-colors flex items-center gap-1.5 no-underline text-slate-600">
                  <BookOpenText size={13} className="text-slate-400 shrink-0" />
                  <span>Materi Ajar</span>
                </Link>
                <Link to="/kalender" className="hover:text-[var(--ui-primary)] transition-colors flex items-center gap-1.5 no-underline text-slate-600">
                  <Calendar size={13} className="text-slate-400 shrink-0" />
                  <span>Kalender Sekolah</span>
                </Link>
                <Link to="/pkl-locations" className="hover:text-[var(--ui-primary)] transition-colors flex items-center gap-1.5 no-underline text-slate-600">
                  <Briefcase size={13} className="text-slate-400 shrink-0" />
                  <span>Mitra PKL</span>
                </Link>
                <Link to="/struktur" className="hover:text-[var(--ui-primary)] transition-colors flex items-center gap-1.5 no-underline text-slate-600">
                  <Users size={13} className="text-slate-400 shrink-0" />
                  <span>Struktur Organisasi</span>
                </Link>
              </div>
            </div>

            {/* Column 3: Bantuan & Kontak (3 cols) */}
            <div className="md:col-span-3 flex flex-col items-start md:items-end text-left md:text-right">
              <h4 className="text-xs font-black uppercase tracking-wider text-slate-400 mb-3.5">
                Bantuan & Akses Portal
              </h4>
              <div className="flex flex-col gap-2.5 w-full items-start md:items-end">
                <button
                  type="button"
                  onClick={() => setIsLoginModalOpen(true)}
                  className="px-4 py-2 rounded-[var(--ui-radius-control)] bg-[var(--ui-primary)] hover:bg-[var(--ui-primary-hover)] text-white text-xs font-black shadow-xs transition-all cursor-pointer flex items-center gap-2 border-none"
                >
                  <LogIn size={13} />
                  <span>Masuk Portal Internal</span>
                </button>

                <div className="flex items-center gap-3 text-xs font-bold text-slate-500 mt-1">
                  <button 
                    type="button" 
                    onClick={() => setShowPublicGuide(true)} 
                    className="hover:text-[var(--ui-primary)] transition-colors bg-transparent border-none p-0 cursor-pointer font-bold"
                  >
                    Panduan
                  </button>
                  <span className="w-1 h-1 rounded-full bg-slate-300" />
                  <button 
                    type="button" 
                    onClick={() => setShowPublicHelp(true)} 
                    className="hover:text-[var(--ui-primary)] transition-colors bg-transparent border-none p-0 cursor-pointer font-bold"
                  >
                    Bantuan FAQ
                  </button>
                </div>

                {(appSettings.contactPhone || appSettings.contactEmail) && (
                  <p className="text-[11px] font-semibold text-slate-400 mt-2 text-left md:text-right">
                    {appSettings.contactPhone && <span>WhatsApp: {appSettings.contactPhone}</span>}
                    {appSettings.contactPhone && appSettings.contactEmail && <br />}
                    {appSettings.contactEmail && <span>Email: {appSettings.contactEmail}</span>}
                  </p>
                )}
              </div>
            </div>

          </div>

          {/* Bottom Copyright Row */}
          <div className="w-full border-t border-slate-200/70 mt-8 pt-5 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs font-semibold text-slate-400">
            <p>
              {appSettings.footerText || `© ${new Date().getFullYear()} ${appSettings.appName || "Sistem Akademik"}. Seluruh hak cipta dilindungi undang-undang.`}
            </p>
            <div className="flex items-center gap-4 text-slate-500">
              <span className="hover:text-[var(--ui-primary)] cursor-pointer transition-colors">Kebijakan Privasi</span>
              <span className="w-1 h-1 bg-slate-300 rounded-full" />
              <span className="hover:text-[var(--ui-primary)] cursor-pointer transition-colors">Syarat & Ketentuan</span>
            </div>
          </div>
        </div>
      </footer>

      {/* Mobile Bottom Action Bar (Satu-satunya Bar Tombol Aksi di Bawah) */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-[40] bg-white/95 backdrop-blur-lg border-t border-slate-200/80 px-5 pt-3.5 pb-[max(1.25rem,calc(env(safe-area-inset-bottom,0px)+1rem))] shadow-[0_-8px_30px_rgba(0,0,0,0.08)] select-none">
        <div className="w-full max-w-md mx-auto flex items-center gap-3">
          {/* Tombol Pertama: Login (Hijau desktop solid, flex-1, teks putih tebal, rounded-xl) */}
          <button
            type="button"
            onClick={() => setIsLoginModalOpen(true)}
            style={{ backgroundColor: 'var(--ui-primary-btn, var(--ui-primary, #064e3b))' }}
            className="flex-1 h-[50px] sm:h-[54px] rounded-xl text-white font-extrabold text-sm sm:text-base tracking-wide shadow-md shadow-emerald-950/20 flex items-center justify-center transition-all active:scale-[0.98] hover:opacity-95 cursor-pointer border-none"
          >
            Login
          </button>

          {/* Tombol Kedua: Kotak Persegi rounded-xl, warna hijau desktop sama, ikon Chat/Comment */}
          <button
            type="button"
            onClick={handleFeedbackClick}
            title="Tanya / Bantuan"
            style={{ backgroundColor: 'var(--ui-primary-btn, var(--ui-primary, #064e3b))' }}
            className="w-[50px] h-[50px] sm:w-[54px] sm:h-[54px] shrink-0 rounded-xl text-white shadow-md shadow-emerald-950/20 flex items-center justify-center transition-all active:scale-[0.98] hover:opacity-95 cursor-pointer border-none"
          >
            <MessageSquare size={22} strokeWidth={2.3} />
          </button>
        </div>
      </div>

      {/* REMOVED LOGIN MODAL (NOW HANDLED IN PUBLIC LAYOUT) */}
      {renderRulesModal()}

      {/* PUBLIC GUIDE BOTTOM SHEET */}
      <PublicGuideModal
        isOpen={showPublicGuide}
        onClose={() => setShowPublicGuide(false)}
        primaryColor={primaryColor}
        navigate={navigate}
        setIsLoginModalOpen={setIsLoginModalOpen}
      />

      {/* PUBLIC HELP BOTTOM SHEET */}
      <PublicHelpModal
        isOpen={showPublicHelp}
        onClose={() => setShowPublicHelp(false)}
        primaryColor={primaryColor}
        contactPhone={appSettings?.contactPhone ||'+62 123-456-789'}
        contactEmail={appSettings?.contactEmail ||'admin@school.sch.id'}
        appName={appSettings?.appName ||'Sistem Akademik'}
        getWaLink={getWaLink}
      />
    </div>
  );
}

// ── Beautiful SVG Illustration for"Butuh Panduan" banner
const StudentIllustration = () => (
  <svg viewBox="0 0 100 100" className="w-24 h-24 drop-shadow-xs">
    {/* Head */}
    <circle cx="50" cy="35" r="14" fill="#FDBA74" />
    {/* Cap/Hair */}
    <path d="M36 35 C36 21, 64 21, 64 35 Z" fill="#1E293B" />
    <rect x="36" y="31" width="28" height="6" fill="#1E293B" rx="2" />
    {/* Eyes */}
    <circle cx="45" cy="35" r="1.5" fill="#1E293B" />
    <circle cx="55" cy="35" r="1.5" fill="#1E293B" />
    {/* Smile */}
    <path d="M47 41 Q50 44 53 41" stroke="#1E293B" strokeWidth="1.5" strokeLinecap="round" fill="none" />
    {/* Body / Shirt */}
    <path d="M30 70 C30 55, 70 55, 70 70 Z" fill="#ffffff" />
    {/* Arms */}
    <path d="M30 70 L40 82" stroke="#FDBA74" strokeWidth="6" strokeLinecap="round" />
    <path d="M70 70 L60 82" stroke="#FDBA74" strokeWidth="6" strokeLinecap="round" />
    {/* Laptop */}
    <rect x="38" y="72" width="24" height="15" rx="2" fill="#334155" />
    <rect x="42" y="75" width="16" height="9" rx="1" fill="#1E293B" />
    {/* Circle indicator on laptop lid */}
    <circle cx="50" cy="79" r="1" fill="#ffffff" opacity="0.3" />
    {/* Hands holding laptop */}
    <circle cx="39" cy="80" r="3.5" fill="#FDBA74" />
    <circle cx="61" cy="80" r="3.5" fill="#FDBA74" />
  </svg>
);

// TeacherStudentIllustration is now imported from src/components/TeacherStudentIllustration.jsx

// ── Interactive Public Guide Modal matching the theme
const PublicGuideModal = ({ isOpen, onClose, primaryColor, navigate, setIsLoginModalOpen }) => {
  const [activeStep, setActiveStep] = useState(0);

  if (!isOpen) return null;

  const steps = [
    {
      tabLabel:"Jadwal",
      svgIcon:"060-calendar.svg",
      tabIcon: CalendarDays,
      title:"1. Cek Jadwal Pelajaran",
      desc:"Tekan menu 'Jadwal Pelajaran' untuk melihat jadwal KBM aktif secara real-time. Pilih hari dan kelas untuk menyesuaikan.",
      color:"#D97706", // Orange
      actionLabel:"Buka Jadwal Pelajaran",
      action: () => { navigate("/jadwal"); onClose(); }
    },
    {
      tabLabel:"Denah",
      svgIcon:"016-map pin.svg",
      tabIcon: MapPin,
      title:"2. Cari Denah Kelas & Ruang",
      desc:"Gunakan menu 'Denah Kelas' untuk melihat tata letak ruang kelas, lab, bengkel, dan kantor secara interaktif di sekolah.",
      color:"#0284C7", // Blue
      actionLabel:"Buka Denah Kelas",
      action: () => { navigate("/denah"); onClose(); }
    },
    {
      tabLabel:"Materi",
      svgIcon:"066-education.svg",
      tabIcon: BookOpenText,
      title:"3. Akses Materi Ajar",
      desc:"Temukan materi belajar dari guru langsung di 'Materi Ajar' — unduh PDF atau buka link video/Google Drive kapan saja.",
      color:"#7C3AED", // Purple
      actionLabel:"Buka Materi Ajar",
      action: () => { navigate("/materi-ajar"); onClose(); }
    },
    {
      tabLabel:"Portal",
      svgIcon:"033-padlock.svg",
      tabIcon: Lock,
      title:"4. Masuk ke Portal Internal",
      desc:"Bagi guru, siswa, dan staf, masuk menggunakan username & password resmi untuk melakukan absensi, piket, atau hubin.",
      color:"#15803D", // Green
      actionLabel:"Masuk Portal Sekarang",
      action: () => { setIsLoginModalOpen(true); onClose(); }
    }
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-slate-900/80 animate-in fade-in duration-300 p-0 md:p-4 text-left">
      {/* Backdrop overlay listener to close */}
      <div className="absolute inset-0 z-0 cursor-pointer" onClick={onClose}></div>

      {/* Sheet/Modal Drawer */}
      <div className="bg-white rounded-t-[var(--ui-radius-card)] md:rounded-[var(--ui-radius-card)] w-full max-w-md md:max-w-xl overflow-hidden shadow-xs border border-slate-100 flex flex-col animate-in slide-in-from-bottom md:zoom-in-95 duration-300 ease-out z-10">
        {/* iOS/Android drag handle bar - hidden on desktop */}
        <div className="w-12 h-1 bg-slate-200 rounded-full mx-auto my-3 shrink-0 md:hidden"></div>

        {/* Header */}
        <div className="px-6 pb-3 pt-4 md:pt-6 flex items-center justify-between">
          <span className="font-black text-slate-800 text-[18px] md:text-[20px] tracking-tight">Panduan Penggunaan</span>
          <button onClick={onClose} className="cursor-pointer flex items-center justify-center w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 transition-colors border-none">
            <X size={16} strokeWidth={2.5} />
          </button>
        </div>

        {/* Tab-based Stepper Grid Row */}
        <div className="grid grid-cols-4 gap-2.5 px-6 mb-2">
          {steps.map((step, i) => {
            const isActive = activeStep === i;
            const StepIcon = step.tabIcon;
            return (
              <button
                key={i}
                onClick={() => setActiveStep(i)}
                className={`flex flex-col md:flex-row items-center gap-2 py-2.5 px-3 cursor-pointer border rounded-[var(--ui-radius-small)] transition-all duration-300 md:justify-center ${
                  isActive
                    ? 'bg-slate-50 border-slate-200/80 shadow-xs'
                    : 'bg-transparent border-transparent opacity-60 hover:opacity-100'
                }`}
              >
                <div 
                  className={`w-7 h-7 rounded-[var(--ui-radius-small)] flex items-center justify-center shrink-0 transition-all ${
                    isActive ? 'bg-white shadow-xs' : 'bg-slate-100/50'
                  }`}
                  style={isActive ? { color: step.color } : { color: '#64748b' }}
                >
                  <StepIcon size={14} strokeWidth={2.5} />
                </div>
                <span className={`text-[10.5px] font-black tracking-tight leading-none ${isActive ? 'text-slate-800' : 'text-slate-500'}`}>
                  {step.tabLabel}
                </span>
              </button>
            );
          })}
        </div>

        {/* Active Step Details Panel */}
        <div className="px-6 py-4 flex flex-col gap-4 text-left">
          <div className="bg-slate-50/40 border border-slate-100 rounded-[var(--ui-radius-card)] p-6 text-left relative overflow-hidden flex flex-col items-center text-center">
            {/* Soft backdrop radial color glow matching active step theme */}
            <div
              className="absolute -top-[30%] -left-[30%] w-[150px] h-[150px] rounded-full blur-[45px] opacity-10 pointer-events-none transition-all duration-500"
              style={{ backgroundColor: steps[activeStep].color }}
            ></div>

            {/* Glowing Icon Container */}
            <div
              className="w-14 h-14 rounded-full flex items-center justify-center mb-3.5 shadow-sm border transition-all duration-500"
              style={{
                backgroundColor: `${steps[activeStep].color}12`,
                borderColor: `${steps[activeStep].color}25`
              }}
            >
              {React.createElement(steps[activeStep].tabIcon, {
                className: "w-6 h-6",
                style: { color: steps[activeStep].color },
                strokeWidth: 2.2
              })}
            </div>

            {/* Content info */}
            <h3 className="text-[16px] md:text-[18px] font-black text-slate-800 tracking-tight leading-tight">{steps[activeStep].title}</h3>
            <p className="text-[12.5px] font-medium text-slate-500 mt-2 max-w-[340px] leading-relaxed">{steps[activeStep].desc}</p>

            {/* Direct Action Trigger Button inside card */}
            <button
              onClick={steps[activeStep].action}
              className="mt-4 w-full h-11 flex items-center justify-center gap-1.5 cursor-pointer border-none text-white rounded-[var(--ui-radius-small)] font-bold text-xs uppercase tracking-wider transition-all active:scale-[0.98]"
              style={{
                backgroundColor: steps[activeStep].color
              }}
            >
              <span>{steps[activeStep].actionLabel}</span>
              <ArrowRight size={13} strokeWidth={2.5} />
            </button>
          </div>
        </div>

        {/* Modal Footer Controls */}
        <div className="px-6 pb-6 md:pb-6 pt-4 border-t border-slate-100 flex items-center gap-3 bg-slate-50/50">
          {activeStep > 0 && (
            <button
              onClick={() => setActiveStep(prev => prev - 1)}
              className="flex-1 h-11 flex items-center justify-center gap-1.5 cursor-pointer border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 rounded-[var(--ui-radius-small)] font-bold text-xs uppercase tracking-wider transition-all active:scale-[0.98]"
            >
              <ChevronLeft size={14} strokeWidth={2.5} />
              <span>Kembali</span>
            </button>
          )}
          {activeStep < 3 ? (
            <button
              onClick={() => setActiveStep(prev => prev + 1)}
              data-slot="button"
              data-variant="primary"
              className="flex-1 h-11 flex items-center justify-center gap-1.5 cursor-pointer border-none text-white rounded-[var(--ui-radius-small)] font-bold text-xs uppercase tracking-wider transition-all active:scale-[0.98] btn-primary-theme"
              style={{ backgroundColor: 'var(--ui-primary-btn, var(--ui-primary))' }}
            >
              <span>Lanjut</span>
              <ArrowRight size={13} strokeWidth={2.5} />
            </button>
          ) : (
            <button
              onClick={onClose}
              data-slot="button"
              data-variant="primary"
              className="flex-1 h-11 flex items-center justify-center gap-1.5 cursor-pointer border-none text-white rounded-[var(--ui-radius-small)] font-bold text-xs uppercase tracking-wider transition-all active:scale-[0.98] btn-primary-theme"
              style={{ backgroundColor: 'var(--ui-primary-btn, var(--ui-primary))' }}
            >
              <Check size={14} strokeWidth={2.5} />
              <span>Selesai</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

// ── Bantuan bottom sheet modal component for mobile view
const PublicHelpModal = ({ isOpen, onClose, primaryColor, contactPhone, contactEmail, appName, getWaLink }) => {
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
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-slate-900/80 animate-in fade-in duration-300 p-0 md:p-4 text-left">
      {/* Backdrop overlay listener to close */}
      <div className="absolute inset-0 z-0 cursor-pointer" onClick={onClose}></div>

      {/* Sheet/Modal Drawer */}
      <div className="bg-white rounded-t-[var(--ui-radius-card)] md:rounded-[var(--ui-radius-card)] w-full max-w-md md:max-w-xl overflow-hidden shadow-xs border border-slate-100 flex flex-col animate-in slide-in-from-bottom md:zoom-in-95 duration-300 ease-out z-10 max-h-[85vh]">
        {/* iOS/Android drag handle bar - hidden on desktop */}
        <div className="w-12 h-1 bg-slate-200 rounded-full mx-auto my-3 shrink-0 md:hidden"></div>

        {/* Header */}
        <div className="px-6 pb-3 pt-4 md:pt-6 flex items-center justify-between">
          <span className="font-black text-slate-800 text-[18px] md:text-[20px] tracking-tight">Hubungi & Bantuan</span>
          <button onClick={onClose} className="cursor-pointer flex items-center justify-center w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 transition-colors border-none">
            <X size={16} strokeWidth={2.5} />
          </button>
        </div>

        {/* Body content scroll area */}
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
                href={getWaLink()} 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex items-center gap-3 p-3 border border-slate-155 hover:border-emerald-200 hover:bg-emerald-50/30 rounded-[var(--ui-radius-small)] transition-all text-slate-700 no-underline cursor-pointer group"
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
                className="flex items-center gap-3 p-3 border border-slate-155 hover:border-indigo-200 hover:bg-indigo-50/30 rounded-[var(--ui-radius-small)] transition-all text-slate-700 no-underline cursor-pointer group"
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

        {/* Bottom Sheet Footer */}
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

