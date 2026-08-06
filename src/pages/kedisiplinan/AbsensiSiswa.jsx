import { useState, useEffect, useMemo, useCallback } from 'react';
import useAuthStore from '../../store/monitoring/authStore.js';
import * as XLSX from 'xlsx';
import { getAttendanceStatusTone } from '../../utils/adminHelpers.js';
import { Search, Download, Plus, CheckCircle2, Edit2, Trash2, X, UploadCloud, Eye, FileText, ExternalLink } from 'lucide-react';
import { CustomSelect } from '../../components/CustomSelect.jsx';
import { UISelect, Modal, Button } from '../../components/ui.jsx';


export default function AbsensiSiswa({ classes = [], students = [], hideTabs = false }) {
  const user = useAuthStore(state => state.user);
  const userRole = user?.role;
  const userDivision = (user?.division || "").toLowerCase();
  const authToken = user?.authToken;

  const [items, setItems] = useState([]);
  const [search, setSearch] = useState("");
  const [filterKelas, setFilterKelas] = useState(() => {
    if (user?.role === "guru" && user?.isWalas && user?.walasClass) {
      return user.walasClass;
    }
    return "all";
  });
  const [filterTanggal, setFilterTanggal] = useState("");

  const hasApprovalPermission = 
    ["admin", "superadmin", "tu", "tata_usaha", "kesiswaan"].includes(userRole) ||
    (userRole === "waka" && userDivision === "kesiswaan");

  const [isLoading, setIsLoading] = useState(false);
  const [previewItem, setPreviewItem] = useState(null);
  
  const handleApproveReject = async (id, action) => {
    try {
      const res = await fetch("/api/kedisiplinan/absensi", {
        method: "POST",
        headers: { "Authorization": `Bearer ${authToken}`, "Content-Type": "application/json"
        },
        body: JSON.stringify({ action, id })
      });
      const data = await res.json();
      if (data.ok) {
        showToast(action === 'approve' ? "Pengajuan disetujui" : "Pengajuan ditolak", "success");
        fetchData();
      } else {
        showToast(data.error || "Gagal mengubah status persetujuan.", "error");
      }
    } catch {
      showToast("Gagal menghubungi server.", "error");
    }
  };

  const [showFormModal, setShowFormModal] = useState(false);
  const [form, setForm] = useState({ siswa_nis: [], tanggal: new Date().toISOString().split('T')[0], status: 'Sakit', keterangan: '', fileData: null, fileName: null, fileSizeKB: null });
  const [editForm, setEditForm] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [toast, setToast] = useState(null);

  // Auto-resize image down to max 800x800px with 0.6 quality for compact file size (~30-80 KB)
  const compressImage = (file, callback) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        let width = img.width;
        let height = img.height;
        const MAX_WIDTH = 800;
        const MAX_HEIGHT = 800;

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

        canvas.width = Math.round(width);
        canvas.height = Math.round(height);

        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

        const dataUrl = canvas.toDataURL("image/jpeg", 0.6);
        const stringLength = dataUrl.length - 'data:image/jpeg;base64,'.length;
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

  const baseSuratItems = useMemo(() => {
    return items.filter(item => {
      // Exclude automatic machine attendance logs (Mesin Hikvision) from Surat Izin/Sakit management
      if (
        item.pelapor_nama === "Mesin Hikvision" || 
        item.source === "hikvision" || 
        item.is_machine || 
        String(item.keterangan || '').startsWith("Mesin:")
      ) {
        return false;
      }

      const student = students.find(s => {
        const sNis = String(s.nis || s.code || '').trim();
        const iNis = String(item.siswa_nis || '').trim();
        if (!sNis || !iNis) return false;
        return sNis === iNis || (sNis.length >= 5 && iNis.length >= 5 && (sNis.endsWith(iNis) || iNis.endsWith(sNis)));
      });
      const studentName = student ? (student.namaSiswa || student.name) : item.siswa_nis;
      const studentClass = student ? (student.class_name || student.kelas || "") : "";
      
      const itemDateStr = getItemDateStr(item.tanggal);
      const mSearch = search === "" || studentName.toLowerCase().includes(search.toLowerCase()) || String(item.siswa_nis).includes(search);
      const mKelas = filterKelas === "all" || studentClass === filterKelas;
      const mTanggal = filterTanggal === "" || itemDateStr === filterTanggal;

      return mSearch && mKelas && mTanggal;
    });
  }, [items, search, filterKelas, filterTanggal, students, getItemDateStr]);

  const filteredItems = useMemo(() => {
    if (filterStatus === "all") return baseSuratItems;
    if (filterStatus === "pending") return baseSuratItems.filter(i => i.approval_status === "pending");
    return baseSuratItems.filter(i => i.status === filterStatus);
  }, [baseSuratItems, filterStatus]);

  const statusCounts = useMemo(() => {
    return {
      all: baseSuratItems.length,
      pending: baseSuratItems.filter(i => i.approval_status === "pending").length,
      Sakit: baseSuratItems.filter(i => i.status === "Sakit").length,
      Izin: baseSuratItems.filter(i => i.status === "Izin").length,
      Alpha: baseSuratItems.filter(i => i.status === "Alpha").length,
      Terlambat: baseSuratItems.filter(i => i.status === "Terlambat").length,
    };
  }, [baseSuratItems]);

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
            return keyStr === itemNis || (keyStr.length >= 5 && itemNis.length >= 5 && (keyStr.endsWith(itemNis) || itemNis.endsWith(keyStr)));
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

      {activeTab === 'surat_izin' && (
      <div className="flex flex-col space-y-4">
        {/* Quick Filter Status Pills */}
        <div className="p-3 bg-slate-50/80 border border-slate-200/80 rounded-[var(--ui-radius-card)] flex flex-wrap items-center gap-2 shadow-xs">
          {[
            { id: "all", label: "Semua Record", count: statusCounts.all, activeBg: "bg-emerald-600 text-white" },
            { id: "pending", label: "Pending Persetujuan", count: statusCounts.pending, activeBg: "bg-amber-500 text-white" },
            { id: "Sakit", label: "Sakit", count: statusCounts.Sakit, activeBg: "bg-amber-600 text-white" },
            { id: "Izin", label: "Izin", count: statusCounts.Izin, activeBg: "bg-blue-600 text-white" },
            { id: "Alpha", label: "Alpha", count: statusCounts.Alpha, activeBg: "bg-rose-600 text-white" },
            { id: "Terlambat", label: "Terlambat", count: statusCounts.Terlambat, activeBg: "bg-purple-600 text-white" },
          ].map(tab => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setFilterStatus(tab.id)}
              className={`px-3.5 py-2 rounded-[var(--ui-radius-small)] text-xs font-extrabold transition-all cursor-pointer border flex items-center gap-2 active:scale-95 ${
                filterStatus === tab.id
                  ? `${tab.activeBg} border-transparent shadow-xs`
                  : "bg-white text-slate-700 border-slate-200/80 hover:bg-slate-100/70"
              }`}
            >
              <span>{tab.label}</span>
              <span className={`text-[10px] font-black px-2 py-0.5 rounded-[var(--ui-radius-small)] ${
                filterStatus === tab.id ? "bg-white/20 text-white" : "bg-slate-100 text-slate-600"
              }`}>
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        {/* Filter Controls & Action Bar */}
        <div className="p-4 bg-white border border-slate-200/80 rounded-[var(--ui-radius-card)] shadow-xs flex flex-col md:flex-row gap-3 justify-between items-start md:items-center">
          <div className="flex flex-col md:flex-row items-stretch md:items-center gap-2.5 w-full">
            <div className="relative flex-1 min-w-[220px] w-full">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input
                type="text"
                placeholder="Cari siswa atau NIS..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-[var(--ui-radius-small)] text-xs font-semibold text-slate-800 focus:outline-none focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-500/10 transition-all"
              />
            </div>
            <div className="w-full md:w-[160px]">
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
                onChange={e => setFilterTanggal(e.target.value)}
                className="flex-1 md:flex-none px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-[var(--ui-radius-small)] text-xs font-semibold text-slate-800 focus:outline-none focus:border-emerald-500 focus:bg-white transition-all"
              />
              {filterTanggal !== "" && (
                 <Button variant="ghost" size="sm" onClick={() => setFilterTanggal("")} className="shrink-0 text-xs rounded-[var(--ui-radius-small)]">Clear</Button>
              )}
            </div>
          </div>

          <div className="flex flex-wrap gap-2 w-full md:w-auto shrink-0 justify-start md:justify-end">
            <button 
              type="button"
              onClick={exportExcel} 
              className="px-3.5 py-2 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 font-bold text-xs rounded-[var(--ui-radius-small)] shadow-2xs flex items-center gap-2 active:scale-95 transition-all cursor-pointer"
            >
              <Download size={14} /> <span>Export</span>
            </button>
            <button 
              type="button"
              onClick={openAdd} 
              className="px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-extrabold text-xs rounded-[var(--ui-radius-small)] shadow-sm shadow-emerald-600/20 flex items-center gap-2 active:scale-95 transition-all cursor-pointer"
            >
              <Plus size={15} /> <span>Input Absensi</span>
            </button>
          </div>
        </div>

        {/* 💻 Desktop Table View (Hidden on Mobile) */}
        <div className="hidden md:block overflow-hidden border border-slate-200/80 rounded-[var(--ui-radius-card)] bg-white shadow-xs">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/90 border-b border-slate-200 text-[10px] font-black uppercase tracking-wider text-slate-500">
                <th className="px-4 py-3.5 text-center w-12">No</th>
                <th className="px-4 py-3.5">Tanggal</th>
                <th className="px-5 py-3.5">Siswa &amp; Kelas</th>
                <th className="px-4 py-3.5 text-center">Status</th>
                <th className="px-5 py-3.5">Keterangan &amp; Surat</th>
                <th className="px-4 py-3.5">Petugas Input</th>
                <th className="px-4 py-3.5 text-center">Persetujuan</th>
                <th className="px-4 py-3.5 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="text-xs font-medium text-slate-700 divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan="8" className="px-6 py-12 text-center text-slate-400 font-bold">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <div className="w-6 h-6 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" />
                      <span>Memuat data absensi...</span>
                    </div>
                  </td>
                </tr>
              ) : paginatedSuratItems.length === 0 ? (
                <tr>
                  <td colSpan="8" className="px-6 py-12 text-center text-slate-400 font-medium">
                    <div className="flex flex-col items-center justify-center gap-2 max-w-sm mx-auto">
                      <CheckCircle2 size={36} className="text-emerald-500 opacity-60" />
                      <span className="font-extrabold text-slate-700 text-sm">Tidak ada data surat izin / sakit</span>
                      <span className="text-xs text-slate-400 text-center">Belum ada pengajuan izin/sakit pada filter ini.</span>
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedSuratItems.map((item, idx) => {
                  const student = students.find(s => s.nis === item.siswa_nis);
                  const hasAttachment = item.gdrive_url || item.surat_url || item.fileData || item.surat_base64 || item.surat_path;
                  return (
                  <tr key={item.id} className="hover:bg-slate-50/80 transition-colors group">
                    <td className="px-4 py-3.5 font-bold text-slate-400 text-center">
                      {(currentPageSurat - 1) * itemsPerPageSurat + idx + 1}
                    </td>
                    <td className="px-4 py-3.5 font-extrabold text-slate-800 whitespace-nowrap">
                      {new Date(item.tanggal).toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric', month: 'short' })}
                    </td>
                    <td className="px-5 py-3.5">
                       <p className="font-extrabold text-slate-900">{student ? (student.namaSiswa || student.name) : item.siswa_nis}</p>
                       <p className="text-[10px] font-bold text-slate-500 mt-0.5">{student ? (student.class_name || student.kelas || '-') : '-'}</p>
                    </td>
                    <td className="px-4 py-3.5 text-center">
                      <span className={`inline-flex px-3 py-1 rounded-[var(--ui-radius-pill)] text-[10px] font-black uppercase tracking-wider border shadow-2xs ${
                        item.status === 'Sakit' ? 'bg-amber-50 text-amber-800 border-amber-200' :
                        item.status === 'Izin' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                        item.status === 'Alpha' || item.status === 'Alpa' ? 'bg-rose-50 text-rose-700 border-rose-200' :
                        'bg-slate-100 text-slate-700 border-slate-200'
                      }`}>
                        {item.status}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                       <div className="flex flex-col gap-1.5 items-start">
                         <span className="text-slate-700 font-semibold">{item.keterangan || <span className="text-slate-400 italic">Tanpa keterangan</span>}</span>
                         <button 
                           type="button" 
                           onClick={() => setPreviewItem(item)} 
                           className={`text-xs px-3 py-1.5 rounded-[var(--ui-radius-small)] font-extrabold flex items-center gap-1.5 active:scale-95 transition-all cursor-pointer shadow-2xs ${
                             hasAttachment 
                               ? 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-blue-900/10' 
                               : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200/80'
                           }`}
                         >
                           <Eye size={13} />
                           <span>{hasAttachment ? 'Lihat Surat' : 'Preview / Upload'}</span>
                         </button>
                       </div>
                    </td>
                    <td className="px-4 py-3.5 text-xs font-semibold text-slate-600">
                       {item.pelapor_nama || '-'}
                    </td>
                    <td className="px-4 py-3.5 text-center">
                       {item.approval_status === "approved" ? (
                          <span className="px-2.5 py-1 rounded-[var(--ui-radius-pill)] bg-emerald-100 text-emerald-800 border border-emerald-200 text-[10px] font-black uppercase tracking-wider inline-block">
                            DISETUJUI
                            {item.approved_by_name && (
                              <span className="text-[8px] font-bold text-emerald-700 block lowercase">oleh {item.approved_by_name}</span>
                            )}
                          </span>
                       ) : item.approval_status === "rejected" ? (
                          <span className="px-2.5 py-1 rounded-[var(--ui-radius-pill)] bg-rose-100 text-rose-800 border border-rose-200 text-[10px] font-black uppercase tracking-wider inline-block">
                            DITOLAK
                          </span>
                       ) : item.approval_status === "otomatis" ? (
                          <span className="px-2.5 py-1 rounded-[var(--ui-radius-pill)] bg-slate-100 text-slate-700 border border-slate-200 text-[10px] font-black uppercase tracking-wider inline-block">
                            OTOMATIS
                          </span>
                       ) : (
                          <div className="flex flex-col items-center gap-1.5">
                            <span className="px-2.5 py-0.5 rounded-[var(--ui-radius-pill)] bg-amber-100 text-amber-800 border border-amber-200 text-[10px] font-black uppercase tracking-wider">
                              PENDING
                            </span>
                            {hasApprovalPermission && (
                              <div className="flex items-center gap-1.5 mt-0.5">
                                <button 
                                  type="button"
                                  onClick={() => handleApproveReject(item.id, 'approve')}
                                  className="px-2.5 py-1 rounded-[var(--ui-radius-small)] bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-[10px] shadow-2xs active:scale-95 transition-all cursor-pointer"
                                >
                                  Setujui
                                </button>
                                <button 
                                  type="button"
                                  onClick={() => handleApproveReject(item.id, 'reject')}
                                  className="px-2.5 py-1 rounded-[var(--ui-radius-small)] bg-rose-50 hover:bg-rose-600 text-rose-600 hover:text-white border border-rose-200 font-extrabold text-[10px] active:scale-95 transition-all cursor-pointer"
                                >
                                  Tolak
                                </button>
                              </div>
                            )}
                          </div>
                       )}
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      {(hasApprovalPermission || item.approval_status === "pending") && (
                        <div className="flex items-center justify-end gap-1.5">
                          <button 
                            type="button"
                            onClick={() => handleEdit(item)} 
                            className="w-8 h-8 rounded-[var(--ui-radius-small)] bg-slate-100 hover:bg-emerald-50 text-slate-600 hover:text-emerald-700 border border-slate-200/60 flex items-center justify-center active:scale-95 transition-all cursor-pointer" 
                            title="Edit Data"
                          >
                            <Edit2 size={13} />
                          </button>
                          <button 
                            type="button"
                            onClick={() => handleDelete(item.id)} 
                            className="w-8 h-8 rounded-[var(--ui-radius-small)] bg-slate-100 hover:bg-rose-50 text-slate-600 hover:text-rose-700 border border-slate-200/60 flex items-center justify-center active:scale-95 transition-all cursor-pointer" 
                            title="Hapus Data"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                )})
              )}
            </tbody>
          </table>
        </div>

        {/* 📱 Mobile Card View (Shown on Mobile Screens) */}
        <div className="md:hidden space-y-3">
          {isLoading ? (
            <div className="py-10 text-center text-slate-400 font-bold flex flex-col items-center gap-2">
              <div className="w-6 h-6 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" />
              <span>Memuat data absensi...</span>
            </div>
          ) : paginatedSuratItems.length === 0 ? (
            <div className="py-10 text-center text-slate-400 p-4 border border-dashed border-slate-200 rounded-[var(--ui-radius-card)]">
              <CheckCircle2 size={32} className="text-emerald-500 opacity-60 mx-auto mb-2" />
              <div className="font-extrabold text-slate-700 text-xs">Tidak ada data surat izin / sakit</div>
            </div>
          ) : (
            paginatedSuratItems.map(item => {
              const student = students.find(s => s.nis === item.siswa_nis);
              const hasAttachment = item.gdrive_url || item.surat_url || item.fileData || item.surat_base64 || item.surat_path;
              return (
                <div key={item.id} className="p-4 bg-white border border-slate-200/80 rounded-[var(--ui-radius-card)] space-y-3 shadow-xs">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="font-extrabold text-slate-900 text-sm">
                        {student ? (student.namaSiswa || student.name) : item.siswa_nis}
                      </div>
                      <div className="text-[10px] text-slate-500 font-semibold mt-0.5">
                        Kelas: {student ? (student.class_name || student.kelas || '-') : '-'} • Tgl: {new Date(item.tanggal).toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric', month: 'short' })}
                      </div>
                    </div>
                    <span className={`inline-flex px-2.5 py-0.5 rounded-[var(--ui-radius-pill)] text-[10px] font-black uppercase border shrink-0 ${
                      item.status === 'Sakit' ? 'bg-amber-50 text-amber-800 border-amber-200' :
                      item.status === 'Izin' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                      item.status === 'Alpha' || item.status === 'Alpa' ? 'bg-rose-50 text-rose-700 border-rose-200' : 'bg-slate-100 text-slate-700 border-slate-200'
                    }`}>
                      {item.status}
                    </span>
                  </div>

                  <div className="text-xs text-slate-700 bg-slate-50 p-2.5 rounded-[var(--ui-radius-small)] border border-slate-200/60 font-medium">
                    <span className="font-bold text-slate-400 text-[10px] uppercase block mb-0.5">Ket / Alasan:</span>
                    {item.keterangan || 'Tanpa keterangan'}
                  </div>

                  <div className="flex items-center justify-between pt-1 border-t border-slate-100 gap-2">
                    <button 
                      type="button" 
                      onClick={() => setPreviewItem(item)} 
                      className={`text-xs px-3 py-1.5 rounded-[var(--ui-radius-small)] font-extrabold flex items-center gap-1.5 active:scale-95 transition-all cursor-pointer shadow-2xs ${
                        hasAttachment 
                          ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white' 
                          : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      }`}
                    >
                      <Eye size={13} />
                      <span>{hasAttachment ? 'Lihat Surat' : 'Preview / Upload'}</span>
                    </button>

                    {item.approval_status === "pending" && hasApprovalPermission && (
                      <div className="flex items-center gap-1.5">
                        <button 
                          type="button"
                          onClick={() => handleApproveReject(item.id, 'approve')}
                          className="px-2.5 py-1 rounded-[var(--ui-radius-small)] bg-emerald-600 text-white font-bold text-[10px]"
                        >
                          Setujui
                        </button>
                        <button 
                          type="button"
                          onClick={() => handleApproveReject(item.id, 'reject')}
                          className="px-2.5 py-1 rounded-[var(--ui-radius-small)] bg-rose-50 text-rose-600 border border-rose-200 font-bold text-[10px]"
                        >
                          Tolak
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Pagination Bar */}
        <div className="flex flex-col sm:flex-row justify-between items-center p-4 border-t border-slate-200/80 gap-4 bg-white rounded-[var(--ui-radius-card)] shadow-xs">
          <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 text-xs text-slate-500 font-bold text-center">
            <span>Tampilkan</span>
            <UISelect 
              value={itemsPerPageSurat} 
              onChange={e => { setItemsPerPageSurat(Number(e.target.value)); setCurrentPageSurat(1); }}
              className="px-2 py-1 bg-slate-50 border border-slate-200 rounded-[var(--ui-radius-small)] text-slate-700 text-xs font-bold focus:outline-none focus:border-emerald-500"
            >
              <option value={20}>20</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </UISelect>
            <span>data dari {filteredItems.length}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Button 
              variant="outline" size="sm"
              onClick={() => setCurrentPageSurat(p => Math.max(1, p - 1))}
              disabled={currentPageSurat === 1}
              className="text-xs font-bold rounded-[var(--ui-radius-small)]"
            >
              Prev
            </Button>
            <span className="px-3 py-1 bg-slate-50 border border-slate-200 rounded-[var(--ui-radius-small)] text-xs text-slate-800 font-black">
              {currentPageSurat} / {totalPagesSurat || 1}
            </span>
            <Button 
              variant="outline" size="sm"
              onClick={() => setCurrentPageSurat(p => Math.min(totalPagesSurat, p + 1))}
              disabled={currentPageSurat === totalPagesSurat || totalPagesSurat === 0}
              className="text-xs font-bold rounded-[var(--ui-radius-small)]"
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

      {previewItem && (
        <Modal isOpen={!!previewItem} onClose={() => setPreviewItem(null)} title="Preview Surat / Bukti Absensi" maxWidth="max-w-xl">
          <div className="space-y-4 p-1">
            {/* Header Info */}
            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl flex items-center justify-between">
              <div>
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Siswa &amp; Tanggal</div>
                <div className="font-extrabold text-slate-900 text-sm mt-0.5">
                  {students.find(s => s.nis === previewItem.siswa_nis)?.namaSiswa || students.find(s => s.nis === previewItem.siswa_nis)?.name || previewItem.siswa_nis}
                </div>
                <div className="text-xs font-semibold text-slate-500 mt-0.5">
                  Tanggal: {new Date(previewItem.tanggal).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                </div>
              </div>
              <span className={`px-3 py-1 rounded-xl font-black text-xs uppercase border ${getAttendanceStatusTone(previewItem.status)}`}>
                {previewItem.status}
              </span>
            </div>

            {/* Document Content View */}
            <div className="bg-slate-900/90 rounded-2xl p-4 min-h-[250px] flex flex-col items-center justify-center relative overflow-hidden border border-slate-700">
              {previewItem.gdrive_url ? (
                <div className="w-full flex flex-col items-center gap-3 text-white py-6">
                  <FileText className="w-16 h-16 text-blue-400 animate-pulse" />
                  <p className="text-xs font-semibold text-slate-300">Dokumen tersimpan di Google Drive</p>
                  <a 
                    href={previewItem.gdrive_url} 
                    target="_blank" 
                    rel="noreferrer" 
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-extrabold text-xs rounded-xl shadow-lg flex items-center gap-2 transition-all"
                  >
                    <ExternalLink size={14} /> Buka Surat di Google Drive
                  </a>
                </div>
              ) : (previewItem.fileData || previewItem.surat_base64 || previewItem.surat_url || previewItem.surat_path) ? (
                <div className="flex flex-col items-center gap-2 w-full">
                  <img 
                    src={previewItem.fileData || previewItem.surat_base64 || previewItem.surat_url || previewItem.surat_path} 
                    alt="Surat Bukti Absensi" 
                    className="max-h-[380px] w-auto max-w-full object-contain rounded-xl shadow-md border border-slate-700" 
                  />
                </div>
              ) : (
                <div className="text-center py-8 text-slate-400 space-y-3">
                  <FileText className="w-12 h-12 mx-auto text-slate-600" />
                  <div>
                    <p className="font-bold text-sm text-slate-300">Belum Ada Foto / Dokumen Surat</p>
                    <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto">Anda dapat mengunggah foto surat sakit/izin untuk melengkapi data absensi ini.</p>
                  </div>
                  <button 
                    type="button" 
                    onClick={() => {
                      const itemToEdit = previewItem;
                      setPreviewItem(null);
                      handleEdit(itemToEdit);
                    }} 
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-md inline-flex items-center gap-2 transition-all cursor-pointer"
                  >
                    <UploadCloud size={14} /> Upload Surat Sekarang
                  </button>
                </div>
              )}
            </div>

            {/* Keterangan */}
            {previewItem.keterangan && (
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700">
                <span className="font-bold text-slate-400 text-[10px] uppercase block mb-0.5">Catatan Keterangan:</span>
                {previewItem.keterangan}
              </div>
            )}

            {/* Footer */}
            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <Button variant="outline" onClick={() => setPreviewItem(null)}>Tutup</Button>
            </div>
          </div>
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
