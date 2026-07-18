import { useState, useEffect, useMemo, useCallback } from'react';
import useAuthStore from'../../store/monitoring/authStore.js';
import * as XLSX from'xlsx';
import { Trophy, FileSpreadsheet, Plus, Award, TrendingUp, Search, MapPin, Building, Calendar, Edit2, Trash2, AlertCircle, CheckCircle2 } from'lucide-react';
import { CustomSelect } from'../../components/CustomSelect.jsx';
import { Modal, Button } from '../../components/ui.jsx';


export default function RiwayatPrestasi({ students = [], classes = [] }) {
  const [prestasiList, setPrestasiList] = useState([]);
  const [search, setSearch] = useState("");
  const [filterTingkat, setFilterTingkat] = useState("all");
  const [filterKelas, setFilterKelas] = useState("all");
  
  const [showModal, setShowModal] = useState(false);
  const [isEditing, setIsEditing] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [toast, setToast] = useState(null);

  const showToast = (message, type ='success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };
  
  const [formData, setFormData] = useState({
    siswa_nis:"",
    nama_prestasi:"",
    peringkat:"",
    tingkat:"Kabupaten/Kota",
    penyelenggara:"",
    tanggal_prestasi: new Date().toISOString().slice(0, 10),
    keterangan:""
  });

  const authToken = useAuthStore(state => state.user?.authToken);

  const fetchPrestasi = useCallback(async () => {
    if (!authToken) return;
    setIsLoading(true);
    try {
      const res = await fetch("/api/kesiswaan/prestasi", {
        headers: {"Authorization": `Bearer ${authToken}` }
      });
      const data = await res.json();
      if (data.ok) {
        setPrestasiList(data.data || []);
      }
    } catch (e) {
      console.error("Gagal mengambil data prestasi:", e);
    }
    setIsLoading(false);
  }, [authToken]);

  useEffect(() => {
    fetchPrestasi();
  }, [fetchPrestasi]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!authToken) return;
    try {
      const body = { ...formData };
      if (isEditing) {
        body.id = isEditing;
      }
      const res = await fetch("/api/kesiswaan/prestasi", {
        method:"POST",
        headers: {"Authorization": `Bearer ${authToken}`,"Content-Type":"application/json"
        },
        body: JSON.stringify(body)
      });
      if (res.ok) {
        showToast(isEditing ?'Prestasi berhasil diperbarui!' :'Prestasi berhasil dicatat!');
        setShowModal(false);
        setFormData({
          siswa_nis:"",
          nama_prestasi:"",
          peringkat:"",
          tingkat:"Kabupaten/Kota",
          penyelenggara:"",
          tanggal_prestasi: new Date().toISOString().slice(0, 10),
          keterangan:""
        });
        setIsEditing(null);
        fetchPrestasi();
      } else {
        showToast('Gagal menyimpan data prestasi.','error');
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleEdit = (item) => {
    setIsEditing(item.id);
    setFormData({
      siswa_nis: item.siswa_nis,
      nama_prestasi: item.nama_prestasi,
      peringkat: item.peringkat ||"",
      tingkat: item.tingkat ||"Kabupaten/Kota",
      penyelenggara: item.penyelenggara ||"",
      tanggal_prestasi: item.tanggal_prestasi ? item.tanggal_prestasi.slice(0, 10) : new Date().toISOString().slice(0, 10),
      keterangan: item.keterangan ||""
    });
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (!await window.confirmAsync('Hapus data prestasi ini secara permanen?')) return;
    try {
      const res = await fetch("/api/kesiswaan/prestasi", {
        method:"POST",
        headers: {"Authorization": `Bearer ${authToken}`,"Content-Type":"application/json"
        },
        body: JSON.stringify({ action:"delete", id })
      });
      if (res.ok) {
        showToast('Prestasi berhasil dihapus.');
        fetchPrestasi();
      } else {
        showToast('Gagal menghapus data.','error');
      }
    } catch (e) {
      console.error(e);
      showToast('Terjadi kesalahan saat menghapus.','error');
    }
  };

  const getStudentInfo = useCallback((nis) => {
    const student = students.find(s => String(s.nis) === String(nis));
    return student ? {
      name: student.namaSiswa || student.name ||'Tidak Diketahui',
      class_name: student.class_name ||'-'
    } : { name:'Tidak Diketahui', class_name:'-' };
  }, [students]);

  const filteredPrestasi = useMemo(() => {
    return prestasiList.filter(item => {
      const sInfo = getStudentInfo(item.siswa_nis);
      const matchSearch = item.nama_prestasi.toLowerCase().includes(search.toLowerCase()) || 
                          sInfo.name.toLowerCase().includes(search.toLowerCase()) ||
                          String(item.siswa_nis).includes(search);
      const matchTingkat = filterTingkat ==="all" || item.tingkat === filterTingkat;
      const matchKelas = filterKelas ==="all" || sInfo.class_name === filterKelas;
      return matchSearch && matchTingkat && matchKelas;
    });
  }, [prestasiList, search, filterTingkat, filterKelas, getStudentInfo]);

  const stats = useMemo(() => {
    const total = prestasiList.length;
    const nasionalInternasional = prestasiList.filter(item => item.tingkat ==="Nasional" || item.tingkat ==="Internasional").length;
    
    const curMonth = new Date().toISOString().slice(0, 7); // YYYY-MM
    const bulanIni = prestasiList.filter(item => item.tanggal_prestasi && item.tanggal_prestasi.startsWith(curMonth)).length;

    return { total, nasionalInternasional, bulanIni };
  }, [prestasiList]);

  const exportExcel = () => {
    const data = filteredPrestasi.map((item, idx) => {
      const sInfo = getStudentInfo(item.siswa_nis);
      return {"No": idx + 1,"NIS": item.siswa_nis,"Nama Siswa": sInfo.name,"Kelas": sInfo.class_name,"Nama Prestasi": item.nama_prestasi,"Peringkat": item.peringkat,"Tingkat": item.tingkat,"Penyelenggara": item.penyelenggara,"Tanggal": item.tanggal_prestasi ? item.tanggal_prestasi.slice(0,10) :"","Keterangan": item.keterangan
      };
    });
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws,"Prestasi_Siswa");
    XLSX.writeFile(wb, `Riwayat_Prestasi_Siswa_${new Date().toISOString().slice(0,10)}.xlsx`);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      
      {/* HEADER CARD */}
      <div className="ui-card flex flex-col md:flex-row justify-between items-start md:items-center gap-4 p-5">
        <div>
          <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
            <Trophy size={18} className="text-amber-500" />
            Riwayat Prestasi & Penghargaan Siswa
          </h3>
          <p className="text-xs text-slate-500 font-medium mt-1">
            Catat dan dokumentasikan pencapaian siswa baik akademik maupun non-akademik di berbagai tingkatan.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0 w-full md:w-auto justify-end">
          <Button variant="outline" size="sm" className="flex items-center gap-2" 
            onClick={exportExcel}
            
          >
            <FileSpreadsheet size={14}/> Export Laporan
          </Button>
          <Button variant="outline" onClick={() =>{ setIsEditing(null); setShowModal(true); }} className="flex items-center gap-2">
            <Plus size={14}/> Tambah Prestasi</Button>
        </div>
      </div>

      {/* STAT CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="ui-card p-5 flex items-center gap-4 relative group">
          <div className="p-3 bg-amber-100 text-amber-600 rounded-[var(--ui-radius-small)]">
            <Trophy size={24} />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-0.5">Total Prestasi</p>
            <p className="text-2xl font-bold text-slate-800">{stats.total}</p>
            <p className="text-[11px] text-slate-400 font-medium">Seluruh tingkat kejuaraan</p>
          </div>
        </div>

        <div className="ui-card p-5 flex items-center gap-4 relative group">
          <div className="p-3 bg-emerald-100 text-emerald-600 rounded-[var(--ui-radius-small)]">
            <Award size={24} />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-0.5">Tingkat Nasional & Internasional</p>
            <p className="text-2xl font-bold text-slate-800">{stats.nasionalInternasional}</p>
            <p className="text-[11px] text-slate-400 font-medium">Kejuaraan skala besar</p>
          </div>
        </div>

        <div className="ui-card p-5 flex items-center gap-4 relative group">
          <div className="p-3 bg-blue-100 text-blue-600 rounded-[var(--ui-radius-small)]">
            <TrendingUp size={24} />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-0.5">Prestasi Bulan Ini</p>
            <p className="text-2xl font-bold text-slate-800">{stats.bulanIni}</p>
            <p className="text-[11px] text-slate-400 font-medium">Bulan berjalan</p>
          </div>
        </div>
      </div>

      {/* FILTER & TABLE SECTION */}
      <div className="ui-card flex flex-col">
        
        {/* Filters */}
        <div className="p-4 border-b border-slate-100 flex flex-col md:flex-row gap-4 items-center bg-slate-50/50 rounded-t-[var(--ui-radius-card)]">
          <div className="relative flex-1 w-full md:w-auto">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              type="text"
              placeholder="Cari prestasi, nama siswa, atau NIS..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-white border-none rounded-[var(--ui-radius-small)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--ui-primary)]/20 transition-all font-medium"
            />
          </div>
          <div className="flex items-center gap-2 w-full md:w-auto">
            <CustomSelect
              options={[
                { value:'all', label:'Semua Tingkat' },
                { value:'Kabupaten/Kota', label:'Kabupaten/Kota' },
                { value:'Provinsi', label:'Provinsi' },
                { value:'Nasional', label:'Nasional' },
                { value:'Internasional', label:'Internasional' }
              ]}
              value={filterTingkat}
              onChange={setFilterTingkat}
              className="w-full md:w-48"
            />
            <CustomSelect
              options={[{ value:'all', label:'Semua Kelas' }, ...classes.map(c => ({ value: c.name, label: c.name }))]}
              value={filterKelas}
              onChange={setFilterKelas}
              className="w-full md:w-48"
            />
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-slate-500 uppercase bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-6 py-4 font-bold">Siswa & Kelas</th>
                <th className="px-6 py-4 font-bold">Nama Prestasi</th>
                <th className="px-6 py-4 font-bold text-center">Peringkat & Tingkat</th>
                <th className="px-6 py-4 font-bold">Penyelenggara & Tanggal</th>
                <th className="px-6 py-4 font-bold">Keterangan</th>
                <th className="px-6 py-4 font-bold text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan="6" className="px-6 py-12 text-center text-slate-500 font-medium">Memuat data prestasi...</td>
                </tr>
              ) : filteredPrestasi.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-6 py-16 text-center text-slate-500">
                    <Trophy size={48} className="mx-auto mb-4 text-slate-300"/>
                    <p className="font-bold text-lg text-slate-600 mb-1">Belum Ada Data Prestasi</p>
                    <p className="font-medium text-sm">Tidak ada catatan prestasi yang cocok dengan filter pencarian Anda.</p>
                  </td>
                </tr>
              ) : (
                filteredPrestasi.map((item) => {
                  const sInfo = getStudentInfo(item.siswa_nis);
                  return (
                    <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="font-bold text-slate-800 text-sm">{sInfo.name}</div>
                        <div className="text-[11px] text-slate-500 mt-0.5">{item.siswa_nis} • Kelas {sInfo.class_name}</div>
                      </td>
                      <td className="px-6 py-4 font-semibold text-slate-800">
                        {item.nama_prestasi}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col items-center gap-1">
                          <span className="px-2 py-0.5 bg-amber-50 text-amber-700 border border-amber-200 rounded text-[11px] font-bold">
                            {item.peringkat ||'Juara'}
                          </span>
                          <span className="text-[10px] font-medium text-slate-500 flex items-center gap-1">
                            <MapPin size={10}/> {item.tingkat}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-xs text-slate-700 font-medium flex items-center gap-1.5">
                          <Building size={12} className="text-slate-400"/> {item.penyelenggara ||'-'}
                        </div>
                        <div className="text-[10px] text-slate-400 mt-1 font-bold flex items-center gap-1.5">
                          <Calendar size={12} className="text-slate-400"/> {item.tanggal_prestasi ? new Date(item.tanggal_prestasi).toLocaleDateString('id-ID', { year:'numeric', month:'long', day:'numeric' }) :'-'}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-xs text-slate-500 max-w-[200px] truncate" title={item.keterangan ||'-'}>
                          {item.keterangan ||'-'}
                        </p>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end gap-1.5">
                          <Button variant="outline" 
                            onClick={() =>handleEdit(item)}
                            className="cursor-pointer"
                            title="Edit"
                          >
                            <Edit2 size={14} /></Button>
                          <Button variant="outline" 
                            onClick={() =>handleDelete(item.id)}
                            className="cursor-pointer"
                            title="Hapus"
                          >
                            <Trash2 size={14} /></Button>
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* TAMBAH/EDIT MODAL */}
      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={isEditing ?"Sunting Data Prestasi" :"Catat Prestasi Baru"} maxWidth="max-w-2xl">
        <form onSubmit={handleSubmit} className="space-y-4 text-sm font-medium text-slate-600">
          
          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1.5">Pilih Siswa (Penerima)</label>
            <CustomSelect
              options={students.map(s => ({
                value: s.nis,
                label: `${s.namaSiswa || s.name} (${s.nis} - ${s.class_name ||''})`
              }))}
              value={formData.siswa_nis}
              onChange={val => setFormData({ ...formData, siswa_nis: val })}
              placeholder="-- Cari nama siswa / NIS --"
              className="w-full text-left"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1.5">Nama Prestasi / Kejuaraan</label>
              <input 
                required
                type="text" 
                value={formData.nama_prestasi}
                onChange={e => setFormData({ ...formData, nama_prestasi: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border-none rounded-[var(--ui-radius-small)] focus:bg-white outline-none"
                placeholder="Contoh: Juara 1 Lomba LKS RPL" 
              />
            </div>
            
            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1.5">Peringkat / Penghargaan</label>
              <input 
                type="text" 
                value={formData.peringkat}
                onChange={e => setFormData({ ...formData, peringkat: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border-none rounded-[var(--ui-radius-small)] focus:bg-white outline-none"
                placeholder="Contoh: Juara 1, Juara Harapan, Medali Emas" 
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1.5">Tingkat Kejuaraan</label>
              <CustomSelect
                options={[
                  { value:'Kabupaten/Kota', label:'Kabupaten/Kota' },
                  { value:'Provinsi', label:'Provinsi' },
                  { value:'Nasional', label:'Nasional' },
                  { value:'Internasional', label:'Internasional' }
                ]}
                value={formData.tingkat}
                onChange={val => setFormData({ ...formData, tingkat: val })}
                className="w-full text-left"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1.5">Penyelenggara</label>
              <input 
                type="text" 
                value={formData.penyelenggara}
                onChange={e => setFormData({ ...formData, penyelenggara: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border-none rounded-[var(--ui-radius-small)] focus:bg-white outline-none"
                placeholder="Contoh: Kemendikbudristek" 
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1.5">Tanggal Perolehan</label>
              <input 
                required
                type="date" 
                value={formData.tanggal_prestasi}
                onChange={e => setFormData({ ...formData, tanggal_prestasi: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border-none rounded-[var(--ui-radius-small)] focus:bg-white outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1.5">Keterangan Tambahan / Detail Prestasi</label>
            <textarea 
              rows="3"
              value={formData.keterangan}
              onChange={e => setFormData({ ...formData, keterangan: e.target.value })}
              className="w-full px-3 py-2 bg-slate-50 border-none rounded-[var(--ui-radius-small)] focus:bg-white outline-none resize-none"
              placeholder="Tulis rincian prestasi, skor, anggota tim jika beregu, atau catatan pendukung lainnya..."
            />
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
            <Button 
              variant="outline"
              type="button" 
              onClick={() => setShowModal(false)} 
            >
              Batal
            </Button>
            <Button type="submit">
              {isEditing ?"Simpan Perubahan" :"Catat Prestasi"}
            </Button>
          </div>
        </form>
      </Modal>

      {toast && (
        <div className={`fixed bottom-6 right-6 px-4 py-3 rounded-[var(--ui-radius-small)] shadow-lg font-medium text-sm flex items-center gap-2 animate-in slide-in-from-bottom-5 text-white z-50 ${toast.type ==='error' ?'bg-red-600' :'bg-emerald-600'}`}>
          {toast.type ==='error' ? <AlertCircle size={18} /> : <CheckCircle2 size={18} />} {toast.message}
        </div>
      )}
    </div>
  );
}
