import { Button, TablePagination, UITimeInput24, UISelect } from '../../../components/ui.jsx';
import { useState, useEffect, useCallback } from'react';
import { MonitorSmartphone, Users, UserCheck, Briefcase, AlertTriangle, Cpu, RefreshCw, Server, Activity, Clock } from'lucide-react';
import useAuthStore from'../../../store/monitoring/authStore';
import { PageHeader } from '../../../components/monitoring/ui/index.js';


const authHeaders = (token) => ({"Authorization": `Bearer ${token}` });

const DEVICE_TYPE_CONFIG = {
  siswa:    { label:'Siswa',            color:'bg-blue-100 text-blue-700 border-blue-200',          icon: Users },
  guru:     { label:'Guru',             color:'bg-emerald-100 text-emerald-700 border-emerald-200', icon: UserCheck },
  karyawan: { label:'Karyawan',         color:'bg-amber-100 text-amber-700 border-amber-200',     icon: Briefcase },
  staff:    { label:'Guru & Karyawan',  color:'bg-purple-100 text-purple-700 border-purple-200',  icon: UserCheck },
};

const DeviceTypeBadge = ({ type }) => {
  const isStaff = ['guru', 'karyawan', 'staff'].includes(type);
  const cfg = isStaff ? DEVICE_TYPE_CONFIG.staff : (DEVICE_TYPE_CONFIG[type] || DEVICE_TYPE_CONFIG.siswa);
  const Icon = cfg.icon;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-[var(--ui-radius-small)] text-[10px] font-bold border ${cfg.color}`}>
      <Icon size={10} /> {cfg.label}
    </span>
  );
};

export default function HikvisionDashboard() {
  const [devices, setDevices] = useState([]);
  const [recentLogs, setRecentLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState(null);
  const [activeFilter, setActiveFilter] = useState('semua');
  const [config, setConfig] = useState({
    masuk_open:"06:00",
    masuk_late:"07:15",
    masuk_close:"11:00",
    pulang_open:"14:00",
    pulang_close:"18:00",
    siswa: { masuk_open:"05:00", masuk_late:"07:15", masuk_close:"11:00", pulang_open:"14:00", pulang_close:"18:00" },
    guru: { masuk_open:"05:00", masuk_late:"07:00", masuk_close:"11:00", pulang_open:"14:00", pulang_close:"18:00" },
    karyawan: { masuk_open:"05:00", masuk_late:"07:00", masuk_close:"11:00", pulang_open:"15:00", pulang_close:"18:00" }
  });
  const [activeConfigTab, setActiveConfigTab] = useState('siswa');
  const [savingConfig, setSavingConfig] = useState(false);
  const [toast, setToast] = useState(null);
  
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);

  const showToast = (message, type ='success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  const authToken = useAuthStore(state => state.user?.authToken);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/hikvision/dashboard", { headers: authHeaders(authToken) });
      const data = await res.json();
      if (data.ok) {
        setDevices(data.devices || []);
        setRecentLogs(data.recentLogs || []);
      }
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  }, [authToken]);

  const fetchConfig = useCallback(async () => {
    try {
      const res = await fetch("/api/hikvision/config", { headers: authHeaders(authToken) });
      const data = await res.json();
      if (data.ok && data.config) {
        setConfig(data.config);
      }
    } catch (err) {
      console.error(err);
    }
  }, [authToken]);

  useEffect(() => {
    fetchData();
    fetchConfig();
  }, [fetchData, fetchConfig]);

  const handleSyncAll = async () => {
    setSyncing(true);
    setSyncMessage(null);
    try {
      const res = await fetch("/api/hikvision/sync-all", { method:"POST", headers: authHeaders(authToken) });
      const data = await res.json();
      if (data.ok) {
        setSyncMessage({ 
          type:'success', 
          text: data.message, 
          stats: data.stats,
          unmatched: data.unmatched,
          unmatchedCount: data.unmatchedCount,
          results: data.syncResults 
        });
        fetchData();
      } else {
        setSyncMessage({ type:'error', text: data.error ||'Gagal sinkronisasi.' });
      }
    } catch (err) {
      setSyncMessage({ type:'error', text: err.message });
    }
    setSyncing(false);
  };

  const handleSaveConfig = async () => {
    setSavingConfig(true);
    try {
      const res = await fetch("/api/hikvision/config", {
        method:"POST",
        headers: { ...authHeaders(authToken),'Content-Type':'application/json' },
        body: JSON.stringify(config)
      });
      const data = await res.json();
      if (data.ok) {
        setSyncMessage({ type:'success', text: data.message });
      } else {
        showToast(data.error ||"Gagal menyimpan pengaturan.","error");
      }
    } catch (err) {
      showToast("Kesalahan jaringan:" + err.message,"error");
    }
    setSavingConfig(false);
  };

  const filteredLogs = (activeFilter ==='semua' 
    ? recentLogs 
    : recentLogs.filter(log => (log.true_person_type || log.person_type || log.device_type) === activeFilter)
  );

  const paginatedLogs = filteredLogs.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
  const totalPages = Math.ceil(filteredLogs.length / itemsPerPage);

  const filterOptions = [
    { value:'semua', label:'Semua' },
    ...Object.entries(DEVICE_TYPE_CONFIG).map(([v, c]) => ({ value: v, label: c.label }))
  ];

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-300">
      <PageHeader 
        title="Mesin Absensi (Hikvision)"
        icon={MonitorSmartphone}
        description="Monitoring status perangkat dan sinkronisasi log kehadiran wajah."
      />
      <div className="ui-card p-5 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
            <Cpu size={16} className="text-[var(--ui-primary)]" />
            Sinkronisasi Data Perangkat
          </h3>
          <p className="text-xs text-slate-500 font-medium mt-1">
            Tarik log absensi terbaru dan sinkronisasikan data pengguna siswa atau guru dari mesin Hikvision yang terhubung.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 justify-start md:justify-end w-full md:w-auto">
          <Button variant="outline" size="sm" className="flex items-center gap-2" 
            onClick={handleSyncAll} 
            disabled={syncing} 
            
          >
            <RefreshCw size={16} className={syncing ?"animate-spin" :""} /> 
            {syncing ?'Menarik & Memproses...' :'Tarik Data & Proses Absensi Semua'}
          </Button>
        </div>
      </div>

      {syncMessage && (
        <div className={`p-4 rounded-[var(--ui-radius-small)] border-l-4 shadow-sm ${syncMessage.type ==='success' ?'bg-emerald-50 border-emerald-500 text-emerald-800' :'bg-red-50 border-rose-500 text-red-800'}`}>
          <div className="flex justify-between items-start">
            <p className="font-bold">{syncMessage.text}</p>
            <Button variant="outline" onClick={() =>setSyncMessage(null)} >×</Button>
          </div>
          
          {syncMessage.stats && (
            <div className="flex gap-4 mt-2 text-sm font-medium text-emerald-700 bg-white/50 p-2 rounded">
              <span className="flex items-center gap-1"><img src="/icons/045-account.svg" className="w-4 h-4 opacity-70" alt="" /> User Baru: {syncMessage.stats.usersSynced}</span>
              <span className="flex items-center gap-1"><img src="/icons/092-file.svg" className="w-4 h-4 opacity-70" alt="" /> Log Masuk: {syncMessage.stats.logsPulled}</span>
              <span className="flex items-center gap-1"><img src="/icons/079-checklist.svg" className="w-4 h-4 opacity-70" alt="" /> Absensi Terproses: {syncMessage.stats.attendanceProcessed}</span>
            </div>
          )}

          {syncMessage.unmatchedCount > 0 && (
            <div className="mt-3 p-3 bg-amber-50 border border-amber-200 text-amber-800 rounded text-sm">
              <p className="font-bold flex items-center gap-1"><AlertTriangle size={14}/> Peringatan: {syncMessage.unmatchedCount} ID Tidak Dikenali Sistem</p>
              <p className="mb-2 opacity-80">ID di mesin tidak ditemukan pada database Siswa/Guru/Karyawan, lognya akan diabaikan.</p>
              <ul className="list-disc pl-5 max-h-32 overflow-auto text-xs">
                {syncMessage.unmatched.map((u, i) => (
                  <li key={i}>ID Mesin: <strong>{u.id}</strong> - Nama: {u.name} (Tipe: {u.type}, Alat: {u.device})</li>
                ))}
              </ul>
            </div>
          )}

          {syncMessage.results && (
            <div className="mt-3 space-y-2">
              <ul className="list-disc list-inside text-xs space-y-1 bg-white/60 p-2.5 rounded-[var(--ui-radius-small)] border border-slate-200/60">
                {syncMessage.results.map((res, i) => {
                  const isFailed = String(res.status).toLowerCase().includes('fetch failed') || String(res.status).toLowerCase().includes('error');
                  return (
                    <li key={i} className={isFailed ? "text-rose-700 font-medium" : "text-emerald-700 font-medium"}>
                      <span className="font-bold">{res.ip}</span>: {isFailed ? `Gagal Terhubung (${res.status})` : res.status}
                      {res.logs_saved !== undefined && ` (${res.logs_saved} tersimpan)`}
                    </li>
                  );
                })}
              </ul>

              {syncMessage.results.some(r => String(r.status).toLowerCase().includes('fetch failed')) && (
                <div className="p-3 bg-rose-50/90 border border-rose-200 text-rose-800 rounded-[var(--ui-radius-small)] text-xs space-y-1.5">
                  <p className="font-black flex items-center gap-1.5 text-rose-900">
                    <AlertTriangle size={15} className="text-rose-600 shrink-0" />
                    Penyebab Utama "Error: fetch failed":
                  </p>
                  <ol className="list-decimal pl-4 space-y-1 font-semibold text-[11px] text-rose-800">
                    <li><strong>Beda Jaringan (LAN/WiFi):</strong> Server aplikasi tidak berada dalam 1 router/jaringan lokal yang sama dengan IP mesin <code className="bg-rose-100 px-1 py-0.5 rounded text-rose-900">192.168.111.x</code>.</li>
                    <li><strong>Mesin Mati / Kabel LAN Terlepas:</strong> Mesin fingerprint dalam keadaan mati atau kabel jaringan terlepas.</li>
                    <li><strong>IP Address Berubah:</strong> IP mesin di jaringan berubah. Cek IP aktif pada layar menu mesin fingerprint dan perbarui di menu <em>Kelola Perangkat Hikvision</em>.</li>
                    <li><strong>Firewall Router:</strong> Port ISAPI (80 / 8000) terblokir oleh router atau firewall jaringan sekolah.</li>
                  </ol>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Daftar Perangkat & Pengaturan Batas Absensi */}
        <div className="lg:col-span-1 flex flex-col gap-4">
          <div className="ui-card overflow-hidden">
            <div className="p-4 border-b border-slate-100 bg-slate-50 flex items-center gap-2">
              <Server size={18} className="text-[var(--ui-primary)]" />
              <h3 className="font-bold text-slate-800 text-sm">Daftar Perangkat</h3>
              <span className="ml-auto text-xs font-black text-slate-400">{devices.length} mesin</span>
            </div>
            <div className="p-0">
              {loading ? (
                <div className="p-8 text-center text-slate-400"><RefreshCw className="animate-spin mx-auto mb-2 text-slate-400" /> Memuat...</div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {devices.map(device => {
                    const cfg = DEVICE_TYPE_CONFIG[device.device_type ||'siswa'] || DEVICE_TYPE_CONFIG.siswa;
                    const Icon = cfg.icon;
                    return (
                      <div key={device.id} className="p-4 flex items-start gap-3 hover:bg-slate-50 transition-colors">
                        <div className={`w-9 h-9 rounded-[var(--ui-radius-small)] flex items-center justify-center shrink-0 border ${cfg.color}`}>
                          <Icon size={18} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-bold text-slate-800 text-sm truncate">{device.location}</div>
                          <div className="text-xs text-slate-500 font-mono flex items-center gap-1 mt-0.5">
                            <Activity size={10} className="text-emerald-500" /> {device.ip_address}
                          </div>
                          <div className="mt-1">
                            <DeviceTypeBadge type={device.device_type ||'siswa'} />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  {devices.length === 0 && <div className="p-4 text-center text-xs text-slate-500 font-bold">Belum ada perangkat.</div>}
                </div>
              )}
            </div>
          </div>

          {/* Pengaturan Batas Absensi */}
          <div className="ui-card overflow-hidden">
            <div className="p-4 border-b border-slate-100 bg-slate-50 flex items-center gap-2">
              <Clock size={18} className="text-[var(--ui-primary)]" />
              <h3 className="font-bold text-slate-800 text-sm">Batas Waktu Absensi</h3>
            </div>
            <div className="p-4 space-y-4">
              <div className="flex border-b border-slate-200 gap-4">
                {['siswa','guru','karyawan'].map(tab => (
                  <button 
                    key={tab}
                    onClick={() =>setActiveConfigTab(tab)}
                    className={`pb-2 text-sm font-bold capitalize transition-colors border-b-2 bg-transparent cursor-pointer ${activeConfigTab === tab ?'border-[var(--ui-primary)] text-[var(--ui-primary)]' :'border-transparent text-slate-500 hover:text-slate-700'}`}
                  >
                    {tab}</button>
                ))}
              </div>
              
              <div>
                <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 mb-2 block">Absen Masuk (Pagi)</h4>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="text-[10px] text-slate-400 font-bold block mb-1">Buka (24J)</label>
                    <UITimeInput24 placeholder="06:00" value={config[activeConfigTab]?.masuk_open ||""} onChange={e => setConfig({...config, [activeConfigTab]: {...config[activeConfigTab], masuk_open: e.target.value}})} />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-400 font-bold block mb-1">Terlambat (24J)</label>
                    <UITimeInput24 placeholder="07:00" value={config[activeConfigTab]?.masuk_late ||""} onChange={e => setConfig({...config, [activeConfigTab]: {...config[activeConfigTab], masuk_late: e.target.value}})} />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-400 font-bold block mb-1">Tutup (24J)</label>
                    <UITimeInput24 placeholder="08:00" value={config[activeConfigTab]?.masuk_close ||""} onChange={e => setConfig({...config, [activeConfigTab]: {...config[activeConfigTab], masuk_close: e.target.value}})} />
                  </div>
                </div>
              </div>

              <div>
                <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 mb-2 block">Absen Pulang (Sore)</h4>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] text-slate-400 font-bold block mb-1">Buka (24J)</label>
                    <UITimeInput24 placeholder="14:00" value={config[activeConfigTab]?.pulang_open ||""} onChange={e => setConfig({...config, [activeConfigTab]: {...config[activeConfigTab], pulang_open: e.target.value}})} />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-400 font-bold block mb-1">Tutup (24J)</label>
                    <UITimeInput24 placeholder="17:00" value={config[activeConfigTab]?.pulang_close ||""} onChange={e => setConfig({...config, [activeConfigTab]: {...config[activeConfigTab], pulang_close: e.target.value}})} />
                  </div>
                </div>
              </div>

              <div>
                <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 mb-2 block">Notifikasi Izin/Sakit Guru</h4>
                <div className="space-y-2">
                  <div>
                    <label className="text-[10px] text-slate-400 font-bold block mb-1">Kirim Ke Peran / Nomor</label>
                    <UISelect 
                      value={config.notify_role ||"none"} 
                      onChange={e => setConfig({...config, notify_role: e.target.value})} 
                      className="w-full border border-slate-200 rounded-[var(--ui-radius-small)] px-3 py-2 text-xs font-bold bg-white focus:border-[var(--ui-primary)] focus:ring-1 focus:ring-[var(--ui-primary)] outline-none"
                    >
                      <option value="none">Tidak Ada (none)</option>
                      <option value="kepsek">Kepala Sekolah (kepsek)</option>
                      <option value="waka_kurikulum">Waka Kurikulum (waka_kurikulum)</option>
                      <option value="waka_kesiswaan">Waka Kesiswaan (waka_kesiswaan)</option>
                      <option value="custom">Nomor WA Kustom</option>
                    </UISelect>
                  </div>
                  {config.notify_role ==="custom" && (
                    <div>
                      <label className="text-[10px] text-slate-400 font-bold block mb-1">Nomor WA Penerima</label>
                      <input 
                        type="text" 
                        value={config.notify_custom_phone ||""} 
                        onChange={e => setConfig({...config, notify_custom_phone: e.target.value})} 
                        className="w-full border border-slate-200 bg-white rounded-[var(--ui-radius-small)] px-3 py-2 text-xs font-bold focus:border-[var(--ui-primary)] focus:ring-1 focus:ring-[var(--ui-primary)] outline-none" 
                        placeholder="Contoh: 628123456789"
                      />
                    </div>
                  )}
                </div>
              </div>

              <Button onClick={handleSaveConfig} disabled={savingConfig} className="w-full mt-2">
                {savingConfig ?"Menyimpan..." :"Simpan Batas Waktu"}
              </Button>
            </div>
          </div>
        </div>

        {/* Log Kehadiran */}
        <div className="lg:col-span-2">
          <div className="ui-card overflow-hidden">
            <div className="p-4 border-b border-slate-100 bg-slate-50 flex flex-col sm:flex-row sm:items-center gap-3">
              <div className="flex items-center gap-2">
                <Clock size={18} className="text-amber-600" />
                <h3 className="font-bold text-slate-800 text-sm">Log Kehadiran Terbaru</h3>
              </div>
              {/* Filter tipe */}
              <div className="flex items-center gap-1 sm:ml-auto">
                {filterOptions.map(opt => (
                  <Button variant="outline"
                    key={opt.value}
                    onClick={() => { setActiveFilter(opt.value); setCurrentPage(1); }}
                    className={`cursor-pointer`}
                  >
                    {opt.label}</Button>
                ))}
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs whitespace-nowrap">
                <thead className="bg-white border-b border-slate-100 text-slate-400 uppercase tracking-wider font-bold">
                  <tr>
                    <th className="px-5 py-3.5">Waktu</th>
                    <th className="px-5 py-3.5">Nama / ID</th>
                    <th className="px-5 py-3.5">Mesin</th>
                    <th className="px-5 py-3.5 text-right">Tipe</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 font-semibold text-slate-700">
                  {loading ? (
                    <tr><td colSpan={4} className="p-8 text-center text-slate-400">Memuat log...</td></tr>
                  ) : paginatedLogs.map(log => (
                    <tr key={log.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-5 py-3.5">
                        {new Date(log.timestamp).toLocaleString('id-ID', { dateStyle:'medium', timeStyle:'short' })}
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="font-bold text-slate-800">{log.student_name}</div>
                        <div className="text-[10px] text-slate-400 font-mono mt-0.5">{log.employee_id}</div>
                      </td>
                      <td className="px-5 py-3.5 text-slate-500 font-mono">{log.ip_address}</td>
                      <td className="px-5 py-3.5 text-right">
                        <DeviceTypeBadge type={log.true_person_type || log.person_type || log.device_type || 'siswa'} />
                      </td>
                    </tr>
                  ))}
                  {!loading && paginatedLogs.length === 0 && (
                    <tr><td colSpan={4} className="p-8 text-center text-slate-400 font-medium">Tidak ada data log.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
            
            <TablePagination 
              currentPage={currentPage}
              totalPages={totalPages}
              totalItems={filteredLogs.length}
              itemsPerPage={itemsPerPage}
              onPageChange={setCurrentPage}
              onItemsPerPageChange={(val) => { setItemsPerPage(val); setCurrentPage(1); }}
              isLoading={loading}
            />
          </div>
        </div>
      </div>
      {toast && (
        <div className={`fixed bottom-6 right-6 px-4 py-3 rounded-[var(--ui-radius-small)] shadow-sm font-medium text-sm flex items-center gap-2 animate-in slide-in-from-bottom-5 text-white z-[100] ${toast.type ==='error' ?'bg-rose-600' :'bg-emerald-600'}`}>
          {toast.message}
        </div>
      )}
    </div>
  );
}
