import { Button } from '../../../components/ui.jsx';
import { useState, useEffect, useMemo } from'react';
import L from'leaflet';
import'leaflet/dist/leaflet.css';
import { subscribeDatabaseSnapshot } from'../../../utils/dataSource.js';
import { loadInitialState } from'../../../utils/state.js';
import { MapPin, MapIcon, Grid, Search, Users, Building2, Phone, Globe } from'lucide-react';
import { MapContainer, TileLayer, Marker, Popup } from'react-leaflet';


// Fix Leaflet marker icons
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl:'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl:'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

const JURUSAN_COLORS = { TJKT:'#15803d', Akuntansi:'#7c3aed', DKV:'#db2777' };
const createIcon = (color) => L.divIcon({
  className:'',
  html: `<div style="width:28px;height:28px;border-radius:50% 50% 50% 0;background:${color ||'#15803d'};transform:rotate(-45deg);border:2px solid white;boxShadow:0 2px 6px rgba(0,0,0,0.25)"></div>`,
  iconSize: [28, 28], iconAnchor: [14, 28], popupAnchor: [0, -30],
});

export default function PklLocationsPublicPage() {
  const [locations, setLocations] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState("map"); // map | grid
  const [dataVersion, setDataVersion] = useState(0);

  useEffect(() => subscribeDatabaseSnapshot(() => setDataVersion((v) => v + 1)), []);
  
  const appSettings = useMemo(() => {
    void dataVersion;
    const defaults = {
      primaryColor:"#064e3b", accentColor:"#a3e635", fontFamily:"Lexend", logoText:"TS",
      appName:"TimeSchedule",
    };
    return { ...defaults, ...loadInitialState("appSettings", defaults) };
  }, [dataVersion]);
  
  const featureSettings = useMemo(() => {
    void dataVersion;
    return loadInitialState("featureSettings", {});
  }, [dataVersion]);
  
  const isFeatureEnabled = (key) => featureSettings?.[key] !== false;

  const publicLinks = [
    { to:"/", label:"Beranda" },
    { to:"/jadwal", label:"Jadwal Pelajaran" },
    { to:"/denah", label:"Denah Ruang Kelas", featureKey:"publicDenah" },
    { to:"/materi-ajar", label:"Materi Ajar" },
    { to:"/kalender", label:"Kalender Akademik", featureKey:"publicCalendar" },
    { to:"/pkl-locations", label:"Data Tempat PKL" },
  ].filter((link) => !link.featureKey || isFeatureEnabled(link.featureKey));

  const { accentColor } = appSettings;

  useEffect(() => {
    fetch("/api/monitoring/lokasi-pkl/public")
      .then((r) => r.ok ? r.json() : Promise.reject(r))
      .then((data) => {
        const dbData = Array.isArray(data?.data) ? data.data : [];
        setLocations(dbData);
      })
      .catch(() => setLocations([]))
      .finally(() => setLoading(false));
  }, []);

  const filtered = locations.filter((loc) => {
    const q = search.toLowerCase();
    const nama = loc.nama_perusahaan || loc.nama ||"";
    const bidang = loc.bidang || loc.jurusan ||"";
    const kota = loc.kota || loc.alamat ||"";
    return !q || nama.toLowerCase().includes(q)
      || bidang.toLowerCase().includes(q)
      || kota.toLowerCase().includes(q);
  });

  return (
    <div className="w-full flex flex-col gap-6 animate-fade-in relative">
      <div className="flex flex-col gap-6 w-full max-w-full">
        
        {/* Page Header Area with View Toggle */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-200/60 pb-5">
          <div>
            <h1 className="text-[28px] font-black text-slate-800 tracking-tight flex items-center gap-2">
              <MapPin className="text-emerald-500" size={28} />
              Peta & Data Tempat PKL
            </h1>
            <p className="text-[14px] text-slate-500 font-medium mt-1 max-w-[500px]">
              Eksplorasi lokasi praktik kerja lapangan siswa yang tersebar di berbagai wilayah dan bidang keahlian.
            </p>
          </div>
          
          <div className="flex bg-white shadow-sm border-none/60 p-1 rounded-[var(--ui-radius-control)] shrink-0">
            <Button variant="outline" 
              onClick={() =>setViewMode("map")}
              className={`flex items-center gap-1.5 ${viewMode ==='map' ?'bg-emerald-50 text-emerald-700 shadow-sm' :'text-slate-500 hover:text-slate-700 hover:bg-slate-50'}`}
            >
              <MapIcon size={14} /> Peta</Button>
            <Button variant="outline" 
              onClick={() =>setViewMode("grid")}
              className={`flex items-center gap-1.5 ${viewMode ==='grid' ?'bg-emerald-50 text-emerald-700 shadow-sm' :'text-slate-500 hover:text-slate-700 hover:bg-slate-50'}`}
            >
              <Grid size={14} /> Grid</Button>
          </div>
        </div>

        {/* Search */}
        <div className="relative max-w-lg w-full mb-2">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input
            type="text"
            placeholder="Cari nama perusahaan, bidang, alamat..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-3 bg-white border-none/60 rounded-[var(--ui-radius-small)] focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-transparent text-[14px] font-medium shadow-sm transition-all"
          />
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <div className="animate-spin rounded-[var(--ui-radius-small)] h-10 w-10 border-t-2 border-emerald-500" />
          </div>
        ) : (
          <div className="w-full" style={{ animation:'lp-fadeIn .5s ease' }}>
            {viewMode ==="map" ? (
              <div className="w-full h-[400px] sm:h-[600px] bg-white/60 backdrop-blur-xl rounded-[var(--ui-radius-card)] border border-white/50 shadow-sm overflow-hidden relative z-0 p-1">
                <div className="w-full h-full rounded-[var(--ui-radius-small)] overflow-hidden">
                  <MapContainer center={[-6.2618, 107.0005]} zoom={12} style={{ height:'100%', width:'100%' }} scrollWheelZoom={true}>
                    <TileLayer
                      attribution='&copy; OpenStreetMap'
                      url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" 
                    />
                    {filtered.map(p => {
                      if (!p.lat || !p.lng) return null;
                      return (
                        <Marker key={p.id} position={[p.lat, p.lng]} icon={createIcon(JURUSAN_COLORS[p.jurusan || p.bidang])}>
                          <Popup>
                            <div className="min-w-[200px]" style={{ fontFamily:'Lexend, sans-serif' }}>
                              <p className="font-bold text-sm text-gray-900 mb-1">{p.nama_perusahaan || p.nama}</p>
                              <p className="text-xs text-gray-500 mb-2">{p.alamat || p.kota}</p>
                              {(p.siswaAktif !== undefined) && (
                                <div className="flex items-center gap-1.5 text-xs text-emerald-700 font-bold bg-emerald-50 w-fit px-2 py-1 rounded-[var(--ui-radius-small)]">
                                  <Users size={12} /> {p.siswaAktif} Siswa Aktif
                                </div>
                              )}
                            </div>
                          </Popup>
                        </Marker>
                      );
                    })}
                  </MapContainer>
                </div>
              </div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-24 bg-white/60 backdrop-blur-xl rounded-[var(--ui-radius-small)] border border-white/50 shadow-sm flex flex-col items-center">
                <div className="w-16 h-16 bg-white/80 rounded-full flex items-center justify-center mb-4">
                  <MapPin size={32} className="text-slate-300" />
                </div>
                <p className="text-[16px] text-slate-600 font-bold">Tidak ditemukan tempat PKL yang cocok.</p>
                <p className="text-[14px] text-slate-400 font-medium mt-1">Coba gunakan kata kunci lain untuk mencari.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                {filtered.map((loc, i) => (
                  <div key={loc.id || i} className="bg-white/60 backdrop-blur-xl rounded-[16px] border border-white/50 shadow-sm hover:-md hover:-translate-y-1 transition-all duration-300 p-5 group flex flex-col h-full">
                    <div className="flex items-start gap-3.5 mb-4">
                      <div className="w-11 h-11 bg-emerald-50 border border-emerald-100 rounded-[var(--ui-radius-small)] -[12px] flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                        <Building2 size={20} className="text-emerald-600" />
                      </div>
                      <div className="flex-1 min-w-0 pt-0.5">
                        <h3 className="font-bold text-[15px] text-slate-800 leading-tight mb-1.5 line-clamp-2">{loc.nama_perusahaan || loc.nama ||"Perusahaan"}</h3>
                        <span className="inline-block text-[10px] font-extrabold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-[var(--ui-radius-small)] uppercase tracking-wider">
                          {loc.bidang || loc.jurusan ||"Umum"}
                        </span>
                      </div>
                    </div>
                    
                    <div className="flex flex-col gap-2.5 text-[13px] font-medium text-slate-500 mt-auto">
                      {(loc.alamat || loc.kota) && (
                        <div className="flex items-start gap-2">
                          <MapPin size={15} className="shrink-0 mt-0.5 text-slate-400" />
                          <span className="line-clamp-2 leading-relaxed">{loc.alamat}{loc.kota ? `, ${loc.kota}` :""}</span>
                        </div>
                      )}
                      {loc.telepon && (
                        <div className="flex items-center gap-2">
                          <Phone size={15} className="shrink-0 text-slate-400" />
                          <span>{loc.telepon}</span>
                        </div>
                      )}
                      {loc.website && (
                        <div className="flex items-center gap-2">
                          <Globe size={15} className="shrink-0 text-slate-400" />
                          <a href={loc.website} target="_blank" rel="noopener noreferrer" className="text-violet-600 hover:text-violet-700 hover:underline truncate transition-colors">
                            {loc.website}
                          </a>
                        </div>
                      )}
                    </div>
                    
                    {(loc.kuota !== undefined || loc.siswaAktif !== undefined) && (
                      <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between">
                        <span className="text-[12px] font-bold text-slate-400 uppercase tracking-wide">Status</span>
                        <div className="flex items-center gap-1.5 bg-slate-50 px-2.5 py-1 rounded-[var(--ui-radius-small)] border-none">
                          <Users size={12} className="text-slate-500" />
                          <span className="text-[12px] font-extrabold text-slate-700">
                            {loc.siswaAktif !== undefined ? `${loc.siswaAktif} Siswa` : `Kuota ${loc.kuota}`}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
