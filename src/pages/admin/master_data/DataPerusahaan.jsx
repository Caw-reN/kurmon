import { useState, useEffect, useMemo } from 'react';
import { 
  Building2, Upload, Download, Plus, Search, CheckCircle2, Clock, 
  MapPin, Users, Edit3, Trash2, Loader2, Filter, X, ArrowUpDown, 
  Map, List, Sparkles, AlertCircle, Phone, Tag
} from 'lucide-react';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { getMajorFullName } from '../../../utils/constants.js';
import { PageHeader, Badge } from "../../../components/monitoring/ui/index.js";
import { Button } from '../../../components/ui.jsx';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import ImportModal from "../../../components/monitoring/ui/ImportModal.jsx";
import { CustomSelect } from '../../../components/CustomSelect.jsx';
import { usePagination } from '../../../components/ui/PaginationControls.jsx';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

const JURUSAN_COLORS = { TJKT: '#15803d', TKJ: '#15803d', TKR: '#b91c1c', MP: '#7c3aed', Akuntansi: '#7c3aed', AK: '#047857', DKV: '#db2777' };

const createIcon = (color) => L.divIcon({
  className: '',
  html: `<div style="width:28px;height:28px;border-radius:50% 50% 50% 0;background:${color};transform:rotate(-45deg);border:2px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.25)"></div>`,
  iconSize: [28, 28], iconAnchor: [14, 28], popupAnchor: [0, -30],
});

const DataPerusahaan = ({ students = [], readOnly, majors = [] }) => {
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterJurusan, setFilterJurusan] = useState('Semua');
  const [filterVerified, setFilterVerified] = useState('Semua'); //'Semua' | 'verified' | 'pending'
  const [sortBy, setSortBy] = useState('nama_asc'); //'nama_asc' | 'nama_desc' | 'kuota_desc' | 'status_pending'
  const [view, setView] = useState('list'); //'list' | 'map'
  const [showMobileFilters, setShowMobileFilters] = useState(false);

  const [showAddModal, setShowAddModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [formData, setFormData] = useState({ 
    id: null, nama_perusahaan: '', alamat: '', kota: '', bidang: '', telepon: '', jurusan: '', kuota: 0, lat: -6.2618, lng: 107.0005, kompetensi: [] 
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toast, setToast] = useState(null);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  const jurusanOptions = useMemo(() => {
    const fromSchool = majors || [];
    const fromLocations = locations.map(p => p.jurusan).filter(Boolean);
    const unique = Array.from(new Set([...fromSchool, ...fromLocations]));
    unique.sort((a, b) => a.localeCompare(b));
    return ['Semua', ...unique];
  }, [majors, locations]);

  const fetchLocations = () => {
    setLoading(true);
    const sessionToken = JSON.parse(sessionStorage.getItem('school_schedule_session_v1') || '{}')?.authToken;
    fetch('/api/pkl/locations', {
      headers: { 'Authorization': `Bearer ${sessionToken}` }
    })
    .then(res => res.json())
    .then(data => {
      if (data.ok) setLocations(data.data || []);
      setLoading(false);
    })
    .catch(() => setLoading(false));
  };

  useEffect(() => {
    fetchLocations();
  }, []);

  const handleAddSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    const sessionToken = JSON.parse(sessionStorage.getItem('school_schedule_session_v1') || '{}')?.authToken;
    try {
      const isEdit = !!formData.id;
      const url = isEdit ? `/api/pkl/locations/${formData.id}` : '/api/pkl/locations';
      const method = isEdit ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method: method,
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${sessionToken}` 
        },
        body: JSON.stringify(formData)
      });
      if (res.ok) {
        setShowAddModal(false);
        fetchLocations();
        showToast(isEdit ? 'Data perusahaan berhasil diperbarui!' : 'Perusahaan mitra baru berhasil ditambahkan!');
        setFormData({ id: null, nama_perusahaan: '', alamat: '', kota: '', bidang: '', telepon: '', jurusan: '', kuota: 0, lat: -6.2618, lng: 107.0005, kompetensi: [] });
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
      jurusan: p.jurusan || '',
      kuota: p.kuota || 0,
      lat: p.lat || -6.2618,
      lng: p.lng || 107.0005,
      kompetensi: typeof p.kompetensi === 'string' ? JSON.parse(p.kompetensi || '[]') : (p.kompetensi || [])
    });
    setShowAddModal(true);
  };

  const handleDelete = async (id, nama) => {
    if (!await window.confirmAsync(`Yakin ingin menghapus perusahaan ${nama}?`)) return;
    const sessionToken = JSON.parse(sessionStorage.getItem('school_schedule_session_v1') || '{}')?.authToken;
    try {
      const res = await fetch(`/api/pkl/locations/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${sessionToken}` }
      });
      if (res.ok) {
        showToast(`Perusahaan "${nama}" berhasil dihapus.`);
        fetchLocations();
      }
    } catch (err) {
      showToast('Gagal menghapus data.', 'error');
    }
  };

  const handleVerify = async (id, nama) => {
    if (!await window.confirmAsync(`Verifikasi perusahaan "${nama}" sebagai mitra resmi? Status akan berubah menjadi Terverifikasi.`)) return;
    const sessionToken = JSON.parse(sessionStorage.getItem('school_schedule_session_v1') || '{}')?.authToken;
    try {
      const res = await fetch(`/api/pkl/locations/${id}/verify`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${sessionToken}` }
      });
      if (res.ok) {
        showToast(`Perusahaan "${nama}" berhasil diverifikasi.`);
        fetchLocations();
      }
    } catch (err) { 
      showToast('Gagal memverifikasi perusahaan.', 'error');
    }
  };

  const filtered = useMemo(() => {
    const res = locations.filter(p => {
      const matchSearch = p.nama_perusahaan.toLowerCase().includes(search.toLowerCase()) ||
        (p.alamat || '').toLowerCase().includes(search.toLowerCase()) ||
        (p.kota || '').toLowerCase().includes(search.toLowerCase());
      const matchJurusan = filterJurusan === 'Semua' || p.jurusan === filterJurusan;
      const matchVerified = filterVerified === 'Semua' || 
        (filterVerified === 'verified' && p.verified) || 
        (filterVerified === 'pending' && !p.verified);
      return matchSearch && matchJurusan && matchVerified;
    });

    res.sort((a, b) => {
      if (sortBy === 'nama_asc') return a.nama_perusahaan.localeCompare(b.nama_perusahaan);
      if (sortBy === 'nama_desc') return b.nama_perusahaan.localeCompare(a.nama_perusahaan);
      if (sortBy === 'kuota_desc') return (b.kuota || 0) - (a.kuota || 0);
      if (sortBy === 'status_pending') {
        if (a.verified === b.verified) return a.nama_perusahaan.localeCompare(b.nama_perusahaan);
        return a.verified ? 1 : -1;
      }
      return 0;
    });

  }, [locations, search, filterJurusan, filterVerified, sortBy]);

  const { paginatedData: currentLocations, PaginationBar } = usePagination(filtered, 20);

  const handleExport = () => {
    const exportData = filtered.map(p => ({
      ID: p.id,
      "Nama Perusahaan": p.nama_perusahaan,
      Alamat: p.alamat,
      Kota: p.kota,
      Telepon: p.telepon,
      "Bidang Usaha": p.bidang,
      Jurusan: p.jurusan,
      Kuota: p.kuota
    }));
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

  const handleDownloadTemplate = () => {
    const templateData = [
      {
        'Nama Perusahaan': 'PT Inovasi Teknologi',
        'Alamat': 'Jl. Sudirman No 123',
        'Kota': 'Jakarta',
        'Telepon': '021-123456',
        'Bidang Usaha': 'IT / Software',
        'Jurusan': 'TKJ',
        'Kuota': 5
      }
    ];
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet("Template Perusahaan");
    const keys = Object.keys(templateData[0]);
    ws.addRow(keys);
    templateData.forEach(item => ws.addRow(keys.map(k => item[k])));
    wb.xlsx.writeBuffer().then(buf => {
      saveAs(new Blob([buf]), "Template_Master_Perusahaan.xlsx");
    });
  };

  const handleProcessImport = async (jsonData) => {
    let successCount = 0;
    const sessionToken = JSON.parse(sessionStorage.getItem('school_schedule_session_v1') || '{}')?.authToken;

    for (const row of jsonData) {
      const payload = {
        nama_perusahaan: row['Nama Perusahaan'] || row['nama_perusahaan'] || '',
        alamat: row['Alamat'] || row['alamat'] || '',
        kota: row['Kota'] || row['kota'] || '',
        telepon: row['Telepon'] || row['telepon'] || '',
        bidang: row['Bidang Usaha'] || row['Bidang'] || row['bidang'] || '',
        jurusan: row['Jurusan'] || row['jurusan'] || 'Semua',
        kuota: parseInt(row['Kuota'] || row['kuota']) || 0,
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
            'Authorization': `Bearer ${sessionToken}` 
          },
          body: JSON.stringify(payload)
        });
        if (res.ok) successCount++;
      } catch (err) {
        console.error("Gagal menyimpan row", payload.nama_perusahaan, err);
      }
    }
    
    showToast(`Berhasil menyimpan ${successCount} data perusahaan baru.`);
    fetchLocations();
  };

  const verifiedCount = locations.filter(l => l.verified).length;
  const pendingCount = locations.filter(l => !l.verified).length;

  return (
    <div className="space-y-5 animate-in fade-in duration-300 pb-10">
      {/* Page Header */}
      <PageHeader
        icon={Building2}
        title="Data Perusahaan PKL"
        description={`${locations.length} mitra terdaftar (${verifiedCount} Terverifikasi, ${pendingCount} Menunggu)`}
      >
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
          {/* List / Map view toggle */}
          <div className="bg-white/10 backdrop-blur-md border border-white/25 p-1 rounded-[var(--ui-radius-small)] flex items-center shadow-sm">
            <button
              onClick={() => setView('list')}
              className={`flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-[var(--ui-radius-small)] text-xs font-black transition-all cursor-pointer border-none ${
                view === 'list' 
                  ? 'bg-white text-[var(--ui-primary)] shadow-sm' 
                  : 'bg-transparent text-white hover:bg-white/10'
              }`}
            >
              <List size={14} />
              <span>Daftar</span>
            </button>
            <button
              onClick={() => setView('map')}
              className={`flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-[var(--ui-radius-small)] text-xs font-black transition-all cursor-pointer border-none ${
                view === 'map' 
                  ? 'bg-white text-[var(--ui-primary)] shadow-sm' 
                  : 'bg-transparent text-white hover:bg-white/10'
              }`}
            >
              <Map size={14} />
              <span>Peta</span>
            </button>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            {!readOnly && (
              <button 
                onClick={() => setShowImportModal(true)} 
                className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 border-none h-9 px-3.5 rounded-[var(--ui-radius-small)] text-[var(--ui-primary)] bg-white font-black text-xs shadow-sm hover:bg-slate-50 cursor-pointer active:scale-95 transition-all"
              >
                <Upload size={14} strokeWidth={2.5} /> Impor
              </button>
            )}
            <button 
              onClick={handleExport} 
              className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 border-none h-9 px-3.5 rounded-[var(--ui-radius-small)] text-[var(--ui-primary)] bg-white font-black text-xs shadow-sm hover:bg-slate-50 cursor-pointer active:scale-95 transition-all"
            >
              <Download size={14} strokeWidth={2.5} /> Ekspor
            </button>
            {!readOnly && (
              <button 
                onClick={() => { 
                  setFormData({ id: null, nama_perusahaan: '', alamat: '', kota: '', bidang: '', telepon: '', jurusan: '', kuota: 0, lat: -6.2618, lng: 107.0005, kompetensi: [] }); 
                  setShowAddModal(true); 
                }} 
                className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 border-none h-9 px-3.5 rounded-[var(--ui-radius-small)] text-white bg-emerald-600 hover:bg-emerald-700 font-black text-xs shadow-sm cursor-pointer active:scale-95 transition-all"
              >
                <Plus size={15} strokeWidth={2.5} /> Tambah Mitra
              </button>
            )}
          </div>
        </div>
      </PageHeader>

      {/* Interactive Quick Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
        <div 
          onClick={() => setFilterVerified('Semua')}
          className={`ui-card p-4 flex items-center gap-4 cursor-pointer transition-all hover:scale-[1.01] ${
            filterVerified === 'Semua' ? 'ring-2 ring-[var(--ui-primary)] shadow-xs bg-slate-50/50' : 'hover:border-slate-300'
          }`}
        >
          <div className="w-12 h-12 rounded-[var(--ui-radius-small)] bg-blue-100 text-blue-600 flex items-center justify-center shrink-0">
            <Building2 size={22} />
          </div>
          <div>
            <p className="text-[11px] font-extrabold uppercase text-slate-400 tracking-wider">TOTAL MITRA PKL</p>
            <h3 className="text-2xl font-black text-slate-800 mt-0.5">{locations.length}</h3>
          </div>
        </div>

        <div 
          onClick={() => setFilterVerified('verified')}
          className={`ui-card p-4 flex items-center gap-4 cursor-pointer transition-all hover:scale-[1.01] ${
            filterVerified === 'verified' ? 'ring-2 ring-emerald-500 shadow-xs bg-emerald-50/30' : 'hover:border-emerald-200'
          }`}
        >
          <div className="w-12 h-12 rounded-[var(--ui-radius-small)] bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
            <CheckCircle2 size={22} />
          </div>
          <div>
            <p className="text-[11px] font-extrabold uppercase text-emerald-600 tracking-wider">TERVERIFIKASI</p>
            <h3 className="text-2xl font-black text-emerald-700 mt-0.5">{verifiedCount}</h3>
          </div>
        </div>

        <div 
          onClick={() => setFilterVerified('pending')}
          className={`ui-card p-4 flex items-center gap-4 cursor-pointer transition-all hover:scale-[1.01] ${
            filterVerified === 'pending' ? 'ring-2 ring-amber-500 shadow-xs bg-amber-50/30' : 'hover:border-amber-200'
          }`}
        >
          <div className="w-12 h-12 rounded-[var(--ui-radius-small)] bg-amber-100 text-amber-600 flex items-center justify-center shrink-0">
            <Clock size={22} />
          </div>
          <div>
            <p className="text-[11px] font-extrabold uppercase text-amber-600 tracking-wider">MENUNGGU VERIFIKASI</p>
            <h3 className="text-2xl font-black text-amber-700 mt-0.5">{pendingCount}</h3>
          </div>
        </div>
      </div>

      {/* Filter Control Panel */}
      <div className="ui-card p-4 space-y-4">
        {/* Search Bar + Mobile Filter Toggle */}
        <div className="flex flex-col md:flex-row gap-3 items-center justify-between">
          <div className="relative w-full md:flex-1">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input 
              type="text"
              value={search} 
              onChange={e => setSearch(e.target.value)}
              placeholder="Cari nama perusahaan, alamat, atau kota..."
              className="w-full pl-10 pr-10 py-2.5 bg-slate-50 hover:bg-slate-100/50 border border-slate-200 rounded-[var(--ui-radius-small)] text-sm font-semibold text-slate-800 placeholder-slate-400 focus:outline-none focus:bg-white focus:ring-2 focus:ring-[var(--ui-primary)]/20 transition-all" 
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

          {/* Status Pill Tabs */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-[var(--ui-radius-small)] w-full md:w-auto shrink-0 overflow-x-auto">
            {[
              { id: 'Semua', label: 'Semua Status' },
              { id: 'verified', label: 'Terverifikasi' },
              { id: 'pending', label: 'Menunggu' }
            ].map(st => (
              <button
                key={st.id}
                type="button"
                onClick={() => setFilterVerified(st.id)}
                className={`flex-1 md:flex-none px-3.5 py-1.5 rounded-[var(--ui-radius-small)] text-xs font-black transition-all cursor-pointer border-none whitespace-nowrap ${
                  filterVerified === st.id 
                    ? 'bg-white text-slate-800 shadow-sm' 
                    : 'text-slate-500 hover:text-slate-800 bg-transparent'
                }`}
              >
                {st.label}
              </button>
            ))}
          </div>

          {/* Mobile Filter Toggle Button */}
          <button
            type="button"
            onClick={() => setShowMobileFilters(!showMobileFilters)}
            className="md:hidden w-full flex items-center justify-center gap-2 py-2 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-[var(--ui-radius-small)] transition-all border-none cursor-pointer"
          >
            <Filter size={14} />
            <span>Filter & Sortir ({filterJurusan !== 'Semua' || sortBy !== 'nama_asc' ? 'Aktif' : 'Semua'})</span>
          </button>
        </div>

        {/* Dropdown Filters for Jurusan & SortBy (Desktop always, Mobile collapsible) */}
        <div className={`grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3 border-t border-slate-100 ${showMobileFilters ? 'block' : 'hidden md:grid'}`}>
          <div>
            <label className="text-[11px] font-black text-slate-500 uppercase tracking-wider mb-1.5 block">Filter Jurusan Prioritas:</label>
            <CustomSelect
              value={filterJurusan}
              onChange={val => setFilterJurusan(val)}
              options={jurusanOptions.map(j => ({ value: j, label: j === 'Semua' ? 'Semua Jurusan' : `Jurusan ${j}` }))}
              placeholder="Semua Jurusan"
              searchable={false}
            />
          </div>

          <div>
            <label className="text-[11px] font-black text-slate-500 uppercase tracking-wider mb-1.5 block flex items-center gap-1">
              <ArrowUpDown size={12} className="text-slate-400" /> Sortir & Urutan:
            </label>
            <CustomSelect
              value={sortBy}
              onChange={val => setSortBy(val)}
              searchable={false}
              options={[
                { value: 'nama_asc', label: 'Nama Perusahaan (A - Z)' },
                { value: 'nama_desc', label: 'Nama Perusahaan (Z - A)' },
                { value: 'kuota_desc', label: 'Kuota Siswa (Terbanyak)' },
                { value: 'status_pending', label: 'Status: Menunggu Verifikasi Dahulu' },
              ]}
            />
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      {loading ? (
        <div className="ui-card flex flex-col items-center justify-center py-16 text-slate-400 space-y-3">
          <Loader2 className="animate-spin text-[var(--ui-primary)]" size={32} />
          <p className="text-xs font-bold">Memuat data perusahaan PKL...</p>
        </div>
      ) : view === 'list' ? (
        <div className="ui-card overflow-hidden shadow-sm">
          <div className="divide-y divide-slate-100">
            {filtered.length === 0 && (
              <div className="py-16 px-4 flex flex-col items-center justify-center text-slate-400 space-y-3">
                <Building2 size={36} className="text-slate-300" />
                <p className="font-bold text-sm text-slate-600">Tidak ada perusahaan mitra ditemukan</p>
                <p className="text-xs text-slate-400">Coba ubah kata kunci pencarian atau reset filter status.</p>
              </div>
            )}
            
            {filtered.map(p => {
              let kompetensi = [];
              try { 
                kompetensi = typeof p.kompetensi === 'string' ? JSON.parse(p.kompetensi) : p.kompetensi; 
              } catch(e) {}
              
              const jurusanColor = JURUSAN_COLORS[p.jurusan] || '#64748b';
              const terisi = students.filter(s => String(s.perusahaanId) === String(p.id)).length;
              const kuota = p.kuota || 0;
              const percent = kuota > 0 ? Math.min(100, Math.round((terisi / kuota) * 100)) : 0;
              const isFull = kuota > 0 && terisi >= kuota;

              return (
                <div 
                  key={p.id} 
                  className={`p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50/80 transition-colors border-b border-slate-100 last:border-0 ${
                    !p.verified ? 'bg-amber-50/20' : ''
                  }`}
                >
                  <div className="flex items-start gap-3.5 flex-1 min-w-0">
                    <div 
                      className="w-11 h-11 rounded-[var(--ui-radius-small)] flex items-center justify-center shrink-0 shadow-sm mt-0.5"
                      style={{ backgroundColor: jurusanColor + '18' }}
                    >
                      <Building2 size={20} style={{ color: jurusanColor }} />
                    </div>

                    <div className="space-y-1 min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="font-black text-slate-800 text-sm tracking-tight">{p.nama_perusahaan}</h4>
                        {p.verified ? (
                          <span className="inline-flex items-center gap-1 text-[9.5px] bg-emerald-100 text-emerald-700 font-extrabold px-2 py-0.5 rounded-[var(--ui-radius-small)] border border-emerald-200">
                            <CheckCircle2 size={10} /> Terverifikasi
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[9.5px] bg-amber-100 text-amber-800 font-extrabold px-2 py-0.5 rounded-[var(--ui-radius-small)] border border-amber-200">
                            <Clock size={10} /> Diajukan Siswa – Belum Diverifikasi
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
                        <MapPin size={13} className="text-slate-400 shrink-0" />
                        <span className="truncate">{p.alamat || 'Alamat belum diatur'} {p.kota ? `• ${p.kota}` : ''}</span>
                      </div>

                      {p.telepon && (
                        <div className="flex items-center gap-1.5 text-xs text-slate-400 font-medium">
                          <Phone size={12} className="text-slate-400 shrink-0" />
                          <span>{p.telepon}</span>
                        </div>
                      )}

                      {Array.isArray(kompetensi) && kompetensi.length > 0 && (
                        <div className="flex flex-wrap gap-1 pt-1">
                          {kompetensi.map(k => (
                            <span key={k} className="text-[9.5px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-[var(--ui-radius-small)] font-bold">
                              {k}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Kuota & Action Bar */}
                  <div className="flex flex-col sm:items-end justify-between shrink-0 space-y-3 pt-3 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                    <div className="flex items-center sm:flex-col sm:items-end justify-between sm:justify-start gap-2 w-full sm:w-auto">
                      {p.jurusan && (
                        <span className="inline-block px-2.5 py-0.5 text-[10px] font-black rounded-[var(--ui-radius-small)] bg-purple-50 text-purple-700 border border-purple-200 uppercase">
                          Jurusan {p.jurusan}
                        </span>
                      )}
                      
                      <div className="w-36 sm:w-32 space-y-1">
                        <div className="flex items-center justify-between text-[10px] font-black">
                          <span className="text-slate-400 uppercase">Kapasitas:</span>
                          <span className={isFull ? 'text-rose-600' : 'text-emerald-600'}>
                            {terisi} / {kuota} Siswa
                          </span>
                        </div>
                        <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div 
                            className={`h-full rounded-full transition-all ${isFull ? 'bg-rose-500' : 'bg-emerald-500'}`} 
                            style={{ width: `${percent}%` }}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Action buttons */}
                    {!readOnly && (
                      <div className="flex items-center gap-1.5 justify-end w-full sm:w-auto">
                        {!p.verified && (
                          <button 
                            onClick={() => handleVerify(p.id, p.nama_perusahaan)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 font-bold text-xs rounded-[var(--ui-radius-small)] transition-all cursor-pointer active:scale-95"
                            title="Verifikasi sebagai mitra resmi"
                          >
                            <CheckCircle2 size={13} />
                            <span>Verifikasi</span>
                          </button>
                        )}
                        
                        <button 
                          onClick={() => handleEdit(p)}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-[var(--ui-radius-small)] transition-all border-none cursor-pointer active:scale-95"
                          title="Edit Perusahaan"
                        >
                          <Edit3 size={13} />
                          <span>Edit</span>
                        </button>

                        <button 
                          onClick={() => handleDelete(p.id, p.nama_perusahaan)}
                          className="inline-flex items-center gap-1 px-2 py-1.5 bg-red-50 hover:bg-red-100 text-rose-600 border border-red-200 font-bold text-xs rounded-[var(--ui-radius-small)] transition-all cursor-pointer active:scale-95"
                          title="Hapus Perusahaan"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
            
            {/* Pagination Box */}
            {filtered.length > 0 && (
              <div className="ui-card mt-2 rounded-[var(--ui-radius-card)] border border-slate-100 overflow-hidden">
                <PaginationBar />
              </div>
            )}
          </div>
        </div>
      ) : (
        /* PETA INTERAKTIF VIEW */
        <div className="ui-card overflow-hidden h-[520px] shadow-sm relative">
          <MapContainer 
            center={[-6.2618, 107.0005]} 
            zoom={12}
            style={{ height: '100%', width: '100%' }} 
            scrollWheelZoom={false}
          >
            <TileLayer
              attribution='&copy; OpenStreetMap'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" 
            />
            {filtered.map(p => (
              <Marker 
                key={p.id} 
                position={[p.lat || -6.2618, p.lng || 107.0005]}
                icon={createIcon(JURUSAN_COLORS[p.jurusan] || '#15803d')}
              >
                <Popup>
                  <div className="min-w-[200px] space-y-1.5" style={{ fontFamily: 'Inter, sans-serif' }}>
                    <h4 className="font-extrabold text-sm text-slate-900 leading-snug">{p.nama_perusahaan}</h4>
                    <p className="text-xs text-slate-500 font-medium">{p.alamat || 'Alamat tidak tersedia'}</p>
                    <div className="flex items-center gap-2 pt-1 border-t border-slate-100 text-xs font-bold text-emerald-700">
                      <Users size={13} /> 
                      <span>{p.kuota || 0} Kuota Siswa</span>
                    </div>
                  </div>
                </Popup>
              </Marker>
            ))}
          </MapContainer>
        </div>
      )}

      {/* Add / Edit Company Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-[var(--ui-radius-card)] shadow-xs w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div>
                <h3 className="font-extrabold text-slate-800 text-base">{formData.id ? 'Edit Perusahaan Mitra' : 'Tambah Perusahaan Mitra Baru'}</h3>
                <p className="text-xs text-slate-400 font-medium mt-0.5">Lengkapi profil perusahaan tempat PKL siswa</p>
              </div>
              <button 
                onClick={() => setShowAddModal(false)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center border-none cursor-pointer transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleAddSubmit} className="p-5 space-y-4 max-h-[80vh] overflow-y-auto custom-scrollbar">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Nama Perusahaan Mitra *</label>
                <input 
                  required 
                  type="text" 
                  value={formData.nama_perusahaan} 
                  onChange={e => setFormData({ ...formData, nama_perusahaan: e.target.value })} 
                  className="w-full px-3.5 py-2.5 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-[var(--ui-radius-small)] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[var(--ui-primary)]/20 transition-all" 
                  placeholder="Contoh: PT Inovasi Teknologi Indonesia" 
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Alamat Lengkap *</label>
                <textarea 
                  required 
                  value={formData.alamat} 
                  onChange={e => setFormData({ ...formData, alamat: e.target.value })} 
                  className="w-full px-3.5 py-2.5 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-[var(--ui-radius-small)] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[var(--ui-primary)]/20 transition-all" 
                  rows="2" 
                  placeholder="Jl. Raya industri No. 123, Kawasan Industri..." 
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">Kota / Kabupaten</label>
                  <input 
                    type="text" 
                    value={formData.kota} 
                    onChange={e => setFormData({ ...formData, kota: e.target.value })} 
                    className="w-full px-3.5 py-2.5 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-[var(--ui-radius-small)] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[var(--ui-primary)]/20 transition-all" 
                    placeholder="Contoh: Bekasi" 
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">Nomor Telepon / HP</label>
                  <input 
                    type="text" 
                    value={formData.telepon} 
                    onChange={e => setFormData({ ...formData, telepon: e.target.value })} 
                    className="w-full px-3.5 py-2.5 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-[var(--ui-radius-small)] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[var(--ui-primary)]/20 transition-all" 
                    placeholder="Contoh: 021-88997766" 
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">Jurusan Prioritas</label>
                  <CustomSelect 
                    value={formData.jurusan} 
                    onChange={val => setFormData({ ...formData, jurusan: val })}
                    options={[
                      { value: "", label: "-- Pilih Jurusan --" },
                      ...jurusanOptions.filter(j => j !== 'Semua').map(j => ({ value: j, label: `${j} - ${getMajorFullName(j)}` }))
                    ]}
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">Kuota Siswa (Orang)</label>
                  <input 
                    type="text" 
                    inputMode="numeric" 
                    value={formData.kuota} 
                    onChange={e => setFormData({ ...formData, kuota: e.target.value.replace(/[^0-9]/g, '') })} 
                    className="w-full px-3.5 py-2.5 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-[var(--ui-radius-small)] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[var(--ui-primary)]/20 transition-all" 
                    placeholder="5" 
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
                <button 
                  type="button" 
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-[var(--ui-radius-small)] border-none cursor-pointer transition-all"
                >
                  Batal
                </button>
                <button 
                  type="submit" 
                  disabled={isSubmitting}
                  className="px-5 py-2.5 bg-[var(--ui-primary)] hover:opacity-90 text-white font-bold text-xs rounded-[var(--ui-radius-small)] border-none cursor-pointer shadow-sm active:scale-95 transition-all flex items-center gap-1.5"
                >
                  {isSubmitting ? <Loader2 size={14} className="animate-spin" /> : null}
                  <span>{isSubmitting ? 'Menyimpan...' : 'Simpan Perusahaan'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      
      {/* Import Modal Component */}
      {showImportModal && (
        <ImportModal
          isOpen={showImportModal}
          onClose={() => setShowImportModal(false)}
          title="Import Data Perusahaan PKL"
          expectedColumns={['Nama Perusahaan', 'Alamat', 'Kota', 'Telepon', 'Bidang Usaha', 'Jurusan', 'Kuota']}
          guideText="Data perusahaan akan ditambahkan (menjadi data baru). Sistem tidak menimpa data perusahaan secara otomatis berdasarkan nama karena ada kemungkinan nama perusahaan sama untuk cabang berbeda."
          onDownloadTemplate={handleDownloadTemplate}
          onImport={handleProcessImport}
          onExportCurrent={handleExport}
        />
      )}

      {/* Floating Toast Notification */}
      {toast && (
        <div className={`fixed bottom-6 right-6 px-4 py-3 rounded-[var(--ui-radius-small)] shadow-sm font-bold text-xs flex items-center gap-2 animate-in slide-in-from-bottom-5 text-white z-[100] ${
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
