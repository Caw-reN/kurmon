import { Button } from '../../../components/ui.jsx';
import { useState, useEffect } from'react';
import { BookOpen } from'lucide-react';
import { X, Badge, ChevronUp, ChevronDown, XCircle, Loader2, CheckCircle2 } from'lucide-react';
import { Avatar, EmptyState } from'../../../components/monitoring/ui/index.js';


/**
 * teacher/ValidasiJurnal.jsx
 * Halaman validasi jurnal harian siswa oleh Guru Pembimbing.
 * Fitur: Card list jurnal, tombol Approve / Reject dengan modal catatan.
 */






// ──────────────────────────────────────────
// Modal Reject dengan field catatan
// ──────────────────────────────────────────
const RejectModal = ({ jurnal, siswa, onConfirm, onCancel }) => {
  const [catatan, setCatatan] = useState('');

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onCancel} />

      {/* Modal */}
      <div className="relative bg-white w-full sm:max-w-md rounded-t-3xl sm:rounded-[var(--ui-radius-card)]
        shadow-xl p-6 z-10">
        {/* Handle bar (mobile) */}
        <div className="w-10 h-1 bg-gray-300 rounded-full mx-auto mb-5 sm:hidden" />

        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-slate-800">Tolak / Minta Revisi</h3>
          <Button variant="outline" onClick={onCancel} ><X size={18} className="text-gray-500" /></Button>
        </div>

        <div className="bg-red-50 border border-red-200 rounded-[var(--ui-radius-small)] p-3 mb-4">
          <p className="text-xs text-red-700 font-semibold">{siswa?.nama}</p>
          <p className="text-xs text-red-500 mt-0.5">Jurnal: {jurnal.tanggal}</p>
          <p className="text-xs text-red-600 mt-1 line-clamp-2">{jurnal.kegiatan}</p>
        </div>

        <label className="text-sm font-semibold text-slate-800 mb-1.5 block">
          Catatan untuk Siswa *
        </label>
        <textarea
          rows={4}
          value={catatan}
          onChange={(e) => setCatatan(e.target.value)}
          placeholder="Tulis alasan penolakan atau petunjuk revisi yang jelas untuk siswa..."
          className="w-full border-none rounded-[var(--ui-radius-small)] px-3 py-2.5 text-sm resize-none
            focus:outline-none focus:ring-2 focus:ring-danger focus:border-danger"
        />

        <div className="flex gap-3 mt-4">
          <Button variant="ghost"
            onClick={onCancel}
            className="flex-1"
          >
            Batal
          </Button>
          <Button variant="danger"
            onClick={() =>catatan.trim() && onConfirm(catatan)}
            disabled={!catatan.trim()}
            className="flex-1"
          >
            Kirim Revisi</Button>
        </div>
      </div>
    </div>
  );
};

// ──────────────────────────────────────────
// Jurnal Card
// ──────────────────────────────────────────
const JurnalCard = ({ jurnal, siswa, onApprove, onReject, showToast }) => {
  const [expanded, setExpanded] = useState(false);
  const [localStatus, setLocalStatus] = useState(jurnal.status);
  const [loading, setLoading] = useState(null); //'approve' |'reject'

  const handleApprove = async () => {
    setLoading('approve');
    try {
      const authToken = JSON.parse(sessionStorage.getItem('school_schedule_session_v1'))?.authToken;
      const res = await fetch(`/api/pkl/logbooks/${jurnal.id}`, {
        method:'PUT',
        headers: {'Content-Type':'application/json','Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({ status:'approved', catatanGuru:'' })
      });
      const data = await res.json();
      if (data.ok) {
        setLocalStatus('approved');
        onApprove?.(jurnal.id);
      } else {
        showToast(data.error ||'Gagal menyetujui jurnal','error');
      }
    } catch (err) {
      showToast('Gagal tersambung ke server','error');
    } finally {
      setLoading(null);
    }
  };

  const handleReject = async (catatan) => {
    setLoading('reject');
    try {
      const authToken = JSON.parse(sessionStorage.getItem('school_schedule_session_v1'))?.authToken;
      const res = await fetch(`/api/pkl/logbooks/${jurnal.id}`, {
        method:'PUT',
        headers: {'Content-Type':'application/json','Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({ status:'revision', catatanGuru: catatan })
      });
      const data = await res.json();
      if (data.ok) {
        setLocalStatus('revision');
        onReject?.(jurnal.id, catatan);
      } else {
        showToast(data.error ||'Gagal mengirim penolakan/revisi','error');
      }
    } catch (err) {
      showToast('Gagal tersambung ke server','error');
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className={`bg-white border rounded-[var(--ui-radius-small)] overflow-hidden transition-all duration-200
      ${localStatus ==='approved' ?'border-emerald-200 opacity-80' :
        localStatus ==='revision' ?'border-red-200 opacity-80' :'border-slate-200 hover:-card'}`}>
      {/* Card header */}
      <button
        className="w-full flex items-start gap-4 text-left p-4 bg-transparent border-none cursor-pointer hover:bg-slate-50 transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <Avatar name={siswa?.nama ||'?'} size="md" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <p className="font-bold text-sm text-slate-800">{siswa?.nama}</p>
            <Badge variant={localStatus} />
          </div>
          <p className="text-xs text-slate-400">{siswa?.kelas}</p>
          <p className="text-xs font-semibold text-gray-600 mt-1">
            📅 {new Date(jurnal.tanggal).toLocaleDateString('id-ID', {
              weekday:'long', day:'numeric', month:'long',
            })}
          </p>
          <p className="text-xs text-gray-500 mt-1.5 line-clamp-2 pr-4">
            {jurnal.kegiatan}
          </p>
        </div>
        <div className="flex-shrink-0 text-slate-400 mt-1">
          {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </div>
      </button>

      {/* Expanded content */}
      {expanded && (
        <div className="px-4 pb-4 space-y-3 border-t border-slate-200 pt-4 bg-bg">
          {/* Kegiatan */}
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
              Deskripsi Kegiatan
            </p>
            <p className="text-sm text-gray-700 leading-relaxed">{jurnal.kegiatan}</p>
          </div>

          {/* Kendala */}
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Kendala</p>
            <p className="text-sm text-gray-700 leading-relaxed">{jurnal.kendala}</p>
          </div>

          {/* Solusi */}
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Solusi</p>
            <p className="text-sm text-gray-700 leading-relaxed">{jurnal.solusi}</p>
          </div>

          {/* Jam */}
          <div className="flex gap-4">
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Jam Masuk</p>
              <p className="text-sm font-semibold text-slate-800">{jurnal.jamMasuk}</p>
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Jam Keluar</p>
              <p className="text-sm font-semibold text-slate-800">{jurnal.jamKeluar}</p>
            </div>
          </div>

          {/* Catatan guru (jika sudah ada) */}
          {jurnal.catatanGuru && localStatus !=='revision' && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-[var(--ui-radius-small)] p-3">
              <p className="text-xs font-bold text-emerald-700 mb-1">Catatan Guru</p>
              <p className="text-xs text-emerald-600">{jurnal.catatanGuru}</p>
            </div>
          )}

          {/* Action buttons — hanya tampil jika pending */}
          {localStatus ==='pending' && (
            <div className="flex gap-3 pt-2">
              <Button variant="danger"
                onClick={() =>onReject?.(jurnal, siswa, handleReject)}
                disabled={loading !== null}
                className="flex-1"
              >
                <XCircle size={16} />
                Tolak / Revisi</Button>
              <Button variant="primary"
                onClick={handleApprove}
                disabled={loading !== null}
                className="flex-1"
              >
                {loading ==='approve' ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <CheckCircle2 size={16} />
                )}
                {loading ==='approve' ?'Menyimpan...' :'Setujui'}
              </Button>
            </div>
          )}

          {/* Already processed indicator */}
          {localStatus ==='approved' && (
            <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200
              rounded-[var(--ui-radius-small)] px-4 py-3">
              <CheckCircle2 size={16} className="text-emerald-600" />
              <p className="text-sm font-semibold text-emerald-700">Jurnal telah disetujui</p>
            </div>
          )}
          {localStatus ==='revision' && (
            <div className="flex items-center gap-2 bg-red-50 border border-red-200
              rounded-[var(--ui-radius-small)] px-4 py-3">
              <XCircle size={16} className="text-red-600" />
              <p className="text-sm font-semibold text-red-700">Jurnal dikembalikan untuk revisi</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// ──────────────────────────────────────────
// MAIN COMPONENT
// ──────────────────────────────────────────
const ValidasiJurnal = () => {
  const [filterStatus, setFilterStatus] = useState('pending');
  const [rejectModal, setRejectModal] = useState(null);
  const [jurnalList, setJurnalList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);

  const showToast = (message, type ='success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  useEffect(() => {
    fetch('/api/pkl/logbooks', {
      headers: {'Authorization': `Bearer ${JSON.parse(sessionStorage.getItem('school_schedule_session_v1'))?.authToken}` }
    })
    .then(res => res.json())
    .then(data => {
      if(data.ok) setJurnalList(data.data);
      setLoading(false);
    })
    .catch(() => setLoading(false));
  }, []);

  const filtered = jurnalList.filter(j =>
    filterStatus ==='all' ? true : j.status === filterStatus
  );

  const pendingCount = jurnalList.filter(j => j.status ==='pending').length;

  const handleRejectClick = (jurnal, siswa, callback) => {
    setRejectModal({ jurnal, siswa, callback });
  };

  const handleRejectConfirm = (catatan) => {
    rejectModal?.callback?.(catatan);
    setRejectModal(null);
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Validasi Jurnal</h1>
        <p className="text-sm text-slate-400 mt-1">
          {loading ?'Memuat jurnal...' : pendingCount > 0
            ? `${pendingCount} jurnal menunggu validasi Anda`
            :'Semua jurnal sudah divalidasi 🎉'}
        </p>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1 hide-scrollbar">
        {[
          { key:'pending', label:'Pending', count: jurnalList.filter((j) => j.status ==='pending').length },
          { key:'approved', label:'Disetujui', count: jurnalList.filter((j) => j.status ==='approved').length },
          { key:'revision', label:'Revisi', count: jurnalList.filter((j) => j.status ==='revision').length },
          { key:'all', label:'Semua', count: jurnalList.length },
        ].map((tab) => (
          <Button variant={filterStatus === tab.key ? "primary" : "outline"}
            key={tab.key}
            onClick={() =>setFilterStatus(tab.key)}
            className="flex items-center gap-2 whitespace-nowrap"
          >
            {tab.label}
            {tab.count > 0 && (
              <span className={`text-xs px-1.5 py-0.5 rounded-[var(--ui-radius-small)] font-bold
                ${filterStatus === tab.key ?'bg-white/20 text-white' :'bg-gray-100 text-gray-600'}`}>
                {tab.count}
              </span>
            )}</Button>
        ))}
      </div>

      {/* Jurnal list */}
      <div className="space-y-3">
        {filtered.length === 0 ? (
          <EmptyState
            icon={BookOpen}
            title="Tidak ada jurnal"
            description={`Belum ada jurnal dengan status"${filterStatus}" saat ini.`}
          />
        ) : (
          filtered.map((j) => {
            const siswaObj = {
              nama: j.student_name || `Siswa ${j.student_nis ||""}`,
              kelas: j.class_name ||"-"
            };
            return (
              <JurnalCard
                key={j.id}
                jurnal={j}
                siswa={siswaObj}
                showToast={showToast}
                onApprove={(id) => {
                  setJurnalList(prev => prev.map(item => item.id === id ? { ...item, status:'approved' } : item));
                }}
                onReject={(jurnalItem, siswaItem, cb) => handleRejectClick(jurnalItem, siswaItem, cb)}
                onRejectSuccess={(id, catatan) => {
                  setJurnalList(prev => prev.map(item => item.id === id ? { ...item, status:'revision', catatanGuru: catatan } : item));
                }}
              />
            );
          })
        )}
      </div>

      {/* Reject Modal */}
      {rejectModal && (
        <RejectModal
          jurnal={rejectModal.jurnal}
          siswa={rejectModal.siswa}
          onConfirm={handleRejectConfirm}
          onCancel={() => setRejectModal(null)}
        />
      )}
      {toast && (
        <div className={`fixed bottom-6 right-6 px-4 py-3 rounded-[var(--ui-radius-small)] shadow-lg font-medium text-sm flex items-center gap-2 animate-in slide-in-from-bottom-5 text-white z-[100] ${toast.type ==='error' ?'bg-red-600' :'bg-emerald-600'}`}>
          {toast.message}
        </div>
      )}
    </div>
  );
};

export default ValidasiJurnal;
