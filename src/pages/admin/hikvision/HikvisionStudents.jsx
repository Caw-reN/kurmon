import { Button } from '../../../components/ui.jsx';
import { useState, useEffect, useRef } from'react';
import { useVirtualizer } from'@tanstack/react-virtual';
import useAuthStore from'../../../store/monitoring/authStore';
import { AlertTriangle, CheckCircle2, Info, UserCheck, Briefcase, GraduationCap, Fingerprint } from'lucide-react';
import * as XLSX from'xlsx';
import { Link } from'react-router-dom';
import { X, Users, Link2Off, RefreshCw, Wifi, Sparkles, Upload, CheckSquare, Search, AlertCircle } from'lucide-react';
import { CustomSelect } from'../../../components/CustomSelect.jsx';
import { Modal } from'../../../components/ui.jsx';
import { PageHeader } from'../../../components/monitoring/ui/index.js';


// Toast
const Toast = ({ message, type, onClose }) => {
  if (!message) return null;
  const bg = { success:"bg-emerald-50 border-emerald-200 text-emerald-800", error:"bg-red-50 border-red-200 text-red-800", info:"bg-blue-50 border-blue-200 text-blue-800" };
  const Icon = type ==='success' ? CheckCircle2 : type ==='error' ? AlertTriangle : Info;
  const ic = { success:"text-emerald-500", error:"text-rose-500", info:"text-blue-500" };
  return (
    <div className="fixed bottom-4 right-4 z-50 animate-in slide-in-from-bottom-5 fade-in duration-300">
      <div className={`flex items-center gap-3 px-4 py-3 rounded-[var(--ui-radius-small)] border shadow-sm ${bg[type] || bg.info} max-w-sm`}>
        <Icon size={20} className={ic[type] || ic.info} />
        <p className="text-sm font-bold flex-1">{message}</p>
        <Button variant="outline" onClick={onClose} ><X size={16} /></Button>
      </div>
    </div>
  );
};

// ── TAB SISWA ──────────────────────────────────────────────────────────────────
function TabSiswa({ classes, authToken, showToast }) {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [search, setSearch] = useState("");
  const [groupFilter, setGroupFilter] = useState("all");
  const [saving, setSaving] = useState({});
  const [selectedNis, setSelectedNis] = useState(new Set());
  const [bulkClass, setBulkClass] = useState("");
  const [isBulkSaving, setIsBulkSaving] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [importReview, setImportReview] = useState(null);
  const fileInputRef = useRef(null);
  const parentRef = useRef(null);

  const handleSync = async () => {
    setSyncing(true);
    try {
      const res = await fetch('/api/hikvision/sync-all', {
        method:'POST',
        headers: {"Authorization": `Bearer ${authToken}`,"Content-Type":"application/json" }
      });
      const data = await res.json();
      if (data.ok) {
        showToast(data.message ||'Sinkronisasi siswa berhasil!','success');
        await fetchStudents();
      } else {
        showToast(data.error ||'Sinkronisasi gagal','error');
      }
    } catch (err) {
      showToast('Kesalahan jaringan saat sinkronisasi.','error');
    }
    setSyncing(false);
  };

  const fetchStudents = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/hikvision/students?type=siswa", {
        headers: {"Authorization": `Bearer ${authToken}` }
      });
      const data = await res.json();
      if (data.ok) setStudents(data.data || []);
      else showToast(data.error ||"Gagal memuat data siswa","error");
    } catch (err) { showToast("Terjadi kesalahan jaringan.","error"); }
    setLoading(false);
  };

  useEffect(() => { fetchStudents(); }, []);

  const handleClassChange = async (nis, newClassName) => {
    setSaving(prev => ({ ...prev, [nis]: true }));
    try {
      const res = await fetch(`/api/hikvision/students/${nis}`, {
        method:'PUT',
        headers: {"Authorization": `Bearer ${authToken}`,"Content-Type":"application/json" },
        body: JSON.stringify({ class_name: newClassName })
      });
      const data = await res.json();
      if (data.ok) {
        setStudents(prev => prev.map(s => s.nis === nis ? { ...s, class_name: newClassName } : s));
        showToast("Kelas berhasil diperbarui","success");
      } else showToast(data.error ||"Gagal menyimpan","error");
    } catch (err) { showToast("Kesalahan jaringan.","error"); }
    setSaving(prev => ({ ...prev, [nis]: false }));
  };

  const handleBulkApply = async () => {
    if (selectedNis.size === 0) return showToast("Pilih minimal 1 siswa.","error");
    if (!bulkClass) return showToast("Pilih kelas yang ingin diterapkan.","error");
    setIsBulkSaving(true);
    const updates = Array.from(selectedNis).map(nis => ({ nis, class_name: bulkClass }));
    try {
      const res = await fetch('/api/hikvision/students/bulk', {
        method:'PUT',
        headers: {"Authorization": `Bearer ${authToken}`,"Content-Type":"application/json" },
        body: JSON.stringify({ updates })
      });
      const data = await res.json();
      if (data.ok) {
        setStudents(prev => prev.map(s => selectedNis.has(s.nis) ? { ...s, class_name: bulkClass } : s));
        setSelectedNis(new Set());
        showToast("Berhasil memetakan kelas secara massal!","success");
      } else showToast(data.error ||"Gagal memetakan kelas","error");
    } catch (err) { showToast("Kesalahan jaringan.","error"); }
    setIsBulkSaving(false);
  };

  const handleAutoDetect = () => {
    const validClassesMap = new Map((classes || []).map(c => [c?.name ? String(c.name).trim().toLowerCase() :"", c?.name ||""]));
    const updates = [];
    (students || []).forEach(s => {
      if (s && s.group_name) {
        const gName = String(s.group_name).trim().toLowerCase();
        if (gName && validClassesMap.has(gName)) {
          const correctClassName = validClassesMap.get(gName);
          if (s.class_name !== correctClassName) updates.push({ nis: s.nis, class_name: correctClassName });
        }
      }
    });
    if (updates.length === 0) { showToast("Tidak ada kecocokan baru ditemukan.","info"); return; }
    setImportReview({ updates, isAutoDetect: true });
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const wb = XLSX.read(evt.target.result, { type:'binary' });
        const data = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { header: 1 });
        if (data.length === 0) { showToast("File kosong.","error"); return; }
        const header = data[0].map(h => String(h).toLowerCase().trim());
        const nisIdx = header.findIndex(h => h.includes('nis') || h.includes('id'));
        const classIdx = header.findIndex(h => h.includes('kelas'));
        if (nisIdx === -1 || classIdx === -1) { showToast("Format Excel tidak valid. Pastikan ada kolom'NIS' dan'Kelas'.","error"); return; }
        const updates = [];
        for (let i = 1; i < data.length; i++) {
          const row = data[i];
          if (row[nisIdx] && row[classIdx]) updates.push({ nis: String(row[nisIdx]).trim(), class_name: String(row[classIdx]).trim() });
        }
        if (updates.length === 0) { showToast("Tidak ada data valid.","error"); return; }
        setImportReview({ updates });
      } catch (err) { showToast("Gagal membaca file Excel.","error"); }
      finally { if (fileInputRef.current) fileInputRef.current.value =""; }
    };
    reader.readAsBinaryString(file);
  };

  const executeBulkImport = async () => {
    if (!importReview) return;
    setIsBulkSaving(true);
    try {
      const res = await fetch('/api/hikvision/students/bulk', {
        method:'PUT',
        headers: {"Authorization": `Bearer ${authToken}`,"Content-Type":"application/json" },
        body: JSON.stringify({ updates: importReview.updates })
      });
      const json = await res.json();
      if (json.ok) {
        showToast(`Berhasil mengimport ${importReview.updates.length} pemetaan kelas!`,"success");
        setShowImportModal(false); setImportReview(null); fetchStudents();
      } else showToast(json.error ||"Gagal import bulk","error");
    } catch (err) { showToast("Kesalahan jaringan.","error"); }
    setIsBulkSaving(false);
  };

  const filteredStudents = students.filter(s => {
    if (groupFilter !=="all" && s.group_name !== groupFilter) return false;
    if (search && !s.name?.toLowerCase().includes(search.toLowerCase()) && !s.nis?.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });
  const uniqueGroups = [...new Set(students.map(s => s.group_name).filter(Boolean))];
  const allSelected = filteredStudents.length > 0 && selectedNis.size === filteredStudents.length;

  const rowVirtualizer = useVirtualizer({
    count: filteredStudents.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 65,
    overscan: 10 });

  const connectedCount = students.filter(s => s.is_connected).length;
  const notConnectedCount = students.filter(s => !s.is_connected).length;

  return (
    <div className="space-y-4">
      {/* Info bar */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <div className="ui-card p-3 flex items-center gap-3">
          <div className="w-9 h-9 rounded-[var(--ui-radius-small)] bg-[var(--ui-primary)]/10 flex items-center justify-center">
            <Users size={18} className="text-[var(--ui-primary)]" />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-400">Total Siswa</p>
            <p className="text-lg font-black text-slate-800">{students.length}</p>
          </div>
        </div>
        <div className="ui-card p-3 flex items-center gap-3">
          <div className="w-9 h-9 rounded-[var(--ui-radius-small)] bg-emerald-50 flex items-center justify-center">
            <Link size={18} className="text-emerald-600" />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-400">Terhubung</p>
            <p className="text-lg font-black text-emerald-700">{connectedCount}</p>
          </div>
        </div>
        <div className="ui-card p-3 flex items-center gap-3">
          <div className="w-9 h-9 rounded-[var(--ui-radius-small)] bg-amber-50 flex items-center justify-center">
            <Link2Off size={18} className="text-amber-500" />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-400">Belum Terhubung</p>
            <p className="text-lg font-black text-amber-600">{notConnectedCount}</p>
          </div>
        </div>
      </div>

      {/* toolbar */}
      <div className="flex gap-2 flex-wrap items-center">
        <Button variant="outline"
          onClick={handleSync}
          disabled={syncing}
          className="flex items-center gap-2"
        >
          {syncing
            ? <><RefreshCw size={14} strokeWidth={2.5} className="animate-spin" /> Menyinkronkan...</>
            : <><Wifi size={14} strokeWidth={2.5} /> Sinkron dari Mesin</>
          }
        </Button>
        <Button variant="outline" onClick={handleAutoDetect} className="flex items-center gap-2">
          <Sparkles size={14} strokeWidth={2.5} /> Deteksi Otomatis
        </Button>
        <Button variant="outline" onClick={() =>setShowImportModal(true)} className="flex items-center gap-2">
          <Upload size={14} strokeWidth={2.5} /> Import Excel
        </Button>
        <Button variant="outline" onClick={fetchStudents} className="flex items-center gap-2">
          <RefreshCw size={14} strokeWidth={2.5} className={loading ?"animate-spin" :""} /> Refresh
        </Button>
        <p className="text-xs text-slate-400 font-semibold ml-auto">Klik &quot;Sinkron dari Mesin&quot; untuk menarik data terbaru dari perangkat fingerprint bertipe Siswa.</p>
      </div>

      <div className="ui-card overflow-hidden">
        {/* Bulk bar */}
        {selectedNis.size > 0 && (
          <div className="bg-[var(--ui-primary)]/10 border-b border-[var(--ui-primary)]/20 p-3 px-4 flex flex-col md:flex-row items-center justify-between gap-4">
            <span className="text-sm font-bold text-[var(--ui-primary)] flex items-center gap-2">
              <CheckSquare size={16} /> {selectedNis.size} Siswa Terpilih
            </span>
            <div className="flex items-center gap-2 w-full md:w-auto">
              <div className="w-full md:w-56">
                <CustomSelect value={bulkClass} onChange={setBulkClass} options={[{ value:"", label:"-- Pilih Kelas --" }, ...(classes || []).map(c => ({ value: c.name, label: c.name }))]} />
              </div>
              <button onClick={handleBulkApply} disabled={isBulkSaving} className="flex items-center gap-2">
                {isBulkSaving && <RefreshCw size={14} className="animate-spin" />} Terapkan
              </button>
            </div>
          </div>
        )}
        {/* filter */}
        <div className="p-4 border-b border-slate-200 bg-slate-50/50 flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input type="text" placeholder="Cari nama atau NIS..." value={search} onChange={e => setSearch(e.target.value)} className="w-full pl-10 pr-4 py-2.5 bg-white border-none rounded-[var(--ui-radius-small)] text-sm font-semibold focus:outline-[var(--ui-primary)] shadow-sm" />
          </div>
          <div className="w-full sm:w-48">
            <CustomSelect value={groupFilter} onChange={setGroupFilter} options={[{ value:"all", label:"Semua Grup Mesin" }, ...(uniqueGroups || []).map(g => ({ value: g, label: g }))]} />
          </div>
        </div>
        {/* table */}
        <div ref={parentRef} className="overflow-x-auto overflow-y-auto max-h-[600px]">
          <table className="w-full text-left border-collapse">
            <thead className="sticky top-0 z-10 bg-slate-50 shadow-sm">
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 text-xs uppercase tracking-wider">
                <th className="px-4 py-3 w-12 text-center"><input type="checkbox" checked={allSelected} onChange={e => e.target.checked ? setSelectedNis(new Set(filteredStudents.map(s => s.nis))) : setSelectedNis(new Set())} className="w-4 h-4 rounded-[var(--ui-radius-small)]" /></th>
                <th className="px-2 py-3 font-black">No</th>
                <th className="px-4 py-3 font-black w-full">Nama / NIS</th>
                <th className="px-4 py-3 font-black">Grup Alat</th>
                <th className="px-4 py-3 font-black">Pemetaan Kelas</th>
              </tr>
            </thead>
            <tbody className="text-sm font-medium text-slate-700">
              {loading ? (
                <tr><td colSpan={5} className="px-4 py-8 text-center text-slate-500 font-bold">Memuat data siswa...</td></tr>
              ) : filteredStudents.length === 0 ? (
                <tr><td colSpan={5} className="px-4 py-8 text-center text-slate-500 font-bold">Tidak ada data siswa ditemukan.</td></tr>
              ) : (
                <>
                  {rowVirtualizer.getVirtualItems().length > 0 && (
                    <tr style={{ height: `${rowVirtualizer.getVirtualItems()[0].start}px` }}></tr>
                  )}
                  {rowVirtualizer.getVirtualItems().map((virtualRow) => {
                    const s = filteredStudents[virtualRow.index];
                    const idx = virtualRow.index;
                    return (
                      <tr key={virtualRow.key} data-index={virtualRow.index} ref={rowVirtualizer.measureElement} className={`border-b border-slate-100 hover:bg-slate-50/50 ${selectedNis.has(s.nis) ?'bg-[var(--ui-primary)]/5' :''}`}>
                        <td className="px-4 py-3 text-center"><input type="checkbox" checked={selectedNis.has(s.nis)} onChange={() => { const ns = new Set(selectedNis); ns.has(s.nis) ? ns.delete(s.nis) : ns.add(s.nis); setSelectedNis(ns); }} className="w-4 h-4 rounded-[var(--ui-radius-small)]" /></td>
                        <td className="px-2 py-3 font-bold text-slate-400">{idx + 1}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className="font-bold text-slate-800 line-clamp-1">{s.name}</div>
                            {s.is_connected ? (
                              <span className="text-emerald-500 shrink-0 cursor-help" title="Data siswa terhubung dengan ID Mesin absensi."><CheckCircle2 size={14} strokeWidth={3} /></span>
                            ) : (
                              <span className="text-amber-500 shrink-0 cursor-help" title="Siswa belum terhubung dengan mesin absensi. Gunakan'Deteksi Otomatis' atau'Import Excel' untuk memetakan kelas agar terhubung."><AlertCircle size={14} strokeWidth={3} /></span>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-500 font-semibold">{s.nis}</div>
                        </td>
                        <td className="px-4 py-3"><span className="bg-slate-100 text-slate-600 px-3 py-1 rounded-[var(--ui-radius-small)] text-[10px] font-bold uppercase whitespace-nowrap">{s.group_name ||"Tanpa Grup"}</span></td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className="w-40 md:w-56">
                              <CustomSelect value={s.class_name ||""} onChange={(val) => handleClassChange(s.nis, val)} options={[{ value:"", label:"-- Pilih --" }, ...(classes || []).map(c => ({ value: c.name, label: c.name }))]} />
                            </div>
                            {saving[s.nis] && <RefreshCw size={14} className="animate-spin text-[var(--ui-primary)]" />}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {rowVirtualizer.getVirtualItems().length > 0 && (
                    <tr style={{ height: `${rowVirtualizer.getTotalSize() - rowVirtualizer.getVirtualItems()[rowVirtualizer.getVirtualItems().length - 1].end}px` }}></tr>
                  )}
                </>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Import modal */}
      {showImportModal && !importReview && (
        <Modal isOpen={true} onClose={() => setShowImportModal(false)}>
          <div className="p-6 w-full max-w-[450px]">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2"><Upload size={20} className="text-emerald-600" /> Import Excel Mapping</h3>
              <Button variant="outline" onClick={() =>setShowImportModal(false)} ><X size={20} /></Button>
            </div>
            <p className="text-xs text-slate-500 mb-4">Unggah file Excel dengan kolom <b>NIS</b> dan <b>Kelas</b>.</p>
            <div className="flex justify-center">
              <input type="file" accept=".xlsx,.xls" ref={fileInputRef} onChange={handleFileUpload} className="hidden" id="excel-upload" />
              <label htmlFor="excel-upload" className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-emerald-300 rounded-[var(--ui-radius-small)] bg-emerald-50 cursor-pointer hover:bg-emerald-100 transition-colors">
                <Upload size={28} className="text-emerald-600 mb-2" />
                <span className="text-sm font-bold text-emerald-700">Klik untuk Pilih File Excel</span>
              </label>
            </div>
          </div>
        </Modal>
      )}
      {importReview && (
        <Modal isOpen={true} onClose={() => setImportReview(null)}>
          <div className="p-6 w-full max-w-[400px]">
            <h3 className="text-lg font-bold text-slate-800 mb-4">{importReview.isAutoDetect ?"Deteksi Otomatis" :"Konfirmasi Import"}</h3>
            <div className="bg-[var(--ui-primary)]/10 text-[var(--ui-primary)] p-4 rounded-[var(--ui-radius-small)] border border-[var(--ui-primary)]/20 mb-6 text-center">
              <p className="text-3xl font-black mb-1">{importReview.updates.length}</p>
              <p className="text-sm font-bold opacity-80">Data pemetaan</p>
            </div>
            <div className="flex gap-3">
              <Button variant="outline" disabled={isBulkSaving} onClick={() =>setImportReview(null)} className="flex-1">Batal</Button>
              <button disabled={isBulkSaving} onClick={executeBulkImport} className="flex-1 flex items-center justify-center gap-2">
                {isBulkSaving && <RefreshCw size={16} className="animate-spin" />} Lanjutkan
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ── TAB GURU / KARYAWAN ────────────────────────────────────────────────────────
function TabStaff({ authToken, showToast, type ='guru' }) {
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [search, setSearch] = useState("");
  const parentRef = useRef(null);

  const typeConfig = {
    guru:     { label:'Guru', icon: UserCheck, color:'text-emerald-600', badgeColor:'bg-emerald-100 text-emerald-700 border-emerald-200' },
    karyawan: { label:'Karyawan', icon: Briefcase, color:'text-amber-600', badgeColor:'bg-amber-100 text-amber-700 border-amber-200' } };
  const cfg = typeConfig[type] || typeConfig.guru;
  const Icon = cfg.icon;

  const fetchStaff = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/hikvision/students?type=${type}`, {
        headers: {"Authorization": `Bearer ${authToken}` }
      });
      const data = await res.json();
      if (data.ok) setStaff(data.data || []);
      else showToast(data.error || `Gagal memuat data ${cfg.label.toLowerCase()}`,"error");
    } catch (err) { showToast("Terjadi kesalahan jaringan.","error"); }
    setLoading(false);
  };

  const handleSync = async () => {
    setSyncing(true);
    try {
      const res = await fetch('/api/hikvision/sync-all', {
        method:'POST',
        headers: {"Authorization": `Bearer ${authToken}`,"Content-Type":"application/json" }
      });
      const data = await res.json();
      if (data.ok) {
        showToast(data.message ||'Sinkronisasi berhasil!','success');
        await fetchStaff();
      } else {
        showToast(data.error ||'Sinkronisasi gagal','error');
      }
    } catch (err) {
      showToast('Kesalahan jaringan saat sinkronisasi.','error');
    }
    setSyncing(false);
  };

  useEffect(() => { fetchStaff(); }, [type]);

  const filtered = staff.filter(s =>
    !search || s.name?.toLowerCase().includes(search.toLowerCase()) || s.nis?.toLowerCase().includes(search.toLowerCase())
  );

  const connectedCount = staff.filter(s => s.is_connected).length;
  const notConnectedCount = staff.filter(s => !s.is_connected).length;

  const rowVirtualizer = useVirtualizer({
    count: filtered.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 65,
    overscan: 10 });

  return (
    <div className="space-y-4">
      {/* Info bar */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <div className="ui-card p-3 flex items-center gap-3">
          <div className="w-9 h-9 rounded-[var(--ui-radius-small)] bg-[var(--ui-primary)]/10 flex items-center justify-center">
            <Icon size={18} className="text-[var(--ui-primary)]" />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-400">Total {cfg.label}</p>
            <p className="text-lg font-black text-slate-800">{staff.length}</p>
          </div>
        </div>
        <div className="ui-card p-3 flex items-center gap-3">
          <div className="w-9 h-9 rounded-[var(--ui-radius-small)] bg-emerald-50 flex items-center justify-center">
            <Link size={18} className="text-emerald-600" />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-400">Terhubung</p>
            <p className="text-lg font-black text-emerald-700">{connectedCount}</p>
          </div>
        </div>
        <div className="ui-card p-3 flex items-center gap-3">
          <div className="w-9 h-9 rounded-[var(--ui-radius-small)] bg-amber-50 flex items-center justify-center">
            <Link2Off size={18} className="text-amber-500" />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-400">Belum Terhubung</p>
            <p className="text-lg font-black text-amber-600">{notConnectedCount}</p>
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex gap-2 flex-wrap items-center">
        <button
          onClick={handleSync}
          disabled={syncing}
          className="flex items-center gap-2"
        >
          {syncing
            ? <><RefreshCw size={16} className="animate-spin" /> Menyinkronkan...</>
            : <><Wifi size={16} /> Sinkron dari Mesin</>
          }
        </button>
        <button onClick={fetchStaff} className="flex items-center gap-2">
          <RefreshCw size={16} className={loading ?"animate-spin" :""} /> Refresh
        </button>
        <p className="text-xs text-slate-400 font-semibold ml-auto">Klik &quot;Sinkron dari Mesin&quot; untuk menarik data terbaru dari perangkat fingerprint bertipe {cfg.label}.</p>
      </div>

      <div className="ui-card overflow-hidden">
        <div className="p-4 border-b border-slate-200 bg-slate-50/50">
          <div className="relative">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input type="text" placeholder={`Cari nama atau ID ${cfg.label}...`} value={search} onChange={e => setSearch(e.target.value)} className="w-full pl-10 pr-4 py-2.5 bg-white border-none rounded-[var(--ui-radius-small)] text-sm font-semibold focus:outline-[var(--ui-primary)] shadow-sm" />
          </div>
        </div>
        <div ref={parentRef} className="overflow-x-auto overflow-y-auto max-h-[600px]">
          <table className="w-full text-left border-collapse">
            <thead className="sticky top-0 z-10 bg-slate-50 shadow-sm">
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 text-xs uppercase tracking-wider">
                <th className="px-4 py-3 font-black">No</th>
                <th className="px-4 py-3 font-black">Nama</th>
                <th className="px-4 py-3 font-black">ID Mesin</th>
                <th className="px-4 py-3 font-black">NIP</th>
                <th className="px-4 py-3 font-black">Mata Pelajaran</th>
                <th className="px-4 py-3 font-black">Tipe</th>
              </tr>
            </thead>
            <tbody className="text-sm font-medium text-slate-700">
              {loading ? (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-500 font-bold">Memuat data {cfg.label}...</td></tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center">
                    <div className="flex flex-col items-center gap-2 text-slate-400">
                      <Icon size={36} className={cfg.color} />
                      <p className="font-bold text-sm">Belum ada data {cfg.label}</p>
                      <p className="text-xs">Pastikan mesin bertipe <b>{cfg.label}</b> sudah ditambah, lalu klik <b>Sync Guru/Karyawan</b> di Dashboard.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                <>
                  {rowVirtualizer.getVirtualItems().length > 0 && (
                    <tr style={{ height: `${rowVirtualizer.getVirtualItems()[0].start}px` }}></tr>
                  )}
                  {rowVirtualizer.getVirtualItems().map((virtualRow) => {
                    const s = filtered[virtualRow.index];
                    const idx = virtualRow.index;
                    return (
                      <tr key={virtualRow.key} data-index={virtualRow.index} ref={rowVirtualizer.measureElement} className="border-b border-slate-100 hover:bg-slate-50/50">
                        <td className="px-4 py-3 font-bold text-slate-400">{idx + 1}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className="font-bold text-slate-800">{s.name}</div>
                            {s.is_connected ? (
                              <div className="text-emerald-500" title="Terhubung"><CheckCircle2 size={16} strokeWidth={3} /></div>
                            ) : (
                              <div className="text-amber-500" title="Belum Terhubung"><AlertCircle size={16} strokeWidth={3} /></div>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-500">{s.device_name !== s.name ? s.device_name :''}</div>
                        </td>
                        <td className="px-4 py-3 font-mono text-xs text-slate-600">{s.nis}</td>
                        <td className="px-4 py-3 text-slate-500">{s.nip ||'-'}</td>
                        <td className="px-4 py-3 text-slate-600">{s.mapel ||'-'}</td>
                        <td className="px-4 py-3">
                          {(() => {
                            const itemType = s.person_type || type;
                            const itemCfg = typeConfig[itemType] || cfg;
                            const ItemIcon = itemCfg.icon;
                            return (
                              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-[var(--ui-radius-small)] text-xs font-bold border ${itemCfg.badgeColor}`}>
                                <ItemIcon size={11} /> {itemCfg.label}
                              </span>
                            );
                          })()}
                        </td>
                      </tr>
                    );
                  })}
                  {rowVirtualizer.getVirtualItems().length > 0 && (
                    <tr style={{ height: `${rowVirtualizer.getTotalSize() - rowVirtualizer.getVirtualItems()[rowVirtualizer.getVirtualItems().length - 1].end}px` }}></tr>
                  )}
                </>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ── MAIN COMPONENT ────────────────────────────────────────────────────────────
const TABS = [
  { id:'siswa', label:'Siswa', icon: GraduationCap },
  { id:'guru', label:'Guru', icon: UserCheck },
  { id:'karyawan', label:'Karyawan', icon: Briefcase },
];

export default function HikvisionStudents({ classes = [] }) {
  const [activeTab, setActiveTab] = useState('siswa');
  const [toast, setToast] = useState({ message:"", type:"info" });
  const authToken = useAuthStore(state => state.user?.authToken);

  const showToast = (message, type ="success") => {
    setToast({ message, type });
    setTimeout(() => setToast({ message:"", type:"info" }), 4000);
  };

  return (
    <div className="space-y-4 animate-fade-in relative flex flex-col h-full">
      {/* Header */}
      <PageHeader 
        title="Data Pengguna Mesin Absensi"
        icon={Fingerprint}
        description="Kelola data pengguna mesin absensi Hikvision berdasarkan kategori."
        tabs={TABS}
        activeTab={activeTab}
        onTabChange={setActiveTab}
      />

      {/* Tab Content */}
      <div className="flex-1 min-h-0">
        {activeTab ==='siswa' && <TabSiswa classes={classes} authToken={authToken} showToast={showToast} />}
        {activeTab ==='guru' && <TabStaff authToken={authToken} showToast={showToast} type="guru" />}
        {activeTab ==='karyawan' && <TabStaff authToken={authToken} showToast={showToast} type="karyawan" />}
      </div>

      {toast.message && <Toast message={toast.message} type={toast.type} onClose={() => setToast({ message:"", type:"info" })} />}
    </div>
  );
}
