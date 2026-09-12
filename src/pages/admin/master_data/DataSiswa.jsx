import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Users, CheckCircle2, XCircle, Search, Save, Upload, Download, 
  ChevronRight, X, AlertCircle, Building2, UserCheck, Filter, RefreshCw, ArrowUpDown,
  GraduationCap, Briefcase, Calendar, Check, Clock, Sparkles, Layers,
  Compass, FileSpreadsheet, CheckCheck, HelpCircle
} from 'lucide-react';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import { getDatabaseSnapshot, setDatabaseSnapshot } from '../../../utils/dataSource';
import { PageHeader, Avatar } from '../../../components/monitoring/ui/index.js';
import { Button, Modal } from '../../../components/ui.jsx';
import { CustomSelect } from '../../../components/CustomSelect.jsx';
import { usePagination } from '../../../components/ui/PaginationControls.jsx';
import { useDataStore } from '../../../store/useDataStore.js';
import { useAppStore } from '../../../store/useAppStore.js';
import { calculateDistanceKm } from './DataPerusahaan.jsx';

const getToken = () => {
  try {
    const raw = sessionStorage.getItem("school_schedule_session_v1");
    if (raw) return JSON.parse(raw)?.authToken;
  } catch (e) {}
  return null;
};

// Major badge color palette
const getMajorBadgeStyle = (jurusan = '') => {
  const j = jurusan.toUpperCase();
  if (j.includes('TKJ') || j.includes('TJKT')) return 'bg-emerald-50 text-emerald-700 border-emerald-200/60';
  if (j.includes('TKR') || j.includes('OTO')) return 'bg-orange-50 text-orange-700 border-orange-200/60';
  if (j.includes('RPL') || j.includes('PPLG')) return 'bg-cyan-50 text-cyan-700 border-cyan-200/60';
  if (j.includes('AK') || j.includes('AKL')) return 'bg-pink-50 text-pink-700 border-pink-200/60';
  if (j.includes('MP') || j.includes('MPLB') || j.includes('OTKP')) return 'bg-purple-50 text-purple-700 border-purple-200/60';
  return 'bg-slate-50 text-slate-700 border-slate-200/60';
};

const DataSiswa = ({ students = [], teachers = [], appSettings, setAppSettings, onSave, setActiveTab }) => {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('Semua'); // 'Semua' | 'Sudah PKL' | 'Belum PKL'
  const [filterJurusan, setFilterJurusan] = useState('Semua');
  const [filterKelas, setFilterKelas] = useState('Semua');
  const [sortBy, setSortBy] = useState('kelas_nis'); // 'kelas_nis' | 'nama_asc' | 'nama_desc' | 'nis_asc' | 'status_belum' | 'status_sudah'
  
  const [selectedSiswa, setSelectedSiswa] = useState(null);
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const [eligibleClass, setEligibleClass] = useState("XII");

  const schoolProfile = useDataStore(state => state.schoolProfile) || {};
  const attendanceSettings = useAppStore(state => state.attendanceSettings) || {};
  const schoolLat = parseFloat(attendanceSettings.schoolLat || schoolProfile.lat || -6.2383);
  const schoolLng = parseFloat(attendanceSettings.schoolLng || schoolProfile.lng || 106.9756);

  const [perusahaanPKL, setPerusahaanPKL] = useState([]);
  const [pklStudentsMapping, setPklStudentsMapping] = useState([]);
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [toast, setToast] = useState(null);
  const [loading, setLoading] = useState(true);

  // States untuk Modal Impor Penugasan Excel
  const [showImportModal, setShowImportModal] = useState(false);
  const [importPreviewRows, setImportPreviewRows] = useState([]);
  const [isProcessingImport, setIsProcessingImport] = useState(false);
  const [importSearch, setImportSearch] = useState('');
  const [importFilterStatus, setImportFilterStatus] = useState('all'); // 'all' | 'valid' | 'warning' | 'error'

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  const fetchPKLData = () => {
    const token = getToken();
    setLoading(true);

    Promise.all([
      fetch("/api/pkl/locations", { headers: token ? { "Authorization": `Bearer ${token}` } : {} })
        .then(r => r.json()).catch(() => ({ ok: false, data: [] })),
      fetch("/api/monitoring/pkl-students", { headers: token ? { "Authorization": `Bearer ${token}` } : {} })
        .then(r => r.json()).catch(() => ({ ok: false, data: [] })),
      fetch("/api/settings/pkl", { headers: token ? { "Authorization": `Bearer ${token}` } : {} })
        .then(r => r.json()).catch(() => ({ ok: false }))
    ]).then(([locData, pklData, settingsData]) => {
      if (locData?.ok) setPerusahaanPKL(Array.isArray(locData.data) ? locData.data : []);
      if (pklData?.ok) setPklStudentsMapping(Array.isArray(pklData.data) ? pklData.data : []);
      
      if (settingsData?.ok && settingsData.data?.eligibleClass) {
        setEligibleClass(settingsData.data.eligibleClass);
      } else {
        const localSnapshot = getDatabaseSnapshot() || {};
        const localSettings = localSnapshot.appSettings || {};
        if (localSettings.eligibleClass) setEligibleClass(localSettings.eligibleClass);
      }
      setLoading(false);
    }).catch(err => {
      console.error("[DataSiswa] Error loading PKL data:", err);
      setLoading(false);
    });
  };

  useEffect(() => {
    fetchPKLData();
  }, []);

  const handleTingkatChange = async (newTingkat) => {
    setEligibleClass(newTingkat);
    const token = getToken();
    try {
      const localSnapshot = getDatabaseSnapshot() || {};
      const newSettings = { ...(localSnapshot.appSettings || {}), eligibleClass: newTingkat };
      const updatedSnapshot = { ...localSnapshot, appSettings: newSettings };
      
      setDatabaseSnapshot(updatedSnapshot);
      if (setAppSettings) setAppSettings(newSettings);
      if (onSave) await onSave(updatedSnapshot);

      const headers = { "Content-Type": "application/json" };
      if (token) headers["Authorization"] = `Bearer ${token}`;

      await fetch("/api/settings/pkl", {
        method: "PUT",
        headers,
        body: JSON.stringify({ eligibleClass: newTingkat })
      });

      showToast(`Menampilkan siswa PKL Tingkat ${newTingkat}`);
    } catch (e) {
      console.error(e);
    }
  };

  const handleImport = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const data = new Uint8Array(evt.target.result);
        const workbook = new ExcelJS.Workbook();
        await workbook.xlsx.load(data);
        const worksheet = workbook.worksheets[0];
        const json = [];
        let headers = [];
        worksheet.eachRow((row, rowNumber) => {
          if (rowNumber === 1) {
            headers = row.values;
            return;
          }
          const rowData = {};
          row.eachCell((cell, colNumber) => {
            rowData[headers[colNumber]] = cell.value;
          });
          json.push(rowData);
        });
        if (json && json.length > 0) {
          showToast(`Berhasil membaca ${json.length} data siswa dari file.`, 'success');
        } else {
          showToast('File Excel kosong atau format tidak sesuai.', 'error');
        }
      } catch (err) {
        showToast('Gagal membaca file Excel.', 'error');
      }
    };
    reader.readAsArrayBuffer(file);
  };

  // Parse student data with accurate database mapping
  const pklStudents = useMemo(() => {
    const targetPrefix = String(eligibleClass || 'XII').toUpperCase();
    
    return students
      .filter(s => s.class_name && s.class_name.toUpperCase().startsWith(targetPrefix))
      .map(s => {
        const studentNis = String(s.nis || s.id || '').trim();
        const mapping = pklStudentsMapping.find(m => String(m.nis).trim() === studentNis) || {};
        
        // Extract Jurusan code
        const nameParts = (s.class_name || '').trim().split(/\s+/);
        let jCode = 'Umum';
        if (nameParts.length >= 2) {
          jCode = nameParts[1];
        } else if (s.jurusan) {
          jCode = s.jurusan;
        }

        const isAssigned = Boolean(mapping.location_id);

        return {
          id: studentNis,
          nis: studentNis,
          nama: String(s.name || s.nama || '').trim(),
          kelas: String(s.class_name || '').trim(),
          jurusan: jCode,
          perusahaanId: mapping.location_id || null,
          guruPembimbingCode: mapping.teacher_code || null,
          statusPKL: isAssigned ? 'Sudah PKL' : 'Belum PKL',
          lamaPKL: isAssigned ? '6 Bulan' : '-'
        };
      });
  }, [students, eligibleClass, pklStudentsMapping]);

  // Jurusan Options
  const jurusanOptions = useMemo(() => {
    const unique = Array.from(new Set(pklStudents.map(s => s.jurusan))).filter(Boolean);
    unique.sort((a, b) => a.localeCompare(b));
    return ['Semua', ...unique];
  }, [pklStudents]);

  // Kelas Options
  const kelasOptions = useMemo(() => {
    const unique = Array.from(new Set(pklStudents.map(s => s.kelas))).filter(Boolean);
    unique.sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }));
    return ['Semua', ...unique];
  }, [pklStudents]);

  // Filter & Sort Students
  const filtered = useMemo(() => {
    const result = pklStudents.filter((s) => {
      const q = search.toLowerCase();
      const matchSearch =
        s.nama.toLowerCase().includes(q) ||
        s.nis.toLowerCase().includes(q) ||
        s.kelas.toLowerCase().includes(q);
      const matchStatus = filterStatus === 'Semua' || s.statusPKL === filterStatus;
      const matchJurusan = filterJurusan === 'Semua' || s.jurusan === filterJurusan;
      const matchKelas = filterKelas === 'Semua' || s.kelas === filterKelas;
      return matchSearch && matchStatus && matchJurusan && matchKelas;
    });

    result.sort((a, b) => {
      if (sortBy === 'kelas_nis') {
        const classComp = a.kelas.localeCompare(b.kelas, undefined, { numeric: true, sensitivity: 'base' });
        if (classComp !== 0) return classComp;
        const nisComp = a.nis.localeCompare(b.nis, undefined, { numeric: true });
        if (nisComp !== 0) return nisComp;
        return a.nama.localeCompare(b.nama);
      }
      if (sortBy === 'nama_asc') return a.nama.localeCompare(b.nama);
      if (sortBy === 'nama_desc') return b.nama.localeCompare(a.nama);
      if (sortBy === 'nis_asc') return a.nis.localeCompare(b.nis, undefined, { numeric: true });
      if (sortBy === 'status_belum') {
        if (a.statusPKL === b.statusPKL) return a.kelas.localeCompare(b.kelas, undefined, { numeric: true, sensitivity: 'base' });
        return a.statusPKL === 'Belum PKL' ? -1 : 1;
      }
      if (sortBy === 'status_sudah') {
        if (a.statusPKL === b.statusPKL) return a.kelas.localeCompare(b.kelas, undefined, { numeric: true, sensitivity: 'base' });
        return a.statusPKL === 'Sudah PKL' ? -1 : 1;
      }
      return 0;
    });

    return result;
  }, [pklStudents, search, filterStatus, filterJurusan, filterKelas, sortBy]);

  const { paginatedData, PaginationBar } = usePagination(filtered, 15);

  const totalCount = pklStudents.length;
  const sudahPklCount = pklStudents.filter(s => s.statusPKL === 'Sudah PKL').length;
  const belumPklCount = pklStudents.filter(s => s.statusPKL === 'Belum PKL').length;

  const handleExport = () => {
    const exportData = filtered.map(s => {
      const guru = teachers.find(g => String(g.code || g.id) === String(s.guruPembimbingCode));
      const perusahaan = perusahaanPKL.find(p => String(p.id) === String(s.perusahaanId));
      return {
        NIS: s.nis,
        Nama: s.nama,
        Kelas: s.kelas,
        Jurusan: s.jurusan,
        "Perusahaan PKL": perusahaan?.nama_perusahaan || "Belum Ditempatkan",
        "Guru Pembimbing": guru?.name || guru?.nama || "Belum Ditugaskan",
        "Status PKL": s.statusPKL,
        "Lama PKL": s.lamaPKL
      };
    });
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet("Siswa PKL");
    if (exportData.length > 0) {
      const keys = Object.keys(exportData[0]);
      ws.addRow(keys);
      exportData.forEach(item => ws.addRow(keys.map(k => item[k])));
    }
    wb.xlsx.writeBuffer().then(buf => {
      saveAs(new Blob([buf]), `Data_Siswa_PKL_${eligibleClass}.xlsx`);
    });
  };

  // === DOWNLOAD TEMPLATE EXCEL PENUGASAN (MULTI-SHEET) ===
  const handleDownloadTemplate = async () => {
    try {
      const wb = new ExcelJS.Workbook();
      wb.creator = 'Sistem PKL SMK Karya Guna 2';
      wb.created = new Date();

      // --- SHEET 1: PENUGASAN PKL ---
      const ws1 = wb.addWorksheet('Penugasan PKL', {
        views: [{ showGridLines: true }]
      });

      ws1.columns = [
        { header: 'NIS (Wajib)', key: 'nis', width: 18 },
        { header: 'Nama Siswa', key: 'nama', width: 32 },
        { header: 'Kelas', key: 'kelas', width: 14 },
        { header: 'Jurusan', key: 'jurusan', width: 12 },
        { header: 'Kode Guru Pembimbing (Wajib)', key: 'kode_guru', width: 30 },
        { header: 'Nama Guru (Referensi)', key: 'nama_guru', width: 30 },
        { header: 'No / ID Perusahaan (Wajib)', key: 'id_perusahaan', width: 26 },
        { header: 'Nama Perusahaan (Referensi)', key: 'nama_perusahaan', width: 38 },
      ];

      const headerRow1 = ws1.getRow(1);
      headerRow1.height = 28;
      headerRow1.eachCell((cell) => {
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FF047857' } // Emerald 700
        };
        cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
        cell.alignment = { vertical: 'middle', horizontal: 'center' };
        cell.border = {
          top: { style: 'thin' }, left: { style: 'thin' },
          bottom: { style: 'medium' }, right: { style: 'thin' }
        };
      });

      // Baris siswa saat ini
      pklStudents.forEach(s => {
        const guru = teachers.find(g => String(g.code || g.id) === String(s.guruPembimbingCode));
        const perusahaan = perusahaanPKL.find(p => String(p.id) === String(s.perusahaanId));
        const row = ws1.addRow({
          nis: String(s.nis),
          nama: s.nama,
          kelas: s.kelas,
          jurusan: s.jurusan,
          kode_guru: s.guruPembimbingCode || '',
          nama_guru: guru?.name || guru?.nama || '',
          id_perusahaan: s.perusahaanId ? Number(s.perusahaanId) : '',
          nama_perusahaan: perusahaan?.nama_perusahaan || ''
        });

        row.getCell('nis').numFmt = '@';
        row.getCell('kode_guru').numFmt = '@';
      });

      // --- SHEET 2: REFERENSI GURU ---
      const ws2 = wb.addWorksheet('Referensi Guru', { views: [{ showGridLines: true }] });
      ws2.columns = [
        { header: 'Kode Guru (Untuk Kolom E)', key: 'code', width: 26 },
        { header: 'Nama Guru Pembimbing', key: 'name', width: 34 },
        { header: 'NIP', key: 'nip', width: 22 },
        { header: 'Mata Pelajaran', key: 'mapel', width: 26 },
      ];

      const headerRow2 = ws2.getRow(1);
      headerRow2.height = 26;
      headerRow2.eachCell(c => {
        c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4338CA' } }; // Indigo 700
        c.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
        c.alignment = { vertical: 'middle', horizontal: 'center' };
      });

      teachers.forEach(t => {
        ws2.addRow({
          code: String(t.code || t.id || ''),
          name: t.name || t.nama || '',
          nip: t.nip && t.nip !== '-' ? String(t.nip) : '-',
          mapel: t.mapel || t.subject || '-'
        });
      });

      // --- SHEET 3: REFERENSI PERUSAHAAN PKL ---
      const ws3 = wb.addWorksheet('Referensi Perusahaan PKL', { views: [{ showGridLines: true }] });
      ws3.columns = [
        { header: 'No / ID Perusahaan (Untuk Kolom G)', key: 'id', width: 32 },
        { header: 'Nama Perusahaan Mitra', key: 'nama', width: 38 },
        { header: 'Bidang Usaha', key: 'bidang', width: 24 },
        { header: 'Kota / Lokasi', key: 'kota', width: 22 },
        { header: 'Jarak ke Sekolah (KM)', key: 'jarak', width: 24 },
        { header: 'Kapasitas Kuota', key: 'kuota', width: 16 },
      ];

      const headerRow3 = ws3.getRow(1);
      headerRow3.height = 26;
      headerRow3.eachCell(c => {
        c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF6D28D9' } }; // Purple 700
        c.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
        c.alignment = { vertical: 'middle', horizontal: 'center' };
      });

      perusahaanPKL.forEach(p => {
        const dist = calculateDistanceKm(schoolLat, schoolLng, p.lat, p.lng);
        ws3.addRow({
          id: Number(p.id),
          nama: p.nama_perusahaan || '',
          bidang: p.bidang || '-',
          kota: p.kota || p.alamat || '-',
          jarak: dist !== null ? `${dist} km` : 'Belum set GPS',
          kuota: p.kuota || 15
        });
      });

      const buffer = await wb.xlsx.writeBuffer();
      saveAs(new Blob([buffer]), `Template_Penugasan_PKL_${eligibleClass}.xlsx`);
      showToast("Template Excel Penugasan PKL berhasil diunduh!");
    } catch (err) {
      console.error("Gagal men-generate template:", err);
      showToast("Gagal mengunduh template Excel", "error");
    }
  };

  // === PARSER IMPOR EXCEL PENUGASAN ===
  const handleFileSelectForImport = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const buffer = await file.arrayBuffer();
      const wb = new ExcelJS.Workbook();
      await wb.xlsx.load(buffer);

      const ws = wb.worksheets[0];
      if (!ws) {
        showToast("File excel tidak memiliki worksheet.", "error");
        return;
      }

      let headerRowIdx = 1;
      let colMap = {};

      ws.eachRow((row, rowNumber) => {
        if (Object.keys(colMap).length === 0) {
          row.eachCell((cell, colNumber) => {
            const val = String(cell.value || '').toLowerCase().trim();
            if (val.includes('nis')) colMap.nis = colNumber;
            else if (val.includes('kode') && val.includes('guru')) colMap.kodeGuru = colNumber;
            else if (val.includes('guru') && !colMap.kodeGuru) colMap.kodeGuru = colNumber;
            else if ((val.includes('id') || val.includes('no')) && val.includes('perusahaan')) colMap.noPerusahaan = colNumber;
            else if (val.includes('perusahaan') && !colMap.noPerusahaan) colMap.noPerusahaan = colNumber;
            else if (val.includes('nama') && !val.includes('guru') && !val.includes('perusahaan')) colMap.nama = colNumber;
          });
          if (colMap.nis) {
            headerRowIdx = rowNumber;
          }
        }
      });

      if (!colMap.nis) {
        showToast("Kolom NIS tidak ditemukan. Gunakan template yang disediakan.", "error");
        return;
      }

      const previewRows = [];

      ws.eachRow((row, rowNumber) => {
        if (rowNumber <= headerRowIdx) return;

        const getCellVal = (col) => {
          if (!col) return '';
          const cell = row.getCell(col);
          const v = cell.value;
          if (v === null || v === undefined) return '';
          if (typeof v === 'object' && v.text) return String(v.text).trim();
          return String(v).trim();
        };

        const rawNis = getCellVal(colMap.nis);
        if (!rawNis) return;

        const rawKodeGuru = getCellVal(colMap.kodeGuru);
        const rawNoPerusahaan = getCellVal(colMap.noPerusahaan);
        const rawNama = getCellVal(colMap.nama);

        const student = pklStudents.find(s => String(s.nis).trim() === rawNis);

        let matchedTeacher = null;
        if (rawKodeGuru) {
          const qGuru = rawKodeGuru.toLowerCase();
          matchedTeacher = teachers.find(t => 
            String(t.code || t.id || '').trim().toLowerCase() === qGuru ||
            String(t.nip || '').trim() === rawKodeGuru ||
            String(t.name || t.nama || '').trim().toLowerCase() === qGuru
          );
        }

        let matchedCompany = null;
        if (rawNoPerusahaan) {
          const qComp = rawNoPerusahaan.toLowerCase();
          matchedCompany = perusahaanPKL.find(p => 
            String(p.id).trim() === rawNoPerusahaan ||
            String(p.nama_perusahaan || '').trim().toLowerCase() === qComp
          );
        }

        let status = 'valid';
        let message = 'Siap ditugaskan';

        if (!student) {
          status = 'error';
          message = 'NIS siswa tidak terdaftar di sistem';
        } else if (!rawKodeGuru && !rawNoPerusahaan) {
          status = 'warning';
          message = 'Kode guru dan perusahaan kosong';
        } else if (rawKodeGuru && !matchedTeacher) {
          status = 'warning';
          message = `Kode guru "${rawKodeGuru}" tidak ditemukan di master guru`;
        } else if (rawNoPerusahaan && !matchedCompany) {
          status = 'warning';
          message = `ID/Nama perusahaan "${rawNoPerusahaan}" tidak ditemukan`;
        }

        previewRows.push({
          rowNumber,
          nis: rawNis,
          nama: student?.nama || rawNama || '-',
          kelas: student?.kelas || '-',
          jurusan: student?.jurusan || '-',
          rawKodeGuru,
          teacherCode: matchedTeacher ? (matchedTeacher.code || matchedTeacher.id) : null,
          teacherName: matchedTeacher ? (matchedTeacher.name || matchedTeacher.nama) : (rawKodeGuru ? `Tidak ditemukan (${rawKodeGuru})` : '-'),
          rawNoPerusahaan,
          locationId: matchedCompany ? matchedCompany.id : null,
          locationName: matchedCompany ? matchedCompany.nama_perusahaan : (rawNoPerusahaan ? `Tidak ditemukan (${rawNoPerusahaan})` : '-'),
          status,
          message
        });
      });

      if (previewRows.length === 0) {
        showToast("Tidak ada baris data siswa yang ditemukan di file Excel.", "error");
        return;
      }

      setImportPreviewRows(previewRows);
      setShowImportModal(true);
    } catch (err) {
      console.error("Gagal membaca file Excel:", err);
      showToast("Gagal membaca file Excel: " + (err.message || "Format tidak didukung"), "error");
    } finally {
      e.target.value = '';
    }
  };

  // === EKSEKUSI SIMPAN PENUGASAN BULK ===
  const handleExecuteBulkImport = async () => {
    const validUpdates = importPreviewRows.filter(r => r.status === 'valid' || (r.status === 'warning' && (r.teacherCode || r.locationId)));
    if (validUpdates.length === 0) {
      showToast("Tidak ada data yang valid untuk disimpan.", "error");
      return;
    }

    setIsProcessingImport(true);
    const token = getToken();

    try {
      const payload = {
        updates: validUpdates.map(r => ({
          nis: r.nis,
          location_id: r.locationId ? Number(r.locationId) : null,
          teacher_code: r.teacherCode || null
        }))
      };

      const res = await fetch("/api/monitoring/pkl-students/bulk", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        showToast(`Berhasil menugaskan ${validUpdates.length} siswa PKL secara massal!`);
        setShowImportModal(false);
        setImportPreviewRows([]);
        fetchPKLData();
      } else {
        const data = await res.json().catch(() => ({}));
        showToast("Gagal menyimpan penugasan massal: " + (data.error || "Terjadi kesalahan"), "error");
      }
    } catch (e) {
      showToast("Gagal menghubungi server.", "error");
    } finally {
      setIsProcessingImport(false);
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6 animate-in fade-in duration-300 pb-10">
      {/* Top Banner Header */}
      <PageHeader
        icon={Users}
        title="Data Siswa PKL"
        description={`Manajemen ${pklStudents.length} siswa kelas ${eligibleClass} sinkron otomatis dari Master Data.`}
        rightContent={
          <div className="flex items-center gap-2 flex-wrap">
            <Button
              variant="outline"
              size="sm"
              onClick={handleDownloadTemplate}
              className="flex items-center gap-1.5 font-bold shadow-[var(--ui-shadow-control)] bg-emerald-50 text-emerald-800 border-emerald-200/80 hover:bg-emerald-100"
              title="Unduh template excel multi-sheet untuk penugasan guru & perusahaan"
            >
              <FileSpreadsheet size={13} strokeWidth={2.5} className="text-emerald-600" /> 
              <span>Template Excel</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const f = document.createElement('input'); 
                f.type = 'file'; 
                f.accept = '.xlsx,.xls'; 
                f.onchange = handleFileSelectForImport; 
                f.click();
              }}
              className="flex items-center gap-1.5 font-bold shadow-[var(--ui-shadow-control)]"
              title="Impor hasil pencocokan kode guru & nomor perusahaan dari Excel"
            >
              <Upload size={13} strokeWidth={2.5} /> Impor Penugasan
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleExport}
              className="flex items-center gap-1.5 font-bold shadow-[var(--ui-shadow-control)]"
            >
              <Download size={13} strokeWidth={2.5} /> Ekspor Data
            </Button>
          </div>
        }
      />

      {/* 3 Interactive Quick Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 sm:gap-4">
        <div 
          onClick={() => { setFilterStatus('Semua'); }}
          className={`bg-white rounded-[var(--ui-radius-card)] p-4 sm:p-5 border cursor-pointer transition-all duration-200 flex items-center justify-between shadow-[var(--ui-shadow-card)] hover:shadow-[var(--ui-shadow-card-hover)] hover:-translate-y-0.5 ${
            filterStatus === 'Semua' ? 'border-[var(--ui-primary)] ring-2 ring-[var(--ui-primary)]/20' : 'border-slate-200/80'
          }`}
        >
          <div>
            <span className="text-[10px] sm:text-[11px] font-black uppercase tracking-wider text-slate-400 block mb-1">
              TOTAL SISWA PKL
            </span>
            <div className="flex items-baseline gap-2">
              <h3 className="text-2xl sm:text-3xl font-black text-slate-800 tracking-tight">{totalCount}</h3>
              <span className="text-xs font-bold text-slate-400">Kelas {eligibleClass}</span>
            </div>
          </div>
          <div className="w-11 h-11 rounded-[var(--ui-radius-control)] bg-indigo-50 text-indigo-600 border border-indigo-200/60 flex items-center justify-center shrink-0 shadow-xs">
            <Users size={22} strokeWidth={2.5} />
          </div>
        </div>

        <div 
          onClick={() => { setFilterStatus('Sudah PKL'); }}
          className={`bg-white rounded-[var(--ui-radius-card)] p-4 sm:p-5 border cursor-pointer transition-all duration-200 flex items-center justify-between shadow-[var(--ui-shadow-card)] hover:shadow-[var(--ui-shadow-card-hover)] hover:-translate-y-0.5 ${
            filterStatus === 'Sudah PKL' ? 'border-emerald-500 ring-2 ring-emerald-500/20' : 'border-slate-200/80'
          }`}
        >
          <div>
            <span className="text-[10px] sm:text-[11px] font-black uppercase tracking-wider text-emerald-600 block mb-1">
              SUDAH DITEMPATKAN
            </span>
            <div className="flex items-baseline gap-2">
              <h3 className="text-2xl sm:text-3xl font-black text-emerald-700 tracking-tight">{sudahPklCount}</h3>
              <span className="text-xs font-bold text-emerald-600">
                ({totalCount > 0 ? Math.round((sudahPklCount / totalCount) * 100) : 0}%)
              </span>
            </div>
          </div>
          <div className="w-11 h-11 rounded-[var(--ui-radius-control)] bg-emerald-50 text-emerald-600 border border-emerald-200/60 flex items-center justify-center shrink-0 shadow-xs">
            <CheckCircle2 size={22} strokeWidth={2.5} />
          </div>
        </div>

        <div 
          onClick={() => { setFilterStatus('Belum PKL'); }}
          className={`bg-white rounded-[var(--ui-radius-card)] p-4 sm:p-5 border cursor-pointer transition-all duration-200 flex items-center justify-between shadow-[var(--ui-shadow-card)] hover:shadow-[var(--ui-shadow-card-hover)] hover:-translate-y-0.5 ${
            filterStatus === 'Belum PKL' ? 'border-rose-500 ring-2 ring-rose-500/20' : 'border-slate-200/80'
          }`}
        >
          <div>
            <span className="text-[10px] sm:text-[11px] font-black uppercase tracking-wider text-rose-600 block mb-1">
              BELUM DITEMPATKAN
            </span>
            <div className="flex items-baseline gap-2">
              <h3 className="text-2xl sm:text-3xl font-black text-rose-700 tracking-tight">{belumPklCount}</h3>
              <span className="text-xs font-bold text-rose-500">
                ({totalCount > 0 ? Math.round((belumPklCount / totalCount) * 100) : 0}%)
              </span>
            </div>
          </div>
          <div className="w-11 h-11 rounded-[var(--ui-radius-control)] bg-rose-50 text-rose-600 border border-rose-200/60 flex items-center justify-center shrink-0 shadow-xs">
            <XCircle size={22} strokeWidth={2.5} />
          </div>
        </div>
      </div>

      {/* Main Filter & Search Control Panel (Sangat Rapi & Ergonomis) */}
      <div className="bg-white rounded-[var(--ui-radius-card)] p-4 sm:p-5 border border-slate-200/80 shadow-[var(--ui-shadow-card)] space-y-4">
        {/* Row 1: Search Bar + Status Tabs */}
        <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={e => { setSearch(e.target.value); }}
              placeholder="Cari nama siswa, NIS, atau kelas..."
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

          {/* Status Tabs */}
          <div className="flex items-center gap-1 bg-[var(--ui-surface-muted)] p-1 rounded-[var(--ui-radius-control)] border border-[var(--ui-border-muted)] shrink-0 overflow-x-auto">
            {['Semua', 'Sudah PKL', 'Belum PKL'].map(st => (
              <button
                key={st}
                type="button"
                onClick={() => { setFilterStatus(st); }}
                className={`px-3.5 py-1.5 rounded-[var(--ui-radius-small)] text-xs font-black transition-all cursor-pointer border-none whitespace-nowrap ${
                  filterStatus === st 
                    ? 'bg-white text-slate-800 shadow-xs' 
                    : 'text-slate-500 hover:text-slate-800 bg-transparent'
                }`}
              >
                {st}
              </button>
            ))}
          </div>

          {/* Mobile Filter Toggle Button */}
          <button
            type="button"
            onClick={() => setShowMobileFilters(!showMobileFilters)}
            className="md:hidden flex items-center justify-center gap-2 py-2 px-3 bg-[var(--ui-surface-muted)] hover:bg-slate-100 text-slate-700 font-bold text-xs rounded-[var(--ui-radius-control)] transition-all border border-[var(--ui-border-muted)] cursor-pointer"
          >
            <Filter size={14} />
            <span>Filter Tambahan</span>
          </button>
        </div>

        {/* Row 2: Tingkat Selector, Filter Kelas, Jurusan, dan Sortir */}
        <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-3 border-t border-[var(--ui-border-muted)] ${showMobileFilters ? 'block space-y-3 sm:space-y-0' : 'hidden md:grid'}`}>
          {/* Tingkat PKL Switcher (Moved here for high usability!) */}
          <div>
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1 block">Tingkat Peserta PKL:</label>
            <div className="flex items-center p-0.5 bg-[var(--ui-surface-muted)] rounded-[var(--ui-radius-control)] border border-[var(--ui-border-soft)] h-9">
              {["X", "XI", "XII"].map(lvl => (
                <button
                  key={lvl}
                  type="button"
                  onClick={() => handleTingkatChange(lvl)}
                  className={`flex-1 h-7.5 rounded-[var(--ui-radius-small)] text-xs font-black transition-all cursor-pointer border-none flex items-center justify-center gap-1 ${
                    eligibleClass === lvl 
                      ? 'bg-[var(--ui-primary)] text-white shadow-xs' 
                      : 'text-slate-600 hover:text-slate-900 bg-transparent'
                  }`}
                >
                  Kelas {lvl}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1 block">Filter Kelas:</label>
            <CustomSelect
              value={filterKelas}
              onChange={val => { setFilterKelas(val); }}
              options={kelasOptions.map(k => ({ value: k, label: k === 'Semua' ? 'Semua Kelas' : `Kelas ${k}` }))}
              placeholder="Semua Kelas"
              searchable={kelasOptions.length > 6}
            />
          </div>

          <div>
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1 block">Filter Jurusan:</label>
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
                { value: 'kelas_nis', label: 'Per Kelas & NIS (Standar)' },
                { value: 'nama_asc', label: 'Nama Siswa (A - Z)' },
                { value: 'nama_desc', label: 'Nama Siswa (Z - A)' },
                { value: 'nis_asc', label: 'Nomor NIS (Kecil - Besar)' },
                { value: 'status_belum', label: 'Belum PKL Dahulu' },
                { value: 'status_sudah', label: 'Sudah PKL Dahulu' },
              ]}
            />
          </div>
        </div>
      </div>

      {/* Main Table View */}
      <div className="bg-white rounded-[var(--ui-radius-card)] border border-slate-200/80 shadow-[var(--ui-shadow-card)] overflow-hidden">
        {/* DESKTOP TABLE VIEW */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead>
              <tr className="bg-[var(--ui-surface-muted)] border-b border-[var(--ui-border-muted)] text-slate-500 text-[11px] font-black uppercase tracking-wider">
                <th className="px-4 py-3.5">SISWA</th>
                <th className="px-4 py-3.5">JURUSAN</th>
                <th className="px-4 py-3.5">PERUSAHAAN PKL</th>
                <th className="px-4 py-3.5">GURU PEMBIMBING</th>
                <th className="px-4 py-3.5 text-center">STATUS</th>
                <th className="px-4 py-3.5 text-right">AKSI</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--ui-border-muted)]">
              {paginatedData.map(s => {
                const guru = teachers.find(g => String(g.code || g.id) === String(s.guruPembimbingCode));
                const perusahaan = perusahaanPKL.find(p => String(p.id) === String(s.perusahaanId));
                
                return (
                  <tr key={s.id} className="hover:bg-[var(--ui-surface-muted)] transition-colors">
                    {/* Siswa info */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <Avatar name={s.nama} size="sm" />
                        <div className="min-w-0">
                          <p className="font-extrabold text-slate-800 text-xs truncate max-w-[200px]" title={s.nama}>{s.nama}</p>
                          <p className="text-[10.5px] font-semibold text-slate-400 mt-0.5">NIS: {s.nis} • <span className="text-slate-600 font-bold">{s.kelas}</span></p>
                        </div>
                      </div>
                    </td>

                    {/* Jurusan */}
                    <td className="px-4 py-3">
                      <span className={`px-2.5 py-0.5 rounded-[var(--ui-radius-pill)] font-black text-[10px] uppercase border ${getMajorBadgeStyle(s.jurusan)}`}>
                        {s.jurusan}
                      </span>
                    </td>

                    {/* Perusahaan PKL */}
                    <td className="px-4 py-3">
                      {perusahaan ? (
                        <div className="flex flex-col gap-0.5 min-w-0">
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded bg-indigo-50 text-indigo-600 border border-indigo-100 flex items-center justify-center shrink-0">
                              <Building2 size={13} />
                            </div>
                            <span className="font-bold text-slate-800 text-xs truncate max-w-[220px]" title={perusahaan.nama_perusahaan}>
                              {perusahaan.nama_perusahaan}
                            </span>
                          </div>
                          {(() => {
                            const dist = calculateDistanceKm(schoolLat, schoolLng, perusahaan.lat, perusahaan.lng);
                            return dist !== null ? (
                              <span className="inline-flex items-center gap-1 text-[10.5px] font-semibold text-sky-700 pl-8">
                                <Compass size={11} className="text-sky-500 shrink-0" />
                                {dist} km dari sekolah
                              </span>
                            ) : null;
                          })()}
                        </div>
                      ) : (
                        <span className="text-[11px] font-semibold text-slate-400 bg-slate-100/70 px-2 py-0.5 rounded border border-slate-200/60">
                          Belum Ditempatkan
                        </span>
                      )}
                    </td>

                    {/* Guru Pembimbing */}
                    <td className="px-4 py-3">
                      {guru ? (
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded bg-indigo-50 text-indigo-600 border border-indigo-100 flex items-center justify-center shrink-0">
                            <GraduationCap size={13} />
                          </div>
                          <span className="font-bold text-slate-700 text-xs truncate max-w-[180px]" title={guru.name || guru.nama}>
                            {guru.name || guru.nama}
                          </span>
                        </div>
                      ) : (
                        <span className="text-[11px] font-semibold text-slate-400 bg-slate-100/70 px-2 py-0.5 rounded border border-slate-200/60">
                          Belum Ditugaskan
                        </span>
                      )}
                    </td>

                    {/* Status PKL */}
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-block px-2.5 py-0.5 rounded-[var(--ui-radius-pill)] text-[10px] font-black border shadow-xs ${
                        s.statusPKL === 'Sudah PKL'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200/80'
                          : 'bg-rose-50 text-rose-700 border-rose-200/80'
                      }`}>
                        {s.statusPKL}
                      </span>
                    </td>

                    {/* Aksi Penugasan */}
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => setSelectedSiswa(s)}
                        className="px-3 py-1 text-[11px] font-extrabold text-[var(--ui-primary)] bg-[var(--ui-primary)]/10 hover:bg-[var(--ui-primary)] hover:text-white border border-[var(--ui-primary)]/20 rounded-[var(--ui-radius-control)] transition-all cursor-pointer inline-flex items-center gap-1 active:scale-95 shadow-xs"
                      >
                        <span>Penugasan</span>
                        <ChevronRight size={13} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* MOBILE CARD VIEW */}
        <div className="md:hidden divide-y divide-[var(--ui-border-muted)]">
          {paginatedData.map(s => {
            const guru = teachers.find(g => String(g.code || g.id) === String(s.guruPembimbingCode));
            const perusahaan = perusahaanPKL.find(p => String(p.id) === String(s.perusahaanId));

            return (
              <div key={s.id} className="p-3.5 flex flex-col gap-2.5">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <Avatar name={s.nama} size="sm" />
                    <div>
                      <h4 className="font-bold text-xs text-slate-800">{s.nama}</h4>
                      <p className="text-[10px] text-slate-400 font-semibold">{s.nis} • {s.kelas}</p>
                    </div>
                  </div>
                  <span className={`px-2 py-0.5 rounded-[var(--ui-radius-pill)] text-[9px] font-black border ${
                    s.statusPKL === 'Sudah PKL'
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      : 'bg-rose-50 text-rose-700 border-rose-200'
                  }`}>
                    {s.statusPKL}
                  </span>
                </div>

                <div className="bg-[var(--ui-surface-muted)] p-2 rounded-[var(--ui-radius-control)] border border-[var(--ui-border-muted)] space-y-1.5 text-[11px]">
                  <div className="flex justify-between items-start">
                    <span className="text-slate-400 font-medium">Perusahaan:</span>
                    <div className="text-right">
                      <span className="font-bold text-slate-700 truncate max-w-[180px] block">{perusahaan?.nama_perusahaan || 'Belum Ditempatkan'}</span>
                      {perusahaan && (() => {
                        const dist = calculateDistanceKm(schoolLat, schoolLng, perusahaan.lat, perusahaan.lng);
                        return dist !== null ? (
                          <span className="inline-flex items-center gap-1 text-[10px] text-sky-700 font-bold">
                            <Compass size={10} className="text-sky-500" />
                            {dist} km dari sekolah
                          </span>
                        ) : null;
                      })()}
                    </div>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400 font-medium">Pembimbing:</span>
                    <span className="font-bold text-slate-700 truncate max-w-[180px]">{guru?.name || guru?.nama || 'Belum Ditugaskan'}</span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setSelectedSiswa(s)}
                  className="w-full py-1.5 text-xs font-bold text-[var(--ui-primary)] bg-[var(--ui-primary)]/10 rounded-[var(--ui-radius-control)] border border-[var(--ui-primary)]/20 flex items-center justify-center gap-1"
                >
                  <span>Atur Penugasan PKL</span>
                  <ChevronRight size={13} />
                </button>
              </div>
            );
          })}
        </div>

        {/* Empty State */}
        {filtered.length === 0 && (
          <div className="py-16 px-4 text-center">
            <Users size={36} className="mx-auto text-slate-300 mb-2" />
            <h4 className="text-sm font-bold text-slate-700">Tidak ada data siswa PKL</h4>
            <p className="text-xs text-slate-400 mt-1">Coba sesuaikan kata kunci pencarian atau filter yang aktif.</p>
          </div>
        )}

        {/* Pagination Controls */}
        <PaginationBar />
      </div>

      {/* Modern Modal Penugasan PKL */}
      {selectedSiswa && (
        <Modal
          isOpen={Boolean(selectedSiswa)}
          onClose={() => setSelectedSiswa(null)}
          title="Atur Penugasan Siswa PKL"
          maxWidth="max-w-lg"
        >
          <div className="space-y-4">
            {/* Student Info Card */}
            <div className="p-3.5 bg-[var(--ui-surface-muted)] rounded-[var(--ui-radius-card)] border border-[var(--ui-border-muted)] flex items-center gap-3">
              <Avatar name={selectedSiswa.nama} size="lg" />
              <div className="min-w-0 flex-1">
                <h3 className="font-extrabold text-sm text-slate-800 truncate">{selectedSiswa.nama}</h3>
                <p className="text-xs text-slate-400 font-medium">NIS: {selectedSiswa.nis} • Kelas: {selectedSiswa.kelas}</p>
                <span className={`mt-1 inline-block px-2 py-0.5 text-[10px] font-black rounded border ${getMajorBadgeStyle(selectedSiswa.jurusan)}`}>
                  Jurusan {selectedSiswa.jurusan}
                </span>
              </div>
            </div>

            {/* Assignment Form */}
            <div className="space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Perusahaan Mitra (DUDI)
                </label>
                <CustomSelect
                  value={selectedSiswa.perusahaanId || ""}
                  onChange={(val) => setSelectedSiswa({ ...selectedSiswa, perusahaanId: val })}
                  options={[
                    { value: "", label: "-- Belum Ditempatkan --" },
                    ...perusahaanPKL.map(p => ({ 
                      value: p.id, 
                      label: `${p.nama_perusahaan} (${p.jurusan || p.kota || 'Umum'})` 
                    }))
                  ]}
                  placeholder="Pilih Perusahaan PKL"
                  searchable={true}
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Guru Pembimbing PKL
                </label>
                <CustomSelect
                  value={selectedSiswa.guruPembimbingCode || ""}
                  onChange={(val) => setSelectedSiswa({ ...selectedSiswa, guruPembimbingCode: val })}
                  options={[
                    { value: "", label: "-- Belum Ditugaskan --" },
                    ...teachers.map(g => ({ 
                      value: g.code || g.id, 
                      label: `${g.name || g.nama} (${g.mapel || g.subject || 'Guru'})` 
                    }))
                  ]}
                  placeholder="Pilih Guru Pembimbing"
                  searchable={true}
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedSiswa(null)}
                >
                  Batal
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleSaveAssignment}
                  disabled={isSavingSettings}
                  className="flex items-center gap-1.5"
                >
                  {isSavingSettings ? <RefreshCw size={13} className="animate-spin" /> : <Check size={14} />}
                  <span>{isSavingSettings ? 'Menyimpan...' : 'Simpan Penugasan'}</span>
                </Button>
              </div>
            </div>
          </div>
        </Modal>
      )}

      {/* MODAL PRATINJAU IMPOR PENUGASAN EXCEL */}
      {showImportModal && (
        <Modal
          isOpen={showImportModal}
          onClose={() => { if (!isProcessingImport) setShowImportModal(false); }}
          title="Pratinjau Impor Penugasan Siswa PKL"
          maxWidth="max-w-4xl"
        >
          <div className="p-4 sm:p-6 space-y-4">
            {/* Header Ringkasan */}
            <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-slate-50 rounded-[var(--ui-radius-control)] border border-slate-200/80">
              <div className="flex items-center gap-2">
                <span className="text-xs font-black text-slate-700">Hasil Pembacaan Excel:</span>
                <span className="px-2 py-0.5 rounded-full bg-slate-200 text-slate-700 text-xs font-bold">
                  {importPreviewRows.length} Siswa
                </span>
                <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold flex items-center gap-1">
                  <Check size={12} /> {importPreviewRows.filter(r => r.status === 'valid').length} Cocok Sempurna
                </span>
                {importPreviewRows.filter(r => r.status === 'warning').length > 0 && (
                  <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-xs font-bold flex items-center gap-1">
                    <AlertCircle size={12} /> {importPreviewRows.filter(r => r.status === 'warning').length} Perlu Perhatian
                  </span>
                )}
                {importPreviewRows.filter(r => r.status === 'error').length > 0 && (
                  <span className="px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 text-xs font-bold flex items-center gap-1">
                    <XCircle size={12} /> {importPreviewRows.filter(r => r.status === 'error').length} Gagal/Salah
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={importSearch}
                  onChange={e => setImportSearch(e.target.value)}
                  placeholder="Cari nama / NIS..."
                  className="px-2.5 py-1 text-xs border border-slate-300 rounded-[var(--ui-radius-small)] font-bold focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            {/* Table Preview */}
            <div className="max-h-[380px] overflow-y-auto border border-slate-200 rounded-[var(--ui-radius-control)]">
              <table className="w-full text-xs text-left">
                <thead className="sticky top-0 bg-slate-100 border-b border-slate-200 text-[11px] font-black text-slate-600 uppercase">
                  <tr>
                    <th className="px-3 py-2.5">Siswa</th>
                    <th className="px-3 py-2.5">Kode Guru</th>
                    <th className="px-3 py-2.5">Guru Pembimbing</th>
                    <th className="px-3 py-2.5">No Perusahaan</th>
                    <th className="px-3 py-2.5">Perusahaan PKL</th>
                    <th className="px-3 py-2.5 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {importPreviewRows
                    .filter(r => {
                      if (!importSearch) return true;
                      const q = importSearch.toLowerCase();
                      return r.nama.toLowerCase().includes(q) || r.nis.includes(q) || (r.teacherName && r.teacherName.toLowerCase().includes(q)) || (r.locationName && r.locationName.toLowerCase().includes(q));
                    })
                    .map((r, i) => (
                      <tr key={i} className={`hover:bg-slate-50 ${r.status === 'error' ? 'bg-rose-50/50' : r.status === 'warning' ? 'bg-amber-50/30' : ''}`}>
                        <td className="px-3 py-2">
                          <p className="font-extrabold text-slate-800">{r.nama}</p>
                          <p className="text-[10px] text-slate-400 font-medium">NIS: {r.nis} • {r.kelas}</p>
                        </td>
                        <td className="px-3 py-2 font-mono font-bold text-indigo-600">
                          {r.rawKodeGuru || '-'}
                        </td>
                        <td className="px-3 py-2">
                          <span className={`font-bold ${r.teacherCode ? 'text-slate-800' : 'text-slate-400'}`}>
                            {r.teacherName}
                          </span>
                        </td>
                        <td className="px-3 py-2 font-mono font-bold text-purple-600">
                          {r.rawNoPerusahaan || '-'}
                        </td>
                        <td className="px-3 py-2">
                          <span className={`font-bold ${r.locationId ? 'text-slate-800' : 'text-slate-400'}`}>
                            {r.locationName}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-center">
                          <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                            r.status === 'valid'
                              ? 'bg-emerald-100 text-emerald-800'
                              : r.status === 'warning'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-rose-100 text-rose-800'
                          }`} title={r.message}>
                            {r.status === 'valid' ? 'Cocok' : r.status === 'warning' ? 'Perhatian' : 'Gagal'}
                          </span>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>

            {/* Footer Action */}
            <div className="pt-2 flex items-center justify-between border-t border-slate-200">
              <p className="text-xs text-slate-500 font-medium">
                Pastikan data yang cocok sudah benar sebelum disimpan ke database.
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowImportModal(false)}
                  disabled={isProcessingImport}
                >
                  Batal
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleExecuteBulkImport}
                  disabled={isProcessingImport || importPreviewRows.filter(r => r.status === 'valid' || (r.status === 'warning' && (r.teacherCode || r.locationId))).length === 0}
                  className="flex items-center gap-1.5"
                >
                  {isProcessingImport ? <RefreshCw size={13} className="animate-spin" /> : <CheckCheck size={14} />}
                  <span>{isProcessingImport ? 'Menyimpan Penugasan...' : `Terapkan & Simpan Penugasan (${importPreviewRows.filter(r => r.status === 'valid' || (r.status === 'warning' && (r.teacherCode || r.locationId))).length})`}</span>
                </Button>
              </div>
            </div>
          </div>
        </Modal>
      )}

      {/* Floating Toast Notification */}
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

export default DataSiswa;
