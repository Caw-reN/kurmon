import { Button } from '../components/ui.jsx';
import React, { useState, useEffect, useMemo } from'react';
import { useOutletContext, useNavigate } from'react-router-dom';
import { Lock, User, CalendarDays, MapPin, BookOpenText, Calendar, Briefcase, HelpCircle, ShieldCheck, BookOpen, MessageSquare, MonitorSmartphone, Wifi, Palette, Users, Sparkles } from'lucide-react';
import { X, Search, ArrowRight, LogIn, ChevronLeft, Check, Info, Mail } from'lucide-react';
import HeaderNavbar from'../components/layout/HeaderNavbar.jsx';
import TeacherStudentIllustration from'../components/TeacherStudentIllustration.jsx';


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
  const [mobileFlowStep, setMobileFlowStep] = useState('loading');
  const [isLoaded, setIsLoaded] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [showPublicGuide, setShowPublicGuide] = useState(false);
  const [showPublicHelp, setShowPublicHelp] = useState(false);
  const [isSvgAnimated, setIsSvgAnimated] = useState(false);
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
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
        <div className="bg-white rounded-[var(--ui-radius-card)] shadow-2xl w-full max-w-4xl h-[85vh] overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50 shrink-0">
            <div>
              <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                <ShieldCheck className="text-red-500" size={18} />
                Peraturan &amp; Tata Tertib Sekolah
              </h3>
              <p className="text-xs text-slate-500 font-semibold mt-0.5">Dokumen resmi tata tertib dan kriteria poin sekolah</p>
            </div>
            <Button variant="outline" onClick={() =>setShowRulesModal(false)} className="cursor-pointer"><X size={20} /></Button>
          </div>

          {/* Tabs header */}
          <div className="flex border-b border-slate-200 bg-slate-50/50 shrink-0 px-6">
            <Button variant="outline"
              type="button"
              onClick={() =>setActiveRulesTab("pdf")}
              className={`px-4 py-3 text-sm font-bold border-b-2 transition-colors cursor-pointer ${activeRulesTab === 'pdf' ? 'border-[var(--ui-primary)] text-[var(--ui-primary)]' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
            >
              Dokumen Resmi (PDF)</Button>
            <Button variant="outline"
              type="button"
              onClick={() =>setActiveRulesTab("data")}
              className={`px-4 py-3 text-sm font-bold border-b-2 transition-colors cursor-pointer ${activeRulesTab === 'data' ? 'border-[var(--ui-primary)] text-[var(--ui-primary)]' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
            >
              Kriteria Skor Poin &amp; Tatib (Data)</Button>
          </div>

          <div className="flex-1 min-h-0 bg-slate-100">
            {activeRulesTab ==="pdf" ? (
              hasPdf ? (
                <iframe
                  src="/api/kedisiplinan/rules.pdf"
                  className="w-full h-full border-none"
                  title="Peraturan Sekolah PDF"
                />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center p-8 bg-slate-50 text-center">
                  <ShieldCheck size={48} className="text-slate-300 mb-3" />
                  <h4 className="text-sm font-bold text-slate-700">Dokumen PDF Belum Tersedia</h4>
                  <p className="text-xs text-slate-400 max-w-sm mt-1">Admin belum mengunggah dokumen PDF peraturan sekolah. Silakan cek tab"Kriteria Skor Poin" untuk melihat daftar aturan.</p>
                </div>
              )
            ) : (
              <div className="flex flex-col h-full bg-white p-6">
                <div className="flex flex-col md:flex-row gap-4 mb-4 justify-between items-center shrink-0">
                  <div className="relative w-full md:w-72">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                    <input
                      type="text"
                      placeholder="Cari aturan/tata tertib..."
                      value={rulesSearch}
                      onChange={e => setRulesSearch(e.target.value)}
                      className="w-full pl-9 pr-4 py-1.5 bg-slate-50 border border-slate-200 rounded-[var(--ui-radius-small)] text-xs focus:outline-none focus:ring-1 focus:ring-[var(--ui-primary)] font-medium"
                    />
                  </div>
                  <div className="flex gap-1 bg-slate-100 p-0.5 rounded-[var(--ui-radius-small)] w-full md:w-auto">
                    {['all','pelanggaran','prestasi'].map((type) => (
                      <Button variant="outline"
                        key={type}
                        type="button"
                        onClick={() =>setRulesFilterType(type)}
                        className={`flex-1 md:flex-none cursor-pointer px-3 py-1.5 rounded-[var(--ui-radius-small)] text-xs font-bold transition-all ${rulesFilterType === type ? 'bg-white text-[var(--ui-primary)] shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                      >
                        {type ==='all' ?'Semua' : type}</Button>
                    ))}
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto border border-slate-150 rounded-[var(--ui-radius-card)] custom-scrollbar">
                  {loadingRules ? (
                    <div className="p-12 text-center text-slate-400 text-xs font-semibold">Memuat kriteria poin...</div>
                  ) : filteredRules.length === 0 ? (
                    <div className="p-12 text-center text-slate-400 text-xs">Tidak ditemukan kriteria poin.</div>
                  ) : (
                    <table className="w-full text-left text-xs border-collapse">
                      <thead className="bg-slate-50 text-slate-500 uppercase font-bold sticky top-0 border-b border-slate-200">
                        <tr>
                          <th className="px-4 py-3">Tata Tertib / Tindakan</th>
                          <th className="px-4 py-3 text-center w-28">Tipe</th>
                          <th className="px-4 py-3 text-right w-24">Skor Poin</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-semibold text-slate-700">
                        {filteredRules.map((r) => {
                          const isPrestasi = r.jenis ==='prestasi';
                          return (
                            <tr key={r.id} className="hover:bg-slate-50/50 transition-colors">
                              <td className="px-4 py-3.5 align-middle break-words">{r.nama_tindakan}</td>
                              <td className="px-4 py-3.5 text-center align-middle">
                                <span className={`px-2 py-0.5 rounded-[var(--ui-radius-small)] text-[9px] font-bold border ${isPrestasi
                                    ?'bg-emerald-50 text-emerald-600 border-emerald-100'
                                    :'bg-red-50 text-red-600 border-red-100'
                                  }`}>
                                  {isPrestasi ?'Prestasi' :'Pelanggaran'}
                                </span>
                              </td>
                              <td className={`px-4 py-3.5 text-right font-bold text-sm align-middle ${isPrestasi ?'text-emerald-600' :'text-red-600'}`}>
                                {isPrestasi ?'-' :'+'}{r.nilai_poin}
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

          <div className="px-6 py-3 border-t border-slate-100 bg-slate-50/50 flex justify-end gap-3 shrink-0">
            {activeRulesTab ==="pdf" && hasPdf && (
              <a
                href="/api/kedisiplinan/rules.pdf"
                download="peraturan_sekolah.pdf"
                className="px-4 py-2 bg-[var(--ui-primary)] hover:opacity-90 text-white rounded-[var(--ui-radius-small)] font-bold text-xs shadow-sm flex items-center justify-center gap-1.5 cursor-pointer text-center no-underline"
              >
                Unduh PDF
              </a>
            )}
            <Button variant="outline"
              onClick={() =>setShowRulesModal(false)}
              className="cursor-pointer"
            >
              Tutup</Button>
          </div>
        </div>
      </div>
    );
  };

  useEffect(() => {
    if (isMobile && mobileFlowStep ==='landing') {
      const timer = setTimeout(() => {
        setIsSvgAnimated(true);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [isMobile, mobileFlowStep]);

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

  useEffect(() => {
    if (isMobile && mobileFlowStep ==='loading') {
      setLoadingProgress(0);
      const duration = 1500; // 1.5s
      const intervalTime = 30; // update every 30ms
      const steps = duration / intervalTime;
      let currentStep = 0;

      const timer = setInterval(() => {
        currentStep += 1;
        const progress = Math.min(Math.round((currentStep / steps) * 100), 100);
        setLoadingProgress(progress);

        if (currentStep >= steps) {
          clearInterval(timer);
          setMobileFlowStep('landing');
        }
      }, intervalTime);

      return () => clearInterval(timer);
    }
  }, [isMobile, mobileFlowStep]);

  useEffect(() => {
    setIsLoaded(true);
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
  console.log("LandingPage appSettings:", {
    primaryColor,
    accentColor,
    heroTitle,
    heroSubtitle: cleanHeroSubtitle,
    logoText,
    heroTitleColor: appSettings?.heroTitleColor,
    heroSubtitleColor: appSettings?.heroSubtitleColor,
    heroHighlightColor: appSettings?.heroHighlightColor
  });

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
    const totalItems = partners.length + 1;
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
    const totalItems = partners.length + 1;
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
    const totalItems = partners.length + 1;
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
    red:"from-red-500 to-red-600",
    blue:"from-blue-500 to-blue-600",
    emerald:"from-emerald-500 to-emerald-600",
    purple:"from-purple-500 to-purple-600",
    orange:"from-orange-500 to-orange-600",
    cyan:"from-cyan-500 to-cyan-600",
    pink:"from-pink-500 to-pink-600"
  };

  const getShortLabel = (label) => {
    if (!label) return "";
    if (label.includes("PKL")) return "PKL";
    if (label.includes("Jadwal")) return "Jadwal";
    if (label.includes("Denah")) return "Denah";
    if (label.includes("Materi")) return "Materi";
    if (label.includes("Kalender")) return "Kalender";
    if (label.includes("Struktur")) return "Struktur";
    if (label.includes("Peraturan")) return "Peraturan";
    if (label.includes("Lainnya")) return "Lainnya";
    return label;
  };

  return (
    <div className={`relative flex flex-col min-h-screen w-full transition-opacity duration-700 bg-[var(--ui-bg)] overflow-x-hidden font-sans ${isLoaded ?'opacity-100' :'opacity-0'}`} style={{'--accent-color': accentColor ||'#a3e635','--ui-primary': primaryColor ||'#4B7BE5' }}>

      {/* GLOBAL DECORATIVE BACKGROUND */}
      {appSettings.heroImage ? (
        <div
          className="hidden md:block absolute top-0 left-0 w-full h-[54vh] pointer-events-none z-0 opacity-100 transition-all duration-700 bg-no-repeat bg-cover bg-center"
          style={{
            backgroundImage: `url(${appSettings.heroImage})`
          }}
        />
      ) : (
        <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
          {/* Soft Wash Gradient */}
          <div className="absolute inset-0 bg-gradient-to-br from-white/90 via-purple-50/30 to-blue-50/40 backdrop-blur-[100px]"></div>
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

      {/* MOBILE SCROLLABLE VIEW */}
      <div className="md:hidden flex flex-col w-full pb-20">

        {/* Curved Green Header Card (Matching Reference Image) */}
        <div
          className="w-full relative flex flex-col text-white select-none px-5 pb-8 pt-5 rounded-b-[var(--ui-radius-card)] overflow-hidden"
          style={{
            backgroundImage: appSettings.heroImage 
              ? `linear-gradient(135deg, ${hexToRgba(primaryColor ||'#064e3b', 0.94)} 0%, ${hexToRgba(primaryColor ||'#064e3b', 0.88)} 100%), url(${appSettings.heroImage})`
              : `linear-gradient(135deg, ${primaryColor ||'#064e3b'} 0%, ${(primaryColor ||'#064e3b')}dd 100%)`,
            backgroundSize:'cover',
            backgroundPosition:'center',
          }}
        >
        {/* Sparkles backdrop illustration */}
        <Sparkles className="absolute left-6 top-16 text-white/5 animate-pulse" size={16} />
        <Sparkles className="absolute right-12 bottom-6 text-white/5 animate-pulse" size={16} />

        {/* Top Bar inside Green Card */}
        <div className="flex items-center justify-between mb-5 w-full">
          <div className="flex items-center gap-2.5">
            {appSettings.logoUrl ? (
              <div className="w-8 h-8 rounded-[var(--ui-radius-small)] bg-white flex items-center justify-center p-1 shadow-sm">
                <img src={appSettings.logoUrl} alt="Logo" className="w-full h-full object-contain" />
              </div>
            ) : (
              <div className="w-8 h-8 rounded-[var(--ui-radius-small)] bg-white flex items-center justify-center text-[var(--ui-primary)] font-black text-[11px] shadow-sm">
                {logoText ||"TS"}
              </div>
            )}
            <div className="flex flex-col text-left">
              <span className="text-[7.5px] font-black text-white/80 tracking-wider leading-none uppercase">{appSettings.logoSmallText ||"PORTAL"}</span>
              <span className="text-[12px] font-extrabold text-white tracking-tight leading-none uppercase">{appSettings.appName ||"KG2 SCHOOL"}</span>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <Button variant="outline" 
              onClick={() =>setIsLoginModalOpen(true)}
              className="relative cursor-pointer"
              aria-label="Masuk Aplikasi"
            >
              <User size={20} strokeWidth={2} /></Button>
          </div>
        </div>

        {/* Greetings */}
        <div className="text-left mt-1.5 mb-3.5 relative z-10 pl-0">
          <h2 className="text-[20px] font-normal opacity-90 leading-tight">Hello,</h2>
          <h1 className="text-[28px] font-black leading-tight mt-0.5">Selamat Datang</h1>
          <p className="text-[11px] opacity-80 font-medium leading-relaxed max-w-[280px] mt-2">
            {cleanHeroSubtitle}
          </p>
        </div>
      </div>

        {/* Layanan Publik Overlapping Card (Matching Reference Image) */}
        <div className="mx-4 -mt-8 bg-white rounded-[24px] p-4 shadow-[0_8px_30px_rgba(0,0,0,0.06)] relative z-20 border border-slate-100 flex flex-col gap-3.5 select-none">
          <h3 className="text-[11px] font-black text-slate-800 uppercase tracking-widest text-left pl-1">Layanan Publik</h3>
          
          {/* Flex column enclosing rows of 4 buttons */}
          <div className="flex flex-col gap-3.5 w-full mt-1.5">
            {/* Row 1 */}
            <div className="flex justify-between items-start w-full">
              {(() => {
                const gridServices = [
                  ...publicServices,
                  { label:"Lainnya", svgIcon:"056-question.svg", icon: HelpCircle, isLainnya: true, defaultColor:"#64748b" }
                ];
                return gridServices.slice(0, 4).map((service, idx) => {
                  const activeColor = service.customColor || service.defaultColor;
                  return (
                    <button
                      key={idx}
                      onClick={() =>{
                        if (service.isLainnya) {
                          setShowPublicGuide(true);
                        } else if (service.isPdfRules) {
                          setShowRulesModal(true);
                        } else {
                          navigate(service.path);
                        }
                      }}
                      className="aspect-square bg-white border border-slate-100 rounded-[18px] shadow-sm flex flex-col items-center justify-center gap-1 p-1.5 cursor-pointer w-[22%] shrink-0 group relative"
                    >
                      <div 
                        className="w-8 h-8 rounded-[12px] flex items-center justify-center transition-all duration-300 group-active:scale-95 shadow-xs border border-slate-50/50"
                        style={{ backgroundColor: hexToRgba(activeColor, 0.08) }}
                      >
                        {service.customIcon ? (
                          <img src={service.customIcon} alt="" className="w-5 h-5 object-contain" />
                        ) : (
                          <img src={`/icons/${service.svgIcon}`} className="w-5 h-5 object-contain" alt="" />
                        )}
                      </div>
                      <span className="text-[9px] font-black text-slate-700 tracking-tight leading-none text-center truncate w-full mt-0.5">
                        {getShortLabel(service.label)}
                      </span></button>
                  );
                });
              })()}
            </div>

            {/* Row 2 */}
            <div className="flex justify-between items-start w-full">
              {(() => {
                const gridServices = [
                  ...publicServices,
                  { label:"Lainnya", svgIcon:"056-question.svg", icon: HelpCircle, isLainnya: true, defaultColor:"#64748b" }
                ];
                return gridServices.slice(4, 8).map((service, idx) => {
                  const activeColor = service.customColor || service.defaultColor;
                  return (
                    <button
                      key={idx + 4}
                      onClick={() =>{
                        if (service.isLainnya) {
                          setShowPublicGuide(true);
                        } else if (service.isPdfRules) {
                          setShowRulesModal(true);
                        } else {
                          navigate(service.path);
                        }
                      }}
                      className="aspect-square bg-white border border-slate-100 rounded-[18px] shadow-sm flex flex-col items-center justify-center gap-1 p-1.5 cursor-pointer w-[22%] shrink-0 group relative"
                    >
                      <div 
                        className="w-8 h-8 rounded-[12px] flex items-center justify-center transition-all duration-300 group-active:scale-95 shadow-xs border border-slate-50/50"
                        style={{ backgroundColor: hexToRgba(activeColor, 0.08) }}
                      >
                        {service.customIcon ? (
                          <img src={service.customIcon} alt="" className="w-5 h-5 object-contain" />
                        ) : (
                          <img src={`/icons/${service.svgIcon}`} className="w-5 h-5 object-contain" alt="" />
                        )}
                      </div>
                      <span className="text-[9px] font-black text-slate-700 tracking-tight leading-none text-center truncate w-full mt-0.5">
                        {getShortLabel(service.label)}
                      </span></button>
                  );
                });
              })()}
            </div>
          </div>
        </div>

        {/* JURUSAN / PROGRAM SLIDER (Mobile Only) */}
        <section className="relative z-10 w-full px-5 mt-4 mb-4">
          <div className="flex flex-col text-left mb-3">
            <span className="text-[9px] font-bold tracking-widest uppercase" style={{ color: primaryColor }}>{appSettings.trustedByText ||"Program Keahlian Unggulan"}</span>
            <h2 className="text-lg font-extrabold text-slate-800 uppercase tracking-tight mt-0.5">JURUSAN / PROGRAM</h2>
          </div>

          <div className="relative w-full h-[115px] overflow-hidden rounded-[var(--ui-radius-card)] shadow-md border border-slate-100 bg-white">
            {partners.map((partner, index) => {
              const isActive = index === activeSlide % (partners.length || 1);
              const rawColor = partner.color ||"blue";
              const colorMap = {
                red:"bg-red-500",
                blue:"bg-blue-600",
                emerald:"bg-emerald-500",
                purple:"bg-purple-600",
                orange:"bg-orange-500",
                cyan:"bg-cyan-500",
                pink:"bg-pink-500"
              };
              const isHexColor = rawColor.startsWith('#');
              const bgColorClass = isHexColor ?"" : (colorMap[rawColor] ||"bg-gradient-to-br from-blue-600 to-blue-700");
              const imageSrc = partner.image;
              const IconComponent = ICON_MAP[partner.icon] || HelpCircle;

              return (
                <div 
                  key={index}
                  className={`absolute inset-0 p-4 flex flex-col justify-between transition-all duration-700 transform rounded-[var(--ui-radius-card)] ${isActive ?'opacity-100 translate-x-0 scale-100 z-10' :'opacity-0 translate-x-full scale-95 z-0'}`}
                  style={isHexColor ? { backgroundColor: rawColor } : {}}
                >
                  {/* Background gradient if not hex */}
                  {!isHexColor && <div className={`absolute inset-0 -z-10 ${bgColorClass}`}></div>}
                  <div className="absolute -right-8 -top-8 w-24 h-24 bg-white/10 rounded-full blur-xl pointer-events-none"></div>

                  {/* Logo/Icon overlapping right bottom */}
                  <div className="absolute right-3.5 bottom-3.5 pointer-events-none z-20 drop-shadow-md">
                    {imageSrc ? (
                      <div className="w-12 h-12 rounded-[var(--ui-radius-small)] bg-white flex items-center justify-center p-1.5 shadow-md">
                        <img src={imageSrc} alt={partner.name} className="w-full h-full object-contain rounded-[var(--ui-radius-small)]" />
                      </div>
                    ) : (
                      <div className="w-12 h-12 rounded-[var(--ui-radius-small)] bg-white flex items-center justify-center text-slate-800 p-2 shadow-md">
                        <IconComponent className="w-full h-full opacity-90" strokeWidth={1.5} />
                      </div>
                    )}
                  </div>

                  {/* Content text */}
                  <div className="text-white text-left pr-20 flex flex-col justify-center h-full">
                    <span className="text-[9px] font-black uppercase tracking-wider opacity-75 mb-1.5 shrink-0">Keahlian</span>
                    <div className="flex flex-col font-black tracking-tight text-[15px] uppercase">
                      {partner.name.split(' ').map((word, wIdx) => (
                        <span key={wIdx} className="block leading-[1.05] drop-shadow-sm">{word}</span>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Dots indicators */}
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5 z-20">
              {partners.map((_, index) => {
                const isActive = index === activeSlide % (partners.length || 1);
                return (
                  <button
                    key={index}
                    onClick={() => setActiveSlide(index)}
                    className={`cursor-pointer h-1.5 rounded-full transition-all duration-300 border-none p-0 ${
                      isActive ? 'w-4 bg-white' : 'w-1.5 bg-white/40'
                    }`}
                    style={{ borderRadius: '9999px' }}
                    aria-label={`Ke slide ${index + 1}`}
                  />
                );
              })}
            </div>
          </div>
        </section>

        {/* MITRA & KERJASAMA SLIDER */}
        {appSettings.mitraKerjasama && appSettings.mitraKerjasama.length > 0 && (
          <section className="relative z-10 w-full overflow-hidden py-4 md:py-6">
            <div className="w-full max-w-[1200px] mx-auto px-5 md:px-8">
              <div className="w-full mb-3 text-center">
                <h3 className="text-[10px] md:text-[11px] font-bold text-slate-400 uppercase tracking-wider inline-block">Telah Dipercaya & Bekerjasama Dengan</h3>
              </div>

              <div className="relative w-full overflow-hidden flex py-1">
                <div className="absolute left-0 top-0 w-16 md:w-24 h-full bg-gradient-to-r from-[var(--ui-bg)] to-transparent z-10 pointer-events-none"></div>
                <div className="absolute right-0 top-0 w-16 md:w-24 h-full bg-gradient-to-l from-[var(--ui-bg)] to-transparent z-10 pointer-events-none"></div>

                <div className="flex w-max animate-marquee gap-8 md:gap-12 items-center px-4 hover:[animation-play-state:paused]">
                  {[...appSettings.mitraKerjasama, ...appSettings.mitraKerjasama, ...appSettings.mitraKerjasama, ...appSettings.mitraKerjasama].map((mitra, idx) => (
                    <div key={`${mitra.id ||'m'}-${idx}`} className="w-[80px] md:w-[110px] h-[35px] md:h-[45px] flex items-center justify-center shrink-0 group grayscale opacity-50 hover:grayscale-0 hover:opacity-100 transition-all duration-300 cursor-pointer">
                      {mitra.image ? (
                        <img src={mitra.image} alt={mitra.name} className="max-w-full max-h-full object-contain group-hover:scale-105 transition-transform" title={mitra.name} />
                      ) : (
                        <span className="text-xs md:text-sm font-black text-slate-700 tracking-tight text-center">{mitra.name}</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>
        )}
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
                className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-[var(--ui-radius-small)] text-white font-black text-xs uppercase tracking-wider shadow-sm hover:scale-[1.03] hover:shadow-md transition-all duration-300 cursor-pointer border-none"
                style={{ backgroundColor: primaryColor }}
              >
                Masuk ke Aplikasi <ArrowRight size={14} strokeWidth={3} />
              </button>
            </div>
          </div>

          {/* Right Column (Illustration) - Only render if custom background image is NOT set */}
          {!appSettings.heroImage && (
            <div className="w-[380px] lg:w-[450px] flex items-center justify-center shrink-0 min-h-0">
              <div className="w-full max-w-[320px] lg:max-w-[380px] aspect-square flex items-center justify-center p-6 bg-white/20 backdrop-blur-xs rounded-[var(--ui-radius-card)] border border-white/40 shadow-xs relative">
                {/* Glowing decorative background behind illustration */}
                <div className="absolute inset-4 rounded-full blur-2xl opacity-10 bg-gradient-to-tr from-blue-500 to-purple-500"></div>
                <TeacherStudentIllustration isAnimated={isSvgAnimated} />
              </div>
            </div>
          )}

        </div>

        {/* MIDDLE SECTION: LAYANAN PUBLIK */}
        <div className="shrink-0 border-t border-slate-200/50 pt-5 pb-3.5 mt-3 middle-layanan-section">
          <h2 className="text-sm lg:text-base font-extrabold text-slate-800 mb-2.5 text-left">Layanan Publik</h2>
          <div className="grid grid-cols-7 gap-3 w-full">
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
                  className="w-24 h-24 rounded-[20px] bg-white border border-slate-100 shadow-sm flex flex-col items-center justify-center gap-1.5 hover:-translate-y-1 hover:shadow-md transition-all duration-300 cursor-pointer group relative mx-auto"
                >
                  <div 
                    className="absolute inset-0 rounded-[20px] opacity-0 group-hover:opacity-[0.04] transition-all duration-300"
                    style={{ backgroundColor: activeColor }}
                  ></div>
                  <div 
                    className="w-10 h-10 rounded-[14px] flex items-center justify-center transition-all duration-300 group-hover:scale-110 relative z-10 shrink-0"
                    style={{ backgroundColor: hexToRgba(activeColor, 0.08) }}
                  >
                    {service.customIcon ? (
                      <img src={service.customIcon} alt="" className="w-5.5 h-5.5 object-contain" />
                    ) : (
                      <img src={`/icons/${service.svgIcon}`} alt="" className="w-5.5 h-5.5 object-contain" />
                    )}
                  </div>
                  <span className="text-[10px] font-black text-slate-700 tracking-tight leading-none text-center w-full mt-1 truncate px-1 relative z-10">
                    {service.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* BOTTOM SECTION: JURUSAN / PROGRAM */}
        <div className="shrink-0 border-t border-slate-200/50 py-3.5 mt-2 bottom-jurusan-section">
          <div className="flex flex-row items-center gap-6 md:gap-8 w-full">
            {/* Title section (left side) */}
            <div className="flex flex-col justify-center shrink-0 w-44 text-left">
              <p className="text-[9px] lg:text-[10px] font-bold mb-0.5" style={{ color: primaryColor }}>{appSettings.trustedByText ||"Program Keahlian Unggulan"}</p>
              <h2 className="text-lg lg:text-xl font-black text-slate-800 tracking-tight leading-none">JURUSAN / PROGRAM</h2>
            </div>

            {/* Cards container */}
            <div className="flex-1 grid grid-cols-4 gap-3 lg:gap-4 w-full">
              {[1, 2, 3, 4].map((idx) => {
                const name = appSettings[`partner${idx}`];
                if (!name) return null;

                const desc = appSettings[`partnerDesc${idx}`] ||"Pelajari selengkapnya tentang program ini.";
                const iconStr = appSettings[`partnerIcon${idx}`] ||"book";
                const IconComponent = ICON_MAP[iconStr] || HelpCircle;

                const rawColor = appSettings[`partnerColor${idx}`] || ["orange","blue","emerald","pink"][idx - 1] ||"blue";
                const colorMap = {
                  red:"bg-red-500",
                  blue:"bg-blue-600",
                  emerald:"bg-emerald-500",
                  purple:"bg-purple-600",
                  orange:"bg-orange-500",
                  cyan:"bg-cyan-500",
                  pink:"bg-pink-500"
                };
                const isHexColor = rawColor.startsWith('#');
                const bgColorClass = isHexColor ?"" : (colorMap[rawColor] ||"bg-gradient-to-br from-blue-600 to-blue-700");
                const imageSrc = appSettings[`partnerImage${idx}`];

                return (
                  <div key={idx} className="group relative rounded-[var(--ui-radius-small)] p-3 lg:p-4 shadow-sm hover:shadow-md transition-all duration-300 flex flex-col justify-between h-24 lg:h-28 w-full z-10">

                    <div 
                      className={`absolute inset-0 rounded-[var(--ui-radius-small)] overflow-hidden shadow-inner -z-10 ${bgColorClass}`}
                      style={isHexColor ? { backgroundColor: rawColor } : {}}
                    >
                      <div className="absolute -right-4 -bottom-4 opacity-10 pointer-events-none w-24 h-24 transform group-hover:scale-110 group-hover:-rotate-6 transition-transform duration-700">
                        {imageSrc ? (
                          <img src={imageSrc} alt="" className="w-full h-full object-contain grayscale brightness-0 invert" />
                        ) : (
                          <IconComponent className="w-full h-full text-white" strokeWidth={1.5} />
                        )}
                      </div>
                      <div className="absolute -right-8 -top-8 w-20 h-20 bg-white/20 rounded-full blur-xl pointer-events-none transition-all group-hover:bg-white/30"></div>
                    </div>

                    <div className="relative z-10 pr-10 text-white flex flex-col text-left">
                      <span className="text-[8px] font-black uppercase tracking-wider opacity-85 mb-0.5">Keahlian</span>
                      <h4 className="text-[12px] lg:text-[13px] font-black leading-tight drop-shadow-md group-hover:-translate-y-0.5 transition-transform">{name}</h4>
                    </div>

                    <div className="absolute -right-3 -bottom-4 lg:-right-4 lg:-bottom-5 pointer-events-none z-20 group-hover:-translate-y-3 group-hover:scale-110 transition-transform duration-500 drop-shadow-md">
                      {imageSrc ? (
                        <img src={imageSrc} alt={name} className="w-16 h-16 lg:w-20 lg:h-20 object-contain" />
                      ) : (
                        <div className="w-16 h-16 lg:w-20 lg:h-20 flex items-center justify-center rotate-[-5deg] group-hover:rotate-0 transition-all duration-300 text-slate-800">
                          <IconComponent className="w-full h-full opacity-90" strokeWidth={1.5} />
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* BOTTOM SECTION: MITRA & KERJASAMA SLIDER */}
        {appSettings.mitraKerjasama && appSettings.mitraKerjasama.length > 0 && (
          <div className="shrink-0 border-t border-slate-200/50 py-3 mt-1 mitra-kerjasama-section">
            <div className="w-full mb-3 text-center">
              <h3 className="text-[10px] md:text-[11px] font-bold text-slate-400 uppercase tracking-wider inline-block">Telah Dipercaya & Bekerjasama Dengan</h3>
            </div>

            <div className="relative w-full overflow-hidden flex py-0.5">
              <div className="absolute left-0 top-0 w-16 h-full bg-gradient-to-r from-[var(--ui-bg)] to-transparent z-10 pointer-events-none"></div>
              <div className="absolute right-0 top-0 w-16 h-full bg-gradient-to-l from-[var(--ui-bg)] to-transparent z-10 pointer-events-none"></div>

              <div className="flex w-max animate-marquee gap-8 lg:gap-12 items-center px-4 hover:[animation-play-state:paused]">
                {[...appSettings.mitraKerjasama, ...appSettings.mitraKerjasama, ...appSettings.mitraKerjasama, ...appSettings.mitraKerjasama].map((mitra, idx) => (
                  <div key={`${mitra.id ||'m'}-${idx}`} className="w-[70px] lg:w-[90px] h-[30px] lg:h-[35px] flex items-center justify-center shrink-0 group grayscale opacity-50 hover:grayscale-0 hover:opacity-100 transition-all duration-300 cursor-pointer">
                    {mitra.image ? (
                      <img src={mitra.image} alt={mitra.name} className="max-w-full max-h-full object-contain group-hover:scale-105 transition-transform" title={mitra.name} />
                    ) : (
                      <span className="text-[10px] font-black text-slate-700 tracking-tight text-center">{mitra.name}</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

      </div>

      {/* Mobile Bottom Tab Bar */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-white border-t border-slate-100 flex items-center justify-between z-[40] pb-safe-bottom shadow-[0_-4px_12px_rgba(0,0,0,0.03)] px-4 gap-3 select-none">
        <button 
          onClick={() => setShowPublicHelp(true)} 
          className="flex flex-col items-center justify-center cursor-pointer border-none bg-transparent text-slate-600 hover:text-slate-900 active:scale-95 transition-all w-16 h-12"
        >
          <img src="/icons/012-support.svg" className="w-5 h-5 object-contain" alt="" />
          <span className="text-[8px] font-extrabold tracking-tight mt-1 text-slate-500">Bantuan</span>
        </button>

        <button 
          onClick={() => setIsLoginModalOpen(true)} 
          className="flex-1 h-11 flex items-center justify-center gap-1.5 cursor-pointer border-none text-white rounded-xl font-extrabold text-xs uppercase tracking-wider active:scale-[0.98] transition-all"
          style={{ 
            backgroundColor: primaryColor,
            boxShadow: `0 4px 12px ${hexToRgba(primaryColor, 0.2)}`
          }}
        >
          Masuk Sekarang
        </button>
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
  <svg viewBox="0 0 100 100" className="w-24 h-24 drop-shadow-md">
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
      desc:"Tekan menu'Jadwal Pelajaran' untuk melihat jadwal KBM aktif secara real-time. Pilih hari dan kelas untuk menyesuaikan.",
      color:"#D97706", // Orange
      actionLabel:"Buka Jadwal Pelajaran",
      action: () => { navigate("/jadwal"); onClose(); }
    },
    {
      tabLabel:"Denah",
      svgIcon:"016-map pin.svg",
      tabIcon: MapPin,
      title:"2. Cari Denah Kelas & Ruang",
      desc:"Gunakan menu'Denah Kelas' untuk melihat tata letak ruang kelas, lab, bengkel, dan kantor secara interaktif di sekolah.",
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
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/60 backdrop-blur-[2px] animate-in fade-in duration-300">
      {/* Backdrop overlay listener to close */}
      <div className="absolute inset-0 z-0 cursor-pointer" onClick={onClose}></div>

      {/* Bottom Sheet Drawer */}
      <div className="bg-white rounded-t-[32px] w-full max-w-md overflow-hidden shadow-2xl border-t border-slate-100 flex flex-col animate-in slide-in-from-bottom duration-300 ease-out z-10">
        {/* iOS/Android drag handle bar */}
        <div className="w-12 h-1 bg-slate-200 rounded-full mx-auto my-3 shrink-0"></div>

        {/* Header */}
        <div className="px-6 pb-3 pt-1 flex items-center justify-between">
          <span className="font-black text-slate-800 text-[16px] tracking-tight">Panduan Penggunaan</span>
          <button onClick={onClose} className="cursor-pointer flex items-center justify-center">
            <X size={16} strokeWidth={2.5} />
          </button>
        </div>

        {/* Tab-based Stepper Grid Row */}
        <div className="grid grid-cols-4 gap-2 px-6 mb-2">
          {steps.map((step, i) => {
            const isActive = activeStep === i;
            return (
              <button
                key={i}
                onClick={() => setActiveStep(i)}
                className={`flex flex-col items-center justify-center gap-1 py-2 cursor-pointer border rounded-2xl transition-all duration-300 ${
                  isActive
                    ? 'bg-slate-50 border-slate-200/80 shadow-xs'
                    : 'bg-transparent border-transparent opacity-60 hover:opacity-100'
                }`}
              >
                <img
                  src={`/icons/${step.svgIcon}`}
                  className="w-5.5 h-5.5 object-contain"
                  alt=""
                  style={{ opacity: isActive ? 1 : 0.5 }}
                />
                <span className={`text-[10px] font-bold tracking-tight ${isActive ? 'text-slate-800' : 'text-slate-500'}`}>
                  {step.tabLabel}
                </span>
              </button>
            );
          })}
        </div>

        {/* Active Step Details Panel */}
        <div className="px-6 py-4 flex flex-col gap-4 text-left">
          <div className="bg-slate-50/40 border border-slate-100 rounded-3xl p-5 text-left relative overflow-hidden flex flex-col items-center text-center">
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
              <img
                src={`/icons/${steps[activeStep].svgIcon}`}
                className="w-7 h-7 object-contain"
                alt=""
              />
            </div>

            {/* Content info */}
            <h3 className="text-[15px] font-black text-slate-800 tracking-tight leading-tight">{steps[activeStep].title}</h3>
            <p className="text-[12px] font-medium text-slate-500 mt-2 max-w-[280px] leading-relaxed">{steps[activeStep].desc}</p>

            {/* Direct Action Trigger Button inside card */}
            <button
              onClick={steps[activeStep].action}
              className="mt-4 w-full h-11 flex items-center justify-center gap-1.5 cursor-pointer border-none text-white rounded-xl font-bold text-xs uppercase tracking-wider transition-all active:scale-[0.98]"
              style={{
                backgroundColor: steps[activeStep].color,
                boxShadow: `0 4px 12px ${steps[activeStep].color}30`
              }}
            >
              <span>{steps[activeStep].actionLabel}</span>
              <ArrowRight size={13} strokeWidth={2.5} />
            </button>
          </div>
        </div>

        {/* Modal Footer Controls */}
        <div className="px-6 pb-8 pt-4 border-t border-slate-100 flex items-center gap-3 bg-slate-50/50">
          {activeStep > 0 && (
            <button
              onClick={() => setActiveStep(prev => prev - 1)}
              className="flex-1 h-11 flex items-center justify-center gap-1.5 cursor-pointer border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 rounded-xl font-bold text-xs uppercase tracking-wider transition-all active:scale-[0.98] shadow-xs"
            >
              <ChevronLeft size={14} strokeWidth={2.5} />
              <span>Kembali</span>
            </button>
          )}
          {activeStep < 3 ? (
            <button
              onClick={() => setActiveStep(prev => prev + 1)}
              className="flex-1 h-11 flex items-center justify-center gap-1.5 cursor-pointer border-none text-white rounded-xl font-bold text-xs uppercase tracking-wider transition-all active:scale-[0.98]"
              style={{ 
                backgroundColor: primaryColor || '#064e3b',
                boxShadow: `0 4px 12px ${hexToRgba(primaryColor || '#064e3b', 0.2)}`
              }}
            >
              <span>Lanjut</span>
              <ArrowRight size={13} strokeWidth={2.5} />
            </button>
          ) : (
            <button
              onClick={onClose}
              className="flex-1 h-11 flex items-center justify-center gap-1.5 cursor-pointer border-none text-white rounded-xl font-bold text-xs uppercase tracking-wider transition-all active:scale-[0.98]"
              style={{ 
                backgroundColor: primaryColor || '#064e3b',
                boxShadow: `0 4px 12px ${hexToRgba(primaryColor || '#064e3b', 0.2)}`
              }}
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
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/60 backdrop-blur-[2px] animate-in fade-in duration-300">
      {/* Backdrop overlay listener to close */}
      <div className="absolute inset-0 z-0 cursor-pointer" onClick={onClose}></div>

      {/* Bottom Sheet Drawer */}
      <div className="bg-white rounded-t-[32px] w-full max-w-md overflow-hidden shadow-2xl border-t border-slate-100 flex flex-col animate-in slide-in-from-bottom duration-300 ease-out z-10 max-h-[85vh]">
        {/* iOS/Android drag handle bar */}
        <div className="w-12 h-1 bg-slate-200 rounded-full mx-auto my-3 shrink-0"></div>

        {/* Header */}
        <div className="px-6 pb-3 pt-1 flex items-center justify-between">
          <span className="font-black text-slate-800 text-[16px] tracking-tight">Hubungi & Bantuan</span>
          <button onClick={onClose} className="cursor-pointer flex items-center justify-center">
            <X size={16} strokeWidth={2.5} />
          </button>
        </div>

        {/* Body content scroll area */}
        <div className="px-6 py-4 space-y-4 text-xs font-semibold text-slate-600 overflow-y-auto select-text">
          <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4 text-blue-800 flex items-start gap-2.5">
            <Info size={16} className="shrink-0 mt-0.5" style={{ color:'#1d4ed8' }} />
            <p className="leading-relaxed font-semibold text-left text-blue-900">
              Butuh bantuan untuk masuk ke sistem atau memiliki pertanyaan seputar KBM? Silakan cek FAQ atau hubungi admin di bawah.
            </p>
          </div>

          <div className="space-y-3">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest text-left">Pertanyaan Umum (FAQ)</p>
            <div className="border border-slate-100 rounded-2xl p-3 bg-slate-50/40 text-left">
              <p className="font-extrabold text-slate-800 mb-1">Bagaimana cara masuk ke sistem?</p>
              <p className="leading-relaxed font-medium text-slate-500">Klik tombol"Masuk Sekarang" di bar bawah, lalu gunakan username dan password resmi yang diberikan sekolah.</p>
            </div>
            <div className="border border-slate-100 rounded-2xl p-3 bg-slate-50/40 text-left">
              <p className="font-extrabold text-slate-800 mb-1">Lupa password atau tidak bisa login?</p>
              <p className="leading-relaxed font-medium text-slate-500">Silakan hubungi administrator sekolah untuk melakukan reset password akun Anda.</p>
            </div>
          </div>

          <div className="space-y-2.5 pt-2 text-left">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Hubungi Admin Sekolah</p>
            
            {contactPhone && (
              <a 
                href={getWaLink()} 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex items-center gap-3 p-3 border border-slate-100 hover:border-emerald-200 hover:bg-emerald-50/30 rounded-2xl transition-all text-slate-700 no-underline cursor-pointer group"
              >
                <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
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
                className="flex items-center gap-3 p-3 border border-slate-100 hover:border-blue-200 hover:bg-blue-50/30 rounded-2xl transition-all text-slate-700 no-underline cursor-pointer group"
              >
                <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                  <Mail size={16} />
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
        <div className="px-6 pb-8 pt-4 border-t border-slate-100 bg-slate-50/50">
          <button 
            onClick={onClose}
            className="w-full h-11 flex items-center justify-center cursor-pointer border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 rounded-xl font-bold text-xs uppercase tracking-wider transition-all active:scale-[0.98] shadow-xs"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};
