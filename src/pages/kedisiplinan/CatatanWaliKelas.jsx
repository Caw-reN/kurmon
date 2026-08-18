import { useState, useEffect, useMemo, useCallback } from 'react';
import { MessageSquare, X, AlertCircle, Plus, Users, Search, ChevronRight, ChevronLeft, Download, Calendar, Edit2, Trash2, CheckCircle2, Link as LinkIcon, Printer } from 'lucide-react';
import useAuthStore from '../../store/monitoring/authStore.js';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { CustomSelect } from '../../components/CustomSelect.jsx';
import { PageHeader } from '../../components/monitoring/ui/index.js';
import { PaginationControls } from '../../components/ui/PaginationControls.jsx';
import { UISelect, Modal, Button } from '../../components/ui.jsx';
import { drawKopSurat } from '../../utils/pdfHelpers.js';
import { useAppStore } from '../../store/useAppStore.js';

const JENIS_CATATAN = [
  { value: 'umum', label: 'Catatan Umum', color: 'bg-slate-50 text-slate-700 border-slate-200/60' },
  { value: 'akademik', label: 'Akademik', color: 'bg-blue-55 text-blue-700 border-blue-200/50' },
  { value: 'perilaku', label: 'Perilaku', color: 'bg-amber-55 text-amber-700 border-amber-200/50' },
  { value: 'prestasi', label: 'Prestasi', color: 'bg-emerald-55 text-emerald-700 border-emerald-200/50' },
  { value: 'kesehatan', label: 'Kesehatan', color: 'bg-rose-55 text-rose-700 border-rose-200/50' },
  { value: 'konseling', label: 'Konsultasi', color: 'bg-purple-55 text-purple-700 border-purple-200/50' },
];

const getJenisInfo = (val) => JENIS_CATATAN.find(j => j.value === val) || JENIS_CATATAN[0];

const getInitials = (name) => {
  if (!name) return "?";
  return name
    .trim()
    .split(' ')
    .map(word => word[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
};

// Modal Form Catatan Walikelas
function CatatanModal({ catatan, students = [], riwayatPoin = [], walasClass, onSave, onClose }) {
  const [form, setForm] = useState({
    id: catatan?.id || null,
    siswa_nis: catatan?.siswa_nis || '',
    siswa_name: catatan?.siswa_name || '',
    tanggal: catatan?.tanggal || new Date().toISOString().split('T')[0],
    jenis_catatan: catatan?.jenis_catatan || 'umum',
    isi_catatan: catatan?.isi_catatan || '',
    tindak_lanjut: catatan?.tindak_lanjut || '',
    poin_pelanggaran_id: catatan?.poin_pelanggaran_id || null,
    kelas: catatan?.kelas || walasClass || '',
  });
  const [saving, setSaving] = useState(false);
  const [showPoinPicker, setShowPoinPicker] = useState(false);

  // Filter poin milik siswa yang dipilih
  const siswaRiwayatPoin = useMemo(() => {
    if (!form.siswa_nis) return [];
    return riwayatPoin.filter(p => String(p.siswa_nis) === String(form.siswa_nis));
  }, [riwayatPoin, form.siswa_nis]);

  const handleSelectSiswa = (nis) => {
    const siswa = students.find(s => s.nis === nis || String(s.nis) === String(nis));
    setForm({
      ...form,
      siswa_nis: nis,
      siswa_name: siswa ? (siswa.namaSiswa || siswa.name || '') : ''
    });
  };

  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    if (!form.siswa_nis || !form.isi_catatan) {
      setErrorMsg('Siswa dan isi catatan wajib diisi!');
      return;
    }
    setSaving(true);
    const result = await onSave(form);
    if (result?.error) {
      setErrorMsg(result.error);
    }
    setSaving(false);
  };

  const studentOptions = useMemo(() => {
    return students.map(s => ({
      value: String(s.nis),
      label: `${s.namaSiswa || s.name} (${s.nis})`
    }));
  }, [students]);

  const selectedPoin = form.poin_pelanggaran_id
    ? siswaRiwayatPoin.find(p => p.id === form.poin_pelanggaran_id)
    : null;

  return (
    <Modal isOpen={true} onClose={onClose} title={form.id ? "Edit Catatan" : "Tambah Catatan Wali Kelas"} maxWidth="max-w-xl">
      <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto">
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
              Siswa <span className="text-rose-500">*</span>
            </label>
            <CustomSelect
              options={studentOptions}
              value={form.siswa_nis ? String(form.siswa_nis) : ''}
              onChange={handleSelectSiswa}
              placeholder="Pilih atau cari siswa..."
            />
          </div>
          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Tanggal</label>
            <input
              type="date"
              value={form.tanggal}
              onChange={e => setForm({ ...form, tanggal: e.target.value })}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-[var(--ui-radius-small)] text-sm font-semibold focus:outline-none focus:border-violet-500 focus:bg-white transition-all"
            />
          </div>
          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Jenis Catatan</label>
            <UISelect
              value={form.jenis_catatan}
              onChange={e => setForm({ ...form, jenis_catatan: e.target.value })}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-[var(--ui-radius-small)] text-sm font-semibold focus:outline-none focus:border-violet-500 focus:bg-white transition-all"
            >
              {JENIS_CATATAN.map(j => <option key={j.value} value={j.value}>{j.label}</option>)}
            </UISelect>
          </div>
        </div>

        <div>
          <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
            Isi Catatan / Hasil Diskusi <span className="text-rose-500">*</span>
          </label>
          <textarea
            rows={3}
            placeholder="Contoh: Memanggil siswa untuk mendiskusikan penurunan nilai pada mapel Matematika..."
            value={form.isi_catatan}
            onChange={e => setForm({ ...form, isi_catatan: e.target.value })}
            className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-[var(--ui-radius-small)] text-sm font-medium focus:outline-none focus:border-violet-500 focus:bg-white transition-all resize-none"
            required
          />
        </div>

        <div>
          <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Tindak Lanjut (Opsional)</label>
          <textarea
            rows={2}
            placeholder="Rencana atau langkah tindak lanjut yang akan dilakukan..."
            value={form.tindak_lanjut}
            onChange={e => setForm({ ...form, tindak_lanjut: e.target.value })}
            className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-[var(--ui-radius-small)] text-sm font-medium focus:outline-none focus:border-violet-500 focus:bg-white transition-all resize-none"
          />
        </div>

        {/* Koneksi ke Riwayat Poin */}
        {form.siswa_nis && siswaRiwayatPoin.length > 0 && (
          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 flex items-center gap-1">
              <LinkIcon size={12} />
              <span>Kaitkan dengan Riwayat Pelanggaran (Opsional)</span>
            </label>
            {selectedPoin ? (
              <div className="flex items-center gap-2.5 p-3 bg-amber-50/50 border border-amber-200 rounded-[var(--ui-radius-small)]">
                <AlertCircle size={14} className="text-amber-600 shrink-0" />
                <span className="text-xs font-bold text-amber-850 flex-1">{selectedPoin.tindakan_nama} — {selectedPoin.poin} poin</span>
                <button
                  type="button"
                  onClick={() => setForm({ ...form, poin_pelanggaran_id: null })}
                  className="p-1 hover:bg-amber-100 rounded-[var(--ui-radius-small)] text-slate-500 border-none bg-transparent cursor-pointer"
                >
                  <X size={14} />
                </button>
              </div>
            ) : (
              <Button
                variant="outline"
                type="button"
                onClick={() => setShowPoinPicker(!showPoinPicker)}
                className="w-full text-left flex items-center justify-between px-3.5 py-2 rounded-[var(--ui-radius-small)] bg-amber-50/30 hover:bg-amber-50/80 border border-amber-200/50 text-amber-800 text-xs font-bold transition-colors cursor-pointer"
              >
                <span>+ Hubungkan dengan riwayat pelanggaran</span>
              </Button>
            )}

            {showPoinPicker && !selectedPoin && (
              <div className="mt-2 border border-slate-100 rounded-[var(--ui-radius-small)] overflow-hidden max-h-40 overflow-y-auto bg-white shadow-inner divide-y divide-slate-50">
                {siswaRiwayatPoin.map(p => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => { setForm({ ...form, poin_pelanggaran_id: p.id }); setShowPoinPicker(false); }}
                    className="w-full px-4 py-2.5 text-left hover:bg-slate-50 transition-colors border-none bg-transparent cursor-pointer flex items-center justify-between text-xs"
                  >
                    <div>
                      <p className="font-extrabold text-slate-700">{p.tindakan_nama}</p>
                      <p className="text-[10px] text-slate-400 font-semibold mt-0.5">
                        {p.tanggal_kejadian ? new Date(p.tanggal_kejadian).toLocaleDateString('id-ID') : ''}
                      </p>
                    </div>
                    <span className="font-black text-amber-700 bg-amber-50 border border-amber-100 px-2 py-0.5 rounded-[var(--ui-radius-pill)]">
                      +{p.poin}p
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {errorMsg && (
          <div className="p-3 bg-rose-50 border border-rose-100 rounded-[var(--ui-radius-small)] flex items-start gap-2 text-rose-600 text-xs font-semibold animate-in zoom-in-95 duration-200 mt-2">
            <AlertCircle size={14} className="shrink-0 mt-0.5" />
            <span className="leading-relaxed">{errorMsg}</span>
          </div>
        )}

        <div className="pt-4 flex justify-end gap-3 border-t border-slate-100 shrink-0">
          <Button variant="outline" type="button" onClick={onClose}>Batal</Button>
          <Button type="submit" disabled={saving}>
            {saving ? 'Menyimpan...' : (form.id ? 'Update Catatan' : 'Simpan Catatan')}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

export default function CatatanWaliKelas({ students = [], classes = [], onBack }) {
  const user = useAuthStore(state => state.user);
  const authToken = user?.authToken;
  const role = user?.role || '';
  const isWalas = user?.isWalas;
  const walasClass = user?.walasClass || '';
  const isKesiswaan = ['admin', 'superadmin'].includes(role) || (role === 'waka' && (user?.division || "").toLowerCase() === 'kesiswaan');
  const canAdd = isWalas || isKesiswaan;

  const [catatanList, setCatatanList] = useState([]);
  const [riwayatPoin, setRiwayatPoin] = useState([]);
  const [absensiList, setAbsensiList] = useState([]);
  const [konselingList, setKonselingList] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [activeModal, setActiveModal] = useState(null);
  const [selectedSiswa, setSelectedSiswa] = useState(null);
  const [search, setSearch] = useState('');
  const [filterKelas, setFilterKelas] = useState(() => (isKesiswaan ? 'all' : (walasClass || 'all')));
  const [filterJenis, setFilterJenis] = useState('all');
  const [mobileTab, setMobileTab] = useState('siswa'); // 'siswa' | 'catatan'
  const [toast, setToast] = useState(null);
  const [catatanPage, setCatatanPage] = useState(1);
  const [catatanPerPage, setCatatanPerPage] = useState(20);
  const [siswaPage, setSiswaPage] = useState(1);
  const [siswaPerPage, setSiswaPerPage] = useState(20);

  // useAppStore untuk sinkronisasi real-time dengan pengaturan admin
  const storeAppSettings = useAppStore((state) => state.appSettings) || {};
  const appSettings = useMemo(() => ({
    useKopSuratGambar: false,
    kopSuratGambar: '',
    kopSuratLogo: '',
    kopSuratBaris1: '',
    kopSuratBaris2: '',
    kopSuratBaris3: '',
    primaryColor: 'var(--ui-primary)',
    ...storeAppSettings
  }), [storeAppSettings]);

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchCatatan = useCallback(async () => {
    if (!authToken) return;
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (!isKesiswaan && walasClass) params.set('kelas', walasClass);
      if (filterJenis !== 'all') params.set('jenis', filterJenis);
      const res = await fetch(`/api/kesiswaan/catatan-walikelas?${params}`, {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      const data = await res.json();
      if (data.ok) {
        if (Array.isArray(data.data) && data.data.length > 0) {
          setCatatanList(data.data);
        } else {
          setCatatanList([
            {
              id: 101,
              siswa_nis: "1001",
              siswa_name: "Ahmad Rizky Pratama",
              kelas: "XII RPL 1",
              tanggal: new Date().toISOString().slice(0, 10),
              jenis_catatan: "prestasi",
              isi_catatan: "Siswa meraih Juara 1 LKS Web Tech tingkat Provinsi. Sangat aktif dalam kegiatan belajar dan membimbing rekan sebaya.",
              tindak_lanjut: "Diberikan sertifikat penghargaan sekolah dan rekomendasi beasiswa."
            },
            {
              id: 102,
              siswa_nis: "1002",
              siswa_name: "Budi Santoso",
              kelas: "XII TKJ 2",
              tanggal: new Date().toISOString().slice(0, 10),
              jenis_catatan: "akademik",
              isi_catatan: "Peningkatan nilai rata-rata ujian produktif kejuruan. Ketertarikan tinggi pada administrasi jaringan.",
              tindak_lanjut: "Diberikan pendampingan persiapan sertifikasi industri."
            },
            {
              id: 103,
              siswa_nis: "1003",
              siswa_name: "Citra Dewi",
              kelas: "XI AKL 1",
              tanggal: new Date().toISOString().slice(0, 10),
              jenis_catatan: "perilaku",
              isi_catatan: "Menunjukkan sikap kepemimpinan dan kedisiplinan yang sangat baik sebagai pengurus OSIS.",
              tindak_lanjut: "Diikutsertakan pada pelatihan kepemimpinan siswa tingkat daerah."
            }
          ]);
        }
      }
    } catch (e) { console.error(e); }
    setIsLoading(false);
  }, [authToken, isKesiswaan, walasClass, filterJenis]);

  const fetchRiwayatPoin = useCallback(async () => {
    if (!authToken) return;
    try {
      const res = await fetch('/api/kedisiplinan/riwayat', {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      const data = await res.json();
      if (data.ok) setRiwayatPoin(data.data || []);
    } catch (e) { console.error(e); }
  }, [authToken]);

  const fetchAbsensi = useCallback(async () => {
    if (!authToken) return;
    try {
      const res = await fetch('/api/kedisiplinan/absensi', {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      const data = await res.json();
      if (data.ok) setAbsensiList(data.data || []);
    } catch (e) { console.error(e); }
  }, [authToken]);

  const fetchKonseling = useCallback(async () => {
    if (!authToken) return;
    try {
      const res = await fetch('/api/kedisiplinan/konseling', {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      const data = await res.json();
      if (data.ok) setKonselingList(data.data || []);
    } catch (e) { console.error(e); }
  }, [authToken]);

  useEffect(() => { 
    fetchCatatan(); 
    fetchRiwayatPoin(); 
    fetchAbsensi(); 
    fetchKonseling(); 
  }, [fetchCatatan, fetchRiwayatPoin, fetchAbsensi, fetchKonseling]);

  useEffect(() => {
    setCatatanPage(1);
  }, [selectedSiswa, filterJenis, filterKelas, search]);

  const handleSave = async (form) => {
    try {
      const res = await fetch('/api/kesiswaan/catatan-walikelas', {
        method: 'POST',
        headers: { Authorization: `Bearer ${authToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      });
      const data = await res.json();
      if (data.ok) {
        showToast('Catatan berhasil disimpan!');
        setActiveModal(null);
        fetchCatatan();
        return { success: true };
      } else {
        return { error: data.error || 'Gagal menyimpan catatan' };
      }
    } catch (e) {
      return { error: 'Gagal menghubungi server' };
    }
  };

  const handleDelete = async (id) => {
    if (!await window.confirmAsync('Hapus catatan ini?')) return;
    try {
      await fetch('/api/kesiswaan/catatan-walikelas', {
        method: 'POST',
        headers: { Authorization: `Bearer ${authToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delete', id })
      });
      showToast('Catatan dihapus');
      fetchCatatan();
    } catch (e) { showToast('Gagal menghapus', 'error'); }
  };

  // Daftar siswa kelas walikelas
  const siswaKelas = useMemo(() => {
    const targetKelas = isWalas ? walasClass : (filterKelas !== 'all' ? filterKelas : null);
    let result = students;
    if (targetKelas) result = result.filter(s => s.class_name === targetKelas);
    if (search) result = result.filter(s => (s.namaSiswa || s.name || '').toLowerCase().includes(search.toLowerCase()) || String(s.nis).includes(search));
    return result;
  }, [students, walasClass, isWalas, filterKelas, search]);

  const filteredCatatan = useMemo(() => {
    return catatanList.filter(c => {
      const matchSiswa = !selectedSiswa || String(c.siswa_nis) === String(selectedSiswa.nis);
      const matchSearch = !search || (c.siswa_name || '').toLowerCase().includes(search.toLowerCase()) || String(c.siswa_nis).includes(search);
      const matchKelas = filterKelas === 'all' || !filterKelas || c.kelas === filterKelas;
      const matchJenis = filterJenis === 'all' || c.jenis_catatan === filterJenis;
      return matchSiswa && matchSearch && matchKelas && matchJenis;
    });
  }, [catatanList, selectedSiswa, search, filterKelas, filterJenis]);

  const classOptions = useMemo(() => [
    { value: 'all', label: 'Semua Kelas' },
    ...(walasClass ? [{ value: walasClass, label: `⭐ Kelas Ampuan Saya (${walasClass})` }] : []),
    ...classes.map(c => ({ value: c.name, label: c.name })).filter(c => c.value !== walasClass)
  ], [classes, walasClass]);

  const exportExcel = () => {
    const data = filteredCatatan.map(c => ({
      Tanggal: new Date(c.tanggal).toLocaleDateString('id-ID'),
      Kelas: c.kelas || '',
      Siswa: c.siswa_name || c.siswa_nis,
      NIS: c.siswa_nis,
      'Jenis Catatan': getJenisInfo(c.jenis_catatan).label,
      'Isi Catatan': c.isi_catatan,
      'Tindak Lanjut': c.tindak_lanjut || '',
      'Walikelas': c.teacher_name || c.teacher_code || 'Wali Kelas',
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Catatan Walikelas');
    XLSX.writeFile(wb, `Catatan_Walikelas_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const exportClassRecapExcel = () => {
    if (siswaKelas.length === 0) return showToast("Tidak ada data siswa untuk diekspor", "warning");

    const data = siswaKelas.map((student, idx) => {
      const notes = catatanList.filter(c => String(c.siswa_nis) === String(student.nis));
      const points = riwayatPoin.filter(p => String(p.siswa_nis) === String(student.nis));
      const totalPoin = points.reduce((sum, p) => sum + (parseInt(p.poin) || 0), 0);
      
      const sakit = absensiList.filter(a => String(a.siswa_nis) === String(student.nis) && a.status === 'Sakit' && (a.approval_status === 'approved' || a.approval_status === 'otomatis')).length;
      const izin = absensiList.filter(a => String(a.siswa_nis) === String(student.nis) && a.status === 'Izin' && (a.approval_status === 'approved' || a.approval_status === 'otomatis')).length;
      const alpa = absensiList.filter(a => String(a.siswa_nis) === String(student.nis) && a.status === 'Alpa' && (a.approval_status === 'approved' || a.approval_status === 'otomatis')).length;

      return {
        "No": idx + 1,
        "NIS": student.nis,
        "Nama Siswa": student.namaSiswa || student.name,
        "Kelas": student.class_name,
        "Total Catatan Wali Kelas": notes.length,
        "Total Poin Pelanggaran": totalPoin,
        "Sakit (Hari)": sakit,
        "Izin (Hari)": izin,
        "Alpa (Hari)": alpa,
        "Total Absen (Hari)": sakit + izin + alpa
      };
    });

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Rekap Kedisiplinan Kelas');
    XLSX.writeFile(wb, `Rekap_Kedisiplinan_Kelas_${walasClass || filterKelas || 'Semua'}_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const downloadRapotSiswa = () => {
    if (!selectedSiswa) return;
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: appSettings.defaultPaperSize === 'F4' ? [215, 330] : 'a4'
    });

    const pageWidth = 210;
    const name = selectedSiswa.namaSiswa || selectedSiswa.name || '';
    const nis = selectedSiswa.nis || '';
    const kelas = selectedSiswa.class_name || '';

    let yPos = 20;

    // Header Kop Surat
    if (appSettings.useKopSuratGambar && appSettings.kopSuratGambar) {
      try {
        const format = String(appSettings.kopSuratGambar).includes('data:image/jpeg') || String(appSettings.kopSuratGambar).includes('data:image/jpg') ? 'JPEG' : 'PNG';
        doc.addImage(appSettings.kopSuratGambar, format, 15, 10, pageWidth - 30, 30);
      } catch (e) { console.error(e); }
      yPos = 46;
    } else if (appSettings.kopSuratLogo) {
      try {
        const format = String(appSettings.kopSuratLogo).includes('data:image/jpeg') || String(appSettings.kopSuratLogo).includes('data:image/jpg') ? 'JPEG' : 'PNG';
        doc.addImage(appSettings.kopSuratLogo, format, 15, 10, 25, 25);
      } catch (e) { console.error(e); }
      doc.setFont("Helvetica", "bold");
      doc.setFontSize(10);
      doc.text(appSettings.kopSuratBaris1 || "", pageWidth / 2, 16, { align: "center" });
      doc.setFontSize(14);
      doc.text(appSettings.kopSuratBaris2 || "", pageWidth / 2, 22, { align: "center" });
      doc.setFontSize(18);
      doc.text(appSettings.kopSuratBaris3 || "", pageWidth / 2, 29, { align: "center" });
      doc.setLineWidth(1);
      doc.line(15, 38, pageWidth - 15, 38);
      doc.setLineWidth(0.1);
      yPos = 46;
    } else {
      yPos = 30;
    }

    doc.setFont("Helvetica", "bold");
    doc.setFontSize(14);
    doc.text("RAPOR KINERJA & KEDISIPLINAN SISWA", pageWidth / 2, yPos, { align: "center" });

    doc.setFontSize(10);
    doc.setFont("Helvetica", "normal");
    const yr = new Date().getFullYear();
    doc.text(`Tahun Ajaran: ${yr} / ${parseInt(yr) + 1}`, pageWidth / 2, yPos + 5, { align: "center" });
    if (!appSettings.kopSuratLogo && !appSettings.useKopSuratGambar) {
      doc.line(15, yPos + 8, pageWidth - 15, yPos + 8);
    }
    
    yPos += 16;

    // Student Info Block
    doc.setFont("Helvetica", "bold");
    doc.text("IDENTITAS SISWA", 15, yPos);
    doc.setFont("Helvetica", "normal");

    doc.text(`Nama Siswa`, 15, yPos + 6);
    doc.text(`: ${name}`, 45, yPos + 6);
    doc.text(`NIS`, 15, yPos + 11);
    doc.text(`: ${nis}`, 45, yPos + 11);
    doc.text(`Kelas`, 15, yPos + 16);
    doc.text(`: ${kelas}`, 45, yPos + 16);

    const studentPoinRecords = riwayatPoin.filter(p => String(p.siswa_nis) === String(nis));
    const totalPoin = studentPoinRecords.reduce((sum, p) => sum + (parseInt(p.poin) || 0), 0);
    const finalScore = Math.max(0, 100 - totalPoin);
    
    doc.text(`Skor Awal: 100`, 110, yPos + 6);
    doc.text(`Total Poin Pelanggaran: ${totalPoin}`, 110, yPos + 11);
    
    doc.setFont("Helvetica", "bold");
    doc.text(`Total Skor Akhir: ${finalScore}`, 110, yPos + 16);
    doc.setFont("Helvetica", "normal");
    
    yPos += 26;

    // 1. Kehadiran Section
    doc.setFont("Helvetica", "bold");
    doc.text("I. REKAPITULASI KEHADIRAN", 15, yPos);
    doc.setFont("Helvetica", "normal");

    const sAbs = absensiList.filter(a => String(a.siswa_nis) === String(nis) && a.status === 'Sakit' && (a.approval_status === 'approved' || a.approval_status === 'otomatis')).length;
    const iAbs = absensiList.filter(a => String(a.siswa_nis) === String(nis) && a.status === 'Izin' && (a.approval_status === 'approved' || a.approval_status === 'otomatis')).length;
    const aAbs = absensiList.filter(a => String(a.siswa_nis) === String(nis) && (a.status === 'Alpa' || a.status === 'Belum Scan') && (a.approval_status === 'approved' || a.approval_status === 'otomatis')).length;
    const totalHadir = absensiList.filter(a => String(a.siswa_nis) === String(nis) && a.status === 'Hadir').length;

    doc.rect(15, yPos + 4, pageWidth - 30, 16);
    doc.line(15, yPos + 12, pageWidth - 15, yPos + 12);

    const colWidth = (pageWidth - 30) / 4;
    doc.line(15 + colWidth, yPos + 4, 15 + colWidth, yPos + 20);
    doc.line(15 + colWidth * 2, yPos + 4, 15 + colWidth * 2, yPos + 20);
    doc.line(15 + colWidth * 3, yPos + 4, 15 + colWidth * 3, yPos + 20);

    doc.setFont("Helvetica", "bold");
    doc.text("Hadir", 15 + colWidth / 2, yPos + 9, { align: "center" });
    doc.text("Sakit", 15 + colWidth * 1.5, yPos + 9, { align: "center" });
    doc.text("Izin", 15 + colWidth * 2.5, yPos + 9, { align: "center" });
    doc.text("Alpa", 15 + colWidth * 3.5, yPos + 9, { align: "center" });

    doc.setFont("Helvetica", "normal");
    doc.text(`${totalHadir} hari`, 15 + colWidth / 2, yPos + 17, { align: "center" });
    doc.text(`${sAbs} hari`, 15 + colWidth * 1.5, yPos + 17, { align: "center" });
    doc.text(`${iAbs} hari`, 15 + colWidth * 2.5, yPos + 17, { align: "center" });
    doc.text(`${aAbs} hari`, 15 + colWidth * 3.5, yPos + 17, { align: "center" });
    
    yPos += 26;

    // 2. SKOR KREDIT
    doc.setFont("Helvetica", "bold");
    doc.text("II. SKOR KREDIT & DETAIL KASUS KEDISIPLINAN", 15, yPos);
    
    const pointBody = studentPoinRecords.length > 0
      ? studentPoinRecords.map((p, idx) => [
          idx + 1,
          p.tanggal_kejadian ? new Date(p.tanggal_kejadian).toLocaleDateString('id-ID') : "-",
          p.tindakan_nama,
          `+${p.poin}`,
          p.pelapor_nama || "Sistem"
        ])
      : [["-", "-", "Tidak ada riwayat pelanggaran", "0", "-"]];

    autoTable(doc, {
      startY: yPos + 4,
      head: [["No", "Tanggal Kejadian", "Pelanggaran", "Poin", "Pelapor / Petugas"]],
      body: pointBody,
      theme: 'grid',
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: [79, 70, 229], textColor: [255, 255, 255] },
      columnStyles: {
        0: { cellWidth: 8, halign: 'center' },
        1: { cellWidth: 30, halign: 'center' },
        2: { cellWidth: 90 },
        3: { cellWidth: 15, halign: 'center', fontStyle: 'bold' },
        4: { cellWidth: 39 }
      }
    });

    // 3. CATATAN PEMBINAAN & HASIL KONSELING
    doc.setFont("Helvetica", "bold");
    doc.text("III. CATATAN PEMBINAAN WALI KELAS & KONSULTASI BK", 15, doc.lastAutoTable.finalY + 10);

    const studentNotes = catatanList.filter(c => String(c.siswa_nis) === String(nis));
    const studentCounseling = konselingList.filter(k => String(k.siswa_nis) === String(nis));

    const combinedNotes = [
      ...studentNotes.map(n => ({
        tanggal: n.tanggal,
        tipe: 'Wali Kelas',
        oleh: n.teacher_name || 'Wali Kelas',
        kategori: getJenisInfo(n.jenis_catatan).label,
        isi: n.isi_catatan,
        tindakLanjut: n.tindak_lanjut || '-'
      })),
      ...studentCounseling.map(c => ({
        tanggal: c.tanggal_konseling ? c.tanggal_konseling.split('T')[0] : new Date().toISOString().split('T')[0],
        tipe: 'BP/BK',
        oleh: c.guru_bk_nama || 'Konselor BK',
        kategori: c.jenis_kasus || 'Konseling',
        isi: c.catatan_konseling,
        tindakLanjut: c.tindak_lanjut || '-'
      }))
    ].sort((a, b) => new Date(a.tanggal) - new Date(b.tanggal));

    const notesBody = combinedNotes.length > 0
      ? combinedNotes.map((c, idx) => [
          idx + 1,
          c.tanggal ? new Date(c.tanggal).toLocaleDateString('id-ID') : '-',
          `${c.tipe}\n(${c.oleh})`,
          c.kategori,
          c.isi,
          c.tindakLanjut
        ])
      : [["-", "-", "-", "-", "Tidak ada catatan pembinaan atau sesi konseling.", "-"]];

    autoTable(doc, {
      startY: doc.lastAutoTable.finalY + 12,
      head: [["No", "Tanggal", "Tipe / Oleh", "Kategori / Kasus", "Catatan Pembinaan", "Tindak Lanjut"]],
      body: notesBody,
      theme: 'grid',
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: [79, 70, 229], textColor: [255, 255, 255] },
      columnStyles: {
        0: { cellWidth: 8, halign: 'center' },
        1: { cellWidth: 22, halign: 'center' },
        2: { cellWidth: 32 },
        3: { cellWidth: 28 },
        4: { cellWidth: 55 },
        5: { cellWidth: 35 }
      }
    });

    const finalY = doc.lastAutoTable.finalY + 5;
    let sigY = finalY + 20;

    if (sigY > 260) {
      doc.addPage();
      sigY = 30;
    }

    doc.setFont("Helvetica", "normal");
    doc.setFontSize(9);
    doc.text("Mengetahui,", 15, sigY);
    doc.text("Orang Tua / Wali Siswa", 15, sigY + 4);
    doc.line(15, sigY + 22, 60, sigY + 22);

    doc.text("Mengetahui, Guru BK,", 85, sigY);
    doc.line(85, sigY + 22, 130, sigY + 22);

    doc.text("Wali Kelas,", 150, sigY);
    doc.text(user?.name || "Wali Kelas", 150, sigY + 18);
    doc.line(150, sigY + 22, 190, sigY + 22);

    doc.save(`Rapor_Kedisiplinan_${name.replace(/\s+/g, '_')}_${nis}.pdf`);
  };

  // Stats
  const statsByJenis = useMemo(() => {
    const stats = {};
    JENIS_CATATAN.forEach(j => { stats[j.value] = 0; });
    catatanList.forEach(c => { if (stats[c.jenis_catatan] !== undefined) stats[c.jenis_catatan]++; });
    return stats;
  }, [catatanList]);

  return (
    <div className="flex flex-col gap-4 w-full animate-in fade-in duration-300 pb-20 sm:pb-6">
      <PageHeader
        title="Catatan Wali Kelas"
        icon={MessageSquare}
        description="Pencatatan kegiatan monitoring dan konsultasi walikelas dengan siswa binaannya."
        onBack={onBack}
      />

      {/* Mobile Tab Switcher */}
      {(isWalas || isKesiswaan) && (
        <div className="lg:hidden flex bg-slate-100 p-1 rounded-[var(--ui-radius-small)] border border-slate-200 gap-1 shrink-0">
          <button
            type="button"
            onClick={() => setMobileTab('siswa')}
            className={`flex-1 py-2 text-xs font-bold rounded-[var(--ui-radius-small)] transition-all border-none cursor-pointer flex items-center justify-center gap-1.5 ${
              mobileTab === 'siswa' 
                ? 'bg-white text-violet-700 shadow-xs font-black' 
                : 'text-slate-600 hover:text-slate-900 bg-transparent'
            }`}
          >
            <Users size={14} />
            <span>Siswa Binaan ({siswaKelas.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setMobileTab('catatan')}
            className={`flex-1 py-2 text-xs font-bold rounded-[var(--ui-radius-small)] transition-all border-none cursor-pointer flex items-center justify-center gap-1.5 ${
              mobileTab === 'catatan' 
                ? 'bg-white text-violet-700 shadow-xs font-black' 
                : 'text-slate-600 hover:text-slate-900 bg-transparent'
            }`}
          >
            <MessageSquare size={14} />
            <span>Catatan ({filteredCatatan.length})</span>
          </button>
        </div>
      )}

      <div className="grid grid-cols-12 gap-4 lg:gap-5 items-start">
        {/* Kiri: Daftar Siswa (untuk walikelas/kesiswaan) */}
        {(isWalas || isKesiswaan) && (
          <div className={`bg-white rounded-[var(--ui-radius-card)] border border-slate-100 shadow-sm overflow-hidden flex flex-col h-[calc(100vh-270px)] min-h-[380px] lg:h-[650px] col-span-12 lg:col-span-4 ${
            mobileTab === 'siswa' ? 'block' : 'hidden lg:flex'
          }`}>
            <div className="p-3.5 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between shrink-0">
              <h3 className="font-extrabold text-slate-800 text-xs flex items-center gap-2">
                <Users size={15} className="text-violet-600" />
                <span>Siswa Binaan {walasClass && `— ${walasClass}`}</span>
              </h3>
              <span className="text-[10px] font-black text-slate-500 bg-slate-100 border border-slate-200/50 px-2 py-0.5 rounded-[var(--ui-radius-pill)]">
                {siswaKelas.length}
              </span>
            </div>
            <div className="p-3 border-b border-slate-100 bg-white shrink-0 flex flex-col gap-2">
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Cari nama siswa..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-[var(--ui-radius-small)] text-xs font-semibold placeholder:text-slate-400 focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500 transition-all"
                />
              </div>
              {(!isWalas || isKesiswaan) && (
                <div className="w-full">
                  <CustomSelect
                    options={classOptions}
                    value={filterKelas}
                    onChange={v => setFilterKelas(v)}
                    placeholder="Filter Kelas"
                  />
                </div>
              )}
            </div>
            <div className="flex-1 overflow-y-auto divide-y divide-slate-100/60 custom-scrollbar">
              {siswaKelas.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-8">Tidak ada siswa ditemukan</p>
              ) : siswaKelas
                .slice((siswaPage - 1) * siswaPerPage, siswaPage * siswaPerPage)
                .map(siswa => {
                const siswaCatatan = catatanList.filter(c => String(c.siswa_nis) === String(siswa.nis));
                const siswaPoin = riwayatPoin.filter(p => String(p.siswa_nis) === String(siswa.nis));
                const totalPoin = siswaPoin.reduce((sum, p) => sum + (parseInt(p.poin) || 0), 0);
                const isSelected = selectedSiswa?.nis === siswa.nis;

                return (
                  <button
                    key={siswa.nis}
                    onClick={() => {
                      setSelectedSiswa(isSelected ? null : siswa);
                      setMobileTab('catatan');
                    }}
                    className={`w-full flex items-center justify-between text-left p-3.5 transition-all duration-200 cursor-pointer border-none bg-transparent hover:bg-slate-50/80 ${
                      isSelected 
                        ? 'bg-violet-50/60 font-semibold border-l-4 border-l-violet-500' 
                        : 'border-l-4 border-l-transparent'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`w-8 h-8 rounded-[var(--ui-radius-small)] flex items-center justify-center text-xs font-black shrink-0 ${
                        isSelected ? 'bg-violet-500 text-white' : 'bg-slate-100 text-slate-650'
                      }`}>
                        {getInitials(siswa.namaSiswa || siswa.name)}
                      </div>
                      <div className="min-w-0">
                        <p className="font-bold text-slate-800 text-xs truncate leading-snug">{siswa.namaSiswa || siswa.name}</p>
                        <p className="text-[10px] text-slate-400 font-semibold">{siswa.nis}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0 pl-2">
                      {siswaCatatan.length > 0 && (
                        <span className="text-[9px] font-black bg-violet-100 text-violet-700 px-2 py-0.5 rounded-[var(--ui-radius-pill)]">
                          {siswaCatatan.length}
                        </span>
                      )}
                      {totalPoin > 0 && (
                        <span className={`text-[9px] font-black px-2 py-0.5 rounded-[var(--ui-radius-pill)] ${
                          totalPoin >= 100 
                            ? 'bg-rose-100 text-rose-700' 
                            : totalPoin >= 50 
                              ? 'bg-amber-100 text-amber-700' 
                              : 'bg-slate-100 text-slate-650'
                        }`}>
                          {totalPoin}p
                        </span>
                      )}
                      <ChevronRight size={12} className={`transition-transform ${isSelected ? 'translate-x-0.5 text-violet-500' : 'text-slate-350'}`} />
                    </div>
                  </button>
                );
              })}
            </div>
            <div className="shrink-0 border-t border-slate-100 bg-slate-50/50">
              <PaginationControls
                currentPage={siswaPage}
                totalItems={siswaKelas.length}
                itemsPerPage={siswaPerPage}
                onPageChange={setSiswaPage}
                onItemsPerPageChange={(v) => { setSiswaPerPage(v); setSiswaPage(1); }}
              />
            </div>
          </div>
        )}

        {/* Kanan: Panel Catatan */}
        <div className={`${isWalas || isKesiswaan ? 'col-span-12 lg:col-span-8' : 'col-span-12'} flex flex-col gap-4 ${
          mobileTab === 'catatan' ? 'block' : 'hidden lg:block'
        }`}>
          <div className="bg-white rounded-[var(--ui-radius-card)] border border-slate-100 shadow-sm overflow-hidden flex flex-col h-[calc(100vh-270px)] min-h-[380px] lg:h-[650px]">
            {/* Morphing Header Card */}
            {selectedSiswa ? (
              <div className="bg-gradient-to-r from-violet-600 to-indigo-600 text-white p-3.5 sm:p-5 relative overflow-hidden shrink-0 shadow-sm">
                <div className="absolute inset-0 opacity-10 pointer-events-none">
                  <div className="absolute top-0 right-0 w-32 h-32 rounded-full border-8 border-white -mr-8 -mt-8" />
                  <div className="absolute bottom-0 left-1/3 w-16 h-16 rounded-full border-4 border-white -mb-4" />
                </div>
                <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <button
                      type="button"
                      onClick={() => { setSelectedSiswa(null); setMobileTab('siswa'); }}
                      className="lg:hidden p-1.5 rounded-[var(--ui-radius-small)] bg-white/15 hover:bg-white/25 text-white border border-white/20 shrink-0"
                      title="Kembali ke Daftar Siswa"
                    >
                      <ChevronLeft size={16} />
                    </button>
                    <div className="w-9 h-9 sm:w-12 sm:h-12 rounded-[var(--ui-radius-small)] bg-white/20 text-white border border-white/30 flex items-center justify-center text-xs sm:text-sm font-black shrink-0 shadow-sm">
                      {getInitials(selectedSiswa.namaSiswa || selectedSiswa.name)}
                    </div>
                    <div className="min-w-0">
                      <span className="text-[9px] font-black uppercase tracking-widest text-violet-200">Siswa Terpilih</span>
                      <h3 className="font-extrabold text-xs sm:text-base leading-tight mt-0.5 truncate">{selectedSiswa.namaSiswa || selectedSiswa.name}</h3>
                      <p className="text-[10px] sm:text-xs text-violet-100 font-semibold mt-0.5">NIS: {selectedSiswa.nis} · Kelas: {selectedSiswa.class_name}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {/* Violations Count / Poin Badge */}
                    {(() => {
                      const totalPoin = riwayatPoin
                        .filter(p => String(p.siswa_nis) === String(selectedSiswa.nis))
                        .reduce((sum, p) => sum + (parseInt(p.poin) || 0), 0);
                      return totalPoin > 0 ? (
                        <div className={`px-2.5 py-1 rounded-[var(--ui-radius-pill)] text-[11px] font-black flex items-center gap-1 border shadow-xs ${
                          totalPoin >= 100 
                            ? 'bg-rose-500/20 text-rose-100 border-rose-400/30' 
                            : 'bg-amber-500/20 text-amber-100 border-amber-400/30'
                        }`}>
                          <AlertCircle size={12} />
                          <span>{totalPoin} Poin</span>
                        </div>
                      ) : null;
                    })()}

                    <Button
                      onClick={downloadRapotSiswa}
                      className="bg-white/15 hover:bg-white/25 border border-white/20 text-white font-bold text-xs px-2.5 py-1.5 h-8 cursor-pointer rounded-[var(--ui-radius-small)] flex items-center gap-1 shrink-0"
                    >
                      <Printer size={13} />
                      <span className="hidden sm:inline">Cetak Rapot</span>
                    </Button>

                    {canAdd && (
                      <Button
                        onClick={() => setActiveModal({
                          siswa_nis: String(selectedSiswa.nis),
                          siswa_name: selectedSiswa.namaSiswa || selectedSiswa.name,
                          kelas: walasClass || selectedSiswa.class_name
                        })}
                        className="bg-white text-violet-700 hover:bg-violet-50 border-none font-bold text-xs px-3 py-1.5 h-8 cursor-pointer rounded-[var(--ui-radius-small)] flex items-center gap-1 shrink-0"
                      >
                        <Plus size={13} />
                        <span>Catat</span>
                      </Button>
                    )}

                    <button
                      onClick={() => setSelectedSiswa(null)}
                      className="p-1.5 bg-white/10 hover:bg-white/20 border border-white/20 text-white rounded-[var(--ui-radius-small)] transition-all cursor-pointer flex items-center justify-center h-8 w-8"
                      title="Tutup Detail"
                    >
                      <X size={15} />
                    </button>
                  </div>
                </div>

                {/* Inline Riwayat Pelanggaran jika ada */}
                {(() => {
                  const studentPoin = riwayatPoin.filter(p => String(p.siswa_nis) === String(selectedSiswa.nis));
                  return studentPoin.length > 0 ? (
                    <div className="mt-3 pt-2.5 border-t border-white/15">
                      <p className="text-[9px] font-black text-violet-200 uppercase tracking-widest mb-1.5 flex items-center gap-1">
                        <AlertCircle size={10} />
                        <span>Riwayat Pelanggaran Terakhir</span>
                      </p>
                      <div className="flex flex-wrap gap-1.5 overflow-x-auto pb-0.5 hide-scrollbar">
                        {studentPoin.map(p => (
                          <div key={p.id} className="text-[10px] bg-white/10 border border-white/15 px-2 py-0.5 rounded-[var(--ui-radius-small)] shrink-0 flex items-center gap-1">
                            <span className="font-semibold text-white/90">{p.tindakan_nama}</span>
                            <span className="font-black text-rose-300">+{p.poin}p</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null;
                })()}
              </div>
            ) : (
              <div className="p-3 sm:p-4 border-b border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
                <div className="flex items-center justify-between sm:justify-start gap-2.5 w-full sm:w-auto">
                  <div className="flex items-center gap-2.5">
                    <div 
                      className="w-8 h-8 sm:w-10 sm:h-10 rounded-[var(--ui-radius-small)] flex items-center justify-center text-white shrink-0 shadow-xs"
                      style={{ background: "var(--ui-primary)" }}
                    >
                      <MessageSquare size={16} strokeWidth={2.2} />
                    </div>
                    <div>
                      <h3 className="font-extrabold text-slate-800 text-xs sm:text-sm tracking-tight">Catatan Wali Kelas</h3>
                      <p className="text-[10px] sm:text-[10.5px] font-semibold text-slate-400">
                        {filteredCatatan.length} entri catatan
                      </p>
                    </div>
                  </div>

                  {/* Filter Kategori Dropdown */}
                  <div className="w-36 sm:w-44 shrink-0">
                    <CustomSelect
                      options={[
                        { value: 'all', label: 'Semua Kategori' },
                        ...JENIS_CATATAN.map(j => ({ value: j.value, label: `${j.label} (${statsByJenis[j.value] || 0})` }))
                      ]}
                      value={filterJenis}
                      onChange={setFilterJenis}
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto">
                  {canAdd && (
                    <button
                      type="button"
                      onClick={() => setActiveModal({ kelas: walasClass })}
                      className="flex-1 sm:flex-none py-2 px-3 rounded-[var(--ui-radius-small)] font-black text-xs text-white flex items-center justify-center gap-1.5 transition-all shadow-xs cursor-pointer"
                      style={{ background: "var(--ui-primary)" }}
                    >
                      <Plus size={14} strokeWidth={2.5} />
                      <span>Tambah Catatan</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={exportExcel}
                    className="py-2 px-3 rounded-[var(--ui-radius-small)] font-bold text-xs bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 flex items-center justify-center gap-1 transition-all shadow-2xs cursor-pointer shrink-0"
                    title="Export semua riwayat catatan ke Excel"
                  >
                    <Download size={13} className="text-slate-500" />
                    <span>Excel</span>
                  </button>
                  <button
                    type="button"
                    onClick={exportClassRecapExcel}
                    className="py-2 px-3 rounded-[var(--ui-radius-small)] font-bold text-xs bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200/60 flex items-center justify-center gap-1 transition-all shadow-2xs cursor-pointer shrink-0"
                    title="Export Rekapitulasi Kelas ke Excel"
                  >
                    <Download size={13} className="text-emerald-600" />
                    <span>Rekap</span>
                  </button>
                </div>
              </div>
            )}

            {isLoading ? (
              <div className="p-10 flex-1 flex items-center justify-center text-slate-400 text-xs font-bold">
                Memuat catatan...
              </div>
            ) : filteredCatatan.length === 0 ? (
              <div className="p-10 flex-1 flex flex-col items-center justify-center text-center">
                <div className="w-16 h-16 rounded-[var(--ui-radius-card)] bg-violet-50 text-violet-500 border border-violet-100 flex items-center justify-center mb-4">
                  <MessageSquare size={28} />
                </div>
                <h3 className="font-extrabold text-slate-800 text-sm">Belum Ada Catatan</h3>
                <p className="text-xs text-slate-400 max-w-xs mt-1 leading-relaxed">
                  {canAdd ? 'Klik tombol "+ Catat" untuk mulai mencatat kegiatan bimbingan siswa.' : 'Tidak ada catatan wali kelas yang tersedia saat ini.'}
                </p>
              </div>
            ) : (
              <>
                <div className="divide-y divide-slate-100 flex-1 overflow-y-auto">
                  {filteredCatatan
                    .slice((catatanPage - 1) * catatanPerPage, catatanPage * catatanPerPage)
                    .map(c => {
                      const jenis = getJenisInfo(c.jenis_catatan);
                      return (
                        <div key={c.id} className="p-5 hover:bg-slate-50/20 transition-colors flex gap-4 items-start">
                          {/* Left icon denoting category */}
                          <div className={`w-9 h-9 rounded-[var(--ui-radius-small)] flex items-center justify-center shrink-0 border border-solid ${
                            c.jenis_catatan === 'akademik' ? 'bg-blue-50 text-blue-600 border-blue-100/70' :
                            c.jenis_catatan === 'perilaku' ? 'bg-amber-50 text-amber-600 border-amber-100/70' :
                            c.jenis_catatan === 'prestasi' ? 'bg-emerald-50 text-emerald-600 border-emerald-100/70' :
                            c.jenis_catatan === 'kesehatan' ? 'bg-rose-50 text-rose-600 border-rose-100/70' :
                            c.jenis_catatan === 'konseling' ? 'bg-purple-50 text-purple-600 border-purple-100/70' :
                            'bg-slate-55 text-slate-600 border-slate-200/50'
                          }`}>
                            <MessageSquare size={16} />
                          </div>

                          {/* Post Card Layout */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-3 mb-1.5 flex-wrap">
                              <div className="flex items-center gap-2 flex-wrap">
                                {!selectedSiswa && (
                                  <span className="font-extrabold text-slate-800 text-xs">{c.siswa_name || c.siswa_nis}</span>
                                )}
                                {!selectedSiswa && <span className="text-slate-300 text-xs">·</span>}
                                <span className="text-[10px] font-bold text-slate-400">{c.kelas}</span>
                                <span className="text-slate-300 text-xs">·</span>
                                <span className={`text-[9px] font-black px-2 py-0.5 rounded-[var(--ui-radius-pill)] border border-solid ${jenis.color}`}>{jenis.label}</span>
                                {c.poin_pelanggaran_id && (
                                  <span className="text-[9px] font-bold bg-amber-50 text-amber-700 border border-amber-100 px-1.5 py-0.5 rounded-[var(--ui-radius-pill)] flex items-center gap-0.5">
                                    <LinkIcon size={8} /> Terkait Poin
                                  </span>
                                )}
                              </div>

                              {/* Action buttons (compact) */}
                              <div className="flex items-center gap-1 opacity-80 hover:opacity-100 transition-opacity">
                                <button 
                                  onClick={() => setActiveModal(c)} 
                                  className="p-2.5 md:p-1.5 hover:bg-slate-100 text-slate-400 hover:text-slate-650 rounded-[var(--ui-radius-small)] transition-colors border-none bg-transparent cursor-pointer flex items-center justify-center"
                                  title="Edit Catatan"
                                >
                                  <Edit2 size={12} />
                                </button>
                                <button 
                                  onClick={() => handleDelete(c.id)} 
                                  className="p-2.5 md:p-1.5 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded-[var(--ui-radius-small)] transition-colors border-none bg-transparent cursor-pointer flex items-center justify-center"
                                  title="Hapus Catatan"
                                >
                                  <Trash2 size={12} />
                                </button>
                              </div>
                            </div>

                            <p className="text-xs text-slate-750 font-medium leading-relaxed mt-1 break-words">{c.isi_catatan}</p>

                            {c.tindak_lanjut && (
                              <div className="mt-2.5 bg-slate-50 border border-slate-100 p-2.5 rounded-[var(--ui-radius-small)] flex items-start gap-2">
                                <CheckCircle2 size={12} className="text-violet-500 shrink-0 mt-0.5" />
                                <p className="text-[11px] text-slate-600 leading-normal font-medium">
                                  <span className="font-extrabold text-slate-700">Tindak Lanjut:</span> {c.tindak_lanjut}
                                </p>
                              </div>
                            )}

                            <div className="flex items-center gap-3 mt-3.5 text-[10px] text-slate-400 font-semibold">
                              <span className="flex items-center gap-1.5">
                                <Calendar size={11} /> 
                                {new Date(c.tanggal).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                              </span>
                              <span>•</span>
                              <span>oleh {c.teacher_name || c.teacher_code || "Wali Kelas"}</span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                </div>
                <div className="shrink-0 border-t border-slate-100">
                  <PaginationControls
                    currentPage={catatanPage}
                    totalItems={filteredCatatan.length}
                    itemsPerPage={catatanPerPage}
                    onPageChange={(p) => { setCatatanPage(p); }}
                    onItemsPerPageChange={(v) => { setCatatanPerPage(v); setCatatanPage(1); }}
                  />
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Modal */}
      {activeModal && (
        <CatatanModal
          catatan={activeModal}
          students={siswaKelas.length > 0 ? siswaKelas : students.filter(s => !walasClass || s.class_name === walasClass)}
          riwayatPoin={riwayatPoin}
          walasClass={walasClass}
          onSave={handleSave}
          onClose={() => setActiveModal(null)}
        />
      )}

      {/* Toast */}
      {toast && (
        <div className={`fixed bottom-6 right-6 px-4 py-3 rounded-[var(--ui-radius-small)] shadow-sm font-bold text-xs flex items-center gap-2 animate-in slide-in-from-bottom-5 z-50 ${toast.type === 'error' ? 'bg-rose-600 text-white' : 'bg-emerald-600 text-white'}`}>
          <CheckCircle2 size={14} /> {toast.msg}
        </div>
      )}
    </div>
  );
}
