import { Button } from '../../../components/ui.jsx';
import { useState, useEffect, useMemo } from'react';
import { Activity, Trash2, User, Database, CheckCircle2, Edit2, LogOut, Send, ShieldCheck, Key, History } from'lucide-react';
import useAuthStore from'../../../store/monitoring/authStore.js';
import { Search, RefreshCw, AlertCircle } from'lucide-react';
import { PageHeader } from'../../../components/monitoring/ui/index.js';
import { UISelect } from'../../../components/ui.jsx';


const ACTION_COLORS = {
  UPDATE: { bg:'bg-blue-50', text:'text-blue-700', border:'border-blue-200' },
  UPSERT: { bg:'bg-emerald-50', text:'text-emerald-700', border:'border-emerald-200' },
  DELETE: { bg:'bg-red-50', text:'text-red-700', border:'border-red-200' },
  SEND_WA: { bg:'bg-green-50', text:'text-green-700', border:'border-green-200' },
  LOGIN: { bg:'bg-violet-50', text:'text-violet-700', border:'border-violet-200' },
  LOGOUT: { bg:'bg-slate-50', text:'text-slate-600', border:'border-slate-200' },
  KENAIKAN_KELAS: { bg:'bg-amber-50', text:'text-amber-700', border:'border-amber-200' },
  DEFAULT: { bg:'bg-slate-50', text:'text-slate-600', border:'border-slate-200' },
};

const ACTION_ICONS = {
  UPDATE: Edit2, UPSERT: CheckCircle2, DELETE: Trash2, SEND_WA: Send,
  LOGIN: User, LOGOUT: LogOut, KENAIKAN_KELAS: Activity, DEFAULT: Database,
};

export default function AuditLog({ activeTab, setActiveTab }) {
  const [logs, setLogs] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [filterAction, setFilterAction] = useState('all');
  const [filterRole, setFilterRole] = useState('all');
  const [toast, setToast] = useState(null);
  const authToken = useAuthStore(state => state.user?.authToken);
  const LIMIT = 50;

  const showToast = (message, type ='success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  const fetchLogs = async (p = 1) => {
    if (!authToken) return;
    setIsLoading(true);
    try {
      const res = await fetch(`/api/audit-logs?page=${p}&limit=${LIMIT}`, { headers: { Authorization: `Bearer ${authToken}` } });
      const data = await res.json();
      if (data.ok) { setLogs(data.data || []); setTotal(data.total || 0); }
    } catch (e) { console.error(e); }
    setIsLoading(false);
  };

  useEffect(() => { fetchLogs(page); }, [authToken, page]);

  const handleClearLogs = async () => {
    if (!await window.confirmAsync('Hapus SEMUA log aktivitas? Tindakan ini tidak bisa dibatalkan.')) return;
    try {
      await fetch('/api/audit-logs', {
        method:'POST', headers: { Authorization: `Bearer ${authToken}`,'Content-Type':'application/json' },
        body: JSON.stringify({ action:'clear' }),
      });
      showToast('Semua log berhasil dibersihkan.');
      setLogs([]); setTotal(0); setPage(1);
    } catch (e) { showToast('Gagal.','error'); }
  };

  const filteredLogs = useMemo(() => {
    return logs.filter(log => {
      const matchSearch = !search || log.user_name?.toLowerCase().includes(search.toLowerCase()) || log.action?.toLowerCase().includes(search.toLowerCase()) || log.detail?.toLowerCase().includes(search.toLowerCase()) || log.target_type?.toLowerCase().includes(search.toLowerCase());
      const matchAction = filterAction ==='all' || log.action === filterAction;
      const matchRole = filterRole ==='all' || log.user_role === filterRole;
      return matchSearch && matchAction && matchRole;
    });
  }, [logs, search, filterAction, filterRole]);

  const uniqueActions = useMemo(() => ['all', ...new Set(logs.map(l => l.action).filter(Boolean))], [logs]);
  const uniqueRoles = useMemo(() => ['all', ...new Set(logs.map(l => l.user_role).filter(Boolean))], [logs]);
  const totalPages = Math.ceil(total / LIMIT);

  return (
    <div className="space-y-6 relative animate-in fade-in duration-300 z-10">
      <PageHeader 
        title="Log Aktivitas (Audit Trail)"
        description="Rekam jejak semua perubahan data penting yang dilakukan oleh pengguna sistem."
        icon={Activity}
        tabs={[
          { id:"hak_akses", label:"Hak Akses & Role", icon: ShieldCheck },
          { id:"pengaturanuser", label:"Akun Pengguna", icon: Key },
          { id:"audit_log", label:"Audit Log & Aktivitas", icon: History }
        ]}
        activeTab={activeTab}
        onTabChange={setActiveTab}
      />

      {/* Filters & Actions Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white p-4 rounded-[var(--ui-radius-small)] border-none shadow-sm">
        <div className="flex flex-wrap items-center gap-3 flex-1">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Cari pengguna, aksi, detail..."
              className="w-full pl-9 pr-3 py-2 bg-slate-50 border-none rounded-[var(--ui-radius-small)] text-sm focus:outline-none focus:border-[var(--ui-primary)]" />
          </div>
          <div className="w-48">
            <UISelect value={filterAction} onChange={e => setFilterAction(e.target.value)} className="!py-2 !text-sm bg-slate-50">
              {uniqueActions.map(a => <option key={a} value={a}>{a ==='all' ?'Semua Aksi' : a}</option>)}
            </UISelect>
          </div>
          <div className="w-40">
            <UISelect value={filterRole} onChange={e => setFilterRole(e.target.value)} className="!py-2 !text-sm bg-slate-50">
              {uniqueRoles.map(r => <option key={r} value={r}>{r ==='all' ?'Semua Role' : r}</option>)}
            </UISelect>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start lg:self-center">
          <span className="text-xs text-slate-500 bg-slate-100 border border-slate-200 px-3 py-1.5 rounded-[var(--ui-radius-small)] font-bold">{total.toLocaleString()} total log</span>
          <Button variant="outline" onClick={() =>fetchLogs(page)} className="flex items-center gap-2">
            <RefreshCw size={14} /> Refresh</Button>
          <button onClick={handleClearLogs} className="flex items-center gap-2">
            <Trash2 size={14} /> Bersihkan
          </button>
        </div>
      </div>

      {/* Log Table */}
      <div className="bg-white rounded-[var(--ui-radius-small)] border-none shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="text-xs text-slate-500 uppercase bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="px-4 py-3 font-bold text-left w-40">Waktu</th>
              <th className="px-4 py-3 font-bold text-left">Pengguna</th>
              <th className="px-4 py-3 font-bold text-center w-32">Aksi</th>
              <th className="px-4 py-3 font-bold text-left">Objek</th>
              <th className="px-4 py-3 font-bold text-left">Keterangan</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={5} className="px-4 py-10 text-center text-slate-400">Memuat log...</td></tr>
            ) : filteredLogs.length === 0 ? (
              <tr><td colSpan={5} className="px-4 py-10 text-center text-slate-400">
                {logs.length === 0 ?'Belum ada aktivitas yang tercatat.' :'Tidak ada log yang cocok dengan filter.'}
              </td></tr>
            ) : filteredLogs.map(log => {
              const colors = ACTION_COLORS[log.action] || ACTION_COLORS.DEFAULT;
              const ActionIcon = ACTION_ICONS[log.action] || ACTION_ICONS.DEFAULT;
              return (
                <tr key={log.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3 text-xs text-slate-400 font-mono whitespace-nowrap">
                    {new Date(log.created_at).toLocaleDateString('id-ID', { day:'2-digit', month:'2-digit', year:'2-digit' })}<br />
                    {new Date(log.created_at).toLocaleTimeString('id-ID', { hour:'2-digit', minute:'2-digit', second:'2-digit' })}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-[var(--ui-primary)]/10 flex items-center justify-center shrink-0">
                        <User size={12} className="text-[var(--ui-primary)]" />
                      </div>
                      <div>
                        <p className="font-bold text-slate-700 text-xs">{log.user_name ||'Sistem'}</p>
                        <p className="text-[10px] text-slate-400">{log.user_role ||'-'} {log.ip_address ? `• ${log.ip_address}` :''}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-[var(--ui-radius-small)] text-[10px] font-bold border ${colors.bg} ${colors.text} ${colors.border}`}>
                      <ActionIcon size={9} />
                      {log.action}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-[var(--ui-radius-small)] font-mono">{log.target_type}</span>
                    {log.target_id && <span className="text-xs text-slate-400 ml-1">#{log.target_id}</span>}
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-600 max-w-xs">
                    <p className="line-clamp-2">{log.detail ||'-'}</p>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-4 py-3 border-t border-slate-100 flex items-center justify-between bg-slate-50">
            <p className="text-xs text-slate-500">Halaman {page} dari {totalPages} ({total} total)</p>
            <div className="flex gap-2">
              <Button variant="outline" disabled={page <= 1} onClick={() =>setPage(p => p - 1)}
                >← Prev</Button>
              <Button variant="outline" disabled={page  >= totalPages} onClick={() => setPage(p => p + 1)}
                >Next →</Button>
            </div>
          </div>
        )}
      </div>

      {toast && (
        <div className={`fixed bottom-6 right-6 px-4 py-3 rounded-[var(--ui-radius-small)] shadow-sm font-medium text-sm flex items-center gap-2 animate-in slide-in-from-bottom-5 text-white ${toast.type ==='error' ?'bg-red-600' :'bg-emerald-600'}`}>
          {toast.type ==='error' ? <AlertCircle size={18} /> : <CheckCircle2 size={18} />} {toast.message}
        </div>
      )}
    </div>
  );
}
