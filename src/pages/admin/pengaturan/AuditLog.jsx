import { Button, TablePagination } from "../../../components/ui.jsx";
import { useState, useEffect, useMemo } from "react";
import {
  Activity, Trash2, User, Database, CheckCircle2, Edit2, LogOut, Send,
  ShieldCheck, Key, History, Monitor, Smartphone, X, Clock, MapPin, Info
} from "lucide-react";
import useAuthStore from "../../../store/monitoring/authStore.js";
import { Search, RefreshCw, AlertCircle } from "lucide-react";
import { PageHeader } from "../../../components/monitoring/ui/index.js";
import { UISelect } from "../../../components/ui.jsx";

const ACTION_COLORS = {
  UPDATE:         { bg: "bg-indigo-50",    text: "text-indigo-700",    border: "border-indigo-200" },
  UPSERT:         { bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200" },
  DELETE:         { bg: "bg-rose-50",     text: "text-rose-700",     border: "border-rose-200" },
  SEND_WA:        { bg: "bg-emerald-50",   text: "text-emerald-700",   border: "border-emerald-200" },
  LOGIN:          { bg: "bg-violet-50",  text: "text-violet-700",  border: "border-violet-200" },
  LOGOUT:         { bg: "bg-slate-50",   text: "text-slate-600",   border: "border-slate-200" },
  UPLOAD:         { bg: "bg-orange-50",  text: "text-orange-700",  border: "border-orange-200" },
  DOWNLOAD:       { bg: "bg-sky-50",     text: "text-sky-700",     border: "border-sky-200" },
  RESTORE:        { bg: "bg-amber-50",   text: "text-amber-700",   border: "border-amber-200" },
  KENAIKAN_KELAS: { bg: "bg-amber-50",   text: "text-amber-700",   border: "border-amber-200" },
  DEFAULT:        { bg: "bg-slate-50",   text: "text-slate-600",   border: "border-slate-200" },
};
const ACTION_ICONS = {
  UPDATE: Edit2, UPSERT: CheckCircle2, DELETE: Trash2, SEND_WA: Send,
  LOGIN: User, LOGOUT: LogOut, KENAIKAN_KELAS: Activity,
  RESTORE: Database, DEFAULT: Database,
};

function parseUserAgent(ua) {
  if (!ua) return { browser: "Tidak diketahui", os: "", icon: "monitor" };
  let browser = "Browser Lain", os = "", icon = "monitor";
  if (ua.includes("Edg/"))               browser = "Edge";
  else if (ua.includes("OPR/"))          browser = "Opera";
  else if (ua.includes("Chrome/"))       browser = "Chrome";
  else if (ua.includes("Firefox/"))      browser = "Firefox";
  else if (ua.includes("Safari/") && !ua.includes("Chrome")) browser = "Safari";
  const v = ua.match(/(Chrome|Firefox|Safari|OPR|Edg)\/(\d+)/);
  if (v) browser = browser + " " + v[2];
  if (ua.includes("Windows NT 10"))      { os = "Windows 10/11"; icon = "monitor"; }
  else if (ua.includes("Windows"))       { os = "Windows"; icon = "monitor"; }
  else if (ua.includes("Mac OS X"))      { os = "macOS"; icon = "monitor"; }
  else if (ua.includes("Android"))       { os = "Android"; icon = "mobile"; }
  else if (ua.includes("iPhone") || ua.includes("iPad")) { os = "iOS"; icon = "mobile"; }
  else if (ua.includes("Linux"))         { os = "Linux"; icon = "monitor"; }
  return { browser, os, icon };
}

function DeviceIcon({ icon, size = 12, className = "text-slate-400" }) {
  if (icon === "mobile") return <Smartphone size={size} className={className} />;
  return <Monitor size={size} className={className} />;
}

function AuditDetailModal({ log, onClose }) {
  if (!log) return null;
  const colors = ACTION_COLORS[log.action] || ACTION_COLORS.DEFAULT;
  const ActionIcon = ACTION_ICONS[log.action] || ACTION_ICONS.DEFAULT;
  const { browser, os, icon } = parseUserAgent(log.user_agent);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={onClose} style={{ background: "rgba(15,23,42,0.55)", backdropFilter: "blur(4px)" }}>
      <div className="bg-white rounded-[var(--ui-radius-card)] shadow-xs w-full max-w-lg animate-in fade-in zoom-in-95 duration-200"
        onClick={e => e.stopPropagation()}>
        <div className="flex items-start justify-between p-5 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className={"w-10 h-10 rounded-[var(--ui-radius-small)] flex items-center justify-center " + colors.bg + " " + colors.text}>
              <ActionIcon size={18} />
            </div>
            <div>
              <h3 className="font-bold text-slate-800 text-sm">Detail Aktivitas</h3>
              <span className={"inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold border mt-0.5 " + colors.bg + " " + colors.text + " " + colors.border}>
                {log.action}
              </span>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-[var(--ui-radius-small)] hover:bg-slate-100 flex items-center justify-center transition-colors">
            <X size={16} className="text-slate-500" />
          </button>
        </div>
        <div className="p-5 space-y-3">
          <div className="bg-slate-50 rounded-[var(--ui-radius-small)] p-4">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1">Keterangan Aktivitas</p>
            <p className="text-sm text-slate-800 font-medium leading-relaxed">{log.detail || "Tidak ada keterangan."}</p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-slate-50 rounded-[var(--ui-radius-small)] p-3">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1 flex items-center gap-1"><User size={10} /> Pengguna</p>
              <p className="text-sm font-bold text-slate-800">{log.user_name || "—"}</p>
              <p className="text-[11px] text-slate-500">{log.user_role || "—"}</p>
            </div>
            <div className="bg-slate-50 rounded-[var(--ui-radius-small)] p-3">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1 flex items-center gap-1"><Clock size={10} /> Waktu</p>
              <p className="text-sm font-bold text-slate-800">{new Date(log.created_at).toLocaleDateString("id-ID", { day: "2-digit", month: "long", year: "numeric" })}</p>
              <p className="text-[11px] text-slate-500 font-mono">{new Date(log.created_at).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", second: "2-digit" })} WIB</p>
            </div>
            <div className="bg-slate-50 rounded-[var(--ui-radius-small)] p-3">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1 flex items-center gap-1"><Database size={10} /> Objek Data</p>
              <p className="text-sm font-bold text-slate-800 font-mono">{log.target_type || "—"}</p>
              {log.target_id && <p className="text-[11px] text-slate-500">ID: #{log.target_id}</p>}
            </div>
            <div className="bg-slate-50 rounded-[var(--ui-radius-small)] p-3">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1 flex items-center gap-1"><MapPin size={10} /> Alamat IP</p>
              <p className="text-sm font-bold text-slate-800 font-mono">{log.ip_address || "—"}</p>
            </div>
          </div>
          <div className="bg-slate-50 rounded-[var(--ui-radius-small)] p-3">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-2 flex items-center gap-1"><Monitor size={10} /> Perangkat & Browser</p>
            <div className="flex items-center gap-2">
              <DeviceIcon icon={icon} size={16} />
              <div>
                <p className="text-sm font-bold text-slate-800">{browser}</p>
                {os && <p className="text-[11px] text-slate-500">{os}</p>}
              </div>
            </div>
            {log.user_agent && (
              <p className="text-[10px] text-slate-400 mt-2 font-mono leading-relaxed break-all border-t border-slate-200 pt-2">{log.user_agent}</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AuditLog({ activeTab, setActiveTab }) {
  const [logs, setLogs] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [filterAction, setFilterAction] = useState("all");
  const [filterRole, setFilterRole] = useState("all");
  const [toast, setToast] = useState(null);
  const [itemsPerPage, setItemsPerPage] = useState(50);
  const [selectedLog, setSelectedLog] = useState(null);
  const authToken = useAuthStore(state => state.user?.authToken);

  const showToast = (message, type = "success") => { setToast({ message, type }); setTimeout(() => setToast(null), 3500); };

  const fetchLogs = async (p = 1) => {
    if (!authToken) return;
    setIsLoading(true);
    try {
      const res = await fetch("/api/audit-logs?page=" + p + "&limit=" + itemsPerPage, { headers: { Authorization: "Bearer " + authToken } });
      const data = await res.json();
      if (data.ok) { setLogs(data.data || []); setTotal(data.total || 0); }
    } catch (e) { console.error(e); }
    setIsLoading(false);
  };

  useEffect(() => { fetchLogs(page); }, [authToken, page, itemsPerPage]);

  const handleClearLogs = async () => {
    if (!await window.confirmAsync("Hapus SEMUA log aktivitas? Tindakan ini tidak bisa dibatalkan.")) return;
    try {
      await fetch("/api/audit-logs", {
        method: "POST", headers: { Authorization: "Bearer " + authToken, "Content-Type": "application/json" },
        body: JSON.stringify({ action: "clear" }),
      });
      showToast("Semua log berhasil dibersihkan."); setLogs([]); setTotal(0); setPage(1);
    } catch (e) { showToast("Gagal.", "error"); }
  };

  const filteredLogs = useMemo(() => logs.filter(log => {
    const s = search.toLowerCase();
    const matchSearch = !s || log.user_name?.toLowerCase().includes(s) || log.action?.toLowerCase().includes(s) || log.detail?.toLowerCase().includes(s) || log.target_type?.toLowerCase().includes(s) || log.ip_address?.toLowerCase().includes(s);
    return matchSearch && (filterAction === "all" || log.action === filterAction) && (filterRole === "all" || log.user_role === filterRole);
  }), [logs, search, filterAction, filterRole]);

  const uniqueActions = useMemo(() => ["all", ...new Set(logs.map(l => l.action).filter(Boolean))], [logs]);
  const uniqueRoles = useMemo(() => ["all", ...new Set(logs.map(l => l.user_role).filter(Boolean))], [logs]);
  const totalPages = Math.ceil(total / itemsPerPage);

  return (
    <div className="space-y-6 relative animate-in fade-in duration-300 z-10">
      <PageHeader title="Log Aktivitas (Audit Trail)" description="Rekam jejak semua perubahan data penting beserta IP address dan perangkat yang digunakan." icon={Activity}
        tabs={[{ id: "hak_akses", label: "Hak Akses & Role", icon: ShieldCheck }, { id: "pengaturanuser", label: "Akun Pengguna", icon: Key }, { id: "audit_log", label: "Audit Log & Aktivitas", icon: History }]}
        activeTab={activeTab} onTabChange={setActiveTab} />

      <div className="flex items-center gap-3 px-4 py-3 bg-indigo-50 border border-indigo-200 rounded-[var(--ui-radius-small)] text-sm text-indigo-700">
        <Info size={16} className="shrink-0" />
        <span>Klik baris mana saja untuk melihat <b>detail lengkap</b> aktivitas termasuk IP address, perangkat, dan browser yang digunakan.</span>
      </div>

      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white p-4 rounded-[var(--ui-radius-small)] border-none shadow-sm">
        <div className="flex flex-wrap items-center gap-3 flex-1">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Cari pengguna, aksi, IP, detail..."
              className="w-full pl-9 pr-3 py-2 bg-slate-50 border-none rounded-[var(--ui-radius-small)] text-sm focus:outline-none focus:border-[var(--ui-primary)]" />
          </div>
          <div className="w-48">
            <UISelect value={filterAction} onChange={e => setFilterAction(e.target.value)} className="!py-2 !text-sm bg-slate-50">
              {uniqueActions.map(a => <option key={a} value={a}>{a === "all" ? "Semua Aksi" : a}</option>)}
            </UISelect>
          </div>
          <div className="w-40">
            <UISelect value={filterRole} onChange={e => setFilterRole(e.target.value)} className="!py-2 !text-sm bg-slate-50">
              {uniqueRoles.map(r => <option key={r} value={r}>{r === "all" ? "Semua Role" : r}</option>)}
            </UISelect>
          </div>
        </div>
        <div className="flex items-center gap-2 self-start lg:self-center">
          <span className="text-xs text-slate-500 bg-slate-100 border border-slate-200 px-3 py-1.5 rounded-[var(--ui-radius-small)] font-bold">{total.toLocaleString()} total log</span>
          <Button variant="outline" onClick={() => fetchLogs(page)} className="flex items-center gap-2"><RefreshCw size={14} /> Refresh</Button>
          <button onClick={handleClearLogs} className="flex items-center gap-2"><Trash2 size={14} /> Bersihkan</button>
        </div>
      </div>

      <div className="bg-white rounded-[var(--ui-radius-small)] border-none shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="text-xs text-slate-500 uppercase bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="px-4 py-3 font-bold text-left w-36">Waktu</th>
              <th className="px-4 py-3 font-bold text-left">Pengguna</th>
              <th className="px-4 py-3 font-bold text-center w-28">Aksi</th>
              <th className="px-4 py-3 font-bold text-left w-32">Objek</th>
              <th className="px-4 py-3 font-bold text-left">Keterangan</th>
              <th className="px-4 py-3 font-bold text-left w-40">Perangkat / IP</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={6} className="px-4 py-10 text-center text-slate-400">Memuat log...</td></tr>
            ) : filteredLogs.length === 0 ? (
              <tr><td colSpan={6} className="px-4 py-10 text-center text-slate-400">
                {logs.length === 0 ? "Belum ada aktivitas yang tercatat." : "Tidak ada log yang cocok dengan filter."}
              </td></tr>
            ) : filteredLogs.map(log => {
              const colors = ACTION_COLORS[log.action] || ACTION_COLORS.DEFAULT;
              const ActionIcon = ACTION_ICONS[log.action] || ACTION_ICONS.DEFAULT;
              const { browser, os, icon } = parseUserAgent(log.user_agent);
              return (
                <tr key={log.id} className="border-b border-slate-100 hover:bg-indigo-50/30 transition-colors cursor-pointer group" onClick={() => setSelectedLog(log)}>
                  <td className="px-4 py-3 text-xs text-slate-400 font-mono whitespace-nowrap">
                    {new Date(log.created_at).toLocaleDateString("id-ID", { day: "2-digit", month: "2-digit", year: "2-digit" })}<br />
                    {new Date(log.created_at).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-[var(--ui-primary)]/10 flex items-center justify-center shrink-0"><User size={12} className="text-[var(--ui-primary)]" /></div>
                      <div>
                        <p className="font-bold text-slate-700 text-xs">{log.user_name || "Sistem"}</p>
                        <p className="text-[10px] text-slate-400">{log.user_role || "—"}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={"inline-flex items-center gap-1 px-2 py-1 rounded-[var(--ui-radius-small)] text-[10px] font-bold border " + colors.bg + " " + colors.text + " " + colors.border}>
                      <ActionIcon size={9} />{log.action}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-[var(--ui-radius-small)] font-mono">{log.target_type}</span>
                    {log.target_id && <span className="text-xs text-slate-400 ml-1">#{log.target_id}</span>}
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-600 max-w-[200px]">
                    <p className="line-clamp-2 group-hover:text-slate-900">{log.detail || "—"}</p>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-start gap-1.5">
                      <DeviceIcon icon={icon} size={12} />
                      <div>
                        <p className="text-[10px] font-medium text-slate-600 leading-tight">{browser}</p>
                        {os && <p className="text-[10px] text-slate-400 leading-tight">{os}</p>}
                        {log.ip_address && <p className="text-[10px] text-slate-400 font-mono mt-0.5">{log.ip_address}</p>}
                      </div>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <TablePagination currentPage={page} totalPages={totalPages} totalItems={total} itemsPerPage={itemsPerPage} onPageChange={setPage} onItemsPerPageChange={(val) => { setItemsPerPage(val); setPage(1); }} isLoading={isLoading} />
      </div>

      {selectedLog && <AuditDetailModal log={selectedLog} onClose={() => setSelectedLog(null)} />}

      {toast && (
        <div className={"fixed bottom-6 right-6 px-4 py-3 rounded-[var(--ui-radius-small)] shadow-sm font-medium text-sm flex items-center gap-2 animate-in slide-in-from-bottom-5 text-white " + (toast.type === "error" ? "bg-rose-600" : "bg-emerald-600")}>
          {toast.type === "error" ? <AlertCircle size={18} /> : <CheckCircle2 size={18} />} {toast.message}
        </div>
      )}
    </div>
  );
}