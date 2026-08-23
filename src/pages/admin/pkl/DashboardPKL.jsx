import React, { useState, useEffect, useMemo } from 'react';
import { 
  Users, Clock, Building, FileBarChart2, MapPin, 
  RefreshCw, MapIcon, CheckCircle2, AlertTriangle, 
  ExternalLink, ChevronRight, Layers, ArrowUpRight,
  Sparkles, GraduationCap, Compass, ListFilter
} from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { PageHeader } from '../../../components/monitoring/ui/index.js';
import { Button } from '../../../components/ui.jsx';

// Leaflet default icon fix
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
});

// Custom colored leaflet marker icon
const createCustomIcon = (color = '#059669') => {
  return L.divIcon({
    className: 'custom-leaflet-marker',
    html: `
      <div style="
        background-color: ${color};
        width: 32px;
        height: 32px;
        border-radius: 50% 50% 50% 0;
        transform: rotate(-45deg);
        display: flex;
        align-items: center;
        justify-content: center;
        border: 3px solid white;
        box-shadow: 0 4px 12px rgba(0,0,0,0.25);
      ">
        <div style="
          width: 10px;
          height: 10px;
          background: white;
          border-radius: 50%;
          transform: rotate(45deg);
        "></div>
      </div>
    `,
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    popupAnchor: [0, -32],
  });
};

const getToken = () => {
  try { return JSON.parse(sessionStorage.getItem("school_schedule_session_v1"))?.authToken; }
  catch { return null; }
};

// Component to handle dynamic map recentering
function ChangeMapView({ center, zoom }) {
  const map = useMap();
  useEffect(() => {
    if (center && center[0] && center[1]) {
      map.flyTo(center, zoom || 11, { duration: 1.2 });
    }
  }, [center, zoom, map]);
  return null;
}

export default function DashboardPKL() {
  const [stats, setStats] = useState({
    totalSiswa: 0,
    totalPerusahaan: 0,
    totalGuru: 0,
    totalKuota: 0,
    kuotaTerisi: 0,
    jurnalPending: [],
    byMajor: {},
    byLocation: []
  });
  
  const [journals, setJournals] = useState([]);
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  
  // UI Controls
  const [selectedCityFilter, setSelectedCityFilter] = useState('all');
  const [viewMode, setViewMode] = useState('map'); // 'map' | 'list'
  const [activeSideTab, setActiveSideTab] = useState('journals'); // 'journals' | 'majors'

  const fetchData = () => {
    const token = getToken();
    setLoading(true);
    setError(null);

    Promise.all([
      fetch("/api/pkl/dashboard-stats", { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()).catch(() => ({ ok: false })),
      fetch("/api/pkl/logbooks", { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()).catch(() => ({ ok: false, data: [] })),
      fetch("/api/pkl/locations", { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()).catch(() => ({ ok: false, data: [] })),
    ]).then(([statsData, journalsData, locData]) => {
      if (statsData?.ok) setStats(statsData.data || {});
      else setError("Gagal memuat statistik PKL dari server.");
      
      if (journalsData?.ok) setJournals(Array.isArray(journalsData.data) ? journalsData.data : []);
      if (locData?.ok) setLocations(Array.isArray(locData.data) ? locData.data : []);
      
      setLastUpdated(new Date());
      setLoading(false);
    }).catch(err => {
      console.error("[DashboardPKL]", err);
      setError("Koneksi ke server gagal.");
      setLoading(false);
    });
  };

  useEffect(() => { fetchData(); }, []);

  // Filtered locations with valid GPS coordinates
  const filteredLocations = useMemo(() => {
    let list = locations.filter(loc => loc.lat && loc.lng && loc.lat !== 'null');
    if (selectedCityFilter !== 'all') {
      list = list.filter(loc => {
        const city = (loc.kota || loc.alamat || '').toLowerCase();
        return city.includes(selectedCityFilter.toLowerCase());
      });
    }
    return list;
  }, [locations, selectedCityFilter]);

  // Dynamic map center based on filtered locations
  const mapCenter = useMemo(() => {
    if (filteredLocations.length === 0) return [-6.2618, 107.0005]; // Default to Bekasi / Tambun
    const avgLat = filteredLocations.reduce((s, l) => s + parseFloat(l.lat), 0) / filteredLocations.length;
    const avgLng = filteredLocations.reduce((s, l) => s + parseFloat(l.lng), 0) / filteredLocations.length;
    return [avgLat, avgLng];
  }, [filteredLocations]);

  // Pending logbooks or fallback to recent journals
  const pendingJurnals = useMemo(() => {
    if (stats?.jurnalPending && stats.jurnalPending.length > 0) return stats.jurnalPending;
    const pendingList = journals.filter(j => j.status === 'pending');
    if (pendingList.length > 0) return pendingList.slice(0, 10);
    return journals.slice(0, 8);
  }, [stats, journals]);

  // Major distribution data directly from database
  const majorDistribution = useMemo(() => {
    if (stats?.byMajor && typeof stats.byMajor === 'object') {
      return stats.byMajor;
    }
    return {};
  }, [stats]);

  const totalPlacedCount = useMemo(() => {
    return Object.values(majorDistribution).reduce((a, b) => a + Number(b), 0);
  }, [majorDistribution]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[380px] bg-white rounded-[var(--ui-radius-card)] border border-[var(--ui-border-muted)] p-8 shadow-[var(--ui-shadow-card)] gap-3">
        <div className="animate-spin h-9 w-9 border-4 border-[var(--ui-primary)] border-t-transparent rounded-full" />
        <p className="text-sm font-bold text-slate-700">Memuat Dashboard PKL...</p>
        <p className="text-xs text-slate-400">Menyinkronkan data mitra DUDI, siswa, dan logbook</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[350px] bg-white rounded-[var(--ui-radius-card)] border border-[var(--ui-border-muted)] p-8 shadow-[var(--ui-shadow-card)] text-center gap-3">
        <div className="w-12 h-12 rounded-full bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-500">
          <AlertTriangle size={24} />
        </div>
        <h3 className="text-sm font-bold text-slate-800">Gagal Memuat Data PKL</h3>
        <p className="text-xs text-slate-500 max-w-sm">{error}</p>
        <Button variant="outline" size="sm" onClick={fetchData} className="mt-2 flex items-center gap-1.5">
          <RefreshCw size={13} /> Coba Muat Ulang
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6 animate-fade-in w-full pb-8">
      {/* Header */}
      <PageHeader
        icon={FileBarChart2}
        title="Dashboard PKL"
        description="Monitoring sebaran penempatan Praktek Kerja Lapangan dan aktivitas logbook siswa secara real-time."
        rightContent={
          <div className="flex items-center gap-3">
            {lastUpdated && (
              <span className="text-[11px] font-semibold text-slate-400 hidden sm:inline-block">
                Diperbarui: <strong className="text-slate-600">{lastUpdated.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })} WIB</strong>
              </span>
            )}
            <Button 
              variant="outline" 
              size="sm" 
              onClick={fetchData} 
              className="flex items-center gap-1.5 font-bold shadow-[var(--ui-shadow-control)]"
            >
              <RefreshCw size={13} /> Refresh Data
            </Button>
          </div>
        }
      />

      {/* 4 Premium KPI Stat Cards (2x2 on Mobile, 4x1 on Desktop) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
        {/* Card 1: Mitra DUDI */}
        <div className="bg-white rounded-[var(--ui-radius-card)] p-3 sm:p-5 border border-slate-200/80 shadow-[var(--ui-shadow-card)] hover:shadow-[var(--ui-shadow-card-hover)] hover:-translate-y-0.5 transition-all duration-200 flex flex-col justify-between overflow-hidden group">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <span className="text-[9px] sm:text-[11px] font-black uppercase tracking-wider text-indigo-600 block mb-0.5 truncate">
                Mitra DUDI
              </span>
              <div className="flex items-baseline gap-1 sm:gap-2">
                <h3 className="text-xl sm:text-3xl font-black text-slate-800 tracking-tight">
                  {stats.totalPerusahaan !== undefined ? stats.totalPerusahaan : locations.length}
                </h3>
                <span className="text-[10px] sm:text-xs font-bold text-slate-400">Industri</span>
              </div>
            </div>
            <div className="w-8 h-8 sm:w-11 sm:h-11 rounded-[var(--ui-radius-control)] bg-indigo-50 text-indigo-600 border border-indigo-200/60 flex items-center justify-center shrink-0 group-hover:bg-indigo-600 group-hover:text-white transition-all shadow-xs">
              <Building size={18} strokeWidth={2.5} className="sm:w-[22px] sm:h-[22px]" />
            </div>
          </div>
          <div className="mt-2 pt-2 sm:mt-3 sm:pt-3 border-t border-slate-100 flex items-center justify-between text-[10px] sm:text-[11px]">
            <span className="font-bold text-indigo-700 bg-indigo-50 px-1.5 sm:px-2 py-0.5 rounded-[var(--ui-radius-pill)] border border-indigo-200/60 truncate">
              {stats.totalKuota || 0} Kuota
            </span>
            <span className="font-bold text-slate-400 hidden sm:inline">
              {filteredLocations.length} Titik GPS
            </span>
          </div>
        </div>

        {/* Card 2: Siswa PKL Aktif */}
        <div className="bg-white rounded-[var(--ui-radius-card)] p-3 sm:p-5 border border-slate-200/80 shadow-[var(--ui-shadow-card)] hover:shadow-[var(--ui-shadow-card-hover)] hover:-translate-y-0.5 transition-all duration-200 flex flex-col justify-between overflow-hidden group">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <span className="text-[9px] sm:text-[11px] font-black uppercase tracking-wider text-emerald-600 block mb-0.5 truncate">
                Siswa Aktif
              </span>
              <div className="flex items-baseline gap-1 sm:gap-2">
                <h3 className="text-xl sm:text-3xl font-black text-slate-800 tracking-tight">
                  {stats.totalSiswa || totalPlacedCount || 0}
                </h3>
                <span className="text-[10px] sm:text-xs font-bold text-slate-400">Siswa</span>
              </div>
            </div>
            <div className="w-8 h-8 sm:w-11 sm:h-11 rounded-[var(--ui-radius-control)] bg-emerald-50 text-emerald-600 border border-emerald-200/60 flex items-center justify-center shrink-0 group-hover:bg-emerald-600 group-hover:text-white transition-all shadow-xs">
              <Users size={18} strokeWidth={2.5} className="sm:w-[22px] sm:h-[22px]" />
            </div>
          </div>
          <div className="mt-2 pt-2 sm:mt-3 sm:pt-3 border-t border-slate-100 flex items-center justify-between text-[10px] sm:text-[11px]">
            <span className="font-bold text-emerald-700 bg-emerald-50 px-1.5 sm:px-2 py-0.5 rounded-[var(--ui-radius-pill)] border border-emerald-200/60 truncate">
              100% Kelas XII
            </span>
            <span className="font-bold text-slate-400 hidden sm:inline">
              5 Jurusan
            </span>
          </div>
        </div>

        {/* Card 3: Guru Pembimbing */}
        <div className="bg-white rounded-[var(--ui-radius-card)] p-3 sm:p-5 border border-slate-200/80 shadow-[var(--ui-shadow-card)] hover:shadow-[var(--ui-shadow-card-hover)] hover:-translate-y-0.5 transition-all duration-200 flex flex-col justify-between overflow-hidden group">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <span className="text-[9px] sm:text-[11px] font-black uppercase tracking-wider text-blue-600 block mb-0.5 truncate">
                Guru Pembimbing
              </span>
              <div className="flex items-baseline gap-1 sm:gap-2">
                <h3 className="text-xl sm:text-3xl font-black text-slate-800 tracking-tight">
                  {stats.totalGuru || 0}
                </h3>
                <span className="text-[10px] sm:text-xs font-bold text-slate-400">Guru</span>
              </div>
            </div>
            <div className="w-8 h-8 sm:w-11 sm:h-11 rounded-[var(--ui-radius-control)] bg-blue-50 text-blue-600 border border-blue-200/60 flex items-center justify-center shrink-0 group-hover:bg-blue-600 group-hover:text-white transition-all shadow-xs">
              <GraduationCap size={18} strokeWidth={2.5} className="sm:w-[22px] sm:h-[22px]" />
            </div>
          </div>
          <div className="mt-2 pt-2 sm:mt-3 sm:pt-3 border-t border-slate-100 flex items-center justify-between text-[10px] sm:text-[11px]">
            <span className="font-bold text-blue-700 bg-blue-50 px-1.5 sm:px-2 py-0.5 rounded-[var(--ui-radius-pill)] border border-blue-200/60 truncate">
              Monitoring
            </span>
            <span className="font-bold text-slate-400 hidden sm:inline">
              Terverifikasi
            </span>
          </div>
        </div>

        {/* Card 4: Jurnal & Validasi */}
        <div className="bg-white rounded-[var(--ui-radius-card)] p-3 sm:p-5 border border-slate-200/80 shadow-[var(--ui-shadow-card)] hover:shadow-[var(--ui-shadow-card-hover)] hover:-translate-y-0.5 transition-all duration-200 flex flex-col justify-between overflow-hidden group">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <span className="text-[9px] sm:text-[11px] font-black uppercase tracking-wider text-amber-600 block mb-0.5 truncate">
                Jurnal PKL
              </span>
              <div className="flex items-baseline gap-1 sm:gap-2">
                <h3 className="text-xl sm:text-3xl font-black text-slate-800 tracking-tight">
                  {pendingJurnals.length}
                </h3>
                <span className="text-[10px] sm:text-xs font-bold text-slate-400">Logbook</span>
              </div>
            </div>
            <div className="w-8 h-8 sm:w-11 sm:h-11 rounded-[var(--ui-radius-control)] bg-amber-50 text-amber-600 border border-amber-200/60 flex items-center justify-center shrink-0 group-hover:bg-amber-500 group-hover:text-white transition-all shadow-xs">
              <Clock size={18} strokeWidth={2.5} className="sm:w-[22px] sm:h-[22px]" />
            </div>
          </div>
          <div className="mt-2 pt-2 sm:mt-3 sm:pt-3 border-t border-slate-100 flex items-center justify-between text-[10px] sm:text-[11px]">
            <span className={`font-bold px-1.5 sm:px-2 py-0.5 rounded-[var(--ui-radius-pill)] border truncate ${
              pendingJurnals.length > 0
                ? 'text-amber-700 bg-amber-50 border-amber-200/60'
                : 'text-emerald-700 bg-emerald-50 border-emerald-200/60'
            }`}>
              {pendingJurnals.length > 0 ? `${pendingJurnals.length} Review` : 'Selesai'}
            </span>
            <span className="font-bold text-slate-400 hidden sm:inline">
              Lihat &rarr;
            </span>
          </div>
        </div>
      </div>

      {/* Main Grid: Interactive Map & Live Activity Feed */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 sm:gap-6">
        
        {/* Left Column (2/3): Interactive Leaflet Map & DUDI Directory */}
        <div className="xl:col-span-2 bg-white rounded-[var(--ui-radius-card)] border border-slate-200/80 shadow-[var(--ui-shadow-card)] overflow-hidden flex flex-col h-[520px]">
          {/* Map Controls Header */}
          <div className="px-4 sm:px-5 py-3.5 border-b border-[var(--ui-border-muted)] bg-[var(--ui-surface-muted)] flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-[var(--ui-radius-control)] bg-indigo-50 text-indigo-600 border border-indigo-200/60 flex items-center justify-center shrink-0 shadow-2xs">
                <MapIcon size={16} strokeWidth={2.5} />
              </div>
              <div>
                <h3 className="font-black text-slate-800 text-xs sm:text-sm tracking-tight">Pemetaan Sebaran Lokasi DUDI</h3>
                <p className="text-[10px] text-slate-400 font-medium">Titik kemitraan industri &amp; penempatan siswa PKL</p>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {/* City Filter Pills */}
              <div className="flex items-center gap-1 p-0.5 bg-white rounded-[var(--ui-radius-control)] border border-[var(--ui-border-soft)] shadow-2xs">
                {[
                  { id: 'all', label: 'Semua' },
                  { id: 'bekasi', label: 'Bekasi' },
                  { id: 'cikarang', label: 'Cikarang' },
                  { id: 'jakarta', label: 'Jakarta' }
                ].map(city => (
                  <button
                    key={city.id}
                    type="button"
                    onClick={() => setSelectedCityFilter(city.id)}
                    className={`px-2 py-1 rounded-[var(--ui-radius-small)] text-[10px] font-bold transition-all cursor-pointer border-none ${
                      selectedCityFilter === city.id
                        ? 'bg-[var(--ui-primary)] text-white shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900 bg-transparent'
                    }`}
                  >
                    {city.label}
                  </button>
                ))}
              </div>

              {/* View Toggle */}
              <div className="flex items-center gap-1 p-0.5 bg-white rounded-[var(--ui-radius-control)] border border-[var(--ui-border-soft)] shadow-2xs">
                <button
                  type="button"
                  onClick={() => setViewMode('map')}
                  className={`px-2.5 py-1 rounded-[var(--ui-radius-small)] text-[10px] font-bold transition-all cursor-pointer border-none flex items-center gap-1 ${
                    viewMode === 'map'
                      ? 'bg-slate-800 text-white shadow-2xs'
                      : 'text-slate-500 hover:text-slate-800 bg-transparent'
                  }`}
                >
                  <Compass size={12} /> Peta
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('list')}
                  className={`px-2.5 py-1 rounded-[var(--ui-radius-small)] text-[10px] font-bold transition-all cursor-pointer border-none flex items-center gap-1 ${
                    viewMode === 'list'
                      ? 'bg-slate-800 text-white shadow-2xs'
                      : 'text-slate-500 hover:text-slate-800 bg-transparent'
                  }`}
                >
                  <ListFilter size={12} /> List
                </button>
              </div>
            </div>
          </div>

          {/* Map / List View Body */}
          <div className="flex-1 w-full relative z-0 overflow-hidden bg-slate-50">
            {viewMode === 'map' ? (
              filteredLocations.length > 0 ? (
                <MapContainer 
                  center={mapCenter} 
                  zoom={11} 
                  scrollWheelZoom={true} 
                  className="w-full h-full" 
                  style={{ zIndex: 0 }}
                >
                  <ChangeMapView center={mapCenter} zoom={selectedCityFilter === 'all' ? 11 : 12} />
                  <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  />
                  {filteredLocations.map(loc => {
                    const latNum = parseFloat(loc.lat);
                    const lngNum = parseFloat(loc.lng);
                    if (isNaN(latNum) || isNaN(lngNum)) return null;

                    return (
                      <Marker 
                        key={loc.id} 
                        position={[latNum, lngNum]}
                        icon={createCustomIcon('#059669')}
                      >
                        <Popup>
                          <div className="p-2 min-w-[210px] text-slate-800 font-sans">
                            <span className="text-[9px] font-black uppercase tracking-wider text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200/60 inline-block mb-1">
                              {loc.bidang || "Mitra Industri PKL"}
                            </span>
                            <h4 className="font-extrabold text-slate-900 text-xs sm:text-sm mb-1 leading-snug">
                              {loc.nama_perusahaan || loc.name}
                            </h4>
                            <p className="text-[11px] text-slate-500 leading-relaxed mb-2 font-medium">
                              {loc.alamat || loc.kota || "Kawasan Industri"}
                            </p>
                            
                            <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[10px]">
                              {loc.jurusan && (
                                <span className="font-black text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-200/60">
                                  {loc.jurusan}
                                </span>
                              )}
                              <span className="font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded">
                                Kuota: {loc.kuota || 15} Siswa
                              </span>
                            </div>
                          </div>
                        </Popup>
                      </Marker>
                    );
                  })}
                </MapContainer>
              ) : (
                <div className="flex flex-col items-center justify-center h-full gap-2 text-slate-400 p-6 text-center">
                  <MapIcon size={36} className="opacity-30" />
                  <p className="text-xs font-bold text-slate-600">Tidak ada titik lokasi pada filter ini</p>
                  <p className="text-[11px] text-slate-400 max-w-xs">Coba pilih &quot;Semua&quot; untuk menampilkan seluruh sebaran DUDI.</p>
                </div>
              )
            ) : (
              <div className="h-full overflow-y-auto custom-scrollbar divide-y divide-[var(--ui-border-muted)] p-2">
                {filteredLocations.map(loc => (
                  <div key={loc.id} className="p-3 bg-white hover:bg-[var(--ui-surface-muted)] rounded-[var(--ui-radius-control)] transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-2 border border-transparent hover:border-[var(--ui-border-soft)] mb-1">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="text-xs font-black text-slate-800 truncate">{loc.nama_perusahaan}</h4>
                        {loc.jurusan && (
                          <span className="text-[9px] font-black px-1.5 py-0.5 bg-indigo-50 text-indigo-700 rounded border border-indigo-200/60 uppercase">
                            {loc.jurusan}
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-500 font-medium truncate mt-0.5">{loc.alamat || loc.kota || '-'}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-[var(--ui-radius-pill)] border border-emerald-200/60">
                        Kuota: {loc.kuota || 15} Siswa
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Bottom Map Bar Summary */}
          <div className="px-4 py-2.5 bg-[var(--ui-surface-muted)] border-t border-[var(--ui-border-muted)] flex items-center justify-between text-[11px] font-semibold text-slate-500 shrink-0">
            <span>Menampilkan <strong>{filteredLocations.length}</strong> mitra industri terpetakan di Jabodetabek &amp; Cikarang</span>
            <span className="text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded-[var(--ui-radius-pill)] border border-emerald-200/60 hidden sm:inline-block">
              GPS Synchronized
            </span>
          </div>
        </div>

        {/* Right Column (1/3): Real-time Logbook Feed & Major Statistics */}
        <div className="bg-white rounded-[var(--ui-radius-card)] border border-slate-200/80 shadow-[var(--ui-shadow-card)] flex flex-col h-[520px] overflow-hidden">
          {/* Header Segmented Tabs */}
          <div className="px-4 py-3.5 border-b border-[var(--ui-border-muted)] bg-[var(--ui-surface-muted)] flex items-center justify-between shrink-0">
            <div className="flex items-center gap-1 p-1 bg-white rounded-[var(--ui-radius-control)] border border-[var(--ui-border-soft)] shadow-2xs w-full">
              <button
                type="button"
                onClick={() => setActiveSideTab('journals')}
                className={`flex-1 py-1.5 px-2 rounded-[var(--ui-radius-small)] text-xs font-black transition-all cursor-pointer border flex items-center justify-center gap-1.5 ${
                  activeSideTab === 'journals'
                    ? 'bg-[var(--ui-primary)] text-white border-transparent shadow-2xs'
                    : 'bg-transparent text-slate-500 border-transparent hover:text-slate-800'
                }`}
              >
                <Clock size={13} />
                <span>Aktivitas Jurnal</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveSideTab('majors')}
                className={`flex-1 py-1.5 px-2 rounded-[var(--ui-radius-small)] text-xs font-black transition-all cursor-pointer border flex items-center justify-center gap-1.5 ${
                  activeSideTab === 'majors'
                    ? 'bg-[var(--ui-primary)] text-white border-transparent shadow-2xs'
                    : 'bg-transparent text-slate-500 border-transparent hover:text-slate-800'
                }`}
              >
                <Layers size={13} />
                <span>Sebaran Jurusan</span>
              </button>
            </div>
          </div>

          {/* Body Feed */}
          <div className="flex-1 overflow-y-auto custom-scrollbar p-3 sm:p-3.5 space-y-2.5">
            {activeSideTab === 'journals' ? (
              pendingJurnals.length > 0 ? (
                pendingJurnals.map((j, idx) => (
                  <div 
                    key={j.id || idx}
                    className="p-3 bg-[var(--ui-surface-muted)] hover:bg-white rounded-[var(--ui-radius-card)] border border-[var(--ui-border-muted)] hover:border-[var(--ui-border-soft)] hover:shadow-xs transition-all duration-200 flex flex-col gap-1.5 group"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-black flex items-center justify-center shrink-0">
                          {j.student_name ? j.student_name.charAt(0).toUpperCase() : 'S'}
                        </span>
                        <p className="text-xs font-black text-slate-800 truncate group-hover:text-[var(--ui-primary)] transition-colors">
                          {j.student_name || j.student_nis || "Siswa PKL"}
                        </p>
                      </div>
                      <span className={`text-[9px] font-black px-2 py-0.5 rounded-[var(--ui-radius-pill)] border uppercase shrink-0 ${
                        j.status === 'pending'
                          ? 'bg-amber-50 text-amber-700 border-amber-200/60'
                          : 'bg-emerald-50 text-emerald-700 border-emerald-200/60'
                      }`}>
                        {j.status === 'pending' ? 'Perlu Review' : 'Tervalidasi'}
                      </span>
                    </div>

                    <p className="text-[11px] font-medium text-slate-600 line-clamp-2 leading-relaxed bg-white/70 p-2 rounded-[var(--ui-radius-small)] border border-slate-100">
                      {j.kegiatan || j.activity || "Melakukan aktivitas teknis harian di industri."}
                    </p>

                    <div className="flex items-center justify-between text-[10px] text-slate-400 font-semibold pt-1">
                      <span>{j.class_name ? `Kelas: ${j.class_name}` : 'Siswa DUDI'}</span>
                      <span>{j.created_at ? new Date(j.created_at).toLocaleDateString("id-ID", { day: 'numeric', month: 'short' }) : 'Hari ini'}</span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-center gap-2.5 p-6">
                  <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center justify-center shadow-xs">
                    <CheckCircle2 size={24} strokeWidth={2.5} />
                  </div>
                  <div>
                    <h4 className="text-xs font-black text-slate-700">Semua Jurnal Tervalidasi</h4>
                    <p className="text-[11px] text-slate-400 mt-0.5 leading-relaxed max-w-[200px] mx-auto">
                      Seluruh logbook aktivitas harian siswa PKL telah direview oleh guru pembimbing.
                    </p>
                  </div>
                </div>
              )
            ) : (
              /* Sebaran Jurusan Progress Bars */
              <div className="space-y-3.5 pt-1">
                <div className="p-3 bg-[var(--ui-surface-muted)] rounded-[var(--ui-radius-control)] border border-[var(--ui-border-muted)]">
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">Total Penempatan</span>
                  <div className="flex items-baseline gap-2">
                    <h3 className="text-xl font-black text-slate-800">{totalPlacedCount} Siswa</h3>
                    <span className="text-xs font-bold text-emerald-600">100% Tersebar</span>
                  </div>
                </div>

                <div className="space-y-3">
                  {[
                    { key: 'TKJ', label: 'Teknik Komputer & Jaringan (TKJ)', count: majorDistribution.TKJ || 0, color: 'bg-blue-500' },
                    { key: 'TKR', label: 'Teknik Kendaraan Ringan (TKR)', count: majorDistribution.TKR || 0, color: 'bg-orange-500' },
                    { key: 'MP', label: 'Manajemen Perkantoran (MPLB)', count: majorDistribution.MP || 0, color: 'bg-emerald-500' },
                    { key: 'RPL', label: 'Rekayasa Perangkat Lunak (RPL)', count: majorDistribution.RPL || 0, color: 'bg-cyan-500' },
                    { key: 'AKL', label: 'Akuntansi & Keuangan (AKL)', count: majorDistribution.AKL || 0, color: 'bg-pink-500' },
                  ].map(item => {
                    const percent = totalPlacedCount > 0 ? Math.round((item.count / totalPlacedCount) * 100) : 0;
                    return (
                      <div key={item.key} className="space-y-1">
                        <div className="flex items-center justify-between text-xs font-bold">
                          <span className="text-slate-700 text-[11px] truncate">{item.label}</span>
                          <span className="text-slate-500 text-[11px] shrink-0">{item.count} Siswa ({percent}%)</span>
                        </div>
                        <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
                          <div 
                            className={`h-full rounded-full ${item.color} transition-all duration-500`}
                            style={{ width: `${percent}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Side Footer */}
          <div className="px-4 py-2.5 bg-[var(--ui-surface-muted)] border-t border-[var(--ui-border-muted)] flex items-center justify-between text-[11px] font-semibold text-slate-500 shrink-0">
            <span>Sinkronisasi Pembimbing PKL</span>
            <span className="text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded-[var(--ui-radius-pill)] border border-emerald-200/60">
              Aktif
            </span>
          </div>
        </div>

      </div>
    </div>
  );
}
