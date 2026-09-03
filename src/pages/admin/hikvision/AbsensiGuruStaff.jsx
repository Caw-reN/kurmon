import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Calendar, 
  Plus, 
  Search, 
  FileText, 
  Eye, 
  Trash2, 
  Edit2,
  UploadCloud, 
  X, 
  AlertTriangle,
  User,
  Users,
  Briefcase,
  Download,
  Check,
  RefreshCw,
  ExternalLink,
  ShieldCheck,
  CheckCheck
} from 'lucide-react';
import useAuthStore from '../../../store/monitoring/authStore.js';
import { useDataStore } from '../../../store/useDataStore';
import { Button, TablePagination } from '../../../components/ui.jsx';
import { CustomSelect } from '../../../components/CustomSelect.jsx';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';

export default function AbsensiGuruStaff({ personType = 'guru' }) {
  const currentUser = useAuthStore(state => state.user) || {};
  const teachers = useDataStore(state => state.teachers) || [];
  const staffs = useDataStore(state => state.staffs) || [];

  const userRole = String(currentUser?.role || '').toLowerCase().trim();
  const userSubrole = String(currentUser?.subrole || '').toLowerCase().trim();
  const userDivision = String(currentUser?.division || '').toLowerCase().trim();
  const userJabatan = String(currentUser?.jabatan || '').toLowerCase().trim();

  const isSuperAdmin = ['admin', 'superadmin', 'super_admin', 'kepsek'].includes(userRole) || currentUser?.username === 'admin';

  // Wewenang persetujuan (ACC):
  // Guru -> Wewenang Bagian Kurikulum
  const canApproveGuru = isSuperAdmin || 
    userRole.includes('kurikulum') || 
    userSubrole.includes('kurikulum') || 
    userDivision.includes('kurikulum') || 
    userJabatan.includes('kurikulum') ||
    (userRole === 'waka' && (userDivision.includes('kurikulum') || !userDivision));

  // Karyawan -> Wewenang Bagian Tata Usaha (TU)
  const canApproveKaryawan = isSuperAdmin || 
    ['tu', 'tata_usaha', 'tata usaha', 'kepala_tu', 'staf_tu'].includes(userRole) || 
    userSubrole.includes('tu') || userSubrole.includes('tata_usaha') || userSubrole.includes('tata usaha') ||
    userDivision.includes('tu') || userDivision.includes('tata_usaha') || userDivision.includes('tata usaha') ||
    userJabatan.includes('tu') || userJabatan.includes('tata_usaha') || userJabatan.includes('tata usaha');

  const canApproveItem = (item) => {
    const isKaryawan = item.person_type === 'karyawan';
    return isKaryawan ? canApproveKaryawan : canApproveGuru;
  };

  const getApproverRoleName = (itemOrType) => {
    const pType = typeof itemOrType === 'string' ? itemOrType : itemOrType?.person_type;
    return pType === 'karyawan' ? 'Tata Usaha' : 'Kurikulum';
  };

  // Filters
  const [activePersonType, setActivePersonType] = useState(personType);
  const [filterStatus, setFilterStatus] = useState('all'); // all | pending | Izin | Sakit | Dinas Luar | Cuti | Alpa | rejected
  const [search, setSearch] = useState('');
  const [filterTanggal, setFilterTanggal] = useState('');
  const [filterMonth, setFilterMonth] = useState(() => new Date().getMonth() + 1);
  const [filterYear, setFilterYear] = useState(() => new Date().getFullYear());
  
  // Data state
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [toastMsg, setToastMsg] = useState(null);

  // Modals
  const [showInputModal, setShowInputModal] = useState(false);
  const [previewItem, setPreviewItem] = useState(null);
  const [editItem, setEditItem] = useState(null);

  // Form Input State
  const [formPersonType, setFormPersonType] = useState(personType === 'karyawan' ? 'karyawan' : 'guru');
  const [selectedPersonCode, setSelectedPersonCode] = useState('');
  const [personSearchQuery, setPersonSearchQuery] = useState('');
  const [formStatus, setFormStatus] = useState('Izin');
  const [formDateMode, setFormDateMode] = useState('single'); // 'single' | 'range'
  const [formStartDate, setFormStartDate] = useState(() => new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Jakarta' }));
  const [formEndDate, setFormEndDate] = useState(() => new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Jakarta' }));
  const [formNote, setFormNote] = useState('');
  const [formFileData, setFormFileData] = useState('');
  const [formFileName, setFormFileName] = useState('');
  const [formError, setFormError] = useState('');

  // Edit State
  const [editStatus, setEditStatus] = useState('Izin');
  const [editNote, setEditNote] = useState('');
  const [editFileData, setEditFileData] = useState('');
  const [editFileName, setEditFileName] = useState('');

  const showToast = (msg, type = 'success') => {
    setToastMsg({ text: msg, type });
    setTimeout(() => setToastMsg(null), 3500);
  };

  const getAuthToken = () => {
    return currentUser?.authToken
      || JSON.parse(sessionStorage.getItem('school_schedule_session_v1') || '{}')?.authToken
      || JSON.parse(localStorage.getItem('school_schedule_session_v1') || '{}')?.authToken
      || localStorage.getItem('token')
      || sessionStorage.getItem('token')
      || '';
  };

  // Image compressor untuk upload ringan (~30-80 KB)
  const compressImage = (file, callback) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        let width = img.width;
        let height = img.height;
        const MAX_WIDTH = 700;
        const MAX_HEIGHT = 700;

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

        const dataUrl = canvas.toDataURL("image/jpeg", 0.55);
        callback(dataUrl);
      };
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);
  };

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const token = getAuthToken();
      let url = `/api/hikvision/guru-permits?person_type=${activePersonType}&month=${filterMonth}&year=${filterYear}`;
      if (search) url += `&search=${encodeURIComponent(search)}`;

      const res = await fetch(url, {
        headers: {
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        }
      });
      const json = await res.json();
      if (res.ok && json.ok) {
        setItems(json.data || []);
      } else {
        setItems([]);
      }
    } catch (err) {
      console.error('Gagal mengambil data perizinan:', err);
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [activePersonType, filterMonth, filterYear, search]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Filtering on client side (search & specific date)
  const filteredItems = useMemo(() => {
    return items.filter(item => {
      if (filterTanggal && String(item.tanggal).slice(0, 10) !== filterTanggal) {
        return false;
      }
      if (filterStatus === 'all') return true;
      if (filterStatus === 'pending') return item.approval_status === 'pending';
      if (filterStatus === 'rejected') return item.approval_status === 'rejected';
      return item.status === filterStatus;
    });
  }, [items, filterStatus, filterTanggal]);

  // Status Counts
  const counts = useMemo(() => {
    return {
      all: items.length,
      pending: items.filter(i => i.approval_status === 'pending').length,
      Izin: items.filter(i => i.status === 'Izin' && i.approval_status !== 'rejected').length,
      Sakit: items.filter(i => i.status === 'Sakit' && i.approval_status !== 'rejected').length,
      DinasLuar: items.filter(i => (i.status === 'Dinas Luar' || i.status === 'Dinas') && i.approval_status !== 'rejected').length,
      Cuti: items.filter(i => i.status === 'Cuti' && i.approval_status !== 'rejected').length,
      Alpa: items.filter(i => (i.status === 'Alpa' || i.status === 'Alpha') && i.approval_status !== 'rejected').length,
      rejected: items.filter(i => i.approval_status === 'rejected').length,
    };
  }, [items]);

  // Pagination State (Maksimal 20 data per halaman dengan tombol Next/Prev)
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);

  useEffect(() => {
    setCurrentPage(1);
  }, [search, filterTanggal, filterStatus, activePersonType, filterMonth, filterYear]);

  const totalPages = Math.ceil(filteredItems.length / itemsPerPage) || 1;
  const paginatedItems = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredItems.slice(start, start + itemsPerPage);
  }, [filteredItems, currentPage, itemsPerPage]);

  // Handle Approve / ACC
  const handleApprove = async (recordId) => {
    setActionLoading(true);
    try {
      const token = getAuthToken();
      const res = await fetch('/api/hikvision/guru-permits', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ action: 'approve', recordId })
      });
      const json = await res.json();
      if (res.ok && json.ok) {
        showToast(json.message || 'Surat izin/sakit berhasil disetujui (ACC).');
        fetchData();
      } else {
        showToast(json.error || 'Gagal menyetujui izin.', 'error');
      }
    } catch (err) {
      console.error(err);
      showToast('Terjadi kesalahan jaringan.', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // Handle Reject
  const handleReject = async (recordId) => {
    if (!window.confirm('Yakin ingin menolak surat izin/sakit ini?')) return;
    setActionLoading(true);
    try {
      const token = getAuthToken();
      const res = await fetch('/api/hikvision/guru-permits', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ action: 'reject', recordId })
      });
      const json = await res.json();
      if (res.ok && json.ok) {
        showToast(json.message || 'Surat izin/sakit telah ditolak.');
        fetchData();
      } else {
        showToast(json.error || 'Gagal menolak izin.', 'error');
      }
    } catch (err) {
      console.error(err);
      showToast('Terjadi kesalahan jaringan.', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // Handle Delete
  const handleDelete = async (recordId) => {
    if (!window.confirm('Hapus riwayat izin/sakit ini?')) return;
    setActionLoading(true);
    try {
      const token = getAuthToken();
      const res = await fetch('/api/hikvision/guru-permits', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ action: 'delete', recordId })
      });
      const json = await res.json();
      if (res.ok && json.ok) {
        showToast('Data izin/sakit berhasil dihapus.');
        fetchData();
      } else {
        showToast(json.error || 'Gagal menghapus data.', 'error');
      }
    } catch (err) {
      console.error(err);
      showToast('Terjadi kesalahan jaringan.', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // Form File Handler dengan kompresi otomatis
  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      alert('Ukuran file maksimal 5 MB');
      return;
    }
    setFormFileName(file.name);
    if (file.type.startsWith('image/')) {
      compressImage(file, (dataUrl) => {
        setFormFileData(dataUrl);
      });
    } else {
      const reader = new FileReader();
      reader.onload = () => setFormFileData(reader.result);
      reader.readAsDataURL(file);
    }
  };

  // Handle Form Submit (Input Baru)
  const handleSubmitInput = async (e) => {
    e.preventDefault();
    if (!selectedPersonCode) {
      setFormError('Pilih pegawai / pendidik yang bersangkutan.');
      return;
    }
    setFormError('');
    setActionLoading(true);

    try {
      const token = getAuthToken();
      const payload = {
        personType: formPersonType,
        teacherCode: selectedPersonCode,
        startDate: formStartDate,
        endDate: formDateMode === 'range' ? formEndDate : formStartDate,
        status: formStatus,
        note: formNote.trim(),
        fileData: formFileData || null
      };

      const res = await fetch('/api/hikvision/guru-permits', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify(payload)
      });

      const json = await res.json();
      if (res.ok && json.ok) {
        showToast(json.message || 'Surat izin/sakit berhasil disimpan.');
        setShowInputModal(false);
        // Reset form
        setSelectedPersonCode('');
        setPersonSearchQuery('');
        setFormNote('');
        setFormFileData('');
        setFormFileName('');
        fetchData();
      } else {
        setFormError(json.error || 'Gagal menyimpan data.');
      }
    } catch (err) {
      console.error(err);
      setFormError('Terjadi kesalahan jaringan.');
    } finally {
      setActionLoading(false);
    }
  };

  // Handle Edit Submit
  const handleEditOpen = (item) => {
    setEditItem(item);
    setEditStatus(item.status || 'Izin');
    setEditNote(item.note || '');
    setEditFileData(item.gdrive_url || '');
    setEditFileName('');
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!editItem) return;
    setActionLoading(true);

    try {
      const token = getAuthToken();
      const res = await fetch('/api/hikvision/guru-permits', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          action: 'update',
          recordId: editItem.record_id,
          status: editStatus,
          note: editNote.trim(),
          fileData: editFileData || null
        })
      });

      const json = await res.json();
      if (res.ok && json.ok) {
        showToast('Data izin/sakit berhasil diperbarui.');
        setEditItem(null);
        fetchData();
      } else {
        showToast(json.error || 'Gagal mengupdate data.', 'error');
      }
    } catch (err) {
      console.error(err);
      showToast('Terjadi kesalahan jaringan.', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // Export ke Excel
  const exportExcel = async () => {
    try {
      const workbook = new ExcelJS.Workbook();
      const sheetName = `Surat Izin ${activePersonType === 'karyawan' ? 'Karyawan' : 'Guru'}`;
      const worksheet = workbook.addWorksheet(sheetName);

      worksheet.columns = [
        { header: 'No', key: 'no', width: 6 },
        { header: 'Tanggal', key: 'tanggal', width: 14 },
        { header: 'Nama Pegawai', key: 'name', width: 28 },
        { header: 'NIP / Kode', key: 'nip', width: 18 },
        { header: 'Kategori', key: 'kategori', width: 14 },
        { header: 'Status Ketidakhadiran', key: 'status', width: 20 },
        { header: 'Alasan / Keterangan', key: 'note', width: 35 },
        { header: 'Status ACC', key: 'approval_status', width: 16 },
        { header: 'Disetujui / Ditolak Oleh', key: 'approved_by', width: 25 },
        { header: 'Lampiran Dokumen', key: 'has_file', width: 18 },
      ];

      // Header styling
      const headerRow = worksheet.getRow(1);
      headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      headerRow.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: activePersonType === 'karyawan' ? 'FF6B21A8' : 'FF047857' }
      };
      headerRow.alignment = { vertical: 'middle', horizontal: 'center' };
      headerRow.height = 24;

      filteredItems.forEach((item, idx) => {
        const row = worksheet.addRow({
          no: idx + 1,
          tanggal: item.tanggal,
          name: item.name || item.teacher_code,
          nip: item.nip || item.teacher_code,
          kategori: item.person_type === 'karyawan' ? 'Karyawan' : 'Guru',
          status: item.status,
          note: item.note || '-',
          approval_status: item.approval_status === 'approved' ? 'DISETUJUI' : item.approval_status === 'rejected' ? 'DITOLAK' : 'MENUNGGU',
          approved_by: item.approved_by_name || '-',
          has_file: item.gdrive_url ? 'Ada Lampiran' : 'Tidak Ada',
        });

        row.alignment = { vertical: 'middle' };
        row.getCell('no').alignment = { horizontal: 'center' };
        row.getCell('tanggal').alignment = { horizontal: 'center' };
        row.getCell('kategori').alignment = { horizontal: 'center' };
        row.getCell('status').alignment = { horizontal: 'center' };
        row.getCell('approval_status').alignment = { horizontal: 'center' };
      });

      const buffer = await workbook.xlsx.writeBuffer();
      const fileName = `Rekap_Surat_Izin_${activePersonType}_${filterYear}_${String(filterMonth).padStart(2, '0')}.xlsx`;
      saveAs(new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), fileName);
      showToast('File Excel berhasil diunduh.');
    } catch (err) {
      console.error(err);
      showToast('Gagal mengunduh Excel.', 'error');
    }
  };

  // List of people for the modal dropdown
  const availablePeople = useMemo(() => {
    const list = formPersonType === 'karyawan' ? staffs : teachers;
    if (!personSearchQuery.trim()) return list.slice(0, 60);
    const q = personSearchQuery.toLowerCase();
    return list.filter(p => {
      const name = String(p.name || p.nama || '').toLowerCase();
      const code = String(p.code || p.nip || p.id || '').toLowerCase();
      const div = String(p.division || p.type || '').toLowerCase();
      return name.includes(q) || code.includes(q) || div.includes(q);
    }).slice(0, 60);
  }, [formPersonType, teachers, staffs, personSearchQuery]);

  const selectedPersonObj = useMemo(() => {
    const list = formPersonType === 'karyawan' ? staffs : teachers;
    return list.find(p => String(p.code || p.nip || p.id) === selectedPersonCode);
  }, [formPersonType, teachers, staffs, selectedPersonCode]);

  const monthOptions = [
    { value: 'all', label: 'Semua Bulan' },
    { value: 1, label: 'Januari' }, { value: 2, label: 'Februari' },
    { value: 3, label: 'Maret' }, { value: 4, label: 'April' },
    { value: 5, label: 'Mei' }, { value: 6, label: 'Juni' },
    { value: 7, label: 'Juli' }, { value: 8, label: 'Agustus' },
    { value: 9, label: 'September' }, { value: 10, label: 'Oktober' },
    { value: 11, label: 'November' }, { value: 12, label: 'Desember' }
  ];

  const yearOptions = [
    { value: 'all', label: 'Semua Tahun' },
    { value: 2025, label: '2025' },
    { value: 2026, label: '2026' },
    { value: 2027, label: '2027' }
  ];

  const getStatusBadgeStyle = (status) => {
    switch (status) {
      case 'Sakit':
        return 'bg-rose-100 text-rose-800 border-rose-200';
      case 'Dinas Luar':
      case 'Dinas':
        return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'Cuti':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'Alpa':
      case 'Alpha':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-indigo-100 text-indigo-800 border-indigo-200';
    }
  };

  return (
    <div className="flex flex-col w-full gap-4 animate-in fade-in duration-300 relative z-10">
      
      {/* Toast Notification */}
      {toastMsg && (
        <div className={`fixed top-5 right-5 z-[200] px-4 py-3 rounded-[var(--ui-radius-small)] shadow-md border text-xs font-black flex items-center gap-2 animate-in slide-in-from-top-2 duration-200 ${
          toastMsg.type === 'error' ? 'bg-rose-50 border-rose-200 text-rose-700' : 'bg-emerald-50 border-emerald-200 text-emerald-800'
        }`}>
          {toastMsg.type === 'error' ? <AlertTriangle size={16} /> : <CheckCircle2 size={16} />}
          <span>{toastMsg.text}</span>
        </div>
      )}

      {/* Info Wewenang Persetujuan (Sleek Modern Header) */}
      <div className="bg-white border border-slate-200/80 rounded-[var(--ui-radius-card)] p-3.5 sm:px-4 shadow-2xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-[var(--ui-radius-small)] bg-emerald-50 text-emerald-600 border border-emerald-200/80 flex items-center justify-center shrink-0 shadow-2xs">
            <ShieldCheck size={20} strokeWidth={2.4} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="text-xs font-black text-slate-800 tracking-tight">Alur Verifikasi Surat Izin &amp; Sakit</h4>
              <span className="text-[9px] px-2 py-0.5 bg-emerald-600 text-white rounded-full font-extrabold uppercase tracking-wide">
                Resmi
              </span>
            </div>
            <p className="text-[11px] text-slate-500 font-medium leading-normal mt-0.5">
              Surat <strong>Guru</strong> diverifikasi oleh <strong>Bagian Kurikulum</strong> • Surat <strong>Karyawan</strong> diverifikasi oleh <strong>Bagian Tata Usaha (TU)</strong>
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
          <span className="text-[10px] font-bold text-slate-400">Hak Akses:</span>
          <span className={`text-[10.5px] font-black px-3 py-1 rounded-[var(--ui-radius-pill)] border shadow-2xs flex items-center gap-1.5 ${
            canApproveGuru && canApproveKaryawan
              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
              : canApproveGuru
              ? 'bg-blue-50 text-blue-700 border-blue-200'
              : canApproveKaryawan
              ? 'bg-purple-50 text-purple-700 border-purple-200'
              : 'bg-slate-50 text-slate-600 border-slate-200'
          }`}>
            <span className={`w-1.5 h-1.5 rounded-full ${
              canApproveGuru || canApproveKaryawan ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'
            }`} />
            {canApproveGuru && canApproveKaryawan
              ? 'Admin / Pimpinan (Semua Hak)'
              : canApproveGuru
              ? 'Penyetujui Kurikulum (Guru)'
              : canApproveKaryawan
              ? 'Penyetujui Tata Usaha (Karyawan)'
              : 'Pegawai (Pengaju Surat)'}
          </span>
        </div>
      </div>

      {/* 4 Rich KPI Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Card 1: Total Pengajuan */}
        <button
          type="button"
          onClick={() => setFilterStatus('all')}
          className={`bg-white border rounded-[var(--ui-radius-card)] p-4 text-left transition-all hover:shadow-sm hover:-translate-y-0.5 active:scale-[0.98] cursor-pointer flex flex-col justify-between ${
            filterStatus === 'all'
              ? 'border-emerald-500 ring-2 ring-emerald-500/20 shadow-xs'
              : 'border-slate-200/80 shadow-2xs hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between gap-2">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
              Total Pengajuan
            </span>
            <div className="w-8 h-8 rounded-[var(--ui-radius-small)] bg-emerald-50 text-emerald-600 border border-emerald-200/60 flex items-center justify-center shrink-0">
              <FileText size={16} />
            </div>
          </div>
          <div className="mt-2.5">
            <div className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight leading-none">
              {counts.all}
            </div>
            <p className="text-[11px] font-medium text-slate-500 mt-1">
              Semua permohonan izin/sakit
            </p>
          </div>
        </button>

        {/* Card 2: Menunggu ACC */}
        <button
          type="button"
          onClick={() => setFilterStatus('pending')}
          className={`bg-white border rounded-[var(--ui-radius-card)] p-4 text-left transition-all hover:shadow-sm hover:-translate-y-0.5 active:scale-[0.98] cursor-pointer flex flex-col justify-between ${
            filterStatus === 'pending'
              ? 'border-amber-500 ring-2 ring-amber-500/20 shadow-xs'
              : 'border-slate-200/80 shadow-2xs hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between gap-2">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
              Menunggu ACC
            </span>
            <div className="w-8 h-8 rounded-[var(--ui-radius-small)] bg-amber-50 text-amber-600 border border-amber-200/60 flex items-center justify-center shrink-0 relative">
              <Clock size={16} />
              {counts.pending > 0 && (
                <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-amber-500 rounded-full ring-2 ring-white animate-pulse" />
              )}
            </div>
          </div>
          <div className="mt-2.5">
            <div className={`text-2xl sm:text-3xl font-black tracking-tight leading-none ${
              counts.pending > 0 ? 'text-amber-600' : 'text-slate-900'
            }`}>
              {counts.pending}
            </div>
            <p className="text-[11px] font-medium text-slate-500 mt-1">
              {counts.pending > 0 ? `${counts.pending} surat perlu verifikasi` : 'Tidak ada antrean pending'}
            </p>
          </div>
        </button>

        {/* Card 3: Izin & Sakit */}
        <button
          type="button"
          onClick={() => setFilterStatus(filterStatus === 'Izin' ? 'Sakit' : 'Izin')}
          className={`bg-white border rounded-[var(--ui-radius-card)] p-4 text-left transition-all hover:shadow-sm hover:-translate-y-0.5 active:scale-[0.98] cursor-pointer flex flex-col justify-between ${
            filterStatus === 'Izin' || filterStatus === 'Sakit'
              ? 'border-blue-500 ring-2 ring-blue-500/20 shadow-xs'
              : 'border-slate-200/80 shadow-2xs hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between gap-2">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
              Izin &amp; Sakit
            </span>
            <div className="w-8 h-8 rounded-[var(--ui-radius-small)] bg-blue-50 text-blue-600 border border-blue-200/60 flex items-center justify-center shrink-0">
              <CheckCircle2 size={16} />
            </div>
          </div>
          <div className="mt-2.5">
            <div className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight leading-none">
              {counts.Izin + counts.Sakit}
            </div>
            <p className="text-[11px] font-medium text-slate-500 mt-1">
              {counts.Izin} Izin • {counts.Sakit} Sakit
            </p>
          </div>
        </button>

        {/* Card 4: Dinas Luar & Cuti */}
        <button
          type="button"
          onClick={() => setFilterStatus(filterStatus === 'Dinas Luar' ? 'Cuti' : 'Dinas Luar')}
          className={`bg-white border rounded-[var(--ui-radius-card)] p-4 text-left transition-all hover:shadow-sm hover:-translate-y-0.5 active:scale-[0.98] cursor-pointer flex flex-col justify-between ${
            filterStatus === 'Dinas Luar' || filterStatus === 'Cuti'
              ? 'border-purple-500 ring-2 ring-purple-500/20 shadow-xs'
              : 'border-slate-200/80 shadow-2xs hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between gap-2">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
              Dinas Luar &amp; Cuti
            </span>
            <div className="w-8 h-8 rounded-[var(--ui-radius-small)] bg-purple-50 text-purple-600 border border-purple-200/60 flex items-center justify-center shrink-0">
              <Briefcase size={16} />
            </div>
          </div>
          <div className="mt-2.5">
            <div className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight leading-none">
              {counts.DinasLuar + counts.Cuti}
            </div>
            <p className="text-[11px] font-medium text-slate-500 mt-1">
              {counts.DinasLuar} Dinas • {counts.Cuti} Cuti
            </p>
          </div>
        </button>
      </div>

      {/* Main Card Container */}
      <div className="ui-card bg-white border border-slate-200/80 rounded-[var(--ui-radius-card)] shadow-xs overflow-hidden flex flex-col">
        
        {/* Quick Filter Status Pills Row */}
        <div className="p-3.5 sm:p-4 border-b border-slate-100 bg-slate-50/40 flex flex-wrap items-center justify-between gap-2.5">
          <div className="flex flex-wrap items-center gap-2">
            {[
              { id: 'all', label: 'Semua Record', count: counts.all, activeBg: 'bg-slate-800 text-white border-slate-800' },
              { id: 'pending', label: 'Menunggu ACC', count: counts.pending, activeBg: 'bg-amber-500 text-white border-amber-500' },
              { id: 'Izin', label: 'Izin', count: counts.Izin, activeBg: 'bg-indigo-600 text-white border-indigo-600' },
              { id: 'Sakit', label: 'Sakit', count: counts.Sakit, activeBg: 'bg-rose-600 text-white border-rose-600' },
              { id: 'Dinas Luar', label: 'Dinas Luar', count: counts.DinasLuar, activeBg: 'bg-amber-600 text-white border-amber-600' },
              { id: 'Cuti', label: 'Cuti', count: counts.Cuti, activeBg: 'bg-purple-600 text-white border-purple-600' },
              { id: 'rejected', label: 'Ditolak', count: counts.rejected, activeBg: 'bg-slate-600 text-white border-slate-600' },
            ].map(tab => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setFilterStatus(tab.id)}
                className={`px-3 py-1.5 rounded-[var(--ui-radius-small)] text-xs font-extrabold transition-all cursor-pointer border flex items-center gap-2 active:scale-95 ${
                  filterStatus === tab.id
                    ? `${tab.activeBg} font-black shadow-xs`
                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100/80'
                }`}
              >
                <span>{tab.label}</span>
                <span className={`text-[10px] font-black px-1.5 py-0.2 rounded-full ${
                  filterStatus === tab.id ? 'bg-white/25 text-white' : 'bg-slate-100 text-slate-500'
                }`}>
                  {tab.count}
                </span>
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={fetchData}
              title="Refresh Data"
              className="w-8 h-8 rounded-[var(--ui-radius-small)] bg-white border border-slate-200 text-slate-500 hover:text-slate-800 hover:bg-slate-50 flex items-center justify-center cursor-pointer transition-colors shadow-xs"
            >
              <RefreshCw size={14} className={loading ? 'animate-spin text-emerald-600' : ''} />
            </button>
          </div>
        </div>

        {/* Toolbar Row */}
        <div className="p-3.5 sm:p-4 bg-white border-b border-slate-100 flex flex-col md:flex-row gap-3 justify-between items-start md:items-center">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 w-full md:w-auto flex-1">
            {/* Search Input */}
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
              <input
                type="text"
                placeholder="Cari nama pegawai, NIP, atau keterangan..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full pl-9 pr-3.5 py-2 bg-slate-50 border border-slate-200/80 rounded-[var(--ui-radius-small)] text-xs font-semibold text-slate-800 focus:outline-none focus:border-emerald-600 focus:bg-white transition-all"
              />
            </div>

            {/* Filter Person Type */}
            <div className="w-full sm:w-[150px]">
              <CustomSelect
                options={[
                  { value: 'all', label: 'Guru & Karyawan' },
                  { value: 'guru', label: 'Hanya Guru' },
                  { value: 'karyawan', label: 'Hanya Karyawan' }
                ]}
                value={activePersonType}
                onChange={val => setActivePersonType(val)}
              />
            </div>

            {/* Filter Specific Date */}
            <div className="flex items-center gap-1.5 w-full sm:w-auto">
              <input 
                type="date"
                value={filterTanggal}
                onChange={e => setFilterTanggal(e.target.value)}
                title="Filter tanggal spesifik"
                className="w-full sm:w-[145px] py-1.5 px-3 bg-slate-50 border border-slate-200/80 rounded-[var(--ui-radius-small)] text-xs font-semibold text-slate-800 focus:outline-none focus:border-emerald-600 focus:bg-white transition-all"
              />
              {filterTanggal && (
                <button
                  type="button"
                  onClick={() => setFilterTanggal('')}
                  title="Hapus filter tanggal"
                  className="px-2 py-1.5 text-xs text-rose-600 hover:bg-rose-50 rounded-[var(--ui-radius-small)] border border-rose-200 font-bold cursor-pointer"
                >
                  Clear
                </button>
              )}
            </div>

            {/* Month & Year Selectors */}
            <div className="w-full sm:w-[130px]">
              <CustomSelect
                options={monthOptions}
                value={filterMonth}
                onChange={val => setFilterMonth(val === 'all' ? 'all' : parseInt(val))}
              />
            </div>
            <div className="w-full sm:w-[100px]">
              <CustomSelect
                options={yearOptions}
                value={filterYear}
                onChange={val => setFilterYear(val === 'all' ? 'all' : parseInt(val))}
              />
            </div>
          </div>

          {/* Action CTA Buttons */}
          <div className="flex items-center gap-2 w-full md:w-auto shrink-0 justify-end">
            <button
              type="button"
              onClick={exportExcel}
              className="px-3.5 py-2 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 font-bold text-xs rounded-[var(--ui-radius-small)] shadow-xs flex items-center gap-1.5 active:scale-95 transition-all cursor-pointer"
            >
              <Download size={14} />
              <span>Export Excel</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setFormPersonType(activePersonType === 'karyawan' ? 'karyawan' : 'guru');
                setSelectedPersonCode('');
                setPersonSearchQuery('');
                setFormNote('');
                setFormFileData('');
                setFormFileName('');
                setFormError('');
                setFormDateMode('single');
                setShowInputModal(true);
              }}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-[var(--ui-radius-small)] shadow-xs flex items-center gap-1.5 active:scale-95 transition-all cursor-pointer border-none"
            >
              <Plus size={15} strokeWidth={2.5} />
              <span>Input Surat Izin/Sakit</span>
            </button>
          </div>
        </div>

        {/* Desktop Table View */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200/80 bg-slate-50/70 text-[10px] font-black text-slate-500 uppercase tracking-wider">
                <th className="py-3 px-4 w-12 text-center">No</th>
                <th className="py-3 px-4 w-28">Tanggal</th>
                <th className="py-3 px-4">Nama & NIP</th>
                <th className="py-3 px-4 w-28 text-center">Kategori</th>
                <th className="py-3 px-4 w-28 text-center">Status</th>
                <th className="py-3 px-4 min-w-[200px]">Alasan / Bukti Surat</th>
                <th className="py-3 px-4 w-36 text-center">Persetujuan</th>
                <th className="py-3 px-4 w-28 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="text-xs font-medium text-slate-700 divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan="8" className="px-6 py-12 text-center text-slate-400 font-bold">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <div className="w-6 h-6 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" />
                      <span>Memuat data surat izin/sakit...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredItems.length === 0 ? (
                <tr>
                  <td colSpan="8" className="px-6 py-14 text-center text-slate-400 font-medium">
                    <div className="flex flex-col items-center justify-center gap-2.5 max-w-sm mx-auto">
                      <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center shadow-xs border border-emerald-100">
                        <CheckCircle2 size={24} strokeWidth={2.2} />
                      </div>
                      <span className="font-extrabold text-slate-800 text-sm">Tidak ada data surat izin / sakit</span>
                      <span className="text-xs text-slate-400 text-center leading-relaxed">
                        Belum ada permohonan izin/sakit pada periode dan filter ini. Tekan tombol <strong>Input Surat Izin/Sakit</strong> untuk mencatat data baru.
                      </span>
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedItems.map((item, idx) => {
                  const isPending = item.approval_status === 'pending';
                  const isApproved = item.approval_status === 'approved';
                  const isRejected = item.approval_status === 'rejected';
                  const hasFile = Boolean(item.gdrive_url);
                  const isKaryawan = item.person_type === 'karyawan';
                  const approverLabel = isKaryawan ? 'Tata Usaha' : 'Kurikulum';
                  const canApprove = canApproveItem(item);
                  const isOwn = String(item.teacher_code) === String(currentUser?.code || currentUser?.id);

                  return (
                    <tr key={item.record_id || idx} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 px-4 text-center font-bold text-slate-400">
                        {(currentPage - 1) * itemsPerPage + idx + 1}
                      </td>
                      <td className="py-3.5 px-4 font-bold text-slate-800 whitespace-nowrap">
                        {new Date(item.tanggal).toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric', month: 'short' })}
                      </td>
                      <td className="py-3.5 px-4">
                        <p className="font-extrabold text-slate-900">{item.name || item.teacher_code}</p>
                        <p className="text-[10px] font-mono text-slate-400 mt-0.5">NIP/Kode: {item.nip || item.teacher_code} {item.division ? `• ${item.division}` : ''}</p>
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span className={`inline-block px-2.5 py-0.5 rounded-[var(--ui-radius-small)] text-[9.5px] font-extrabold uppercase border ${
                          isKaryawan
                            ? 'bg-purple-50 text-purple-700 border-purple-200'
                            : 'bg-blue-50 text-blue-700 border-blue-200'
                        }`}>
                          {isKaryawan ? 'Karyawan' : 'Guru'}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span className={`inline-block px-2.5 py-1 rounded-[var(--ui-radius-pill)] text-[10px] font-black uppercase tracking-wider border shadow-2xs ${getStatusBadgeStyle(item.status)}`}>
                          {item.status}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="flex flex-col gap-1 items-start">
                          <span className="text-slate-700 font-medium leading-relaxed">
                            {item.note || <span className="text-slate-400 italic">Tanpa catatan</span>}
                          </span>
                          {hasFile && (
                            <button
                              type="button"
                              onClick={() => setPreviewItem(item)}
                              className="text-[10.5px] font-bold text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100/80 px-2 py-0.5 rounded-[var(--ui-radius-small)] border border-indigo-200 flex items-center gap-1 cursor-pointer transition-colors shadow-2xs mt-0.5"
                            >
                              <FileText size={11} />
                              <span>Lihat Surat</span>
                            </button>
                          )}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        {isPending ? (
                          <div className="flex flex-col items-center gap-1.5">
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-[var(--ui-radius-pill)] bg-amber-100 text-amber-800 border border-amber-300 text-[10px] font-black uppercase tracking-wider shadow-2xs">
                              <Clock size={11} />
                              <span>Menunggu</span>
                            </span>

                            {canApprove ? (
                              <div className="flex items-center gap-1 mt-0.5">
                                <button
                                  type="button"
                                  onClick={() => handleApprove(item.record_id)}
                                  disabled={actionLoading}
                                  title={`Setujui Surat Izin (Sebagai ${approverLabel})`}
                                  className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-[var(--ui-radius-small)] font-bold text-[10px] flex items-center gap-1 shadow-xs cursor-pointer border-none active:scale-95 transition-all"
                                >
                                  <Check size={11} strokeWidth={3} />
                                  <span>Setujui</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleReject(item.record_id)}
                                  disabled={actionLoading}
                                  title={`Tolak Surat Izin (Sebagai ${approverLabel})`}
                                  className="px-2 py-1 bg-white hover:bg-rose-50 text-rose-600 border border-rose-200 rounded-[var(--ui-radius-small)] font-bold text-[10px] flex items-center gap-1 shadow-xs cursor-pointer active:scale-95 transition-all"
                                >
                                  <X size={11} strokeWidth={3} />
                                  <span>Tolak</span>
                                </button>
                              </div>
                            ) : (
                              <span className="text-[9px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                                Butuh ACC {approverLabel}
                              </span>
                            )}
                          </div>
                        ) : isApproved ? (
                          <div className="flex flex-col items-center">
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-[var(--ui-radius-pill)] bg-emerald-100 text-emerald-800 border border-emerald-300 text-[10px] font-black uppercase tracking-wider shadow-2xs">
                              <Check size={11} strokeWidth={3} />
                              <span>Disetujui</span>
                            </span>
                            {item.approved_by_name && (
                              <span className="text-[8.5px] text-slate-500 font-semibold mt-0.5 max-w-[140px] truncate" title={item.approved_by_name}>
                                oleh {item.approved_by_name}
                              </span>
                            )}
                          </div>
                        ) : (
                          <div className="flex flex-col items-center">
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-[var(--ui-radius-pill)] bg-rose-100 text-rose-800 border border-rose-300 text-[10px] font-black uppercase tracking-wider shadow-2xs">
                              <X size={11} strokeWidth={3} />
                              <span>Ditolak</span>
                            </span>
                            {item.approved_by_name && (
                              <span className="text-[8.5px] text-rose-600 font-semibold mt-0.5 max-w-[140px] truncate" title={item.approved_by_name}>
                                oleh {item.approved_by_name}
                              </span>
                            )}
                          </div>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {(canApprove || (isPending && isOwn)) && (
                            <button
                              type="button"
                              onClick={() => handleEditOpen(item)}
                              title="Edit Data"
                              className="w-8 h-8 rounded-[var(--ui-radius-small)] bg-slate-100 hover:bg-emerald-50 text-slate-600 hover:text-emerald-700 border border-slate-200/60 flex items-center justify-center active:scale-95 transition-all cursor-pointer"
                            >
                              <Edit2 size={13} />
                            </button>
                          )}

                          {(canApprove || (isPending && isOwn)) && (
                            <button
                              type="button"
                              onClick={() => handleDelete(item.record_id)}
                              disabled={actionLoading}
                              title="Hapus Data"
                              className="w-8 h-8 rounded-[var(--ui-radius-small)] bg-slate-100 hover:bg-rose-50 text-slate-600 hover:text-rose-700 border border-slate-200/60 flex items-center justify-center active:scale-95 transition-all cursor-pointer"
                            >
                              <Trash2 size={13} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile Responsive Cards View */}
        <div className="md:hidden p-3 space-y-3">
          {loading ? (
            <div className="py-8 text-center text-slate-400 font-bold flex flex-col items-center gap-2">
              <div className="w-6 h-6 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" />
              <span>Memuat data absensi...</span>
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="py-10 text-center text-slate-400 p-4 border border-dashed border-slate-200 rounded-[var(--ui-radius-card)]">
              <CheckCircle2 size={32} className="text-emerald-500 opacity-60 mx-auto mb-2" />
              <div className="font-extrabold text-slate-700 text-xs">Tidak ada data surat izin / sakit</div>
            </div>
          ) : (
            paginatedItems.map((item, idx) => {
              const isPending = item.approval_status === 'pending';
              const isApproved = item.approval_status === 'approved';
              const hasFile = Boolean(item.gdrive_url);
              const isKaryawan = item.person_type === 'karyawan';
              const approverLabel = isKaryawan ? 'Tata Usaha' : 'Kurikulum';
              const canApprove = canApproveItem(item);
              const isOwn = String(item.teacher_code) === String(currentUser?.code || currentUser?.id);

              return (
                <div key={item.record_id || idx} className="p-3.5 bg-white border border-slate-200/80 rounded-[var(--ui-radius-card)] shadow-xs flex flex-col gap-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-slate-800">
                      {new Date(item.tanggal).toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric', month: 'short' })}
                    </span>
                    <span className={`inline-flex px-2.5 py-0.5 rounded-[var(--ui-radius-pill)] text-[9.5px] font-black uppercase border ${getStatusBadgeStyle(item.status)}`}>
                      {item.status}
                    </span>
                  </div>

                  <div>
                    <div className="flex items-center justify-between">
                      <p className="font-extrabold text-slate-900 text-xs">{item.name || item.teacher_code}</p>
                      <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${
                        isKaryawan ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'
                      }`}>
                        {isKaryawan ? 'Karyawan' : 'Guru'}
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-400 font-mono mt-0.5">NIP/Kode: {item.nip || item.teacher_code}</p>
                  </div>

                  {item.note && (
                    <p className="text-xs text-slate-700 bg-slate-50 p-2.5 rounded-[var(--ui-radius-small)] font-medium leading-relaxed">
                      {item.note}
                    </p>
                  )}

                  {/* Status & Actions Footer */}
                  <div className="flex items-center justify-between pt-2.5 border-t border-slate-100">
                    <div>
                      {isPending ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-black text-amber-700 uppercase">
                          <Clock size={12} />
                          <span>Menunggu ACC {approverLabel}</span>
                        </span>
                      ) : isApproved ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-black text-emerald-700 uppercase">
                          <Check size={12} strokeWidth={3} />
                          <span>Disetujui ({approverLabel})</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[10px] font-black text-rose-700 uppercase">
                          <X size={12} strokeWidth={3} />
                          <span>Ditolak ({approverLabel})</span>
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      {hasFile && (
                        <button
                          type="button"
                          onClick={() => setPreviewItem(item)}
                          className="px-2.5 py-1 text-xs font-bold text-indigo-600 bg-indigo-50 rounded-[var(--ui-radius-small)] flex items-center gap-1 border border-indigo-200"
                        >
                          <Eye size={12} />
                          <span>Bukti</span>
                        </button>
                      )}

                      {isPending && canApprove && (
                        <>
                          <button
                            type="button"
                            onClick={() => handleApprove(item.record_id)}
                            className="px-3 py-1 bg-emerald-600 text-white rounded-[var(--ui-radius-small)] font-black text-xs shadow-xs"
                          >
                            ACC
                          </button>
                          <button
                            type="button"
                            onClick={() => handleReject(item.record_id)}
                            className="px-2 py-1 bg-rose-50 text-rose-600 border border-rose-200 rounded-[var(--ui-radius-small)] font-black text-xs"
                          >
                            Tolak
                          </button>
                        </>
                      )}

                      {(canApprove || (isPending && isOwn)) && (
                        <button
                          type="button"
                          onClick={() => handleEditOpen(item)}
                          className="p-1 text-slate-400 hover:text-emerald-600"
                        >
                          <Edit2 size={14} />
                        </button>
                      )}

                      {(canApprove || (isPending && isOwn)) && (
                        <button
                          type="button"
                          onClick={() => handleDelete(item.record_id)}
                          className="p-1 text-slate-400 hover:text-rose-600"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Pagination Controls (Max 20 data per page) */}
        <TablePagination 
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={filteredItems.length}
          itemsPerPage={itemsPerPage}
          onPageChange={setCurrentPage}
          onItemsPerPageChange={(val) => { setItemsPerPage(val); setCurrentPage(1); }}
          isLoading={loading}
        />

      </div>

      {/* ── MODAL INPUT SURAT IZIN / SAKIT GURU & KARYAWAN ── */}
      {showInputModal && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-[var(--ui-radius-card)] shadow-[var(--ui-shadow-card)] max-w-lg w-full overflow-hidden border border-slate-200 animate-in zoom-in-95 duration-200 flex flex-col max-h-[92vh]">
            
            {/* Header */}
            <div className="px-5 py-4 border-b border-slate-100 bg-slate-50/80 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-[var(--ui-radius-small)] bg-emerald-100 border border-emerald-200 flex items-center justify-center text-emerald-700 shadow-xs">
                  <FileText size={18} />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-800">Input Surat Izin / Sakit Pegawai</h3>
                  <p className="text-[10px] text-slate-400 font-medium">Verifikasi guru oleh Kurikulum, karyawan oleh Tata Usaha</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowInputModal(false)}
                className="w-8 h-8 rounded-[var(--ui-radius-small)] hover:bg-slate-200 text-slate-400 flex items-center justify-center cursor-pointer transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            {/* Form Body */}
            <form onSubmit={handleSubmitInput} className="p-5 overflow-y-auto space-y-4 text-xs flex-1">
              {formError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-[var(--ui-radius-small)] text-rose-700 flex items-center gap-2 font-semibold text-xs">
                  <AlertTriangle size={15} className="shrink-0 text-rose-600" />
                  <span>{formError}</span>
                </div>
              )}

              {/* 1. Kategori: Guru atau Karyawan */}
              <div>
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider block mb-1.5">
                  1. Kategori Pegawai
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => { setFormPersonType('guru'); setSelectedPersonCode(''); setPersonSearchQuery(''); }}
                    className={`py-2 px-3 rounded-[var(--ui-radius-small)] text-xs font-extrabold border transition-all cursor-pointer flex items-center justify-center gap-2 ${
                      formPersonType === 'guru'
                        ? 'border-blue-600 bg-blue-600 text-white shadow-xs'
                        : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <Users size={14} />
                    <span>Guru Pendidik</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => { setFormPersonType('karyawan'); setSelectedPersonCode(''); setPersonSearchQuery(''); }}
                    className={`py-2 px-3 rounded-[var(--ui-radius-small)] text-xs font-extrabold border transition-all cursor-pointer flex items-center justify-center gap-2 ${
                      formPersonType === 'karyawan'
                        ? 'border-purple-600 bg-purple-600 text-white shadow-xs'
                        : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <Briefcase size={14} />
                    <span>Staf / Karyawan</span>
                  </button>
                </div>
              </div>

              {/* 2. Pilih Person */}
              <div>
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider block mb-1.5">
                  2. Pilih {formPersonType === 'karyawan' ? 'Staf Karyawan' : 'Guru Pendidik'}
                </label>
                <div className="relative mb-2">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder={`Cari nama atau NIP ${formPersonType}...`}
                    value={personSearchQuery}
                    onChange={e => setPersonSearchQuery(e.target.value)}
                    className="w-full pl-8 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-[var(--ui-radius-small)] text-xs font-semibold focus:outline-none focus:bg-white focus:border-emerald-600"
                  />
                </div>

                <div className="max-h-36 overflow-y-auto border border-slate-200 rounded-[var(--ui-radius-small)] divide-y divide-slate-100 bg-white">
                  {availablePeople.length === 0 ? (
                    <div className="p-3 text-center text-slate-400 text-xs">Tidak ditemukan</div>
                  ) : (
                    availablePeople.map(p => {
                      const code = String(p.code || p.nip || p.id);
                      const isSelected = selectedPersonCode === code;
                      return (
                        <div
                          key={code}
                          onClick={() => setSelectedPersonCode(code)}
                          className={`p-2.5 flex items-center justify-between cursor-pointer transition-colors ${
                            isSelected ? 'bg-emerald-50 text-emerald-800 font-black' : 'hover:bg-slate-50 text-slate-700'
                          }`}
                        >
                          <div>
                            <p className="font-extrabold text-xs">{p.name || p.nama}</p>
                            <p className="text-[10px] text-slate-400">Kode/NIP: {p.nip || p.code || p.id} {p.division ? `• ${p.division}` : ''}</p>
                          </div>
                          {isSelected && <Check size={16} className="text-emerald-600 shrink-0" />}
                        </div>
                      );
                    })
                  )}
                </div>

                {selectedPersonObj && (
                  <div className="mt-2 p-2.5 bg-emerald-50 border border-emerald-200 rounded-[var(--ui-radius-small)] text-emerald-800 text-xs font-bold flex items-center justify-between">
                    <span>Terpilih: <strong>{selectedPersonObj.name || selectedPersonObj.nama}</strong></span>
                    <span className="text-[10px] bg-emerald-600 text-white px-2 py-0.5 rounded-full">Siap</span>
                  </div>
                )}
              </div>

              {/* 3. Status Kehadiran */}
              <div>
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider block mb-1.5">
                  3. Status Izin / Ketidakhadiran
                </label>
                <div className="grid grid-cols-5 gap-1.5">
                  {['Izin', 'Sakit', 'Dinas Luar', 'Cuti', 'Alpa'].map(st => (
                    <button
                      key={st}
                      type="button"
                      onClick={() => setFormStatus(st)}
                      className={`py-2 px-2 rounded-[var(--ui-radius-small)] text-xs font-extrabold border transition-all cursor-pointer text-center ${
                        formStatus === st
                          ? 'border-emerald-600 bg-emerald-600 text-white shadow-xs'
                          : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      {st}
                    </button>
                  ))}
                </div>
              </div>

              {/* 4. Pilihan Mode Tanggal: 1 Hari vs Rentang */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider">
                    4. Tanggal Absensi
                  </label>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setFormDateMode('single')}
                      className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                        formDateMode === 'single' ? 'bg-emerald-100 text-emerald-800' : 'text-slate-400 hover:text-slate-600'
                      }`}
                    >
                      1 Hari
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormDateMode('range')}
                      className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                        formDateMode === 'range' ? 'bg-emerald-100 text-emerald-800' : 'text-slate-400 hover:text-slate-600'
                      }`}
                    >
                      Rentang Tanggal (Multi Hari)
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] text-slate-400 block mb-1">
                      {formDateMode === 'range' ? 'Dari Tanggal' : 'Tanggal'}
                    </label>
                    <input
                      type="date"
                      value={formStartDate}
                      onChange={e => setFormStartDate(e.target.value)}
                      required
                      className="w-full h-9 bg-slate-50 border border-slate-200 px-3 rounded-[var(--ui-radius-small)] text-xs font-bold text-slate-800 focus:bg-white focus:outline-none focus:border-emerald-600"
                    />
                  </div>
                  {formDateMode === 'range' && (
                    <div>
                      <label className="text-[10px] text-slate-400 block mb-1">
                        Sampai Tanggal
                      </label>
                      <input
                        type="date"
                        value={formEndDate}
                        onChange={e => setFormEndDate(e.target.value)}
                        min={formStartDate}
                        required
                        className="w-full h-9 bg-slate-50 border border-slate-200 px-3 rounded-[var(--ui-radius-small)] text-xs font-bold text-slate-800 focus:bg-white focus:outline-none focus:border-emerald-600"
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* 5. Alasan / Catatan */}
              <div>
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider block mb-1.5">
                  5. Keterangan / Alasan
                </label>
                <textarea
                  value={formNote}
                  onChange={e => setFormNote(e.target.value)}
                  rows={2}
                  placeholder="Contoh: Mengikuti MGMP / Sakit flu surat dokter terlampir / Dinas luar koordinasi MKKS"
                  className="w-full bg-slate-50 border border-slate-200 p-2.5 rounded-[var(--ui-radius-small)] text-xs font-medium text-slate-800 focus:bg-white focus:outline-none focus:border-emerald-600 resize-none"
                />
              </div>

              {/* 6. Upload Bukti Surat */}
              <div>
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider block mb-1.5">
                  6. Upload Surat / Bukti (Foto/PDF)
                </label>
                <label className="border-2 border-dashed border-slate-300 hover:border-emerald-500 rounded-[var(--ui-radius-small)] p-3 flex flex-col items-center justify-center gap-1.5 cursor-pointer bg-slate-50 hover:bg-slate-100/60 transition-colors">
                  <UploadCloud size={20} className="text-slate-400" />
                  <span className="text-xs font-bold text-slate-600">
                    {formFileName ? formFileName : 'Pilih file dokumen / foto surat'}
                  </span>
                  <span className="text-[9.5px] text-slate-400 font-medium">PNG, JPG, PDF (Otomatis dikompres &lt; 80 KB)</span>
                  <input
                    type="file"
                    accept="image/*,application/pdf"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </label>

                {formFileData && formFileData.startsWith('data:image') && (
                  <div className="mt-2 flex items-center gap-2 p-2 bg-slate-50 rounded border border-slate-200">
                    <img src={formFileData} alt="Preview" className="w-12 h-12 object-cover rounded shadow-xs" />
                    <span className="text-[10px] text-emerald-700 font-bold">Foto surat berhasil disiapkan</span>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                <span className="text-[10.5px] text-slate-400 font-medium">
                  {canApproveItem({ person_type: formPersonType }) ? '✓ Otomatis disetujui' : `⏳ Menunggu ACC ${getApproverRoleName(formPersonType)}`}
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowInputModal(false)}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold text-xs rounded-[var(--ui-radius-small)] cursor-pointer"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={actionLoading}
                    className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs rounded-[var(--ui-radius-small)] shadow-xs cursor-pointer border-none flex items-center gap-1.5"
                  >
                    {actionLoading ? 'Menyimpan...' : 'Simpan Surat Izin'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL EDIT SURAT IZIN ── */}
      {editItem && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-[var(--ui-radius-card)] shadow-lg max-w-md w-full overflow-hidden border border-slate-200 animate-in zoom-in-95 duration-200 flex flex-col">
            <div className="px-5 py-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-black text-slate-800">Edit Data Surat Izin / Sakit</h3>
                <p className="text-[10px] text-slate-400 font-medium">{editItem.name} ({editItem.tanggal})</p>
              </div>
              <button
                type="button"
                onClick={() => setEditItem(null)}
                className="w-7 h-7 rounded hover:bg-slate-200 text-slate-400 flex items-center justify-center cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="p-5 space-y-3.5 text-xs">
              <div>
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider block mb-1">Status</label>
                <div className="grid grid-cols-5 gap-1.5">
                  {['Izin', 'Sakit', 'Dinas Luar', 'Cuti', 'Alpa'].map(st => (
                    <button
                      key={st}
                      type="button"
                      onClick={() => setEditStatus(st)}
                      className={`py-1.5 px-1 rounded text-xs font-extrabold border transition-all cursor-pointer text-center ${
                        editStatus === st
                          ? 'border-emerald-600 bg-emerald-600 text-white shadow-xs'
                          : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      {st}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider block mb-1">Keterangan</label>
                <textarea
                  value={editNote}
                  onChange={e => setEditNote(e.target.value)}
                  rows={2}
                  className="w-full bg-slate-50 border border-slate-200 p-2 rounded text-xs font-medium text-slate-800 focus:bg-white focus:outline-none focus:border-emerald-600 resize-none"
                />
              </div>

              <div>
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider block mb-1">Perbarui Lampiran Surat</label>
                <label className="border border-dashed border-slate-300 hover:border-emerald-500 rounded p-2.5 flex items-center justify-center gap-2 cursor-pointer bg-slate-50">
                  <UploadCloud size={16} className="text-slate-400" />
                  <span className="text-xs font-bold text-slate-600">
                    {editFileName ? editFileName : editFileData ? 'Ganti file lampiran' : 'Upload file baru'}
                  </span>
                  <input
                    type="file"
                    accept="image/*,application/pdf"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      setEditFileName(file.name);
                      if (file.type.startsWith('image/')) {
                        compressImage(file, (dataUrl) => setEditFileData(dataUrl));
                      } else {
                        const reader = new FileReader();
                        reader.onload = () => setEditFileData(reader.result);
                        reader.readAsDataURL(file);
                      }
                    }}
                    className="hidden"
                  />
                </label>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditItem(null)}
                  className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold text-xs rounded cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs rounded shadow-xs cursor-pointer border-none"
                >
                  {actionLoading ? 'Menyimpan...' : 'Perbarui'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL PREVIEW SURAT BUKTI ── */}
      {previewItem && (
        <div className="fixed inset-0 z-[160] flex items-center justify-center bg-black/70 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-[var(--ui-radius-card)] shadow-lg max-w-xl w-full overflow-hidden border border-slate-200 flex flex-col max-h-[90vh]">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div>
                <h4 className="font-extrabold text-slate-800 text-sm">Bukti Surat {previewItem.status}</h4>
                <p className="text-[10px] text-slate-400 font-medium">{previewItem.name} ({previewItem.tanggal})</p>
              </div>
              <button
                type="button"
                onClick={() => setPreviewItem(null)}
                className="w-7 h-7 rounded-[var(--ui-radius-small)] hover:bg-slate-200 text-slate-400 flex items-center justify-center cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>
            <div className="p-4 overflow-y-auto flex-1 flex items-center justify-center bg-slate-100/50 min-h-[300px]">
              {previewItem.gdrive_url?.startsWith('data:image') ? (
                <img
                  src={previewItem.gdrive_url}
                  alt="Bukti Surat"
                  className="max-w-full max-h-[70vh] rounded-[var(--ui-radius-small)] shadow-xs object-contain"
                />
              ) : previewItem.gdrive_url?.startsWith('data:application/pdf') ? (
                <iframe
                  src={previewItem.gdrive_url}
                  title="PDF Preview"
                  className="w-full h-[60vh] rounded-[var(--ui-radius-small)] border border-slate-200"
                />
              ) : previewItem.gdrive_url ? (
                <a
                  href={previewItem.gdrive_url}
                  target="_blank"
                  rel="noreferrer"
                  className="px-4 py-2 bg-emerald-600 text-white rounded-[var(--ui-radius-small)] font-bold text-xs flex items-center gap-2 shadow-xs"
                >
                  <Download size={14} />
                  <span>Buka Dokumen di Tab Baru</span>
                </a>
              ) : (
                <div className="text-slate-400 text-xs font-bold">Tidak ada file lampiran</div>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
