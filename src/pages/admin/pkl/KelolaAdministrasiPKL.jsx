import { Button } from '../../../components/ui.jsx';
import { useState, useEffect } from'react';
import { CheckCircle, XCircle, FileText, RefreshCw, AlertCircle, FileInput, GitMerge, MapPin } from'lucide-react';
import useAuthStore from'../../../store/monitoring/authStore.js';
import { getDatabaseSnapshot, setDatabaseSnapshot } from'../../../utils/dataSource.js';
import { Trash2, Camera } from'lucide-react';
import { PageHeader, StatCard } from '../../../components/monitoring/ui/index.js';
;
import { Modal } from'../../../components/ui.jsx';
import { UISelect } from'../../../components/ui.jsx';


const KelolaAdministrasiPKL = ({ currentUser: propsUser, readOnly, appSettings, setAppSettings, onSave }) => {
  const { user: storeUser } = useAuthStore();
  const currentUser = propsUser || storeUser;
  const [activeTab, setActiveTab] = useState("surat");
  const [suratList, setSuratList] = useState([]);
  const [mutasiList, setMutasiList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [toast, setToast] = useState(null);

  const showToast = (message, type ='success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  // Auto numbering settings
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [accModal, setAccModal] = useState({ isOpen: false, suratId: null, formattedNumber:"" });

  const formatTemplate = appSettings?.suratFormat ||"{INDEX}/PKL-SMK/{MONTH}/{YEAR}";
  const nextIndex = Number(appSettings?.suratNextIndex || 1);
  const padding = Number(appSettings?.suratPadding || 3);
  const monthStyle = appSettings?.suratMonthStyle ||"romawi";

  const generateFormattedNumber = (format, index, padVal, mStyle) => {
    const now = new Date();
    const paddedIndex = String(index).padStart(Number(padVal || 3),'0');
    const romanMonths = ["I","II","III","IV","V","VI","VII","VIII","IX","X","XI","XII"];
    const numericMonth = String(now.getMonth() + 1).padStart(2,'0');
    const monthVal = mStyle ==='romawi' ? romanMonths[now.getMonth()] : numericMonth;
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
  const isHubinOrAdmin = ["admin","hubin","waka"].includes(role);
  const canViewSurat = isHubinOrAdmin || role ==="kepsek";

  const fetchSurat = async () => {
    try {
      const res = await fetch("/api/pkl/surat-pengantar", {
        headers: { Authorization: `Bearer ${currentUser?.authToken}` }
      });
      const data = await res.json();
      if (data.ok) setSuratList(data.data);
    } catch (e) { console.error(e); }
  };

  const fetchMutasi = async () => {
    try {
      const res = await fetch("/api/pkl/mutasi", {
        headers: { Authorization: `Bearer ${currentUser?.authToken}` }
      });
      const data = await res.json();
      if (data.ok) setMutasiList(data.data);
    } catch (e) { console.error(e); }
  };

  useEffect(() => {
    if (currentUser?.authToken) {
      if (activeTab ==="surat" && canViewSurat) fetchSurat();
      if (activeTab ==="mutasi") fetchMutasi();
    }
  }, [currentUser, activeTab, canViewSurat]);

  const accSurat = (id) => {
    const num = generateFormattedNumber(formatTemplate, nextIndex, padding, monthStyle);
    setAccModal({ isOpen: true, suratId: id, formattedNumber: num });
  };

  const handleAccConfirm = async (e) => {
    if (e) e.preventDefault();
    if (!accModal.formattedNumber) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/pkl/surat-pengantar/${accModal.suratId}/acc`, {
        method:"PUT",
        headers: {"Content-Type":"application/json", Authorization: `Bearer ${currentUser?.authToken}` },
        body: JSON.stringify({ nomor_surat: accModal.formattedNumber })
      });
      if (res.ok) {
        await updateNumberingSetting('suratNextIndex', nextIndex + 1);
        setAccModal({ isOpen: false, suratId: null, formattedNumber:"" });
        showToast('Surat berhasil di-ACC!');
        fetchSurat();
      } else {
        showToast('Gagal mem-ACC surat.','error');
      }
    } catch (err) { showToast('Terjadi kesalahan.','error'); }
    setLoading(false);
  };

  const validasiStempel = async (id) => {
    if (!(await window.confirmAsync("Apakah surat ini sudah dicap/stempel basah? Status akan berubah menjadi Selesai (Sah)."))) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/pkl/surat-pengantar/${id}/stempel`, {
        method:"PUT",
        headers: { Authorization: `Bearer ${currentUser?.authToken}` }
      });
      if (res.ok) { showToast('Status surat diperbarui ke Selesai (Sah).'); fetchSurat(); }
      else showToast('Gagal memperbarui status.','error');
    } catch (err) { showToast('Terjadi kesalahan.','error'); }
    setLoading(false);
  };

  const accMutasi = async (id, status) => {
    if (!(await window.confirmAsync(`Apakah Anda yakin ingin melakukan ${status ==='acc' ?'ACC' :'PENOLAKAN'} mutasi ini?`))) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/pkl/mutasi/${id}/acc`, {
        method:"PUT",
        headers: {"Content-Type":"application/json", Authorization: `Bearer ${currentUser?.authToken}` },
        body: JSON.stringify({ status })
      });
      if (res.ok) { showToast(`Mutasi berhasil ${status ==='acc' ?'disetujui' :'ditolak'}.`); fetchMutasi(); }
      else showToast('Gagal memproses mutasi.','error');
    } catch (err) { showToast('Terjadi kesalahan.','error'); }
    setLoading(false);
  };

  const deleteSurat = async (id) => {
    if (!(await window.confirmAsync("Apakah Anda yakin ingin menghapus surat ini secara permanen?"))) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/pkl/surat-pengantar/${id}`, {
        method:"DELETE",
        headers: { Authorization: `Bearer ${currentUser?.authToken}` }
      });
      if (res.ok) { showToast('Surat berhasil dihapus.'); fetchSurat(); }
      else showToast('Gagal menghapus surat.','error');
    } catch (err) { showToast('Terjadi kesalahan.','error'); }
    setLoading(false);
  };

  const deleteMutasi = async (id) => {
    if (!(await window.confirmAsync("Apakah Anda yakin ingin menghapus mutasi ini secara permanen?"))) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/pkl/mutasi/${id}`, {
        method:"DELETE",
        headers: { Authorization: `Bearer ${currentUser?.authToken}` }
      });
      if (res.ok) { showToast('Data mutasi berhasil dihapus.'); fetchMutasi(); }
      else showToast('Gagal menghapus mutasi.','error');
    } catch (err) { showToast('Terjadi kesalahan.','error'); }
    setLoading(false);
  };

  // Computed stats
  const suratPending = suratList.filter(s => s.status ==='pending').length;
  const suratAcc     = suratList.filter(s => s.status ==='acc_hubin').length;
  const mutasiPending = mutasiList.filter(m => m.final_status ==='pending').length;
  const mutasiAcc    = mutasiList.filter(m => m.final_status ==='acc').length;

  const suratStats = [
    { label:'Total Surat',   value: suratList.length,  icon: FileText,   iconBg:'bg-blue-100',    iconColor:'text-blue-600' },
    { label:'Menunggu ACC',  value: suratPending,       icon: AlertCircle,iconBg:'bg-amber-100',   iconColor:'text-amber-600' },
    { label:'Sudah di-ACC',  value: suratAcc,           icon: CheckCircle,iconBg:'bg-emerald-100', iconColor:'text-emerald-600' },
  ];

  const mutasiStats = [
    { label:'Total Mutasi',  value: mutasiList.length,  icon: GitMerge,   iconBg:'bg-blue-100',    iconColor:'text-blue-600' },
    { label:'Menunggu',      value: mutasiPending,       icon: AlertCircle,iconBg:'bg-amber-100',   iconColor:'text-amber-600' },
    { label:'Disetujui',     value: mutasiAcc,           icon: CheckCircle,iconBg:'bg-emerald-100', iconColor:'text-emerald-600' },
    { label:'Ditolak',       value: mutasiList.filter(m => m.final_status ==='rejected').length, icon: XCircle, iconBg:'bg-red-100', iconColor:'text-red-600' },
  ];

  const tabs = [
    { 
      id:"surat", 
      label: suratPending > 0 ? `Surat Pengantar (${suratPending})` :"Surat Pengantar",
      icon: FileInput 
    },
    { 
      id:"mutasi", 
      label: mutasiPending > 0 ? `Permohonan Mutasi (${mutasiPending})` :"Permohonan Mutasi",
      icon: RefreshCw 
    },
    { 
      id:"kunjungan", 
      label:"Kunjungan Guru", 
      icon: MapPin 
    }
  ].filter(t => t.id !=="surat" || canViewSurat);

  return (
    <div className="space-y-4">
      <PageHeader 
        icon={FileText}
        title="Administrasi PKL"
        description="Kelola permohonan surat pengantar dan mutasi PKL dari siswa"
        tabs={tabs}
        activeTab={activeTab}
        onTabChange={setActiveTab}
      />

      {/* ── SURAT TAB ── */}
      {activeTab ==="surat" && canViewSurat && (
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-3">
            {suratStats.map(s => <StatCard key={s.label} {...s} />)}
          </div>

          {/* Settings Card */}
          <div className="ui-card p-5 space-y-4">
            <div className="flex items-center justify-between cursor-pointer" onClick={() => setIsSettingsOpen(!isSettingsOpen)}>
              <div className="flex items-center gap-2">
                <FileText className="text-[var(--ui-primary)]" size={18} />
                <h3 className="font-bold text-slate-800 text-sm">Konfigurasi Format Nomor Surat Otomatis</h3>
              </div>
              <span className="text-xs text-[var(--ui-primary)] font-bold hover:underline">
                {isSettingsOpen ?"Sembunyikan" :"Tampilkan Pengaturan"}
              </span>
            </div>
            
            {isSettingsOpen && (
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pt-2 border-t border-slate-100">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Format Template</label>
                  <input 
                    type="text" 
                    value={formatTemplate} 
                    onChange={e => updateNumberingSetting('suratFormat', e.target.value)}
                    placeholder="{INDEX}/PKL-SMK/{MONTH}/{YEAR}" 
                    className="w-full px-3 py-2 bg-slate-50 border-none rounded-[var(--ui-radius-small)] text-xs font-semibold focus:outline-none focus:border-[var(--ui-primary)]"
                  />
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    {['{INDEX}','{MONTH}','{YEAR}'].map(tag => (
                      <Button variant="outline" key={tag} type="button" onClick={() =>updateNumberingSetting('suratFormat', formatTemplate + tag)} >
                        {tag}</Button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Nomor Urut Berikutnya</label>
                  <input 
                    type="text" 
                    inputMode="numeric"
                    value={nextIndex} 
                    onChange={e => updateNumberingSetting('suratNextIndex', parseInt(e.target.value.replace(/[^0-9]/g,'')) || 1)}
                    className="w-full px-3 py-2 bg-slate-50 border-none rounded-[var(--ui-radius-small)] text-xs font-semibold focus:outline-none focus:border-[var(--ui-primary)]"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Digit Padding</label>
                  <UISelect 
                    value={padding} 
                    onChange={e => updateNumberingSetting('suratPadding', parseInt(e.target.value) || 3)}
                    className="w-full px-3 py-2 bg-slate-50 border-none rounded-[var(--ui-radius-small)] text-xs font-semibold focus:outline-none focus:border-[var(--ui-primary)]"
                  >
                    <option value="1">1 (e.g. 1)</option>
                    <option value="2">2 (e.g. 01)</option>
                    <option value="3">3 (e.g. 001)</option>
                    <option value="4">4 (e.g. 0001)</option>
                  </UISelect>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Format Bulan</label>
                  <UISelect 
                    value={monthStyle} 
                    onChange={e => updateNumberingSetting('suratMonthStyle', e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border-none rounded-[var(--ui-radius-small)] text-xs font-semibold focus:outline-none focus:border-[var(--ui-primary)]"
                  >
                    <option value="romawi">Romawi (e.g. VII)</option>
                    <option value="angka">Angka (e.g. 07)</option>
                  </UISelect>
                </div>
                
                <div className="md:col-span-4 bg-slate-50 border border-slate-150 p-3 rounded-[var(--ui-radius-small)] flex items-center justify-between text-xs">
                  <div>
                    <span className="font-bold text-slate-500">Pratinjau Nomor Selanjutnya: </span>
                    <span className="font-black text-slate-800 font-mono bg-white px-2 py-1 border-none rounded-[var(--ui-radius-small)] ml-2">
                      {generateFormattedNumber(formatTemplate, nextIndex, padding, monthStyle)}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {suratList.length === 0 ? (
            <div className="ui-card p-10 border-dashed text-center">
              <FileText size={28} className="mx-auto text-slate-300 mb-2" />
              <p className="text-slate-500 font-medium text-sm">Tidak ada permohonan surat.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {suratList.map(surat => (
                <div key={surat.id} className="ui-card p-4 flex flex-col md:flex-row gap-4 items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-bold text-slate-800 truncate">{surat.nama_perusahaan || surat.pt_name_temp}</h3>
                      {surat.status ==="stempel_selesai"
                        ? <span className="shrink-0 text-[10px] bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-[var(--ui-radius-small)] font-bold flex items-center gap-1"><CheckCircle size={10}/> Distempel (Selesai)</span>
                        : surat.status ==="acc_hubin"
                          ? <span className="shrink-0 text-[10px] bg-blue-100 text-blue-700 px-2 py-0.5 rounded-[var(--ui-radius-small)] font-bold flex items-center gap-1"><AlertCircle size={10}/> Menunggu Stempel</span>
                          : <span className="shrink-0 text-[10px] bg-amber-100 text-amber-700 px-2 py-0.5 rounded-[var(--ui-radius-small)] font-bold">Pending</span>}
                    </div>
                    <p className="text-xs text-slate-500 mb-3">
                      Diajukan: {new Date(surat.created_at).toLocaleString("id-ID", { day:"2-digit", month:"short", year:"numeric", hour:"2-digit", minute:"2-digit" })}
                    </p>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {surat.students?.map((s, i) => (
                        <div key={i} className="bg-slate-50 border-none p-2 rounded-[var(--ui-radius-small)] text-xs">
                          <span className="font-bold text-slate-700 block truncate">{s.nama}</span>
                          <span className="text-slate-400">{s.nis} – {s.kelas}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="flex flex-col gap-2 shrink-0 md:min-w-[140px]">
                    {surat.status ==="pending" && !readOnly && (
                      <Button variant="outline"
                        onClick={() =>accSurat(surat.id)}
                        className="w-full shrink-0"
                      >
                        ACC & Beri Nomor</Button>
                    )}
                    {surat.status ==="acc_hubin" && !readOnly && (
                      <Button variant="outline"
                        onClick={() =>validasiStempel(surat.id)}
                        className="w-full shrink-0"
                      >
                        Validasi Stempel</Button>
                    )}
                    {!readOnly && (
                      <Button variant="outline" onClick={() =>deleteSurat(surat.id)} className="w-full flex items-center justify-center gap-1 mt-auto">
                        <Trash2 size={14} /> Hapus</Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── MUTASI TAB ── */}
      {activeTab ==="mutasi" && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {mutasiStats.map(s => <StatCard key={s.label} {...s} />)}
          </div>

          {isHubinOrAdmin && (
            <div className="bg-[var(--ui-primary)]/10 border border-[var(--ui-primary)]/20 text-[var(--ui-primary)] p-3 rounded-[var(--ui-radius-small)] flex gap-3 text-xs font-medium">
              <AlertCircle size={16} className="shrink-0 mt-0.5" />
              <span>Sebagai HUBIN, Anda memiliki hak <strong>ACC Mutlak (Override)</strong>. Jika Anda menyetujui mutasi, status akan langsung menjadi Disetujui Final.</span>
            </div>
          )}

          {mutasiList.length === 0 ? (
            <div className="ui-card p-10 border-dashed text-center">
              <RefreshCw size={28} className="mx-auto text-slate-300 mb-2" />
              <p className="text-slate-500 font-medium text-sm">Tidak ada permohonan mutasi.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {mutasiList.map(mutasi => (
                <div key={mutasi.id} className="ui-card overflow-hidden">
                  <div className="flex flex-col md:flex-row gap-0">
                    {/* Kiri: detail mutasi */}
                    <div className="flex-1 p-4">
                      <div className="mb-3">
                        <p className="font-bold text-slate-800">{mutasi.student_name}</p>
                        <p className="text-xs text-slate-500">{mutasi.nis} • Kelas {mutasi.class_name}</p>
                      </div>

                      <div className="flex items-center gap-3 bg-slate-50 p-3 rounded-[var(--ui-radius-small)] border-none mb-3">
                        <div className="flex-1 min-w-0">
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Lokasi Lama</p>
                          <p className="font-semibold text-slate-700 text-sm leading-tight truncate">{mutasi.old_pt_name ||"–"}</p>
                        </div>
                        <RefreshCw size={16} className="text-slate-300 shrink-0" />
                        <div className="flex-1 min-w-0 text-right">
                          <p className="text-[10px] font-bold text-[var(--ui-primary)] uppercase tracking-wider mb-0.5">Lokasi Baru</p>
                          <p className="font-semibold text-[var(--ui-primary)] text-sm leading-tight truncate">{mutasi.new_pt_name || mutasi.new_pt_name_temp}</p>
                        </div>
                      </div>

                      <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Alasan Pindah</p>
                        <p className="text-xs text-slate-700 italic bg-amber-50 p-2.5 rounded-[var(--ui-radius-small)] border border-amber-100">"{mutasi.alasan}"</p>
                      </div>
                    </div>

                    {/* Kanan: status approval */}
                    <div className="w-full md:w-56 shrink-0 bg-slate-50 border-t md:border-t-0 md:border-l border-slate-200 p-4 flex flex-col justify-between">
                      <div>
                        <p className="text-[10px] font-black text-slate-600 uppercase tracking-wider text-center border-b border-slate-200 pb-2 mb-3">Status Persetujuan</p>

                        {mutasi.final_status ==='acc' ? (
                          <div className="bg-emerald-100 text-emerald-800 p-2.5 rounded-[var(--ui-radius-small)] text-center font-bold text-sm mb-3">
                            <CheckCircle size={20} className="mx-auto mb-1 opacity-80" />
                            Disetujui Final
                          </div>
                        ) : mutasi.final_status ==='rejected' ? (
                          <div className="bg-red-100 text-red-800 p-2.5 rounded-[var(--ui-radius-small)] text-center font-bold text-sm mb-3">
                            <XCircle size={20} className="mx-auto mb-1 opacity-80" />
                            Ditolak Final
                          </div>
                        ) : (
                          <div className="space-y-1.5 mb-3">
                            {[
                              { label:'Wali Kelas', val: mutasi.acc_walas },
                              { label:'Pembimbing', val: mutasi.acc_pembimbing },
                              { label:'Kaprog',     val: mutasi.acc_kaprog },
                              { label:'HUBIN',      val: mutasi.acc_hubin, highlight: true },
                            ].map(({ label, val, highlight }) => (
                              <div key={label} className="flex justify-between items-center text-xs font-semibold">
                                <span className={highlight ?'text-[var(--ui-primary)]' :'text-slate-600'}>{label}</span>
                                {val ==='acc'      ? <CheckCircle size={14} className="text-emerald-500" />
                                : val ==='rejected' ? <XCircle size={14} className="text-red-500" />
                                :                     <span className="text-slate-300 text-[10px]">Pending</span>}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      <div className="flex flex-col gap-2 shrink-0 md:mt-0 md:min-w-[120px]">
                        {mutasi.final_status ==='pending' && !readOnly && (
                          <>
                            <Button variant="outline"
                              onClick={() =>accMutasi(mutasi.id,'acc')}
                              className="w-full"
                            >
                              ACC</Button>
                            <Button variant="outline"
                              onClick={() =>accMutasi(mutasi.id,'rejected')}
                              className="w-full"
                            >
                              Tolak</Button>
                          </>
                        )}
                        {!readOnly && (
                          <Button variant="outline" onClick={() =>deleteMutasi(mutasi.id)} className="w-full flex items-center justify-center gap-1 mt-auto">
                            <Trash2 size={14} /> Hapus</Button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── KUNJUNGAN GURU TAB ── */}
      {activeTab ==="kunjungan" && (
        <div className="ui-card p-6 space-y-4">
          <h2 className="font-bold text-slate-800 text-lg flex items-center gap-2">
            <MapPin className="text-[var(--ui-primary)]" /> Riwayat Kunjungan Guru PKL
          </h2>
          <p className="text-sm text-slate-500">Data hasil tracking GPS dan foto kunjungan guru ke perusahaan tempat siswa PKL.</p>
          
          <div className="overflow-x-auto mt-4">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-slate-500 uppercase bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3 font-bold">Waktu</th>
                  <th className="px-4 py-3 font-bold">Nama Guru</th>
                  <th className="px-4 py-3 font-bold">Lokasi GPS</th>
                  <th className="px-4 py-3 font-bold">Radius (m)</th>
                  <th className="px-4 py-3 font-bold">Catatan</th>
                  <th className="px-4 py-3 font-bold">Foto</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-slate-100 hover:bg-slate-50/50">
                  <td className="px-4 py-3">{new Date().toLocaleString('id-ID')}</td>
                  <td className="px-4 py-3 font-bold text-slate-700">Ahmad Guru</td>
                  <td className="px-4 py-3 text-xs font-mono text-slate-500">-6.234839, 106.989254</td>
                  <td className="px-4 py-3 font-bold text-emerald-600">12m <span className="text-[10px] bg-emerald-100 px-1 rounded-[var(--ui-radius-small)]">Valid</span></td>
                  <td className="px-4 py-3 text-slate-600">Siswa berkinerja baik.</td>
                  <td className="px-4 py-3">
                    <button className="flex items-center gap-1">
                      <Camera size={12}/> Lihat Foto
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ACC & Beri Nomor Modal */}
      <Modal 
        isOpen={accModal.isOpen} 
        onClose={() => setAccModal({ isOpen: false, suratId: null, formattedNumber:"" })} 
        title="ACC & Beri Nomor Surat Pengantar"
        maxWidth="max-w-md"
      >
        <form onSubmit={handleAccConfirm} className="space-y-4">
          <div className="bg-[var(--ui-primary)]/5 p-4 rounded-[var(--ui-radius-small)] border border-[var(--ui-primary)]/10 text-center">
            <p className="text-[11px] font-black text-slate-500 uppercase tracking-widest mb-1">Nomor Surat Pengantar Otomatis</p>
            <p className="text-lg font-black text-[var(--ui-primary)] font-mono">{accModal.formattedNumber}</p>
          </div>
          
          <div className="space-y-1.5">
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest">Sesuaikan Nomor Surat (Opsional)</label>
            <input 
              type="text" 
              required
              value={accModal.formattedNumber} 
              onChange={e => setAccModal(prev => ({ ...prev, formattedNumber: e.target.value }))}
              className="w-full px-3 py-2.5 bg-slate-50 border-none rounded-[var(--ui-radius-small)] text-xs font-black text-slate-800 focus:outline-none focus:border-[var(--ui-primary)] focus:bg-white"
            />
            <p className="text-[10px] text-slate-400">Anda dapat mengubah nomor di atas secara manual jika terdapat pengecualian.</p>
          </div>
          
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" 
              type="button" 
              onClick={() =>setAccModal({ isOpen: false, suratId: null, formattedNumber:"" })}
              disabled={loading}
            >
              Batalkan</Button>
            <Button variant="outline" 
              type="submit"
              disabled={loading || !accModal.formattedNumber}
             >{loading ?"Memproses..." :"ACC & Simpan"}</Button>
          </div>
        </form>
      </Modal>

      {toast && (
        <div className={`fixed bottom-6 right-6 px-4 py-3 rounded-[var(--ui-radius-small)] shadow-lg font-medium text-sm flex items-center gap-2 animate-in slide-in-from-bottom-5 text-white z-[100] ${toast.type ==='error' ?'bg-red-600' :'bg-emerald-600'}`}>
          {toast.type ==='error' ? <AlertCircle size={18} /> : <CheckCircle size={18} />} {toast.message}
        </div>
      )}
    </div>
  );
};

export default KelolaAdministrasiPKL;
