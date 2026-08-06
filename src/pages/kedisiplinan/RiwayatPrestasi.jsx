import { useState, useEffect, useMemo, useCallback } from 'react';
import useAuthStore from '../../store/monitoring/authStore.js';
import * as XLSX from 'xlsx';
import { 
  Trophy, FileSpreadsheet, Plus, Award, TrendingUp, Search, MapPin, 
  Building, Calendar, Edit2, Trash2, AlertCircle, CheckCircle2, 
  ChevronRight, Filter, User, AlertTriangle
} from 'lucide-react';
import { CustomSelect } from '../../components/CustomSelect.jsx';
import { Modal, Button, TablePagination } from '../../components/ui.jsx';
import { PageHeader } from '../../components/monitoring/ui/index.js';

export default function RiwayatPrestasi({ students = [], classes = [] }) {
  const [prestasiList, setPrestasiList] = useState([]);
  const [search, setSearch] = useState("");
  const [filterTingkat, setFilterTingkat] = useState("all");
  const [filterKelas, setFilterKelas] = useState("all");
  
  const [showModal, setShowModal] = useState(false);
  const [isEditing, setIsEditing] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [toast, setToast] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };
  
  const [formData, setFormData] = useState({
    siswa_nis: "",
    nama_prestasi: "",
    peringkat: "",
    tingkat: "Kabupaten/Kota",
    penyelenggara: "",
    tanggal_prestasi: new Date().toISOString().slice(0, 10),
    keterangan: ""
  });

  const authToken = useAuthStore(state => state.user?.authToken);

  const fetchPrestasi = useCallback(async () => {
    if (!authToken) return;
    setIsLoading(true);
    try {
      const res = await fetch("/api/kesiswaan/prestasi", {
        headers: { "Authorization": `Bearer ${authToken}` }
      });
      const data = await res.json();
      if (data.ok) {
        setPrestasiList(Array.isArray(data.data) ? data.data : []);
      }
    } catch (e) {
      console.error("Gagal mengambil data prestasi:", e);
    } finally {
      setIsLoading(false);
    }
  }, [authToken]);

  useEffect(() => {
    fetchPrestasi();
  }, [fetchPrestasi]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.siswa_nis || !formData.nama_prestasi) {
      showToast('Siswa dan Nama Prestasi wajib diisi.', 'error');
      return;
    }

    try {
      const payload = {
        action: isEditing ? 'update' : 'create',
        ...(isEditing ? { id: isEditing.id } : {}),
        ...formData
      };

      const res = await fetch("/api/kesiswaan/prestasi", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${authToken}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      });
      const data = await res.json();

      if (res.ok && data.ok) {
        showToast(isEditing ? 'Prestasi berhasil diperbarui.' : 'Prestasi berhasil dicatat.');
        setShowModal(false);
        fetchPrestasi();
      } else {
        showToast(data.message || 'Gagal menyimpan data.', 'error');
      }
    } catch (err) {
      console.error(err);
      showToast('Terjadi kesalahan koneksi.', 'error');
    }
  };

  const handleEdit = (item) => {
    setIsEditing(item);
    setFormData({
      siswa_nis: item.siswa_nis,
      nama_prestasi: item.nama_prestasi,
      peringkat: item.peringkat || "",
      tingkat: item.tingkat || "Kabupaten/Kota",
      penyelenggara: item.penyelenggara || "",
      tanggal_prestasi: item.tanggal_prestasi ? item.tanggal_prestasi.slice(0, 10) : new Date().toISOString().slice(0, 10),
      keterangan: item.keterangan || ""
    });
    setShowModal(true);
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      const res = await fetch("/api/kesiswaan/prestasi", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${authToken}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ action: "delete", id: deleteTarget.id })
      });
      if (res.ok) {
        showToast('Data prestasi berhasil dihapus.');
        fetchPrestasi();
      } else {
        showToast('Gagal menghapus data.', 'error');
      }
    } catch (e) {
      console.error(e);
      showToast('Terjadi kesalahan saat menghapus.', 'error');
    } finally {
      setDeleteTarget(null);
    }
  };

  const getStudentInfo = useCallback((itemOrNis) => {
    const nis = typeof itemOrNis === 'object' ? itemOrNis?.siswa_nis : itemOrNis;
    const fallbackName = typeof itemOrNis === 'object' ? (itemOrNis?.nama_siswa || itemOrNis?.siswa_name || itemOrNis?.name) : null;
    const fallbackClass = typeof itemOrNis === 'object' ? (itemOrNis?.kelas || itemOrNis?.class_name) : null;

    const student = students.find(s => 
      String(s.nis) === String(nis) || 
      String(s.nisn) === String(nis) || 
      String(s.id) === String(nis) || 
      String(s.code) === String(nis)
    );

    if (student) {
      return {
        name: student.namaSiswa || student.name || fallbackName || (`Siswa #${nis}`),
        class_name: student.class_name || student.kelas || fallbackClass || '-'
      };
    }

    return { 
      name: fallbackName || (nis ? `Siswa #${nis}` : 'Siswa Terdaftar'), 
      class_name: fallbackClass || '-' 
    };
  }, [students]);

  const filteredPrestasi = useMemo(() => {
    return prestasiList.filter(item => {
      const sInfo = getStudentInfo(item);
      const matchSearch = item.nama_prestasi.toLowerCase().includes(search.toLowerCase()) || 
                          sInfo.name.toLowerCase().includes(search.toLowerCase()) ||
                          String(item.siswa_nis).includes(search);
      const matchTingkat = filterTingkat === "all" || item.tingkat === filterTingkat;
      const matchKelas = filterKelas === "all" || sInfo.class_name === filterKelas;
      return matchSearch && matchTingkat && matchKelas;
    });
  }, [prestasiList, search, filterTingkat, filterKelas, getStudentInfo]);

  const stats = useMemo(() => {
    const total = prestasiList.length;
    const nasionalInternasional = prestasiList.filter(item => item.tingkat === "Nasional" || item.tingkat === "Internasional").length;
    const curMonth = new Date().toISOString().slice(0, 7);
    const bulanIni = prestasiList.filter(item => item.tanggal_prestasi && item.tanggal_prestasi.startsWith(curMonth)).length;

    return { total, nasionalInternasional, bulanIni };
  }, [prestasiList]);

  const paginatedPrestasi = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredPrestasi.slice(start, start + itemsPerPage);
  }, [filteredPrestasi, currentPage, itemsPerPage]);

  const exportExcel = () => {
    const data = filteredPrestasi.map((item, idx) => {
      const sInfo = getStudentInfo(item.siswa_nis);
      return {
        "No": idx + 1,
        "NIS": item.siswa_nis,
        "Nama Siswa": sInfo.name,
        "Kelas": sInfo.class_name,
        "Nama Prestasi": item.nama_prestasi,
        "Peringkat": item.peringkat,
        "Tingkat": item.tingkat,
        "Penyelenggara": item.penyelenggara,
        "Tanggal": item.tanggal_prestasi ? item.tanggal_prestasi.slice(0, 10) : "",
        "Keterangan": item.keterangan
      };
    });
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Prestasi_Siswa");
    XLSX.writeFile(wb, `Riwayat_Prestasi_Siswa_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  const getTingkatBadgeClass = (tingkat) => {
    switch(tingkat) {
      case 'Internasional':
        return 'bg-purple-100/90 text-purple-800 border-purple-200 shadow-2xs';
      case 'Nasional':
        return 'bg-rose-100/90 text-rose-800 border-rose-200 shadow-2xs';
      case 'Provinsi':
        return 'bg-sky-100/90 text-sky-800 border-sky-200 shadow-2xs';
      default:
        return 'bg-amber-100/90 text-amber-800 border-amber-200 shadow-2xs';
    }
  };

  return (
    <div className="space-y-5 animate-in fade-in duration-300">
      
      {/* HEADER CARD */}
      <PageHeader 
        title="Riwayat Prestasi Siswa"
        description="Dokumentasi pencapaian akademik & non-akademik siswa di berbagai tingkat kejuaraan."
        icon={Trophy}
      >
        <button
          type="button"
          onClick={exportExcel}
          className="py-2 px-3.5 rounded-[var(--ui-radius-small)] font-bold text-xs bg-white/15 hover:bg-white/25 text-white border border-white/20 flex items-center justify-center gap-1.5 transition-all shadow-2xs cursor-pointer backdrop-blur-sm active:scale-95"
        >
          <FileSpreadsheet size={15} />
          <span>Export Excel</span>
        </button>
        <button
          type="button"
          onClick={() => { setIsEditing(null); setFormData({ siswa_nis: "", nama_prestasi: "", peringkat: "", tingkat: "Kabupaten/Kota", penyelenggara: "", tanggal_prestasi: new Date().toISOString().slice(0, 10), keterangan: "" }); setShowModal(true); }}
          className="py-2 px-4 rounded-[var(--ui-radius-small)] font-black text-xs bg-accent text-slate-950 hover:bg-amber-300 flex items-center justify-center gap-1.5 transition-all shadow-sm cursor-pointer active:scale-95 border-none"
        >
          <Plus size={16} strokeWidth={2.5} />
          <span>Tambah Prestasi</span>
        </button>
      </PageHeader>

      {/* STAT CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-[var(--ui-radius-card)] p-4.5 border border-slate-200/80 shadow-xs flex items-center gap-4 transition-all hover:shadow-md">
          <div className="w-12 h-12 rounded-[var(--ui-radius-control)] bg-amber-50 text-amber-600 border border-amber-200/70 flex items-center justify-center shrink-0 shadow-2xs">
            <Trophy size={24} />
          </div>
          <div>
            <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Total Prestasi</p>
            <p className="text-2xl font-black text-slate-800 leading-tight mt-0.5">{stats.total}</p>
            <p className="text-[11px] text-slate-500 font-semibold mt-0.5">Seluruh kejuaraan siswa</p>
          </div>
        </div>

        <div className="bg-white rounded-[var(--ui-radius-card)] p-4.5 border border-slate-200/80 shadow-xs flex items-center gap-4 transition-all hover:shadow-md">
          <div className="w-12 h-12 rounded-[var(--ui-radius-control)] bg-rose-50 text-rose-600 border border-rose-200/70 flex items-center justify-center shrink-0 shadow-2xs">
            <Award size={24} />
          </div>
          <div>
            <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Nasional &amp; Int.</p>
            <p className="text-2xl font-black text-slate-800 leading-tight mt-0.5">{stats.nasionalInternasional}</p>
            <p className="text-[11px] text-slate-500 font-semibold mt-0.5">Kejuaraan skala besar</p>
          </div>
        </div>

        <div className="bg-white rounded-[var(--ui-radius-card)] p-4.5 border border-slate-200/80 shadow-xs flex items-center gap-4 transition-all hover:shadow-md">
          <div className="w-12 h-12 rounded-[var(--ui-radius-control)] bg-emerald-50 text-emerald-600 border border-emerald-200/70 flex items-center justify-center shrink-0 shadow-2xs">
            <TrendingUp size={24} />
          </div>
          <div>
            <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Prestasi Bulan Ini</p>
            <p className="text-2xl font-black text-slate-800 leading-tight mt-0.5">{stats.bulanIni}</p>
            <p className="text-[11px] text-slate-500 font-semibold mt-0.5">Bulan berjalan</p>
          </div>
        </div>
      </div>

      {/* FILTER & DATA SECTION */}
      <div className="bg-white rounded-[var(--ui-radius-card)] border border-slate-200/80 shadow-xs overflow-hidden flex flex-col">
        
        {/* Filters Header */}
        <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row gap-3 items-center justify-between">
          <div className="relative w-full sm:flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input
              type="text"
              placeholder="Cari nama siswa, NIS, atau nama prestasi..."
              value={search}
              onChange={e => { setSearch(e.target.value); setCurrentPage(1); }}
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-[var(--ui-radius-small)] text-xs font-semibold focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all"
            />
          </div>

          <div className="flex items-center gap-2.5 w-full sm:w-auto">
            <div className="w-1/2 sm:w-44">
              <CustomSelect
                options={[
                  { value: 'all', label: 'Semua Tingkat' },
                  { value: 'Kabupaten/Kota', label: 'Kabupaten/Kota' },
                  { value: 'Provinsi', label: 'Provinsi' },
                  { value: 'Nasional', label: 'Nasional' },
                  { value: 'Internasional', label: 'Internasional' }
                ]}
                value={filterTingkat}
                onChange={v => { setFilterTingkat(v); setCurrentPage(1); }}
              />
            </div>
            <div className="w-1/2 sm:w-44">
              <CustomSelect
                options={[{ value: 'all', label: 'Semua Kelas' }, ...classes.map(c => ({ value: c.name, label: c.name }))]}
                value={filterKelas}
                onChange={v => { setFilterKelas(v); setCurrentPage(1); }}
              />
            </div>
          </div>
        </div>

        {/* MOBILE CARD VIEW (< md screen) */}
        <div className="block md:hidden divide-y divide-slate-100">
          {isLoading ? (
            <div className="p-8 text-center text-slate-400 text-xs font-semibold">Memuat data prestasi...</div>
          ) : paginatedPrestasi.length === 0 ? (
            <div className="p-10 text-center text-slate-400 space-y-2">
              <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-500 border border-amber-100 flex items-center justify-center mx-auto">
                <Trophy size={24} />
              </div>
              <p className="font-extrabold text-sm text-slate-700">Belum Ada Data Prestasi</p>
              <p className="text-xs text-slate-400">Tidak ada catatan prestasi yang cocok dengan pencarian Anda.</p>
            </div>
          ) : (
            paginatedPrestasi.map((item) => {
              const sInfo = getStudentInfo(item.siswa_nis);
              const badgeStyle = getTingkatBadgeClass(item.tingkat);
              return (
                <div key={item.id} className="p-4 hover:bg-slate-50/50 transition-colors space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-xl bg-amber-100/70 text-amber-700 border border-amber-200/80 flex items-center justify-center font-black text-xs shrink-0 shadow-2xs">
                        {sInfo.name.charAt(0)}
                      </div>
                      <div className="min-w-0">
                        <h4 className="font-extrabold text-slate-800 text-xs truncate leading-snug">{sInfo.name}</h4>
                        <p className="text-[10px] font-semibold text-slate-400">NIS: {item.siswa_nis} • Kelas {sInfo.class_name}</p>
                      </div>
                    </div>
                    
                    <span className={`text-[9.5px] font-black px-2.5 py-0.5 rounded-full border ${badgeStyle} shrink-0`}>
                      {item.tingkat}
                    </span>
                  </div>

                  <div className="bg-slate-50/80 rounded-xl p-3 border border-slate-200/70 space-y-1.5">
                    <p className="font-black text-xs text-slate-800">{item.nama_prestasi}</p>
                    {item.peringkat && (
                      <div className="flex items-center gap-1.5">
                        <span className="px-2 py-0.5 bg-amber-100 text-amber-800 border border-amber-200 rounded-md text-[10px] font-black inline-flex items-center gap-1">
                          <Award size={11} /> {item.peringkat}
                        </span>
                      </div>
                    )}
                    {item.keterangan && (
                      <p className="text-[11px] text-slate-500 font-medium leading-relaxed pt-0.5">{item.keterangan}</p>
                    )}
                  </div>

                  <div className="flex items-center justify-between pt-1 text-[10px] text-slate-400 font-semibold">
                    <div className="flex items-center gap-3">
                      {item.penyelenggara && (
                        <span className="flex items-center gap-1">
                          <Building size={11} className="text-slate-400" /> {item.penyelenggara}
                        </span>
                      )}
                      {item.tanggal_prestasi && (
                        <span className="flex items-center gap-1">
                          <Calendar size={11} className="text-slate-400" /> {new Date(item.tanggal_prestasi).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => handleEdit(item)}
                        className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors border-none bg-transparent cursor-pointer"
                        title="Edit Prestasi"
                      >
                        <Edit2 size={13} />
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeleteTarget(item)}
                        className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors border-none bg-transparent cursor-pointer"
                        title="Hapus Prestasi"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* DESKTOP TABLE VIEW (>= md screen) */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="text-[10px] font-black text-slate-400 uppercase bg-slate-50/80 border-b border-slate-100 tracking-wider">
              <tr>
                <th className="px-5 py-3.5">SISWA &amp; KELAS</th>
                <th className="px-5 py-3.5">NAMA PRESTASI</th>
                <th className="px-5 py-3.5 text-center">PERINGKAT &amp; TINGKAT</th>
                <th className="px-5 py-3.5">PENYELENGGARA &amp; TANGGAL</th>
                <th className="px-5 py-3.5">KETERANGAN</th>
                <th className="px-5 py-3.5 text-right">AKSI</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {isLoading ? (
                <tr>
                  <td colSpan="6" className="px-6 py-12 text-center text-slate-400 font-semibold">Memuat data prestasi...</td>
                </tr>
              ) : filteredPrestasi.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-6 py-16 text-center text-slate-400 space-y-2">
                    <div className="w-14 h-14 rounded-2xl bg-amber-50 text-amber-500 border border-amber-100 flex items-center justify-center mx-auto shadow-2xs">
                      <Trophy size={28} />
                    </div>
                    <p className="font-extrabold text-sm text-slate-700">Belum Ada Data Prestasi</p>
                    <p className="text-xs text-slate-400">Tidak ada catatan prestasi yang cocok dengan filter pencarian Anda.</p>
                  </td>
                </tr>
              ) : (
                paginatedPrestasi.map((item) => {
                  const sInfo = getStudentInfo(item.siswa_nis);
                  const badgeStyle = getTingkatBadgeClass(item.tingkat);
                  return (
                    <tr key={item.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-slate-100 text-slate-700 font-black text-xs flex items-center justify-center border border-slate-200 shrink-0">
                            {sInfo.name.charAt(0)}
                          </div>
                          <div>
                            <div className="font-bold text-slate-800 text-xs">{sInfo.name}</div>
                            <div className="text-[10px] text-slate-400 font-semibold mt-0.5 flex items-center gap-1.5">
                              <span>NIS: {item.siswa_nis}</span>
                              <span>•</span>
                              <span className="px-1.5 py-0.2 rounded bg-slate-100 text-slate-600 font-bold">{sInfo.class_name || 'Tanpa Kelas'}</span>
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3.5 font-bold text-slate-800 max-w-[260px]">
                        <div className="flex items-start gap-1.5">
                          <Award size={14} className="text-amber-500 shrink-0 mt-0.5" />
                          <span className="leading-snug">{item.nama_prestasi}</span>
                        </div>
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex flex-col items-center gap-1">
                          {item.peringkat && (
                            <span className="px-2.5 py-0.5 bg-amber-100/80 text-amber-800 border border-amber-200/80 rounded-full text-[10px] font-black shadow-2xs">
                              {item.peringkat}
                            </span>
                          )}
                          <span className={`text-[9.5px] font-black px-2.5 py-0.5 rounded-full border ${badgeStyle}`}>
                            {item.tingkat}
                          </span>
                        </div>
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="text-xs text-slate-700 font-bold flex items-center gap-1.5">
                          <Building size={12} className="text-slate-400 shrink-0"/> {item.penyelenggara || '-'}
                        </div>
                        <div className="text-[10px] text-slate-400 mt-1 font-semibold flex items-center gap-1.5">
                          <Calendar size={12} className="text-slate-400 shrink-0"/> {item.tanggal_prestasi ? new Date(item.tanggal_prestasi).toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' }) : '-'}
                        </div>
                      </td>
                      <td className="px-5 py-3.5">
                        <p className="text-xs text-slate-500 max-w-[220px] truncate font-medium" title={item.keterangan || '-'}>
                          {item.keterangan || '-'}
                        </p>
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <div className="flex justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => handleEdit(item)}
                            className="p-2 text-slate-400 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors border-none bg-transparent cursor-pointer"
                            title="Edit Data"
                          >
                            <Edit2 size={13} />
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeleteTarget(item)}
                            className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors border-none bg-transparent cursor-pointer"
                            title="Hapus Data"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* PAGINATION FOOTER */}
        <div className="border-t border-slate-100 bg-slate-50/50">
          <TablePagination
            currentPage={currentPage}
            totalPages={Math.ceil(filteredPrestasi.length / itemsPerPage) || 1}
            totalItems={filteredPrestasi.length}
            itemsPerPage={itemsPerPage}
            onPageChange={setCurrentPage}
            onItemsPerPageChange={(val) => { setItemsPerPage(val); setCurrentPage(1); }}
            isLoading={isLoading}
          />
        </div>
      </div>

      {/* TAMBAH/EDIT MODAL */}
      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={isEditing ? "Sunting Data Prestasi" : "Catat Prestasi Baru"} maxWidth="max-w-xl">
        <form onSubmit={handleSubmit} className="space-y-4 text-xs font-semibold text-slate-600">
          
          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Pilih Siswa (Penerima)</label>
            <CustomSelect
              options={students.map(s => ({
                value: s.nis,
                label: `${s.namaSiswa || s.name} (${s.nis} - ${s.class_name || ''})`
              }))}
              value={formData.siswa_nis}
              onChange={val => setFormData({ ...formData, siswa_nis: val })}
              placeholder="-- Cari nama siswa / NIS --"
              className="w-full text-left"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Nama Prestasi / Kejuaraan</label>
              <input 
                required
                type="text" 
                value={formData.nama_prestasi}
                onChange={e => setFormData({ ...formData, nama_prestasi: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 text-xs font-semibold"
                placeholder="Contoh: Juara 1 Lomba LKS RPL" 
              />
            </div>
            
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Peringkat / Penghargaan</label>
              <input 
                type="text" 
                value={formData.peringkat}
                onChange={e => setFormData({ ...formData, peringkat: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 text-xs font-semibold"
                placeholder="Contoh: Juara 1, Medali Emas" 
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Tingkat Kejuaraan</label>
              <CustomSelect
                options={[
                  { value: 'Kabupaten/Kota', label: 'Kabupaten/Kota' },
                  { value: 'Provinsi', label: 'Provinsi' },
                  { value: 'Nasional', label: 'Nasional' },
                  { value: 'Internasional', label: 'Internasional' }
                ]}
                value={formData.tingkat}
                onChange={val => setFormData({ ...formData, tingkat: val })}
                className="w-full text-left"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Penyelenggara</label>
              <input 
                type="text" 
                value={formData.penyelenggara}
                onChange={e => setFormData({ ...formData, penyelenggara: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 text-xs font-semibold"
                placeholder="Contoh: Kemendikbudristek" 
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Tanggal Perolehan</label>
              <input 
                required
                type="date" 
                value={formData.tanggal_prestasi}
                onChange={e => setFormData({ ...formData, tanggal_prestasi: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 text-xs font-semibold"
              />
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Keterangan / Rincian</label>
            <textarea 
              rows="3"
              value={formData.keterangan}
              onChange={e => setFormData({ ...formData, keterangan: e.target.value })}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 text-xs font-semibold resize-none"
              placeholder="Tulis rincian prestasi, skor, anggota tim jika beregu..."
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
            <button 
              type="button" 
              onClick={() => setShowModal(false)}
              className="py-2 px-4 rounded-xl font-bold text-xs bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors cursor-pointer"
            >
              Batal
            </button>
            <button 
              type="submit"
              className="py-2 px-4 rounded-xl font-black text-xs bg-amber-600 hover:bg-amber-700 text-white transition-colors cursor-pointer shadow-xs"
            >
              {isEditing ? "Simpan Perubahan" : "Catat Prestasi"}
            </button>
          </div>
        </form>
      </Modal>

      {/* VERIFIKASI HAPUS MODAL */}
      <Modal isOpen={!!deleteTarget} onClose={() => setDeleteTarget(null)} title="Konfirmasi Hapus Prestasi" maxWidth="max-w-md">
        <div className="space-y-4 text-xs font-semibold text-slate-600">
          <div className="flex items-center gap-3 p-3 bg-rose-50 border border-rose-100 rounded-xl text-rose-800">
            <AlertTriangle size={24} className="shrink-0 text-rose-600" />
            <div>
              <p className="font-black text-xs">Apakah Anda yakin ingin menghapus data ini?</p>
              <p className="text-[11px] text-rose-700 mt-0.5">Tindakan ini tidak dapat dibatalkan.</p>
            </div>
          </div>

          {deleteTarget && (
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 space-y-1">
              <p className="text-slate-800 font-extrabold text-xs">{deleteTarget.nama_prestasi}</p>
              <p className="text-[11px] text-slate-500">
                Siswa: <span className="font-bold text-slate-700">{getStudentInfo(deleteTarget.siswa_nis).name} ({deleteTarget.siswa_nis})</span>
              </p>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setDeleteTarget(null)}
              className="py-2 px-4 rounded-xl font-bold text-xs bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors cursor-pointer"
            >
              Batal
            </button>
            <button
              type="button"
              onClick={confirmDelete}
              className="py-2 px-4 rounded-xl font-black text-xs bg-rose-600 hover:bg-rose-700 text-white transition-colors cursor-pointer shadow-xs"
            >
              Ya, Hapus Permanen
            </button>
          </div>
        </div>
      </Modal>

      {/* TOAST */}
      {toast && (
        <div className={`fixed bottom-6 right-6 px-4 py-3 rounded-xl shadow-lg font-bold text-xs flex items-center gap-2 animate-in slide-in-from-bottom-5 text-white z-50 ${toast.type === 'error' ? 'bg-rose-600' : 'bg-emerald-600'}`}>
          {toast.type === 'error' ? <AlertCircle size={16} /> : <CheckCircle2 size={16} />} {toast.message}
        </div>
      )}
    </div>
  );
}
