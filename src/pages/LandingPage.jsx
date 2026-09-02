import { Button } from '../components/ui.jsx';
import React, { useState, useEffect, useMemo } from'react';
import { useOutletContext, useNavigate, Link } from'react-router-dom';
import { Lock, User, CalendarDays, MapPin, BookOpenText, Calendar, Briefcase, HelpCircle, ShieldCheck, BookOpen, MessageSquare, MonitorSmartphone, Wifi, Palette, Users, Sparkles, LogIn, GraduationCap, FileText, Sun, CloudRain, Moon, CloudSun } from'lucide-react';
import { X, Search, ArrowRight, ChevronLeft, ChevronRight, Check, Info, Mail } from'lucide-react';
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
  const [activeProgramIdx, setActiveProgramIdx] = useState(0);

  const availablePrograms = useMemo(() => {
    const progs = [];
    for (let i = 1; i <= 4; i++) {
      const name = appSettings[`partner${i}`];
      if (name) {
        progs.push({
          index: i,
          name: name,
          image: appSettings[`partnerImage${i}`],
          icon: appSettings[`partnerIcon${i}`] || "book",
          color: appSettings[`partnerColor${i}`] || "#3DAA37"
        });
      }
    }
    if (progs.length === 0) {
      progs.push(
        { index: 1, name: "Teknik Kendaraan Ringan", color: "#3DAA37", image: "/mobile_header_logo.png", icon: "monitor" },
        { index: 2, name: "Teknik Komputer & Jaringan", color: "#0284C7", icon: "wifi" },
        { index: 3, name: "Teknik Bisnis Sepeda Motor", color: "#D97706", icon: "book" },
        { index: 4, name: "Akuntansi & Keuangan", color: "#7C3AED", icon: "users" }
      );
    }
    return progs;
  }, [appSettings]);

  useEffect(() => {
    if (availablePrograms.length <= 1) return;
    const timer = setInterval(() => {
      setActiveProgramIdx((prev) => (prev + 1) % availablePrograms.length);
    }, 4500);
    return () => clearInterval(timer);
  }, [availablePrograms.length]);

  const mitraList = useMemo(() => {
    const custom = appSettings.mitraKerjasama;
    if (custom && custom.length > 0) {
      return [...custom, ...custom, ...custom, ...custom];
    }
    const defaults = [
      { name: "Fibernet", image: "" },
      { name: "MikroTik", image: "" },
      { name: "Cisco", image: "" },
      { name: "AWS Academy", image: "" },
      { name: "by.U", image: "" }
    ];
    return [...defaults, ...defaults, ...defaults, ...defaults];
  }, [appSettings.mitraKerjasama]);

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
      <div className="fixed inset-0 z-[100] flex items-end md:items-center justify-center bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-300 p-0 md:p-4 text-left">
        {/* Backdrop overlay listener to close */}
        <div 
          className="absolute inset-0 z-0 cursor-pointer" 
          onClick={() => setShowRulesModal(false)} 
        />

        {/* Bottom Sheet Drawer on Mobile, Centered Dialog on Desktop */}
        <div className="bg-white rounded-t-[28px] md:rounded-[var(--ui-radius-card,24px)] border border-slate-100/80 shadow-2xl w-full max-w-4xl h-[88vh] md:h-[82vh] max-h-[90vh] overflow-hidden flex flex-col animate-in slide-in-from-bottom md:zoom-in-95 duration-300 ease-out z-10">
          
          {/* iOS / Mobile Drag Handle Bar */}
          <div 
            className="w-12 h-1.5 bg-slate-200 hover:bg-slate-300 rounded-full mx-auto my-2.5 shrink-0 md:hidden cursor-pointer" 
            onClick={() => setShowRulesModal(false)} 
          />

          {/* Header */}
          <div className="px-5 sm:px-6 py-3.5 sm:py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70 shrink-0">
            <div className="flex items-center gap-3 text-left">
              <div 
                className="w-10 h-10 rounded-[var(--ui-radius-control,12px)] flex items-center justify-center shrink-0 shadow-2xs"
                style={{
                  backgroundColor: 'color-mix(in srgb, var(--ui-primary, #059669) 12%, transparent)',
                  color: 'var(--ui-primary, #059669)'
                }}
              >
                <ShieldCheck size={22} strokeWidth={2.3} />
              </div>
              <div>
                <h3 className="font-black text-slate-900 text-base sm:text-lg tracking-tight leading-tight">
                  Peraturan &amp; Tata Tertib Sekolah
                </h3>
                <p className="text-[11px] sm:text-xs text-slate-500 font-medium mt-0.5">
                  Dokumen resmi tata tertib, kriteria pelanggaran, dan prestasi siswa
                </p>
              </div>
            </div>
            
            <button 
              type="button"
              onClick={() => setShowRulesModal(false)} 
              className="cursor-pointer flex items-center justify-center w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 transition-colors border-none shrink-0"
              title="Tutup"
            >
              <X size={16} strokeWidth={2.5} />
            </button>
          </div>

          {/* Underline Tabs */}
          <div className="flex border-b border-slate-100 bg-white shrink-0 px-4 sm:px-6 gap-2 pt-1">
            <button
              type="button"
              onClick={() => setActiveRulesTab("pdf")}
              className={`px-3 sm:px-4 py-2.5 text-xs font-black transition-all duration-200 cursor-pointer border-b-2 flex items-center gap-2 ${
                activeRulesTab === 'pdf'
                  ? 'border-b-2'
                  : 'text-slate-400 border-transparent hover:text-slate-700'
              }`}
              style={activeRulesTab === 'pdf' ? {
                color: 'var(--ui-primary, #059669)',
                borderColor: 'var(--ui-primary, #059669)'
              } : {}}
            >
              <FileText size={14} strokeWidth={2.2} />
              <span>Dokumen Resmi (PDF)</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveRulesTab("data")}
              className={`px-3 sm:px-4 py-2.5 text-xs font-black transition-all duration-200 cursor-pointer border-b-2 flex items-center gap-2 ${
                activeRulesTab === 'data'
                  ? 'border-b-2'
                  : 'text-slate-400 border-transparent hover:text-slate-700'
              }`}
              style={activeRulesTab === 'data' ? {
                color: 'var(--ui-primary, #059669)',
                borderColor: 'var(--ui-primary, #059669)'
              } : {}}
            >
              <Sparkles size={14} strokeWidth={2.2} />
              <span>Kriteria Skor Poin (Data)</span>
            </button>
          </div>

          {/* Content Body */}
          <div className="flex-1 min-h-0 bg-slate-50 overflow-hidden flex flex-col">
            {activeRulesTab === "pdf" ? (
              hasPdf ? (
                <iframe
                  src="/api/kedisiplinan/rules.pdf"
                  className="w-full h-full border-none"
                  title="Peraturan Sekolah PDF"
                />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center p-6 sm:p-8 bg-slate-50/60 text-center">
                  <div 
                    className="w-16 h-16 rounded-2xl flex items-center justify-center mb-3.5 shadow-xs"
                    style={{
                      backgroundColor: 'color-mix(in srgb, var(--ui-primary, #059669) 10%, transparent)',
                      color: 'var(--ui-primary, #059669)'
                    }}
                  >
                    <ShieldCheck size={32} strokeWidth={1.8} />
                  </div>
                  <h4 className="text-base font-black text-slate-800 tracking-tight">Dokumen PDF Belum Tersedia</h4>
                  <p className="text-xs text-slate-400 max-w-sm mt-1.5 font-medium leading-relaxed mb-4">
                    Admin belum mengunggah dokumen PDF peraturan sekolah. Silakan cek tab &quot;Kriteria Skor Poin&quot; untuk melihat daftar aturan lengkap.
                  </p>
                  <button
                    type="button"
                    onClick={() => setActiveRulesTab("data")}
                    className="px-4 py-2.5 rounded-[var(--ui-radius-control,10px)] text-white text-xs font-bold uppercase tracking-wider flex items-center gap-2 cursor-pointer border-none shadow-xs transition-all hover:opacity-90 active:scale-95"
                    style={{ backgroundColor: 'var(--ui-primary, #059669)' }}
                  >
                    <span>Buka Kriteria Skor Poin</span>
                  </button>
                </div>
              )
            ) : (
              <div className="flex flex-col h-full bg-white p-4 sm:p-6 overflow-hidden">
                
                {/* Search & Filter Header */}
                <div className="flex flex-col sm:flex-row gap-3 mb-4 justify-between items-stretch sm:items-center shrink-0">
                  <div className="relative flex-1">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={15} />
                    <input
                      type="text"
                      placeholder="Cari aturan/tata tertib..."
                      value={rulesSearch}
                      onChange={e => setRulesSearch(e.target.value)}
                      className="w-full h-10 pl-10 pr-4 bg-slate-50 border border-slate-200 rounded-[var(--ui-radius-control,10px)] text-xs focus:outline-none focus:ring-2 focus:ring-[var(--ui-primary,#059669)]/10 focus:border-[var(--ui-primary,#059669)] font-semibold transition-all text-slate-800 placeholder-slate-400"
                    />
                    {rulesSearch && (
                      <button
                        type="button"
                        onClick={() => setRulesSearch('')}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer p-0.5"
                      >
                        <X size={14} />
                      </button>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar shrink-0">
                    <button
                      type="button"
                      onClick={() => setRulesFilterType('all')}
                      className={`px-3 py-1.5 rounded-full text-[11px] font-black uppercase tracking-wider cursor-pointer transition-all border ${
                        rulesFilterType === 'all'
                          ? 'bg-slate-900 text-white border-slate-900 shadow-2xs'
                          : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      Semua
                    </button>
                    <button
                      type="button"
                      onClick={() => setRulesFilterType('pelanggaran')}
                      className={`px-3 py-1.5 rounded-full text-[11px] font-black uppercase tracking-wider cursor-pointer transition-all border ${
                        rulesFilterType === 'pelanggaran'
                          ? 'bg-rose-600 text-white border-rose-600 shadow-2xs'
                          : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      Pelanggaran
                    </button>
                    <button
                      type="button"
                      onClick={() => setRulesFilterType('prestasi')}
                      className={`px-3 py-1.5 rounded-full text-[11px] font-black uppercase tracking-wider cursor-pointer transition-all border ${
                        rulesFilterType === 'prestasi'
                          ? 'text-white shadow-2xs border-transparent'
                          : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'
                      }`}
                      style={rulesFilterType === 'prestasi' ? {
                        backgroundColor: 'var(--ui-primary, #059669)',
                        borderColor: 'var(--ui-primary, #059669)'
                      } : {}}
                    >
                      Prestasi
                    </button>
                  </div>
                </div>

                {/* List Container (Cards on Mobile, Table on Desktop) */}
                <div className="flex-1 overflow-y-auto border border-slate-100 rounded-[var(--ui-radius-card,16px)] custom-scrollbar text-left">
                  {loadingRules ? (
                    <div className="p-12 text-center text-slate-400 text-xs font-semibold">Memuat kriteria poin...</div>
                  ) : filteredRules.length === 0 ? (
                    <div className="p-12 text-center text-slate-400 text-xs font-medium">Tidak ditemukan kriteria poin.</div>
                  ) : (
                    <>
                      {/* Mobile Cards List */}
                      <div className="block sm:hidden divide-y divide-slate-100">
                        {filteredRules.map((r) => {
                          const isPrestasi = r.jenis === 'prestasi';
                          return (
                            <div key={r.id} className="p-3.5 flex items-start justify-between gap-3 bg-white">
                              <div className="flex-1 min-w-0">
                                <p className="font-bold text-xs text-slate-800 leading-snug">
                                  {r.nama_tindakan}
                                </p>
                                <div className="mt-1.5">
                                  <span className={`px-2 py-0.5 rounded-full text-[9px] font-extrabold border ${
                                    isPrestasi
                                      ? 'bg-emerald-50 text-emerald-600 border-emerald-100'
                                      : 'bg-rose-50 text-rose-600 border-rose-100'
                                  }`}>
                                    {isPrestasi ? 'Prestasi' : 'Pelanggaran'}
                                  </span>
                                </div>
                              </div>
                              <span className={`px-2 py-1 rounded-[var(--ui-radius-small,8px)] font-black text-xs shrink-0 ${
                                isPrestasi
                                  ? 'bg-emerald-50 text-emerald-700'
                                  : 'bg-rose-50 text-rose-700'
                              }`}>
                                {isPrestasi ? '-' : '+'}{r.nilai_poin}
                              </span>
                            </div>
                          );
                        })}
                      </div>

                      {/* Desktop Table View */}
                      <table className="hidden sm:table w-full text-left text-xs border-collapse">
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
                                  <span className={`px-2.5 py-0.5 rounded-full text-[9.5px] font-extrabold border ${
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
                    </>
                  )}
                </div>

              </div>
            )}
          </div>

          {/* Footer (Safe area for mobile) */}
          <div className="px-5 sm:px-6 py-3 sm:py-4 border-t border-slate-100 bg-slate-50/70 flex items-center justify-end gap-3 shrink-0 pb-[max(0.75rem,env(safe-area-inset-bottom,0px))]">
            {activeRulesTab === "pdf" && hasPdf && (
              <a
                href="/api/kedisiplinan/rules.pdf"
                download="peraturan_sekolah.pdf"
                className="h-10 px-5 text-white rounded-[var(--ui-radius-control,10px)] font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 cursor-pointer text-center no-underline transition-all hover:opacity-90 shadow-xs"
                style={{ backgroundColor: 'var(--ui-primary, #059669)' }}
              >
                Unduh PDF
              </a>
            )}
            <button
              type="button"
              onClick={() => setShowRulesModal(false)}
              className="h-10 px-5 rounded-[var(--ui-radius-control,10px)] bg-white hover:bg-slate-100 text-slate-700 font-bold text-xs uppercase tracking-wider border border-slate-200 cursor-pointer transition-all active:scale-95 shadow-2xs"
            >
              Tutup
            </button>
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

  // ── SISTEM CUACA DINAMIS BEKASI (REAL-TIME OTOMATIS + PILIHAN MANUAL) ──
  const [liveWeather, setLiveWeather] = useState(() => {
    try {
      const now = new Date();
      const jktHour = parseInt(
        new Intl.DateTimeFormat('id-ID', { timeZone: 'Asia/Jakarta', hour: 'numeric', hour12: false }).format(now),
        10
      );
      if (jktHour >= 18 || jktHour < 6) return 'night';
      if (jktHour >= 11 && jktHour <= 14) return 'hot';
      return 'cloudy';
    } catch {
      return 'cloudy';
    }
  });
  const [manualWeather, setManualWeather] = useState(null); // null = Mode Otomatis (Cuaca Asli Bekasi)
  const [weatherTemp, setWeatherTemp] = useState(null);

  // Kondisi cuaca aktif (manual jika dipilih, atau live otomatis)
  const weatherCondition = manualWeather || liveWeather;

  useEffect(() => {
    let isMounted = true;
    // Koordinat Bekasi: Lat -6.2383, Lon 106.9756
    fetch('https://api.open-meteo.com/v1/forecast?latitude=-6.2383&longitude=106.9756&current=temperature_2m,is_day,precipitation,rain,weather_code&timezone=Asia%2FJakarta')
      .then(res => res.json())
      .then(data => {
        if (!isMounted || !data?.current) return;
        const { is_day, rain, precipitation, weather_code, temperature_2m } = data.current;
        if (temperature_2m !== undefined) setWeatherTemp(Math.round(temperature_2m));
        
        let detected = 'cloudy';
        if (rain > 0.1 || precipitation > 0.1 || [51,53,55,61,63,65,80,81,82,95,96,99].includes(weather_code)) {
          detected = 'rain';
        } else if (is_day === 0) {
          detected = 'night';
        } else if (temperature_2m >= 31 || [0, 1].includes(weather_code)) {
          detected = 'hot';
        }
        setLiveWeather(detected);
      })
      .catch(() => {
        // Fallback otomatis berdasarkan jam Jakarta
      });
    return () => { isMounted = false; };
  }, []);

  const handleCycleWeather = () => {
    // Siklus: Otomatis (null) -> Malam -> Hujan -> Panas Terik -> Cerah Berawan -> Kembali Otomatis
    const options = [null, 'night', 'rain', 'hot', 'cloudy'];
    const currentIdx = options.indexOf(manualWeather);
    const nextIdx = (currentIdx + 1) % options.length;
    setManualWeather(options[nextIdx]);
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

      {/* GLOBAL DECORATIVE BACKGROUND (DESKTOP) */}
      <div className="hidden md:block absolute top-0 left-0 w-full h-[54vh] pointer-events-none z-0 overflow-hidden select-none">
        {/* Background Image Sekolah */}
        <img
          src={appSettings?.heroImage || '/hero_illustration.jpg'}
          fetchpriority="high"
          loading="eager"
          className="w-full h-full pointer-events-none opacity-100 transition-all duration-700 object-cover object-center"
          alt="Hero Background"
          onError={(e) => {
            if (e.currentTarget.src !== window.location.origin + '/hero_illustration.jpg') {
              e.currentTarget.src = '/hero_illustration.jpg';
            }
          }}
        />

        {/* Scrim Gradasi Lembut Dinamis sesuai Cuaca Bekasi */}
        <div 
          className="absolute inset-0 pointer-events-none transition-all duration-700"
          style={{
            background: weatherCondition === 'night' 
              ? 'linear-gradient(180deg, rgba(8, 15, 33, 0.88) 0%, rgba(15, 23, 42, 0.72) 40%, rgba(255, 255, 255, 0.85) 88%, rgba(255, 255, 255, 1) 100%)'
              : weatherCondition === 'rain'
              ? 'linear-gradient(180deg, rgba(15, 23, 42, 0.80) 0%, rgba(30, 41, 59, 0.65) 40%, rgba(255, 255, 255, 0.85) 88%, rgba(255, 255, 255, 1) 100%)'
              : weatherCondition === 'hot'
              ? 'linear-gradient(180deg, rgba(234, 88, 12, 0.32) 0%, rgba(245, 158, 11, 0.12) 40%, rgba(255, 255, 255, 0.85) 88%, rgba(255, 255, 255, 1) 100%)'
              : 'linear-gradient(180deg, rgba(0, 0, 0, 0.38) 0%, rgba(0, 0, 0, 0.08) 40%, rgba(255, 255, 255, 0.85) 88%, rgba(255, 255, 255, 1) 100%)'
          }}
        />

        {/* Efek Spesifik Cuaca Desktop */}
        {weatherCondition === 'night' && (
          <div className="absolute inset-0 z-5 pointer-events-none overflow-hidden select-none">
            <div className="absolute top-6 right-24 w-36 h-36 rounded-full bg-radial from-sky-100/35 via-sky-200/10 to-transparent blur-2xl" />
            {[
              { t: '15%', l: '10%', s: 2, d: '0s' },
              { t: '25%', l: '24%', s: 2.5, d: '1.4s' },
              { t: '12%', l: '40%', s: 1.8, d: '0.8s' },
              { t: '20%', l: '55%', s: 3, d: '2.2s' },
              { t: '30%', l: '70%', s: 2, d: '1.1s' },
              { t: '14%', l: '85%', s: 2.4, d: '0.5s' },
              { t: '28%', l: '92%', s: 1.6, d: '2.6s' },
              { t: '8%', l: '72%', s: 2.2, d: '1.9s' }
            ].map((star, i) => (
              <div
                key={i}
                className="absolute rounded-full bg-white animate-star-twinkle"
                style={{
                  top: star.t,
                  left: star.l,
                  width: star.s,
                  height: star.s,
                  animationDelay: star.d,
                  boxShadow: '0 0 8px rgba(255, 255, 255, 0.9)'
                }}
              />
            ))}
          </div>
        )}

        {weatherCondition === 'rain' && (
          <div className="absolute inset-0 z-5 pointer-events-none overflow-hidden select-none">
            {[...Array(24)].map((_, i) => (
              <div
                key={i}
                className="absolute w-[1.5px] h-10 bg-gradient-to-b from-transparent via-sky-200/40 to-white/60 rotate-[12deg] animate-rain-fall"
                style={{
                  left: `${(i * 4.2) + (i % 3)}%`,
                  top: '-40px',
                  animationDuration: `${0.45 + ((i % 5) * 0.05)}s`,
                  animationDelay: `-${(i % 6) * 0.12}s`
                }}
              />
            ))}
          </div>
        )}

        {weatherCondition === 'hot' && (
          <div className="absolute inset-0 z-5 pointer-events-none overflow-hidden select-none">
            <div className="absolute -top-16 -left-16 w-64 h-64 rounded-full bg-radial from-amber-300/35 via-yellow-200/15 to-transparent blur-3xl animate-pulse" style={{ animationDuration: '5s' }} />
            <div className="absolute -top-20 -left-20 w-[600px] h-[600px] origin-top-left animate-sunbeam opacity-25">
              <div className="w-full h-full bg-[conic-gradient(from_0deg_at_0%_0%,transparent_0deg,rgba(251,191,36,0.3)_15deg,transparent_30deg,rgba(251,191,36,0.2)_45deg,transparent_60deg,rgba(251,191,36,0.25)_75deg,transparent_90deg)] blur-xl" />
            </div>
          </div>
        )}

        {/* ── LAPISAN ANIMASI AWAN BERGERAK DESKTOP (SANGAT TIPIS, HALUS & WISPY) ── */}
        <div className="absolute inset-0 z-10 pointer-events-none overflow-hidden select-none opacity-25">
          {/* Ambient High-Altitude Haze */}
          <div className="absolute inset-0 animate-aerial-haze">
            <div className="absolute -top-1/4 -left-1/4 w-[150%] h-[150%] bg-gradient-to-br from-white/10 via-white/5 to-transparent blur-3xl" />
          </div>

          {/* Gugusan Awan Desktop 1 (Lebar, Sangat Tipis & Halus) */}
          <div className="absolute top-4 -left-24 w-[620px] h-[220px] animate-aerial-cloud-1">
            {/* Bayangan Tipis Jatuh ke Gedung */}
            <div className="absolute top-16 left-16 w-[85%] h-[75%] bg-black/6 rounded-full blur-3xl transform scale-y-70" />
            {/* Badan Awan Sangat Tipis */}
            <div className="relative w-full h-full">
              <div className="absolute inset-0 bg-white/20 rounded-full blur-2xl" />
              <div className="absolute top-3 left-10 w-3/5 h-4/5 bg-white/28 rounded-full blur-xl" />
              <div className="absolute top-6 right-12 w-1/2 h-3/4 bg-white/24 rounded-full blur-xl" />
              <div className="absolute -top-2 left-1/3 w-1/3 h-1/2 bg-white/32 rounded-full blur-lg" />
            </div>
          </div>

          {/* Gugusan Awan Desktop 2 */}
          <div className="absolute top-1/3 -left-32 w-[540px] h-[190px] animate-aerial-cloud-2">
            <div className="absolute top-14 left-12 w-[80%] h-[70%] bg-black/5 rounded-full blur-2xl transform scale-y-70" />
            <div className="relative w-full h-full">
              <div className="absolute inset-0 bg-white/16 rounded-full blur-xl" />
              <div className="absolute top-3 left-12 w-1/2 h-4/5 bg-white/24 rounded-full blur-lg" />
              <div className="absolute top-4 right-8 w-2/5 h-3/5 bg-white/20 rounded-full blur-lg" />
            </div>
          </div>

          {/* Gugusan Awan Desktop 3 */}
          <div className="absolute -top-12 -left-28 w-[720px] h-[260px] animate-aerial-cloud-3">
            <div className="absolute top-20 left-16 w-[90%] h-[80%] bg-black/5 rounded-full blur-3xl transform scale-y-70" />
            <div className="relative w-full h-full">
              <div className="absolute inset-0 bg-white/14 rounded-full blur-3xl" />
              <div className="absolute top-6 left-16 w-2/3 h-3/4 bg-white/20 rounded-full blur-2xl" />
              <div className="absolute top-3 right-16 w-1/2 h-2/3 bg-white/16 rounded-full blur-2xl" />
            </div>
          </div>
        </div>

        {/* ── LIVING SKY LAYER (DESKTOP): Kawanan Burung, Kawanan Kelelawar, 1 Pesawat & 1 Roket Bergantian ── */}
        <div className="absolute inset-0 z-12 pointer-events-none overflow-hidden select-none">
          {/* 1. KAWANAN BURUNG (Pagi/Siang/Panas/Cerah/Hujan - 2 Kawanan Bergantian Waktu & Ukuran Jelas) */}
          {weatherCondition !== 'night' && (
            <div className="absolute inset-0 pointer-events-none">
              {/* Kawanan 1: Formasi V 5 Burung dari Kiri ke Kanan */}
              <div className="absolute top-10 left-0 animate-flock-east">
                <div className="relative">
                  {/* Pemimpin */}
                  <div className="absolute top-0 left-0">
                    <svg viewBox="0 0 32 18" className="w-8 h-4.5 sm:w-9 sm:h-5 fill-slate-800 drop-shadow-md animate-bird-wing">
                      <path d="M 0,9 Q 8,0 16,9 Q 24,0 32,9 Q 24,6 16,11 Q 8,6 0,9 Z" />
                    </svg>
                  </div>
                  {/* Sayap Atas */}
                  <div className="absolute -top-5 -left-7">
                    <svg viewBox="0 0 32 18" className="w-6.5 h-3.5 sm:w-7.5 sm:h-4 fill-slate-700 drop-shadow-md animate-bird-wing" style={{ animationDuration: '0.31s' }}>
                      <path d="M 0,9 Q 8,0 16,9 Q 24,0 32,9 Q 24,6 16,11 Q 8,6 0,9 Z" />
                    </svg>
                  </div>
                  <div className="absolute -top-10 -left-14">
                    <svg viewBox="0 0 32 18" className="w-5.5 h-3 sm:w-6.5 sm:h-3.5 fill-slate-700/85 drop-shadow-md animate-bird-wing" style={{ animationDuration: '0.34s' }}>
                      <path d="M 0,9 Q 8,0 16,9 Q 24,0 32,9 Q 24,6 16,11 Q 8,6 0,9 Z" />
                    </svg>
                  </div>
                  {/* Sayap Bawah */}
                  <div className="absolute top-5 -left-7">
                    <svg viewBox="0 0 32 18" className="w-6.5 h-3.5 sm:w-7.5 sm:h-4 fill-slate-700 drop-shadow-md animate-bird-wing" style={{ animationDuration: '0.29s' }}>
                      <path d="M 0,9 Q 8,0 16,9 Q 24,0 32,9 Q 24,6 16,11 Q 8,6 0,9 Z" />
                    </svg>
                  </div>
                  <div className="absolute top-10 -left-14">
                    <svg viewBox="0 0 32 18" className="w-5.5 h-3 sm:w-6.5 sm:h-3.5 fill-slate-700/85 drop-shadow-md animate-bird-wing" style={{ animationDuration: '0.33s' }}>
                      <path d="M 0,9 Q 8,0 16,9 Q 24,0 32,9 Q 24,6 16,11 Q 8,6 0,9 Z" />
                    </svg>
                  </div>
                </div>
              </div>

              {/* Kawanan 2: 4 Burung Melintas Arah Berlawanan dari Kanan ke Kiri (Bergantian) */}
              <div className="absolute top-20 right-0 animate-flock-west">
                <div className="relative">
                  <div className="absolute top-0 left-0">
                    <svg viewBox="0 0 32 18" className="w-7.5 h-4 sm:w-8.5 sm:h-4.5 fill-slate-800 drop-shadow-md animate-bird-wing" style={{ animationDuration: '0.3s' }}>
                      <path d="M 0,9 Q 8,0 16,9 Q 24,0 32,9 Q 24,6 16,11 Q 8,6 0,9 Z" />
                    </svg>
                  </div>
                  <div className="absolute -top-5 left-7">
                    <svg viewBox="0 0 32 18" className="w-6 h-3.5 sm:w-7 sm:h-4 fill-slate-700 drop-shadow-md animate-bird-wing" style={{ animationDuration: '0.33s' }}>
                      <path d="M 0,9 Q 8,0 16,9 Q 24,0 32,9 Q 24,6 16,11 Q 8,6 0,9 Z" />
                    </svg>
                  </div>
                  <div className="absolute top-5 left-7">
                    <svg viewBox="0 0 32 18" className="w-6 h-3.5 sm:w-7 sm:h-4 fill-slate-700 drop-shadow-md animate-bird-wing" style={{ animationDuration: '0.28s' }}>
                      <path d="M 0,9 Q 8,0 16,9 Q 24,0 32,9 Q 24,6 16,11 Q 8,6 0,9 Z" />
                    </svg>
                  </div>
                  <div className="absolute top-2 left-14">
                    <svg viewBox="0 0 32 18" className="w-5 h-2.5 sm:w-6 sm:h-3 fill-slate-600 drop-shadow-md animate-bird-wing" style={{ animationDuration: '0.31s' }}>
                      <path d="M 0,9 Q 8,0 16,9 Q 24,0 32,9 Q 24,6 16,11 Q 8,6 0,9 Z" />
                    </svg>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 2. KAWANAN KELELAWAR (Malam Hari - 2 Kawanan Bergantian Waktu & Ukuran Jelas) */}
          {weatherCondition === 'night' && (
            <div className="absolute inset-0 pointer-events-none">
              {/* Swarm 1: 4 Kelelawar dari Kanan ke Kiri */}
              <div className="absolute top-10 right-0 animate-swarm-west">
                <div className="relative">
                  <div className="absolute top-0 left-0">
                    <svg viewBox="0 0 34 20" className="w-8 h-5 sm:w-9 sm:h-5.5 fill-slate-950 drop-shadow-md animate-bat-wing">
                      <path d="M 17,6 Q 14,0 12,4 Q 8,2 2,9 Q 7,12 11,10 Q 14,14 17,11 Q 20,14 23,10 Q 27,12 32,9 Q 26,2 22,4 Q 20,0 17,6 Z" />
                    </svg>
                  </div>
                  <div className="absolute -top-5 left-8">
                    <svg viewBox="0 0 34 20" className="w-6.5 h-4 sm:w-7.5 sm:h-4.5 fill-slate-900 drop-shadow-md animate-bat-wing" style={{ animationDuration: '0.24s' }}>
                      <path d="M 17,6 Q 14,0 12,4 Q 8,2 2,9 Q 7,12 11,10 Q 14,14 17,11 Q 20,14 23,10 Q 27,12 32,9 Q 26,2 22,4 Q 20,0 17,6 Z" />
                    </svg>
                  </div>
                  <div className="absolute top-6 left-7">
                    <svg viewBox="0 0 34 20" className="w-6.5 h-4 sm:w-7.5 sm:h-4.5 fill-slate-900 drop-shadow-md animate-bat-wing" style={{ animationDuration: '0.26s' }}>
                      <path d="M 17,6 Q 14,0 12,4 Q 8,2 2,9 Q 7,12 11,10 Q 14,14 17,11 Q 20,14 23,10 Q 27,12 32,9 Q 26,2 22,4 Q 20,0 17,6 Z" />
                    </svg>
                  </div>
                  <div className="absolute top-3 left-15">
                    <svg viewBox="0 0 34 20" className="w-5.5 h-3.5 sm:w-6.5 sm:h-4 fill-slate-900 drop-shadow-md animate-bat-wing" style={{ animationDuration: '0.29s' }}>
                      <path d="M 17,6 Q 14,0 12,4 Q 8,2 2,9 Q 7,12 11,10 Q 14,14 17,11 Q 20,14 23,10 Q 27,12 32,9 Q 26,2 22,4 Q 20,0 17,6 Z" />
                    </svg>
                  </div>
                </div>
              </div>

              {/* Swarm 2: 4 Kelelawar dari Kiri ke Kanan (Bergantian) */}
              <div className="absolute top-22 left-0 animate-swarm-east">
                <div className="relative">
                  <div className="absolute top-0 left-0">
                    <svg viewBox="0 0 34 20" className="w-7.5 h-4.5 sm:w-8.5 sm:h-5 fill-slate-950 drop-shadow-md animate-bat-wing" style={{ animationDuration: '0.23s' }}>
                      <path d="M 17,6 Q 14,0 12,4 Q 8,2 2,9 Q 7,12 11,10 Q 14,14 17,11 Q 20,14 23,10 Q 27,12 32,9 Q 26,2 22,4 Q 20,0 17,6 Z" />
                    </svg>
                  </div>
                  <div className="absolute -top-5 -left-7">
                    <svg viewBox="0 0 34 20" className="w-6.5 h-4 sm:w-7 sm:h-4 fill-slate-900 drop-shadow-md animate-bat-wing" style={{ animationDuration: '0.27s' }}>
                      <path d="M 17,6 Q 14,0 12,4 Q 8,2 2,9 Q 7,12 11,10 Q 14,14 17,11 Q 20,14 23,10 Q 27,12 32,9 Q 26,2 22,4 Q 20,0 17,6 Z" />
                    </svg>
                  </div>
                  <div className="absolute top-5 -left-7">
                    <svg viewBox="0 0 34 20" className="w-6.5 h-4 sm:w-7 sm:h-4 fill-slate-900 drop-shadow-md animate-bat-wing" style={{ animationDuration: '0.25s' }}>
                      <path d="M 17,6 Q 14,0 12,4 Q 8,2 2,9 Q 7,12 11,10 Q 14,14 17,11 Q 20,14 23,10 Q 27,12 32,9 Q 26,2 22,4 Q 20,0 17,6 Z" />
                    </svg>
                  </div>
                  <div className="absolute top-2 -left-14">
                    <svg viewBox="0 0 34 20" className="w-5.5 h-3.5 sm:w-6 sm:h-3.5 fill-slate-900 drop-shadow-md animate-bat-wing" style={{ animationDuration: '0.28s' }}>
                      <path d="M 17,6 Q 14,0 12,4 Q 8,2 2,9 Q 7,12 11,10 Q 14,14 17,11 Q 20,14 23,10 Q 27,12 32,9 Q 26,2 22,4 Q 20,0 17,6 Z" />
                    </svg>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 3. PESAWAT TERBANG (HANYA 1 PESAWAT - Melintas Bergantian dengan Roket) */}
          <div className="absolute top-6 left-0 animate-single-plane flex items-center">
            <div className="w-28 sm:w-36 h-[1.5px] bg-gradient-to-r from-transparent via-white/40 to-white/70 blur-[0.5px] -mr-1" />
            <div className="relative">
              <svg viewBox="0 0 44 24" className="w-7 sm:w-8 h-4.5 fill-white drop-shadow-md">
                <path d="M 2,12 L 20,9 L 26,2 L 30,2 L 28,9 L 40,11 L 44,12 L 40,13 L 28,15 L 30,22 L 26,22 L 20,15 L 2,12 Z" />
              </svg>
              <div className="absolute top-0 right-3 w-1.5 h-1.5 rounded-full bg-red-500 animate-ping" />
            </div>
          </div>

          {/* 4. ROKET LUAR ANGKASA (HANYA 1 ROKET - Meluncur Bergantian Setelah Pesawat) */}
          <div className="absolute bottom-5 left-0 animate-single-rocket flex flex-col items-center">
            <svg viewBox="0 0 24 44" className="w-4 h-7 drop-shadow-lg">
              <path d="M 12,0 Q 18,10 18,28 L 24,38 L 18,34 L 14,40 L 10,40 L 6,34 L 0,38 L 6,28 Q 6,10 12,0 Z" fill="#ffffff" />
              <path d="M 12,3 Q 15,12 15,26 L 9,26 Q 9,12 12,3 Z" fill="#ef4444" />
              <circle cx="12" cy="16" r="2.5" fill="#38bdf8" />
            </svg>
            <div className="w-2.5 h-10 -mt-1 bg-gradient-to-b from-amber-300 via-orange-500 to-transparent rounded-full blur-[1px] animate-pulse" />
            <div className="w-3 h-16 -mt-2 bg-gradient-to-b from-white/70 via-white/20 to-transparent blur-xs" />
          </div>
        </div>
      </div>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Pretendard:wght@300;400;500;600;700;800&display=swap');
        
        @keyframes aerialCloudDrift1 {
          0% {
            transform: translate3d(-100%, -20%, 0) scale(0.92);
            opacity: 0;
          }
          15% {
            opacity: 0.38;
          }
          85% {
            opacity: 0.38;
          }
          100% {
            transform: translate3d(145%, 35%, 0) scale(1.08);
            opacity: 0;
          }
        }

        @keyframes aerialCloudDrift2 {
          0% {
            transform: translate3d(-130%, 15%, 0) scale(0.78);
            opacity: 0;
          }
          20% {
            opacity: 0.32;
          }
          80% {
            opacity: 0.32;
          }
          100% {
            transform: translate3d(135%, -15%, 0) scale(0.88);
            opacity: 0;
          }
        }

        @keyframes aerialCloudDrift3 {
          0% {
            transform: translate3d(-115%, -10%, 0) scale(1.18);
            opacity: 0;
          }
          12% {
            opacity: 0.28;
          }
          88% {
            opacity: 0.28;
          }
          100% {
            transform: translate3d(155%, 25%, 0) scale(1.28);
            opacity: 0;
          }
        }

        @keyframes aerialHazeSlow {
          0%, 100% {
            transform: translate3d(0, 0, 0) scale(1);
            opacity: 0.08;
          }
          50% {
            transform: translate3d(4%, 3%, 0) scale(1.05);
            opacity: 0.16;
          }
        }

        .animate-aerial-cloud-1 {
          animation: aerialCloudDrift1 15s linear infinite;
          will-change: transform, opacity;
        }

        .animate-aerial-cloud-2 {
          animation: aerialCloudDrift2 20s linear infinite;
          animation-delay: -8s;
          will-change: transform, opacity;
        }

        .animate-aerial-cloud-3 {
          animation: aerialCloudDrift3 26s linear infinite;
          animation-delay: -14s;
          will-change: transform, opacity;
        }

        .animate-aerial-haze {
          animation: aerialHazeSlow 12s ease-in-out infinite;
          will-change: transform, opacity;
        }

        @keyframes starTwinkle {
          0%, 100% {
            opacity: 0.15;
            transform: scale(0.8);
          }
          50% {
            opacity: 0.95;
            transform: scale(1.3);
          }
        }

        @keyframes rainDropFall {
          0% {
            transform: translate3d(0, -60px, 0);
            opacity: 0;
          }
          15% {
            opacity: 0.65;
          }
          85% {
            opacity: 0.65;
          }
          100% {
            transform: translate3d(-35px, 380px, 0);
            opacity: 0;
          }
        }

        @keyframes sunbeamSweep {
          0%, 100% {
            transform: rotate(0deg) scale(1);
            opacity: 0.18;
          }
          50% {
            transform: rotate(6deg) scale(1.06);
            opacity: 0.35;
          }
        }

        .animate-star-twinkle {
          animation: starTwinkle 2.0s ease-in-out infinite;
        }

        .animate-rain-fall {
          animation: rainDropFall 0.52s linear infinite;
          will-change: transform, opacity;
        }

        .animate-sunbeam {
          animation: sunbeamSweep 7s ease-in-out infinite;
          will-change: transform, opacity;
        }

        /* ── BURUNG BERKELOMPOK (BERGANTIAN, UKURAN LEBIH BESAR & JELAS) ── */
        @keyframes birdFlap {
          0%, 100% { transform: scaleY(1); }
          50% { transform: scaleY(0.2); }
        }

        @keyframes flockFlyEast {
          0% {
            transform: translate3d(-170px, 28px, 0) scale(1);
            opacity: 0;
          }
          6% { opacity: 0.92; }
          36% { opacity: 0.92; }
          42% {
            transform: translate3d(650px, 8px, 0) scale(1.05);
            opacity: 0;
          }
          42.1%, 100% {
            transform: translate3d(700px, 8px, 0);
            opacity: 0;
          }
        }

        @keyframes flockFlyWest {
          0%, 48% {
            transform: translate3d(660px, 50px, 0) scaleX(-1);
            opacity: 0;
          }
          52% {
            transform: translate3d(640px, 50px, 0) scaleX(-1);
            opacity: 0.88;
          }
          84% { opacity: 0.88; }
          90% {
            transform: translate3d(-170px, 25px, 0) scaleX(-1);
            opacity: 0;
          }
          90.1%, 100% {
            transform: translate3d(-200px, 25px, 0) scaleX(-1);
            opacity: 0;
          }
        }

        /* ── KELELAWAR BERKELOMPOK (BERGANTIAN, UKURAN LEBIH BESAR & JELAS) ── */
        @keyframes batFlap {
          0%, 100% { transform: scaleY(1) rotate(0deg); }
          50% { transform: scaleY(-0.55) rotate(4deg); }
        }

        @keyframes swarmFlyWest {
          0% {
            transform: translate3d(650px, 22px, 0);
            opacity: 0;
          }
          6% { opacity: 0.95; }
          22% { transform: translate3d(420px, 12px, 0); }
          36% { opacity: 0.95; }
          42% {
            transform: translate3d(-160px, 32px, 0);
            opacity: 0;
          }
          42.1%, 100% {
            transform: translate3d(-200px, 32px, 0);
            opacity: 0;
          }
        }

        @keyframes swarmFlyEast {
          0%, 48% {
            transform: translate3d(-160px, 58px, 0) scaleX(-1);
            opacity: 0;
          }
          52% {
            transform: translate3d(-140px, 58px, 0) scaleX(-1);
            opacity: 0.92;
          }
          70% { transform: translate3d(240px, 42px, 0) scaleX(-1); }
          84% { opacity: 0.92; }
          90% {
            transform: translate3d(650px, 65px, 0) scaleX(-1);
            opacity: 0;
          }
          90.1%, 100% {
            transform: translate3d(700px, 65px, 0) scaleX(-1);
            opacity: 0;
          }
        }

        /* ── PESAWAT (HANYA 1 SAJA, BERGANTIAN DENGAN ROKET) ── */
        @keyframes singlePlaneFly {
          0% {
            transform: translate3d(-150px, 22px, 0) rotate(-3deg);
            opacity: 0;
          }
          5% { opacity: 0.95; }
          36% { opacity: 0.95; }
          42% {
            transform: translate3d(670px, 10px, 0) rotate(-3deg);
            opacity: 0;
          }
          42.1%, 100% {
            transform: translate3d(720px, 10px, 0);
            opacity: 0;
          }
        }

        /* ── ROKET (HANYA 1 SAJA, MELUNCUR SETELAH PESAWAT SELESAI) ── */
        @keyframes singleRocketLaunch {
          0%, 48% {
            transform: translate3d(-100px, 280px, 0) rotate(48deg) scale(0.8);
            opacity: 0;
          }
          52% {
            transform: translate3d(-80px, 260px, 0) rotate(48deg) scale(0.85);
            opacity: 0.95;
          }
          82% { opacity: 0.95; }
          88% {
            transform: translate3d(640px, -150px, 0) rotate(48deg) scale(1.25);
            opacity: 0;
          }
          88.1%, 100% {
            transform: translate3d(700px, -200px, 0) rotate(48deg);
            opacity: 0;
          }
        }

        .animate-flock-east {
          animation: flockFlyEast 28s linear infinite;
          will-change: transform, opacity;
        }

        .animate-flock-west {
          animation: flockFlyWest 28s linear infinite;
          will-change: transform, opacity;
        }

        .animate-swarm-west {
          animation: swarmFlyWest 28s ease-in-out infinite;
          will-change: transform, opacity;
        }

        .animate-swarm-east {
          animation: swarmFlyEast 28s ease-in-out infinite;
          will-change: transform, opacity;
        }

        .animate-single-plane {
          animation: singlePlaneFly 34s linear infinite;
          will-change: transform, opacity;
        }

        .animate-single-rocket {
          animation: singleRocketLaunch 34s linear infinite;
          will-change: transform, opacity;
        }

        @media (max-width: 767px) {
          html, body {
            overflow: hidden !important;
            height: 100dvh !important;
            overscroll-behavior: none !important;
          }
        }
      `}</style>

      {/* DESKTOP FULL-WIDTH HEADER */}
      <div className="hidden md:block">
        <HeaderNavbar setIsLoginModalOpen={setIsLoginModalOpen} appSettings={appSettings} onPanduanClick={() => setShowPublicGuide(true)} />
      </div>

      {/* MOBILE APP LANDING VIEW (Fitted Exactly to 1 Screen - 100dvh, Non-Scrollable) */}
      <div className="md:hidden flex flex-col h-[100dvh] max-h-[100dvh] w-full bg-white overflow-hidden select-none relative font-sans">
        
        {/* 1. AREA HEADER (ATAS - BACKGROUND GAMBAR SEKOLAH DARI KUSTOMISASI ADMIN WEB) */}
        <div 
          className="relative w-full h-[29vh] min-h-[170px] max-h-[220px] flex flex-col justify-center items-center overflow-hidden text-white shrink-0 bg-slate-900"
        >
          {/* Background Image dari Kustomisasi Web Admin Desktop (Terlihat Jelas seperti di Desktop) */}
          <img 
            src={appSettings?.heroImage || '/hero_illustration.jpg'} 
            alt="School Hero Background" 
            fetchpriority="high"
            loading="eager"
            className="absolute inset-0 w-full h-full object-cover object-[center_30%] z-0 pointer-events-none transition-transform duration-700" 
            onError={(e) => {
              if (e.currentTarget.src !== window.location.origin + '/hero_illustration.jpg') {
                e.currentTarget.src = '/hero_illustration.jpg';
              }
            }}
          />

          {/* Scrim Overlay Lembut Dinamis sesuai Cuaca */}
          <div 
            className="absolute inset-0 z-0 pointer-events-none transition-all duration-700"
            style={{
              background: weatherCondition === 'night' 
                ? 'linear-gradient(180deg, rgba(7, 14, 30, 0.90) 0%, rgba(15, 23, 42, 0.74) 35%, rgba(13, 37, 30, 0.65) 70%, rgba(4, 25, 14, 0.88) 100%)'
                : weatherCondition === 'rain'
                ? 'linear-gradient(180deg, rgba(15, 23, 42, 0.82) 0%, rgba(30, 41, 59, 0.68) 35%, rgba(20, 60, 45, 0.60) 70%, rgba(6, 40, 20, 0.84) 100%)'
                : weatherCondition === 'hot'
                ? 'linear-gradient(180deg, rgba(234, 88, 12, 0.32) 0%, rgba(245, 158, 11, 0.16) 35%, rgba(61, 170, 55, 0.28) 70%, rgba(6, 50, 20, 0.78) 100%)'
                : 'linear-gradient(180deg, rgba(0, 0, 0, 0.52) 0%, rgba(0, 0, 0, 0.20) 35%, rgba(61, 170, 55, 0.30) 70%, rgba(6, 50, 20, 0.78) 100%)'
            }}
          />

          {/* Efek Spesifik Cuaca (Mobile) */}
          {weatherCondition === 'night' && (
            <div className="absolute inset-0 z-5 pointer-events-none overflow-hidden select-none">
              <div className="absolute top-4 right-10 w-28 h-28 rounded-full bg-radial from-sky-100/30 via-sky-200/10 to-transparent blur-xl" />
              {[
                { t: '12%', l: '15%', s: 2, d: '0s' },
                { t: '22%', l: '35%', s: 2.5, d: '1.2s' },
                { t: '18%', l: '75%', s: 1.8, d: '0.6s' },
                { t: '8%', l: '60%', s: 3, d: '2.1s' },
                { t: '32%', l: '20%', s: 2, d: '1.8s' },
                { t: '15%', l: '88%', s: 2.2, d: '0.4s' },
                { t: '28%', l: '80%', s: 1.6, d: '2.4s' },
                { t: '10%', l: '28%', s: 2.8, d: '1.5s' },
                { t: '25%', l: '50%', s: 1.5, d: '0.9s' }
              ].map((star, i) => (
                <div
                  key={i}
                  className="absolute rounded-full bg-white animate-star-twinkle"
                  style={{
                    top: star.t,
                    left: star.l,
                    width: star.s,
                    height: star.s,
                    animationDelay: star.d,
                    boxShadow: '0 0 6px rgba(255, 255, 255, 0.8)'
                  }}
                />
              ))}
            </div>
          )}

          {weatherCondition === 'rain' && (
            <div className="absolute inset-0 z-5 pointer-events-none overflow-hidden select-none">
              {[...Array(20)].map((_, i) => (
                <div
                  key={i}
                  className="absolute w-[1.5px] h-9 bg-gradient-to-b from-transparent via-sky-200/50 to-white/70 rotate-[12deg] animate-rain-fall"
                  style={{
                    left: `${(i * 5) + (i % 3)}%`,
                    top: '-40px',
                    animationDuration: `${0.42 + ((i % 5) * 0.05)}s`,
                    animationDelay: `-${(i % 7) * 0.10}s`
                  }}
                />
              ))}
              <div className="absolute bottom-0 inset-x-0 h-14 bg-gradient-to-t from-white/20 via-sky-100/10 to-transparent blur-md" />
            </div>
          )}

          {weatherCondition === 'hot' && (
            <div className="absolute inset-0 z-5 pointer-events-none overflow-hidden select-none">
              <div className="absolute -top-12 -left-12 w-48 h-48 rounded-full bg-radial from-amber-300/45 via-yellow-200/20 to-transparent blur-2xl animate-pulse" style={{ animationDuration: '4s' }} />
              <div className="absolute -top-20 -left-20 w-[500px] h-[500px] origin-top-left animate-sunbeam opacity-30">
                <div className="w-full h-full bg-[conic-gradient(from_0deg_at_0%_0%,transparent_0deg,rgba(251,191,36,0.35)_15deg,transparent_30deg,rgba(251,191,36,0.25)_45deg,transparent_60deg,rgba(251,191,36,0.3)_75deg,transparent_90deg)] blur-lg" />
              </div>
            </div>
          )}

          {/* ── LAPISAN ANIMASI AWAN BERGERAK (POV DARI ATAS / SANGAT TIPIS & HALUS) ── */}
          <div className="absolute inset-0 z-10 pointer-events-none overflow-hidden select-none opacity-50">
            {/* Ambient High-Altitude Haze / Kabut Tipis Atmosferik */}
            <div className="absolute inset-0 animate-aerial-haze">
              <div className="absolute -top-1/4 -left-1/4 w-[150%] h-[150%] bg-gradient-to-br from-white/12 via-white/5 to-transparent blur-3xl" />
            </div>

            {/* Gugusan Awan 1: Awan Tipis & Bayangan Halus */}
            <div className="absolute -top-4 -left-10 w-[360px] sm:w-[440px] h-[170px] animate-aerial-cloud-1">
              {/* Bayangan Awan Sangat Halus di Atas Gedung */}
              <div className="absolute top-14 left-10 w-[85%] h-[75%] bg-black/10 rounded-full blur-3xl transform scale-y-70" />
              {/* Badan Awan Putih Tipis Transparan */}
              <div className="relative w-full h-full">
                <div className="absolute inset-0 bg-white/30 rounded-full blur-xl" />
                <div className="absolute top-2 left-6 w-3/5 h-4/5 bg-white/45 rounded-full blur-lg" />
                <div className="absolute top-4 right-8 w-1/2 h-3/4 bg-white/40 rounded-full blur-lg" />
                <div className="absolute -top-3 left-1/4 w-2/5 h-3/5 bg-white/55 rounded-full blur-md" />
                <div className="absolute bottom-1 left-1/3 w-1/2 h-2/3 bg-white/30 rounded-full blur-xl" />
              </div>
            </div>

            {/* Gugusan Awan 2: Awan Menengah Lebih Tipis */}
            <div className="absolute top-1/4 -left-16 w-[300px] sm:w-[380px] h-[140px] animate-aerial-cloud-2">
              <div className="absolute top-12 left-8 w-[80%] h-[70%] bg-black/8 rounded-full blur-2xl transform scale-y-70" />
              <div className="relative w-full h-full">
                <div className="absolute inset-0 bg-white/25 rounded-full blur-lg" />
                <div className="absolute top-2 left-8 w-1/2 h-4/5 bg-white/35 rounded-full blur-md" />
                <div className="absolute top-3 right-5 w-2/5 h-3/5 bg-white/30 rounded-full blur-md" />
                <div className="absolute -top-2 left-1/3 w-1/3 h-1/2 bg-white/45 rounded-full blur-md" />
              </div>
            </div>

            {/* Gugusan Awan 3: Gumpalan Awan Halus Latar Depan */}
            <div className="absolute -top-8 -left-20 w-[440px] sm:w-[560px] h-[210px] animate-aerial-cloud-3">
              <div className="absolute top-16 left-12 w-[90%] h-[80%] bg-black/6 rounded-full blur-3xl transform scale-y-70" />
              <div className="relative w-full h-full">
                <div className="absolute inset-0 bg-white/20 rounded-full blur-2xl" />
                <div className="absolute top-4 left-10 w-2/3 h-3/4 bg-white/30 rounded-full blur-xl" />
                <div className="absolute top-2 right-12 w-1/2 h-2/3 bg-white/25 rounded-full blur-xl" />
              </div>
            </div>
          </div>

          {/* ── LIVING SKY LAYER (MOBILE): Kawanan Burung, Kawanan Kelelawar, 1 Pesawat & 1 Roket Bergantian ── */}
          <div className="absolute inset-0 z-12 pointer-events-none overflow-hidden select-none">
            {/* 1. KAWANAN BURUNG (Pagi/Siang/Panas/Cerah/Hujan - 2 Kawanan Bergantian Waktu & Ukuran Jelas) */}
            {weatherCondition !== 'night' && (
              <div className="absolute inset-0 pointer-events-none">
                {/* Kawanan 1: Formasi V 5 Burung dari Kiri ke Kanan */}
                <div className="absolute top-8 left-0 animate-flock-east">
                  <div className="relative">
                    <div className="absolute top-0 left-0">
                      <svg viewBox="0 0 32 18" className="w-7 h-4 fill-slate-800 drop-shadow-md animate-bird-wing">
                        <path d="M 0,9 Q 8,0 16,9 Q 24,0 32,9 Q 24,6 16,11 Q 8,6 0,9 Z" />
                      </svg>
                    </div>
                    <div className="absolute -top-4 -left-6">
                      <svg viewBox="0 0 32 18" className="w-5.5 h-3 fill-slate-700 drop-shadow-md animate-bird-wing" style={{ animationDuration: '0.31s' }}>
                        <path d="M 0,9 Q 8,0 16,9 Q 24,0 32,9 Q 24,6 16,11 Q 8,6 0,9 Z" />
                      </svg>
                    </div>
                    <div className="absolute -top-8 -left-12">
                      <svg viewBox="0 0 32 18" className="w-5 h-2.5 fill-slate-700/85 drop-shadow-md animate-bird-wing" style={{ animationDuration: '0.34s' }}>
                        <path d="M 0,9 Q 8,0 16,9 Q 24,0 32,9 Q 24,6 16,11 Q 8,6 0,9 Z" />
                      </svg>
                    </div>
                    <div className="absolute top-4 -left-6">
                      <svg viewBox="0 0 32 18" className="w-5.5 h-3 fill-slate-700 drop-shadow-md animate-bird-wing" style={{ animationDuration: '0.29s' }}>
                        <path d="M 0,9 Q 8,0 16,9 Q 24,0 32,9 Q 24,6 16,11 Q 8,6 0,9 Z" />
                      </svg>
                    </div>
                    <div className="absolute top-8 -left-12">
                      <svg viewBox="0 0 32 18" className="w-5 h-2.5 fill-slate-700/85 drop-shadow-md animate-bird-wing" style={{ animationDuration: '0.33s' }}>
                        <path d="M 0,9 Q 8,0 16,9 Q 24,0 32,9 Q 24,6 16,11 Q 8,6 0,9 Z" />
                      </svg>
                    </div>
                  </div>
                </div>

                {/* Kawanan 2: 4 Burung Melintas Arah Berlawanan dari Kanan ke Kiri (Bergantian) */}
                <div className="absolute top-16 right-0 animate-flock-west">
                  <div className="relative">
                    <div className="absolute top-0 left-0">
                      <svg viewBox="0 0 32 18" className="w-6.5 h-3.5 fill-slate-800 drop-shadow-md animate-bird-wing" style={{ animationDuration: '0.3s' }}>
                        <path d="M 0,9 Q 8,0 16,9 Q 24,0 32,9 Q 24,6 16,11 Q 8,6 0,9 Z" />
                      </svg>
                    </div>
                    <div className="absolute -top-4 left-6">
                      <svg viewBox="0 0 32 18" className="w-5.5 h-3 fill-slate-700 drop-shadow-md animate-bird-wing" style={{ animationDuration: '0.33s' }}>
                        <path d="M 0,9 Q 8,0 16,9 Q 24,0 32,9 Q 24,6 16,11 Q 8,6 0,9 Z" />
                      </svg>
                    </div>
                    <div className="absolute top-4 left-6">
                      <svg viewBox="0 0 32 18" className="w-5.5 h-3 fill-slate-700 drop-shadow-md animate-bird-wing" style={{ animationDuration: '0.28s' }}>
                        <path d="M 0,9 Q 8,0 16,9 Q 24,0 32,9 Q 24,6 16,11 Q 8,6 0,9 Z" />
                      </svg>
                    </div>
                    <div className="absolute top-2 left-12">
                      <svg viewBox="0 0 32 18" className="w-4.5 h-2.5 fill-slate-600 drop-shadow-md animate-bird-wing" style={{ animationDuration: '0.31s' }}>
                        <path d="M 0,9 Q 8,0 16,9 Q 24,0 32,9 Q 24,6 16,11 Q 8,6 0,9 Z" />
                      </svg>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 2. KAWANAN KELELAWAR (Malam Hari - 2 Kawanan Bergantian Waktu & Ukuran Jelas) */}
            {weatherCondition === 'night' && (
              <div className="absolute inset-0 pointer-events-none">
                {/* Swarm 1: 4 Kelelawar dari Kanan ke Kiri */}
                <div className="absolute top-8 right-0 animate-swarm-west">
                  <div className="relative">
                    <div className="absolute top-0 left-0">
                      <svg viewBox="0 0 34 20" className="w-7 h-4.5 fill-slate-950 drop-shadow-md animate-bat-wing">
                        <path d="M 17,6 Q 14,0 12,4 Q 8,2 2,9 Q 7,12 11,10 Q 14,14 17,11 Q 20,14 23,10 Q 27,12 32,9 Q 26,2 22,4 Q 20,0 17,6 Z" />
                      </svg>
                    </div>
                    <div className="absolute -top-4 left-6">
                      <svg viewBox="0 0 34 20" className="w-5.5 h-3.5 fill-slate-900 drop-shadow-md animate-bat-wing" style={{ animationDuration: '0.24s' }}>
                        <path d="M 17,6 Q 14,0 12,4 Q 8,2 2,9 Q 7,12 11,10 Q 14,14 17,11 Q 20,14 23,10 Q 27,12 32,9 Q 26,2 22,4 Q 20,0 17,6 Z" />
                      </svg>
                    </div>
                    <div className="absolute top-5 left-6">
                      <svg viewBox="0 0 34 20" className="w-5.5 h-3.5 fill-slate-900 drop-shadow-md animate-bat-wing" style={{ animationDuration: '0.26s' }}>
                        <path d="M 17,6 Q 14,0 12,4 Q 8,2 2,9 Q 7,12 11,10 Q 14,14 17,11 Q 20,14 23,10 Q 27,12 32,9 Q 26,2 22,4 Q 20,0 17,6 Z" />
                      </svg>
                    </div>
                    <div className="absolute top-2 left-12">
                      <svg viewBox="0 0 34 20" className="w-4.5 h-3 fill-slate-900 drop-shadow-md animate-bat-wing" style={{ animationDuration: '0.29s' }}>
                        <path d="M 17,6 Q 14,0 12,4 Q 8,2 2,9 Q 7,12 11,10 Q 14,14 17,11 Q 20,14 23,10 Q 27,12 32,9 Q 26,2 22,4 Q 20,0 17,6 Z" />
                      </svg>
                    </div>
                  </div>
                </div>

                {/* Swarm 2: 4 Kelelawar dari Kiri ke Kanan (Bergantian) */}
                <div className="absolute top-18 left-0 animate-swarm-east">
                  <div className="relative">
                    <div className="absolute top-0 left-0">
                      <svg viewBox="0 0 34 20" className="w-6.5 h-4 fill-slate-950 drop-shadow-md animate-bat-wing" style={{ animationDuration: '0.23s' }}>
                        <path d="M 17,6 Q 14,0 12,4 Q 8,2 2,9 Q 7,12 11,10 Q 14,14 17,11 Q 20,14 23,10 Q 27,12 32,9 Q 26,2 22,4 Q 20,0 17,6 Z" />
                      </svg>
                    </div>
                    <div className="absolute -top-4 -left-6">
                      <svg viewBox="0 0 34 20" className="w-5.5 h-3.5 fill-slate-900 drop-shadow-md animate-bat-wing" style={{ animationDuration: '0.27s' }}>
                        <path d="M 17,6 Q 14,0 12,4 Q 8,2 2,9 Q 7,12 11,10 Q 14,14 17,11 Q 20,14 23,10 Q 27,12 32,9 Q 26,2 22,4 Q 20,0 17,6 Z" />
                      </svg>
                    </div>
                    <div className="absolute top-4 -left-6">
                      <svg viewBox="0 0 34 20" className="w-5.5 h-3.5 fill-slate-900 drop-shadow-md animate-bat-wing" style={{ animationDuration: '0.25s' }}>
                        <path d="M 17,6 Q 14,0 12,4 Q 8,2 2,9 Q 7,12 11,10 Q 14,14 17,11 Q 20,14 23,10 Q 27,12 32,9 Q 26,2 22,4 Q 20,0 17,6 Z" />
                      </svg>
                    </div>
                    <div className="absolute top-2 -left-12">
                      <svg viewBox="0 0 34 20" className="w-4.5 h-3 fill-slate-900 drop-shadow-md animate-bat-wing" style={{ animationDuration: '0.28s' }}>
                        <path d="M 17,6 Q 14,0 12,4 Q 8,2 2,9 Q 7,12 11,10 Q 14,14 17,11 Q 20,14 23,10 Q 27,12 32,9 Q 26,2 22,4 Q 20,0 17,6 Z" />
                      </svg>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 3. PESAWAT TERBANG (HANYA 1 PESAWAT - Melintas Bergantian dengan Roket) */}
            <div className="absolute top-5 left-0 animate-single-plane flex items-center">
              <div className="w-22 sm:w-30 h-[1.5px] bg-gradient-to-r from-transparent via-white/40 to-white/70 blur-[0.5px] -mr-1" />
              <div className="relative">
                <svg viewBox="0 0 44 24" className="w-6.5 sm:w-7.5 h-4.5 fill-white drop-shadow-md">
                  <path d="M 2,12 L 20,9 L 26,2 L 30,2 L 28,9 L 40,11 L 44,12 L 40,13 L 28,15 L 30,22 L 26,22 L 20,15 L 2,12 Z" />
                </svg>
                <div className="absolute top-0 right-3 w-1.5 h-1.5 rounded-full bg-red-500 animate-ping" />
              </div>
            </div>

            {/* 4. ROKET LUAR ANGKASA (HANYA 1 ROKET - Meluncur Bergantian Setelah Pesawat) */}
            <div className="absolute bottom-4 left-0 animate-single-rocket flex flex-col items-center">
              <svg viewBox="0 0 24 44" className="w-4 h-7 drop-shadow-lg">
                <path d="M 12,0 Q 18,10 18,28 L 24,38 L 18,34 L 14,40 L 10,40 L 6,34 L 0,38 L 6,28 Q 6,10 12,0 Z" fill="#ffffff" />
                <path d="M 12,3 Q 15,12 15,26 L 9,26 Q 9,12 12,3 Z" fill="#ef4444" />
                <circle cx="12" cy="16" r="2.5" fill="#38bdf8" />
              </svg>
              <div className="w-2.5 h-10 -mt-1 bg-gradient-to-b from-amber-300 via-orange-500 to-transparent rounded-full blur-[1px] animate-pulse" />
              <div className="w-3 h-16 -mt-2 bg-gradient-to-b from-white/70 via-white/20 to-transparent blur-xs" />
            </div>
          </div>

          {/* TOP BAR MOBILE HEADER: Lokasi (Kiri Atas) & Weather (Kanan Atas) */}
          <div className="absolute top-3.5 inset-x-4 z-25 flex items-center justify-between pointer-events-none select-none">
            {/* 1. LOKASI PILL (POJOK KIRI ATAS) */}
            <div className="pointer-events-auto flex items-center gap-1.5 px-3 py-1 rounded-full bg-black/45 backdrop-blur-md border border-white/20 text-white text-[10.5px] font-black tracking-wide shadow-sm">
              <MapPin size={11} className="text-rose-400 shrink-0" />
              <span>Bekasi</span>
            </div>

            {/* 2. WEATHER PILL (POJOK KANAN ATAS - OTOMATIS LIVE BEKASI / BISA KLIK SIMULASI MANUAL) */}
            <button
              type="button"
              onClick={handleCycleWeather}
              className="pointer-events-auto inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-black/45 hover:bg-black/65 active:scale-95 backdrop-blur-md border border-white/20 text-white text-[10.5px] font-black tracking-wide shadow-sm cursor-pointer transition-all duration-300"
              title={manualWeather ? "Mode Manual: Klik untuk mengganti atau kembali ke Cuaca Otomatis" : "Mode Otomatis: Sinkron cuaca asli Bekasi. Klik untuk simulasi manual."}
            >
              {weatherCondition === 'night' && <Moon size={11} className="text-amber-200" />}
              {weatherCondition === 'rain' && <CloudRain size={11} className="text-sky-300 animate-bounce" />}
              {weatherCondition === 'hot' && <Sun size={11} className="text-amber-400 animate-spin" style={{ animationDuration: '10s' }} />}
              {weatherCondition === 'cloudy' && <CloudSun size={11} className="text-emerald-300" />}
              <span>
                {weatherTemp ? `${weatherTemp}°C ` : ''}{
                  weatherCondition === 'night' ? 'Malam' :
                  weatherCondition === 'rain' ? 'Hujan' :
                  weatherCondition === 'hot' ? 'Panas' : 'Cerah'
                }
              </span>
              <span className={`text-[9px] font-extrabold px-1 py-0.2 rounded leading-tight ${manualWeather ? 'bg-amber-500/80 text-white' : 'bg-emerald-500/80 text-white'}`}>
                {manualWeather ? 'Manual' : 'Live'}
              </span>
            </button>
          </div>

          {/* Logo Sekolah di Tengah Header (Bersih & Elegan tanpa Tertutup Badge) */}
          <div className="z-20 relative flex flex-col items-center justify-center my-auto px-4 pt-3 pb-2">
            <img 
              src="/mobile_header_logo.png" 
              alt={appSettings.appName || "School Logo"} 
              className="w-36 sm:w-44 max-h-20 sm:max-h-24 object-contain drop-shadow-[0_8px_25px_rgba(0,0,0,0.6)] transition-transform duration-300 hover:scale-105 active:scale-95" 
            />
          </div>

          {/* Garis Batas Bawah Melengkung Menjorok ke Atas (Convex Curve SVG - Warna Putih Murni) */}
          <div className="absolute -bottom-[2px] left-0 right-0 w-full z-20 pointer-events-none leading-none overflow-visible">
            <svg 
              viewBox="0 0 100 24" 
              preserveAspectRatio="none" 
              className="w-full h-6 sm:h-7 fill-white block"
              style={{ shapeRendering: 'geometricPrecision' }}
            >
              <path d="M 0,24 Q 50,-4 100,24 L 100,32 L 0,32 Z" />
            </svg>
          </div>

        </div>

        {/* 2. AREA KONTEN: LAYANAN PUBLIK, PROGRAM KEAHLIAN & MITRA KERJASAMA (PAS 1 LAYAR) */}
        <div className="relative w-full flex-1 min-h-0 bg-white px-4 py-1 flex flex-col justify-evenly items-center z-30 overflow-hidden">
          
          <div className="w-full max-w-md mx-auto flex flex-col justify-evenly h-full min-h-0">
            
            {/* Judul: Layanan Publik */}
            <div className="flex items-center justify-center gap-1.5 py-0.5 shrink-0">
              <span className="text-[11px] sm:text-xs font-black uppercase tracking-wider text-slate-900">
                Layanan Publik
              </span>
              <button
                type="button"
                onClick={() => setShowPublicGuide(true)}
                className="hover:opacity-80 cursor-pointer transition-opacity p-0.5 text-slate-400 hover:text-slate-700"
                title="Informasi Layanan"
              >
                <Info size={13} strokeWidth={2.3} />
              </button>
            </div>

            {/* 8 Items Layanan: 2 Baris x 4 Kolom */}
            {(() => {
              const gridServices = [
                ...publicServices,
                { label: "Lainnya", subtitle: "Bantuan", svgIcon: "056-question.svg", icon: HelpCircle, isLainnya: true, defaultColor: "#64748b" }
              ].slice(0, 8);

              const rows = [gridServices.slice(0, 4), gridServices.slice(4, 8)];

              return (
                <div className="w-full flex flex-col gap-y-1.5 sm:gap-y-2 shrink-0">
                  {rows.map((row, rowIdx) => (
                    <div key={rowIdx} className="w-full flex items-start justify-between">
                      {row.map((service, idx) => {
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
                            className="flex flex-col items-center gap-1 group cursor-pointer focus:outline-none transition-transform active:scale-95 w-[52px] sm:w-[58px]"
                          >
                            <div 
                              className="w-[46px] h-[46px] sm:w-[50px] sm:h-[50px] rounded-xl flex items-center justify-center transition-all duration-300 group-hover:scale-105 shadow-2xs"
                              style={{ 
                                backgroundColor: hexToRgba(activeColor, 0.08),
                                border: `1.5px solid ${hexToRgba(activeColor, 0.16)}`
                              }}
                            >
                              {service.customIcon ? (
                                <img src={service.customIcon} alt="" className="w-5.5 h-5.5 sm:w-6 sm:h-6 object-contain" />
                              ) : (
                                <img src={`/icons/${service.svgIcon}`} alt="" className="w-5.5 h-5.5 sm:w-6 sm:h-6 object-contain" />
                              )}
                            </div>
                            <span className="text-[9.5px] sm:text-[10px] font-bold text-slate-700 tracking-tight leading-tight text-center truncate w-full">
                              {getShortLabel(service.label)}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  ))}
                </div>
              );
            })()}

            {/* 3. PROGRAM KEAHLIAN UNGGULAN (COMPACT CAROUSEL BANNER) */}
            <div className="w-full shrink-0">
              {(() => {
                const activeProgram = availablePrograms[activeProgramIdx] || availablePrograms[0];
                const cardColor = activeProgram.color && activeProgram.color.startsWith('#') ? activeProgram.color : '#3DAA37';
                return (
                  <div 
                    className="w-full rounded-xl h-[42px] sm:h-[46px] px-2.5 shadow-sm text-white relative overflow-hidden transition-all duration-500 flex items-center justify-between border border-white/20 select-none"
                    style={{
                      background: `linear-gradient(135deg, ${cardColor} 0%, color-mix(in srgb, ${cardColor} 85%, #000000) 100%)`,
                      boxShadow: `0 4px 14px ${hexToRgba(cardColor, 0.22)}`
                    }}
                  >
                    <div className="absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-white/12 to-transparent pointer-events-none" />

                    {/* Tombol Panah Kiri */}
                    <button
                      type="button"
                      onClick={() => setActiveProgramIdx((prev) => (prev === 0 ? availablePrograms.length - 1 : prev - 1))}
                      className="w-7 h-7 rounded-full flex items-center justify-center text-white/80 hover:text-white hover:bg-white/10 active:scale-90 transition-all cursor-pointer border-none z-10 shrink-0"
                      title="Sebelumnya"
                    >
                      <ChevronLeft size={16} strokeWidth={2.6} />
                    </button>

                    {/* Area Konten Tengah */}
                    <div className="flex-1 flex flex-col items-center justify-center px-1.5 min-w-0 z-10">
                      <span className="text-[8px] sm:text-[8.5px] font-extrabold uppercase tracking-widest text-white/75 leading-none mb-0.5">
                        {appSettings.trustedByText || "Program Keahlian"}
                      </span>
                      <h3 className="text-[11px] sm:text-[12px] font-black text-white uppercase tracking-wider text-center drop-shadow-xs truncate w-full leading-tight">
                        {activeProgram.name}
                      </h3>
                    </div>

                    {/* Tombol Panah Kanan */}
                    <button
                      type="button"
                      onClick={() => setActiveProgramIdx((prev) => (prev + 1) % availablePrograms.length)}
                      className="w-7 h-7 rounded-full flex items-center justify-center text-white/80 hover:text-white hover:bg-white/10 active:scale-90 transition-all cursor-pointer border-none z-10 shrink-0"
                      title="Selanjutnya"
                    >
                      <ChevronRight size={16} strokeWidth={2.6} />
                    </button>
                  </div>
                );
              })()}
            </div>

            {/* 4. MITRA KERJASAMA (COMPACT SLEEK 1-LINE MARQUEE) */}
            <div className="w-full bg-slate-50/90 rounded-lg px-2.5 py-1 border border-slate-100/90 flex items-center gap-2 overflow-hidden shrink-0">
              <span className="text-[8.5px] sm:text-[9px] font-black text-slate-400 uppercase tracking-wider shrink-0">
                Mitra:
              </span>

              <div className="relative w-full overflow-hidden flex items-center py-0.5">
                <div className="flex w-max animate-marquee gap-6 sm:gap-8 items-center px-2">
                  {mitraList.map((mitra, idx) => (
                    <div 
                      key={idx} 
                      className="h-5 sm:h-5.5 flex items-center justify-center shrink-0 grayscale opacity-60 hover:grayscale-0 hover:opacity-100 transition-all duration-300 cursor-pointer"
                      title={mitra.name}
                    >
                      {mitra.image ? (
                        <img src={mitra.image} alt={mitra.name} className="max-h-full max-w-[70px] object-contain" />
                      ) : (
                        <span className="text-[10px] font-black text-slate-600 tracking-tight">{mitra.name}</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>

          </div>

        </div>

        {/* 3. MOBILE BOTTOM ACTION BAR (Terintegrasi Pas di Bawah 1 Layar) */}
        <div className="shrink-0 w-full bg-white px-4 pt-2 pb-[max(0.65rem,calc(env(safe-area-inset-bottom,0px)+0.45rem))] border-t border-slate-100 z-40 select-none">
          <div className="w-full max-w-md mx-auto flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => setIsLoginModalOpen(true)}
              style={{ backgroundColor: '#3DAA37' }}
              className="flex-1 h-[44px] sm:h-[48px] rounded-xl text-white font-extrabold text-xs sm:text-sm tracking-wide shadow-md shadow-green-950/20 flex items-center justify-center transition-all active:scale-[0.98] hover:bg-[#34942f] cursor-pointer border-none"
            >
              Masuk Sekarang
            </button>

            <button
              type="button"
              onClick={() => setShowPublicHelp(true)}
              title="Bantuan & Panduan"
              style={{ backgroundColor: '#3DAA37' }}
              className="w-[44px] h-[44px] sm:w-[48px] sm:h-[48px] shrink-0 rounded-xl text-white shadow-md shadow-green-950/20 flex items-center justify-center transition-all active:scale-[0.98] hover:bg-[#34942f] cursor-pointer border-none"
            >
              <HelpCircle size={21} strokeWidth={2.3} />
            </button>
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
            {/* Live Weather Badge for Bekasi (Clickable to preview/cycle weather) */}
            <div className="mb-3">
              <button
                type="button"
                onClick={handleCycleWeather}
                className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/85 hover:bg-white active:scale-95 backdrop-blur-md border border-slate-200/90 text-slate-700 hover:text-slate-900 text-xs font-bold tracking-wide shadow-xs cursor-pointer transition-all duration-300 select-none"
                title={manualWeather ? "Mode Manual: Klik untuk mengganti atau kembali ke Cuaca Otomatis" : "Mode Otomatis: Sinkron cuaca asli Bekasi. Klik untuk simulasi manual."}
              >
                {weatherCondition === 'night' && <Moon size={13} className="text-indigo-500" />}
                {weatherCondition === 'rain' && <CloudRain size={13} className="text-sky-500 animate-bounce" />}
                {weatherCondition === 'hot' && <Sun size={13} className="text-amber-500 animate-spin" style={{ animationDuration: '12s' }} />}
                {weatherCondition === 'cloudy' && <CloudSun size={13} className="text-emerald-500" />}
                <span>
                  Bekasi {weatherTemp ? `${weatherTemp}°C` : ''} • {
                    weatherCondition === 'night' ? 'Malam Bertabur Bintang 🌙' :
                    weatherCondition === 'rain' ? 'Cuaca Hujan 🌧️' :
                    weatherCondition === 'hot' ? 'Panas Terik ☀️' : 'Cerah Berawan ⛅'
                  }
                </span>
                <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-full ${manualWeather ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'}`}>
                  {manualWeather ? 'Manual' : 'Live'}
                </span>
              </button>
            </div>

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

// ── Interactive Public Guide Modal matching the modern theme
const PublicGuideModal = ({ isOpen, onClose, primaryColor, navigate, setIsLoginModalOpen }) => {
  const [activeStep, setActiveStep] = useState(0);

  if (!isOpen) return null;

  const steps = [
    {
      tabLabel: "Jadwal",
      svgIcon: "060-calendar.svg",
      tabIcon: CalendarDays,
      title: "1. Cek Jadwal Pelajaran",
      desc: "Tekan menu 'Jadwal Pelajaran' untuk melihat jadwal KBM aktif secara real-time. Pilih hari dan kelas untuk menyesuaikan.",
      color: "#D97706",
      actionLabel: "Buka Jadwal Pelajaran",
      action: () => { navigate("/jadwal"); onClose(); }
    },
    {
      tabLabel: "Denah",
      svgIcon: "016-map pin.svg",
      tabIcon: MapPin,
      title: "2. Cari Denah Kelas & Ruang",
      desc: "Gunakan menu 'Denah Kelas' untuk melihat tata letak ruang kelas, lab, bengkel, dan kantor secara interaktif di sekolah.",
      color: "#0284C7",
      actionLabel: "Buka Denah Kelas",
      action: () => { navigate("/denah"); onClose(); }
    },
    {
      tabLabel: "Materi",
      svgIcon: "066-education.svg",
      tabIcon: BookOpenText,
      title: "3. Akses Materi Ajar",
      desc: "Temukan materi belajar dari guru langsung di 'Materi Ajar' — unduh PDF atau buka link video/Google Drive kapan saja.",
      color: "#7C3AED",
      actionLabel: "Buka Materi Ajar",
      action: () => { navigate("/materi-ajar"); onClose(); }
    },
    {
      tabLabel: "Portal",
      svgIcon: "033-padlock.svg",
      tabIcon: Lock,
      title: "4. Masuk ke Portal Internal",
      desc: "Bagi guru, siswa, dan staf, masuk menggunakan username & password resmi untuk melakukan absensi, piket, atau hubin.",
      color: "#3DAA37",
      actionLabel: "Masuk Portal Sekarang",
      action: () => { setIsLoginModalOpen(true); onClose(); }
    }
  ];

  const current = steps[activeStep];

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-300 p-0 md:p-4 text-left select-none">
      {/* Backdrop overlay listener to close */}
      <div className="absolute inset-0 z-0 cursor-pointer" onClick={onClose} />

      {/* Sheet/Modal Drawer */}
      <div className="bg-white rounded-t-[32px] md:rounded-3xl w-full max-w-md md:max-w-lg overflow-hidden shadow-2xl border-t md:border border-slate-100 flex flex-col animate-in slide-in-from-bottom md:zoom-in-95 duration-300 ease-out z-10">
        
        {/* iOS Drag Handle Bar */}
        <div className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto mt-3 mb-1 shrink-0 md:hidden" />

        {/* Header with Step Badge */}
        <div className="px-6 pt-3 pb-3 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-black text-slate-900 text-lg md:text-xl tracking-tight leading-tight">
                Panduan Penggunaan
              </h2>
              <span 
                className="text-[11px] font-black px-2.5 py-0.5 rounded-full"
                style={{
                  backgroundColor: hexToRgba(current.color, 0.12),
                  color: current.color
                }}
              >
                {activeStep + 1} / {steps.length}
              </span>
            </div>
            <p className="text-xs text-slate-400 font-semibold mt-0.5">
              Kenali fitur unggulan portal sekolah
            </p>
          </div>

          <button 
            onClick={onClose} 
            className="cursor-pointer flex items-center justify-center w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 transition-colors border-none"
            title="Tutup"
          >
            <X size={16} strokeWidth={2.5} />
          </button>
        </div>

        {/* Modern Segmented Tab Row */}
        <div className="grid grid-cols-4 gap-2 px-5 py-2">
          {steps.map((step, i) => {
            const isActive = activeStep === i;
            return (
              <button
                key={i}
                type="button"
                onClick={() => setActiveStep(i)}
                className={`flex flex-col items-center gap-1.5 py-2 px-1.5 cursor-pointer rounded-2xl transition-all duration-200 border-none ${
                  isActive
                    ? 'shadow-xs scale-[1.02]'
                    : 'opacity-55 hover:opacity-90 hover:bg-slate-50'
                }`}
                style={{
                  backgroundColor: isActive ? hexToRgba(step.color, 0.1) : 'transparent',
                  outline: isActive ? `1.5px solid ${hexToRgba(step.color, 0.35)}` : 'none'
                }}
              >
                <div 
                  className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 shadow-2xs transition-all"
                  style={{
                    backgroundColor: isActive ? '#ffffff' : hexToRgba(step.color, 0.08),
                    border: `1px solid ${hexToRgba(step.color, isActive ? 0.25 : 0.12)}`
                  }}
                >
                  <img 
                    src={`/icons/${step.svgIcon}`} 
                    alt={step.tabLabel}
                    className="w-5 h-5 object-contain"
                  />
                </div>
                <span 
                  className="text-[11px] font-black tracking-tight leading-none text-center truncate w-full"
                  style={{ color: isActive ? step.color : '#475569' }}
                >
                  {step.tabLabel}
                </span>
              </button>
            );
          })}
        </div>

        {/* Active Step Showcase Card */}
        <div className="px-5 py-2">
          <div 
            className="rounded-3xl p-5 sm:p-6 text-center relative overflow-hidden flex flex-col items-center transition-all duration-300 shadow-xs border"
            style={{
              background: `linear-gradient(180deg, ${hexToRgba(current.color, 0.07)} 0%, #ffffff 100%)`,
              borderColor: hexToRgba(current.color, 0.18)
            }}
          >
            {/* Ambient background glow */}
            <div
              className="absolute -top-12 -right-12 w-32 h-32 rounded-full blur-3xl opacity-20 pointer-events-none"
              style={{ backgroundColor: current.color }}
            />

            {/* Double Ring Hero Showcase Icon */}
            <div 
              className="w-20 h-20 rounded-3xl bg-white shadow-md p-2 flex items-center justify-center mb-3 transition-transform duration-300"
              style={{ border: `1.5px solid ${hexToRgba(current.color, 0.2)}` }}
            >
              <div 
                className="w-full h-full rounded-2xl flex items-center justify-center"
                style={{ backgroundColor: hexToRgba(current.color, 0.1) }}
              >
                <img 
                  src={`/icons/${current.svgIcon}`} 
                  alt={current.title} 
                  className="w-9 h-9 object-contain"
                />
              </div>
            </div>

            {/* Title & Description */}
            <h3 className="text-base sm:text-lg font-black text-slate-800 tracking-tight leading-snug">
              {current.title}
            </h3>
            <p className="text-xs sm:text-[13px] font-medium text-slate-500 mt-2 max-w-[310px] leading-relaxed">
              {current.desc}
            </p>

            {/* Action Trigger Button inside card */}
            <button
              type="button"
              onClick={current.action}
              className="mt-4 px-6 h-11 w-full max-w-[280px] flex items-center justify-center gap-2 cursor-pointer border-none text-white rounded-xl font-black text-xs uppercase tracking-wider transition-all active:scale-[0.98] shadow-md hover:opacity-95"
              style={{
                backgroundColor: current.color,
                boxShadow: `0 4px 14px ${hexToRgba(current.color, 0.3)}`
              }}
            >
              <span>{current.actionLabel}</span>
              <ArrowRight size={14} strokeWidth={2.5} />
            </button>
          </div>
        </div>

        {/* Footer Stepper Indicator & Navigation Controls */}
        <div className="px-5 pt-3 pb-5 md:pb-6 flex flex-col gap-3 bg-white">
          {/* 4-Step Progress Dots */}
          <div className="flex items-center justify-center gap-1.5 py-0.5">
            {steps.map((step, idx) => {
              const isActive = activeStep === idx;
              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setActiveStep(idx)}
                  className={`h-2 rounded-full transition-all duration-300 cursor-pointer border-none p-0 ${
                    isActive ? 'w-7' : 'w-2 bg-slate-200 hover:bg-slate-300'
                  }`}
                  style={{
                    backgroundColor: isActive ? current.color : undefined
                  }}
                  title={`Langkah ${idx + 1}`}
                />
              );
            })}
          </div>

          {/* Navigation Buttons Row */}
          <div className="flex items-center gap-2.5">
            {activeStep > 0 && (
              <button
                type="button"
                onClick={() => setActiveStep(prev => prev - 1)}
                className="h-12 px-4 flex items-center justify-center gap-1 cursor-pointer border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 rounded-xl font-extrabold text-xs uppercase tracking-wider transition-all active:scale-[0.98]"
              >
                <ChevronLeft size={16} strokeWidth={2.5} />
                <span>Kembali</span>
              </button>
            )}
            
            {activeStep < 3 ? (
              <button
                type="button"
                onClick={() => setActiveStep(prev => prev + 1)}
                className="flex-1 h-12 flex items-center justify-center gap-1.5 cursor-pointer border-none text-white rounded-xl font-extrabold text-xs uppercase tracking-wider transition-all active:scale-[0.98] shadow-md shadow-green-900/15"
                style={{ backgroundColor: '#3DAA37' }}
              >
                <span>Lanjut</span>
                <ArrowRight size={15} strokeWidth={2.5} />
              </button>
            ) : (
              <button
                type="button"
                onClick={onClose}
                className="flex-1 h-12 flex items-center justify-center gap-1.5 cursor-pointer border-none text-white rounded-xl font-extrabold text-xs uppercase tracking-wider transition-all active:scale-[0.98] shadow-md shadow-green-900/15"
                style={{ backgroundColor: '#3DAA37' }}
              >
                <Check size={16} strokeWidth={2.5} />
                <span>Selesai</span>
              </button>
            )}
          </div>
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

