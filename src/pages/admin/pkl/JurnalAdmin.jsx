import React, { useState, useMemo, useEffect } from 'react';
import { 
  BookOpen, CheckCircle2, XCircle, Clock, Search, Download, 
  ChevronUp, ChevronDown, Check, X, Building2, Calendar, User, 
  Clock3, MessageSquare, AlertCircle, RefreshCw
} from 'lucide-react';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import { PageHeader, Avatar } from '../../../components/monitoring/ui/index.js';
import { Button } from '../../../components/ui.jsx';
import { usePagination } from '../../../components/ui/PaginationControls.jsx';

const getToken = () => {
  try {
    const raw = sessionStorage.getItem("school_schedule_session_v1");
    if (raw) return JSON.parse(raw)?.authToken;
  } catch (e) {}
  return null;
};

const STATUS_MAP = {
  pending:  { label: 'Menunggu', cls: 'bg-amber-50 text-amber-700 border-amber-200/80' },
  approved: { label: 'Disetujui', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200/80' },
  revision: { label: 'Revisi', cls: 'bg-rose-50 text-rose-700 border-rose-200/80' }
};

const JurnalAdmin = ({ readOnly }) => {
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('Semua');
  const [localJurnal, setLocalJurnal] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState(null);
  const [toast, setToast] = useState(null);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  const fetchLogbooks = () => {
    setLoading(true);
    const token = getToken();

    fetch('/api/pkl/logbooks', {
      headers: token ? { 'Authorization': `Bearer ${token}` } : {}
    })
      .then(res => res.json())
      .then(data => {
        if (data.ok) setLocalJurnal(Array.isArray(data.data) ? data.data : []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  useEffect(() => {
    fetchLogbooks();
  }, []);

  const filtered = useMemo(() => {
    return localJurnal.filter(j => {
      const q = search.toLowerCase();
      const matchSearch = !search || 
        (j.student_name && j.student_name.toLowerCase().includes(q)) ||
        (j.kegiatan && j.kegiatan.toLowerCase().includes(q)) ||
        (j.student_nis && String(j.student_nis).includes(q)) ||
        (j.class_name && j.class_name.toLowerCase().includes(q));
      
      const matchStatus = filterStatus === 'Semua' || j.status === filterStatus;
      return matchSearch && matchStatus;
    });
  }, [localJurnal, search, filterStatus]);

  const { paginatedData: currentJurnals, PaginationBar } = usePagination(filtered, 12);

  const handleApprove = async (id, e) => {
    if (e) e.stopPropagation();
    setLocalJurnal(prev => prev.map(j => j.id === id ? { ...j, status: 'approved' } : j));
    const token = getToken();
    try {
      await fetch(`/api/pkl/logbooks/${id}/approve`, {
        method: 'PUT',
        headers: token ? { 'Authorization': `Bearer ${token}` } : {}
      });
      showToast('Jurnal siswa berhasil disetujui!');
    } catch (e) {
      console.error(e);
    }
  };

  const handleReject = async (id, e) => {
    if (e) e.stopPropagation();
    setLocalJurnal(prev => prev.map(j => j.id === id ? { ...j, status: 'revision' } : j));
    const token = getToken();
    try {
      await fetch(`/api/pkl/logbooks/${id}/revision`, {
        method: 'PUT',
        headers: token ? { 'Authorization': `Bearer ${token}` } : {}
      });
      showToast('Status jurnal diubah menjadi Perlu Revisi.');
    } catch (e) {
      console.error(e);
    }
  };

  const handleExport = () => {
    const exportData = filtered.map(j => ({
      Tanggal: j.tanggal || (j.created_at ? new Date(j.created_at).toLocaleDateString('id-ID') : '-'),
      NIS: j.student_nis,
      Nama_Siswa: j.student_name,
      Kelas: j.class_name,
      Perusahaan: j.company_name || '-',
      Kegiatan: j.kegiatan,
      Kendala: j.kendala || '-',
      Solusi: j.solusi || '-',
      Status: STATUS_MAP[j.status]?.label || j.status,
      Catatan_Guru: j.catatanGuru || '-'
    }));
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet("Jurnal_PKL");
    if (exportData.length > 0) {
      const keys = Object.keys(exportData[0]);
      ws.addRow(keys);
      exportData.forEach(item => ws.addRow(keys.map(k => item[k])));
    }
    wb.xlsx.writeBuffer().then(buf => {
      saveAs(new Blob([buf]), "Data_Jurnal_Siswa_PKL.xlsx");
    });
  };

  const pendingCount = localJurnal.filter(j => j.status === 'pending').length;
  const approvedCount = localJurnal.filter(j => j.status === 'approved').length;
  const revisionCount = localJurnal.filter(j => j.status === 'revision').length;

  return (
    <div className="space-y-4 sm:space-y-5 animate-in fade-in duration-300 pb-10">
      <PageHeader
        icon={BookOpen}
        title="Jurnal Siswa PKL"
        description="Monitoring dan validasi jurnal aktivitas harian kerja industri siswa."
        rightContent={
          <Button
            variant="outline"
            size="sm"
            onClick={handleExport}
            className="flex items-center gap-1.5 font-bold shadow-[var(--ui-shadow-control)]"
          >
            <Download size={13} strokeWidth={2.5} /> Ekspor Excel
          </Button>
        }
      />

      {/* 4 Responsive Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
        <div 
          onClick={() => setFilterStatus('Semua')}
          className={`bg-white rounded-[var(--ui-radius-card)] p-3.5 sm:p-5 border cursor-pointer transition-all duration-200 flex items-center justify-between shadow-[var(--ui-shadow-card)] hover:shadow-[var(--ui-shadow-card-hover)] ${
            filterStatus === 'Semua' ? 'border-[var(--ui-primary)] ring-2 ring-[var(--ui-primary)]/20' : 'border-slate-200/80'
          }`}
        >
          <div>
            <span className="text-[9px] sm:text-[11px] font-black uppercase tracking-wider text-slate-400 block mb-1">
              TOTAL JURNAL
            </span>
            <div className="flex items-baseline gap-1.5">
              <h3 className="text-xl sm:text-3xl font-black text-slate-800 tracking-tight">{localJurnal.length}</h3>
              <span className="text-[10px] text-slate-400 font-bold hidden sm:inline">Logbook</span>
            </div>
          </div>
          <div className="w-10 h-10 rounded-[var(--ui-radius-control)] bg-blue-50 text-blue-600 border border-blue-200/60 flex items-center justify-center shrink-0 shadow-xs">
            <BookOpen size={20} strokeWidth={2.2} />
          </div>
        </div>

        <div 
          onClick={() => setFilterStatus('pending')}
          className={`bg-white rounded-[var(--ui-radius-card)] p-3.5 sm:p-5 border cursor-pointer transition-all duration-200 flex items-center justify-between shadow-[var(--ui-shadow-card)] hover:shadow-[var(--ui-shadow-card-hover)] ${
            filterStatus === 'pending' ? 'border-amber-500 ring-2 ring-amber-500/20' : 'border-slate-200/80'
          }`}
        >
          <div>
            <span className="text-[9px] sm:text-[11px] font-black uppercase tracking-wider text-amber-600 block mb-1">
              MENUNGGU VALIDASI
            </span>
            <div className="flex items-baseline gap-1.5">
              <h3 className="text-xl sm:text-3xl font-black text-amber-700 tracking-tight">{pendingCount}</h3>
              <span className="text-[10px] text-amber-600 font-bold hidden sm:inline">Review</span>
            </div>
          </div>
          <div className="w-10 h-10 rounded-[var(--ui-radius-control)] bg-amber-50 text-amber-600 border border-amber-200/60 flex items-center justify-center shrink-0 shadow-xs">
            <Clock size={20} strokeWidth={2.2} />
          </div>
        </div>

        <div 
          onClick={() => setFilterStatus('approved')}
          className={`bg-white rounded-[var(--ui-radius-card)] p-3.5 sm:p-5 border cursor-pointer transition-all duration-200 flex items-center justify-between shadow-[var(--ui-shadow-card)] hover:shadow-[var(--ui-shadow-card-hover)] ${
            filterStatus === 'approved' ? 'border-emerald-500 ring-2 ring-emerald-500/20' : 'border-slate-200/80'
          }`}
        >
          <div>
            <span className="text-[9px] sm:text-[11px] font-black uppercase tracking-wider text-emerald-600 block mb-1">
              DISETUJUI
            </span>
            <div className="flex items-baseline gap-1.5">
              <h3 className="text-xl sm:text-3xl font-black text-emerald-700 tracking-tight">{approvedCount}</h3>
              <span className="text-[10px] text-emerald-600 font-bold hidden sm:inline">Valid</span>
            </div>
          </div>
          <div className="w-10 h-10 rounded-[var(--ui-radius-control)] bg-emerald-50 text-emerald-600 border border-emerald-200/60 flex items-center justify-center shrink-0 shadow-xs">
            <CheckCircle2 size={20} strokeWidth={2.2} />
          </div>
        </div>

        <div 
          onClick={() => setFilterStatus('revision')}
          className={`bg-white rounded-[var(--ui-radius-card)] p-3.5 sm:p-5 border cursor-pointer transition-all duration-200 flex items-center justify-between shadow-[var(--ui-shadow-card)] hover:shadow-[var(--ui-shadow-card-hover)] ${
            filterStatus === 'revision' ? 'border-rose-500 ring-2 ring-rose-500/20' : 'border-slate-200/80'
          }`}
        >
          <div>
            <span className="text-[9px] sm:text-[11px] font-black uppercase tracking-wider text-rose-600 block mb-1">
              PERLU REVISI
            </span>
            <div className="flex items-baseline gap-1.5">
              <h3 className="text-xl sm:text-3xl font-black text-rose-700 tracking-tight">{revisionCount}</h3>
              <span className="text-[10px] text-rose-500 font-bold hidden sm:inline">Revisi</span>
            </div>
          </div>
          <div className="w-10 h-10 rounded-[var(--ui-radius-control)] bg-rose-50 text-rose-600 border border-rose-200/60 flex items-center justify-center shrink-0 shadow-xs">
            <XCircle size={20} strokeWidth={2.2} />
          </div>
        </div>
      </div>

      {/* Main Filter & Search Control Panel */}
      <div className="bg-white rounded-[var(--ui-radius-card)] p-3.5 sm:p-4 border border-slate-200/80 shadow-[var(--ui-shadow-card)] flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Cari nama siswa, NIS, kelas, atau kegiatan jurnal..."
            className="w-full pl-10 pr-4 py-2 bg-[var(--ui-surface-muted)] hover:bg-white border border-[var(--ui-border-soft)] rounded-[var(--ui-radius-control)] text-xs font-bold text-slate-800 placeholder-slate-400 focus:outline-none focus:bg-white focus:shadow-[var(--ui-focus-ring)] focus:border-[var(--ui-primary)] transition-all"
          />
        </div>

        {/* Status Pill Tabs */}
        <div className="flex items-center gap-1 bg-[var(--ui-surface-muted)] p-1 rounded-[var(--ui-radius-control)] border border-[var(--ui-border-muted)] shrink-0 overflow-x-auto">
          {[
            { id: 'Semua', label: 'Semua Status', count: localJurnal.length },
            { id: 'pending', label: 'Menunggu', count: pendingCount },
            { id: 'approved', label: 'Disetujui', count: approvedCount },
            { id: 'revision', label: 'Revisi', count: revisionCount },
          ].map(st => (
            <button
              key={st.id}
              type="button"
              onClick={() => setFilterStatus(st.id)}
              className={`px-3 py-1.5 rounded-[var(--ui-radius-small)] text-xs font-black transition-all cursor-pointer border-none whitespace-nowrap flex items-center gap-1.5 ${
                filterStatus === st.id 
                  ? 'bg-white text-slate-800 shadow-2xs' 
                  : 'text-slate-500 hover:text-slate-800 bg-transparent'
              }`}
            >
              <span>{st.label}</span>
              {st.count > 0 && (
                <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-200/80 font-mono text-slate-700">
                  {st.count}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Main Table View */}
      <div className="bg-white rounded-[var(--ui-radius-card)] border border-slate-200/80 shadow-[var(--ui-shadow-card)] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead>
              <tr className="bg-[var(--ui-surface-muted)] border-b border-[var(--ui-border-muted)] text-slate-500 text-[11px] font-black uppercase tracking-wider">
                <th className="px-4 py-3.5">SISWA</th>
                <th className="px-4 py-3.5">TANGGAL</th>
                <th className="px-4 py-3.5">KEGIATAN PKL</th>
                <th className="px-4 py-3.5 text-center">STATUS</th>
                <th className="px-4 py-3.5 text-right">AKSI</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--ui-border-muted)]">
              {currentJurnals.map(j => {
                const isExpanded = expandedId === j.id;
                const st = STATUS_MAP[j.status] || { label: j.status, cls: 'bg-slate-100 text-slate-600 border-slate-200' };
                
                // Format Indonesian Date
                let formattedDate = '-';
                if (j.tanggal) {
                  const d = new Date(j.tanggal);
                  formattedDate = isNaN(d.getTime()) ? j.tanggal : d.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
                } else if (j.created_at) {
                  formattedDate = new Date(j.created_at).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
                }

                return (
                  <React.Fragment key={j.id}>
                    <tr 
                      className="hover:bg-[var(--ui-surface-muted)] transition-colors cursor-pointer"
                      onClick={() => setExpandedId(isExpanded ? null : j.id)}
                    >
                      {/* Siswa info */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <Avatar name={j.student_name || "Siswa"} size="sm" />
                          <div className="min-w-0">
                            <p className="font-extrabold text-slate-800 text-xs truncate max-w-[170px]" title={j.student_name}>
                              {j.student_name || "Siswa"}
                            </p>
                            <p className="text-[10.5px] font-semibold text-slate-400 mt-0.5">
                              {j.student_nis} • <span className="text-slate-600 font-bold">{j.class_name}</span>
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Tanggal */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="font-bold text-slate-700 text-xs flex items-center gap-1.5">
                          <Calendar size={13} className="text-slate-400" />
                          {formattedDate}
                        </span>
                        {j.jamMasuk && (
                          <span className="text-[10px] font-medium text-slate-400 block mt-0.5">
                            {j.jamMasuk} - {j.jamKeluar || 'Selesai'}
                          </span>
                        )}
                      </td>

                      {/* Kegiatan */}
                      <td className="px-4 py-3 max-w-[280px]">
                        <p className="font-medium text-slate-700 text-xs line-clamp-2 leading-relaxed" title={j.kegiatan}>
                          {j.kegiatan}
                        </p>
                        {j.company_name && (
                          <span className="inline-flex items-center gap-1 text-[10px] text-indigo-700 font-bold mt-1">
                            <Building2 size={11} />
                            <span className="truncate max-w-[200px]">{j.company_name}</span>
                          </span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3 text-center">
                        <span className={`inline-block px-2.5 py-0.5 rounded-[var(--ui-radius-pill)] text-[10px] font-black border shadow-2xs ${st.cls}`}>
                          {st.label}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3 text-right" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1.5">
                          {j.status === 'pending' && !readOnly && (
                            <>
                              <button
                                type="button"
                                onClick={(e) => handleReject(j.id, e)}
                                className="px-2.5 py-1 text-[11px] font-bold text-rose-600 bg-rose-50 hover:bg-rose-100 rounded-[var(--ui-radius-control)] border border-rose-200 transition-all cursor-pointer shadow-2xs"
                                title="Minta Revisi Jurnal"
                              >
                                Tolak
                              </button>
                              <button
                                type="button"
                                onClick={(e) => handleApprove(j.id, e)}
                                className="px-2.5 py-1 text-[11px] font-bold text-white bg-[var(--ui-primary)] hover:bg-[var(--ui-primary-hover)] rounded-[var(--ui-radius-control)] shadow-2xs transition-all flex items-center gap-1 cursor-pointer active:scale-95"
                                title="Setujui Jurnal"
                              >
                                <Check size={13} />
                                <span>Setujui</span>
                              </button>
                            </>
                          )}
                          {j.status === 'approved' && (
                            <span className="p-1 rounded bg-emerald-50 text-emerald-600 border border-emerald-200/60 inline-flex" title="Jurnal telah diverifikasi">
                              <CheckCircle2 size={16} />
                            </span>
                          )}
                          <button
                            type="button"
                            onClick={() => setExpandedId(isExpanded ? null : j.id)}
                            className="p-1 text-slate-400 hover:text-slate-700 rounded bg-slate-100 hover:bg-slate-200 border border-slate-200 cursor-pointer ml-1"
                          >
                            {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                          </button>
                        </div>
                      </td>
                    </tr>

                    {/* Expanded Detail Accordion */}
                    {isExpanded && (
                      <tr className="bg-slate-50/70 border-b border-[var(--ui-border-muted)]">
                        <td colSpan={5} className="p-4 sm:px-6 space-y-3">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                            <div className="bg-white p-3 rounded-[var(--ui-radius-control)] border border-slate-200/80 space-y-1">
                              <span className="font-bold text-slate-400 uppercase text-[10px] block">Kendala yang Dihadapi:</span>
                              <p className="text-slate-700 font-medium italic">{j.kendala || 'Tidak ada kendala yang dilaporkan.'}</p>
                            </div>
                            <div className="bg-white p-3 rounded-[var(--ui-radius-control)] border border-slate-200/80 space-y-1">
                              <span className="font-bold text-slate-400 uppercase text-[10px] block">Solusi / Penanganan:</span>
                              <p className="text-slate-700 font-medium">{j.solusi || 'Telah diselesaikan secara mandiri / dibimbing instruktur.'}</p>
                            </div>
                          </div>
                          {j.catatanGuru && (
                            <div className="bg-blue-50/80 p-3 rounded-[var(--ui-radius-control)] border border-blue-200/70 text-xs text-blue-900 flex items-start gap-2">
                              <MessageSquare size={14} className="text-blue-600 mt-0.5 shrink-0" />
                              <div>
                                <span className="font-bold block">Catatan dari Guru Pembimbing:</span>
                                <p className="mt-0.5">{j.catatanGuru}</p>
                              </div>
                            </div>
                          )}
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>

        {filtered.length === 0 && (
          <div className="p-12 text-center">
            <BookOpen size={36} className="mx-auto text-slate-300 mb-2" />
            <h4 className="text-sm font-bold text-slate-700">Tidak ada data jurnal siswa</h4>
            <p className="text-xs text-slate-400 mt-1">Coba sesuaikan kata kunci pencarian atau filter status.</p>
          </div>
        )}

        <PaginationBar />
      </div>

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

export default JurnalAdmin;
