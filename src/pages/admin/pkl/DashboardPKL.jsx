import { Button } from '../../../components/ui.jsx';
import { useState, useEffect, useMemo } from"react";
import { Users, Clock, Building, FileBarChart2 } from"lucide-react";
import { MapContainer, TileLayer, Marker, Popup } from"react-leaflet";
import"leaflet/dist/leaflet.css";
import L from"leaflet";
import { AlertTriangle, RefreshCw, MapIcon } from'lucide-react';
import { PageHeader } from '../../../components/monitoring/ui/index.js';
;


/**
 * admin/DashboardPKL.jsx
 * Dashboard PKL — menggunakan data aktual dari database PKL.
 * Ditampilkan dalam tata letak penuh (full-width) dengan peta yang interaktif.
 */

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:"https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
  iconUrl:"https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
  shadowUrl:"https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
});

const getToken = () => {
  try { return JSON.parse(sessionStorage.getItem("school_schedule_session_v1"))?.authToken; }
  catch { return null; }
};

const DashboardPKL = () => {
  const [stats, setStats] = useState({ totalSiswa: 0, totalPerusahaan: 0, totalGuru: 0, jurnalPending: [] });
  const [journals, setJournals] = useState([]);
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);

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

  const pendingJurnals = useMemo(() => {
    if (stats?.jurnalPending?.length) return stats.jurnalPending;
    return journals.filter(j => j.status ==="pending").slice(0, 10);
  }, [stats, journals]);

  // FIX: Menggunakan loc.lat dan loc.lng karena database mengembalikan kolom tersebut (bukan latitude/longitude)
  const locationsWithCoords = useMemo(() =>
    locations.filter(loc => loc.lat && loc.lng), [locations]);

  const mapCenter = useMemo(() => {
    if (locationsWithCoords.length === 0) return [-6.2, 106.816666]; // Default ke Jakarta jika kosong
    const avgLat = locationsWithCoords.reduce((s, l) => s + parseFloat(l.lat), 0) / locationsWithCoords.length;
    const avgLng = locationsWithCoords.reduce((s, l) => s + parseFloat(l.lng), 0) / locationsWithCoords.length;
    return [avgLat, avgLng];
  }, [locationsWithCoords]);

  if (loading) return (
    <div className="flex flex-col items-center justify-center h-64 gap-3">
      <div className="animate-spin h-8 w-8 border-4 border-[var(--ui-primary)] border-t-transparent rounded-full" />
      <p className="text-sm font-semibold text-slate-500">Memuat data Dashboard PKL...</p>
    </div>
  );

  if (error) return (
    <div className="flex flex-col items-center justify-center h-64 gap-3 text-center">
      <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center">
        <AlertTriangle size={22} className="text-red-500" />
      </div>
      <p className="text-sm font-semibold text-slate-700">{error}</p>
      <Button variant="outline" size="sm" className="flex items-center gap-2" onClick={fetchData} >
        <RefreshCw size={14} /> Coba Lagi
      </Button>
    </div>
  );

  return (
    <div className="space-y-6 animate-fade-in w-full pb-8">
      <PageHeader
        icon={FileBarChart2}
        title="Dashboard PKL"
        description="Ringkasan pemantauan Praktek Kerja Lapangan secara langsung."
        rightContent={
          <div className="flex items-center gap-4">
            {lastUpdated && (
              <p className="text-xs font-semibold text-slate-400">
                Terakhir diupdate: <span className="text-slate-600">{lastUpdated.toLocaleTimeString("id-ID", { hour:"2-digit", minute:"2-digit" })} WIB</span>
              </p>
            )}
            <Button variant="outline" size="sm" className="flex items-center gap-2" onClick={fetchData} title="Refresh Data" >
              <RefreshCw size={14} /> Refresh
            </Button>
          </div>
        }
      />

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {[
          { icon: Users, color:"text-blue-600", bg:"bg-blue-50/50 border-blue-100", label:"Siswa PKL Aktif", value: stats.totalSiswa || 0 },
          { icon: Building, color:"text-indigo-600", bg:"bg-indigo-50/50 border-indigo-100", label:"Mitra Perusahaan (DUDI)", value: stats.totalPerusahaan || locations.length || 0 },
          { icon: Users, color:"text-emerald-600", bg:"bg-emerald-50/50 border-emerald-100", label:"Guru Pembimbing", value: stats.totalGuru || 0 },
          { icon: Clock, color:"text-amber-600", bg:"bg-amber-50/50 border-amber-100", label:"Jurnal Perlu Validasi", value: pendingJurnals.length },
        ].map(({ icon: Icon, color, bg, label, value }, idx) => (
          <div key={idx} className="ui-card p-5 flex items-center gap-4 group hover:-translate-y-0.5 transition-all cursor-pointer">
            <div className={`w-14 h-14 rounded-[var(--ui-radius-card)] flex items-center justify-center shrink-0 border transition-colors ${bg} group-hover:bg-opacity-80`}>
              <Icon size={28} className={color} />
            </div>
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{label}</p>
              <h3 className="text-2xl font-black text-slate-800 leading-none">{value}</h3>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Map Panel (Takes 2/3 width on large screens) */}
        <div className="xl:col-span-2 ui-card overflow-hidden flex flex-col h-[500px]">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-white z-10 shrink-0">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600">
                <MapIcon size={18} />
              </div>
              <div>
                <h3 className="font-bold text-slate-800 text-sm">Pemetaan Lokasi DUDI</h3>
                <p className="text-xs font-semibold text-slate-400">Sebaran penempatan Praktek Kerja Lapangan siswa.</p>
              </div>
            </div>
            <span className="text-xs font-bold text-indigo-700 bg-indigo-50 px-3 py-1.5 rounded-full border border-indigo-100">
              {locationsWithCoords.length} Titik Lokasi
            </span>
          </div>
          <div className="flex-1 w-full relative z-0">
            {locationsWithCoords.length > 0 ? (
              <MapContainer center={mapCenter} zoom={11} scrollWheelZoom={true} className="w-full h-full" style={{ zIndex: 0 }}>
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                {locationsWithCoords.map(loc => (
                  <Marker key={loc.id} position={[parseFloat(loc.lat), parseFloat(loc.lng)]}>
                    <Popup>
                      <div className="p-2 min-w-[180px]">
                        <h4 className="font-bold text-slate-800 text-sm mb-1">{loc.nama_perusahaan || loc.name || loc.nama}</h4>
                        {(loc.alamat || loc.address) && <p className="text-xs text-slate-500 font-medium leading-relaxed">{loc.alamat || loc.address}</p>}
                        {loc.kuota > 0 && <p className="text-[11px] font-bold text-indigo-600 mt-2 bg-indigo-50 px-2 py-0.5 rounded-md inline-block">Kuota: {loc.kuota} Siswa</p>}
                      </div>
                    </Popup>
                  </Marker>
                ))}
              </MapContainer>
            ) : (
              <div className="flex flex-col items-center justify-center h-full gap-3 bg-slate-50 text-slate-400 p-6 text-center">
                <MapIcon size={40} className="opacity-20 mb-2" />
                <p className="text-sm font-bold text-slate-500">Belum ada lokasi DUDI berkoordinat GPS.</p>
                <p className="text-xs font-medium max-w-sm">Perusahaan yang ditambahkan perlu memiliki titik latitude dan longitude agar dapat ditampilkan pada peta persebaran PKL.</p>
              </div>
            )}
          </div>
        </div>

        {/* Pending Journals Panel (Takes 1/3 width) */}
        <div className="ui-card flex flex-col h-[500px]">
          <div className="px-5 py-4 border-b border-slate-100 bg-white flex items-center justify-between shrink-0 rounded-t-[var(--ui-radius-card)]">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-[var(--ui-radius-small)] bg-amber-50 flex items-center justify-center text-amber-600 border border-amber-100">
                <Clock size={16} strokeWidth={2.5} />
              </div>
              <h3 className="font-black text-slate-800 text-sm tracking-tight">Aktivitas Terkini</h3>
            </div>
            {pendingJurnals.length > 0 && (
              <span className="text-[9px] font-black uppercase tracking-widest text-amber-600 bg-amber-50 px-2.5 py-1 rounded-full border border-amber-100">
                Perlu Review
              </span>
            )}
          </div>
          
          <div className="flex-1 overflow-y-auto custom-scrollbar p-3">
            {pendingJurnals.length > 0 ? (
              <div className="space-y-2">
                {pendingJurnals.map(j => (
                  <div key={j.id} className="p-3.5 bg-slate-50 hover:bg-slate-100/50 rounded-[var(--ui-radius-card)] border border-slate-100 hover:border-slate-200 transition-all flex flex-col gap-1.5 cursor-pointer group">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-black text-slate-800 line-clamp-1 group-hover:text-[var(--ui-primary)] transition-colors">{j.student_name || j.student_nis}</p>
                      {j.created_at && (
                        <span className="text-[9px] font-bold text-slate-400 shrink-0 uppercase tracking-wider">
                          {new Date(j.created_at).toLocaleDateString("id-ID", { day:'numeric', month:'short' })}
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] font-medium text-slate-500 line-clamp-2 leading-relaxed">{j.kegiatan || j.activity ||"—"}</p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-center gap-3 p-4">
                <div className="w-14 h-14 bg-emerald-50 rounded-full flex items-center justify-center mb-1 border-4 border-emerald-100/50">
                  <Clock size={24} className="text-emerald-500" strokeWidth={2.5} />
                </div>
                <div>
                  <p className="text-sm font-black text-slate-700">Tidak ada jurnal pending</p>
                  <p className="text-[11px] font-medium text-slate-400 max-w-[200px] mt-1 mx-auto leading-relaxed">Semua aktivitas PKL siswa sudah divalidasi oleh pembimbing.</p>
                </div>
              </div>
            )}
          </div>
          {pendingJurnals.length >= 10 && (
            <div className="px-5 py-3 border-t border-slate-100 bg-slate-50/50 text-center shrink-0 rounded-b-[var(--ui-radius-card)]">
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Menampilkan {pendingJurnals.length} jurnal terbaru</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DashboardPKL;
