import { useState, useEffect, useMemo } from 'react';
import { 
  Building2, Upload, Download, Plus, Search, CheckCircle2, Clock, 
  MapPin, Users, Edit3, Trash2, Filter, X, ArrowUpDown, 
  Compass, ListFilter, AlertCircle, Phone, Sparkles, Check, RefreshCw
} from 'lucide-react';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { PageHeader } from "../../../components/monitoring/ui/index.js";
import { Button, Modal } from '../../../components/ui.jsx';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import ImportModal from "../../../components/monitoring/ui/ImportModal.jsx";
import { CustomSelect } from '../../../components/CustomSelect.jsx';
import { usePagination } from '../../../components/ui/PaginationControls.jsx';

// Leaflet default icon fix
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

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
  try {
    const raw = sessionStorage.getItem("school_schedule_session_v1");
    if (raw) return JSON.parse(raw)?.authToken;
  } catch (e) {}
  return null;
};

function ChangeMapView({ center, zoom }) {
  const map = useMap();
  useEffect(() => {
    if (center && center[0] && center[1]) {
      map.flyTo(center, zoom || 11, { duration: 1.2 });
    }
  }, [center, zoom, map]);
  return null;
}

const DataPerusahaan = ({ students = [], readOnly = false, majors = [] }) => {
  const [locations, setLocations] = useState([]);
  const [pklStudentsMapping, setPklStudentsMapping] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterJurusan, setFilterJurusan] = useState('Semua');
  const [filterVerified, setFilterVerified] = useState('Semua'); // 'Semua' | 'verified' | 'pending'
  const [sortBy, setSortBy] = useState('nama_asc'); // 'nama_asc' | 'nama_desc' | 'kuota_desc' | 'status_pending'
  const [view, setView] = useState('list'); // 'list' | 'map'
  const [showMobileFilters, setShowMobileFilters] = useState(false);

  const [showAddModal, setShowAddModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [formData, setFormData] = useState({ 
    id: null, 
    nama_perusahaan: '', 
    alamat: '', 
    kota: 'Bekasi', 
    bidang: '', 
    telepon: '', 
    jurusan: 'TKJ', 
    kuota: 15, 
    lat: -6.2618, 
    lng: 107.0005, 
    kompetensi: [] 
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toast, setToast] = useState(null);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  const fetchLocationsAndPlacements = () => {
    setLoading(true);
    const token = getToken();

    Promise.all([
      fetch('/api/pkl/locations', { headers: token ? { 'Authorization': `Bearer ${token}` } : {} })
        .then(res => res.json()).catch(() => ({ ok: false, data: [] })),
      fetch('/api/monitoring/pkl-students', { headers: token ? { 'Authorization': `Bearer ${token}` } : {} })
        .then(res => res.json()).catch(() => ({ ok: false, data: [] }))
    ]).then(([locData, pklData]) => {
      if (locData?.ok) setLocations(Array.isArray(locData.data) ? locData.data : []);
      if (pklData?.ok) setPklStudentsMapping(Array.isArray(pklData.data) ? pklData.data : []);
      setLoading(false);
    }).catch(() => setLoading(false));
  };

  useEffect(() => {
    fetchLocationsAndPlacements();
  }, []);

  const jurusanOptions = useMemo(() => {
    const fromSchool = majors || [];
    const fromLocations = locations.map(p => p.jurusan).filter(Boolean);
    const unique = Array.from(new Set([...fromSchool, ...fromLocations]));
    unique.sort((a, b) => a.localeCompare(b));
    return ['Semua', ...unique];
  }, [majors, locations]);

  const handleAddSubmit = async (e) => {
    e.preventDefault();
    if (!formData.nama_perusahaan.trim()) {
      showToast('Nama perusahaan wajib diisi.', 'error');
      return;
    }

    setIsSubmitting(true);
    const token = getToken();
    try {
      const isEdit = !!formData.id;
      const url = isEdit ? `/api/pkl/locations/${formData.id}` : '/api/pkl/locations';
      const method = isEdit ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method: method,
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` 
        },
        body: JSON.stringify(formData)
      });
      if (res.ok) {
        setShowAddModal(false);
        fetchLocationsAndPlacements();
        showToast(isEdit ? 'Data perusahaan berhasil diperbarui!' : 'Perusahaan mitra baru berhasil ditambahkan!');
        setFormData({ id: null, nama_perusahaan: '', alamat: '', kota: 'Bekasi', bidang: '', telepon: '', jurusan: 'TKJ', kuota: 15, lat: -6.2618, lng: 107.0005, kompetensi: [] });
      } else {
        showToast('Gagal menyimpan data perusahaan.', 'error');
      }
    } catch (error) {
      showToast('Terjadi kesalahan koneksi.', 'error');
    }
    setIsSubmitting(false);
  };

  const handleEdit = (p) => {
    setFormData({
      id: p.id,
      nama_perusahaan: p.nama_perusahaan || '',
      alamat: p.alamat || '',
      kota: p.kota || '',
      bidang: p.bidang || '',
      telepon: p.telepon || '',
      jurusan: p.jurusan || 'TKJ',
      kuota: p.kuota || 15,
      lat: p.lat || -6.2618,
      lng: p.lng || 107.0005,
      kompetensi: typeof p.kompetensi === 'string' ? JSON.parse(p.kompetensi || '[]') : (p.kompetensi || [])
    });
    setShowAddModal(true);
  };

  const handleDelete = async (id, nama) => {
    if (typeof window !== 'undefined' && window.confirm) {
      if (!window.confirm(`Yakin ingin menghapus perusahaan "${nama}"? Data penempatan siswa di perusahaan ini akan dilepas.`)) return;
    }
    const token = getToken();
    try {
      const res = await fetch(`/api/pkl/locations/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        showToast(`Perusahaan "${nama}" berhasil dihapus.`);
        fetchLocationsAndPlacements();
      } else {
        showToast('Gagal menghapus data.', 'error');
      }
    } catch (err) {
      showToast('Gagal menghapus data.', 'error');
    }
  };

  const handleVerify = async (id, nama) => {
    const token = getToken();
    try {
      const res = await fetch(`/api/pkl/locations/${id}/verify`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        showToast(`Perusahaan "${nama}" berhasil diverifikasi.`);
        fetchLocationsAndPlacements();
      }
    } catch (err) { 
      showToast('Gagal memverifikasi perusahaan.', 'error');
    }
  };

  // Filtered & Sorted Company List
  const filtered = useMemo(() => {
    const safeLocations = Array.isArray(locations) ? locations : [];
    const res = safeLocations.filter(p => {
      const nama = String(p.nama_perusahaan || '').toLowerCase();
      const alamat = String(p.alamat || '').toLowerCase();
      const kota = String(p.kota || '').toLowerCase();
      const bidang = String(p.bidang || '').toLowerCase();
      const q = String(search || '').toLowerCase();

      const matchSearch = nama.includes(q) || alamat.includes(q) || kota.includes(q) || bidang.includes(q);
      const matchJurusan = filterJurusan === 'Semua' || (p.jurusan || '').includes(filterJurusan);
      const matchVerified = filterVerified === 'Semua' || 
        (filterVerified === 'verified' && (p.verified || p.status === 'aktif')) || 
        (filterVerified === 'pending' && !p.verified && p.status !== 'aktif');
      return matchSearch && matchJurusan && matchVerified;
    });

    res.sort((a, b) => {
      const nameA = String(a.nama_perusahaan || '');
      const nameB = String(b.nama_perusahaan || '');
      if (sortBy === 'nama_asc') return nameA.localeCompare(nameB);
      if (sortBy === 'nama_desc') return nameB.localeCompare(nameA);
      if (sortBy === 'kuota_desc') return (b.kuota || 0) - (a.kuota || 0);
      if (sortBy === 'status_pending') {
        const isVerA = a.verified || a.status === 'aktif';
        const isVerB = b.verified || b.status === 'aktif';
        if (isVerA === isVerB) return nameA.localeCompare(nameB);
        return isVerA ? 1 : -1;
      }
      return 0;
    });

    return res;
  }, [locations, search, filterJurusan, filterVerified, sortBy]);

  const { paginatedData: currentLocations, PaginationBar } = usePagination(filtered, 12);

  // Map coordinates calculation
  const locationsWithCoords = useMemo(() => {
    return filtered.filter(l => l.lat && l.lng && !isNaN(parseFloat(l.lat)) && !isNaN(parseFloat(l.lng)));
  }, [filtered]);

  const mapCenter = useMemo(() => {
    if (locationsWithCoords.length === 0) return [-6.2618, 107.0005];
    const avgLat = locationsWithCoords.reduce((s, l) => s + parseFloat(l.lat), 0) / locationsWithCoords.length;
    const avgLng = locationsWithCoords.reduce((s, l) => s + parseFloat(l.lng), 0) / locationsWithCoords.length;
    return [avgLat, avgLng];
  }, [locationsWithCoords]);

  const verifiedCount = locations.filter(l => l.verified || l.status === 'aktif').length;
  const pendingCount = locations.filter(l => !l.verified && l.status !== 'aktif').length;

  const handleExport = () => {
    const exportData = filtered.map(p => {
      const terisi = pklStudentsMapping.filter(s => String(s.location_id) === String(p.id)).length;
      return {
        ID: p.id,
        "Nama Perusahaan": p.nama_perusahaan,
        Alamat: p.alamat,
        Kota: p.kota,
        Telepon: p.telepon,
        "Bidang Usaha": p.bidang,
        Jurusan: p.jurusan,
        "Kuota Maks": p.kuota,
        "Siswa Ditempatkan": terisi,
        Status: p.verified ? "Terverifikasi" : "Menunggu"
      };
    });
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet("Perusahaan PKL");
    if (exportData.length > 0) {
      const keys = Object.keys(exportData[0]);
      ws.addRow(keys);
      exportData.forEach(item => ws.addRow(keys.map(k => item[k])));
    }
    wb.xlsx.writeBuffer().then(buf => {
      saveAs(new Blob([buf]), "Data_Perusahaan_PKL.xlsx");
    });
  };

  const handleProcessImport = async (jsonData) => {
    let successCount = 0;
    const token = getToken();

    for (const row of jsonData) {
      const payload = {
        nama_perusahaan: row['Nama Perusahaan'] || row['nama_perusahaan'] || '',
        alamat: row['Alamat'] || row['alamat'] || '',
        kota: row['Kota'] || row['kota'] || 'Bekasi',
        telepon: row['Telepon'] || row['telepon'] || '',
        bidang: row['Bidang Usaha'] || row['Bidang'] || row['bidang'] || '',
        jurusan: row['Jurusan'] || row['jurusan'] || 'TKJ',
        kuota: parseInt(row['Kuota'] || row['kuota']) || 15,
        lat: -6.2618,
        lng: 107.0005,
        kompetensi: []
      };
      
      if (!payload.nama_perusahaan) continue;
      
      try {
        const res = await fetch('/api/pkl/locations', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}` 
          },
          body: JSON.stringify(payload)
        });
        if (res.ok) successCount++;
      } catch (err) {
        console.error("Gagal menyimpan row", payload.nama_perusahaan, err);
      }
    }
    
    showToast(`Berhasil menyimpan ${successCount} data perusahaan baru.`);
    fetchLocationsAndPlacements();
  };

  return (
    <div className="space-y-4 sm:space-y-6 animate-in fade-in duration-300 pb-10">
      {/* Clean Page Header */}
      <PageHeader
        icon={Building2}
        title="Data Perusahaan PKL"
        description={`Direktori ${locations.length} mitra DUDI (${verifiedCount} Terverifikasi, ${pendingCount} Menunggu).`}
        rightContent={
          !readOnly && (
            <div className="flex items-center gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setShowImportModal(true)} 
                className="flex items-center gap-1.5 font-bold shadow-[var(--ui-shadow-control)]"
              >
                <Upload size={13} strokeWidth={2.5} /> Impor
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleExport} 
                className="flex items-center gap-1.5 font-bold shadow-[var(--ui-shadow-control)]"
              >
                <Download size={13} strokeWidth={2.5} /> Ekspor
              </Button>
              <Button 
                variant="primary" 
                size="sm" 
                onClick={() => {
                  setFormData({ id: null, nama_perusahaan: '', alamat: '', kota: 'Bekasi', bidang: '', telepon: '', jurusan: 'TKJ', kuota: 15, lat: -6.2618, lng: 107.0005, kompetensi: [] });
                  setShowAddModal(true);
                }} 
                className="flex items-center gap-1.5 font-bold shadow-sm"
              >
                <Plus size={14} strokeWidth={2.5} /> Tambah Mitra
              </Button>
            </div>
          )
        }
      />

      {/* 3 Quick Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 sm:gap-4">
        <div 
          onClick={() => { setFilterVerified('Semua'); }}
          className={`bg-white rounded-[var(--ui-radius-card)] p-4 sm:p-5 border cursor-pointer transition-all duration-200 flex items-center justify-between shadow-[var(--ui-shadow-card)] hover:shadow-[var(--ui-shadow-card-hover)] hover:-translate-y-0.5 ${
            filterVerified === 'Semua' ? 'border-[var(--ui-primary)] ring-2 ring-[var(--ui-primary)]/20' : 'border-slate-200/80'
          }`}
        >
          <div>
            <span className="text-[10px] sm:text-[11px] font-black uppercase tracking-wider text-slate-400 block mb-1">
              TOTAL MITRA PKL
            </span>
            <div className="flex items-baseline gap-2">
              <h3 className="text-2xl sm:text-3xl font-black text-slate-800 tracking-tight">{locations.length}</h3>
              <span className="text-xs font-bold text-slate-400">Industri</span>
            </div>
          </div>
          <div className="w-11 h-11 rounded-[var(--ui-radius-control)] bg-indigo-50 text-indigo-600 border border-indigo-200/60 flex items-center justify-center shrink-0 shadow-xs">
            <Building2 size={22} strokeWidth={2.5} />
          </div>
        </div>

        <div 
          onClick={() => { setFilterVerified('verified'); }}
          className={`bg-white rounded-[var(--ui-radius-card)] p-4 sm:p-5 border cursor-pointer transition-all duration-200 flex items-center justify-between shadow-[var(--ui-shadow-card)] hover:shadow-[var(--ui-shadow-card-hover)] hover:-translate-y-0.5 ${
            filterVerified === 'verified' ? 'border-emerald-500 ring-2 ring-emerald-500/20' : 'border-slate-200/80'
          }`}
        >
          <div>
            <span className="text-[10px] sm:text-[11px] font-black uppercase tracking-wider text-emerald-600 block mb-1">
              TERVERIFIKASI
            </span>
            <div className="flex items-baseline gap-2">
              <h3 className="text-2xl sm:text-3xl font-black text-emerald-700 tracking-tight">{verifiedCount}</h3>
              <span className="text-xs font-bold text-emerald-600">Mitra Resmi</span>
            </div>
          </div>
          <div className="w-11 h-11 rounded-[var(--ui-radius-control)] bg-emerald-50 text-emerald-600 border border-emerald-200/60 flex items-center justify-center shrink-0 shadow-xs">
            <CheckCircle2 size={22} strokeWidth={2.5} />
          </div>
        </div>

        <div 
          onClick={() => { setFilterVerified('pending'); }}
          className={`bg-white rounded-[var(--ui-radius-card)] p-4 sm:p-5 border cursor-pointer transition-all duration-200 flex items-center justify-between shadow-[var(--ui-shadow-card)] hover:shadow-[var(--ui-shadow-card-hover)] hover:-translate-y-0.5 ${
            filterVerified === 'pending' ? 'border-amber-500 ring-2 ring-amber-500/20' : 'border-slate-200/80'
          }`}
        >
          <div>
            <span className="text-[10px] sm:text-[11px] font-black uppercase tracking-wider text-amber-600 block mb-1">
              MENUNGGU VERIFIKASI
            </span>
            <div className="flex items-baseline gap-2">
              <h3 className="text-2xl sm:text-3xl font-black text-amber-700 tracking-tight">{pendingCount}</h3>
              <span className="text-xs font-bold text-amber-600">Pengajuan</span>
            </div>
          </div>
          <div className="w-11 h-11 rounded-[var(--ui-radius-control)] bg-amber-50 text-amber-600 border border-amber-200/60 flex items-center justify-center shrink-0 shadow-xs">
            <Clock size={22} strokeWidth={2.5} />
          </div>
        </div>
      </div>

      {/* Main Filter & View Bar (View Switcher is placed cleanly here!) */}
      <div className="bg-white rounded-[var(--ui-radius-card)] p-4 sm:p-5 border border-slate-200/80 shadow-[var(--ui-shadow-card)] space-y-4">
        {/* Row 1: Search + Status Tabs + View Mode Switcher */}
        <div className="flex flex-col lg:flex-row gap-3 items-stretch lg:items-center justify-between">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={e => { setSearch(e.target.value); }}
              placeholder="Cari nama perusahaan, alamat, bidang usaha, atau kota..."
              className="w-full pl-10 pr-10 py-2 bg-[var(--ui-surface-muted)] hover:bg-white border border-[var(--ui-border-soft)] rounded-[var(--ui-radius-control)] text-xs font-bold text-slate-800 placeholder-slate-400 focus:outline-none focus:bg-white focus:shadow-[var(--ui-focus-ring)] focus:border-[var(--ui-primary)] transition-all"
            />
            {search && (
              <button 
                onClick={() => setSearch('')} 
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 border-none bg-transparent cursor-pointer"
              >
                <X size={15} />
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Status Tabs */}
            <div className="flex items-center gap-1 bg-[var(--ui-surface-muted)] p-1 rounded-[var(--ui-radius-control)] border border-[var(--ui-border-muted)] shrink-0">
              {[
                { id: 'Semua', label: 'Semua Status' },
                { id: 'verified', label: 'Terverifikasi' },
                { id: 'pending', label: 'Menunggu' }
              ].map(st => (
                <button
                  key={st.id}
                  type="button"
                  onClick={() => { setFilterVerified(st.id); }}
                  className={`px-3 py-1.5 rounded-[var(--ui-radius-small)] text-xs font-black transition-all cursor-pointer border-none whitespace-nowrap ${
                    filterVerified === st.id 
                      ? 'bg-white text-slate-800 shadow-xs' 
                      : 'text-slate-500 hover:text-slate-800 bg-transparent'
                  }`}
                >
                  {st.label}
                </button>
              ))}
            </div>

            {/* View Mode Switcher (Daftar / Peta) */}
            <div className="flex items-center gap-1 bg-[var(--ui-surface-muted)] p-1 rounded-[var(--ui-radius-control)] border border-[var(--ui-border-muted)] shrink-0">
              <button
                onClick={() => setView('list')}
                className={`px-3 py-1.5 rounded-[var(--ui-radius-small)] text-xs font-black transition-all cursor-pointer border-none flex items-center gap-1.5 ${
                  view === 'list' 
                    ? 'bg-[var(--ui-primary)] text-white shadow-xs' 
                    : 'text-slate-600 hover:text-slate-900 bg-transparent'
                }`}
              >
                <ListFilter size={13} />
                <span>Daftar</span>
              </button>
              <button
                onClick={() => setView('map')}
                className={`px-3 py-1.5 rounded-[var(--ui-radius-small)] text-xs font-black transition-all cursor-pointer border-none flex items-center gap-1.5 ${
                  view === 'map' 
                    ? 'bg-[var(--ui-primary)] text-white shadow-xs' 
                    : 'text-slate-600 hover:text-slate-900 bg-transparent'
                }`}
              >
                <Compass size={13} />
                <span>Peta</span>
              </button>
            </div>
          </div>
        </div>

        {/* Row 2: Filter Jurusan & Sortir */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3 border-t border-[var(--ui-border-muted)]">
          <div>
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1 block">Filter Jurusan Prioritas:</label>
            <CustomSelect
              value={filterJurusan}
              onChange={val => { setFilterJurusan(val); }}
              options={jurusanOptions.map(j => ({ value: j, label: j === 'Semua' ? 'Semua Jurusan' : `Jurusan ${j}` }))}
              placeholder="Semua Jurusan"
              searchable={false}
            />
          </div>

          <div>
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1 block flex items-center gap-1">
              <ArrowUpDown size={11} className="text-slate-400" /> Sortir & Urutan:
            </label>
            <CustomSelect
              value={sortBy}
              onChange={val => { setSortBy(val); }}
              searchable={false}
              options={[
                { value: 'nama_asc', label: 'Nama Perusahaan (A - Z)' },
                { value: 'nama_desc', label: 'Nama Perusahaan (Z - A)' },
                { value: 'kuota_desc', label: 'Kuota Siswa Terbesar' },
                { value: 'status_pending', label: 'Status: Menunggu Verifikasi Dahulu' },
              ]}
            />
          </div>
        </div>
      </div>

      {/* Main Body: Cards Grid View or Interactive Map View */}
      {view === 'map' ? (
        <div className="bg-white rounded-[var(--ui-radius-card)] border border-slate-200/80 shadow-[var(--ui-shadow-card)] overflow-hidden flex flex-col h-[520px]">
          <div className="p-3 bg-[var(--ui-surface-muted)] border-b border-[var(--ui-border-muted)] flex items-center justify-between text-xs font-bold text-slate-700">
            <span>Peta Interaktif Sebaran DUDI ({locationsWithCoords.length} Lokasi Berkoordinat)</span>
            <span className="text-[11px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200/60 font-black">
              GPS Synchronized
            </span>
          </div>
          <div className="flex-1 w-full relative z-0">
            <MapContainer 
              center={mapCenter} 
              zoom={11} 
              scrollWheelZoom={true} 
              className="w-full h-full" 
              style={{ zIndex: 0 }}
            >
              <ChangeMapView center={mapCenter} zoom={11} />
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              {locationsWithCoords.map(loc => {
                const terisi = pklStudentsMapping.filter(s => String(s.location_id) === String(loc.id)).length;
                return (
                  <Marker 
                    key={loc.id} 
                    position={[parseFloat(loc.lat), parseFloat(loc.lng)]}
                    icon={createCustomIcon('#059669')}
                  >
                    <Popup>
                      <div className="p-2 min-w-[210px] text-slate-800 font-sans">
                        <h4 className="font-extrabold text-sm text-slate-900 mb-1">{loc.nama_perusahaan}</h4>
                        <p className="text-xs text-slate-500 mb-2 leading-relaxed">{loc.alamat || loc.kota}</p>
                        <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">
                          <span className="font-bold text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-200/60">
                            {loc.jurusan || 'Umum'}
                          </span>
                          <span className="font-black text-emerald-700">
                            {terisi} / {loc.kuota || 15} Siswa
                          </span>
                        </div>
                      </div>
                    </Popup>
                  </Marker>
                );
              })}
            </MapContainer>
          </div>
        </div>
      ) : (
        /* Modern Cards Grid View */
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5 sm:gap-4">
            {currentLocations.map(p => {
              const terisi = pklStudentsMapping.filter(s => String(s.location_id) === String(p.id)).length;
              const maxKuota = Number(p.kuota) || 15;
              const percent = maxKuota > 0 ? Math.min(100, Math.round((terisi / maxKuota) * 100)) : 0;
              const isVerified = p.verified || p.status === 'aktif';

              return (
                <div 
                  key={p.id} 
                  className="bg-white rounded-[var(--ui-radius-card)] p-4 sm:p-5 border border-slate-200/80 shadow-[var(--ui-shadow-card)] hover:shadow-[var(--ui-shadow-card-hover)] hover:-translate-y-0.5 transition-all duration-200 flex flex-col justify-between group"
                >
                  <div>
                    {/* Top Row: Icon, Name, and Status Badge */}
                    <div className="flex items-start justify-between gap-3 mb-2.5">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-10 h-10 rounded-[var(--ui-radius-control)] bg-indigo-50 text-indigo-600 border border-indigo-200/60 flex items-center justify-center shrink-0 shadow-xs group-hover:scale-105 transition-transform">
                          <Building2 size={20} strokeWidth={2.2} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <h4 className="font-extrabold text-slate-900 text-sm truncate leading-snug" title={p.nama_perusahaan}>
                            {p.nama_perusahaan}
                          </h4>
                          <p className="text-[11px] text-slate-400 font-medium truncate mt-0.5">
                            {p.bidang || "Mitra Industri PKL"}
                          </p>
                        </div>
                      </div>

                      <span className={`px-2 py-0.5 rounded-[var(--ui-radius-pill)] text-[9.5px] font-black uppercase shrink-0 border ${
                        isVerified
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200/80'
                          : 'bg-amber-50 text-amber-700 border-amber-200/80'
                      }`}>
                        {isVerified ? 'Terverifikasi' : 'Menunggu'}
                      </span>
                    </div>

                    {/* Address & Contact Details */}
                    <div className="bg-[var(--ui-surface-muted)] p-2.5 rounded-[var(--ui-radius-control)] border border-[var(--ui-border-muted)] space-y-1 mb-3 text-[11px]">
                      <p className="text-slate-600 font-medium line-clamp-1 flex items-center gap-1.5" title={p.alamat}>
                        <MapPin size={12} className="text-slate-400 shrink-0" />
                        <span className="truncate">{p.alamat || p.kota || 'Alamat belum diatur'}</span>
                      </p>
                      {p.telepon && (
                        <p className="text-slate-500 font-medium flex items-center gap-1.5">
                          <Phone size={12} className="text-slate-400 shrink-0" />
                          <span>{p.telepon}</span>
                        </p>
                      )}
                    </div>

                    {/* Major Tags */}
                    {p.jurusan && (
                      <div className="flex items-center gap-1 flex-wrap mb-3">
                        {p.jurusan.split(/[,/]+/).map((j, i) => (
                          <span key={i} className="text-[9.5px] font-black px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200/60 uppercase">
                            {j.trim()}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Quota Progress Bar & Action Buttons */}
                  <div className="pt-3 border-t border-[var(--ui-border-muted)] space-y-2.5">
                    <div>
                      <div className="flex items-center justify-between text-[11px] font-bold mb-1">
                        <span className="text-slate-500">Kapasitas Penempatan:</span>
                        <span className="text-slate-800 font-black">{terisi} / {maxKuota} Siswa ({percent}%)</span>
                      </div>
                      <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
                        <div 
                          className={`h-full rounded-full transition-all duration-500 ${
                            percent >= 100 ? 'bg-rose-500' : percent >= 75 ? 'bg-amber-500' : 'bg-emerald-500'
                          }`}
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                    </div>

                    {!readOnly && (
                      <div className="flex items-center justify-end gap-1.5 pt-1">
                        {!isVerified && (
                          <button
                            type="button"
                            onClick={() => handleVerify(p.id, p.nama_perusahaan)}
                            className="px-2.5 py-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-[var(--ui-radius-small)] border border-emerald-200 transition-all cursor-pointer flex items-center gap-1"
                            title="Verifikasi Perusahaan"
                          >
                            <Check size={12} /> Verifikasi
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => handleEdit(p)}
                          className="px-2.5 py-1 text-[11px] font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-[var(--ui-radius-small)] border border-slate-200 transition-all cursor-pointer flex items-center gap-1"
                          title="Edit Data Perusahaan"
                        >
                          <Edit3 size={12} /> Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(p.id, p.nama_perusahaan)}
                          className="px-2 py-1 text-[11px] font-bold text-rose-600 bg-rose-50 hover:bg-rose-100 rounded-[var(--ui-radius-small)] border border-rose-200 transition-all cursor-pointer flex items-center gap-1"
                          title="Hapus Perusahaan"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Empty State */}
          {filtered.length === 0 && (
            <div className="bg-white rounded-[var(--ui-radius-card)] p-12 text-center border border-slate-200/80">
              <Building2 size={36} className="mx-auto text-slate-300 mb-2" />
              <h4 className="text-sm font-bold text-slate-700">Tidak ada data perusahaan mitra</h4>
              <p className="text-xs text-slate-400 mt-1">Coba sesuaikan kata kunci pencarian atau tambah mitra baru.</p>
            </div>
          )}

          {/* Pagination Controls */}
          <div className="bg-white rounded-[var(--ui-radius-card)] border border-slate-200/80 overflow-hidden">
            <PaginationBar />
          </div>
        </div>
      )}

      {/* Modal Tambah / Edit Perusahaan */}
      {showAddModal && (
        <Modal
          isOpen={showAddModal}
          onClose={() => setShowAddModal(false)}
          title={formData.id ? "Edit Perusahaan Mitra PKL" : "Tambah Perusahaan Mitra PKL"}
          maxWidth="max-w-xl"
        >
          <form onSubmit={handleAddSubmit} className="space-y-3.5">
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">
                Nama Perusahaan / Industri <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.nama_perusahaan}
                onChange={e => setFormData({ ...formData, nama_perusahaan: e.target.value })}
                placeholder="Contoh: PT Astra Honda Motor"
                className="w-full h-9 px-3 text-xs font-bold rounded-[var(--ui-radius-control)] border border-[var(--ui-border-soft)] bg-white text-slate-800 focus:outline-none focus:border-[var(--ui-primary)] focus:shadow-[var(--ui-focus-ring)]"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Bidang Usaha</label>
                <input
                  type="text"
                  value={formData.bidang}
                  onChange={e => setFormData({ ...formData, bidang: e.target.value })}
                  placeholder="Contoh: Manufaktur Otomotif"
                  className="w-full h-9 px-3 text-xs font-bold rounded-[var(--ui-radius-control)] border border-[var(--ui-border-soft)] bg-white text-slate-800 focus:outline-none focus:border-[var(--ui-primary)] focus:shadow-[var(--ui-focus-ring)]"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Kota / Wilayah</label>
                <input
                  type="text"
                  value={formData.kota}
                  onChange={e => setFormData({ ...formData, kota: e.target.value })}
                  placeholder="Contoh: Bekasi / Cikarang"
                  className="w-full h-9 px-3 text-xs font-bold rounded-[var(--ui-radius-control)] border border-[var(--ui-border-soft)] bg-white text-slate-800 focus:outline-none focus:border-[var(--ui-primary)] focus:shadow-[var(--ui-focus-ring)]"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Alamat Lengkap</label>
              <textarea
                rows={2}
                value={formData.alamat}
                onChange={e => setFormData({ ...formData, alamat: e.target.value })}
                placeholder="Jl. Raya Kawasan Industri MM2100 Blok KK..."
                className="w-full p-2.5 text-xs font-medium rounded-[var(--ui-radius-control)] border border-[var(--ui-border-soft)] bg-white text-slate-800 focus:outline-none focus:border-[var(--ui-primary)] focus:shadow-[var(--ui-focus-ring)]"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Jurusan yang Sesuai</label>
                <input
                  type="text"
                  value={formData.jurusan}
                  onChange={e => setFormData({ ...formData, jurusan: e.target.value })}
                  placeholder="TKJ, RPL, TKR"
                  className="w-full h-9 px-3 text-xs font-bold rounded-[var(--ui-radius-control)] border border-[var(--ui-border-soft)] bg-white text-slate-800 focus:outline-none focus:border-[var(--ui-primary)] focus:shadow-[var(--ui-focus-ring)]"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Kapasitas Kuota</label>
                <input
                  type="number"
                  min={1}
                  value={formData.kuota}
                  onChange={e => setFormData({ ...formData, kuota: parseInt(e.target.value) || 0 })}
                  className="w-full h-9 px-3 text-xs font-bold rounded-[var(--ui-radius-control)] border border-[var(--ui-border-soft)] bg-white text-slate-800 focus:outline-none focus:border-[var(--ui-primary)] focus:shadow-[var(--ui-focus-ring)]"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">No. Telepon</label>
                <input
                  type="text"
                  value={formData.telepon}
                  onChange={e => setFormData({ ...formData, telepon: e.target.value })}
                  placeholder="(021) 8980123"
                  className="w-full h-9 px-3 text-xs font-bold rounded-[var(--ui-radius-control)] border border-[var(--ui-border-soft)] bg-white text-slate-800 focus:outline-none focus:border-[var(--ui-primary)] focus:shadow-[var(--ui-focus-ring)]"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-1">
              <div>
                <label className="text-[11px] font-bold text-slate-500 block mb-1">Latitude GPS</label>
                <input
                  type="number"
                  step="any"
                  value={formData.lat}
                  onChange={e => setFormData({ ...formData, lat: parseFloat(e.target.value) || 0 })}
                  className="w-full h-8 px-2.5 text-xs font-mono rounded-[var(--ui-radius-control)] border border-[var(--ui-border-muted)] bg-slate-50 text-slate-700"
                />
              </div>
              <div>
                <label className="text-[11px] font-bold text-slate-500 block mb-1">Longitude GPS</label>
                <input
                  type="number"
                  step="any"
                  value={formData.lng}
                  onChange={e => setFormData({ ...formData, lng: parseFloat(e.target.value) || 0 })}
                  className="w-full h-8 px-2.5 text-xs font-mono rounded-[var(--ui-radius-control)] border border-[var(--ui-border-muted)] bg-slate-50 text-slate-700"
                />
              </div>
            </div>

            <div className="pt-3 border-t border-[var(--ui-border-muted)] flex items-center justify-end gap-2">
              <Button
                variant="outline"
                size="sm"
                type="button"
                onClick={() => setShowAddModal(false)}
              >
                Batal
              </Button>
              <Button
                variant="primary"
                size="sm"
                type="submit"
                disabled={isSubmitting}
                className="flex items-center gap-1.5"
              >
                {isSubmitting ? <RefreshCw size={13} className="animate-spin" /> : <Check size={14} />}
                <span>{isSubmitting ? 'Menyimpan...' : 'Simpan Perusahaan'}</span>
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* Modal Impor Excel */}
      {showImportModal && (
        <ImportModal
          isOpen={showImportModal}
          onClose={() => setShowImportModal(false)}
          onImport={handleProcessImport}
          title="Impor Data Perusahaan PKL"
          templateName="Template_Perusahaan_PKL"
        />
      )}

      {/* Toast Notification */}
      {toast && (
        <div className={`fixed bottom-6 right-6 px-4 py-3 rounded-[var(--ui-radius-control)] shadow-[var(--ui-shadow-modal)] font-bold text-xs flex items-center gap-2 animate-in slide-in-from-bottom-5 text-white z-[100] ${
          toast.type === 'error' ? 'bg-rose-600' : 'bg-emerald-600'
        }`}>
          {toast.type === 'error' ? <AlertCircle size={16} /> : <CheckCircle2 size={16} />} 
          <span>{toast.message}</span>
        </div>
      )}
    </div>
  );
};

export default DataPerusahaan;
