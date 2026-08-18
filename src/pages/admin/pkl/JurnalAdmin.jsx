import { Button } from '../../../components/ui.jsx';
import React, { useState, useMemo, useEffect } from'react';
import { BookOpen, CheckCircle2, XCircle, Clock } from'lucide-react';
import * as XLSX from'xlsx';
import { Download, Search, ChevronUp, ChevronDown } from'lucide-react';
import { PageHeader, StatCard, EmptyState, Avatar } from'../../../components/monitoring/ui/index.js';


/**
 * admin/JurnalAdmin.jsx
 * Tampilan semua jurnal siswa untuk admin — filter, search, validasi massal.
 * Layout compact tabel responsif — konsisten dengan halaman monitoring lainnya.
 */









const STATUS_MAP = {
  pending:  { label:'Menunggu',  cls:'bg-amber-50 text-amber-700 border-amber-200' },
  approved: { label:'Disetujui', cls:'bg-emerald-50 text-emerald-700 border-emerald-200' },
  revision: { label:'Revisi',    cls:'bg-red-50 text-red-700 border-red-200' } };

const JurnalAdmin = ({ readOnly }) => {
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('Semua');
  const [localJurnal, setLocalJurnal] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState(null);

  useEffect(() => {
    fetch('/api/pkl/logbooks', {
      headers: {'Authorization': `Bearer ${JSON.parse(sessionStorage.getItem('school_schedule_session_v1'))?.authToken}` }
    })
    .then(res => res.json())
    .then(data => {
      if (data.ok) setLocalJurnal(data.data);
      setLoading(false);
    })
    .catch(() => setLoading(false));
  }, []);

  const statusOptions = ['Semua','pending','approved','revision'];

  const filtered = useMemo(() => localJurnal.filter(j => {
    const matchSearch = !search || j.kegiatan?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus ==='Semua' || j.status === filterStatus;
    return matchSearch && matchStatus;
  }), [localJurnal, search, filterStatus]);

  const handleApprove = async (id) => {
    setLocalJurnal(p => p.map(j => j.id === id ? { ...j, status:'approved' } : j));
    try {
      await fetch(`/api/pkl/logbooks/${id}/approve`, {
        method:'PUT',
        headers: {'Authorization': `Bearer ${JSON.parse(sessionStorage.getItem('school_schedule_session_v1'))?.authToken}` }
      });
    } catch (e) { console.error(e); }
  };

  const handleReject = async (id) => {
    setLocalJurnal(p => p.map(j => j.id === id ? { ...j, status:'revision' } : j));
    try {
      await fetch(`/api/pkl/logbooks/${id}/revision`, {
        method:'PUT',
        headers: {'Authorization': `Bearer ${JSON.parse(sessionStorage.getItem('school_schedule_session_v1'))?.authToken}` }
      });
    } catch (e) { console.error(e); }
  };

  const handleExport = () => {
    const exportData = filtered.map(j => ({
      Tanggal: j.tanggal || new Date(j.created_at).toLocaleDateString('id-ID'),
      Siswa_ID: j.student_id,
      Kegiatan: j.kegiatan,
      Kendala: j.kendala ||'-',
      Status: STATUS_MAP[j.status]?.label || j.status,
      Komentar: j.komentar ||''
    }));
    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws,"Jurnal_Siswa");
    XLSX.writeFile(wb,"Data_Jurnal_Siswa.xlsx");
  };

  const stats = [
    { label:'Total Jurnal',  value: localJurnal.length,                                    icon: BookOpen,    iconBg:'bg-blue-100',    iconColor:'text-blue-600' },
    { label:'Menunggu',      value: localJurnal.filter(j => j.status ==='pending').length, icon: Clock,       iconBg:'bg-amber-100',   iconColor:'text-amber-600' },
    { label:'Disetujui',     value: localJurnal.filter(j => j.status ==='approved').length,icon: CheckCircle2,iconBg:'bg-emerald-100', iconColor:'text-emerald-600' },
    { label:'Perlu Revisi',  value: localJurnal.filter(j => j.status ==='revision').length,icon: XCircle,     iconBg:'bg-red-100',     iconColor:'text-rose-600' },
  ];

  return (
    <div className="space-y-4">
      {/* Header */}
      <PageHeader
        icon={BookOpen}
        title="Jurnal Siswa PKL"
        description="Monitoring dan validasi jurnal kegiatan harian siswa"
      >
        <div className="flex items-center gap-2">
          <button
            onClick={handleExport}
            className="flex items-center gap-1.5 cursor-pointer"
          >
            <Download size={16} /> Ekspor
          </button>
        </div>
      </PageHeader>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {stats.map(s => <StatCard key={s.label} {...s} />)}
      </div>

      {/* Filter Bar */}
      <div className="ui-card p-4 flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="relative flex-1 w-full">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Cari kegiatan jurnal..."
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border-none rounded-[var(--ui-radius-small)] text-sm focus:outline-none focus:bg-white focus:ring-1 focus:ring-[var(--ui-primary)]"
          />
        </div>
        <div className="flex gap-2 flex-wrap items-center justify-end shrink-0">
          {statusOptions.map(s => (
            <Button variant="outline"
              key={s}
              onClick={() =>setFilterStatus(s)}
              
            >
              {s ==='Semua' ?'Semua Status' : s ==='pending' ?'Menunggu' : s ==='approved' ?'Disetujui' :'Revisi'}
              {s !=='Semua' && (
                <span className="ml-1.5 px-1.5 py-0.5 rounded-[var(--ui-radius-small)] text-[10px] font-bold bg-black/5">
                  {localJurnal.filter(j => j.status === s).length}
                </span>
              )}</Button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="ui-card overflow-hidden">
        {loading ? (
          <div className="py-12 text-center text-slate-400 text-sm">Memuat jurnal...</div>
        ) : filtered.length === 0 ? (
          <EmptyState icon={BookOpen} title="Tidak ada jurnal" description="Belum ada data jurnal PKL saat ini." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 text-[11px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200">
                  <th className="px-3 py-2 text-left">Siswa</th>
                  <th className="px-3 py-2 text-left hidden sm:table-cell">Tanggal</th>
                  <th className="px-3 py-2 text-left">Kegiatan</th>
                  <th className="px-3 py-2 text-center">Status</th>
                  <th className="px-3 py-2 text-center">Aksi</th>
                  <th className="px-3 py-2"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map(j => {
                  const isExpanded = expandedId === j.id;
                  const st = STATUS_MAP[j.status] || { label: j.status, cls:'bg-slate-100 text-slate-600 border-slate-200' };
                  return (
                    <React.Fragment key={j.id}>
                      <tr className="hover:bg-slate-50/50 transition-colors border-b border-slate-50 last:border-0 group cursor-pointer" onClick={() => setExpandedId(isExpanded ? null : j.id)}>
                        <td className="px-3 py-2.5">
                          <div className="flex items-center gap-2">
                            <Avatar name={String(j.student_id ||'?')} size="xs" />
                            <span className="text-xs font-semibold text-slate-700">ID: {j.student_id}</span>
                          </div>
                        </td>
                        <td className="px-3 py-2.5 hidden sm:table-cell">
                          <span className="text-[11px] font-bold text-slate-500">
                            {j.tanggal || new Date(j.created_at).toLocaleDateString('id-ID', { day:'2-digit', month:'short', year:'numeric' })}
                          </span>
                        </td>
                        <td className="px-3 py-2.5 max-w-[240px]">
                          <p className="text-xs font-medium text-slate-700 line-clamp-2 leading-relaxed">{j.kegiatan}</p>
                        </td>
                        <td className="px-3 py-2.5 text-center">
                          <span className={`inline-flex px-2 py-0.5 text-[10px] font-bold rounded-[var(--ui-radius-small)] border ${st.cls}`}>
                            {st.label}
                          </span>
                        </td>
                        <td className="px-3 py-2.5" onClick={e => e.stopPropagation()}>
                          {j.status ==='pending' ? (
                            !readOnly ? (
                              <div className="flex items-center justify-center gap-2">
                                <Button variant="outline"
                                  onClick={() =>handleReject(j.id)}
                                  
                                >
                                  Tolak</Button>
                                <Button variant="outline"
                                  onClick={() =>handleApprove(j.id)}
                                  
                                >
                                  Setujui</Button>
                              </div>
                            ) : (
                              <div className="flex items-center justify-center">
                                <Clock size={16} className="text-amber-400" />
                              </div>
                            )
                          ) : (
                            <div className="flex items-center justify-center">
                              {j.status ==='approved'
                                ? <CheckCircle2 size={16} className="text-emerald-500" />
                                : <XCircle size={16} className="text-red-400" />}
                            </div>
                          )}
                        </td>
                        <td className="px-3 py-2.5 text-right">
                          <Button variant="outline"
                            onClick={(e) =>{ e.stopPropagation(); setExpandedId(isExpanded ? null : j.id); }}
                            className="ml-auto"
                          >
                            {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}</Button>
                        </td>
                      </tr>

                      {/* Expanded Detail Row */}
                      {isExpanded && (
                        <tr key={`${j.id}-detail`} className="bg-slate-50">
                          <td colSpan={6} className="px-5 py-3">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                              <div>
                                <p className="font-bold text-slate-500 uppercase tracking-wider mb-1">Kegiatan Lengkap</p>
                                <p className="text-slate-700 leading-relaxed">{j.kegiatan ||'-'}</p>
                              </div>
                              <div>
                                <p className="font-bold text-slate-500 uppercase tracking-wider mb-1">Kendala</p>
                                <p className="text-slate-700 leading-relaxed">{j.kendala ||'Tidak ada kendala'}</p>
                              </div>
                              {j.komentar && (
                                <div className="sm:col-span-2">
                                  <p className="font-bold text-emerald-600 uppercase tracking-wider mb-1">Catatan Guru</p>
                                  <p className="text-slate-700 bg-emerald-50 border border-emerald-200 rounded-[var(--ui-radius-small)] px-3 py-2">{j.komentar}</p>
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        {filtered.length > 0 && (
          <div className="px-4 py-2.5 border-t border-slate-100 bg-slate-50">
            <p className="text-xs text-slate-400">
              Menampilkan <span className="font-semibold text-slate-600">{filtered.length}</span> dari{''}
              <span className="font-semibold text-slate-600">{localJurnal.length}</span> jurnal
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default JurnalAdmin;
