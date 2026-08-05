import { useState, useEffect, useMemo, useCallback } from'react';
import useAuthStore from'../../store/monitoring/authStore.js';
import * as XLSX from'xlsx';
import { getAttendanceStatusTone } from'../../utils/adminHelpers.js';
import { Search, Download, Plus, CheckCircle2, Edit2, Trash2, X, UploadCloud } from'lucide-react';
import { CustomSelect } from'../../components/CustomSelect.jsx';
import { UISelect, Modal, Button } from '../../components/ui.jsx';


export default function AbsensiSiswa({ classes = [], students = [], hideTabs = false }) {
  const user = useAuthStore(state => state.user);
  const userRole = user?.role;
  const userDivision = (user?.division ||"").toLowerCase();
  const authToken = user?.authToken;

  const [items, setItems] = useState([]);
  const [search, setSearch] = useState("");
  const [filterKelas, setFilterKelas] = useState(() => {
    if (user?.role ==="guru" && user?.isWalas && user?.walasClass) {
      return user.walasClass;
    }
    return"all";
  });
  const [filterTanggal, setFilterTanggal] = useState(new Date().toISOString().split('T')[0]);

  const hasApprovalPermission = 
    ["admin", "superadmin", "tu", "tata_usaha", "kesiswaan"].includes(userRole) ||
    (userRole === "waka" && userDivision === "kesiswaan");

  const [isLoading, setIsLoading] = useState(false);
  
  const handleApproveReject = async (id, action) => {
    try {
      const res = await fetch("/api/kedisiplinan/absensi", {
        method:"POST",
        headers: {"Authorization": `Bearer ${authToken}`,"Content-Type":"application/json"
        },
        body: JSON.stringify({ action, id })
      });
      const data = await res.json();
      if (data.ok) {
        showToast(action ==='approve' ?"Pengajuan disetujui" :"Pengajuan ditolak","success");
        fetchData();
      } else {
        showToast(data.error ||"Gagal mengubah status persetujuan.","error");
      }
    } catch {
      showToast("Gagal menghubungi server.","error");
    }
  };

  const [showFormModal, setShowFormModal] = useState(false);
  const [form, setForm] = useState({ siswa_nis: [], tanggal: new Date().toISOString().split('T')[0], status:'Sakit', keterangan:'', fileData: null, fileName: null, fileSizeKB: null });
  const [editForm, setEditForm] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [toast, setToast] = useState(null);

  const compressImage = (file, callback) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        let width = img.width;
        let height = img.height;
        const MAX_WIDTH = 1000;
        const MAX_HEIGHT = 1000;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, width, height);

        const dataUrl = canvas.toDataURL("image/jpeg", 0.7);
        const stringLength = dataUrl.length -'data:image/jpeg;base64,'.length;
        const sizeInBytes = 4 * Math.ceil(stringLength / 3) * 0.5624896334383812;
        const sizeInKB = Math.round(sizeInBytes / 1024);

        callback(dataUrl, sizeInKB);
      };
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);
  };

  const fetchData = useCallback(async () => {
    if (!authToken) return;
    setIsLoading(true);
    try {
      const res = await fetch("/api/kedisiplinan/absensi", { headers: {"Authorization": `Bearer ${authToken}` } });
      const data = await res.json();
      if (data.ok) setItems(data.data || []);
    } catch (e) {
      console.error(e);
    }
    setIsLoading(false);
  }, [authToken]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const showToast = (message, type ="success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const getItemDateStr = useCallback((dateVal) => {
    if (!dateVal) return "";
    const str = String(dateVal).trim();
    if (str.length >= 10 && str.includes('-')) {
      const part = str.slice(0, 10);
      if (/^\d{4}-\d{2}-\d{2}$/.test(part)) return part;
    }
    try {
      return new Date(dateVal).toLocaleDateString('sv-SE', { timeZone: 'Asia/Jakarta' });
    } catch {
      return str.slice(0, 10);
    }
  }, []);

  const [filterStatus, setFilterStatus] = useState("all");

  const filteredItems = useMemo(() => {
    return items.filter(item => {
      // Exclude automatic machine HADIR logs from Surat Izin/Sakit management
      if (item.status === "Hadir" && item.pelapor_nama === "Mesin Hikvision") {
        return false;
      }

      const student = students.find(s => {
        const sNis = String(s.nis || s.code || '').trim();
        const iNis = String(item.siswa_nis || '').trim();
        if (!sNis || !iNis) return false;
        return sNis === iNis || sNis.endsWith(iNis) || iNis.endsWith(sNis);
      });
      const studentName = student ? (student.namaSiswa || student.name) : item.siswa_nis;
      const studentClass = student ? (student.class_name || student.kelas || "") : "";
      
      const itemDateStr = getItemDateStr(item.tanggal);
      const mSearch = search === "" || studentName.toLowerCase().includes(search.toLowerCase()) || String(item.siswa_nis).includes(search);
      const mKelas = filterKelas === "all" || studentClass === filterKelas;
      const mTanggal = filterTanggal === "" || itemDateStr === filterTanggal;
      const mStatus = filterStatus === "all" 
        || (filterStatus === "pending" ? item.approval_status === "pending" : item.status === filterStatus);

      return mSearch && mKelas && mTanggal && mStatus;
    });
  }, [items, search, filterKelas, filterTanggal, filterStatus, students, getItemDateStr]);

  const [activeTab, setActiveTab] = useState('surat_izin');
  const [matrixMonth, setMatrixMonth] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2,'0')}`;
  });

  const [currentPageSurat, setCurrentPageSurat] = useState(1);
  const [itemsPerPageSurat, setItemsPerPageSurat] = useState(20);

  useEffect(() => {
    setCurrentPageSurat(1);
  }, [search, filterKelas, filterTanggal]);

  const paginatedSuratItems = useMemo(() => {
    const startIndex = (currentPageSurat - 1) * itemsPerPageSurat;
    return filteredItems.slice(startIndex, startIndex + itemsPerPageSurat);
  }, [filteredItems, currentPageSurat, itemsPerPageSurat]);

  const totalPagesSurat = Math.ceil(filteredItems.length / itemsPerPageSurat);

  const [currentPageMatrix, setCurrentPageMatrix] = useState(1);
  const [itemsPerPageMatrix, setItemsPerPageMatrix] = useState(20);

  useEffect(() => {
    setCurrentPageMatrix(1);
  }, [matrixMonth, filterKelas]);

  const studentsToSelect = useMemo(() => {
    if (user?.role ==="guru" && user?.isWalas && user?.walasClass) {
      return students.filter(s => (s.class_name || s.kelas) === user.walasClass);
    }
    return students;
  }, [students, user]);

  const daysInMonth = useMemo(() => {
    if (!matrixMonth) return 31;
    const [year, month] = matrixMonth.split('-');
    return new Date(year, month, 0).getDate();
  }, [matrixMonth]);

  const matrixData = useMemo(() => {
    const data = {};
    studentsToSelect.forEach(s => {
      data[s.nis] = {
        name: s.namaSiswa || s.name,
        nis: s.nis,
        kelas: s.class_name || s.kelas,
        attendance: {},
        totals: { S: 0, I: 0, A: 0 }
      };
    });
    items.forEach(item => {
      // Only approved attendance for matrix
      if (item.approval_status === "approved" || item.approval_status === "otomatis") {
        if (item.tanggal.startsWith(matrixMonth)) {
          const itemNis = String(item.siswa_nis || '').trim();
          const targetKey = Object.keys(data).find(k => {
            const keyStr = String(k || '').trim();
            return keyStr === itemNis || keyStr.endsWith(itemNis) || itemNis.endsWith(keyStr);
          });
          if (targetKey && data[targetKey]) {
            const day = parseInt(item.tanggal.split('-')[2], 10);
            const initial = item.status.charAt(0).toUpperCase();
            data[targetKey].attendance[day] = initial;
            if (data[targetKey].totals[initial] !== undefined) {
               data[targetKey].totals[initial]++;
            }
          }
        }
      }
    });
    return Object.values(data).filter(d => filterKelas ==="all" || d.kelas === filterKelas).sort((a,b) => a.name.localeCompare(b.name));
  }, [studentsToSelect, items, matrixMonth, filterKelas]);

  const paginatedMatrixData = useMemo(() => {
    const startIndex = (currentPageMatrix - 1) * itemsPerPageMatrix;
    return matrixData.slice(startIndex, startIndex + itemsPerPageMatrix);
  }, [matrixData, currentPageMatrix, itemsPerPageMatrix]);

  const totalPagesMatrix = Math.ceil(matrixData.length / itemsPerPageMatrix);

  const handleSave = async (e) => {
    e.preventDefault();
    if (form.siswa_nis.length === 0 || !form.tanggal) return showToast('Pilih minimal 1 siswa dan tanggal absensi!','error');
    setIsLoading(true);
    try {
      // Loop save for each selected student
      for (const nis of form.siswa_nis) {
        await fetch("/api/kedisiplinan/absensi", {
          method:"POST",
          headers: {"Authorization": `Bearer ${authToken}`,"Content-Type":"application/json" },
          body: JSON.stringify({ 
            siswa_nis: nis, 
            tanggal: form.tanggal, 
            status: form.status, 
            keterangan: form.keterangan,
            fileData: form.fileData,
            fileName: form.fileName
          })
        });
      }
      showToast("Absensi berhasil dicatat");
      setShowFormModal(false);
      setForm({ siswa_nis: [], tanggal: new Date().toISOString().split('T')[0], status:'Sakit', keterangan:'', fileData: null, fileName: null, fileSizeKB: null });
      fetchData();
    } catch {
      showToast("Gagal menyimpan","error");
    }
    setIsLoading(false);
  };

  const handleDelete = async (id) => {
    if (await window.confirmAsync("Hapus catatan absensi ini?")) {
      try {
        const res = await fetch("/api/kedisiplinan/absensi", {
          method:"POST",
          headers: {"Authorization": `Bearer ${authToken}`,"Content-Type":"application/json" },
          body: JSON.stringify({ id, action:'delete' })
        });
        const data = await res.json();
        if (data.ok) {
          showToast("Data dihapus");
          fetchData();
        }
      } catch {
         showToast("Gagal menghapus","error");
      }
    }
  };

  const handleEdit = (item) => {
    setEditForm({ ...item, surat_base64: null, fileName:'', fileSizeKB: null });
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    setIsUploading(true);
    try {
      await fetch("/api/kedisiplinan/absensi", {
        method:"POST",
        headers: {"Authorization": `Bearer ${authToken}`,"Content-Type":"application/json" },
        body: JSON.stringify({ 
          id: editForm.id, 
          status: editForm.status, 
          keterangan: editForm.keterangan, 
          action:'update', 
          fileData: editForm.surat_base64, 
          fileName: editForm.fileName 
        })
      });
      showToast(editForm.surat_base64 ?"Data diupdate & Surat tersimpan di Google Drive!" :"Data berhasil diupdate!");
      setEditForm(null);
      fetchData();
    } catch {
      showToast("Gagal update data","error");
    }
    setIsUploading(false);
  };

  const openAdd = () => {
    setForm({ siswa_nis: [], tanggal: new Date().toISOString().split('T')[0], status:'Sakit', keterangan:'', fileData: null, fileName: null, fileSizeKB: null });
    setShowFormModal(true);
  };

  const handleAddSiswa = (nis) => {
    if (!nis) return;
    if (form.siswa_nis.includes(nis)) return;
    setForm({...form, siswa_nis: [...form.siswa_nis, nis]});
  };

  const handleRemoveSiswa = (nis) => {
    setForm({...form, siswa_nis: form.siswa_nis.filter(id => id !== nis)});
  };
  
  const exportExcel = () => {
    const ws = XLSX.utils.json_to_sheet(filteredItems.map(item => {
      const student = students.find(s => s.nis === item.siswa_nis);
      return {
        Tanggal: new Date(item.tanggal).toLocaleDateString('id-ID'),
        NIS: item.siswa_nis,
        Nama: student ? (student.namaSiswa || student.name) :'-',
        Kelas: student ? (student.class_name || student.kelas ||'-') :'-',
        Status: item.status,
        Keterangan: item.keterangan ||'-',
        Petugas: item.pelapor_nama
      }
    }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws,"Rekap_Absensi");
    XLSX.writeFile(wb, `Rekap_Absensi_${filterTanggal ||'Semua'}.xlsx`);
  };

  const classOptions = useMemo(() => classes.map(c => ({value: c.name, label: c.name})), [classes]);

  const classOptionsToShow = useMemo(() => {
    if (user?.role ==="guru" && user?.isWalas && user?.walasClass) {
      return [{ value: user.walasClass, label: user.walasClass }];
    }
    return [{ value:'all', label:'Semua Kelas' }, ...classOptions];
  }, [user, classOptions]);


  return (
    <div className="flex flex-col w-full animate-in fade-in duration-300 relative z-10 ui-card overflow-hidden">
      {!hideTabs && (
      <div className="flex bg-slate-50/80 border-b border-slate-100 p-2 gap-2 overflow-x-auto hide-scrollbar">
        <Button variant="outline"
          onClick={() =>setActiveTab('matriks')}
          className={`cursor-pointer ${activeTab ==='matriks' ?'bg-white text-[var(--ui-primary)] shadow-sm ring-1 ring-slate-200/50' :'bg-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'}`}
        >
          Laporan Kehadiran</Button>
        <Button variant="outline"
          onClick={() =>setActiveTab('surat_izin')}
          className={`cursor-pointer ${activeTab ==='surat_izin' ?'bg-white text-[var(--ui-primary)] shadow-sm ring-1 ring-slate-200/50' :'bg-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'}`}
        >
          Manajemen Surat Izin/Sakit</Button>
      </div>
      )}

      {activeTab ==='surat_izin' && (
      <div className="flex flex-col">
        {/* Quick Filter Pills */}
        <div className="px-4 pt-3 pb-1 bg-slate-50/50 border-b border-slate-100 flex flex-wrap items-center gap-2">
          {[
            { id: "all", label: "Semua Surat", count: items.filter(i => !(i.status === "Hadir" && i.pelapor_nama === "Mesin Hikvision")).length },
            { id: "pending", label: "Pending Persetujuan", count: items.filter(i => !(i.status === "Hadir" && i.pelapor_nama === "Mesin Hikvision") && i.approval_status === "pending").length },
            { id: "Sakit", label: "Sakit", count: items.filter(i => i.status === "Sakit").length },
            { id: "Izin", label: "Izin", count: items.filter(i => i.status === "Izin").length },
            { id: "Alpha", label: "Alpha", count: items.filter(i => i.status === "Alpha").length },
          ].map(tab => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setFilterStatus(tab.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer border flex items-center gap-1.5 ${
                filterStatus === tab.id
                  ? "bg-[var(--ui-primary)] text-white border-[var(--ui-primary)] shadow-2xs font-extrabold"
                  : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
              }`}
            >
              <span>{tab.label}</span>
              <span className={`text-[10px] font-black px-1.5 py-0.2 rounded-md ${
                filterStatus === tab.id ? "bg-white/20 text-white" : "bg-slate-100 text-slate-600"
              }`}>
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        <div className="p-4 border-b border-slate-100 flex flex-col md:flex-row gap-4 justify-between items-start md:items-center bg-white">
          <div className="flex flex-col md:flex-row md:flex-wrap items-stretch md:items-center gap-3 w-full">
            <div className="relative flex-1 min-w-[200px] w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input
                type="text"
                placeholder="Cari siswa atau NIS..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-[var(--ui-radius-small)] text-sm focus:outline-none focus:border-[var(--ui-primary)] focus:ring-2 focus:ring-[var(--ui-primary)]/20 transition-all font-medium"
              />
            </div>
            <div className="w-full md:w-[150px]">
              <CustomSelect
                options={classOptionsToShow}
                value={filterKelas}
                onChange={val => setFilterKelas(val)}
                placeholder="Filter Kelas"
              />
            </div>
            <div className="flex w-full md:w-auto items-center gap-2">
              <input 
                type="date"
                value={filterTanggal}
                onChange={e=>setFilterTanggal(e.target.value)}
                className="flex-1 md:flex-none px-4 py-2 bg-white border border-slate-200 rounded-[var(--ui-radius-small)] text-sm font-medium focus:outline-none focus:border-[var(--ui-primary)]"
              />
              {filterTanggal !=="" && (
                 <Button variant="ghost" size="sm" onClick={() => setFilterTanggal("")} className="shrink-0">Clear</Button>
              )}
            </div>
          </div>
          <div className="flex flex-wrap gap-2 w-full md:w-auto shrink-0 justify-start md:justify-end">
            <Button 
              variant="outline"
              size="sm"
              onClick={exportExcel} 
              className="flex items-center gap-2"
            >
              <Download size={14} /> <span>Export</span>
            </Button>
            <Button 
              size="sm"
              onClick={openAdd} 
              className="flex items-center gap-2"
            >
              <Plus size={14} /> <span>Input Absensi</span>
            </Button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-slate-500 uppercase bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-6 py-4 font-bold text-center w-12">No</th>
                <th className="px-6 py-4 font-bold">Tanggal</th>
                <th className="px-6 py-4 font-bold">Siswa</th>
                <th className="px-6 py-4 font-bold text-center">Status</th>
                <th className="px-6 py-4 font-bold">Keterangan</th>
                <th className="px-6 py-4 font-bold">Petugas Input</th>
                <th className="px-6 py-4 font-bold text-center">Persetujuan</th>
                <th className="px-6 py-4 font-bold text-right">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan="8" className="px-6 py-8 text-center text-slate-400 font-medium">Memuat data...</td></tr>
              ) : paginatedSuratItems.length === 0 ? (
                <tr>
                     <td colSpan="8" className="px-6 py-12 text-center text-slate-400 font-medium whitespace-normal">
                       <CheckCircle2 size={40} className="mx-auto text-emerald-400 opacity-50 mb-3" />
                       Data surat izin / sakit tidak ditemukan untuk filter ini.<br/><span className="text-xs mt-1">Belum ada pengajuan atau siswa masuk semua.</span>
                   </td>
                </tr>
              ) : (
                paginatedSuratItems.map((item, idx) => {
                  const student = students.find(s => s.nis === item.siswa_nis);
                  return (
                  <tr key={item.id} className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4 font-medium text-slate-400 text-center">{(currentPageSurat - 1) * itemsPerPageSurat + idx + 1}</td>
                    <td className="px-6 py-4 font-bold text-slate-700">{new Date(item.tanggal).toLocaleDateString('id-ID', { weekday:'short', day:'numeric', month:'short' })}</td>
                    <td className="px-6 py-4">
                       <p className="font-bold text-slate-800">{student ? (student.namaSiswa || student.name) : item.siswa_nis}</p>
                       <p className="text-[11px] font-semibold text-slate-500">{student ? (student.class_name || student.kelas ||'-') :'-'}</p>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className={`px-2.5 py-1 rounded-[var(--ui-radius-small)] border text-[11px] uppercase tracking-wider ${getAttendanceStatusTone(item.status)}`}>
                        {item.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600 font-medium">
                       <div className="flex flex-col gap-1.5">
                         <span>{item.keterangan || <span className="text-slate-300 italic">Tanpa keterangan</span>}</span>
                         {item.gdrive_url && (
                           <a 
                             href={item.gdrive_url} 
                             target="_blank" 
                             rel="noreferrer" 
                             className="text-xs text-blue-600 hover:underline font-bold flex items-center gap-1 bg-blue-50/50 px-2 py-0.5 rounded border border-blue-100 self-start"
                           >
                             📁 Lihat Surat (Google Drive)
                           </a>
                         )}
                       </div>
                    </td>
                    <td className="px-6 py-4 text-[11px] font-semibold text-slate-500">
                       {item.pelapor_nama}
                    </td>
                    <td className="px-6 py-4 text-center">
                       {item.approval_status === "approved" ? (
                          <span className="px-2 py-0.5 rounded-[var(--ui-radius-small)] bg-emerald-100 text-emerald-800 text-[10px] font-black uppercase tracking-wider inline-block">
                            DISETUJUI
                            {item.approved_by_name && (
                              <span className="text-[8px] font-bold text-emerald-600 block lowercase">oleh {item.approved_by_name}</span>
                            )}
                          </span>
                       ) : item.approval_status === "rejected" ? (
                          <span className="px-2 py-0.5 rounded-[var(--ui-radius-small)] bg-red-100 text-red-800 text-[10px] font-black uppercase tracking-wider inline-block">
                            DITOLAK
                          </span>
                       ) : item.approval_status === "otomatis" ? (
                          <span className="px-2 py-0.5 rounded-[var(--ui-radius-small)] bg-slate-100 text-slate-700 text-[10px] font-black uppercase tracking-wider inline-block">
                            OTOMATIS
                          </span>
                       ) : (
                          <div className="flex flex-col items-center gap-1">
                            <span className="px-2 py-0.5 rounded-[var(--ui-radius-small)] bg-amber-100 text-amber-800 text-[10px] font-black uppercase tracking-wider">
                              PENDING
                            </span>
                            {hasApprovalPermission && (
                              <div className="flex gap-1 mt-1 justify-center">
                                <Button 
                                  variant="ghost" size="sm"
                                  onClick={() => handleApproveReject(item.id,'approve')}
                                  className="h-6 px-2 text-[10px]"
                                >
                                  Setujui
                                </Button>
                                <Button 
                                  variant="ghost" size="sm"
                                  onClick={() => handleApproveReject(item.id,'reject')}
                                  className="h-6 px-2 text-[10px] text-red-500 hover:text-red-600 hover:bg-red-50"
                                >
                                  Tolak
                                </Button>
                              </div>
                            )}
                          </div>
                       )}
                    </td>
                    <td className="px-6 py-4 text-right flex justify-end gap-2">
                      {(hasApprovalPermission || item.approval_status ==="pending") && (
                        <>
                          <Button variant="ghost" size="icon" onClick={() => handleEdit(item)} title="Edit"><Edit2 size={14} className="text-slate-500"/></Button>
                          <Button variant="ghost" size="icon" onClick={() => handleDelete(item.id)} title="Hapus"><Trash2 size={14} className="text-red-500"/></Button>
                        </>
                      )}
                    </td>
                  </tr>
                )})
              )}
            </tbody>
          </table>
        </div>
        <div className="flex flex-col sm:flex-row justify-between items-center p-4 border-t border-slate-100 gap-4 bg-white rounded-b-[var(--ui-radius-card)]">
          <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 text-sm text-slate-500 font-medium text-center">
            Tampilkan 
            <UISelect 
              value={itemsPerPageSurat} 
              onChange={e => { setItemsPerPageSurat(Number(e.target.value)); setCurrentPageSurat(1); }}
              className="px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-[var(--ui-radius-small)] text-slate-700 focus:outline-none focus:border-[var(--ui-primary)]"
            >
              <option value={20}>20</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </UISelect>
            data dari {filteredItems.length}
          </div>
          <div className="flex gap-1">
            <Button 
              variant="outline" size="sm"
              onClick={() => setCurrentPageSurat(p => Math.max(1, p - 1))}
              disabled={currentPageSurat === 1}
            >
              Prev
            </Button>
            <span className="px-3 py-1 bg-slate-50 border border-slate-200 rounded-[var(--ui-radius-small)] text-sm text-slate-700 font-bold flex items-center">
              {currentPageSurat} / {totalPagesSurat || 1}
            </span>
            <Button 
              variant="outline" size="sm"
              onClick={() => setCurrentPageSurat(p => Math.min(totalPagesSurat, p + 1))}
              disabled={currentPageSurat === totalPagesSurat || totalPagesSurat === 0}
            >
              Next
            </Button>
          </div>
        </div>
      </div>
      )}

      {activeTab ==='matriks' && (
      <div className="flex flex-col p-4 md:p-5">
        <div className="flex flex-col md:flex-row gap-3 justify-between items-start md:items-center mb-4">
          <h4 className="font-bold text-slate-800 text-sm">Matriks Kehadiran Bulanan</h4>
          <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
            <input 
              type="month" 
              value={matrixMonth} 
              onChange={e => setMatrixMonth(e.target.value)} 
              className="w-full sm:w-auto px-4 py-2 bg-slate-50 border border-slate-200 rounded-[var(--ui-radius-small)] text-sm font-semibold focus:outline-none focus:border-[var(--ui-primary)] focus:ring-2 focus:ring-[var(--ui-primary)]/20 transition-all"
            />
            <div className="w-full sm:w-[150px]">
              <CustomSelect
                options={classOptionsToShow}
                value={filterKelas}
                onChange={setFilterKelas}
                placeholder="Filter Kelas"
              />
            </div>
          </div>
        </div>
        <div className="overflow-x-auto rounded-[var(--ui-radius-card)] border border-slate-100 bg-white">
          <table className="w-full text-left text-xs whitespace-nowrap">
            <thead className="bg-slate-50 text-slate-500 font-bold tracking-wider">
              <tr>
                <th className="px-4 py-3 border-b border-slate-100 bg-slate-50 sticky left-0 z-20 w-8 text-center">No</th>
                <th className="px-4 py-3 border-b border-slate-100 bg-slate-50 sticky left-[40px] z-20 min-w-[200px]">Nama Siswa</th>
                <th className="px-4 py-3 border-b border-slate-100 border-r text-center">Kelas</th>
                {Array.from({ length: daysInMonth }).map((_, i) => (
                  <th key={i} className="px-2 py-3 border-b border-slate-100 text-center w-8 min-w-[32px]">
                    {i + 1}
                  </th>
                ))}
                <th className="px-2 py-3 border-b border-l border-slate-100 text-center text-amber-600">S</th>
                <th className="px-2 py-3 border-b border-slate-100 text-center text-blue-600">I</th>
                <th className="px-2 py-3 border-b border-slate-100 text-center text-red-600">A</th>
              </tr>
            </thead>
            <tbody className="text-slate-700 font-medium divide-y divide-slate-50">
              {paginatedMatrixData.length === 0 ? (
                <tr>
                  <td colSpan={daysInMonth + 6} className="px-4 py-8 text-center text-slate-400">
                    Tidak ada data siswa untuk kelas ini.
                  </td>
                </tr>
              ) : (
                paginatedMatrixData.map((d, index) => (
                  <tr key={d.nis} className="hover:bg-slate-50/50 group">
                    <td className="px-4 py-3 bg-white group-hover:bg-slate-50/50 sticky left-0 z-10 text-center text-slate-400">{(currentPageMatrix - 1) * itemsPerPageMatrix + index + 1}</td>
                    <td className="px-4 py-3 bg-white group-hover:bg-slate-50/50 sticky left-[40px] z-10 font-bold">{d.name}</td>
                    <td className="px-4 py-3 border-r border-slate-50 text-center">{d.kelas}</td>
                    {Array.from({ length: daysInMonth }).map((_, i) => {
                      const initial = d.attendance[i + 1];
                      let colorClass ="text-slate-300";
                      if (initial ==='S') colorClass ="text-amber-500 font-black bg-amber-50/50 rounded";
                      else if (initial ==='I') colorClass ="text-blue-500 font-black bg-blue-50/50 rounded";
                      else if (initial ==='A') colorClass ="text-red-500 font-black bg-red-50/50 rounded";
                      return (
                        <td key={i} className={`px-2 py-3 text-center ${colorClass}`}>
                          {initial ||"-"}
                        </td>
                      );
                    })}
                    <td className="px-2 py-3 border-l border-slate-50 text-center font-bold text-amber-600 bg-amber-50/30">{d.totals.S}</td>
                    <td className="px-2 py-3 text-center font-bold text-blue-600 bg-blue-50/30">{d.totals.I}</td>
                    <td className="px-2 py-3 text-center font-bold text-red-600 bg-red-50/30">{d.totals.A}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div className="flex flex-col sm:flex-row justify-between items-center p-4 border-t border-slate-100 gap-4 bg-white rounded-b-[var(--ui-radius-card)]">
          <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 text-sm text-slate-500 font-medium text-center">
            Tampilkan 
            <UISelect 
              value={itemsPerPageMatrix} 
              onChange={e => { setItemsPerPageMatrix(Number(e.target.value)); setCurrentPageMatrix(1); }}
              className="px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-[var(--ui-radius-small)] text-slate-700 focus:outline-none focus:border-[var(--ui-primary)]"
            >
              <option value={20}>20</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </UISelect>
            data dari {matrixData.length}
          </div>
          <div className="flex gap-1">
            <Button 
              variant="outline" size="sm"
              onClick={() => setCurrentPageMatrix(p => Math.max(1, p - 1))}
              disabled={currentPageMatrix === 1}
            >
              Prev
            </Button>
            <span className="px-3 py-1 bg-slate-50 border border-slate-200 rounded-[var(--ui-radius-small)] text-sm text-slate-700 font-bold flex items-center">
              {currentPageMatrix} / {totalPagesMatrix || 1}
            </span>
            <Button 
              variant="outline" size="sm"
              onClick={() => setCurrentPageMatrix(p => Math.min(totalPagesMatrix, p + 1))}
              disabled={currentPageMatrix === totalPagesMatrix || totalPagesMatrix === 0}
            >
              Next
            </Button>
          </div>
        </div>
      </div>
      )}

      {showFormModal && (
        <Modal isOpen={showFormModal} onClose={() => setShowFormModal(false)} title="Input Absensi Siswa" maxWidth="max-w-lg">
          <form onSubmit={handleSave} className="space-y-4">
             <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Tanggal</label>
                  <input type="date" value={form.tanggal} onChange={e=>setForm({...form, tanggal: e.target.value})} className="w-full px-3 py-2 bg-slate-50 border-none rounded-[var(--ui-radius-small)] text-sm font-semibold focus:outline-none focus:border-[var(--ui-primary)]" required />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Status</label>
                  <UISelect value={form.status} onChange={e=>setForm({...form, status: e.target.value})} className="w-full px-3 py-2 bg-slate-50 border-none rounded-[var(--ui-radius-small)] text-sm font-semibold focus:outline-none focus:border-[var(--ui-primary)]">
                    <option value="Sakit">Sakit</option>
                    <option value="Izin">Izin</option>
                    <option value="Alpa">Alpa</option>
                  </UISelect>
                </div>
             </div>
             <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Cari & Tambah Siswa (Bisa Multiple)</label>
                 <CustomSelect
                   options={studentsToSelect.map(s => ({ value: s.nis, label: `${s.namaSiswa || s.name} (${s.class_name || s.kelas ||'-'})` }))}
                   value=""
                   onChange={val => handleAddSiswa(val)}
                   placeholder="Ketik NIS atau Nama Siswa..."
                 />
                
                {form.siswa_nis.length > 0 && (
                  <div className="mt-3 bg-slate-50 border-none rounded-[var(--ui-radius-small)] p-3 flex flex-wrap gap-2">
                    {form.siswa_nis.map(nis => {
                      const student = students.find(s => s.nis === nis);
                      return (
                        <div key={nis} className="bg-white border-none rounded-[var(--ui-radius-small)] px-2.5 py-1.5 text-xs font-bold text-slate-700 flex items-center gap-2 shadow-sm">
                          <span>{student ? (student.namaSiswa || student.name) : nis}</span>
                          <Button variant="outline" type="button" onClick={() =>handleRemoveSiswa(nis)} className="cursor-pointer border-none bg-transparent"><X size={12}/></Button>
                        </div>
                      )
                    })}
                  </div>
                )}
             </div>
             
             {["Sakit","Izin"].includes(form.status) && (
               <div>
                 <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Upload Surat / Bukti (Gambar)</label>
                 <label className="flex items-center justify-center w-full px-3 py-4 border-2 border-dashed border-slate-300 rounded-[var(--ui-radius-small)] cursor-pointer hover:border-[var(--ui-primary)] hover:bg-slate-50 transition-all">
                   <div className="flex flex-col items-center gap-1">
                     <UploadCloud size={24} className="text-slate-400" />
                     <span className="text-xs font-bold text-slate-600">{form.fileName ? `${form.fileName} (${form.fileSizeKB} KB)` :'Pilih foto/dokumen surat...'}</span>
                   </div>
                   <input type="file" className="hidden" accept="image/*" onChange={(e) => {
                     const file = e.target.files[0];
                     if (file) {
                       compressImage(file, (dataUrl, sizeKB) => {
                         setForm(prev => ({ ...prev, fileData: dataUrl, fileName: file.name, fileSizeKB: sizeKB }));
                       });
                     }
                   }} />
                 </label>
               </div>
             )}

             <div>
               <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Keterangan (Opsional)</label>
               <textarea rows="2" value={form.keterangan} onChange={e=>setForm({...form, keterangan: e.target.value})} className="w-full px-3 py-2 bg-slate-50 border-none rounded-[var(--ui-radius-small)] text-sm font-medium focus:outline-none focus:border-[var(--ui-primary)] resize-none" placeholder="Lampiran surat, nama wali, dll..."></textarea>
             </div>
             <div className="pt-4 flex justify-end gap-3 shrink-0 border-t border-slate-100 mt-2">
               <Button variant="outline" type="button" onClick={() => setShowFormModal(false)}>Batal</Button>
               <Button type="submit">Simpan Data</Button>
             </div>
          </form>
        </Modal>
      )}
      
      {editForm && (
        <Modal isOpen={!!editForm} onClose={() => setEditForm(null)} title="Edit / Update Status Absensi" maxWidth="max-w-lg">
          <form onSubmit={handleUpdate} className="space-y-4">
            <div className="bg-slate-50 p-3 rounded-[var(--ui-radius-small)] border-none mb-4">
              <p className="text-xs font-bold text-slate-500 uppercase">Siswa</p>
              <p className="font-bold text-slate-800 text-sm mt-1">{students.find(s => s.nis === editForm.siswa_nis)?.namaSiswa || students.find(s => s.nis === editForm.siswa_nis)?.name || editForm.siswa_nis}</p>
              <p className="text-xs text-slate-500">{new Date(editForm.tanggal).toLocaleDateString('id-ID')}</p>
            </div>
            <div className="grid grid-cols-1 gap-4">
               <div>
                 <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Ubah Status</label>
                 <UISelect value={editForm.status} onChange={e=>setEditForm({...editForm, status: e.target.value})} className="w-full px-3 py-2 bg-slate-50 border-none rounded-[var(--ui-radius-small)] text-sm font-semibold focus:outline-none focus:border-[var(--ui-primary)]">
                   <option value="Sakit">Sakit</option>
                   <option value="Izin">Izin</option>
                   <option value="Alpa">Alpa</option>
                 </UISelect>
               </div>
               
               {["Sakit","Izin"].includes(editForm.status) && (
                 <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Upload Surat (Otomatis ke GDrive)</label>
                  <label className="flex items-center justify-center w-full px-3 py-4 border-2 border-dashed border-slate-300 rounded-[var(--ui-radius-small)] cursor-pointer hover:border-[var(--ui-primary)] hover:bg-slate-50 transition-all">
                    <div className="flex flex-col items-center gap-1">
                      <UploadCloud size={24} className="text-slate-400" />
                      <span className="text-xs font-bold text-slate-600">{editForm.fileName ? `${editForm.fileName} (${editForm.fileSizeKB ? editForm.fileSizeKB +' KB' :''})` :'Pilih foto/dokumen surat...'}</span>
                    </div>
                    <input type="file" className="hidden" accept="image/*" onChange={(e) => {
                      const file = e.target.files[0];
                      if (file) {
                        compressImage(file, (dataUrl, sizeKB) => {
                          setEditForm(prev => ({ ...prev, surat_base64: dataUrl, fileName: file.name, fileSizeKB: sizeKB }));
                        });
                      }
                    }} />
                  </label>
                 </div>
               )}

               <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Keterangan Tambahan</label>
                <textarea rows="2" value={editForm.keterangan} onChange={e=>setEditForm({...editForm, keterangan: e.target.value})} className="w-full px-3 py-2 bg-slate-50 border-none rounded-[var(--ui-radius-small)] text-sm font-medium focus:outline-none focus:border-[var(--ui-primary)] resize-none" placeholder="Alasan update..."></textarea>
               </div>
            </div>
            <div className="pt-4 flex justify-end gap-3 shrink-0 border-t border-slate-100 mt-2">
              <Button variant="outline" type="button" onClick={() => setEditForm(null)}>Batal</Button>
              <Button type="submit" disabled={isUploading}>{isUploading ?'Mengupload ke GDrive...' :'Update & Simpan'}</Button>
            </div>
          </form>
        </Modal>
      )}

      {toast && (
        <div className="fixed bottom-6 right-6 bg-emerald-600 text-white px-4 py-3 rounded-[var(--ui-radius-small)] shadow-sm font-medium text-sm flex items-center gap-2 animate-in slide-in-from-bottom-5">
           <CheckCircle2 size={18} /> {toast.message}
        </div>
      )}
    </div>
  );
}
