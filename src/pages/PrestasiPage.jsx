import { useState, useEffect, useMemo, useCallback } from 'react';
import { useOutletContext } from 'react-router-dom';
import { 
  Trophy, Award, Medal, Calendar, Building2, Search, Share2, 
  X, CheckCircle2, GraduationCap, Crown, Globe, ChevronRight
} from 'lucide-react';

export default function PrestasiPage() {
  const context = useOutletContext() || {};
  const appSettings = context.appSettings || {};

  const [prestasiList, setPrestasiList] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterTingkat, setFilterTingkat] = useState("all");
  const [filterTahun, setFilterTahun] = useState("all");
  const [sortBy, setSortBy] = useState("terbaru"); // 'terbaru' | 'terlama' | 'juara'
  const [selectedPrestasi, setSelectedPrestasi] = useState(null);
  const [copySuccess, setCopySuccess] = useState(false);

  // Language support
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

  // Fetch Public Prestasi Data
  const fetchPrestasi = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/public/prestasi");
      const json = await res.json();
      if (json.ok && Array.isArray(json.data)) {
        setPrestasiList(json.data);
      } else {
        // Fallback to kesiswaan public endpoint
        const fbRes = await fetch("/api/kesiswaan/prestasi/public");
        const fbJson = await fbRes.json();
        if (fbJson.ok && Array.isArray(fbJson.data)) {
          setPrestasiList(fbJson.data);
        }
      }
    } catch (err) {
      console.error("Gagal memuat galeri prestasi siswa:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPrestasi();
  }, [fetchPrestasi]);

  // Extract available years for filter
  const availableYears = useMemo(() => {
    const years = new Set();
    prestasiList.forEach(item => {
      if (item.tanggal_prestasi) {
        const y = String(item.tanggal_prestasi).slice(0, 4);
        if (y && !isNaN(Number(y))) years.add(y);
      }
    });
    return Array.from(years).sort((a, b) => Number(b) - Number(a));
  }, [prestasiList]);

  // KPI Mini Stats
  const stats = useMemo(() => {
    const total = prestasiList.length;
    const nasionalIntl = prestasiList.filter(p => {
      const tLower = String(p.tingkat || '').toLowerCase();
      return tLower.includes('nasional') || tLower.includes('internasional');
    }).length;
    const juaraSatu = prestasiList.filter(p => {
      const rLower = String(p.peringkat || '').toLowerCase();
      return rLower.includes('juara 1') || rLower.includes('emas') || rLower.includes('gold') || rLower.includes('pertama');
    }).length;
    const currentYear = new Date().getFullYear().toString();
    const tahunIni = prestasiList.filter(p => String(p.tanggal_prestasi || '').startsWith(currentYear)).length;

    return { total, nasionalIntl, juaraSatu, tahunIni };
  }, [prestasiList]);

  // Filter & Sort
  const filteredPrestasi = useMemo(() => {
    return prestasiList.filter(item => {
      // Search match
      const q = searchQuery.toLowerCase().trim();
      const matchSearch = !q || (
        (item.nama_prestasi && item.nama_prestasi.toLowerCase().includes(q)) ||
        (item.nama_siswa && item.nama_siswa.toLowerCase().includes(q)) ||
        (item.penyelenggara && item.penyelenggara.toLowerCase().includes(q)) ||
        (item.kelas && item.kelas.toLowerCase().includes(q)) ||
        (item.peringkat && item.peringkat.toLowerCase().includes(q)) ||
        (item.keterangan && item.keterangan.toLowerCase().includes(q))
      );

      // Tingkat match
      const matchTingkat = filterTingkat === 'all' || 
        String(item.tingkat || '').toLowerCase() === filterTingkat.toLowerCase();

      // Tahun match
      const itemYear = item.tanggal_prestasi ? String(item.tanggal_prestasi).slice(0, 4) : '';
      const matchTahun = filterTahun === 'all' || itemYear === filterTahun;

      return matchSearch && matchTingkat && matchTahun;
    }).sort((a, b) => {
      if (sortBy === 'terlama') {
        return new Date(a.tanggal_prestasi || 0) - new Date(b.tanggal_prestasi || 0);
      }
      if (sortBy === 'juara') {
        const getScore = (p) => {
          const r = String(p.peringkat || '').toLowerCase();
          if (r.includes('juara 1') || r.includes('emas') || r.includes('gold')) return 1;
          if (r.includes('juara 2') || r.includes('perak') || r.includes('silver')) return 2;
          if (r.includes('juara 3') || r.includes('perunggu') || r.includes('bronze')) return 3;
          if (r.includes('harapan 1')) return 4;
          if (r.includes('harapan 2')) return 5;
          return 9;
        };
        return getScore(a) - getScore(b);
      }
      // default: 'terbaru'
      return new Date(b.tanggal_prestasi || 0) - new Date(a.tanggal_prestasi || 0);
    });
  }, [prestasiList, searchQuery, filterTingkat, filterTahun, sortBy]);

  // Helper for rank badge styling
  const getRankBadgeProps = (peringkat = '') => {
    const p = peringkat.toLowerCase();
    if (p.includes('juara 1') || p.includes('emas') || p.includes('gold') || p.includes('pertama')) {
      return {
        bg: 'bg-amber-500 text-white shadow-2xs',
        icon: Crown,
        label: peringkat || 'Juara 1'
      };
    }
    if (p.includes('juara 2') || p.includes('perak') || p.includes('silver') || p.includes('kedua')) {
      return {
        bg: 'bg-slate-600 text-white shadow-2xs',
        icon: Medal,
        label: peringkat || 'Juara 2'
      };
    }
    if (p.includes('juara 3') || p.includes('perunggu') || p.includes('bronze') || p.includes('ketiga')) {
      return {
        bg: 'bg-amber-700 text-white shadow-2xs',
        icon: Medal,
        label: peringkat || 'Juara 3'
      };
    }
    return {
      bg: 'bg-slate-100 text-slate-700 border border-slate-200/80',
      icon: Award,
      label: peringkat || 'Penghargaan'
    };
  };

  // Helper for tingkat badge styling
  const getTingkatBadgeProps = (tingkat = '') => {
    const tLower = tingkat.toLowerCase();
    if (tLower.includes('internasional')) {
      return 'bg-purple-50 text-purple-700 border-purple-200/70';
    }
    if (tLower.includes('nasional')) {
      return 'bg-emerald-50 text-emerald-700 border-emerald-200/70';
    }
    if (tLower.includes('provinsi')) {
      return 'bg-sky-50 text-sky-700 border-sky-200/70';
    }
    if (tLower.includes('kota') || tLower.includes('kabupaten')) {
      return 'bg-amber-50 text-amber-700 border-amber-200/70';
    }
    return 'bg-slate-50 text-slate-700 border-slate-200/70';
  };

  // Format date helper
  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      return d.toLocaleDateString(activeLang === 'EN' ? 'en-US' : 'id-ID', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      });
    } catch {
      return dateStr;
    }
  };

  // Copy shareable link
  const handleShare = (item) => {
    const shareUrl = `${window.location.origin}/prestasi?id=${item.id}`;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(shareUrl).then(() => {
        setCopySuccess(true);
        setTimeout(() => setCopySuccess(false), 2500);
      });
    }
  };

  const tingkatOptions = [
    { value: 'all', label: t('Semua Tingkat', 'All Levels') },
    { value: 'Internasional', label: t('Internasional', 'International') },
    { value: 'Nasional', label: t('Nasional', 'National') },
    { value: 'Provinsi', label: t('Provinsi', 'Provincial') },
    { value: 'Kabupaten/Kota', label: t('Kota / Kab', 'City / District') },
    { value: 'Sekolah', label: t('Sekolah', 'School Level') }
  ];

  return (
    <div className="w-full flex flex-col gap-6 select-none animate-in fade-in duration-300 pb-16">
      
      {/* ── HERO HEADER CARD (SEJAJAR PERSIS DENGAN NAVBAR & BEBAS DARI BOX PILL BERLEBIHAN) ── */}
      <div className="relative overflow-hidden bg-white rounded-[var(--ui-radius-card,24px)] p-6 sm:p-8 border border-slate-200/90 shadow-2xs">
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          
          {/* Header Title & Subtitle (Desktop only, mobile title is in top bar) */}
          <div className="hidden md:block max-w-2xl">
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-slate-900 tracking-tight leading-tight">
              {t("Prestasi Siswa", "Student Achievements")}
            </h1>
            
            <p className="text-sm sm:text-base text-slate-600 font-medium mt-2 leading-relaxed">
              {t(
                `Galeri apresiasi rekam jejak capaian kejuaraan siswa-siswi ${appSettings.appName || 'Sekolah'} di tingkat kota, provinsi, nasional, hingga internasional.`,
                `Showcase and hall of fame celebrating verified student championships and honors from city to international competitions.`
              )}
            </p>
          </div>

          {/* KPI Mini Stat Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-2 gap-3 shrink-0">
            {/* Stat 1: Total Prestasi */}
            <div className="bg-slate-50/80 rounded-2xl p-3.5 border border-slate-200/80 shadow-2xs flex flex-col justify-center">
              <div className="flex items-center gap-1.5 mb-1" style={{ color: 'var(--ui-primary, #059669)' }}>
                <Trophy size={16} strokeWidth={2.5} />
                <span className="text-[11px] font-black uppercase tracking-wider text-slate-500">
                  {t("Total Prestasi", "Total Awards")}
                </span>
              </div>
              <span className="text-xl sm:text-2xl font-black text-slate-900 leading-none">
                {stats.total} <span className="text-xs font-bold text-slate-500">{t("Kejuaraan", "Awards")}</span>
              </span>
            </div>

            {/* Stat 2: Juara 1 / Emas */}
            <div className="bg-slate-50/80 rounded-2xl p-3.5 border border-slate-200/80 shadow-2xs flex flex-col justify-center">
              <div className="flex items-center gap-1.5 text-amber-600 mb-1">
                <Crown size={16} strokeWidth={2.5} />
                <span className="text-[11px] font-black uppercase tracking-wider text-slate-500">
                  {t("Juara 1 / Emas", "1st Place")}
                </span>
              </div>
              <span className="text-xl sm:text-2xl font-black text-slate-900 leading-none">
                {stats.juaraSatu} <span className="text-xs font-bold text-slate-500">{t("Gelar", "Titles")}</span>
              </span>
            </div>

            {/* Stat 3: Nasional & Internasional */}
            <div className="bg-slate-50/80 rounded-2xl p-3.5 border border-slate-200/80 shadow-2xs flex flex-col justify-center">
              <div className="flex items-center gap-1.5 text-sky-600 mb-1">
                <Globe size={16} strokeWidth={2.5} />
                <span className="text-[11px] font-black uppercase tracking-wider text-slate-500">
                  {t("Nasional & Intl", "National & Intl")}
                </span>
              </div>
              <span className="text-xl sm:text-2xl font-black text-slate-900 leading-none">
                {stats.nasionalIntl} <span className="text-xs font-bold text-slate-500">{t("Ajang", "Events")}</span>
              </span>
            </div>

            {/* Stat 4: Prestasi Tahun Ini */}
            <div className="bg-slate-50/80 rounded-2xl p-3.5 border border-slate-200/80 shadow-2xs flex flex-col justify-center">
              <div className="flex items-center gap-1.5 text-indigo-600 mb-1">
                <Calendar size={16} strokeWidth={2.5} />
                <span className="text-[11px] font-black uppercase tracking-wider text-slate-500">
                  {t("Tahun Berjalan", "This Year")}
                </span>
              </div>
              <span className="text-xl sm:text-2xl font-black text-slate-900 leading-none">
                {stats.tahunIni} <span className="text-xs font-bold text-slate-500">{t("Tercatat", "Recorded")}</span>
              </span>
            </div>
          </div>

        </div>
      </div>

      {/* ── FILTER & SEARCH SECTION ── */}
      <div className="bg-white rounded-[var(--ui-radius-card,24px)] p-4 sm:p-5 border border-slate-200/90 shadow-2xs flex flex-col gap-4">
        
        {/* Top: Search & Select Dropdowns */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3 justify-between">
          
          {/* Search Box */}
          <div className="relative flex-1">
            <Search 
              size={18} 
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" 
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t(
                "Cari nama siswa, cabang kompetisi, penyelenggara...", 
                "Search student name, competition title, organizer..."
              )}
              className="w-full h-11 pl-10 pr-10 bg-slate-50 hover:bg-slate-100/70 focus:bg-white rounded-xl text-xs sm:text-sm font-semibold text-slate-800 placeholder-slate-400 border border-slate-200/80 focus:border-[var(--ui-primary,#059669)] focus:outline-none transition-all shadow-2xs"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 w-6 h-6 flex items-center justify-center rounded-full bg-slate-200/80 hover:bg-slate-300 text-slate-600 cursor-pointer border-none transition-all"
                title="Hapus pencarian"
              >
                <X size={13} strokeWidth={2.5} />
              </button>
            )}
          </div>

          {/* Dropdown Filters (Tahun & Urutan) */}
          <div className="flex items-center gap-2.5 shrink-0">
            {/* Filter Tahun */}
            {availableYears.length > 0 && (
              <select
                value={filterTahun}
                onChange={(e) => setFilterTahun(e.target.value)}
                className="h-11 px-3.5 bg-slate-50 hover:bg-slate-100/70 text-slate-700 font-bold text-xs rounded-xl border border-slate-200/80 focus:border-[var(--ui-primary,#059669)] focus:outline-none transition-all shadow-2xs cursor-pointer"
                title="Filter Tahun"
              >
                <option value="all">{t("Semua Tahun", "All Years")}</option>
                {availableYears.map(y => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            )}

            {/* Sorting */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="h-11 px-3.5 bg-slate-50 hover:bg-slate-100/70 text-slate-700 font-bold text-xs rounded-xl border border-slate-200/80 focus:border-[var(--ui-primary,#059669)] focus:outline-none transition-all shadow-2xs cursor-pointer"
              title="Urutkan"
            >
              <option value="terbaru">{t("Terbaru", "Newest")}</option>
              <option value="terlama">{t("Terlama", "Oldest")}</option>
              <option value="juara">{t("Juara Tertinggi", "Top Ranks")}</option>
            </select>
          </div>
        </div>

        {/* Bottom: Tingkat Filter Segmented Control Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 pt-1 no-scrollbar border-t border-slate-100">
          {tingkatOptions.map(opt => {
            const isActive = filterTingkat === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => setFilterTingkat(opt.value)}
                style={{
                  backgroundColor: isActive ? 'var(--ui-primary, #059669)' : undefined,
                  color: isActive ? '#ffffff' : undefined
                }}
                className={`h-8 px-3.5 rounded-lg text-xs font-bold shrink-0 transition-all cursor-pointer border-none ${
                  isActive
                    ? 'shadow-xs font-extrabold'
                    : 'bg-slate-100 hover:bg-slate-200/80 text-slate-600'
                }`}
              >
                {opt.label}
              </button>
            );
          })}
        </div>

      </div>

      {/* ── CARD GRID GALLERY OF ACHIEVEMENTS ── */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} className="bg-white rounded-[var(--ui-radius-card,24px)] p-6 border border-slate-200/80 shadow-2xs animate-pulse flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <div className="h-5 w-24 bg-slate-100 rounded-md" />
                <div className="h-6 w-20 bg-slate-100 rounded-md" />
              </div>
              <div className="h-6 w-3/4 bg-slate-100 rounded-md" />
              <div className="space-y-2 mt-2">
                <div className="h-4 w-full bg-slate-100 rounded" />
                <div className="h-4 w-2/3 bg-slate-100 rounded" />
              </div>
            </div>
          ))}
        </div>
      ) : filteredPrestasi.length === 0 ? (
        <div className="bg-white rounded-[var(--ui-radius-card,24px)] p-12 border border-slate-200/90 shadow-2xs text-center flex flex-col items-center justify-center max-w-lg mx-auto w-full">
          <div className="w-16 h-16 rounded-2xl bg-amber-50 border border-amber-200/60 flex items-center justify-center text-amber-600 mb-4 shadow-2xs">
            <Trophy size={32} strokeWidth={2} />
          </div>
          <h3 className="text-lg font-black text-slate-800">
            {t("Belum Ada Prestasi Ditemukan", "No Achievements Found")}
          </h3>
          <p className="text-xs sm:text-sm font-medium text-slate-500 mt-1.5 max-w-sm">
            {searchQuery || filterTingkat !== 'all' || filterTahun !== 'all'
              ? t("Coba sesuaikan kata kunci pencarian atau filter tingkat yang Anda pilih.", "Try adjusting your search terms or level filters.")
              : t("Data rekam jejak prestasi siswa akan diperbarui secara berkala oleh tim kesiswaan.", "Student achievement records will be updated regularly by the student affairs team.")
            }
          </p>
          {(searchQuery || filterTingkat !== 'all' || filterTahun !== 'all') && (
            <button
              type="button"
              onClick={() => {
                setSearchQuery("");
                setFilterTingkat("all");
                setFilterTahun("all");
              }}
              style={{ backgroundColor: 'var(--ui-primary, #059669)' }}
              className="mt-5 h-9 px-4 rounded-xl text-white text-xs font-bold shadow-xs hover:opacity-90 transition-all cursor-pointer border-none"
            >
              {t("Reset Semua Filter", "Reset Filters")}
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredPrestasi.map((item) => {
            const rankProps = getRankBadgeProps(item.peringkat);
            const tingkatClass = getTingkatBadgeProps(item.tingkat);
            const RankIcon = rankProps.icon;

            return (
              <div 
                key={item.id}
                className="bg-white rounded-[var(--ui-radius-card,24px)] p-5 sm:p-6 border border-slate-200/90 shadow-2xs hover:shadow-sm hover:border-slate-300 transition-all duration-200 flex flex-col justify-between group"
              >
                <div>
                  {/* Top Badges Row: Tingkat & Juara */}
                  <div className="flex items-center justify-between gap-2 mb-3.5">
                    {/* Tingkat Badge Pill */}
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10.5px] font-black uppercase tracking-wider border ${tingkatClass}`}>
                      <span className="w-1.5 h-1.5 rounded-full bg-current opacity-70" />
                      {item.tingkat || 'Sekolah'}
                    </span>

                    {/* Juara Badge Pill */}
                    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-black tracking-tight ${rankProps.bg}`}>
                      <RankIcon size={13} strokeWidth={2.5} />
                      <span>{rankProps.label}</span>
                    </span>
                  </div>

                  {/* Competition Title */}
                  <h3 className="text-base sm:text-lg font-black text-slate-900 group-hover:text-[var(--ui-primary,#059669)] transition-colors leading-snug line-clamp-2">
                    {item.nama_prestasi}
                  </h3>

                  {/* Student Info Cardlet */}
                  <div className="mt-4 p-3 rounded-2xl bg-slate-50/80 border border-slate-100 flex items-center gap-3">
                    <div 
                      className="w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm text-white shrink-0 shadow-2xs"
                      style={{ 
                        backgroundColor: appSettings.primaryColor || '#059669'
                      }}
                    >
                      {item.nama_siswa ? item.nama_siswa.charAt(0).toUpperCase() : 'S'}
                    </div>

                    <div className="flex flex-col min-w-0 flex-1">
                      <span className="text-xs sm:text-[13px] font-black text-slate-800 truncate">
                        {item.nama_siswa || t("Siswa Berprestasi", "Achiever Student")}
                      </span>
                      <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-500 mt-0.5">
                        <GraduationCap size={13} className="shrink-0 text-slate-400" />
                        <span className="truncate">{item.kelas || '-'}</span>
                        {item.jurusan && item.jurusan !== '-' && (
                          <>
                            <span className="text-slate-300">•</span>
                            <span className="truncate text-slate-600">{item.jurusan}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Metadata: Penyelenggara & Tanggal */}
                  <div className="mt-4 flex flex-col gap-2 text-xs font-medium text-slate-600">
                    {item.penyelenggara && (
                      <div className="flex items-center gap-2">
                        <Building2 size={14} className="shrink-0 text-slate-400" />
                        <span className="truncate font-semibold text-slate-700">{item.penyelenggara}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-2">
                      <Calendar size={14} className="shrink-0 text-slate-400" />
                      <span className="font-semibold text-slate-600">{formatDate(item.tanggal_prestasi)}</span>
                    </div>
                  </div>

                  {/* Keterangan Tambahan jika ada */}
                  {item.keterangan && (
                    <p className="mt-3 text-xs text-slate-500 font-medium italic line-clamp-2 leading-relaxed bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                      "{item.keterangan}"
                    </p>
                  )}
                </div>

                {/* Card Action Footer */}
                <div className="mt-5 pt-3.5 border-t border-slate-100 flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedPrestasi(item)}
                    className="flex items-center gap-1 text-xs font-bold text-[var(--ui-primary,#059669)] hover:opacity-80 transition-all cursor-pointer bg-transparent border-none p-0"
                  >
                    <span>{t("Lihat Rincian", "View Details")}</span>
                    <ChevronRight size={14} strokeWidth={2.5} />
                  </button>

                  <button
                    type="button"
                    onClick={() => handleShare(item)}
                    className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 active:scale-95 text-slate-600 flex items-center justify-center transition-all cursor-pointer border-none shadow-2xs"
                    title={t("Salin tautan prestasi ini", "Copy share link")}
                  >
                    <Share2 size={13} strokeWidth={2.4} />
                  </button>
                </div>

              </div>
            );
          })}
        </div>
      )}

      {/* ── DETAIL MODAL POPUP ── */}
      {selectedPrestasi && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-[var(--ui-radius-card,24px)] max-w-lg w-full p-6 sm:p-7 border border-slate-200/90 shadow-xl relative animate-in zoom-in-95 duration-200 flex flex-col gap-5">
            
            {/* Modal Header */}
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div 
                  className="w-10 h-10 rounded-2xl flex items-center justify-center text-white shadow-2xs shrink-0"
                  style={{ backgroundColor: appSettings.primaryColor || '#059669' }}
                >
                  <Trophy size={20} strokeWidth={2.4} />
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-900 leading-tight">
                    {t("Rincian Prestasi", "Achievement Details")}
                  </h3>
                  <span className="text-[11px] font-bold text-slate-500">
                    ID #{selectedPrestasi.id} • {t("Terverifikasi Sekolah", "School Verified")}
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelectedPrestasi(null)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition-all cursor-pointer border-none shrink-0"
                title="Tutup"
              >
                <X size={16} strokeWidth={2.5} />
              </button>
            </div>

            {/* Modal Content */}
            <div className="space-y-4 text-left">
              {/* Badges */}
              <div className="flex items-center gap-2 flex-wrap">
                <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider border ${getTingkatBadgeProps(selectedPrestasi.tingkat)}`}>
                  {selectedPrestasi.tingkat || 'Sekolah'}
                </span>
                <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-black ${getRankBadgeProps(selectedPrestasi.peringkat).bg}`}>
                  <Award size={13} strokeWidth={2.5} />
                  <span>{selectedPrestasi.peringkat || 'Penghargaan'}</span>
                </span>
              </div>

              {/* Title */}
              <div>
                <span className="text-[11px] font-black uppercase tracking-wider text-slate-400">
                  {t("Nama Kejuaraan / Kompetisi", "Competition Title")}
                </span>
                <h4 className="text-base sm:text-lg font-black text-slate-900 mt-0.5 leading-snug">
                  {selectedPrestasi.nama_prestasi}
                </h4>
              </div>

              {/* Student Profile */}
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/70">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                  {t("Siswa Peraih Prestasi", "Honored Student")}
                </span>
                <div className="mt-1 flex items-center gap-3">
                  <div 
                    className="w-9 h-9 rounded-xl flex items-center justify-center font-black text-white shrink-0 shadow-2xs"
                    style={{ backgroundColor: appSettings.primaryColor || '#059669' }}
                  >
                    {selectedPrestasi.nama_siswa ? selectedPrestasi.nama_siswa.charAt(0).toUpperCase() : 'S'}
                  </div>
                  <div className="flex flex-col min-w-0 flex-1">
                    <span className="text-sm font-black text-slate-900">
                      {selectedPrestasi.nama_siswa}
                    </span>
                    <span className="text-xs font-bold text-slate-500">
                      {selectedPrestasi.kelas} {selectedPrestasi.jurusan && selectedPrestasi.jurusan !== '-' ? `• ${selectedPrestasi.jurusan}` : ''}
                    </span>
                  </div>
                </div>
              </div>

              {/* Details grid */}
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 flex flex-col">
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                    {t("Penyelenggara", "Organizer")}
                  </span>
                  <span className="font-bold text-slate-800 mt-1">
                    {selectedPrestasi.penyelenggara || '-'}
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 flex flex-col">
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                    {t("Tanggal", "Date")}
                  </span>
                  <span className="font-bold text-slate-800 mt-1">
                    {formatDate(selectedPrestasi.tanggal_prestasi)}
                  </span>
                </div>
              </div>

              {/* Keterangan */}
              {selectedPrestasi.keterangan && (
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                    {t("Keterangan Tambahan", "Notes")}
                  </span>
                  <p className="text-xs font-medium text-slate-700 mt-1 leading-relaxed">
                    {selectedPrestasi.keterangan}
                  </p>
                </div>
              )}
            </div>

            {/* Modal Actions */}
            <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => handleShare(selectedPrestasi)}
                className="h-10 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-extrabold flex items-center gap-2 transition-all cursor-pointer border-none shadow-2xs"
              >
                <Share2 size={14} strokeWidth={2.4} />
                <span>{copySuccess ? t("Tautan Disalin!", "Link Copied!") : t("Bagikan", "Share")}</span>
              </button>

              <button
                type="button"
                onClick={() => setSelectedPrestasi(null)}
                style={{ backgroundColor: appSettings.primaryColor || '#059669' }}
                className="h-10 px-5 rounded-xl text-white text-xs font-extrabold shadow-xs hover:opacity-90 transition-all cursor-pointer border-none"
              >
                {t("Tutup", "Close")}
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Copy Toast Alert */}
      {copySuccess && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-4 py-3 rounded-2xl shadow-xl flex items-center gap-2.5 text-xs font-extrabold animate-in slide-in-from-bottom-3 duration-200">
          <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />
          <span>{t("Tautan galeri prestasi berhasil disalin ke clipboard!", "Achievement link copied to clipboard!")}</span>
        </div>
      )}

    </div>
  );
}

