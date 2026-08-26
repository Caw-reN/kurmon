import { useState, useEffect } from 'react';
import { 
  CheckCircle2, XCircle, FileText, RefreshCw, AlertCircle, 
  GitMerge, MapPin, Building2, Trash2, Printer, Check, Settings, 
  Search, Users, Calendar, ArrowRight, ShieldCheck, ChevronRight
} from 'lucide-react';
import useAuthStore from '../../../store/monitoring/authStore.js';
import { getDatabaseSnapshot, setDatabaseSnapshot } from '../../../utils/dataSource.js';
import { PageHeader, Avatar } from '../../../components/monitoring/ui/index.js';
import { Button, Modal } from '../../../components/ui.jsx';

const getToken = () => {
  try {
    const raw = sessionStorage.getItem("school_schedule_session_v1");
    if (raw) return JSON.parse(raw)?.authToken;
  } catch (e) {}
  return null;
};

const KelolaAdministrasiPKL = ({ currentUser: propsUser, readOnly, appSettings, setAppSettings, onSave }) => {
  const { user: storeUser } = useAuthStore();
  const currentUser = propsUser || storeUser;
  const [activeTab, setActiveTab] = useState("surat");
  const [suratList, setSuratList] = useState([]);
  const [mutasiList, setMutasiList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  // Auto numbering settings
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [accModal, setAccModal] = useState({ isOpen: false, suratId: null, formattedNumber: "" });

  const formatTemplate = appSettings?.suratFormat || "{INDEX}/PKL-SMK/{MONTH}/{YEAR}";
  const nextIndex = Number(appSettings?.suratNextIndex || 1);
  const padding = Number(appSettings?.suratPadding || 3);
  const monthStyle = appSettings?.suratMonthStyle || "romawi";

  const generateFormattedNumber = (format, index, padVal, mStyle) => {
    const now = new Date();
    const paddedIndex = String(index).padStart(Number(padVal || 3), '0');
    const romanMonths = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI", "XII"];
    const numericMonth = String(now.getMonth() + 1).padStart(2, '0');
    const monthVal = mStyle === 'romawi' ? romanMonths[now.getMonth()] : numericMonth;
    const yearVal = String(now.getFullYear());
    
    return format
      .replace(/{INDEX}/g, paddedIndex)
      .replace(/{MONTH}/g, monthVal)
      .replace(/{YEAR}/g, yearVal);
  };

  const updateNumberingSetting = async (key, val) => {
    try {
      const localSnapshot = getDatabaseSnapshot() || {};
      const newSettings = { ...(localSnapshot.appSettings || {}), [key]: val };
      const updatedSnapshot = { ...localSnapshot, appSettings: newSettings };
      
      setDatabaseSnapshot(updatedSnapshot);
      if (setAppSettings) setAppSettings(newSettings);
      if (onSave) await onSave(updatedSnapshot);
    } catch (e) {
      console.error(e);
    }
  };

  const role = currentUser?.role;
  const isHubinOrAdmin = ["admin", "hubin", "waka"].includes(role);
  const canViewSurat = isHubinOrAdmin || role === "kepsek";

  const fetchSurat = async () => {
    const token = getToken();
    try {
      const res = await fetch("/api/pkl/surat-pengantar", {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.ok) setSuratList(data.data || []);
    } catch (e) { console.error(e); }
  };

  const fetchMutasi = async () => {
    const token = getToken();
    try {
      const res = await fetch("/api/pkl/mutasi", {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.ok) setMutasiList(data.data || []);
    } catch (e) { console.error(e); }
  };

  useEffect(() => {
    if (activeTab === "surat") fetchSurat();
    if (activeTab === "mutasi") fetchMutasi();
  }, [activeTab]);

  const accSurat = (id) => {
    const num = generateFormattedNumber(formatTemplate, nextIndex, padding, monthStyle);
    setAccModal({ isOpen: true, suratId: id, formattedNumber: num });
  };

  const handleAccConfirm = async (e) => {
    if (e) e.preventDefault();
    if (!accModal.formattedNumber) return;
    setLoading(true);
    const token = getToken();
    try {
      const res = await fetch(`/api/pkl/surat-pengantar/${accModal.suratId}/acc`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ nomor_surat: accModal.formattedNumber })
      });
      if (res.ok) {
        await updateNumberingSetting('suratNextIndex', nextIndex + 1);
        setAccModal({ isOpen: false, suratId: null, formattedNumber: "" });
        showToast('Surat Pengantar berhasil disetujui & nomor resmi diterbitkan!');
        fetchSurat();
      } else {
        showToast('Gagal mem-ACC surat.', 'error');
      }
    } catch (err) { showToast('Terjadi kesalahan.', 'error'); }
    setLoading(false);
  };

  const validasiStempel = async (id) => {
    if (typeof window !== 'undefined' && window.confirm) {
      if (!window.confirm("Konfirmasi stempel/cap basah untuk surat ini? Status akan diperbarui ke Selesai (Sah).")) return;
    }
    setLoading(true);
    const token = getToken();
    try {
      const res = await fetch(`/api/pkl/surat-pengantar/${id}/stempel`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) { 
        showToast('Status surat diperbarui ke Selesai (Sah).'); 
        fetchSurat(); 
      } else {
        showToast('Gagal memperbarui status.', 'error');
      }
    } catch (err) { showToast('Terjadi kesalahan.', 'error'); }
    setLoading(false);
  };

  const accMutasi = async (id, status) => {
    if (typeof window !== 'undefined' && window.confirm) {
      if (!window.confirm(`Yakin ingin ${status === 'acc' ? 'MENYETUJUI' : 'MENOLAK'} permohonan mutasi lokasi PKL ini?`)) return;
    }
    setLoading(true);
    const token = getToken();
    try {
      const res = await fetch(`/api/pkl/mutasi/${id}/acc`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ status })
      });
      if (res.ok) { 
        showToast(`Mutasi berhasil ${status === 'acc' ? 'disetujui' : 'ditolak'}.`); 
        fetchMutasi(); 
      } else {
        showToast('Gagal memproses mutasi.', 'error');
      }
    } catch (err) { showToast('Terjadi kesalahan.', 'error'); }
    setLoading(false);
  };

  const deleteSurat = async (id) => {
    if (typeof window !== 'undefined' && window.confirm) {
      if (!window.confirm("Hapus data permohonan surat pengantar ini secara permanen?")) return;
    }
    setLoading(true);
    const token = getToken();
    try {
      const res = await fetch(`/api/pkl/surat-pengantar/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) { 
        showToast('Surat berhasil dihapus.'); 
        fetchSurat(); 
      } else {
        showToast('Gagal menghapus surat.', 'error');
      }
    } catch (err) { showToast('Terjadi kesalahan.', 'error'); }
    setLoading(false);
  };

  const deleteMutasi = async (id) => {
    if (typeof window !== 'undefined' && window.confirm) {
      if (!window.confirm("Hapus data permohonan mutasi ini secara permanen?")) return;
    }
    setLoading(true);
    const token = getToken();
    try {
      const res = await fetch(`/api/pkl/mutasi/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) { 
        showToast('Data mutasi berhasil dihapus.'); 
        fetchMutasi(); 
      } else {
        showToast('Gagal menghapus mutasi.', 'error');
      }
    } catch (err) { showToast('Terjadi kesalahan.', 'error'); }
    setLoading(false);
  };

  // Computed stats
  const suratPending = suratList.filter(s => s.status === 'pending').length;
  const suratAcc = suratList.filter(s => s.status === 'acc_hubin' || s.status === 'stempel_selesai').length;
  
  const mutasiPending = mutasiList.filter(m => m.final_status === 'pending').length;
  const mutasiAcc = mutasiList.filter(m => m.final_status === 'acc').length;

  return (
    <div className="space-y-4 sm:space-y-5 animate-in fade-in duration-300 pb-10">
      {/* Clean Page Header */}
      <PageHeader
        icon={FileText}
        title="Administrasi PKL"
        description="Kelola permohonan surat pengantar resmi dan mutasi lokasi PKL siswa."
      />

      {/* Unified Tab Navigator & Action Bar */}
      <div className="bg-white p-2 rounded-[var(--ui-radius-card)] border border-slate-200/80 shadow-[var(--ui-shadow-card)] flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
        <div className="flex items-center p-1 bg-[var(--ui-surface-muted)] rounded-[var(--ui-radius-control)] border border-[var(--ui-border-muted)] w-full sm:w-auto">
          <button
            type="button"
            onClick={() => setActiveTab('surat')}
            className={`flex-1 sm:flex-none px-3.5 py-1.5 rounded-[var(--ui-radius-small)] text-xs font-black transition-all cursor-pointer border-none flex items-center justify-center gap-1.5 ${
              activeTab === 'surat'
                ? 'bg-white text-slate-800 shadow-2xs'
                : 'bg-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <FileText size={14} />
            <span>Surat Pengantar ({suratList.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('mutasi')}
            className={`flex-1 sm:flex-none px-3.5 py-1.5 rounded-[var(--ui-radius-small)] text-xs font-black transition-all cursor-pointer border-none flex items-center justify-center gap-1.5 ${
              activeTab === 'mutasi'
                ? 'bg-white text-slate-800 shadow-2xs'
                : 'bg-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <GitMerge size={14} />
            <span>Permohonan Mutasi ({mutasiList.length})</span>
          </button>
        </div>

        {activeTab === "surat" && !readOnly && (
          <button
            type="button"
            onClick={() => setIsSettingsOpen(!isSettingsOpen)}
            className="px-3 py-1.5 rounded-[var(--ui-radius-control)] text-xs font-bold text-slate-700 bg-[var(--ui-surface-muted)] hover:bg-slate-100 border border-[var(--ui-border-soft)] flex items-center justify-center gap-1.5 cursor-pointer transition-all self-end sm:self-auto w-full sm:w-auto"
          >
            <Settings size={13} strokeWidth={2.2} />
            <span>Format Nomor Surat</span>
          </button>
        )}
      </div>

      {/* Quick KPI Stat Cards */}
      {activeTab === "surat" ? (
        <div className="grid grid-cols-3 gap-2.5 sm:gap-4">
          <div className="bg-white rounded-[var(--ui-radius-card)] p-3.5 sm:p-5 border border-slate-200/80 shadow-[var(--ui-shadow-card)] flex flex-col justify-between">
            <span className="text-[9px] sm:text-[11px] font-black uppercase tracking-wider text-slate-400 block mb-0.5 truncate">
              TOTAL PENGAJUAN
            </span>
            <div className="flex items-baseline gap-1 sm:gap-2">
              <h3 className="text-lg sm:text-3xl font-black text-slate-800 tracking-tight">{suratList.length}</h3>
              <span className="text-[10px] sm:text-xs font-bold text-slate-400">Berkas</span>
            </div>
          </div>

          <div className="bg-white rounded-[var(--ui-radius-card)] p-3.5 sm:p-5 border border-slate-200/80 shadow-[var(--ui-shadow-card)] flex flex-col justify-between">
            <span className="text-[9px] sm:text-[11px] font-black uppercase tracking-wider text-amber-600 block mb-0.5 truncate">
              MENUNGGU ACC
            </span>
            <div className="flex items-baseline gap-1 sm:gap-2">
              <h3 className="text-lg sm:text-3xl font-black text-amber-700 tracking-tight">{suratPending}</h3>
              <span className="text-[10px] sm:text-xs font-bold text-amber-600">Perlu Review</span>
            </div>
          </div>

          <div className="bg-white rounded-[var(--ui-radius-card)] p-3.5 sm:p-5 border border-slate-200/80 shadow-[var(--ui-shadow-card)] flex flex-col justify-between">
            <span className="text-[9px] sm:text-[11px] font-black uppercase tracking-wider text-emerald-600 block mb-0.5 truncate">
              SUDAH DI-ACC
            </span>
            <div className="flex items-baseline gap-1 sm:gap-2">
              <h3 className="text-lg sm:text-3xl font-black text-emerald-700 tracking-tight">{suratAcc}</h3>
              <span className="text-[10px] sm:text-xs font-bold text-emerald-600">Terbit Resmi</span>
            </div>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-2.5 sm:gap-4">
          <div className="bg-white rounded-[var(--ui-radius-card)] p-3.5 sm:p-5 border border-slate-200/80 shadow-[var(--ui-shadow-card)] flex flex-col justify-between">
            <span className="text-[9px] sm:text-[11px] font-black uppercase tracking-wider text-slate-400 block mb-0.5 truncate">
              TOTAL PERMOHONAN
            </span>
            <div className="flex items-baseline gap-1 sm:gap-2">
              <h3 className="text-lg sm:text-3xl font-black text-slate-800 tracking-tight">{mutasiList.length}</h3>
              <span className="text-[10px] sm:text-xs font-bold text-slate-400">Siswa</span>
            </div>
          </div>

          <div className="bg-white rounded-[var(--ui-radius-card)] p-3.5 sm:p-5 border border-slate-200/80 shadow-[var(--ui-shadow-card)] flex flex-col justify-between">
            <span className="text-[9px] sm:text-[11px] font-black uppercase tracking-wider text-amber-600 block mb-0.5 truncate">
              MENUNGGU ACC
            </span>
            <div className="flex items-baseline gap-1 sm:gap-2">
              <h3 className="text-lg sm:text-3xl font-black text-amber-700 tracking-tight">{mutasiPending}</h3>
              <span className="text-[10px] sm:text-xs font-bold text-amber-600">Pending</span>
            </div>
          </div>

          <div className="bg-white rounded-[var(--ui-radius-card)] p-3.5 sm:p-5 border border-slate-200/80 shadow-[var(--ui-shadow-card)] flex flex-col justify-between">
            <span className="text-[9px] sm:text-[11px] font-black uppercase tracking-wider text-emerald-600 block mb-0.5 truncate">
              DISETUJUI (MUTASI)
            </span>
            <div className="flex items-baseline gap-1 sm:gap-2">
              <h3 className="text-lg sm:text-3xl font-black text-emerald-700 tracking-tight">{mutasiAcc}</h3>
              <span className="text-[10px] sm:text-xs font-bold text-emerald-600">Pindah Lokasi</span>
            </div>
          </div>
        </div>
      )}

      {/* ── TAB 1: SURAT PENGANTAR ── */}
      {activeTab === "surat" && (
        <div className="space-y-4">
          {/* Format Settings Panel */}
          {isSettingsOpen && (
            <div className="bg-white rounded-[var(--ui-radius-card)] p-4 sm:p-5 border border-slate-200/80 shadow-[var(--ui-shadow-card)] space-y-3.5 animate-in fade-in">
              <div className="flex items-center justify-between pb-2 border-b border-[var(--ui-border-muted)]">
                <h4 className="font-extrabold text-xs text-slate-800 flex items-center gap-1.5">
                  <Settings size={14} className="text-slate-500" /> Konfigurasi Generator Nomor Surat Otomatis
                </h4>
                <button
                  type="button"
                  onClick={() => setIsSettingsOpen(false)}
                  className="text-slate-400 hover:text-slate-600 p-1 border-none bg-transparent cursor-pointer"
                >
                  <XCircle size={16} />
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Format Template</label>
                  <input
                    type="text"
                    value={formatTemplate}
                    onChange={e => updateNumberingSetting('suratFormat', e.target.value)}
                    className="w-full h-8 px-2.5 rounded border border-[var(--ui-border-soft)] font-mono text-xs"
                    placeholder="{INDEX}/PKL-SMK/{MONTH}/{YEAR}"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Nomor Urut Selanjutnya</label>
                  <input
                    type="number"
                    value={nextIndex}
                    onChange={e => updateNumberingSetting('suratNextIndex', parseInt(e.target.value) || 1)}
                    className="w-full h-8 px-2.5 rounded border border-[var(--ui-border-soft)] font-bold text-xs"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Contoh Pratinjau</label>
                  <div className="h-8 px-2.5 rounded bg-slate-50 border border-slate-200 flex items-center font-mono font-bold text-indigo-700 text-xs">
                    {generateFormattedNumber(formatTemplate, nextIndex, padding, monthStyle)}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* List Surat Cards */}
          <div className="space-y-3.5">
            {suratList.map(surat => {
              const isStempel = surat.status === "stempel_selesai";
              const isAcc = surat.status === "acc_hubin";
              const isPending = !isStempel && !isAcc;

              return (
                <div 
                  key={surat.id} 
                  className="bg-white rounded-[var(--ui-radius-card)] p-4 sm:p-5 border border-slate-200/80 shadow-[var(--ui-shadow-card)] flex flex-col md:flex-row md:items-center justify-between gap-4"
                >
                  <div className="flex items-start gap-3.5 min-w-0 flex-1">
                    <div className="w-10 h-10 rounded-[var(--ui-radius-control)] bg-indigo-50 text-indigo-600 border border-indigo-200/60 flex items-center justify-center shrink-0 shadow-2xs">
                      <Building2 size={20} strokeWidth={2.2} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <h3 className="font-extrabold text-sm text-slate-900 truncate">
                          {surat.nama_perusahaan || surat.pt_name_temp || "Perusahaan Mitra"}
                        </h3>
                        <span className={`px-2 py-0.5 rounded-[var(--ui-radius-pill)] text-[9.5px] font-black uppercase border ${
                          isStempel 
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                            : isAcc 
                              ? 'bg-indigo-50 text-indigo-700 border-indigo-200' 
                              : 'bg-amber-50 text-amber-700 border-amber-200'
                        }`}>
                          {isStempel ? 'Selesai (Sah)' : isAcc ? 'Sudah di-ACC' : 'Menunggu ACC'}
                        </span>
                      </div>

                      <p className="text-[11px] text-slate-400 font-medium mb-2.5 flex items-center gap-1.5">
                        <Calendar size={12} className="text-slate-400 shrink-0" />
                        <span>Diajukan: {new Date(surat.created_at || Date.now()).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                        {surat.nomor_surat && (
                          <span className="font-mono font-bold text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded ml-1 border border-indigo-100">
                            No: {surat.nomor_surat}
                          </span>
                        )}
                      </p>

                      {/* Students inside this request */}
                      <div className="flex items-center gap-2 flex-wrap">
                        {surat.students?.map((s, idx) => (
                          <span key={idx} className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-[var(--ui-surface-muted)] text-slate-700 border border-[var(--ui-border-muted)] text-xs font-bold">
                            <Avatar name={s.nama} size="xs" />
                            <span>{s.nama}</span>
                            <span className="text-[10px] text-slate-400 font-normal">({s.kelas || s.nis})</span>
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  {!readOnly && (
                    <div className="flex items-center gap-2 shrink-0 justify-end pt-2 md:pt-0 border-t md:border-t-0 border-slate-100">
                      {isPending && (
                        <button
                          type="button"
                          onClick={() => accSurat(surat.id)}
                          className="px-3 py-1.5 text-xs font-bold text-white bg-[var(--ui-primary)] hover:bg-[var(--ui-primary-hover)] rounded-[var(--ui-radius-control)] shadow-2xs transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
                        >
                          <Check size={14} />
                          <span>ACC & Beri Nomor</span>
                        </button>
                      )}
                      {isAcc && (
                        <button
                          type="button"
                          onClick={() => validasiStempel(surat.id)}
                          className="px-3 py-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-[var(--ui-radius-control)] shadow-2xs transition-all flex items-center gap-1.5 cursor-pointer"
                        >
                          <ShieldCheck size={14} />
                          <span>Validasi Cap/Stempel</span>
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => deleteSurat(surat.id)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 rounded bg-slate-100 hover:bg-rose-50 border border-slate-200 cursor-pointer transition-colors"
                        title="Hapus Surat"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  )}
                </div>
              );
            })}

            {suratList.length === 0 && (
              <div className="bg-white rounded-[var(--ui-radius-card)] p-12 text-center border border-slate-200/80">
                <FileText size={36} className="mx-auto text-slate-300 mb-2" />
                <h4 className="text-sm font-bold text-slate-700">Tidak ada permohonan surat pengantar</h4>
                <p className="text-xs text-slate-400 mt-1">Siswa yang mengajukan surat pengantar DUDI akan muncul di sini.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── TAB 2: MUTASI PKL ── */}
      {activeTab === "mutasi" && (
        <div className="space-y-3.5">
          {mutasiList.map(mutasi => (
            <div 
              key={mutasi.id} 
              className="bg-white rounded-[var(--ui-radius-card)] p-4 sm:p-5 border border-slate-200/80 shadow-[var(--ui-shadow-card)] flex flex-col md:flex-row md:items-center justify-between gap-4"
            >
              <div className="min-w-0 flex-1 space-y-2.5">
                <div className="flex items-center gap-2.5">
                  <Avatar name={mutasi.student_name || "Siswa"} size="sm" />
                  <div>
                    <h4 className="font-extrabold text-sm text-slate-900">{mutasi.student_name}</h4>
                    <p className="text-[10.5px] text-slate-400 font-semibold">{mutasi.nis} • Kelas {mutasi.class_name}</p>
                  </div>
                </div>

                {/* Transfer route indicator */}
                <div className="bg-[var(--ui-surface-muted)] p-3 rounded-[var(--ui-radius-control)] border border-[var(--ui-border-muted)] flex items-center justify-between gap-3 text-xs">
                  <div className="min-w-0 flex-1">
                    <span className="text-[10px] font-bold text-slate-400 block uppercase">Lokasi Lama</span>
                    <span className="font-bold text-slate-700 truncate block">{mutasi.old_pt_name || "–"}</span>
                  </div>
                  <ArrowRight size={16} className="text-indigo-500 shrink-0" />
                  <div className="min-w-0 flex-1 text-right">
                    <span className="text-[10px] font-bold text-[var(--ui-primary)] block uppercase">Lokasi Baru</span>
                    <span className="font-bold text-[var(--ui-primary)] truncate block">{mutasi.new_pt_name || mutasi.new_pt_name_temp}</span>
                  </div>
                </div>

                <div className="text-xs bg-amber-50/60 p-2.5 rounded border border-amber-100 text-slate-700 italic">
                  "{mutasi.alasan || 'Permohonan mutasi penempatan PKL'}"
                </div>
              </div>

              {/* Status & Actions */}
              <div className="flex flex-col items-end gap-2.5 shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-slate-100">
                <span className={`px-2.5 py-0.5 rounded-[var(--ui-radius-pill)] text-[10px] font-black uppercase border ${
                  mutasi.final_status === 'acc'
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    : mutasi.final_status === 'rejected'
                      ? 'bg-rose-50 text-rose-700 border-rose-200'
                      : 'bg-amber-50 text-amber-700 border-amber-200'
                }`}>
                  {mutasi.final_status === 'acc' ? 'Disetujui Final' : mutasi.final_status === 'rejected' ? 'Ditolak' : 'Menunggu Approval'}
                </span>

                {!readOnly && mutasi.final_status === 'pending' && (
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => accMutasi(mutasi.id, 'rejected')}
                      className="px-2.5 py-1 text-xs font-bold text-rose-600 bg-rose-50 hover:bg-rose-100 rounded-[var(--ui-radius-control)] border border-rose-200 cursor-pointer"
                    >
                      Tolak
                    </button>
                    <button
                      type="button"
                      onClick={() => accMutasi(mutasi.id, 'acc')}
                      className="px-3 py-1 text-xs font-bold text-white bg-[var(--ui-primary)] hover:bg-[var(--ui-primary-hover)] rounded-[var(--ui-radius-control)] shadow-2xs cursor-pointer"
                    >
                      ACC Mutlak (Hubin)
                    </button>
                  </div>
                )}

                {!readOnly && (
                  <button
                    type="button"
                    onClick={() => deleteMutasi(mutasi.id)}
                    className="text-slate-400 hover:text-rose-600 p-1 border-none bg-transparent cursor-pointer text-xs flex items-center gap-1"
                  >
                    <Trash2 size={13} /> Hapus
                  </button>
                )}
              </div>
            </div>
          ))}

          {mutasiList.length === 0 && (
            <div className="bg-white rounded-[var(--ui-radius-card)] p-12 text-center border border-slate-200/80">
              <GitMerge size={36} className="mx-auto text-slate-300 mb-2" />
              <h4 className="text-sm font-bold text-slate-700">Tidak ada permohonan mutasi</h4>
              <p className="text-xs text-slate-400 mt-1">Pengajuan pindah tempat PKL siswa akan tampil di sini.</p>
            </div>
          )}
        </div>
      )}

      {/* Modal ACC & Penerbitan Nomor Surat */}
      {accModal.isOpen && (
        <Modal
          isOpen={accModal.isOpen}
          onClose={() => setAccModal({ isOpen: false, suratId: null, formattedNumber: "" })}
          title="Persetujuan & Terbitkan Nomor Surat"
          maxWidth="max-w-md"
        >
          <form onSubmit={handleAccConfirm} className="space-y-4">
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">
                Nomor Surat Resmi (Auto-Generated)
              </label>
              <input
                type="text"
                required
                value={accModal.formattedNumber}
                onChange={e => setAccModal({ ...accModal, formattedNumber: e.target.value })}
                className="w-full h-9 px-3 text-xs font-mono font-bold rounded-[var(--ui-radius-control)] border border-[var(--ui-border-soft)] bg-white text-slate-800 focus:outline-none focus:border-[var(--ui-primary)]"
              />
              <p className="text-[11px] text-slate-400 mt-1">
                Nomor ini akan disimpan dan dicetak pada lembar surat pengantar siswa.
              </p>
            </div>

            <div className="pt-2 flex items-center justify-end gap-2">
              <Button
                variant="outline"
                size="sm"
                type="button"
                onClick={() => setAccModal({ isOpen: false, suratId: null, formattedNumber: "" })}
              >
                Batal
              </Button>
              <Button
                variant="primary"
                size="sm"
                type="submit"
                disabled={loading}
                className="flex items-center gap-1.5"
              >
                {loading ? <RefreshCw size={13} className="animate-spin" /> : <Check size={14} />}
                <span>Setujui & Terbitkan</span>
              </Button>
            </div>
          </form>
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

export default KelolaAdministrasiPKL;
