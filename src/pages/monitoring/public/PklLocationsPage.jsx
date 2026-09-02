import React, { useState, useEffect, useMemo, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { subscribeDatabaseSnapshot } from '../../../utils/dataSource.js';
import { loadInitialState } from '../../../utils/state.js';
import { 
  MapPin, 
  Map as MapIcon, 
  Grid, 
  Search, 
  Users, 
  Building2, 
  Phone, 
  Globe, 
  Navigation, 
  ExternalLink, 
  ShieldCheck, 
  Briefcase, 
  X, 
  RotateCcw, 
  Sparkles,
  CheckCircle2,
  Layers,
  ArrowUpRight,
  Filter
} from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import { CustomSelect } from '../../../components/CustomSelect.jsx';

// Fix Leaflet default marker icons for Webpack/Vite
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

// Color mapping for jurusan / bidang
const JURUSAN_COLORS = {
  RPL: '#0284C7', // Sky Blue
  TKJ: '#3DAA37', // Vivid Green
  TKR: '#D97706', // Amber
  TBSM: '#E11D48', // Rose
  Akuntansi: '#7C3AED', // Purple
  DKV: '#DB2777', // Pink
  Umum: '#059669', // Emerald
};

const getJurusanColor = (jurusanStr = '') => {
  const upper = String(jurusanStr).toUpperCase();
  if (upper.includes('RPL') || upper.includes('SOFTWARE') || upper.includes('IT')) return JURUSAN_COLORS.RPL;
  if (upper.includes('TKJ') || upper.includes('JARINGAN')) return JURUSAN_COLORS.TKJ;
  if (upper.includes('TKR') || upper.includes('OTOMOTIF') || upper.includes('KENDARAAN')) return JURUSAN_COLORS.TKR;
  if (upper.includes('TBSM') || upper.includes('MOTOR')) return JURUSAN_COLORS.TBSM;
  if (upper.includes('AKUNTANSI') || upper.includes('KEUANGAN')) return JURUSAN_COLORS.Akuntansi;
  if (upper.includes('DKV') || upper.includes('DESAIN')) return JURUSAN_COLORS.DKV;
  return JURUSAN_COLORS.Umum;
};

// Custom modern SVG pin icon generator
const createModernIcon = (color, isSelected = false) => L.divIcon({
  className: 'custom-leaflet-marker',
  html: `
    <div style="
      position: relative;
      width: ${isSelected ? '38px' : '32px'};
      height: ${isSelected ? '38px' : '32px'};
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      cursor: pointer;
    ">
      <div style="
        width: 100%;
        height: 100%;
        border-radius: 50% 50% 50% 0;
        background: ${color || '#3DAA37'};
        transform: rotate(-45deg);
        border: 2.5px solid #ffffff;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        display: flex;
        align-items: center;
        justify-content: center;
      ">
        <div style="
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: #ffffff;
          transform: rotate(45deg);
        "></div>
      </div>
      ${isSelected ? `
        <div style="
          position: absolute;
          inset: -4px;
          border-radius: 50%;
          border: 2px solid ${color || '#3DAA37'};
          animation: ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite;
          opacity: 0.7;
        "></div>
      ` : ''}
    </div>
  `,
  iconSize: isSelected ? [38, 38] : [32, 32],
  iconAnchor: isSelected ? [19, 38] : [16, 32],
  popupAnchor: [0, -32],
});

// Helper component for smooth map camera fly-to
function MapFlyController({ targetCoord, zoomLevel }) {
  const map = useMap();
  useEffect(() => {
    if (targetCoord && targetCoord[0] && targetCoord[1]) {
      map.flyTo(targetCoord, zoomLevel || 15, {
        animate: true,
        duration: 1.2
      });
    }
  }, [targetCoord, zoomLevel, map]);
  return null;
}

export default function PklLocationsPublicPage() {
  const [locations, setLocations] = useState([]);
  const [search, setSearch] = useState('');
  const [selectedJurusan, setSelectedJurusan] = useState('ALL');
  const [selectedKota, setSelectedKota] = useState('ALL');
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState('map'); // 'map' | 'grid' | 'split'
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [mapCenter, setMapCenter] = useState([-6.2618, 107.0005]);
  const [mapZoom, setMapZoom] = useState(12);
  const [dataVersion, setDataVersion] = useState(0);

  useEffect(() => subscribeDatabaseSnapshot(() => setDataVersion((v) => v + 1)), []);

  const appSettings = useMemo(() => {
    void dataVersion;
    const defaults = {
      primaryColor: '#064e3b',
      accentColor: '#3DAA37',
      appName: 'SMK Karya Guna 2',
    };
    return { ...defaults, ...loadInitialState('appSettings', defaults) };
  }, [dataVersion]);

  // Fetch verified & active PKL locations from API
  useEffect(() => {
    fetch('/api/monitoring/lokasi-pkl/public')
      .then((r) => r.ok ? r.json() : Promise.reject(r))
      .then((data) => {
        const dbData = Array.isArray(data?.data) ? data.data : [];
        setLocations(dbData);
        // Automatically focus map on first location with coordinates
        const firstWithCoords = dbData.find(l => parseFloat(l.lat) && parseFloat(l.lng));
        if (firstWithCoords) {
          setMapCenter([parseFloat(firstWithCoords.lat), parseFloat(firstWithCoords.lng)]);
        }
      })
      .catch(() => setLocations([]))
      .finally(() => setLoading(false));
  }, []);

  // Extract unique cities & majors for filter chips
  const uniqueKotas = useMemo(() => {
    const kotas = new Set();
    locations.forEach(loc => {
      if (loc.kota) kotas.add(loc.kota.trim());
    });
    return Array.from(kotas).sort();
  }, [locations]);

  const uniqueJurusans = useMemo(() => {
    const jurusans = new Set();
    locations.forEach(loc => {
      const raw = loc.jurusan || loc.bidang || '';
      raw.split(',').forEach(j => {
        const trimmed = j.trim();
        if (trimmed) jurusans.add(trimmed);
      });
    });
    return Array.from(jurusans).sort();
  }, [locations]);

  // Filtered list
  const filtered = useMemo(() => {
    return locations.filter((loc) => {
      const q = search.toLowerCase().trim();
      const nama = (loc.nama_perusahaan || loc.nama || '').toLowerCase();
      const bidang = (loc.bidang || '').toLowerCase();
      const jurusan = (loc.jurusan || '').toLowerCase();
      const alamat = (loc.alamat || '').toLowerCase();
      const kota = (loc.kota || '').toLowerCase();

      // Text search match
      const matchesSearch = !q || nama.includes(q) || bidang.includes(q) || jurusan.includes(q) || alamat.includes(q) || kota.includes(q);

      // Jurusan match
      const matchesJurusan = selectedJurusan === 'ALL' || jurusan.includes(selectedJurusan.toLowerCase()) || bidang.includes(selectedJurusan.toLowerCase());

      // Kota match
      const matchesKota = selectedKota === 'ALL' || kota === selectedKota.toLowerCase();

      return matchesSearch && matchesJurusan && matchesKota;
    });
  }, [locations, search, selectedJurusan, selectedKota]);

  // Filtered with valid coordinates
  const filteredWithCoords = useMemo(() => {
    return filtered.filter(loc => {
      const lat = parseFloat(loc.lat);
      const lng = parseFloat(loc.lng);
      return !isNaN(lat) && !isNaN(lng) && lat !== 0 && lng !== 0;
    });
  }, [filtered]);

  // KPI Statistics
  const stats = useMemo(() => {
    const totalDudi = locations.length;
    const totalKuota = locations.reduce((sum, l) => sum + (parseInt(l.kuota) || 0), 0);
    const kotaCount = uniqueKotas.length;
    const terpetakanCount = locations.filter(l => parseFloat(l.lat) && parseFloat(l.lng)).length;
    return { totalDudi, totalKuota, kotaCount, terpetakanCount };
  }, [locations, uniqueKotas]);

  // Handle focus to location
  const handleFocusLocation = (loc) => {
    const lat = parseFloat(loc.lat);
    const lng = parseFloat(loc.lng);
    if (!isNaN(lat) && !isNaN(lng)) {
      setMapCenter([lat, lng]);
      setMapZoom(16);
      setSelectedLocation(loc);
      if (viewMode === 'grid') {
        setViewMode('map');
      }
    }
  };

  // Reset filter
  const handleResetFilters = () => {
    setSearch('');
    setSelectedJurusan('ALL');
    setSelectedKota('ALL');
    setSelectedLocation(null);
  };

  return (
    <div className="w-full flex flex-col gap-6 select-none animate-in fade-in duration-300">
      
      {/* ── HERO HEADER CARD (SEJAJAR PERSIS DENGAN NAVBAR) ── */}
      <div className="relative overflow-hidden bg-gradient-to-br from-white via-slate-50 to-emerald-50/40 rounded-[var(--ui-radius-card,24px)] p-6 sm:p-8 border border-slate-200/80 shadow-sm">
        {/* Subtle Ambient Glow */}
        <div className="absolute -top-16 -right-16 w-64 h-64 rounded-full bg-[#3DAA37]/10 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-16 -left-16 w-64 h-64 rounded-full bg-sky-500/10 blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          
          {/* Header Title & Subtitle */}
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-100/70 border border-emerald-200 text-emerald-800 text-xs font-black uppercase tracking-wider mb-3">
              <span className="w-2 h-2 rounded-full bg-[#3DAA37] animate-pulse" />
              Layanan Publik • Hubungan Industri
            </div>
            
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-slate-900 tracking-tight leading-tight">
              Peta & Data Tempat PKL
            </h1>
            
            <p className="text-sm sm:text-base text-slate-600 font-medium mt-2 leading-relaxed">
              Direktori resmi Dunia Usaha & Dunia Industri (DUDI) mitra {appSettings.appName || 'Sekolah'} untuk pelaksanaan Praktik Kerja Lapangan siswa terakreditasi.
            </p>
          </div>

          {/* KPI Mini Stat Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-2 gap-3 shrink-0">
            <div className="bg-white/90 backdrop-blur-md rounded-2xl p-3.5 border border-slate-200/70 shadow-2xs flex flex-col justify-center">
              <div className="flex items-center gap-2 text-[#3DAA37] mb-1">
                <Building2 size={16} strokeWidth={2.5} />
                <span className="text-[11px] font-black uppercase tracking-wider text-slate-500">Mitra DUDI</span>
              </div>
              <span className="text-xl sm:text-2xl font-black text-slate-900 leading-none">
                {stats.totalDudi}
              </span>
            </div>

            <div className="bg-white/90 backdrop-blur-md rounded-2xl p-3.5 border border-slate-200/70 shadow-2xs flex flex-col justify-center">
              <div className="flex items-center gap-2 text-sky-600 mb-1">
                <MapPin size={16} strokeWidth={2.5} />
                <span className="text-[11px] font-black uppercase tracking-wider text-slate-500">Wilayah</span>
              </div>
              <span className="text-xl sm:text-2xl font-black text-slate-900 leading-none">
                {stats.kotaCount} <span className="text-xs font-bold text-slate-500">Kota</span>
              </span>
            </div>

            <div className="bg-white/90 backdrop-blur-md rounded-2xl p-3.5 border border-slate-200/70 shadow-2xs flex flex-col justify-center">
              <div className="flex items-center gap-2 text-amber-600 mb-1">
                <Users size={16} strokeWidth={2.5} />
                <span className="text-[11px] font-black uppercase tracking-wider text-slate-500">Kapasitas</span>
              </div>
              <span className="text-xl sm:text-2xl font-black text-slate-900 leading-none">
                {stats.totalKuota} <span className="text-xs font-bold text-slate-500">Kuota</span>
              </span>
            </div>

            <div className="bg-white/90 backdrop-blur-md rounded-2xl p-3.5 border border-slate-200/70 shadow-2xs flex flex-col justify-center">
              <div className="flex items-center gap-2 text-violet-600 mb-1">
                <Navigation size={16} strokeWidth={2.5} />
                <span className="text-[11px] font-black uppercase tracking-wider text-slate-500">Terpetakan</span>
              </div>
              <span className="text-xl sm:text-2xl font-black text-slate-900 leading-none">
                {stats.terpetakanCount} <span className="text-xs font-bold text-slate-500">GPS</span>
              </span>
            </div>
          </div>

        </div>
      </div>

      {/* ── TOOLBAR: SEARCH, FILTERS & VIEW MODES ── */}
      <div className="flex flex-col gap-4 bg-white rounded-[var(--ui-radius-card,24px)] p-4 sm:p-5 border border-slate-200/80 shadow-xs">
        
        {/* Row 1: Search Bar & View Mode Toggle */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          
          {/* Search Input with Icon & Clear button */}
          <div className="relative flex-1 max-w-xl">
            <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Cari nama perusahaan, bidang, keahlian, atau alamat..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full h-11 pl-10 pr-9 bg-slate-50 border border-slate-200 rounded-[var(--ui-radius-control,12px)] text-xs sm:text-sm font-semibold text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#3DAA37] focus:bg-white focus:ring-3 focus:ring-emerald-500/10 transition-all"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer p-0.5"
                title="Hapus pencarian"
              >
                <X size={15} strokeWidth={2.5} />
              </button>
            )}
          </div>

          {/* View Mode Switcher Buttons */}
          <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-[var(--ui-radius-control,12px)] shrink-0 self-start sm:self-auto">
            <button
              type="button"
              onClick={() => setViewMode('map')}
              className={`flex items-center gap-2 px-3.5 h-9 rounded-[var(--ui-radius-small,8px)] font-bold text-xs uppercase tracking-wider transition-all cursor-pointer border-none ${
                viewMode === 'map'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <MapIcon size={14} strokeWidth={2.4} />
              <span>Peta</span>
            </button>

            <button
              type="button"
              onClick={() => setViewMode('grid')}
              className={`flex items-center gap-2 px-3.5 h-9 rounded-[var(--ui-radius-small,8px)] font-bold text-xs uppercase tracking-wider transition-all cursor-pointer border-none ${
                viewMode === 'grid'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <Grid size={14} strokeWidth={2.4} />
              <span>Daftar</span>
            </button>

            {/* Split View on Large Screens */}
            <button
              type="button"
              onClick={() => setViewMode('split')}
              className={`hidden lg:flex items-center gap-2 px-3.5 h-9 rounded-[var(--ui-radius-small,8px)] font-bold text-xs uppercase tracking-wider transition-all cursor-pointer border-none ${
                viewMode === 'split'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
              title="Tampilkan peta dan daftar sekaligus"
            >
              <Layers size={14} strokeWidth={2.4} />
              <span>Split</span>
            </button>
          </div>

        </div>

        {/* Row 2: Filter Chips (Jurusan & Kota) */}
        <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-slate-100">
          
          <div className="flex items-center gap-1.5 text-xs font-black text-slate-400 uppercase tracking-wider mr-1">
            <Filter size={13} strokeWidth={2.5} />
            <span>Keahlian:</span>
          </div>

          {/* ALL Chip */}
          <button
            type="button"
            onClick={() => setSelectedJurusan('ALL')}
            className={`px-3 py-1 rounded-full font-bold text-xs cursor-pointer transition-all border ${
              selectedJurusan === 'ALL'
                ? 'bg-slate-900 text-white border-slate-900 shadow-2xs'
                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
            }`}
          >
            Semua
          </button>

          {/* Dynamic Jurusan Chips */}
          {uniqueJurusans.slice(0, 6).map((j, idx) => {
            const isSelected = selectedJurusan.toLowerCase() === j.toLowerCase();
            const badgeColor = getJurusanColor(j);
            return (
              <button
                key={idx}
                type="button"
                onClick={() => setSelectedJurusan(isSelected ? 'ALL' : j)}
                className={`px-3 py-1 rounded-full font-bold text-xs cursor-pointer transition-all border flex items-center gap-1.5 ${
                  isSelected
                    ? 'text-white border-transparent shadow-xs'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                }`}
                style={isSelected ? { backgroundColor: badgeColor } : {}}
              >
                <span 
                  className="w-1.5 h-1.5 rounded-full" 
                  style={{ backgroundColor: isSelected ? '#ffffff' : badgeColor }}
                />
                <span>{j}</span>
              </button>
            );
          })}

          {/* Kota Selector Dropdown (Menggunakan CustomSelect Resmi Sistem Web) */}
          {uniqueKotas.length > 0 && (
            <div className="ml-auto flex items-center gap-2 w-full sm:w-auto min-w-[210px]">
              <CustomSelect
                value={selectedKota}
                onChange={(val) => setSelectedKota(val)}
                options={[
                  { value: 'ALL', label: `Semua Wilayah (${uniqueKotas.length} Kota)` },
                  ...uniqueKotas.map((kota) => ({ value: kota.toLowerCase(), label: kota }))
                ]}
                placeholder="Pilih Wilayah..."
                searchable={false}
                className="w-full"
              />
            </div>
          )}

          {/* Reset Filters button if any active */}
          {(search || selectedJurusan !== 'ALL' || selectedKota !== 'ALL') && (
            <button
              type="button"
              onClick={handleResetFilters}
              className="text-xs font-bold text-rose-600 hover:text-rose-700 flex items-center gap-1 cursor-pointer ml-2 border-none bg-transparent"
            >
              <RotateCcw size={12} strokeWidth={2.5} />
              <span>Reset</span>
            </button>
          )}

        </div>

      </div>

      {/* ── CONTENT DISPLAY: MAP, GRID, OR SPLIT ── */}
      {loading ? (
        <div className="w-full py-24 flex flex-col items-center justify-center bg-white rounded-3xl border border-slate-200 shadow-xs">
          <div className="w-12 h-12 border-3 border-[#3DAA37]/20 border-t-[#3DAA37] rounded-full animate-spin mb-4" />
          <p className="text-sm font-black text-slate-700">Memuat direktori data tempat PKL...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="w-full py-20 px-6 flex flex-col items-center justify-center text-center bg-white rounded-3xl border border-slate-200 shadow-xs">
          <div className="w-16 h-16 rounded-3xl bg-slate-100 flex items-center justify-center text-slate-400 mb-4 shadow-2xs">
            <Building2 size={32} strokeWidth={1.8} />
          </div>
          <h3 className="text-lg font-black text-slate-800">Tidak Ditemukan Tempat PKL</h3>
          <p className="text-xs sm:text-sm text-slate-500 max-w-sm mt-1 mb-4 leading-relaxed">
            Tidak ada data mitra industri yang sesuai dengan kata kunci pencarian atau filter yang Anda pilih.
          </p>
          <button
            type="button"
            onClick={handleResetFilters}
            className="px-5 h-10 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs uppercase tracking-wider cursor-pointer border-none shadow-xs"
          >
            Tampilkan Semua Tempat PKL
          </button>
        </div>
      ) : (
        <div className="w-full">
          
          {/* VIEW 1: INTERACTIVE MAP (DEFAULT / MOBILE FRIENDLY) */}
          {(viewMode === 'map' || viewMode === 'split') && (
            <div className={`w-full flex flex-col ${viewMode === 'split' ? 'lg:grid lg:grid-cols-12 gap-6' : ''}`}>
              
              {/* Map Canvas Container */}
              <div className={`w-full relative rounded-3xl overflow-hidden shadow-sm border border-slate-200/80 bg-slate-100 ${
                viewMode === 'split' ? 'lg:col-span-7 h-[500px] lg:h-[680px]' : 'h-[440px] sm:h-[600px] lg:h-[650px]'
              }`}>
                
                {/* Floating Map Status Overlay Header */}
                <div className="absolute top-3 left-3 z-[1000] bg-white/95 backdrop-blur-md px-3.5 py-2 rounded-2xl shadow-md border border-slate-200/80 flex items-center gap-2 pointer-events-auto">
                  <div className="w-2.5 h-2.5 rounded-full bg-[#3DAA37] animate-pulse" />
                  <span className="text-xs font-black text-slate-800">
                    {filteredWithCoords.length} Lokasi Terpetakan
                  </span>
                </div>

                {/* Leaflet Map Container */}
                <MapContainer 
                  center={mapCenter} 
                  zoom={mapZoom} 
                  style={{ height: '100%', width: '100%' }}
                  scrollWheelZoom={true}
                >
                  <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  />

                  <MapFlyController targetCoord={mapCenter} zoomLevel={mapZoom} />

                  {/* Marker Pins for all filtered companies with GPS */}
                  {filteredWithCoords.map((loc) => {
                    const lat = parseFloat(loc.lat);
                    const lng = parseFloat(loc.lng);
                    const isSelected = selectedLocation?.id === loc.id;
                    const color = getJurusanColor(loc.jurusan || loc.bidang);

                    return (
                      <Marker
                        key={loc.id}
                        position={[lat, lng]}
                        icon={createModernIcon(color, isSelected)}
                        eventHandlers={{
                          click: () => {
                            setSelectedLocation(loc);
                            setMapCenter([lat, lng]);
                          }
                        }}
                      >
                        <Popup>
                          <div className="p-1 max-w-[240px] font-sans text-left">
                            <span 
                              className="inline-block px-2 py-0.5 rounded-md text-[10px] font-black uppercase text-white mb-1.5"
                              style={{ backgroundColor: color }}
                            >
                              {loc.bidang || loc.jurusan || 'Mitra PKL'}
                            </span>
                            
                            <h4 className="font-black text-sm text-slate-900 leading-tight mb-1">
                              {loc.nama_perusahaan || loc.nama}
                            </h4>
                            
                            <p className="text-[11px] text-slate-500 leading-relaxed mb-2">
                              {loc.alamat}{loc.kota ? `, ${loc.kota}` : ''}
                            </p>

                            <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
                              <a
                                href={`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex-1 h-7 rounded-lg bg-[#3DAA37] text-white font-bold text-[10.5px] uppercase tracking-wider flex items-center justify-center gap-1 no-underline"
                              >
                                <Navigation size={11} />
                                <span>Rute</span>
                              </a>
                              {loc.telepon && (
                                <a
                                  href={`tel:${loc.telepon}`}
                                  className="h-7 px-2.5 rounded-lg bg-slate-100 text-slate-700 font-bold text-[10.5px] flex items-center justify-center no-underline"
                                  title="Hubungi"
                                >
                                  <Phone size={12} />
                                </a>
                              )}
                            </div>
                          </div>
                        </Popup>
                      </Marker>
                    );
                  })}
                </MapContainer>

                {/* Floating Bottom Drawer / Card on Map when a location is tapped */}
                {selectedLocation && (
                  <div className="absolute bottom-3 left-3 right-3 sm:left-4 sm:right-auto sm:max-w-md z-[1000] bg-white/95 backdrop-blur-md rounded-2xl p-4 sm:p-5 shadow-xl border border-slate-200/80 animate-in slide-in-from-bottom duration-300">
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 mb-1">
                          <span 
                            className="px-2 py-0.5 rounded-md text-[9.5px] font-black uppercase text-white"
                            style={{ backgroundColor: getJurusanColor(selectedLocation.jurusan || selectedLocation.bidang) }}
                          >
                            {selectedLocation.bidang || 'Mitra PKL'}
                          </span>
                          {selectedLocation.kota && (
                            <span className="text-[10px] font-bold text-slate-400">
                              • {selectedLocation.kota}
                            </span>
                          )}
                        </div>
                        
                        <h3 className="font-black text-sm sm:text-base text-slate-900 leading-snug truncate">
                          {selectedLocation.nama_perusahaan || selectedLocation.nama}
                        </h3>
                      </div>

                      <button
                        type="button"
                        onClick={() => setSelectedLocation(null)}
                        className="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center cursor-pointer border-none shrink-0"
                      >
                        <X size={14} />
                      </button>
                    </div>

                    <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed mb-3">
                      {selectedLocation.alamat}
                    </p>

                    <div className="flex items-center gap-2">
                      <a
                        href={`https://www.google.com/maps/dir/?api=1&destination=${selectedLocation.lat},${selectedLocation.lng}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1 h-9 rounded-xl bg-[#3DAA37] hover:bg-[#34942f] text-white font-black text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-xs no-underline active:scale-95 transition-transform"
                      >
                        <Navigation size={13} strokeWidth={2.5} />
                        <span>Buka Petunjuk Arah</span>
                      </a>

                      {selectedLocation.telepon && (
                        <a
                          href={`tel:${selectedLocation.telepon}`}
                          className="h-9 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs flex items-center justify-center gap-1 no-underline active:scale-95 transition-transform"
                          title="Hubungi Perusahaan"
                        >
                          <Phone size={13} />
                          <span className="hidden sm:inline">Hubungi</span>
                        </a>
                      )}
                    </div>
                  </div>
                )}

              </div>

              {/* Side List for Split View on Desktop */}
              {viewMode === 'split' && (
                <div className="hidden lg:flex lg:col-span-5 flex-col gap-3 h-[680px] overflow-y-auto pr-1">
                  <div className="text-xs font-black text-slate-400 uppercase tracking-wider px-1">
                    Daftar Tempat PKL ({filtered.length})
                  </div>
                  {filtered.map((loc) => (
                    <PklCardItem 
                      key={loc.id} 
                      loc={loc} 
                      isSelected={selectedLocation?.id === loc.id}
                      onSelect={() => handleFocusLocation(loc)} 
                    />
                  ))}
                </div>
              )}

            </div>
          )}

          {/* VIEW 2: FULL GRID OF BEAUTIFUL COMPANY CARDS */}
          {viewMode === 'grid' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
              {filtered.map((loc) => (
                <PklCardItem 
                  key={loc.id} 
                  loc={loc} 
                  isSelected={selectedLocation?.id === loc.id}
                  onSelect={() => handleFocusLocation(loc)} 
                />
              ))}
            </div>
          )}

        </div>
      )}

    </div>
  );
}

// ── SUBCOMPONENT: INDIVIDUAL PKL CARD ITEM (RICH AESTHETICS & RESPONSIVE) ──
function PklCardItem({ loc, isSelected, onSelect }) {
  const color = getJurusanColor(loc.jurusan || loc.bidang);
  const lat = parseFloat(loc.lat);
  const lng = parseFloat(loc.lng);
  const hasGps = !isNaN(lat) && !isNaN(lng) && lat !== 0 && lng !== 0;

  return (
    <div 
      className={`rounded-[var(--ui-radius-card,20px)] p-5 border transition-all duration-300 flex flex-col justify-between select-none ${
        isSelected
          ? 'bg-emerald-50/70 border-[#3DAA37] shadow-md ring-2 ring-[#3DAA37]/20'
          : 'bg-white hover:bg-slate-50/80 border-slate-200/80 hover:border-slate-300 shadow-xs hover:shadow-md hover:-translate-y-0.5'
      }`}
    >
      <div>
        {/* Top Badges & Status */}
        <div className="flex items-center justify-between gap-2 mb-3">
          <span 
            className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider truncate max-w-[170px]"
            style={{ 
              backgroundColor: `${color}15`,
              color: color
            }}
          >
            {loc.bidang || loc.jurusan || 'Umum'}
          </span>

          {loc.kuota !== undefined && loc.kuota > 0 && (
            <span className="flex items-center gap-1 text-[11px] font-black text-slate-600 bg-slate-100 px-2.5 py-0.5 rounded-full shrink-0">
              <Users size={11} className="text-slate-400" />
              <span>{loc.kuota} Kuota</span>
            </span>
          )}
        </div>

        {/* Company Avatar & Name */}
        <div className="flex items-start gap-3.5 mb-3">
          <div 
            className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-xs text-white font-black text-base"
            style={{ 
              background: `linear-gradient(135deg, ${color} 0%, color-mix(in srgb, ${color} 80%, #000000) 100%)` 
            }}
          >
            <Building2 size={22} strokeWidth={2.2} />
          </div>

          <div className="flex-1 min-w-0">
            <h3 className="font-black text-base text-slate-900 tracking-tight leading-snug line-clamp-2">
              {loc.nama_perusahaan || loc.nama}
            </h3>
            {loc.jurusan && (
              <p className="text-[11px] font-bold text-slate-400 mt-0.5 truncate">
                Jurusan: <span className="text-slate-600">{loc.jurusan}</span>
              </p>
            )}
          </div>
        </div>

        {/* Address & City */}
        {(loc.alamat || loc.kota) && (
          <div className="flex items-start gap-2 text-xs text-slate-500 font-medium mb-3 leading-relaxed">
            <MapPin size={14} className="text-slate-400 shrink-0 mt-0.5" />
            <span className="line-clamp-2">{loc.alamat}{loc.kota ? `, ${loc.kota}` : ''}</span>
          </div>
        )}
      </div>

      {/* Action Buttons Row */}
      <div className="pt-3 border-t border-slate-100 flex items-center gap-2 mt-2">
        {hasGps ? (
          <button
            type="button"
            onClick={onSelect}
            className="flex-1 h-9 rounded-[var(--ui-radius-control,10px)] bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 cursor-pointer border-none transition-all active:scale-95 shadow-xs"
          >
            <MapIcon size={13} strokeWidth={2.4} />
            <span>Lihat di Peta</span>
          </button>
        ) : (
          <div className="flex-1 h-9 rounded-[var(--ui-radius-control,10px)] bg-slate-100 text-slate-400 font-bold text-xs uppercase tracking-wider flex items-center justify-center">
            Lokasi Belum Terpetakan
          </div>
        )}

        {hasGps && (
          <a
            href={`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`}
            target="_blank"
            rel="noopener noreferrer"
            className="h-9 px-3 rounded-[var(--ui-radius-control,10px)] bg-emerald-50 hover:bg-emerald-100 text-[#3DAA37] font-extrabold text-xs flex items-center justify-center gap-1 no-underline active:scale-95 transition-all"
            title="Buka rute di Google Maps"
          >
            <Navigation size={13} strokeWidth={2.4} />
            <span className="hidden sm:inline">Rute</span>
          </a>
        )}

        {loc.telepon && (
          <a
            href={`tel:${loc.telepon}`}
            className="w-9 h-9 rounded-[var(--ui-radius-control,10px)] bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center no-underline shrink-0 active:scale-95 transition-all"
            title={`Hubungi ${loc.telepon}`}
          >
            <Phone size={14} strokeWidth={2.2} />
          </a>
        )}

        {loc.website && (
          <a
            href={loc.website.startsWith('http') ? loc.website : `https://${loc.website}`}
            target="_blank"
            rel="noopener noreferrer"
            className="w-9 h-9 rounded-[var(--ui-radius-control,10px)] bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center no-underline shrink-0 active:scale-95 transition-all"
            title="Kunjungi Website"
          >
            <Globe size={14} strokeWidth={2.2} />
          </a>
        )}
      </div>
    </div>
  );
}
