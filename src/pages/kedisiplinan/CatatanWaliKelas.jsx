import { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  MessageSquare, X, AlertCircle, Plus, Users, Search, ChevronRight, ChevronLeft, 
  Download, Calendar, Edit2, Trash2, CheckCircle2, Link as LinkIcon, Printer, 
  Filter, Award, ShieldAlert, BookOpen, HeartPulse, UserCheck, UserX, Clock, 
  ArrowUpDown, Check, RotateCcw, Sparkles, Star, Hourglass
} from 'lucide-react';
import useAuthStore from '../../store/monitoring/authStore.js';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { CustomSelect } from '../../components/CustomSelect.jsx';
import { PageHeader } from '../../components/monitoring/ui/index.js';
import { PaginationControls } from '../../components/ui/PaginationControls.jsx';
import { UISelect, Modal, Button } from '../../components/ui.jsx';
import { useAppStore } from '../../store/useAppStore.js';

const JENIS_CATATAN = [
  { value: 'umum', label: 'Catatan Umum', color: 'bg-slate-50 text-slate-700 border-slate-200/60', icon: MessageSquare },
  { value: 'akademik', label: 'Akademik', color: 'bg-indigo-50 text-indigo-700 border-indigo-200/60', icon: BookOpen },
  { value: 'perilaku', label: 'Perilaku', color: 'bg-amber-50 text-amber-700 border-amber-200/60', icon: ShieldAlert },
  { value: 'prestasi', label: 'Prestasi', color: 'bg-emerald-50 text-emerald-700 border-emerald-200/60', icon: Award },
  { value: 'kesehatan', label: 'Kesehatan', color: 'bg-rose-50 text-rose-700 border-rose-200/60', icon: HeartPulse },
  { value: 'konseling', label: 'Konsultasi', color: 'bg-purple-50 text-purple-700 border-purple-200/60', icon: MessageSquare },
];

const getJenisInfo = (val) => JENIS_CATATAN.find(j => j.value === val) || JENIS_CATATAN[0];

const getStudentName = (s) => s?.namaSiswa || s?.name || s?.nama || s?.nama_siswa || s?.nama_lengkap || '-';
const getStudentNis = (s) => s?.nis || s?.NIS || s?.code || s?.id || '';
const getStudentClass = (s) => s?.class_name || s?.kelas || s?.className || '';

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
function CatatanModal({ catatan, students = [], classes = [], riwayatPoin = [], walasClass, onSave, onClose }) {
  const [modalFilterClass, setModalFilterClass] = useState(catatan?.kelas || walasClass || 'all');
  const [form, setForm] = useState({
    id: catatan?.id || null,
    siswa_nis: catatan?.siswa_nis ? String(catatan.siswa_nis) : '',
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
  const [errorMsg, setErrorMsg] = useState('');

  // Filter siswa sesuai kelas di dalam modal
  const filteredModalStudents = useMemo(() => {
    if (modalFilterClass === 'all') return students;
    return students.filter(s => getStudentClass(s) === modalFilterClass);
  }, [students, modalFilterClass]);

  // Filter poin milik siswa yang dipilih
  const siswaRiwayatPoin = useMemo(() => {
    if (!form.siswa_nis) return [];
    return riwayatPoin.filter(p => String(p.siswa_nis) === String(form.siswa_nis));
  }, [riwayatPoin, form.siswa_nis]);

  const handleSelectSiswa = (nis) => {
    const siswa = students.find(s => String(getStudentNis(s)) === String(nis));
    setForm(prev => ({
      ...prev,
      siswa_nis: nis,
      siswa_name: siswa ? getStudentName(siswa) : '',
      kelas: siswa ? getStudentClass(siswa) : prev.kelas
    }));
  };

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
    return [
      { value: '', label: '-- Pilih Siswa --' },
      ...filteredModalStudents.map(s => ({
        value: String(getStudentNis(s)),
        label: `${getStudentName(s)} (${getStudentClass(s) || getStudentNis(s)})`
      }))
    ];
  }, [filteredModalStudents]);

  const classModalOptions = useMemo(() => {
    return [
      { value: 'all', label: 'Semua Kelas' },
      ...(walasClass ? [{ value: walasClass, label: `⭐ Kelas Ampuan (${walasClass})` }] : []),
      ...classes.map(c => ({ value: c.name, label: c.name })).filter(c => c.value !== walasClass)
    ];
  }, [classes, walasClass]);

  const selectedPoin = form.poin_pelanggaran_id
    ? siswaRiwayatPoin.find(p => p.id === form.poin_pelanggaran_id)
    : null;

  return (
    <Modal isOpen={true} onClose={onClose} title={form.id ? "Edit Catatan Wali Kelas" : "Tambah Catatan Wali Kelas"} maxWidth="max-w-xl">
      <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-4 overflow-y-auto max-h-[80vh]">
        {/* Filter Kelas Siswa Cepat di Modal */}
        <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-[var(--ui-radius-small)] space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
              <Filter size={12} className="text-[var(--ui-primary)]" />
              <span>Pilih Berdasarkan Kelas</span>
            </span>
            <div className="w-full sm:w-56">
              <CustomSelect
                options={classModalOptions}
                value={modalFilterClass}
                onChange={val => {
                  setModalFilterClass(val);
                  if (val !== 'all' && form.siswa_nis) {
                    const currentSiswa = students.find(s => String(getStudentNis(s)) === String(form.siswa_nis));
                    if (currentSiswa && getStudentClass(currentSiswa) !== val) {
                      setForm(prev => ({ ...prev, siswa_nis: '', siswa_name: '' }));
                    }
                  }
                }}
                placeholder="Pilih Kelas"
              />
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-1.5">
              Nama Siswa Binaan <span className="text-rose-500">*</span>
            </label>
            <CustomSelect
              options={studentOptions}
              value={form.siswa_nis ? String(form.siswa_nis) : ''}
              onChange={handleSelectSiswa}
              placeholder="Cari atau pilih nama siswa..."
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Tanggal Catatan</label>
            <input
              type="date"
              value={form.tanggal}
              onChange={e => setForm({ ...form, tanggal: e.target.value })}
              className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-[var(--ui-radius-small)] text-xs font-semibold focus:outline-none focus:border-[var(--ui-primary)] focus:ring-1 focus:ring-[var(--ui-primary)] transition-all"
            />
          </div>
          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Kategori Catatan</label>
            <UISelect
              value={form.jenis_catatan}
              onChange={e => setForm({ ...form, jenis_catatan: e.target.value })}
              className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-[var(--ui-radius-small)] text-xs font-semibold focus:outline-none focus:border-[var(--ui-primary)] focus:ring-1 focus:ring-[var(--ui-primary)] transition-all"
            >
              {JENIS_CATATAN.map(j => <option key={j.value} value={j.value}>{j.label}</option>)}
            </UISelect>
          </div>
        </div>

        <div>
          <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
            Isi Catatan / Hasil Bimbingan &amp; Konsultasi <span className="text-rose-500">*</span>
          </label>
          <textarea
            rows={3}
            placeholder="Contoh: Memanggil siswa untuk mendiskusikan penurunan keaktifan belajar atau apresiasi atas prestasi yang diraih..."
            value={form.isi_catatan}
            onChange={e => setForm({ ...form, isi_catatan: e.target.value })}
            className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-[var(--ui-radius-small)] text-xs font-medium focus:outline-none focus:border-[var(--ui-primary)] focus:ring-1 focus:ring-[var(--ui-primary)] transition-all resize-none"
            required
          />
        </div>

        <div>
          <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Tindak Lanjut &amp; Solusi (Opsional)</label>
          <textarea
            rows={2}
            placeholder="Rencana tindak lanjut, komitmen siswa, atau koordinasi dengan orang tua..."
            value={form.tindak_lanjut}
            onChange={e => setForm({ ...form, tindak_lanjut: e.target.value })}
            className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-[var(--ui-radius-small)] text-xs font-medium focus:outline-none focus:border-[var(--ui-primary)] focus:ring-1 focus:ring-[var(--ui-primary)] transition-all resize-none"
          />
        </div>

        {/* Koneksi ke Riwayat Poin */}
        {form.siswa_nis && siswaRiwayatPoin.length > 0 && (
          <div className="p-3 bg-amber-50/50 border border-amber-200/80 rounded-[var(--ui-radius-small)]">
            <label className="block text-[10px] font-bold text-amber-800 uppercase tracking-wider mb-1.5 flex items-center gap-1">
              <LinkIcon size={12} />
              <span>Kaitkan dengan Riwayat Pelanggaran Siswa</span>
            </label>
            {selectedPoin ? (
              <div className="flex items-center gap-2.5 p-2 bg-white border border-amber-200 rounded-[var(--ui-radius-small)]">
                <AlertCircle size={14} className="text-amber-600 shrink-0" />
                <span className="text-xs font-bold text-amber-900 flex-1 truncate">{selectedPoin.tindakan_nama} — {selectedPoin.poin} poin</span>
                <button
                  type="button"
                  onClick={() => setForm({ ...form, poin_pelanggaran_id: null })}
                  className="p-1 hover:bg-amber-100 rounded text-slate-500 border-none bg-transparent cursor-pointer"
                  title="Batalkan Tautan"
                >
                  <X size={14} />
                </button>
              </div>
            ) : (
              <Button
                variant="outline"
                type="button"
                onClick={() => setShowPoinPicker(!showPoinPicker)}
                className="w-full text-left flex items-center justify-between px-3 py-1.5 rounded-[var(--ui-radius-small)] bg-white hover:bg-amber-100/50 border border-amber-200 text-amber-800 text-xs font-bold transition-colors cursor-pointer"
              >
                <span>+ Hubungkan dengan salah satu riwayat kasus ({siswaRiwayatPoin.length})</span>
              </Button>
            )}

            {showPoinPicker && !selectedPoin && (
              <div className="mt-2 border border-amber-100 rounded-[var(--ui-radius-small)] overflow-hidden max-h-36 overflow-y-auto bg-white divide-y divide-slate-50">
                {siswaRiwayatPoin.map(p => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => { setForm({ ...form, poin_pelanggaran_id: p.id }); setShowPoinPicker(false); }}
                    className="w-full px-3 py-2 text-left hover:bg-amber-50/50 transition-colors border-none bg-transparent cursor-pointer flex items-center justify-between text-xs"
                  >
                    <div className="min-w-0 pr-2">
                      <p className="font-extrabold text-slate-700 truncate">{p.tindakan_nama}</p>
                      <p className="text-[10px] text-slate-400 font-semibold mt-0.5">
                        {p.tanggal_kejadian ? new Date(p.tanggal_kejadian).toLocaleDateString('id-ID') : ''}
                      </p>
                    </div>
                    <span className="font-black text-rose-700 bg-rose-50 border border-rose-100 px-2 py-0.5 rounded-[var(--ui-radius-pill)] shrink-0">
                      +{p.poin}p
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {errorMsg && (
          <div className="p-3 bg-rose-50 border border-rose-100 rounded-[var(--ui-radius-small)] flex items-start gap-2 text-rose-600 text-xs font-semibold animate-in zoom-in-95 duration-200">
            <AlertCircle size={14} className="shrink-0 mt-0.5" />
            <span className="leading-relaxed">{errorMsg}</span>
          </div>
        )}

        <div className="pt-3 flex justify-end gap-2.5 border-t border-slate-100 shrink-0">
          <Button variant="outline" type="button" onClick={onClose} className="px-4 text-xs font-bold">Batal</Button>
          <Button type="submit" disabled={saving} className="px-5 text-xs font-black shadow-xs">
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
  const isKesiswaan = ['admin', 'superadmin'].includes(role) || (role === 'waka' && (user?.division || "").toLowerCase() === 'kesiswaan') || role === 'kepsek';
  const canAdd = isWalas || isKesiswaan;

  const [catatanList, setCatatanList] = useState([]);
  const [riwayatPoin, setRiwayatPoin] = useState([]);
  const [absensiList, setAbsensiList] = useState([]);
  const [konselingList, setKonselingList] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [activeModal, setActiveModal] = useState(null);
  const [selectedSiswa, setSelectedSiswa] = useState(null);
  const [mobileTab, setMobileTab] = useState('siswa'); // 'siswa' | 'catatan'
  const [toast, setToast] = useState(null);

  // === FILTERING & PEMETAAN STATES ===
  // Filter Sisi Kiri (Siswa Binaan)
  const [searchSiswa, setSearchSiswa] = useState('');
  const [filterTingkat, setFilterTingkat] = useState('all'); // 'all' | 'X' | 'XI' | 'XII'
  const [filterJurusan, setFilterJurusan] = useState('all'); // 'all' | 'TKR' | 'TKJ' | ...
  const [filterKelas, setFilterKelas] = useState(() => (isWalas && walasClass ? walasClass : 'all'));
  const [filterStatusSiswa, setFilterStatusSiswa] = useState('all'); // 'all' | 'with_notes' | 'no_notes' | 'with_violations'

  // Filter Sisi Kanan (Catatan)
  const [searchCatatan, setSearchCatatan] = useState('');
  const [filterCatatanKelas, setFilterCatatanKelas] = useState('all');
  const [filterCatatanJenis, setFilterCatatanJenis] = useState('all');
  const [filterCatatanWaktu, setFilterCatatanWaktu] = useState('all'); // 'all' | 'this_month' | 'last_7_days'
  const [sortCatatan, setSortCatatan] = useState('terbaru'); // 'terbaru' | 'terlama' | 'nama_asc'

  // Pagination States
  const [catatanPage, setCatatanPage] = useState(1);
  const [catatanPerPage, setCatatanPerPage] = useState(15);
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
      const res = await fetch(`/api/kesiswaan/catatan-walikelas?${params}`, {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      const data = await res.json();
      if (data.ok) {
        setCatatanList(Array.isArray(data.data) ? data.data : []);
      }
    } catch (e) { console.error(e); }
    setIsLoading(false);
  }, [authToken, isKesiswaan, walasClass]);

  const fetchRiwayatPoin = useCallback(async () => {
    if (!authToken) return;
    try {
      const res = await fetch('/api/kedisiplinan/riwayat?limit=5000', {
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
  }, [selectedSiswa, filterCatatanJenis, filterCatatanKelas, filterCatatanWaktu, searchCatatan, sortCatatan]);

  useEffect(() => {
    setSiswaPage(1);
  }, [searchSiswa, filterTingkat, filterJurusan, filterKelas, filterStatusSiswa]);

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
    if (!await window.confirmAsync('Hapus catatan wali kelas ini?')) return;
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

  // === EXTRACT TINGKAT & JURUSAN LIST ===
  const jurusanList = useMemo(() => {
    const list = new Set();
    classes.forEach(c => {
      if (c.major) list.add(c.major);
      else if (c.name) {
        const parts = c.name.split(' ');
        if (parts.length >= 2) list.add(parts[1]);
      }
    });
    students.forEach(s => {
      const cls = getStudentClass(s);
      if (cls) {
        const parts = cls.split(' ');
        if (parts.length >= 2) list.add(parts[1]);
      }
    });
    return Array.from(list).filter(Boolean).sort();
  }, [classes, students]);

  // Dropdown Opsi Kelas yang tersaring sesuai Tingkat & Jurusan
  const classOptions = useMemo(() => {
    const walasLabel = (
      <div className="flex items-center gap-1.5">
        <Star size={12} className="text-amber-500 fill-amber-500" />
        <span>Kelas Ampuan Saya ({walasClass})</span>
      </div>
    );
    if (!isKesiswaan && isWalas && walasClass) {
      return [{ value: walasClass, label: walasLabel, searchText: `Kelas Ampuan Saya ${walasClass}` }];
    }
    let filtered = classes;
    if (filterTingkat !== 'all') {
      filtered = filtered.filter(c => c.name.startsWith(filterTingkat + ' ') || (c.grade && String(c.grade) === filterTingkat));
    }
    if (filterJurusan !== 'all') {
      filtered = filtered.filter(c => c.major === filterJurusan || c.name.includes(` ${filterJurusan} `) || c.name.endsWith(` ${filterJurusan}`));
    }
    return [
      { value: 'all', label: 'Semua Kelas' },
      ...(walasClass ? [{ value: walasClass, label: walasLabel, searchText: `Kelas Ampuan Saya ${walasClass}` }] : []),
      ...filtered.map(c => ({ value: c.name, label: c.name })).filter(c => c.value !== walasClass)
    ];
  }, [classes, filterTingkat, filterJurusan, walasClass, isKesiswaan, isWalas]);

  // Dropdown Opsi Kelas untuk Panel Catatan
  const catatanClassOptions = useMemo(() => {
    const walasLabel = (
      <div className="flex items-center gap-1.5">
        <Star size={12} className="text-amber-500 fill-amber-500" />
        <span>Kelas Ampuan Saya ({walasClass})</span>
      </div>
    );
    if (!isKesiswaan && isWalas && walasClass) {
      return [{ value: walasClass, label: walasLabel, searchText: `Kelas Ampuan Saya ${walasClass}` }];
    }
    return [
      { value: 'all', label: 'Semua Kelas' },
      ...(walasClass ? [{ value: walasClass, label: walasLabel, searchText: `Kelas Ampuan Saya ${walasClass}` }] : []),
      ...classes.map(c => ({ value: c.name, label: c.name })).filter(c => c.value !== walasClass)
    ];
  }, [classes, walasClass, isKesiswaan, isWalas]);

  // === FILTER DAFTAR SISWA (PANEL KIRI) ===
  const filteredStudents = useMemo(() => {
    return students.filter(s => {
      const cls = getStudentClass(s);
      const name = getStudentName(s).toLowerCase();
      const nis = String(getStudentNis(s));

      // 0. Strict Walas Check
      if (!isKesiswaan && isWalas && walasClass) {
        if (cls !== walasClass) return false;
      }

      // 1. Filter Tingkat
      if (filterTingkat !== 'all') {
        if (!cls.startsWith(filterTingkat + ' ') && !cls.startsWith(filterTingkat + '-')) return false;
      }

      // 2. Filter Jurusan
      if (filterJurusan !== 'all') {
        if (!cls.includes(` ${filterJurusan} `) && !cls.includes(` ${filterJurusan}`) && !cls.endsWith(` ${filterJurusan}`)) return false;
      }

      // 3. Filter Kelas Spesifik
      if (filterKelas !== 'all') {
        if (cls !== filterKelas) return false;
      }

      // 4. Filter Status Pemetaan
      if (filterStatusSiswa !== 'all') {
        const hasNotes = catatanList.some(c => String(c.siswa_nis) === nis);
        const hasViolations = riwayatPoin.some(p => String(p.siswa_nis) === nis);

        if (filterStatusSiswa === 'with_notes' && !hasNotes) return false;
        if (filterStatusSiswa === 'no_notes' && hasNotes) return false;
        if (filterStatusSiswa === 'with_violations' && !hasViolations) return false;
      }

      // 5. Search Siswa
      if (searchSiswa) {
        const q = searchSiswa.toLowerCase();
        if (!name.includes(q) && !nis.includes(q) && !cls.toLowerCase().includes(q)) return false;
      }

      return true;
    });
  }, [students, filterTingkat, filterJurusan, filterKelas, filterStatusSiswa, searchSiswa, catatanList, riwayatPoin]);

  // === FILTER CATATAN WALI KELAS (PANEL KANAN) ===
  const filteredCatatan = useMemo(() => {
    let list = catatanList.filter(c => {
      const student = students.find(s => String(getStudentNis(s)) === String(c.siswa_nis));
      if (!student) return false; // Abaikan catatan siswa yang sudah tidak ada
      
      // Filter siswa jika sedang memilih siswa spesifik
      if (selectedSiswa && String(c.siswa_nis) !== String(getStudentNis(selectedSiswa))) {
        return false;
      }

      // Filter Kelas Catatan
      if (!isKesiswaan && isWalas && walasClass) {
        if (c.kelas !== walasClass) return false;
      } else if (filterCatatanKelas !== 'all' && c.kelas !== filterCatatanKelas) {
        return false;
      }

      // Filter Kategori
      if (filterCatatanJenis !== 'all' && c.jenis_catatan !== filterCatatanJenis) {
        return false;
      }

      // Filter Rentang Waktu
      if (filterCatatanWaktu !== 'all') {
        const noteDate = new Date(c.tanggal);
        const now = new Date();
        if (filterCatatanWaktu === 'this_month') {
          if (noteDate.getMonth() !== now.getMonth() || noteDate.getFullYear() !== now.getFullYear()) return false;
        } else if (filterCatatanWaktu === 'last_7_days') {
          const diffDays = (now - noteDate) / (1000 * 60 * 60 * 24);
          if (diffDays > 7 || diffDays < 0) return false;
        }
      }

      // Search Catatan
      if (searchCatatan) {
        const q = searchCatatan.toLowerCase();
        const sName = (c.siswa_name || '').toLowerCase();
        const sNis = String(c.siswa_nis || '');
        const isi = (c.isi_catatan || '').toLowerCase();
        const tindak = (c.tindak_lanjut || '').toLowerCase();
        const guru = (c.teacher_name || '').toLowerCase();
        if (!sName.includes(q) && !sNis.includes(q) && !isi.includes(q) && !tindak.includes(q) && !guru.includes(q)) {
          return false;
        }
      }

      return true;
    });

    // Sorting
    list = [...list].sort((a, b) => {
      if (sortCatatan === 'terbaru') return new Date(b.tanggal) - new Date(a.tanggal);
      if (sortCatatan === 'terlama') return new Date(a.tanggal) - new Date(b.tanggal);
      if (sortCatatan === 'nama_asc') return (a.siswa_name || '').localeCompare(b.siswa_name || '', undefined, { numeric: true, sensitivity: 'base' });
      return 0;
    });

    return list;
  }, [catatanList, selectedSiswa, filterCatatanKelas, filterCatatanJenis, filterCatatanWaktu, searchCatatan, sortCatatan, students]);

  // === PEMETAAN STATS & KPI ===
  const kpiStats = useMemo(() => {
    const totalSiswa = filteredStudents.length;
    const siswaWithNotes = filteredStudents.filter(s => catatanList.some(c => String(c.siswa_nis) === String(getStudentNis(s)))).length;
    const siswaNoNotes = totalSiswa - siswaWithNotes;
    const siswaWithViolations = filteredStudents.filter(s => riwayatPoin.some(p => String(p.siswa_nis) === String(getStudentNis(s)))).length;
    const totalCatatan = filteredCatatan.length;

    return {
      totalSiswa,
      siswaWithNotes,
      siswaNoNotes,
      siswaWithViolations,
      totalCatatan
    };
  }, [filteredStudents, catatanList, riwayatPoin, filteredCatatan]);

  const resetLeftFilters = () => {
    setSearchSiswa('');
    setFilterTingkat('all');
    setFilterJurusan('all');
    setFilterKelas('all');
    setFilterStatusSiswa('all');
  };

  const isLeftFiltered = searchSiswa || filterTingkat !== 'all' || filterJurusan !== 'all' || filterKelas !== 'all' || filterStatusSiswa !== 'all';

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
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet('Catatan Walikelas');
    if (data.length > 0) {
      const keys = Object.keys(data[0]);
      ws.addRow(keys);
      data.forEach(item => ws.addRow(keys.map(k => item[k])));
    }
    wb.xlsx.writeBuffer().then(buf => {
      saveAs(new Blob([buf]), `Catatan_Walikelas_${new Date().toISOString().split('T')[0]}.xlsx`);
    });
  };

  const exportClassRecapExcel = () => {
    if (filteredStudents.length === 0) return showToast("Tidak ada data siswa untuk diekspor", "warning");

    const data = filteredStudents.map((student, idx) => {
      const nis = getStudentNis(student);
      const name = getStudentName(student);
      const cls = getStudentClass(student);

      const notes = catatanList.filter(c => String(c.siswa_nis) === String(nis));
      const points = riwayatPoin.filter(p => String(p.siswa_nis) === String(nis));
      const totalPoin = points.reduce((sum, p) => sum + (parseInt(p.poin) || 0), 0);
      
      const sakit = absensiList.filter(a => String(a.siswa_nis) === String(nis) && a.status === 'Sakit' && (a.approval_status === 'approved' || a.approval_status === 'otomatis')).length;
      const izin = absensiList.filter(a => String(a.siswa_nis) === String(nis) && a.status === 'Izin' && (a.approval_status === 'approved' || a.approval_status === 'otomatis')).length;
      const alpa = absensiList.filter(a => String(a.siswa_nis) === String(nis) && a.status === 'Alpa' && (a.approval_status === 'approved' || a.approval_status === 'otomatis')).length;

      return {
        "No": idx + 1,
        "NIS": nis,
        "Nama Siswa": name,
        "Kelas": cls,
        "Total Catatan Wali Kelas": notes.length,
        "Total Poin Pelanggaran": totalPoin,
        "Sakit (Hari)": sakit,
        "Izin (Hari)": izin,
        "Alpa (Hari)": alpa,
        "Total Absen (Hari)": sakit + izin + alpa
      };
    });

    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet('Rekap Kedisiplinan Siswa');
    if (data.length > 0) {
      const keys = Object.keys(data[0]);
      ws.addRow(keys);
      data.forEach(item => ws.addRow(keys.map(k => item[k])));
    }
    wb.xlsx.writeBuffer().then(buf => {
      saveAs(new Blob([buf]), `Rekap_WaliKelas_${filterKelas !== 'all' ? filterKelas : 'Filtered'}_${new Date().toISOString().split('T')[0]}.xlsx`);
    });
  };

  const downloadRapotSiswa = () => {
    if (!selectedSiswa) return;
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: appSettings.defaultPaperSize === 'F4' ? [215, 330] : 'a4'
    });

    const pageWidth = 210;
    const name = getStudentName(selectedSiswa);
    const nis = getStudentNis(selectedSiswa);
    const kelas = getStudentClass(selectedSiswa);

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

  return (
    <div className="flex flex-col gap-4 w-full animate-in fade-in duration-300 pb-20 sm:pb-6">
      <PageHeader
        title="Catatan Wali Kelas"
        icon={MessageSquare}
        description="Pencatatan kegiatan monitoring, bimbingan, dan konsultasi wali kelas dengan siswa binaan."
        onBack={onBack}
      />

      {/* === TOP KPI & PEMETAAN OVERVIEW CARDS === */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        {/* Card 1: Total Siswa Binaan */}
        <div className="p-3.5 bg-white rounded-[var(--ui-radius-card)] border border-slate-200/80 shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-[var(--ui-radius-small)] bg-emerald-50 border border-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
            <Users size={18} strokeWidth={2.2} />
          </div>
          <div className="min-w-0">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Siswa Binaan</span>
            <div className="flex items-baseline gap-1 mt-0.5">
              <span className="text-base font-black text-slate-800">{kpiStats.totalSiswa}</span>
              <span className="text-[10px] text-slate-400 font-bold">anak</span>
            </div>
          </div>
        </div>

        {/* Card 2: Siswa Terbina (Ada Catatan) */}
        <div className="p-3.5 bg-white rounded-[var(--ui-radius-card)] border border-slate-200/80 shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-[var(--ui-radius-small)] bg-emerald-50 border border-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
            <UserCheck size={18} strokeWidth={2.2} />
          </div>
          <div className="min-w-0">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Sudah Dicatat</span>
            <div className="flex items-baseline gap-1 mt-0.5">
              <span className="text-base font-black text-emerald-700">{kpiStats.siswaWithNotes}</span>
              <span className="text-[10px] text-slate-400 font-bold">siswa</span>
            </div>
          </div>
        </div>

        {/* Card 3: Siswa Belum Ada Catatan */}
        <div className="p-3.5 bg-white rounded-[var(--ui-radius-card)] border border-slate-200/80 shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-[var(--ui-radius-small)] bg-amber-50 border border-amber-100 text-amber-600 flex items-center justify-center shrink-0">
            <UserX size={18} strokeWidth={2.2} />
          </div>
          <div className="min-w-0">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Belum Dicatat</span>
            <div className="flex items-baseline gap-1 mt-0.5">
              <span className="text-base font-black text-amber-700">{kpiStats.siswaNoNotes}</span>
              <span className="text-[10px] text-slate-400 font-bold">siswa</span>
            </div>
          </div>
        </div>

        {/* Card 4: Siswa Berpoin / Perlu Perhatian */}
        <div className="p-3.5 bg-white rounded-[var(--ui-radius-card)] border border-slate-200/80 shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-[var(--ui-radius-small)] bg-rose-50 border border-rose-100 text-rose-600 flex items-center justify-center shrink-0">
            <ShieldAlert size={18} strokeWidth={2.2} />
          </div>
          <div className="min-w-0">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Ada Pelanggaran</span>
            <div className="flex items-baseline gap-1 mt-0.5">
              <span className="text-base font-black text-rose-700">{kpiStats.siswaWithViolations}</span>
              <span className="text-[10px] text-slate-400 font-bold">siswa</span>
            </div>
          </div>
        </div>

        {/* Card 5: Total Catatan Terbit */}
        <div className="p-3.5 bg-white rounded-[var(--ui-radius-card)] border border-slate-200/80 shadow-xs flex items-center gap-3 col-span-2 sm:col-span-2 lg:col-span-1">
          <div className="w-10 h-10 rounded-[var(--ui-radius-small)] bg-teal-50 border border-teal-100 text-teal-600 flex items-center justify-center shrink-0">
            <MessageSquare size={18} strokeWidth={2.2} />
          </div>
          <div className="min-w-0">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Total Entri Catatan</span>
            <div className="flex items-baseline gap-1 mt-0.5">
              <span className="text-base font-black text-teal-700">{kpiStats.totalCatatan}</span>
              <span className="text-[10px] text-slate-400 font-bold">entri</span>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Tab Switcher */}
      <div className="lg:hidden flex items-center gap-2 overflow-x-auto no-scrollbar shrink-0">
        <Button
          variant={mobileTab === 'siswa' ? 'primary' : 'ghost'}
          onClick={() => setMobileTab('siswa')}
          className={`flex-1 shrink-0 ${mobileTab !== 'siswa' ? 'text-slate-500' : ''}`}
        >
          <Users size={15} />
          <span>1. Siswa Binaan ({filteredStudents.length})</span>
        </Button>
        <Button
          variant={mobileTab === 'catatan' ? 'primary' : 'ghost'}
          onClick={() => setMobileTab('catatan')}
          className={`flex-1 shrink-0 ${mobileTab !== 'catatan' ? 'text-slate-500' : ''}`}
        >
          <MessageSquare size={15} />
          <span>2. Catatan ({filteredCatatan.length})</span>
        </Button>
      </div>

      <div className="grid grid-cols-12 gap-4 lg:gap-5 items-start">
        {/* ================= SISI KIRI: PANEL SISWA BINAAN & PEMETAAN KELAS ================= */}
        <div className={`bg-white rounded-[var(--ui-radius-card)] border border-slate-200/80 shadow-xs overflow-hidden flex flex-col h-[calc(100vh-250px)] min-h-[460px] lg:h-[720px] col-span-12 lg:col-span-4 ${
          mobileTab === 'siswa' ? 'flex' : 'hidden lg:flex'
        }`}>
          {/* Header Panel Kiri */}
          <div className="p-3.5 border-b border-slate-100 bg-slate-50/70 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-xs">
                <Users size={13} />
              </div>
              <h3 className="font-extrabold text-slate-800 text-xs tracking-tight">
                Siswa Binaan {walasClass ? `(${walasClass})` : ''}
              </h3>
            </div>
            <div className="flex items-center gap-1.5">
              {isLeftFiltered && (
                <button
                  type="button"
                  onClick={resetLeftFilters}
                  className="text-[10px] font-bold text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 px-2 py-0.5 rounded-[var(--ui-radius-pill)] border border-rose-200 transition-colors flex items-center gap-1 cursor-pointer"
                  title="Reset semua filter siswa"
                >
                  <RotateCcw size={10} /> Reset
                </button>
              )}
              <span className="text-[10px] font-black text-slate-600 bg-slate-100 border border-slate-200/80 px-2 py-0.5 rounded-[var(--ui-radius-pill)]">
                {filteredStudents.length} / {students.length}
              </span>
            </div>
          </div>

          {/* Filter Bar Panel Kiri: Tingkat, Jurusan, Kelas, Status, Search */}
          <div className="p-3 border-b border-slate-100 bg-white shrink-0 flex flex-col gap-2.5">
            {(!isKesiswaan && isWalas && walasClass) ? (
              <div className="flex items-center gap-1.5 p-2 bg-emerald-50 border border-emerald-100 rounded-[var(--ui-radius-small)]">
                <Users size={14} className="text-emerald-600" />
                <span className="text-xs font-black text-emerald-800 tracking-tight">Menampilkan khusus kelas binaan Anda.</span>
              </div>
            ) : (
              <>
                {/* Quick Pill Filter: Tingkat */}
                <div className="flex items-center gap-1 bg-slate-100/80 p-0.5 rounded-[var(--ui-radius-small)]">
                  {[
                    { id: 'all', label: 'Semua' },
                    { id: 'X', label: 'Kelas X' },
                    { id: 'XI', label: 'Kelas XI' },
                    { id: 'XII', label: 'Kelas XII' },
                  ].map(tab => (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => { setFilterTingkat(tab.id); setFilterKelas('all'); }}
                      className={`flex-1 py-1 text-[11px] font-bold rounded-[var(--ui-radius-small)] transition-all border-none cursor-pointer text-center ${
                        filterTingkat === tab.id
                          ? 'bg-white text-slate-800 shadow-xs font-black'
                          : 'text-slate-500 hover:text-slate-800 bg-transparent'
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>

                {/* Row Filter: Jurusan & Kelas Binaan */}
                <div className="grid grid-cols-2 gap-2">
                  <div className="w-full">
                    <CustomSelect
                      options={[
                        { value: 'all', label: 'Semua Jurusan' },
                        ...jurusanList.map(j => ({ value: j, label: `Jurusan ${j}` }))
                      ]}
                      value={filterJurusan}
                      onChange={v => { setFilterJurusan(v); setFilterKelas('all'); }}
                      placeholder="Filter Jurusan"
                    />
                  </div>

                  <div className="w-full">
                    <CustomSelect
                      options={classOptions}
                      value={filterKelas}
                      onChange={v => setFilterKelas(v)}
                      placeholder="Filter Kelas"
                    />
                  </div>
                </div>
              </>
            )}

            {/* Filter Status Pemetaan Siswa */}
            <div className="w-full">
              <CustomSelect
                options={[
                  { value: 'all', label: 'Semua Status Siswa' },
                  { 
                    value: 'with_notes', 
                    searchText: 'Sudah Ada Catatan',
                    label: (
                      <div className="flex items-center gap-1.5">
                        <CheckCircle2 size={12} className="text-emerald-500" />
                        <span>Sudah Ada Catatan</span>
                      </div>
                    )
                  },
                  { 
                    value: 'no_notes', 
                    searchText: 'Belum Ada Catatan',
                    label: (
                      <div className="flex items-center gap-1.5">
                        <Hourglass size={12} className="text-amber-500" />
                        <span>Belum Ada Catatan</span>
                      </div>
                    )
                  },
                  { 
                    value: 'with_violations', 
                    searchText: 'Memiliki Pelanggaran Poin',
                    label: (
                      <div className="flex items-center gap-1.5">
                        <AlertCircle size={12} className="text-rose-500" />
                        <span>Memiliki Pelanggaran/Poin</span>
                      </div>
                    )
                  },
                ]}
                value={filterStatusSiswa}
                onChange={v => setFilterStatusSiswa(v)}
                placeholder="Status Binaan"
              />
            </div>

            {/* Search Box */}
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Cari nama atau NIS siswa..."
                value={searchSiswa}
                onChange={e => setSearchSiswa(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 border border-slate-200/80 rounded-[var(--ui-radius-small)] text-xs font-semibold placeholder:text-slate-400 focus:outline-none focus:border-[var(--ui-primary)] focus:ring-2 focus:ring-[var(--ui-primary)]/10 transition-all bg-slate-50/50 focus:bg-white"
              />
              {searchSiswa && (
                <button 
                  onClick={() => setSearchSiswa('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 border-none bg-transparent cursor-pointer p-0.5"
                >
                  <X size={13} />
                </button>
              )}
            </div>
          </div>

          {/* List Siswa */}
          <div className="flex-1 overflow-y-auto divide-y divide-slate-100/80 custom-scrollbar">
            {filteredStudents.length === 0 ? (
              <div className="p-8 flex flex-col items-center justify-center text-center gap-2 text-slate-400">
                <Users size={28} className="text-slate-300" />
                <p className="text-xs font-bold">Tidak ada siswa ditemukan</p>
                <p className="text-[10px] text-slate-400">Coba ubah filter tingkat, jurusan, atau kata kunci pencarian.</p>
                {isLeftFiltered && (
                  <Button variant="outline" size="sm" onClick={resetLeftFilters} className="mt-1 text-xs">
                    Reset Filter
                  </Button>
                )}
              </div>
            ) : (
              filteredStudents
                .slice((siswaPage - 1) * siswaPerPage, siswaPage * siswaPerPage)
                .map(siswa => {
                  const nis = getStudentNis(siswa);
                  const name = getStudentName(siswa);
                  const cls = getStudentClass(siswa);

                  const siswaCatatan = catatanList.filter(c => String(c.siswa_nis) === String(nis));
                  const siswaPoin = riwayatPoin.filter(p => String(p.siswa_nis) === String(nis));
                  const totalPoin = siswaPoin.reduce((sum, p) => sum + (parseInt(p.poin) || 0), 0);
                  const isSelected = selectedSiswa && String(getStudentNis(selectedSiswa)) === String(nis);

                  return (
                    <button
                      key={nis}
                      type="button"
                      onClick={() => {
                        setSelectedSiswa(isSelected ? null : siswa);
                        setMobileTab('catatan');
                      }}
                      className={`w-full flex items-center justify-between text-left p-3 transition-all duration-200 cursor-pointer border-none bg-transparent hover:bg-slate-50 ${
                        isSelected 
                          ? 'bg-emerald-50/70 font-semibold border-l-4 border-l-emerald-600 shadow-xs' 
                          : 'border-l-4 border-l-transparent'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className={`w-8 h-8 rounded-[var(--ui-radius-small)] flex items-center justify-center text-xs font-black shrink-0 border ${
                          isSelected 
                            ? 'bg-emerald-600 text-white border-emerald-700 shadow-xs' 
                            : siswaCatatan.length > 0
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : 'bg-slate-100 text-slate-600 border-slate-200'
                        }`}>
                          {getInitials(name)}
                        </div>
                        <div className="min-w-0">
                          <p className="font-extrabold text-slate-800 text-xs truncate leading-snug" title={name}>{name}</p>
                          <p className="text-[10px] text-slate-400 font-semibold mt-0.5 flex items-center gap-1.5">
                            <span>{nis}</span>
                            {cls && <span className="text-slate-500">• {cls}</span>}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0 pl-2">
                        {siswaCatatan.length > 0 ? (
                          <span className="text-[9px] font-black bg-emerald-100 text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded-[var(--ui-radius-pill)]">
                            {siswaCatatan.length} Catatan
                          </span>
                        ) : (
                          <span className="text-[9px] font-semibold text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded-[var(--ui-radius-pill)]">
                            Belum Ada
                          </span>
                        )}

                        {totalPoin > 0 && (
                          <span className={`text-[9px] font-black px-2 py-0.5 rounded-[var(--ui-radius-pill)] ${
                            totalPoin >= 100 
                              ? 'bg-rose-100 text-rose-700 border border-rose-200' 
                              : totalPoin >= 50 
                                ? 'bg-amber-100 text-amber-700 border border-amber-200' 
                                : 'bg-slate-100 text-slate-700 border border-slate-200'
                          }`}>
                            +{totalPoin}p
                          </span>
                        )}

                        <ChevronRight size={13} className={`transition-transform shrink-0 ${isSelected ? 'translate-x-0.5 text-emerald-600' : 'text-slate-300'}`} />
                      </div>
                    </button>
                  );
                })
            )}
          </div>

          {/* Pagination Siswa */}
          <div className="shrink-0 border-t border-slate-100 bg-slate-50/50">
            <PaginationControls
              currentPage={siswaPage}
              totalItems={filteredStudents.length}
              itemsPerPage={siswaPerPage}
              onPageChange={setSiswaPage}
              onItemsPerPageChange={(v) => { setSiswaPerPage(v); setSiswaPage(1); }}
            />
          </div>
        </div>

        {/* ================= SISI KANAN: PANEL CATATAN WALI KELAS ================= */}
        <div className={`col-span-12 lg:col-span-8 flex flex-col gap-4 ${
          mobileTab === 'catatan' ? 'flex' : 'hidden lg:flex'
        }`}>
          <div className="bg-white rounded-[var(--ui-radius-card)] border border-slate-200/80 shadow-xs overflow-hidden flex flex-col h-[calc(100vh-250px)] min-h-[460px] lg:h-[720px]">
            {/* Header: Siswa Terpilih (Morphing Banner) atau Toolbar Normal */}
            {selectedSiswa ? (
              <div className="bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 text-white p-4 sm:p-5 relative overflow-hidden shrink-0 shadow-xs">
                <div className="absolute inset-0 opacity-10 pointer-events-none">
                  <div className="absolute top-0 right-0 w-36 h-36 rounded-full border-8 border-white -mr-8 -mt-8" />
                  <div className="absolute bottom-0 left-1/3 w-20 h-20 rounded-full border-4 border-white -mb-4" />
                </div>
                <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => { setSelectedSiswa(null); setMobileTab('siswa'); }}
                      className="lg:hidden p-1.5 rounded-[var(--ui-radius-small)] bg-white/15 hover:bg-white/25 text-white border border-white/20 shrink-0"
                      title="Kembali ke Daftar Siswa"
                    >
                      <ChevronLeft size={16} />
                    </button>
                    <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-[var(--ui-radius-small)] bg-white/20 text-white border border-white/30 flex items-center justify-center text-sm font-black shrink-0 shadow-xs">
                      {getInitials(getStudentName(selectedSiswa))}
                    </div>
                    <div className="min-w-0">
                      <span className="text-[9.5px] font-black uppercase tracking-widest text-emerald-200">Siswa Terpilih</span>
                      <h3 className="font-extrabold text-sm sm:text-base leading-tight mt-0.5 truncate">{getStudentName(selectedSiswa)}</h3>
                      <p className="text-[11px] text-emerald-100 font-semibold mt-0.5">
                        NIS: {getStudentNis(selectedSiswa)} · Kelas: {getStudentClass(selectedSiswa) || '-'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 flex-wrap">
                    {/* Violations Count / Poin Badge */}
                    {(() => {
                      const totalPoin = riwayatPoin
                        .filter(p => String(p.siswa_nis) === String(getStudentNis(selectedSiswa)))
                        .reduce((sum, p) => sum + (parseInt(p.poin) || 0), 0);
                      return totalPoin > 0 ? (
                        <div className={`px-2.5 py-1 rounded-[var(--ui-radius-pill)] text-[10px] font-black flex items-center gap-1 border shadow-xs ${
                          totalPoin >= 100 
                            ? 'bg-rose-500/30 text-rose-100 border-rose-300/40' 
                            : 'bg-amber-500/30 text-amber-100 border-amber-300/40'
                        }`}>
                          <ShieldAlert size={12} />
                          <span>{totalPoin} Poin</span>
                        </div>
                      ) : null;
                    })()}

                    <Button
                      onClick={downloadRapotSiswa}
                      className="bg-white/15 hover:bg-white/25 border border-white/20 text-white font-bold text-xs px-2.5 py-1.5 h-8 cursor-pointer rounded-[var(--ui-radius-small)] flex items-center gap-1 shrink-0"
                    >
                      <Printer size={13} />
                      <span className="hidden sm:inline">Rapor PDF</span>
                    </Button>

                    {canAdd && (
                      <Button
                        onClick={() => setActiveModal({
                          siswa_nis: String(getStudentNis(selectedSiswa)),
                          siswa_name: getStudentName(selectedSiswa),
                          kelas: getStudentClass(selectedSiswa) || walasClass
                        })}
                        className="bg-white text-emerald-800 hover:bg-emerald-50 border-none font-black text-xs px-3 py-1.5 h-8 cursor-pointer rounded-[var(--ui-radius-small)] flex items-center gap-1 shrink-0 shadow-xs"
                      >
                        <Plus size={13} strokeWidth={2.5} />
                        <span>+ Catat</span>
                      </Button>
                    )}

                    <button
                      onClick={() => setSelectedSiswa(null)}
                      className="p-1.5 bg-white/10 hover:bg-white/20 border border-white/20 text-white rounded-[var(--ui-radius-small)] transition-all cursor-pointer flex items-center justify-center h-8 w-8"
                      title="Tutup Filter Siswa"
                    >
                      <X size={15} />
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              /* Toolbar Normal Catatan */
              <div className="p-3.5 sm:p-4 border-b border-slate-100 bg-slate-50/70 flex flex-col gap-3 shrink-0">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                  <div className="flex items-center gap-2.5">
                    <div 
                      className="w-9 h-9 rounded-[var(--ui-radius-small)] flex items-center justify-center text-white shrink-0 shadow-xs"
                      style={{ background: "var(--ui-primary)" }}
                    >
                      <MessageSquare size={16} strokeWidth={2.2} />
                    </div>
                    <div>
                      <h3 className="font-extrabold text-slate-800 text-xs sm:text-sm tracking-tight">Riwayat Catatan Wali Kelas</h3>
                      <p className="text-[10px] sm:text-[11px] font-semibold text-slate-400">
                        {filteredCatatan.length} entri catatan ditemukan
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    {canAdd && (
                      <button
                        type="button"
                        onClick={() => setActiveModal({ kelas: walasClass })}
                        className="py-1.5 px-3 rounded-[var(--ui-radius-small)] font-black text-xs text-white flex items-center justify-center gap-1.5 transition-all shadow-xs cursor-pointer"
                        style={{ background: "var(--ui-primary)" }}
                      >
                        <Plus size={14} strokeWidth={2.5} />
                        <span>Tambah Catatan</span>
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={exportExcel}
                      className="py-1.5 px-2.5 rounded-[var(--ui-radius-small)] font-bold text-xs bg-white hover:bg-slate-100 text-slate-700 border border-slate-200/80 flex items-center justify-center gap-1 transition-all shadow-xs cursor-pointer shrink-0"
                      title="Export data catatan ke Excel"
                    >
                      <Download size={13} className="text-slate-500" />
                      <span>Excel</span>
                    </button>
                    <button
                      type="button"
                      onClick={exportClassRecapExcel}
                      className="py-1.5 px-2.5 rounded-[var(--ui-radius-small)] font-bold text-xs bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200/80 flex items-center justify-center gap-1 transition-all shadow-xs cursor-pointer shrink-0"
                      title="Export Rekapitulasi Kelas ke Excel"
                    >
                      <Download size={13} className="text-emerald-600" />
                      <span>Rekap</span>
                    </button>
                  </div>
                </div>

                {/* Filter Controls Row: Search, Kelas, Kategori, Periode, Sort */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 pt-1">
                  {/* Search in Notes */}
                  <div className="relative">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Cari isi catatan, siswa..."
                      value={searchCatatan}
                      onChange={e => setSearchCatatan(e.target.value)}
                      className="w-full pl-9 pr-3 py-1.5 border border-slate-200/80 rounded-[var(--ui-radius-small)] text-xs font-semibold placeholder:text-slate-400 focus:outline-none focus:border-[var(--ui-primary)] focus:bg-white bg-white transition-all"
                    />
                    {searchCatatan && (
                      <button 
                        onClick={() => setSearchCatatan('')}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 border-none bg-transparent cursor-pointer p-0.5"
                      >
                        <X size={13} />
                      </button>
                    )}
                  </div>

                  {/* Filter Kelas Catatan */}
                  <div className="w-full">
                    <CustomSelect
                      options={catatanClassOptions}
                      value={filterCatatanKelas}
                      onChange={setFilterCatatanKelas}
                      placeholder="Semua Kelas"
                    />
                  </div>

                  {/* Filter Kategori */}
                  <div className="w-full">
                    <CustomSelect
                      options={[
                        { value: 'all', label: 'Semua Kategori' },
                        ...JENIS_CATATAN.map(j => ({ 
                          value: j.value, 
                          label: `${j.label} (${catatanList.filter(c => c.jenis_catatan === j.value).length})` 
                        }))
                      ]}
                      value={filterCatatanJenis}
                      onChange={setFilterCatatanJenis}
                      placeholder="Semua Kategori"
                    />
                  </div>

                  {/* Filter Waktu & Sort */}
                  <div className="w-full">
                    <CustomSelect
                      options={[
                        { value: 'all', label: 'Semua Waktu' },
                        { value: 'this_month', label: '📅 Bulan Ini' },
                        { value: 'last_7_days', label: '⏱️ 7 Hari Terakhir' },
                      ]}
                      value={filterCatatanWaktu}
                      onChange={setFilterCatatanWaktu}
                      placeholder="Periode Waktu"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* List Catatan */}
            {isLoading ? (
              <div className="p-10 flex-1 flex items-center justify-center text-slate-400 text-xs font-bold">
                Memuat data catatan wali kelas...
              </div>
            ) : filteredCatatan.length === 0 ? (
              <div className="p-10 flex-1 flex flex-col items-center justify-center text-center">
                <div className="w-14 h-14 rounded-[var(--ui-radius-card)] bg-emerald-50 text-emerald-500 border border-emerald-100 flex items-center justify-center mb-3">
                  <MessageSquare size={26} />
                </div>
                <h3 className="font-extrabold text-slate-800 text-sm">Belum Ada Catatan Wali Kelas</h3>
                <p className="text-xs text-slate-400 max-w-xs mt-1 leading-relaxed">
                  {canAdd ? 'Klik tombol "+ Tambah Catatan" untuk mulai mencatat kegiatan bimbingan dan konsultasi siswa.' : 'Tidak ada catatan wali kelas yang cocok dengan filter saat ini.'}
                </p>
              </div>
            ) : (
              <>
                <div className="divide-y divide-slate-100 flex-1 overflow-y-auto custom-scrollbar">
                  {filteredCatatan
                    .slice((catatanPage - 1) * catatanPerPage, catatanPage * catatanPerPage)
                    .map(c => {
                      const jenis = getJenisInfo(c.jenis_catatan);
                      const Icon = jenis.icon;

                      return (
                        <div key={c.id} className="p-4 sm:p-5 hover:bg-slate-50/60 transition-colors flex gap-3 sm:gap-4 items-start">
                          {/* Left icon denoting category */}
                          <div className={`w-9 h-9 rounded-[var(--ui-radius-small)] flex items-center justify-center shrink-0 border border-solid ${
                            c.jenis_catatan === 'akademik' ? 'bg-indigo-50 text-indigo-600 border-indigo-200/70' :
                            c.jenis_catatan === 'perilaku' ? 'bg-amber-50 text-amber-600 border-amber-200/70' :
                            c.jenis_catatan === 'prestasi' ? 'bg-emerald-50 text-emerald-600 border-emerald-200/70' :
                            c.jenis_catatan === 'kesehatan' ? 'bg-rose-50 text-rose-600 border-rose-200/70' :
                            c.jenis_catatan === 'konseling' ? 'bg-purple-50 text-purple-600 border-purple-200/70' :
                            'bg-slate-50 text-slate-600 border-slate-200/70'
                          }`}>
                            <Icon size={16} />
                          </div>

                          {/* Post Card Layout */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2 mb-1.5 flex-wrap">
                              <div className="flex items-center gap-2 flex-wrap">
                                {!selectedSiswa && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const st = students.find(s => String(getStudentNis(s)) === String(c.siswa_nis));
                                      if (st) setSelectedSiswa(st);
                                    }}
                                    className="font-extrabold text-slate-800 text-xs hover:text-emerald-700 hover:underline cursor-pointer border-none bg-transparent p-0 text-left"
                                  >
                                    {c.siswa_name || c.siswa_nis}
                                  </button>
                                )}
                                {!selectedSiswa && <span className="text-slate-300 text-xs">·</span>}
                                <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded-[var(--ui-radius-pill)]">
                                  {c.kelas || 'Tanpa Kelas'}
                                </span>
                                <span className="text-slate-300 text-xs">·</span>
                                <span className={`text-[9px] font-black px-2 py-0.5 rounded-[var(--ui-radius-pill)] border border-solid ${jenis.color}`}>
                                  {jenis.label}
                                </span>
                                {c.poin_pelanggaran_id && (
                                  <span className="text-[9px] font-bold bg-amber-50 text-amber-800 border border-amber-200 px-1.5 py-0.5 rounded-[var(--ui-radius-pill)] flex items-center gap-1">
                                    <LinkIcon size={9} /> Terkait Pelanggaran
                                  </span>
                                )}
                              </div>

                              {/* Action buttons */}
                              <div className="flex items-center gap-1">
                                <button 
                                  onClick={() => setActiveModal(c)} 
                                  className="p-1.5 hover:bg-slate-100 text-slate-400 hover:text-slate-700 rounded-[var(--ui-radius-small)] transition-colors border-none bg-transparent cursor-pointer flex items-center justify-center"
                                  title="Edit Catatan"
                                >
                                  <Edit2 size={13} />
                                </button>
                                <button 
                                  onClick={() => handleDelete(c.id)} 
                                  className="p-1.5 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded-[var(--ui-radius-small)] transition-colors border-none bg-transparent cursor-pointer flex items-center justify-center"
                                  title="Hapus Catatan"
                                >
                                  <Trash2 size={13} />
                                </button>
                              </div>
                            </div>

                            <p className="text-xs text-slate-700 font-medium leading-relaxed mt-1 break-words">{c.isi_catatan}</p>

                            {c.tindak_lanjut && (
                              <div className="mt-2.5 bg-slate-50 border border-slate-200/80 p-2.5 rounded-[var(--ui-radius-small)] flex items-start gap-2">
                                <CheckCircle2 size={13} className="text-emerald-600 shrink-0 mt-0.5" />
                                <p className="text-[11px] text-slate-600 leading-normal font-medium">
                                  <span className="font-extrabold text-slate-800">Tindak Lanjut:</span> {c.tindak_lanjut}
                                </p>
                              </div>
                            )}

                            <div className="flex items-center gap-2.5 mt-3 text-[10px] text-slate-400 font-semibold">
                              <span className="flex items-center gap-1">
                                <Calendar size={11} /> 
                                {new Date(c.tanggal).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'short', year: 'numeric' })}
                              </span>
                              <span>•</span>
                              <span>Oleh: <strong className="text-slate-600">{c.teacher_name || c.teacher_code || "Wali Kelas"}</strong></span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                </div>
                <div className="shrink-0 border-t border-slate-100 bg-slate-50/50">
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
          students={students}
          classes={classes}
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
