import { useState, useEffect, useMemo } from'react';
import { Building2, Upload, Download, Plus, Search, CheckCircle2, Clock, MapPin, Users, Edit3, Trash2, Loader2 } from 'lucide-react';
import * as XLSX from'xlsx';
import L from'leaflet';
import'leaflet/dist/leaflet.css';
import { getMajorFullName } from'../../../utils/constants.js';
import { PageHeader } from"../../../components/monitoring/ui/index.js";
import { Button } from'../../../components/ui.jsx';
import { MapContainer, TileLayer, Marker, Popup } from'react-leaflet';
import ImportModal from"../../../components/monitoring/ui/ImportModal.jsx";
import { CustomSelect } from'../../../components/CustomSelect.jsx';


/**
 * admin/DataPerusahaan.jsx
 * Halaman daftar perusahaan mitra PKL dengan peta interaktif.
 */











delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl:'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl:'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});



const JURUSAN_COLORS = { TJKT:'#15803d', Akuntansi:'#7c3aed', DKV:'#db2777' };

const createIcon = (color) => L.divIcon({
  className:'',
  html: `<div style="width:28px;height:28px;border-radius:50% 50% 50% 0;background:${color};transform:rotate(-45deg);border:2px solid white;boxShadow:0 2px 6px rgba(0,0,0,0.25)"></div>`,
  iconSize: [28, 28], iconAnchor: [14, 28], popupAnchor: [0, -30],
});

const DataPerusahaan = ({ students = [], readOnly, majors = [] }) => {
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterJurusan, setFilterJurusan] = useState('Semua');
  const [filterVerified, setFilterVerified] = useState('Semua'); //'Semua' |'verified' |'pending'
  const [view, setView] = useState('list'); //'list' |'map'
  const [showAddModal, setShowAddModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [formData, setFormData] = useState({ id: null, nama_perusahaan:'', alamat:'', kota:'', bidang:'', telepon:'', jurusan:'', kuota: 0, lat: -6.2618, lng: 107.0005, kompetensi: [] });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toast, setToast] = useState(null);

  const showToast = (message, type ='success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  const jurusanOptions = useMemo(() => {
    const fromSchool = majors || [];
    const fromLocations = locations.map(p => p.jurusan).filter(Boolean);
    return ['Semua', ...new Set([...fromSchool, ...fromLocations])];
  }, [majors, locations]);

  const fetchLocations = () => {
    setLoading(true);
    fetch('/api/pkl/locations', {
      headers: {'Authorization': `Bearer ${JSON.parse(sessionStorage.getItem('school_schedule_session_v1'))?.authToken}` }
    })
    .then(res => res.json())
    .then(data => {
      if (data.ok) setLocations(data.data);
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
    try {
      const isEdit = !!formData.id;
      const url = isEdit ? `/api/pkl/locations/${formData.id}` :'/api/pkl/locations';
      const method = isEdit ?'PUT' :'POST';
      const res = await fetch(url, {
        method: method,
        headers: {'Content-Type':'application/json','Authorization': `Bearer ${JSON.parse(sessionStorage.getItem('school_schedule_session_v1'))?.authToken}` 
        },
        body: JSON.stringify(formData)
      });
      if (res.ok) {
        setShowAddModal(false);
        fetchLocations();
        setFormData({ id: null, nama_perusahaan:'', alamat:'', kota:'', bidang:'', telepon:'', jurusan:'', kuota: 0, lat: -6.2618, lng: 107.0005, kompetensi: [] });
      }
    } catch (error) {
      console.error(error);
    }
    setIsSubmitting(false);
  };

  const handleEdit = (p) => {
    setFormData({
      id: p.id,
      nama_perusahaan: p.nama_perusahaan ||'',
      alamat: p.alamat ||'',
      kota: p.kota ||'',
      bidang: p.bidang ||'',
      telepon: p.telepon ||'',
      jurusan: p.jurusan ||'',
      kuota: p.kuota || 0,
      lat: p.lat || -6.2618,
      lng: p.lng || 107.0005,
      kompetensi: typeof p.kompetensi ==='string' ? JSON.parse(p.kompetensi ||'[]') : (p.kompetensi || [])
    });
    setShowAddModal(true);
  };

  const handleDelete = async (id, nama) => {
    if (!(await window.confirmAsync(`Yakin ingin menghapus perusahaan ${nama}?`))) return;
    try {
      const res = await fetch(`/api/pkl/locations/${id}`, {
        method:'DELETE',
        headers: {'Authorization': `Bearer ${JSON.parse(sessionStorage.getItem('school_schedule_session_v1'))?.authToken}` }
      });
      if (res.ok) fetchLocations();
    } catch (err) {
      console.error(err);
    }
  };

  const filtered = locations.filter(p => {
    const matchSearch = p.nama_perusahaan.toLowerCase().includes(search.toLowerCase()) ||
      (p.alamat ||'').toLowerCase().includes(search.toLowerCase());
    const matchJurusan = filterJurusan ==='Semua' || p.jurusan === filterJurusan;
    const matchVerified = filterVerified ==='Semua' || 
      (filterVerified ==='verified' && p.verified) || 
      (filterVerified ==='pending' && !p.verified);
    return matchSearch && matchJurusan && matchVerified;
  });

  const handleVerify = async (id, nama) => {
    if (!(await window.confirmAsync(`Verifikasi perusahaan"${nama}" sebagai mitra resmi? Status akan berubah menjadi Terverifikasi.`))) return;
    try {
      const res = await fetch(`/api/pkl/locations/${id}/verify`, {
        method:'PUT',
        headers: {'Authorization': `Bearer ${JSON.parse(sessionStorage.getItem('school_schedule_session_v1'))?.authToken}` }
      });
      if (res.ok) fetchLocations();
    } catch (err) { console.error(err); }
  };

  const handleExport = () => {
    const exportData = filtered.map(p => ({
      ID: p.id,"Nama Perusahaan": p.nama_perusahaan,
      Alamat: p.alamat,
      Kota: p.kota,
      Telepon: p.telepon,"Bidang Usaha": p.bidang,
      Jurusan: p.jurusan,
      Kuota: p.kuota
    }));
    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws,"Perusahaan PKL");
    XLSX.writeFile(wb,"Data_Perusahaan_PKL.xlsx");
  };

  const handleDownloadTemplate = () => {
    const templateData = [
      {'Nama Perusahaan':'PT Inovasi Teknologi','Alamat':'Jl. Sudirman No 123','Kota':'Jakarta','Telepon':'021-123456','Bidang Usaha':'IT / Software','Jurusan':'RPL','Kuota': 5
      }
    ];
    const ws = XLSX.utils.json_to_sheet(templateData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws,"Template Perusahaan");
    XLSX.writeFile(wb,"Template_Master_Perusahaan.xlsx");
  };

  const handleProcessImport = async (jsonData) => {
    let successCount = 0;
    
    // We process sequentially so we don't overwhelm the backend if there are many rows.
    for (const row of jsonData) {
      const payload = {
        nama_perusahaan: row['Nama Perusahaan'] || row['nama_perusahaan'] ||'',
        alamat: row['Alamat'] || row['alamat'] ||'',
        kota: row['Kota'] || row['kota'] ||'',
        telepon: row['Telepon'] || row['telepon'] ||'',
        bidang: row['Bidang Usaha'] || row['Bidang'] || row['bidang'] ||'',
        jurusan: row['Jurusan'] || row['jurusan'] ||'Semua',
        kuota: parseInt(row['Kuota'] || row['kuota']) || 0,
        lat: -6.2618,
        lng: 107.0005,
        kompetensi: []
      };
      
      if (!payload.nama_perusahaan) continue;
      
      try {
        const res = await fetch('/api/pkl/locations', {
          method:'POST',
          headers: {'Content-Type':'application/json','Authorization': `Bearer ${JSON.parse(sessionStorage.getItem('school_schedule_session_v1'))?.authToken}` 
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

  return (
    <div className="space-y-4">
      <PageHeader
        icon={Building2}
        title="Data Perusahaan PKL"
        description={
          <div className="flex flex-wrap items-center gap-3">
            <span>{loading ?"Memuat..." : `${locations.length} mitra terdaftar`}</span>
            {!loading && (
              <>
                <span className="text-[10px] bg-white/20 text-white font-bold px-2 py-0.5 rounded-[var(--ui-radius-small)] flex items-center gap-1 backdrop-blur-sm border border-white/20">
                  <CheckCircle2 size={10} /> {locations.filter(l => l.verified).length} Terverifikasi
                </span>
                {locations.filter(l => !l.verified).length > 0 && (
                  <span className="text-[10px] bg-white/20 text-white font-bold px-2 py-0.5 rounded-[var(--ui-radius-small)] flex items-center gap-1 backdrop-blur-sm border border-white/20">
                    <Clock size={10} /> {locations.filter(l => !l.verified).length} Menunggu
                  </span>
                )}
              </>
            )}
          </div>
        }
      >
        <div className="flex flex-wrap items-center gap-2">
          {!readOnly && (
            <Button variant="outline" size="sm" onClick={() => setShowImportModal(true)} className="flex items-center gap-1.5">
              <Upload size={16} /> Impor
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={handleExport} className="flex items-center gap-1.5">
            <Download size={16} /> Ekspor
          </Button>
          {!readOnly && (
            <Button size="sm" onClick={() => { setFormData({ id: null, nama_perusahaan:'', alamat:'', kota:'', bidang:'', telepon:'', jurusan:'', kuota: 0, lat: -6.2618, lng: 107.0005, kompetensi: [] }); setShowAddModal(true); }} className="flex items-center gap-1.5">
              <Plus size={16} /> Tambah
            </Button>
          )}
          <div className="flex border border-white/20 rounded-[var(--ui-radius-small)] overflow-hidden shadow-sm backdrop-blur-sm ml-2">
            <Button variant="outline" onClick={() =>setView('list')}
              className={`cursor-pointer px-3 py-1.5 text-xs font-bold transition-colors ${view ==='list' ?'bg-white text-[var(--ui-primary)]' :'bg-white/10 text-white hover:bg-white/20'}`}>
              Daftar</Button>
            <Button variant="outline" onClick={() =>setView('map')}
              className={`cursor-pointer px-3 py-1.5 text-xs font-bold transition-colors ${view ==='map' ?'bg-white text-[var(--ui-primary)]' :'bg-white/10 text-white hover:bg-white/20'}`}>
              Peta</Button>
          </div>
        </div>
      </PageHeader>

      {/* Filters */}
      <div className="ui-card p-4 flex flex-col lg:flex-row gap-4 items-center justify-between">
        <div className="relative flex-1 w-full">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input 
            value={search} 
            onChange={e => setSearch(e.target.value)}
            placeholder="Cari perusahaan atau alamat..."
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border-none rounded-[var(--ui-radius-small)] text-sm focus:outline-none focus:bg-white focus:ring-1 focus:ring-[var(--ui-primary)]" 
          />
        </div>
        <div className="flex flex-wrap items-center gap-3 shrink-0 w-full lg:w-auto justify-start lg:justify-end">
          <div className="flex flex-wrap gap-1.5">
            {['Semua','verified','pending'].map(f => (
              <Button variant="outline" key={f} onClick={() =>setFilterVerified(f)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-[var(--ui-radius-small)] text-xs font-bold transition-all ${filterVerified === f ?'bg-[var(--ui-primary)] text-white shadow-sm' :'bg-slate-50 text-slate-600 hover:bg-slate-100'}`}>
                {f ==='verified' && <CheckCircle2 size={13} />}
                {f ==='pending' && <Clock size={13} />}
                {f ==='Semua' ?'Semua Status' : f ==='verified' ?'Terverifikasi' :'Menunggu'}</Button>
            ))}
          </div>
          <div className="flex flex-wrap gap-1.5 border-l border-slate-200 pl-3">
            {jurusanOptions.map(j => (
              <Button variant="outline" key={j} onClick={() =>setFilterJurusan(j)}
                className={`px-3 py-1.5 rounded-[var(--ui-radius-small)] text-xs font-bold transition-all ${filterJurusan === j ?'bg-[var(--ui-accent)]/20 text-[var(--ui-primary)]' :'bg-slate-50 text-slate-600 hover:bg-slate-100'}`}
                >{j}</Button>
            ))}
          </div>
        </div>
      </div>

      {loading ? (
        <div className="ui-card flex items-center justify-center py-12">
          <Loader2 className="animate-spin text-[var(--ui-primary)]" size={32} />
        </div>
      ) : view ==='list' ? (
        <div className="ui-card overflow-hidden">
          <div className="divide-y divide-slate-100">
            {filtered.length === 0 && (
              <div className="py-12 px-4 flex flex-col items-center justify-center text-slate-500">
                <Building2 size={32} className="text-slate-300 mb-2" />
                <p className="text-sm font-medium">Tidak ada data ditemukan.</p>
              </div>
            )}
            {filtered.map(p => {
              let kompetensi = [];
              try { kompetensi = typeof p.kompetensi ==='string' ? JSON.parse(p.kompetensi) : p.kompetensi; } catch(e){ /* ignore */ }
              const jurusanColor = JURUSAN_COLORS[p.jurusan] ||'#64748b';
              const terisi = students.filter(s => s.perusahaanId === p.id).length;
              const kuota = p.kuota || 0;
              const percent = kuota > 0 ? Math.min(100, Math.round((terisi / kuota) * 100)) : 0;
              const isFull = kuota > 0 && terisi >= kuota;

              return (
                <div key={p.id} className={`flex items-center gap-4 px-5 py-4 hover:bg-slate-50/50 transition-colors border-b border-slate-50 last:border-0 ${!p.verified ?'bg-amber-50/30' :''}`}>
                  <div className="w-10 h-10 rounded-[var(--ui-radius-small)] flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: jurusanColor +'20' }}>
                    <Building2 size={18} style={{ color: jurusanColor }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-slate-800">{p.nama_perusahaan}</p>
                      {p.verified 
                        ? <span className="text-[9px] bg-emerald-100 text-emerald-700 font-bold px-1.5 py-0.5 rounded-[var(--ui-radius-small)] flex items-center gap-0.5"><CheckCircle2 size={9}/> Terverifikasi</span>
                        : <span className="text-[9px] bg-amber-100 text-amber-700 font-bold px-1.5 py-0.5 rounded-[var(--ui-radius-small)] flex items-center gap-0.5"><Clock size={9}/> Diajukan Siswa – Belum Diverifikasi</span>
                      }
                    </div>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <MapPin size={11} className="text-slate-400 flex-shrink-0" />
                      <p className="text-xs text-slate-400 truncate">{p.alamat ||'Alamat belum diatur'}</p>
                    </div>
                    {kompetensi && kompetensi.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1.5">
                        {kompetensi.map(k => (
                          <span key={k} className="text-[10px] bg-gray-100 text-gray-600 px-2 py-0.5 rounded-[var(--ui-radius-small)] font-medium">{k}</span>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="w-40 flex-shrink-0 flex flex-col items-end space-y-2">
                    {p.jurusan && <Badge variant={p.jurusan} label={p.jurusan} withDot={false} />}
                    <div className="w-full mt-1 flex flex-col items-end gap-1">
                      <div className="flex items-center justify-between w-full text-[10px] font-bold">
                        <span className="text-slate-500">Kapasitas</span>
                        <span className={isFull ?'text-red-600' :'text-emerald-600'}>{terisi} / {kuota}</span>
                      </div>
                      <div className="w-full h-1.5 bg-slate-100 rounded-[var(--ui-radius-small)] overflow-hidden">
                        <div className={`h-full rounded-[var(--ui-radius-small)] transition-all ${isFull ?'bg-red-500' :'bg-emerald-500'}`} style={{ width: `${percent}%` }}></div>
                      </div>
                    </div>
                    {!readOnly && (
                      <div className="flex gap-2 mt-2 flex-wrap justify-end">
                        {!p.verified && (
                          <Button variant="ghost" size="icon" onClick={() => handleVerify(p.id, p.nama_perusahaan)} title="Verifikasi sebagai mitra resmi">
                            <CheckCircle2 size={14} className="text-emerald-500" />
                          </Button>
                        )}
                        <Button variant="ghost" size="icon" onClick={() => handleEdit(p)} title="Edit">
                          <Edit3 size={14} className="text-slate-500" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(p.id, p.nama_perusahaan)} title="Hapus">
                          <Trash2 size={14} className="text-red-500" />
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="ui-card overflow-hidden h-[500px]">
          <MapContainer center={[-6.2618, 107.0005]} zoom={12}
            style={{ height:'100%', width:'100%' }} scrollWheelZoom={false}>
            <TileLayer
              attribution='&copy; OpenStreetMap'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
            {filtered.map(p => (
              <Marker key={p.id} position={[p.lat || -6.2618, p.lng || 107.0005]}
                icon={createIcon(JURUSAN_COLORS[p.jurusan] ||'#15803d')}>
                <Popup>
                  <div className="min-w-[200px]" style={{ fontFamily:'Lexend, sans-serif' }}>
                    <p className="font-bold text-sm text-gray-900 mb-1">{p.nama_perusahaan}</p>
                    <p className="text-xs text-gray-500 mb-2">{p.alamat ||'Alamat tidak tersedia'}</p>
                    <div className="flex items-center gap-1.5 text-xs text-green-700 font-semibold">
                      <Users size={11} /> {p.kuota || 0} kuota
                    </div>
                  </div>
                </Popup>
              </Marker>
            ))}
          </MapContainer>
        </div>
      )}

      {/* Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-[var(--ui-radius-small)] shadow-sm w-full max-w-md overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-bold text-slate-800">{formData.id ?'Edit Perusahaan' :'Tambah Perusahaan'}</h3>
              <Button variant="outline" onClick={() =>setShowAddModal(false)} >&times;</Button>
            </div>
            <form onSubmit={handleAddSubmit} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">Nama Perusahaan</label>
                <input required type="text" value={formData.nama_perusahaan} onChange={e => setFormData({...formData, nama_perusahaan: e.target.value})} className="w-full px-3 py-2 text-sm border-none rounded-[var(--ui-radius-small)] focus:border-[var(--ui-primary)] focus:ring-1 focus:ring-[var(--ui-primary)] outline-none" placeholder="PT Contoh Maju" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">Alamat Lengkap</label>
                <textarea required value={formData.alamat} onChange={e => setFormData({...formData, alamat: e.target.value})} className="w-full px-3 py-2 text-sm border-none rounded-[var(--ui-radius-small)] focus:border-[var(--ui-primary)] focus:ring-1 focus:ring-[var(--ui-primary)] outline-none" rows="2" placeholder="Jl. Raya No. 123"></textarea>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">Jurusan Prioritas</label>
                  <CustomSelect 
                    value={formData.jurusan} 
                    onChange={val => setFormData({...formData, jurusan: val})}
                    options={[
                      { value:"", label:"-- Pilih --" },
                      ...jurusanOptions.filter(j => j !=='Semua').map(j => ({ value: j, label: `${j} - ${getMajorFullName(j)}` }))
                    ]}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">Kuota Siswa</label>
                  <input type="text" inputMode="numeric" value={formData.kuota} onChange={e => setFormData({...formData, kuota: e.target.value.replace(/[^0-9]/g,'')})} className="w-full px-3 py-2 text-sm border-none rounded-[var(--ui-radius-small)] focus:border-[var(--ui-primary)] focus:ring-1 focus:ring-[var(--ui-primary)] outline-none" />
                </div>
              </div>
              <div className="pt-2 flex justify-end gap-2">
                <Button variant="outline" type="button" onClick={() => setShowAddModal(false)}>Batal</Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ?'Menyimpan...' :'Simpan'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
      
      {showImportModal && (
        <ImportModal
          isOpen={showImportModal}
          onClose={() => setShowImportModal(false)}
          title="Import Data Perusahaan PKL"
          expectedColumns={['Nama Perusahaan','Alamat','Kota','Telepon','Bidang Usaha','Jurusan','Kuota']}
          guideText="Data perusahaan akan ditambahkan (menjadi data baru). Sistem tidak menimpa data perusahaan secara otomatis berdasarkan nama karena ada kemungkinan nama perusahaan sama untuk cabang berbeda."
          onDownloadTemplate={handleDownloadTemplate}
          onImport={handleProcessImport}
          onExportCurrent={handleExport}
        />
      )}
      {toast && (
        <div className={`fixed bottom-6 right-6 px-4 py-3 rounded-[var(--ui-radius-small)] shadow-lg font-medium text-sm flex items-center gap-2 animate-in slide-in-from-bottom-5 text-white z-[100] ${toast.type ==='error' ?'bg-red-600' :'bg-emerald-600'}`}>
          <CheckCircle2 size={18} /> {toast.message}
        </div>
      )}
    </div>
  );
};

export default DataPerusahaan;
