import React, { useState, useEffect, useMemo } from 'react';
import { useOutletContext, useNavigate, Link } from 'react-router-dom';
import { Lock, User, CalendarDays, MapPin, BookOpenText, Calendar, Briefcase, HelpCircle, ShieldCheck, BookOpen, MessageSquare, MonitorSmartphone, Wifi, Palette, Users, Sparkles, LogIn, FileText, Sun, CloudRain, Moon, CloudSun } from 'lucide-react';
import { X, Search, ArrowRight, ArrowUpRight, CheckCircle2, ChevronLeft, ChevronRight, Check, Info, ArrowDown, KeyRound } from 'lucide-react';
import { PublicHelpModal } from '../components/landing/LandingModals.jsx';
import HeaderNavbar from '../components/layout/HeaderNavbar.jsx';
import PublicFooter from '../components/layout/PublicFooter.jsx';
import { getMajorAbbreviation } from '../utils/constants.js';
import { sanitizeHtml } from '../utils/sanitizeHtml.js'; // FE-SEC-B FIX



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
  } catch (err) {
    console.debug?.("hexToRgba parsing error:", err);
  }
  return hexColor;
};

const ICON_MAP = {
  book: BookOpen, chat: MessageSquare, monitor: MonitorSmartphone, wifi: Wifi,
  palette: Palette, map: MapPin, users: Users, sparkles: Sparkles,
  user: User, booktext: BookOpenText, shield: ShieldCheck
};

const PROGRAM_SOLID_PALETTES = [
  // 01. Teknik Kendaraan Ringan
  {
    color: "#059669",
    tagline: "Otomotif & Manufaktur Modern",
  },
  // 02. Teknik Komputer & Jaringan
  {
    color: "#0284c7",
    tagline: "Jaringan & Komputasi Cloud",
  },
  // 03. Manajemen Perkantoran
  {
    color: "#d97706",
    tagline: "Manajemen & Bisnis Digital",
  },
  // 04. Akuntansi Keuangan
  {
    color: "#e11d48",
    tagline: "Finansial & Lembaga Keuangan",
  }
];

const PRESET_SOLID_COLORS = {
  red: "#e11d48",
  blue: "#2563eb",
  emerald: "#059669",
  green: "#15803d",
  purple: "#9333ea",
  orange: "#ea580c",
  cyan: "#0891b2",
  pink: "#db2777"
};

const getProgramSolidStyle = (idx, rawColor) => {
  const defaultItem = PROGRAM_SOLID_PALETTES[(idx - 1) % PROGRAM_SOLID_PALETTES.length];
  let solidColor = defaultItem.color;

  if (rawColor && PRESET_SOLID_COLORS[rawColor]) {
    solidColor = PRESET_SOLID_COLORS[rawColor];
  } else if (rawColor && rawColor.startsWith('#')) {
    solidColor = rawColor;
  }

  return {
    color: solidColor,
    tagline: defaultItem.tagline,
  };
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
          badge: appSettings[`partnerBadge${i}`],
          tag: appSettings[`partnerTag${i}`],
          desc: appSettings[`partnerDesc${i}`],
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
      const isPrestasiItem = r.jenis === 'prestasi' || r.jenis === 'penghargaan';
      const isPelanggaranItem = r.jenis === 'pelanggaran';
      const matchType = rulesFilterType === 'all' 
        || (rulesFilterType === 'prestasi' && isPrestasiItem)
        || (rulesFilterType === 'pelanggaran' && isPelanggaranItem)
        || r.jenis === rulesFilterType;
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
                          const isPrestasi = r.jenis === 'prestasi' || r.jenis === 'penghargaan';
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
                            const isPrestasi = r.jenis === 'prestasi' || r.jenis === 'penghargaan';
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
    const WEATHER_CACHE_KEY = 'kurmon_weather_bekasi';
    const WEATHER_CACHE_TTL = 5 * 60 * 1000; // 5 menit

    // Cek cache sessionStorage dulu — hindari fetch berulang saat re-mount
    try {
      const cached = sessionStorage.getItem(WEATHER_CACHE_KEY);
      if (cached) {
        const { ts, condition, temp } = JSON.parse(cached);
        if (Date.now() - ts < WEATHER_CACHE_TTL) {
          if (isMounted) {
            setLiveWeather(condition);
            if (temp !== undefined) setWeatherTemp(temp);
          }
          return () => { isMounted = false; };
        }
      }
    } catch { /* abaikan */ }

    // Koordinat Bekasi: Lat -6.2383, Lon 106.9756
    fetch('https://api.open-meteo.com/v1/forecast?latitude=-6.2383&longitude=106.9756&current=temperature_2m,is_day,precipitation,rain,weather_code&timezone=Asia%2FJakarta')
      .then(res => res.json())
      .then(data => {
        if (!isMounted || !data?.current) return;
        const { rain, precipitation, weather_code, temperature_2m } = data.current;
        if (temperature_2m !== undefined) setWeatherTemp(Math.round(temperature_2m));
        
        const now = new Date();
        const jktHour = parseInt(
          new Intl.DateTimeFormat('id-ID', { timeZone: 'Asia/Jakarta', hour: 'numeric', hour12: false }).format(now),
          10
        );
        // Proteksi ketat: Jam 06:00 - 17:59 WIB PASTI SIANG/PAGI HARI (Kelelawar tidak boleh muncul)
        const isDaytimeHour = (jktHour >= 6 && jktHour < 18);

        const isMiddayPeak = (jktHour >= 11 && jktHour <= 14);

        let detected = 'cloudy';
        if (rain > 0.1 || precipitation > 0.1 || [51,53,55,61,63,65,80,81,82,95,96,99].includes(weather_code)) {
          detected = 'rain';
        } else if (!isDaytimeHour) {
          detected = 'night';
        } else if (isMiddayPeak && (temperature_2m >= 32 || [0, 1].includes(weather_code))) {
          detected = 'hot';
        } else {
          detected = 'cloudy';
        }
        if (isMounted) {
          setLiveWeather(detected);
          // Simpan ke sessionStorage agar tidak fetch ulang dalam 5 menit
          try {
            sessionStorage.setItem(WEATHER_CACHE_KEY, JSON.stringify({
              ts: Date.now(),
              condition: detected,
              temp: Math.round(temperature_2m)
            }));
          } catch { /* abaikan */ }
        }
      })
      .catch(() => {
        // Fallback otomatis berdasarkan jam Jakarta
      });
    return () => { isMounted = false; };
  }, []);

  // Pause semua CSS animations saat browser tab tidak aktif (hemat CPU)
  useEffect(() => {
    const handleVisibility = () => {
      if (document.hidden) {
        document.documentElement.style.setProperty('--animation-play-state', 'paused');
      } else {
        document.documentElement.style.setProperty('--animation-play-state', 'running');
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
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



  const [activeLang, setActiveLang] = useState(() => {
    try {
      return localStorage.getItem('kurmon_lang') || 'ID';
    } catch {
      return 'ID';
    }
  });

  useEffect(() => {
    const handleLangChange = (e) => {
      if (e?.detail) {
        setActiveLang(e.detail);
      }
    };
    window.addEventListener('kurmon_lang_change', handleLangChange);
    return () => window.removeEventListener('kurmon_lang_change', handleLangChange);
  }, []);

  const t = (idText, enText) => activeLang === 'EN' ? enText : idText;

  const [academicServiceQuery, setAcademicServiceQuery] = useState("");

  const academicServices = useMemo(() => [
    { 
      id: 'jadwal',
      title: appSettings.serviceLabel1 !== undefined && appSettings.serviceLabel1 !== ""
        ? cleanText(appSettings.serviceLabel1) 
        : t("Jadwal", "Schedule"), 
      desc: appSettings.serviceDesc1 || t("Lihat jadwal pelajaran dan kegiatan kelas.", "View class schedules and activities."), 
      svgIcon: "060-calendar.svg",
      icon: CalendarDays, 
      defaultColor: "#D97706",
      customColor: appSettings.serviceColor1,
      customIcon: appSettings.serviceIconImage1,
      path: "/jadwal",
    },
    { 
      id: 'denah',
      title: appSettings.serviceLabel2 !== undefined && appSettings.serviceLabel2 !== ""
        ? cleanText(appSettings.serviceLabel2) 
        : t("Denah Ruang", "Campus Map"), 
      desc: appSettings.serviceDesc2 || t("Temukan lokasi ruang di lingkungan sekolah.", "Find room locations across campus."), 
      svgIcon: "016-map pin.svg",
      icon: MapPin, 
      defaultColor: "#0284C7",
      customColor: appSettings.serviceColor2,
      customIcon: appSettings.serviceIconImage2,
      path: "/denah",
    },
    { 
      id: 'materi',
      title: appSettings.serviceLabel3 !== undefined && appSettings.serviceLabel3 !== ""
        ? cleanText(appSettings.serviceLabel3) 
        : t("Materi Ajar", "Materials"), 
      desc: appSettings.serviceDesc3 || t("Buka materi untuk mendukung pembelajaran.", "Access materials to support learning."), 
      svgIcon: "066-education.svg",
      icon: BookOpenText, 
      defaultColor: "#7C3AED",
      customColor: appSettings.serviceColor3,
      customIcon: appSettings.serviceIconImage3,
      path: "/materi-ajar",
    },
    { 
      id: 'kalender',
      title: appSettings.serviceLabel4 !== undefined && appSettings.serviceLabel4 !== ""
        ? cleanText(appSettings.serviceLabel4) 
        : t("Kalender", "Calendar"), 
      desc: appSettings.serviceDesc4 || t("Periksa agenda dan tanggal penting sekolah.", "Check events and important dates."), 
      svgIcon: "086-calendar.svg",
      icon: Calendar, 
      defaultColor: "#15803D",
      customColor: appSettings.serviceColor4,
      customIcon: appSettings.serviceIconImage4,
      path: "/kalender",
    },
    { 
      id: 'pkl',
      title: appSettings.serviceLabel5 !== undefined && appSettings.serviceLabel5 !== ""
        ? cleanText(appSettings.serviceLabel5) 
        : t("Lokasi PKL", "Internship"), 
      desc: appSettings.serviceDesc5 || t("Temukan informasi lokasi praktik kerja lapangan.", "Find vocational internship locations."), 
      svgIcon: "008-warehouse.svg",
      icon: Briefcase, 
      defaultColor: "#DB2777",
      customColor: appSettings.serviceColor5,
      customIcon: appSettings.serviceIconImage5,
      path: "/pkl-locations",
    },
    { 
      id: 'struktur',
      title: appSettings.serviceLabel6 !== undefined && appSettings.serviceLabel6 !== ""
        ? cleanText(appSettings.serviceLabel6) 
        : t("Struktur", "Structure"), 
      desc: appSettings.serviceDesc6 || t("Kenali susunan organisasi sekolah.", "Learn the school organizational chart."), 
      svgIcon: "045-account.svg",
      icon: Users, 
      defaultColor: "#E11D48",
      customColor: appSettings.serviceColor6,
      customIcon: appSettings.serviceIconImage6,
      path: "/struktur",
    },
    { 
      id: 'peraturan',
      title: appSettings.serviceLabel7 !== undefined && appSettings.serviceLabel7 !== ""
        ? cleanText(appSettings.serviceLabel7) 
        : t("Peraturan", "School Rules"), 
      desc: appSettings.serviceDesc7 || t("Baca ketentuan yang berlaku di sekolah.", "Read official school code of conduct."), 
      svgIcon: "013-shield.svg",
      icon: ShieldCheck, 
      defaultColor: "#E11D48",
      customColor: appSettings.serviceColor7,
      customIcon: appSettings.serviceIconImage7,
      isPdfRules: true,
    },
  ], [appSettings, activeLang]);

  const filteredAcademicServices = useMemo(() => {
    if (!academicServiceQuery.trim()) return academicServices;
    const q = academicServiceQuery.toLowerCase();
    return academicServices.filter(s => 
      s.title.toLowerCase().includes(q) || s.desc.toLowerCase().includes(q)
    );
  }, [academicServices, academicServiceQuery]);

  useEffect(() => {
    const handleSlashKey = (e) => {
      if (e.key === '/' && !['INPUT', 'TEXTAREA'].includes(document.activeElement?.tagName)) {
        e.preventDefault();
        const searchEl = document.getElementById('academic-service-search');
        if (searchEl) {
          searchEl.focus();
        }
      }
    };
    window.addEventListener('keydown', handleSlashKey);
    return () => window.removeEventListener('keydown', handleSlashKey);
  }, []);

  useEffect(() => {
    if (window.location.hash) {
      const id = window.location.hash.replace('#', '');
      setTimeout(() => {
        const el = document.getElementById(id);
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 300);
    }
  }, []);

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
    <div className="relative flex flex-col min-h-screen w-full bg-[var(--ui-bg)] overflow-x-hidden font-sans" style={{ '--accent-color': accentColor || '#c8ed69', '--ui-primary': primaryColor || '#059669' }}>

      {/* GLOBAL DECORATIVE BACKGROUND (DESKTOP) */}
      <div className="hidden md:block absolute top-0 left-0 w-full h-[620px] lg:h-[680px] pointer-events-none z-0 overflow-hidden select-none">
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

        {/* Scrim Gradasi Transparan Dinamis - Menjaga Background Ilustrasi Sekolah Tetap Terlihat Nyata & Jelas */}
        <div 
          className="absolute inset-0 pointer-events-none transition-all duration-700"
          style={{
            background: weatherCondition === 'night' 
              ? 'linear-gradient(180deg, rgba(10, 22, 38, 0.52) 0%, rgba(15, 23, 42, 0.32) 45%, rgba(255, 255, 255, 0.85) 82%, rgba(255, 255, 255, 1) 100%)'
              : weatherCondition === 'rain'
              ? 'linear-gradient(180deg, rgba(15, 23, 42, 0.55) 0%, rgba(30, 41, 59, 0.35) 45%, rgba(255, 255, 255, 0.85) 82%, rgba(255, 255, 255, 1) 100%)'
              : weatherCondition === 'hot'
              ? 'linear-gradient(180deg, rgba(234, 88, 12, 0.25) 0%, rgba(245, 158, 11, 0.15) 45%, rgba(255, 255, 255, 0.85) 82%, rgba(255, 255, 255, 1) 100%)'
              : 'linear-gradient(180deg, rgba(0, 0, 0, 0.40) 0%, rgba(0, 0, 0, 0.18) 45%, rgba(255, 255, 255, 0.85) 82%, rgba(255, 255, 255, 1) 100%)'
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
            {[...Array(14)].map((_, i) => (
              <div
                key={i}
                className="absolute w-[1.5px] h-10 bg-gradient-to-b from-transparent via-sky-200/40 to-white/60 rotate-[12deg] animate-rain-fall"
                style={{
                  left: `${(i * 7) + (i % 3)}%`,
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
          {/* 1. KAWANAN BURUNG (Pagi/Siang/Panas/Cerah/Hujan - Variasi Ketinggian: Belakang & Bawah) */}
          {weatherCondition !== 'night' && (
            <div className="absolute inset-0 pointer-events-none">
              {/* Kawanan 1: Formasi V 5 Burung Melintas di Belakang Area Tengah */}
              <div className="absolute top-44 left-0 animate-flock-east">
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

              {/* Kawanan 2: 4 Burung Melintas di Area Bawah (Arah Berlawanan) */}
              <div className="absolute top-80 right-0 animate-flock-west">
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

          {/* 2. KAWANAN KELELAWAR (Malam Hari - Variasi Ketinggian: Belakang & Bawah) */}
          {weatherCondition === 'night' && (
            <div className="absolute inset-0 pointer-events-none">
              {/* Swarm 1: 4 Kelelawar Melintas di Area Tengah */}
              <div className="absolute top-48 right-0 animate-swarm-west">
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

              {/* Swarm 2: 4 Kelelawar Melintas di Area Bawah */}
              <div className="absolute top-84 left-0 animate-swarm-east">
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

          {/* 3. PESAWAT TERBANG MEMBAWA BENDERA MERAH PUTIH (Melintas Gagah di Area Tengah-Atas) */}
          <div className="absolute top-32 left-0 animate-single-plane flex items-center">
            {/* Jejak Asap Tipis */}
            <div className="w-20 sm:w-28 h-[1.5px] bg-gradient-to-r from-transparent via-white/35 to-white/60 blur-[0.5px] -mr-1" />
            
            {/* Bendera Merah Putih Berkibar di Belakang Pesawat */}
            <div className="relative flex items-center -mr-0.5 animate-flag-wave">
              <div className="w-4 sm:w-6 h-[1px] bg-white/70" />
              <div className="w-7 h-4 sm:w-8 sm:h-4.5 rounded-[2px] overflow-hidden shadow-sm border border-black/15 flex flex-col shrink-0">
                <div className="h-1/2 w-full bg-red-600" />
                <div className="h-1/2 w-full bg-white" />
              </div>
            </div>

            {/* Tali Penghubung ke Ekor Pesawat */}
            <div className="w-2.5 sm:w-3.5 h-[1px] bg-white/80 -mr-0.5" />

            {/* Body Pesawat */}
            <div className="relative shrink-0">
              <svg viewBox="0 0 44 24" className="w-7 sm:w-8 h-4.5 fill-white drop-shadow-md">
                <path d="M 2,12 L 20,9 L 26,2 L 30,2 L 28,9 L 40,11 L 44,12 L 40,13 L 28,15 L 30,22 L 26,22 L 20,15 L 2,12 Z" />
              </svg>
              <div className="absolute top-0 right-3 w-1.5 h-1.5 rounded-full bg-red-500 animate-ping" />
            </div>
          </div>

          {/* 4. PIRING TERBANG UFO (Melayang di Area Bawah dengan Sorot Neon) */}
          <div className="absolute top-64 right-0 animate-ufo-fly flex flex-col items-center">
            <div className="relative">
              <svg viewBox="0 0 48 24" className="w-8 sm:w-9 h-4.5 drop-shadow-lg animate-ufo-glow">
                <ellipse cx="24" cy="9" rx="9" ry="5.5" fill="#38bdf8" fillOpacity="0.85" />
                <ellipse cx="22" cy="7.5" rx="4" ry="2" fill="#ffffff" fillOpacity="0.7" />
                <ellipse cx="24" cy="14" rx="22" ry="5.5" fill="#475569" />
                <ellipse cx="24" cy="13" rx="19" ry="4" fill="#94a3b8" />
                <circle cx="9" cy="14" r="1.3" fill="#22c55e" />
                <circle cx="16" cy="15.5" r="1.5" fill="#38bdf8" />
                <circle cx="24" cy="16" r="1.7" fill="#ec4899" />
                <circle cx="32" cy="15.5" r="1.5" fill="#38bdf8" />
                <circle cx="39" cy="14" r="1.3" fill="#22c55e" />
              </svg>
            </div>
            <div className="w-10 sm:w-12 h-12 -mt-1 bg-gradient-to-b from-sky-400/35 via-emerald-300/15 to-transparent blur-[1px] [clip-path:polygon(30%_0%,70%_0%,100%_100%,0%_100%)] animate-pulse" />
          </div>
        </div>
      </div>
      {/* Animasi CSS (keyframes) telah dipindahkan ke index.css agar tidak memicu
          style recalculation tiap render — lihat bagian "LANDING PAGE — ANIMASI LANGIT" di akhir index.css */}


      {/* DESKTOP FULL-WIDTH HEADER */}

      <div className="hidden md:block">
        <HeaderNavbar setIsLoginModalOpen={setIsLoginModalOpen} appSettings={appSettings} onPanduanClick={() => setShowPublicGuide(true)} />
      </div>

      {/* MOBILE APP LANDING VIEW (Scrollable App Screen) */}
      <div className="md:hidden flex flex-col min-h-screen w-full bg-white overflow-y-auto select-none relative font-sans">
        
        {/* 1. AREA HEADER (ATAS - BACKGROUND GAMBAR SEKOLAH DARI KUSTOMISASI ADMIN WEB) */}
        <div 
          className="relative w-full h-[38vh] min-h-[255px] flex flex-col justify-center items-center overflow-hidden text-white shrink-0 bg-slate-900"
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
              {[...Array(12)].map((_, i) => (
                <div
                  key={i}
                  className="absolute w-[1.5px] h-9 bg-gradient-to-b from-transparent via-sky-200/50 to-white/70 rotate-[12deg] animate-rain-fall"
                  style={{
                    left: `${(i * 8) + (i % 3)}%`,
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
            {/* 1. KAWANAN BURUNG (Pagi/Siang/Panas/Cerah/Hujan - Variasi Ketinggian: Belakang Logo & Bawah) */}
            {weatherCondition !== 'night' && (
              <div className="absolute inset-0 pointer-events-none">
                {/* Kawanan 1: Melintas TEPAT DI BELAKANG LOGO SEKOLAH (Area Tengah Vertikal) */}
                <div className="absolute top-[44%] -translate-y-1/2 left-0 animate-flock-east">
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

                {/* Kawanan 2: Melintas DI BAWAH LOGO SEKOLAH (Area Langit Bawah Dekat Lengkungan) */}
                <div className="absolute top-[72%] right-0 animate-flock-west">
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

            {/* 2. KAWANAN KELELAWAR (Malam Hari - Variasi Ketinggian: Belakang Logo & Bawah) */}
            {weatherCondition === 'night' && (
              <div className="absolute inset-0 pointer-events-none">
                {/* Swarm 1: Melintas TEPAT DI BELAKANG LOGO SEKOLAH */}
                <div className="absolute top-[48%] -translate-y-1/2 right-0 animate-swarm-west">
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

                {/* Swarm 2: Melintas DI BAWAH LOGO SEKOLAH */}
                <div className="absolute top-[70%] left-0 animate-swarm-east">
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

            {/* 3. PESAWAT TERBANG MEMBAWA BENDERA MERAH PUTIH (Melintas di Area Tengah-Atas di Belakang Logo) */}
            <div className="absolute top-[38%] left-0 animate-single-plane flex items-center">
              <div className="w-18 sm:w-24 h-[1.5px] bg-gradient-to-r from-transparent via-white/35 to-white/60 blur-[0.5px] -mr-1" />
              
              {/* Bendera Merah Putih Berkibar */}
              <div className="relative flex items-center -mr-0.5 animate-flag-wave">
                <div className="w-3.5 sm:w-5 h-[1px] bg-white/70" />
                <div className="w-6.5 h-3.5 sm:w-7.5 sm:h-4 rounded-[2px] overflow-hidden shadow-sm border border-black/15 flex flex-col shrink-0">
                  <div className="h-1/2 w-full bg-red-600" />
                  <div className="h-1/2 w-full bg-white" />
                </div>
              </div>

              {/* Tali Penghubung ke Pesawat */}
              <div className="w-2.5 sm:w-3 h-[1px] bg-white/80 -mr-0.5" />

              {/* Body Pesawat */}
              <div className="relative shrink-0">
                <svg viewBox="0 0 44 24" className="w-6.5 sm:w-7.5 h-4.5 fill-white drop-shadow-md">
                  <path d="M 2,12 L 20,9 L 26,2 L 30,2 L 28,9 L 40,11 L 44,12 L 40,13 L 28,15 L 30,22 L 26,22 L 20,15 L 2,12 Z" />
                </svg>
                <div className="absolute top-0 right-3 w-1.5 h-1.5 rounded-full bg-red-500 animate-ping" />
              </div>
            </div>

            {/* 4. PIRING TERBANG UFO (Melayang di Area BAWAH LOGO dengan Sorot Neon Alien) */}
            <div className="absolute top-[64%] right-0 animate-ufo-fly flex flex-col items-center">
              <div className="relative">
                <svg viewBox="0 0 48 24" className="w-7.5 sm:w-8.5 h-4 drop-shadow-lg animate-ufo-glow">
                  <ellipse cx="24" cy="9" rx="9" ry="5.5" fill="#38bdf8" fillOpacity="0.85" />
                  <ellipse cx="22" cy="7.5" rx="4" ry="2" fill="#ffffff" fillOpacity="0.7" />
                  <ellipse cx="24" cy="14" rx="22" ry="5.5" fill="#475569" />
                  <ellipse cx="24" cy="13" rx="19" ry="4" fill="#94a3b8" />
                  <circle cx="9" cy="14" r="1.3" fill="#22c55e" />
                  <circle cx="16" cy="15.5" r="1.5" fill="#38bdf8" />
                  <circle cx="24" cy="16" r="1.7" fill="#ec4899" />
                  <circle cx="32" cy="15.5" r="1.5" fill="#38bdf8" />
                  <circle cx="39" cy="14" r="1.3" fill="#22c55e" />
                </svg>
              </div>
              <div className="w-9 sm:w-11 h-10 -mt-1 bg-gradient-to-b from-sky-400/35 via-emerald-300/15 to-transparent blur-[1px] [clip-path:polygon(30%_0%,70%_0%,100%_100%,0%_100%)] animate-pulse" />
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
          <div className="z-20 relative flex flex-col items-center justify-center my-auto px-6 pt-6 pb-4">
            <img 
              src="/mobile_header_logo.png" 
              alt={appSettings.appName || "School Logo"} 
              className="w-44 sm:w-52 max-h-32 object-contain drop-shadow-[0_8px_25px_rgba(0,0,0,0.6)] transition-transform duration-300 hover:scale-105 active:scale-95" 
            />
          </div>

          {/* Garis Batas Bawah Melengkung Menjorok ke Atas (Lengkungan Busur Halus & Dalam Sesuai Gambar) */}
          <div className="absolute -bottom-[2px] left-0 right-0 w-full z-20 pointer-events-none leading-none overflow-visible">
            <svg 
              viewBox="0 0 100 36" 
              preserveAspectRatio="none" 
              className="w-full h-12 sm:h-14 fill-white block"
              style={{ shapeRendering: 'geometricPrecision' }}
            >
              <path d="M 0,36 C 25,-4 75,-4 100,36 L 100,46 L 0,46 Z" />
            </svg>
          </div>

        </div>

                  {/* 2. AREA KONTEN: LAYANAN PUBLIK, PROGRAM KEAHLIAN & MITRA KERJASAMA (Posisi Putih Lebih Naik ke Atas) */}
        <div className="relative w-full flex-1 bg-white px-5 pt-1 sm:pt-1.5 pb-[115px] flex flex-col items-center z-30 -mt-[2px]">
          
          <div className="w-full max-w-md mx-auto flex flex-col items-center">
            
            {/* Judul: Layanan Publik */}
            <div className="flex items-center justify-center gap-1.5 pt-2 pb-1 mb-3.5">
              <span className="text-xs sm:text-sm font-black uppercase tracking-wider text-slate-900">
                Layanan Publik
              </span>
              <button
                type="button"
                onClick={() => setShowPublicGuide(true)}
                className="hover:opacity-80 cursor-pointer transition-opacity p-0.5 text-slate-400 hover:text-slate-700"
                title="Informasi Layanan"
              >
                <Info size={14} strokeWidth={2.3} />
              </button>
            </div>

            {/* 8 Items Layanan: 2 Baris x 4 Kolom dengan Flex justify-between Sejajar Tombol Aksi */}
            {(() => {
              const gridServices = [
                ...publicServices,
                { label: "Lainnya", subtitle: "Bantuan", svgIcon: "056-question.svg", icon: HelpCircle, isLainnya: true, defaultColor: "#64748b" }
              ].slice(0, 8);

              const rows = [gridServices.slice(0, 4), gridServices.slice(4, 8)];

              return (
                <div className="w-full flex flex-col gap-y-4 sm:gap-y-5">
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
                            className="flex flex-col items-center gap-1.5 group cursor-pointer focus:outline-none transition-transform active:scale-95 w-[56px] sm:w-[64px]"
                          >
                            {/* Desain Icon Card Sesuai Desktop - Lebar Penuh Item */}
                            <div 
                              className="w-[56px] h-[56px] sm:w-[64px] sm:h-[64px] rounded-2xl flex items-center justify-center transition-all duration-300 group-hover:scale-105 shadow-xs"
                              style={{ 
                                backgroundColor: hexToRgba(activeColor, 0.08),
                                border: `1.5px solid ${hexToRgba(activeColor, 0.16)}`
                              }}
                            >
                              {service.customIcon ? (
                                <img src={service.customIcon} alt="" className="w-7 h-7 object-contain" />
                              ) : (
                                <img src={`/icons/${service.svgIcon}`} alt="" className="w-7 h-7 object-contain" />
                              )}
                            </div>
                            <span className="text-[10.5px] sm:text-xs font-bold text-slate-700 tracking-tight leading-tight text-center truncate w-full">
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

            {/* 3. PROGRAM KEAHLIAN UNGGULAN (SPACIOUS & ELEGANT BANNER) */}
            <div className="w-full mt-9 sm:mt-10 flex flex-col items-center">
              <div className="flex flex-col items-center justify-center text-center mb-3.5">
                <h2 className="text-xs sm:text-sm font-black text-slate-900 tracking-wider uppercase">
                  {appSettings.trustedByText || "Program Keahlian Unggulan"}
                </h2>
                <p className="text-[10.5px] sm:text-[11px] text-slate-400 font-semibold mt-0.5">
                  {appSettings.trustedBySubtitle || "Kompetensi keahlian terakreditasi berstandar industri"}
                </p>
              </div>

              {/* Banner Card Solid Modern - Interaktif & Elegan */}
              {(() => {
                const activeProgram = availablePrograms[activeProgramIdx] || availablePrograms[0];
                const activeIdx = activeProgram.index || activeProgramIdx + 1;
                const styleInfo = getProgramSolidStyle(activeIdx, activeProgram.color);
                const ActiveIcon = ICON_MAP[activeProgram.icon] || HelpCircle;

                return (
                  <div 
                    className="w-full rounded-2xl h-[60px] sm:h-[64px] px-3 bg-white shadow-xs text-slate-800 relative overflow-hidden transition-all duration-500 flex items-center justify-between border border-slate-200/80 select-none"
                  >
                    {/* Tombol Panah Kiri */}
                    <button
                      type="button"
                      onClick={() => setActiveProgramIdx((prev) => (prev === 0 ? availablePrograms.length - 1 : prev - 1))}
                      className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 active:scale-90 transition-all cursor-pointer border-none z-10 shrink-0"
                      title="Sebelumnya"
                    >
                      <ChevronLeft size={18} strokeWidth={2.6} />
                    </button>

                    {/* Konten Tengah: Logo + Info Keahlian */}
                    <div className="flex-1 flex items-center gap-3 px-2 min-w-0 z-10">
                      {/* Logo Badge */}
                      <div className="w-9 h-9 rounded-xl bg-slate-50 p-1 shadow-2xs border border-slate-200/70 flex items-center justify-center shrink-0">
                        {activeProgram.image ? (
                          <img src={activeProgram.image} alt={activeProgram.name} className="w-full h-full object-contain" />
                        ) : (
                          <ActiveIcon size={18} strokeWidth={2.2} style={{ color: styleInfo.color }} />
                        )}
                      </div>

                      {/* Teks */}
                      <div className="flex-1 min-w-0 text-left">
                        <h3 className="text-xs sm:text-[12.5px] font-black text-slate-900 uppercase tracking-tight truncate leading-tight">
                          {activeProgram.name}
                        </h3>
                        <p className="text-[10px] sm:text-[10.5px] font-semibold text-slate-400 truncate mt-0.5">
                          {activeProgram.desc || styleInfo.tagline}
                        </p>
                      </div>
                    </div>

                    {/* Tombol Panah Kanan */}
                    <button
                      type="button"
                      onClick={() => setActiveProgramIdx((prev) => (prev + 1) % availablePrograms.length)}
                      className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 active:scale-90 transition-all cursor-pointer border-none z-10 shrink-0"
                      title="Selanjutnya"
                    >
                      <ChevronRight size={18} strokeWidth={2.6} />
                    </button>
                  </div>
                );
              })()}
            </div>

            {/* 4. TELAH DIPERCAYA & BEKERJASAMA DENGAN (MITRA KERJASAMA CARD - SPACIOUS) */}
            <div className="w-full bg-white rounded-2xl sm:rounded-3xl py-5 px-5 sm:py-6 sm:px-6 shadow-xs border border-slate-100 flex flex-col items-center mt-6 sm:mt-7">
              <span className="text-[9.5px] sm:text-[10px] font-black text-slate-400 uppercase tracking-widest text-center mb-4">
                Telah Dipercaya & Bekerjasama Dengan
              </span>

              <div className="relative w-full overflow-hidden flex items-center justify-center py-1">
                <div className="flex w-max animate-marquee gap-8 sm:gap-10 items-center px-4">
                  {mitraList.map((mitra, idx) => (
                    <div 
                      key={idx} 
                      className="h-7 sm:h-8 flex items-center justify-center shrink-0 grayscale opacity-50 hover:grayscale-0 hover:opacity-100 transition-all duration-300 cursor-pointer"
                      title={mitra.name}
                    >
                      {mitra.image ? (
                        <img src={mitra.image} alt={mitra.name} className="max-h-full max-w-[90px] object-contain" />
                      ) : (
                        <span className="text-xs font-black text-slate-600 tracking-tight">{mitra.name}</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>

          </div>

        </div>

      </div>

      {/* DESKTOP VIEW RESPONSIVE NATURAL WRAPPER */}
      <div className="hidden md:flex flex-col w-full max-w-[1400px] mx-auto px-6 md:px-8 relative z-10 select-none pt-[106px] lg:pt-[116px] pb-6 lg:pb-8 desktop-layout-wrapper">


        {/* TOP ROW: HERO AKADEMIK & AKSES AKUN CARD */}
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-10 lg:gap-14 pt-4 md:pt-6 lg:pt-8 pb-12 md:pb-16 lg:pb-20 min-h-0 relative z-10">

          {/* Left Column (Banner / Hero Text) */}
          <div className="flex-1 flex flex-col justify-center min-h-0 text-left max-w-[620px]">
            {/* Top Tag & Live Weather Badge */}
            <div className="flex flex-wrap items-center gap-2.5 mb-4">
              <div 
                className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl shadow-xs backdrop-blur-md"
                style={{
                  backgroundColor: 'rgba(0, 0, 0, 0.45)',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  borderRadius: '12px'
                }}
              >
                <span 
                  className="w-2 h-2 rounded-full animate-pulse shrink-0" 
                  style={{ backgroundColor: accentColor || '#a3e635' }} 
                />
                <span 
                  className="text-[11px] font-black tracking-wider uppercase font-mono text-emerald-300"
                >
                  {appSettings.heroBadgeText || `${t("PORTAL AKADEMIK", "ACADEMIC PORTAL")} ${appSettings.logoText || (appSettings.appName ? appSettings.appName.toUpperCase() : "KG2 SCHOOL")}`}
                </span>
              </div>

              {/* Live Weather Badge for Bekasi */}
              <button
                type="button"
                onClick={handleCycleWeather}
                className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-black/45 hover:bg-black/65 active:scale-95 backdrop-blur-md border border-white/20 text-white text-[11px] font-bold shadow-xs cursor-pointer transition-all"
                style={{ borderRadius: '12px' }}
                title={manualWeather ? t("Mode Manual: Klik untuk mengganti atau kembali ke Cuaca Otomatis", "Manual Mode: Click to cycle or return to Auto Weather") : t("Mode Otomatis: Sinkron cuaca asli Bekasi. Klik untuk simulasi manual.", "Auto Mode: Synced with Bekasi live weather. Click for manual simulation.")}
              >
                {weatherCondition === 'night' && <Moon size={12} className="text-amber-200 shrink-0" />}
                {weatherCondition === 'rain' && <CloudRain size={12} className="text-sky-300 shrink-0 animate-bounce" />}
                {weatherCondition === 'hot' && <Sun size={12} className="text-amber-400 shrink-0 animate-spin" style={{ animationDuration: '12s' }} />}
                {weatherCondition === 'cloudy' && <CloudSun size={12} className="text-emerald-300 shrink-0" />}
                <span>
                  Bekasi {weatherTemp ? `${weatherTemp}°C` : ''}
                </span>
                <span 
                  className="text-[9.5px] font-black px-1.5 py-0.5 rounded-md"
                  style={{
                    backgroundColor: accentColor || '#a3e635',
                    color: '#064e3b',
                    borderRadius: '6px'
                  }}
                >
                  {manualWeather ? 'Manual' : 'Live'}
                </span>
              </button>
            </div>

            {/* Main Headline */}
            <h1 
              className="text-3xl sm:text-4xl lg:text-[44px] font-black tracking-tight leading-[1.12] drop-shadow-sm"
              style={{ color: appSettings.heroTitleColor || '#ffffff' }}
            >
              {appSettings.heroTitle ? (
                appSettings.heroTitle
              ) : (
                <>
                  {t("Aktivitas akademik,", "Academic activities,")}
                  <span 
                    className="block mt-1 drop-shadow-sm" 
                    style={{ color: appSettings.heroHighlightColor || accentColor || '#a3e635' }}
                  >
                    {t("lebih terarah.", "more focused.")}
                  </span>
                </>
              )}
            </h1>

            {/* Subtitle */}
            <p 
              className="text-xs sm:text-sm lg:text-[14px] font-medium mt-3.5 mb-6 max-w-[480px] leading-relaxed drop-shadow-xs"
              style={{ color: appSettings.heroSubtitleColor || '#e2e8f0' }}
            >
              {appSettings.heroSubtitle && appSettings.heroSubtitle !== "Sistem informasi terpadu guru dan siswa untuk jadwal, denah, hingga materi ajar."
                ? cleanText(appSettings.heroSubtitle)
                : t("Akses jadwal pelajaran, materi ajar, kalender akademik, dan informasi PKL dalam satu portal. Masuk ke akun untuk melanjutkan aktivitas sekolahmu.", "Access class schedules, teaching materials, academic calendar, and internship info in one unified portal. Sign in to your account to continue your school activities.")}
            </p>

            {/* Two Action Buttons */}
            <div className="flex flex-wrap items-center gap-3.5">
              <button 
                type="button"
                onClick={() => setIsLoginModalOpen(true)} 
                className="h-11 px-6 rounded-xl text-white text-xs sm:text-sm font-black flex items-center gap-2 shadow-md hover:shadow-lg hover:scale-[1.02] transition-all active:scale-95 cursor-pointer border-none"
                style={{ backgroundColor: appSettings.primaryButtonColor || primaryColor || '#059669' }}
              >
                <span>{t("Masuk ke Sistem", "Sign In to Portal")}</span>
                <ArrowUpRight size={15} strokeWidth={2.8} />
              </button>

              <button
                type="button"
                onClick={() => {
                  const el = document.getElementById('layanan-akademik');
                  if (el) {
                    el.scrollIntoView({ behavior: 'smooth', block: 'start' });
                  }
                }}
                className="h-11 px-5 rounded-xl bg-white/90 hover:bg-white text-slate-900 border border-white/60 text-xs sm:text-sm font-bold flex items-center gap-2 shadow-sm hover:shadow-md transition-all active:scale-95 cursor-pointer backdrop-blur-md"
              >
                <span>{t("Lihat Layanan", "Explore Services")}</span>
                <ArrowDown size={14} strokeWidth={2.6} className="text-slate-600" />
              </button>
            </div>

            {/* Micro Note: Akses Publik */}
            <div className="flex items-center gap-2.5 mt-5">
              <span 
                className="text-[11px] font-black px-2.5 py-0.5 rounded-lg shadow-xs font-mono backdrop-blur-md"
                style={{
                  backgroundColor: 'rgba(255, 255, 255, 0.18)',
                  border: '1px solid rgba(255, 255, 255, 0.25)',
                  color: '#ffffff'
                }}
              >
                {t("Akses publik", "Public access")}
              </span>
              <span className="text-xs font-medium text-slate-200 drop-shadow-xs">
                {t("Informasi umum dapat dibuka melalui menu layanan.", "General information can be accessed via the services menu.")}
              </span>
            </div>
          </div>

          {/* Right Column: Kartu Putih Akses Akun */}
          <div id="akses-akun" className="w-full lg:w-[430px] shrink-0 flex justify-center lg:justify-end scroll-mt-32">
            <div className="bg-white/98 backdrop-blur-xl rounded-3xl border border-white/60 shadow-xl hover:shadow-2xl transition-shadow p-6 sm:p-7 lg:p-8 w-full max-w-[430px] text-left relative">
              {/* Top Header of the Card */}
              <div className="flex items-center gap-2 text-slate-700">
                <KeyRound size={16} strokeWidth={2.4} style={{ color: primaryColor || '#059669' }} />
                <span className="text-[11px] font-black uppercase tracking-wider text-slate-800 font-mono">
                  {appSettings.loginCardBadge || t("Akses Akun", "Account Access")}
                </span>
              </div>

              {/* Welcome Heading */}
              <h2 className="text-2xl sm:text-[25px] font-black text-slate-900 tracking-tight mt-4 leading-tight">
                {appSettings.loginCardTitle || t("Selamat datang kembali.", "Welcome back.")}
              </h2>
              <p className="text-xs sm:text-[13px] font-semibold text-slate-400 mt-1 mb-5">
                {appSettings.loginCardSubtitle || t("Lanjutkan melalui akun sekolah yang sudah kamu miliki.", "Continue using your registered school account.")}
              </p>

              <div className="border-t border-slate-100 my-4" />

              {/* Roles List */}
              <div className="space-y-3.5 my-4">
                {/* 01 Siswa */}
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-xl bg-slate-100/90 border border-slate-200/70 text-slate-400 font-mono font-bold text-xs flex items-center justify-center shrink-0">
                    01
                  </div>
                  <div>
                    <h4 className="text-xs sm:text-sm font-black text-slate-900 leading-tight">
                      {appSettings.loginCardRole1Title || t("Siswa", "Student")}
                    </h4>
                    <p className="text-[11px] sm:text-xs font-semibold text-slate-400 mt-0.5 leading-snug">
                      {appSettings.loginCardRole1Subtitle || t("Akses kegiatan belajar dan layanan siswa.", "Access learning activities and student services.")}
                    </p>
                  </div>
                </div>

                {/* 02 Guru & Tenaga Kependidikan */}
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-xl bg-slate-100/90 border border-slate-200/70 text-slate-400 font-mono font-bold text-xs flex items-center justify-center shrink-0">
                    02
                  </div>
                  <div>
                    <h4 className="text-xs sm:text-sm font-black text-slate-900 leading-tight">
                      {appSettings.loginCardRole2Title || t("Guru & tenaga kependidikan", "Teachers & Staff")}
                    </h4>
                    <p className="text-[11px] sm:text-xs font-semibold text-slate-400 mt-0.5 leading-snug">
                      {appSettings.loginCardRole2Subtitle || t("Akses layanan sesuai kewenangan akun.", "Access services according to account authority.")}
                    </p>
                  </div>
                </div>
              </div>

              {/* Button: Buka Portal & Masuk Akun */}
              <button
                type="button"
                onClick={() => setIsLoginModalOpen(true)}
                className="w-full mt-6 h-12 rounded-xl text-white font-bold text-xs sm:text-sm px-5 flex items-center justify-between shadow-xs hover:shadow-md transition-all active:scale-[0.99] cursor-pointer border-none"
                style={{ backgroundColor: appSettings.primaryButtonColor || primaryColor || '#059669' }}
              >
                <span>{appSettings.loginCardButtonText || t("Buka Portal & Masuk Akun", "Open Portal & Sign In")}</span>
                <ArrowUpRight size={16} strokeWidth={2.4} />
              </button>

              {/* Sub notes */}
              <div className="mt-3.5 text-center">
                <p className="text-[11px] font-semibold text-slate-400">
                  {appSettings.loginCardFooterNote || t("Proses masuk dilanjutkan di sistem akademik sekolah.", "Sign in continues in the school academic system.")}
                </p>
                <button
                  type="button"
                  onClick={() => setShowPublicHelp(true)}
                  className="mt-1 text-xs font-bold underline transition-colors cursor-pointer bg-transparent border-none p-0 inline-block text-slate-700 hover:text-emerald-800"
                >
                  {appSettings.loginCardHelpText || t("Butuh bantuan akses akun?", "Need account access help?")}
                </button>
              </div>
            </div>
          </div>

        </div>

        {/* LAYANAN AKADEMIK SECTION */}
        <div id="layanan-akademik" className="shrink-0 mb-5 lg:mb-6 middle-layanan-section relative z-10 w-full scroll-mt-28">
          {/* 1. KARTU BESAR LAYANAN AKADEMIK (SPLIT DESKTOP DENGAN KARTU DI KANAN MENGISI RUANG KOSONG) */}
          <div className="bg-white rounded-3xl border border-slate-200/90 shadow-xs p-6 sm:p-8 lg:p-8 xl:p-9 w-full mb-0 relative z-10 text-left">
            <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 lg:gap-8">
              
              {/* Kolom Kiri: Judul, Subtitle, & Search Input */}
              <div className="w-full lg:w-72 xl:w-80 shrink-0 flex flex-col justify-between self-stretch">
                <div>
                  <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight leading-tight">
                    {t("Layanan akademik", "Academic Services")}
                  </h2>
                  <p className="text-xs sm:text-sm font-semibold text-slate-400 mt-1 leading-snug">
                    {t("Pilih layanan untuk melanjutkan aktivitasmu.", "Select a service to continue your activities.")}
                  </p>
                </div>

                {/* Search Bar Input */}
                <div className="w-full mt-4 lg:mt-6 relative">
                  <Search size={16} strokeWidth={2.4} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                  <input 
                    type="text" 
                    placeholder={t("Cari layanan: jadwal, materi, PKL...", "Search services: schedule, materials, internship...")} 
                    value={academicServiceQuery}
                    onChange={(e) => setAcademicServiceQuery(e.target.value)}
                    id="academic-service-search"
                    className="w-full h-11 pl-10 pr-10 bg-slate-50/70 border border-slate-200/80 rounded-xl text-xs sm:text-sm font-semibold text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[var(--ui-primary)]/15 focus:border-[var(--ui-primary)] focus:bg-white transition-all shadow-2xs"
                  />
                  {academicServiceQuery ? (
                    <button
                      type="button"
                      onClick={() => setAcademicServiceQuery('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 rounded cursor-pointer bg-transparent border-none"
                      title={t("Hapus pencarian", "Clear search")}
                    >
                      <X size={14} />
                    </button>
                  ) : (
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 px-1.5 py-0.5 rounded border border-slate-200 bg-white text-[11px] font-mono text-slate-400 shadow-2xs pointer-events-none">
                      /
                    </span>
                  )}
                </div>
              </div>

              {/* Kolom Kanan: 7 Kartu Layanan 1 Baris Minimalis Sesuai Mockup */}
              <div className="flex-1 w-full min-w-0 flex flex-col justify-center">
                {/* Grid 7 Layanan: Tepat 1 Baris di Layar Lebar (Ikon & Judul Bersih Tanpa Panah / Deskripsi) */}
                <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2.5 xl:gap-3 w-full">
                  {filteredAcademicServices.map((service) => {
                    const IconComp = service.icon;
                    const activeColor = service.customColor || service.defaultColor;

                    return (
                      <div
                        key={service.id}
                        onClick={() => {
                          if (service.isPdfRules) {
                            setShowRulesModal(true);
                          } else if (service.path) {
                            navigate(service.path);
                          }
                        }}
                        className="group rounded-2xl p-3 sm:p-3.5 flex flex-col items-center justify-center text-center min-h-[92px] lg:min-h-[98px] transition-all duration-200 cursor-pointer border select-none bg-white border-slate-200/90 hover:border-slate-300 shadow-2xs hover:shadow-xs hover:-translate-y-0.5"
                      >
                        {/* Ikon Layanan Berwarna */}
                        <div 
                          className="w-10 h-10 lg:w-11 lg:h-11 rounded-2xl flex items-center justify-center shrink-0 shadow-2xs group-hover:scale-105 transition-all duration-300"
                          style={{ 
                            backgroundColor: hexToRgba(activeColor, 0.08),
                            border: `1.5px solid ${hexToRgba(activeColor, 0.16)}`
                          }}
                        >
                          {service.customIcon ? (
                            <img src={service.customIcon} alt="" className="w-5.5 h-5.5 lg:w-6 lg:h-6 object-contain" />
                          ) : service.svgIcon ? (
                            <img src={`/icons/${service.svgIcon}`} alt="" className="w-5.5 h-5.5 lg:w-6 lg:h-6 object-contain" />
                          ) : (
                            <IconComp size={20} strokeWidth={2.2} style={{ color: activeColor }} />
                          )}
                        </div>

                        {/* Judul Layanan Saja */}
                        <h3 className="text-xs sm:text-[12.5px] font-black text-slate-800 tracking-tight leading-tight group-hover:text-[var(--ui-primary)] transition-colors mt-2 text-center truncate w-full">
                          {service.title}
                        </h3>
                      </div>
                    );
                  })}
                  {filteredAcademicServices.length === 0 && (
                    <div className="col-span-full py-8 text-center text-slate-400 font-semibold text-xs">
                      {t(`Tidak ada layanan akademik yang sesuai dengan "${academicServiceQuery}"`, `No academic services found matching "${academicServiceQuery}"`)}
                    </div>
                  )}
                </div>
              </div>

            </div>
          </div>
        </div>

        {/* JURUSAN / PROGRAM KEAHLIAN UNGGULAN (CLEAN MINIMALIST CARDS) */}
        <div className="shrink-0 mb-6 lg:mb-8 bottom-jurusan-section relative z-10">
          {/* 4 Clean Modern Cards Grid: Exactly 4 in 1 row */}
          <div className="grid grid-cols-4 gap-3.5 lg:gap-4.5 w-full">
            {[1, 2, 3, 4].map((idx) => {
              const name = appSettings[`partner${idx}`];
              if (!name) return null;

              const iconStr = appSettings[`partnerIcon${idx}`] || "book";
              const IconComponent = ICON_MAP[iconStr] || HelpCircle;
              const imageSrc = appSettings[`partnerImage${idx}`];
              const rawColor = appSettings[`partnerColor${idx}`];
              const desc = appSettings[`partnerDesc${idx}`];

              const styleInfo = getProgramSolidStyle(idx, rawColor);

              return (
                <div 
                  key={idx} 
                  className="group relative rounded-2xl p-3 sm:p-3.5 lg:p-4 bg-white border border-slate-200/80 hover:border-slate-300 shadow-xs hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 flex items-center gap-3 lg:gap-3.5 h-[80px] lg:h-[88px] w-full overflow-hidden cursor-pointer select-none text-slate-800 text-left"
                >
                  {/* Sisi Kiri: Logo Jurusan */}
                  <div className="w-10 h-10 lg:w-11 lg:h-11 rounded-xl bg-slate-50/90 border border-slate-200/70 p-1.5 flex items-center justify-center shrink-0 shadow-2xs group-hover:bg-white group-hover:border-slate-300 group-hover:scale-105 transition-all duration-300">
                    {imageSrc ? (
                      <img src={imageSrc} alt={name} loading="lazy" className="w-full h-full object-contain" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center" style={{ color: styleInfo.color }}>
                        <IconComponent size={20} strokeWidth={2.2} />
                      </div>
                    )}
                  </div>

                  {/* Sisi Kanan: Teks Judul & Subtitle */}
                  <div className="min-w-0 flex-1">
                    <h3 className="text-xs lg:text-[13px] font-black text-slate-900 tracking-tight leading-snug uppercase group-hover:text-[var(--ui-primary)] transition-colors truncate">
                      {name}
                    </h3>
                    <p className="text-[10px] lg:text-[11px] font-semibold text-slate-400 group-hover:text-slate-500 mt-0.5 truncate transition-colors">
                      {desc || styleInfo.tagline}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* MITRA & KERJASAMA (Clean Spacious Borderless Marquee) */}
        {appSettings.mitraKerjasama && appSettings.mitraKerjasama.length > 0 && (
          <div className="shrink-0 mb-6 lg:mb-8 mitra-kerjasama-section relative z-10">
            <div className="bg-white/90 backdrop-blur-md rounded-[var(--ui-radius-card)] shadow-xs py-2.5 lg:py-3 px-6 md:px-8 w-full flex items-center gap-5">
              <span className="text-[10px] lg:text-[10.5px] font-black text-slate-400 uppercase tracking-wider shrink-0 whitespace-nowrap">
                {t("Mitra Industri & Kerjasama", "Industry & Educational Partners")}
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

        {/* BANNER KESULITAN MENGAKSES SISTEM? (BANTUAN) - PINDAH KE BAWAH DI ATAS FOOTER */}
        <div id="bantuan" className="shrink-0 mb-8 lg:mb-10 w-full relative z-10 text-left scroll-mt-28">
          <div 
            className="text-white rounded-3xl p-6 sm:p-8 lg:p-9 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 shadow-md w-full overflow-hidden"
            style={{ 
              backgroundColor: appSettings.supportBannerBgColor || (primaryColor ? `color-mix(in srgb, ${primaryColor} 82%, #000000)` : '#153f32') 
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
                backgroundColor: appSettings.actionButtonColor || accentColor || '#c8ed69',
                color: primaryColor ? `color-mix(in srgb, ${primaryColor} 90%, #000000)` : '#153f32'
              }}
            >
              <span>{appSettings.helpBannerButtonText || t("Panduan & Bantuan", "Guide & Support")}</span>
              <ArrowUpRight size={15} strokeWidth={2.8} />
            </button>
          </div>
        </div>

      </div>

      {/* DESKTOP FOOTER */}
      <PublicFooter
        appSettings={appSettings}
        schoolProfile={appSettings?.schoolProfile}
        setIsLoginModalOpen={setIsLoginModalOpen}
        setShowPublicHelp={setShowPublicHelp}
        lang={activeLang}
      />

            {/* Mobile Bottom Action Bar (Satu-satunya Bar Tombol Aksi di Bawah - Full Putih Bersih) */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-[40] bg-white px-5 pt-3 pb-[max(1.25rem,calc(env(safe-area-inset-bottom,0px)+1rem))] select-none">
        <div className="w-full max-w-md mx-auto flex items-center gap-3">
          {/* Tombol Pertama: Masuk Sekarang (Hijau solid #3DAA37 sesuai gambar user, flex-1, teks putih tebal, rounded-xl) */}
          <button
            type="button"
            onClick={() => setIsLoginModalOpen(true)}
            style={{ backgroundColor: '#3DAA37' }}
            className="flex-1 h-[50px] sm:h-[54px] rounded-xl text-white font-extrabold text-sm sm:text-base tracking-wide shadow-md shadow-green-950/20 flex items-center justify-center transition-all active:scale-[0.98] hover:bg-[#34942f] cursor-pointer border-none"
          >
            Masuk Sekarang
          </button>

          {/* Tombol Kedua: Kotak Persegi rounded-xl, warna hijau solid #3DAA37 sama, ikon Bantuan (Membuka Bottom Sheet) */}
          <button
            type="button"
            onClick={() => setShowPublicHelp(true)}
            title="Bantuan & Panduan"
            style={{ backgroundColor: '#3DAA37' }}
            className="w-[50px] h-[50px] sm:w-[54px] sm:h-[54px] shrink-0 rounded-xl text-white shadow-md shadow-green-950/20 flex items-center justify-center transition-all active:scale-[0.98] hover:bg-[#34942f] cursor-pointer border-none"
          >
            <HelpCircle size={23} strokeWidth={2.3} />
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
        lang={activeLang}
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
