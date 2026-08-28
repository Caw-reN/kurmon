import { Button, Modal, TablePagination } from '../../../components/ui.jsx';
import { useState, useEffect, useMemo } from'react';
import { MessageSquare, CheckCircle2, AlertCircle, Clock, Settings, LayoutDashboard, KeyRound, DatabaseBackup } from'lucide-react';
import useAuthStore from'../../../store/monitoring/authStore.js';
import useFiturStore from'../../../store/monitoring/fiturStore';
import { INITIAL_CLASSES } from'../../../data.js';
import { Send, Calendar, History, UserCog, Phone, Users, FileText, RefreshCw } from'lucide-react';
import { PageHeader } from '../../../components/monitoring/ui/index.js';
;
import { UISelect } from'../../../components/ui.jsx';


const TRIGGER_TEMPLATES = [
  { key:'terlambat', label:'⏰ Notifikasi Keterlambatan', template:'Yth. Orang Tua/Wali {NAMA_SISWA}, kami ingin memberitahukan bahwa putra/putri Anda ({NAMA_SISWA}) hadir terlambat ke sekolah pada {TANGGAL} pukul {WAKTU}. Mohon perhatian dan dukungannya. Terima kasih. - {NAMA_SEKOLAH}' },
  { key:'pelanggaran', label:'⚠️ Notifikasi Pelanggaran', template:'Yth. Orang Tua/Wali {NAMA_SISWA}, putra/putri Anda ({NAMA_SISWA}) telah mendapatkan {POIN} poin pelanggaran karena {KETERANGAN} pada {TANGGAL}. Total poin saat ini: {TOTAL_POIN}. Mohon dukungan dan bimbingannya. - {NAMA_SEKOLAH}' },
  { key:'sp1', label:'📋 Surat Panggilan 1 (SP1)', template:'Yth. Orang Tua/Wali {NAMA_SISWA}, dengan ini kami sampaikan bahwa putra/putri Anda ({NAMA_SISWA}) telah mendapatkan peringatan pertama (SP1) dari sekolah karena akumulasi pelanggaran. Kami memohon kehadiran Anda di sekolah pada hari _{HARI}_ untuk melakukan konsultasi. - {NAMA_SEKOLAH}' },
  { key:'absen', label:'📅 Rekap Absensi', template:'Yth. Orang Tua/Wali {NAMA_SISWA}, rekap kehadiran putra/putri Anda bulan {BULAN}: Hadir {HADIR} hari, Sakit {SAKIT} hari, Izin {IZIN} hari, Alpa {ALPA} hari. - {NAMA_SEKOLAH}' },
  { key:'pengumuman', label:'📢 Pengumuman Sekolah', template:'Pengumuman dari {NAMA_SEKOLAH}: {ISI_PENGUMUMAN}' },
];

export default function IntegrasiWhatsApp({ activeTab: activeSystemTab, setActiveTab: setSystemTab }) {
  const [logs, setLogs] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [toast, setToast] = useState(null);
  const [activeTab, setActiveTab] = useState('pengaturan');
  const [filterStatus, setFilterStatus] = useState('all');
  const [students, setStudents] = useState([]);
  
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);

  const { isFiturAktif, toggleFitur } = useFiturStore();
  
  // Broadcast form
  const [broadcastForm, setBroadcastForm] = useState({ phone:'', recipient_name:'', message:'' });
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [broadcastMode, setBroadcastMode] = useState('single'); // single | bulk
  const [selectedStudents, setSelectedStudents] = useState([]);
  const [bulkMessage, setBulkMessage] = useState('');

  // Walikelas Data
  const [walikelasData, setWalikelasData] = useState({});
  const [isSavingWalikelas, setIsSavingWalikelas] = useState(false);
  const [classesList, setClassesList] = useState([]);
  const [teachersList, setTeachersList] = useState([]);

  // Rekap
  const [isSendingRekap, setIsSendingRekap] = useState(false);

  const authToken = useAuthStore(state => state.user?.authToken);

  const showToast = (message, type ='success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  const fetchLogs = async () => {
    if (!authToken) return;
    setIsLoading(true);
    try {
      const [logsRes, studRes] = await Promise.all([
        fetch('/api/whatsapp/logs', { headers: { Authorization: `Bearer ${authToken}` } }),
        fetch('/api/data/load', { headers: { Authorization: `Bearer ${authToken}` } }),
      ]);
      const logsData = await logsRes.json();
      if (logsData.ok) setLogs(logsData.data || []);
      const appDataRes = studRes.ok ? await studRes.json() : { payload: {} };
      if (appDataRes.payload) {
        if (appDataRes.payload.students) {
          const mappedStudents = appDataRes.payload.students.map(s => ({
            ...s,
            name: s.namaSiswa || s.name,
            wa_ortu: s.phone || s.wa_ortu
          }));
          setStudents(mappedStudents);
        }
        if (appDataRes.payload.classes) {
          setClassesList(appDataRes.payload.classes);
        }
        if (appDataRes.payload.teachers) {
          setTeachersList(appDataRes.payload.teachers);
        }
      }
    } catch (e) { console.error(e); }
    setIsLoading(false);
  };

  useEffect(() => { fetchLogs(); }, [authToken]);

  const applyTemplate = (key) => {
    const tmpl = TRIGGER_TEMPLATES.find(t => t.key === key);
    if (tmpl) {
      setSelectedTemplate(key);
      setBroadcastForm(prev => ({ ...prev, message: tmpl.template }));
      setBulkMessage(tmpl.template);
    }
  };

  const handleSend = async () => {
    if (!broadcastForm.phone || !broadcastForm.message) return showToast('Nomor HP dan pesan wajib diisi!','error');
    setIsSending(true);
    try {
      const res = await fetch('/api/whatsapp/send', {
        method:'POST',
        headers: { Authorization: `Bearer ${authToken}`,'Content-Type':'application/json' },
        body: JSON.stringify({ ...broadcastForm, trigger_type:'manual' }),
      });
      const data = await res.json();
      if (data.ok) { showToast('Pesan berhasil dikirim!'); setBroadcastForm({ phone:'', recipient_name:'', message:'' }); fetchLogs(); }
      else showToast(data.error ||'Gagal mengirim. Cek konfigurasi API Key WhatsApp.','error');
    } catch (e) { showToast('Gagal.','error'); }
    setIsSending(false);
  };

  const handleCancelLog = async (id) => {
    try {
      const res = await fetch('/api/whatsapp/cancel-log', {
        method: 'POST',
        headers: { Authorization: `Bearer ${authToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ id })
      });
      const data = await res.json();
      if (data.ok) {
        showToast('Antrean berhasil dibatalkan!');
        fetchLogs();
      } else {
        showToast(data.error || 'Gagal membatalkan log', 'error');
      }
    } catch (e) {
      showToast('Kesalahan jaringan saat membatalkan log', 'error');
    }
  };

  const handleBulkSend = async () => {
    if (selectedStudents.length === 0 || !bulkMessage) return showToast('Pilih penerima dan tulis pesan!','error');
    setIsSending(true);
    let sent = 0, failed = 0;
    for (const nis of selectedStudents) {
      const student = students.find(s => s.nis === nis);
      if (!student?.wa_ortu) { failed++; continue; }
      try {
        const msg = bulkMessage.replace(/{NAMA_SISWA}/g, student.name ||'Siswa').replace(/{TANGGAL}/g, new Date().toLocaleDateString('id-ID'));
        const res = await fetch('/api/whatsapp/send', {
          method:'POST',
          headers: { Authorization: `Bearer ${authToken}`,'Content-Type':'application/json' },
          body: JSON.stringify({ phone: student.wa_ortu, recipient_name: student.name, message: msg, trigger_type:'bulk' }),
        });
        const data = await res.json();
        if (data.ok) sent++; else failed++;
      } catch { failed++; }
    }
    showToast(`Broadcast selesai: ${sent} terkirim, ${failed} gagal.`, sent > 0 ?'success' :'error');
    setIsSending(false);
    fetchLogs();
  };

  const handleSendRekap = async (type) => {
    setIsSendingRekap(true);
    try {
      const res = await fetch("/api/whatsapp/send-rekap", {
        method:"POST",
        headers: {"Authorization": `Bearer ${authToken}`,"Content-Type":"application/json"
        },
        body: JSON.stringify({
          target:"siswa",
          type: type,
          date: new Date().toISOString().split("T")[0]
        })
      });
      const data = await res.json();
      if (res.ok && data.ok) {
        showToast(type ==="daily" ?"Rekap Harian berhasil dikirim ke seluruh Walikelas!" :"Rekap Bulanan & Poin Pelanggaran berhasil dikirim ke Orang Tua!");
        fetchLogs();
      } else {
        showToast(data.error ||"Gagal mengirim rekap ke WhatsApp.","error");
      }
    } catch (err) {
      console.error(err);
      showToast("Kesalahan jaringan saat mengirim rekap.","error");
    }
    setIsSendingRekap(false);
  };

  const filteredLogs = useMemo(() => filterStatus ==='all' ? logs : logs.filter(l => l.status === filterStatus), [logs, filterStatus]);
  const paginatedLogs = useMemo(() => filteredLogs.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage), [filteredLogs, currentPage, itemsPerPage]);
  const totalPages = Math.ceil(filteredLogs.length / itemsPerPage);

  const stats = useMemo(() => ({
    total: logs.length,
    sent: logs.filter(l => l.status ==='sent').length,
    pending: logs.filter(l => l.status ==='pending').length,
    failed: logs.filter(l => l.status ==='failed').length,
  }), [logs]);

  return (
    <div className="space-y-6 relative animate-in fade-in duration-300 z-10">
      <PageHeader 
        title="Integrasi WhatsApp Notification"
        description="Kirim notifikasi otomatis/manual ke orang tua siswa via WhatsApp menggunakan API Fonnte."
        icon={MessageSquare}
        tabs={[
          { id:"fitur", label:"Fitur", icon: Settings },
          { id:"tampilan", label:"Tampilan Web", icon: LayoutDashboard },
          { id:"whatsapp", label:"WhatsApp", icon: MessageSquare },
          { id:"api_keys", label:"API Key", icon: KeyRound },
          { id:"gdrive_backup", label:"Backup", icon: DatabaseBackup }
        ]}
        activeTab={activeSystemTab}
        onTabChange={setSystemTab}
      />

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label:'Total Pesan', value: stats.total, icon: MessageSquare, color:'blue' },
          { label:'Sukses', value: stats.sent, icon: CheckCircle2, color:'emerald' },
          { label:'Pending', value: stats.pending, icon: Clock, color:'amber' },
          { label:'Gagal', value: stats.failed, icon: AlertCircle, color:'red' },
        ].map(stat => (
          <div key={stat.label} className="bg-white p-5 rounded-[var(--ui-radius-small)] border-none shadow-sm flex items-center gap-4">
            <div className={`w-12 h-12 rounded-[var(--ui-radius-small)] flex items-center justify-center bg-${stat.color}-50`}>
              <stat.icon size={22} className={`text-${stat.color}-500`} />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">{stat.label}</p>
              <p className="text-3xl font-black text-slate-800">{stat.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar shrink-0 w-full mb-6 border-b border-slate-100 pb-2">
        {[
          { key:'pengaturan', label:'Otomatisasi', icon: <Settings size={16} /> },
          { key:'kirim', label:'Kirim Pesan', icon: <Send size={16} /> },
          { key:'rekap', label:'Rekap Otomatis', icon: <Calendar size={16} /> },
          { key:'log', label:'Riwayat & Log', icon: <History size={16} /> },
          { key:'walikelas', label:'Data Walikelas', icon: <UserCog size={16} /> }
        ].map(tab => (
          <Button variant={activeTab === tab.key ? 'primary' : 'ghost'} key={tab.key} onClick={() =>setActiveTab(tab.key)}
            className={`flex items-center gap-2 shrink-0 ${activeTab !== tab.key ? 'text-slate-500' : ''}`}>
            {tab.icon} {tab.label}</Button>
        ))}
      </div>

      {/* Pengaturan Tab */}
      {activeTab === 'pengaturan' && (
        <div className="bg-white rounded-[var(--ui-radius-card)] border-none shadow-sm p-6 space-y-6">
          <div>
            <h2 className="font-bold text-slate-700 flex items-center gap-2 mb-1"><Settings size={16} /> Pengaturan Otomatisasi WhatsApp</h2>
            <p className="text-xs text-slate-500 mb-6">Atur kapan sistem harus mengirim pesan WhatsApp secara otomatis ke pihak terkait.</p>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 border border-slate-100 rounded-[var(--ui-radius-small)] hover:bg-slate-50 transition-colors">
              <div>
                <h3 className="font-bold text-slate-800 text-sm">Notifikasi Pelanggaran (Orang Tua)</h3>
                <p className="text-xs text-slate-500 mt-1">Kirim rincian pelanggaran dan poin kedisiplinan secara otomatis saat guru mencatat pelanggaran di Panel Piket.</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer flex-shrink-0">
                <input type="checkbox" className="sr-only peer" checked={isFiturAktif('wa_auto_pelanggaran') ?? true} onChange={() => toggleFitur('wa_auto_pelanggaran')} />
                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[var(--ui-primary)]"></div>
              </label>
            </div>

            <div className="flex items-center justify-between p-4 border border-slate-100 rounded-[var(--ui-radius-small)] hover:bg-slate-50 transition-colors">
              <div>
                <h3 className="font-bold text-slate-800 text-sm">Notifikasi Password Reset (Pengguna)</h3>
                <p className="text-xs text-slate-500 mt-1">Kirim password baru ke nomor WhatsApp pengguna setelah Admin mereset kata sandi mereka.</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer flex-shrink-0">
                <input type="checkbox" className="sr-only peer" checked={isFiturAktif('wa_auto_password') ?? true} onChange={() => toggleFitur('wa_auto_password')} />
                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[var(--ui-primary)]"></div>
              </label>
            </div>

            <div className="flex items-center justify-between p-4 border border-slate-100 rounded-[var(--ui-radius-small)] hover:bg-slate-50 transition-colors">
              <div>
                <h3 className="font-bold text-slate-800 text-sm">Rekap Absensi Harian (Wali Kelas)</h3>
                <p className="text-xs text-slate-500 mt-1">Kirim laporan harian otomatis kepada walikelas berisi daftar siswa yang tidak masuk di kelasnya.</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer flex-shrink-0">
                <input type="checkbox" className="sr-only peer" checked={isFiturAktif('wa_auto_rekap_harian_walikelas') ?? true} onChange={() => toggleFitur('wa_auto_rekap_harian_walikelas')} />
                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[var(--ui-primary)]"></div>
              </label>
            </div>

            <div className="flex items-center justify-between p-4 border border-slate-100 rounded-[var(--ui-radius-small)] hover:bg-slate-50 transition-colors">
              <div>
                <h3 className="font-bold text-slate-800 text-sm">Notifikasi Kehadiran / Terlambat (Orang Tua)</h3>
                <p className="text-xs text-slate-500 mt-1">Kirim notifikasi otomatis ke nomor WA orang tua saat siswa hadir terlambat (melalui mesin Fingerprint Hikvision).</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer flex-shrink-0">
                <input type="checkbox" className="sr-only peer" checked={isFiturAktif('wa_auto_terlambat') ?? true} onChange={() => toggleFitur('wa_auto_terlambat')} />
                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[var(--ui-primary)]"></div>
              </label>
            </div>
            
            <div className="flex items-center justify-between p-4 border border-slate-100 rounded-[var(--ui-radius-small)] hover:bg-slate-50 transition-colors opacity-60">
              <div>
                <h3 className="font-bold text-slate-800 text-sm">Notifikasi Jurnal (Guru/Pembimbing)</h3>
                <p className="text-xs text-slate-500 mt-1">Kirim notifikasi ringkasan jurnal PKL yang perlu divalidasi ke guru. (Fitur CronJob Server)</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer flex-shrink-0">
                <input type="checkbox" className="sr-only peer" checked={false} disabled />
                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-slate-300"></div>
              </label>
            </div>
          </div>
        </div>
      )}

      {/* Send Tab */}
      {activeTab ==='kirim' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Single Send */}
          <div className="bg-white rounded-[var(--ui-radius-small)] border-none shadow-sm p-6 space-y-4">
            <h2 className="font-bold text-slate-700 flex items-center gap-2"><Phone size={16} /> Kirim Pesan Tunggal</h2>
            
            {/* Template Picker */}
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Template Pesan</label>
              <div className="flex flex-wrap gap-2">
                {TRIGGER_TEMPLATES.map(t => (
                  <Button variant="outline" key={t.key} onClick={() =>applyTemplate(t.key)}
                    className={`${selectedTemplate === t.key ?'bg-[var(--ui-primary)] text-white border-[var(--ui-primary)]' :'bg-slate-50 text-slate-600 border-slate-200 hover:border-[var(--ui-primary)]'}`}>
                    {t.label}</Button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Nomor HP Penerima</label>
              <input type="text" value={broadcastForm.phone} onChange={e => setBroadcastForm(p => ({ ...p, phone: e.target.value }))}
                placeholder="08xxxxxxxxxx atau 62xxxxxxxxxx"
                className="w-full px-3 py-2 bg-slate-50 border-none rounded-[var(--ui-radius-small)] text-sm font-semibold focus:outline-none focus:border-[var(--ui-primary)]" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Nama Penerima (Opsional)</label>
              <input type="text" value={broadcastForm.recipient_name} onChange={e => setBroadcastForm(p => ({ ...p, recipient_name: e.target.value }))}
                placeholder="Nama untuk log..."
                className="w-full px-3 py-2 bg-slate-50 border-none rounded-[var(--ui-radius-small)] text-sm font-semibold focus:outline-none focus:border-[var(--ui-primary)]" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Isi Pesan</label>
              <textarea rows={5} value={broadcastForm.message} onChange={e => setBroadcastForm(p => ({ ...p, message: e.target.value }))}
                placeholder="Ketik pesan atau pilih template di atas..."
                className="w-full px-3 py-2 bg-slate-50 border-none rounded-[var(--ui-radius-small)] text-sm font-medium focus:outline-none focus:border-[var(--ui-primary)] resize-none" />
              <p className="text-xs text-slate-400 mt-1">{broadcastForm.message.length} karakter</p>
            </div>
            <Button onClick={handleSend} disabled={isSending} className="w-full flex items-center justify-center gap-2">
              <Send size={14} /> {isSending ?'Mengirim...' :'Kirim Sekarang'}
            </Button>
          </div>

          {/* Broadcast */}
          <div className="bg-white rounded-[var(--ui-radius-small)] border-none shadow-sm p-6 space-y-4">
            <h2 className="font-bold text-slate-700 flex items-center gap-2"><Users size={16} /> Broadcast ke Banyak Siswa</h2>
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-[var(--ui-radius-small)]">
              <p className="text-xs font-bold text-amber-700 mb-1">⚠️ Perhatian</p>
              <p className="text-xs text-amber-600">Broadcast mengirim pesan ke semua orang tua yang memiliki nomor WA terdaftar di Data Siswa. Pastikan nomor WA sudah diisi di profil siswa.</p>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Template Pesan Broadcast</label>
              <UISelect value={selectedTemplate} onChange={e => applyTemplate(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border-none rounded-[var(--ui-radius-small)] text-sm font-semibold focus:outline-none focus:border-[var(--ui-primary)]">
                <option value="">-- Pilih Template --</option>
                {TRIGGER_TEMPLATES.map(t => <option key={t.key} value={t.key}>{t.label}</option>)}
              </UISelect>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Isi Pesan (Variabel: {'{NAMA_SISWA}'}, {'{TANGGAL}'})</label>
              <textarea rows={4} value={bulkMessage} onChange={e => setBulkMessage(e.target.value)}
                placeholder="Gunakan {NAMA_SISWA} untuk nama otomatis..."
                className="w-full px-3 py-2 bg-slate-50 border-none rounded-[var(--ui-radius-small)] text-sm font-medium focus:outline-none focus:border-[var(--ui-primary)] resize-none" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Pilih Penerima ({selectedStudents.length} terpilih)</label>
              <div className="max-h-48 overflow-y-auto border-none rounded-[var(--ui-radius-small)] bg-slate-50 p-2 space-y-1">
                {students.length === 0 ? (
                  <p className="text-xs text-slate-400 p-2 text-center">Data siswa tidak ditemukan. Import terlebih dahulu.</p>
                ) : students.slice(0, 50).map(s => (
                  <label key={s.nis} className="flex items-center gap-2 p-1.5 rounded-[var(--ui-radius-small)] cursor-pointer hover:bg-white">
                    <input type="checkbox" checked={selectedStudents.includes(s.nis)} onChange={e => {
                      if (e.target.checked) setSelectedStudents(prev => [...prev, s.nis]);
                      else setSelectedStudents(prev => prev.filter(id => id !== s.nis));
                    }} className="accent-[var(--ui-primary)]" />
                    <span className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                      <span>{s.name}</span>
                      <span className="text-slate-400">({s.nis})</span>
                      <span className="inline-flex items-center gap-0.5">
                        {s.wa_ortu ? (
                          <span className="inline-flex items-center gap-0.5 text-emerald-600 font-bold bg-emerald-50 px-1 py-0.2 rounded">
                            <CheckCircle2 size={10} className="shrink-0" />
                            <span>WA</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-0.5 text-amber-600 font-bold bg-amber-50 px-1 py-0.2 rounded">
                            <AlertCircle size={10} className="shrink-0" />
                            <span>no WA</span>
                          </span>
                        )}
                      </span>
                    </span>
                  </label>
                ))}
              </div>
              <div className="flex gap-2 mt-2">
                <Button variant="outline" onClick={() =>setSelectedStudents(students.filter(s => s.wa_ortu).map(s => s.nis))} >Pilih Semua (punya WA)</Button>
                <span className="text-slate-300">|</span>
                <Button variant="outline" onClick={() =>setSelectedStudents([])} >Batalkan</Button>
              </div>
            </div>
            <Button onClick={handleBulkSend} disabled={isSending || selectedStudents.length === 0} className="w-full flex items-center justify-center gap-2">
              <Send size={14} /> {isSending ? `Mengirim...` : `Kirim ke ${selectedStudents.length} Penerima`}
            </Button>
          </div>
        </div>
      )}

      {/* Rekap Tab */}
      {activeTab ==='rekap' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white rounded-[var(--ui-radius-small)] border-none shadow-sm p-6 space-y-4 text-center hover:border-[var(--ui-primary)] transition-all group">
            <div className="w-16 h-16 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
              <FileText size={32} />
            </div>
            <h3 className="font-black text-slate-800 text-lg">Blast Rekap Harian</h3>
            <p className="text-sm text-slate-500">
              Kirim rekap ketidakhadiran siswa (Sakit, Izin, Alpa) hari ini ke masing-masing <b>Walikelas</b> berdasarkan pengaturan Data Walikelas.
            </p>
            <div className="pt-4">
              <Button variant="outline" onClick={() =>handleSendRekap("daily")} disabled={isSendingRekap} className="w-full">
                {isSendingRekap ?'Memproses...' :'Kirim Rekap Harian Sekarang'}</Button>
            </div>
          </div>
          
          <div className="bg-white rounded-[var(--ui-radius-small)] border-none shadow-sm p-6 space-y-4 text-center hover:border-emerald-500 transition-all group">
            <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
              <Calendar size={32} />
            </div>
            <h3 className="font-black text-slate-800 text-lg">Blast Rekap Bulanan</h3>
            <p className="text-sm text-slate-500">
              Kirim rekap kehadiran 1 bulan terakhir & <b>Poin Pelanggaran</b> ke nomor WhatsApp masing-masing <b>Orang Tua</b> dan Walikelas.
            </p>
            <div className="pt-4">
              <Button variant="outline" onClick={() =>handleSendRekap("monthly")} disabled={isSendingRekap} className="w-full">
                {isSendingRekap ?'Memproses...' :'Kirim Rekap Bulanan Sekarang'}</Button>
            </div>
          </div>
        </div>
      )}

      {/* Log Tab */}
      {activeTab ==='log' && (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <Button variant="outline" onClick={fetchLogs} className="flex items-center gap-2">
              <RefreshCw size={14} /> Refresh
            </Button>
            {['all','sent','failed','pending','cancelled'].map(s => (
              <Button variant="outline" key={s} onClick={() => { setFilterStatus(s); setCurrentPage(1); }}
                className={`${filterStatus === s ?'bg-[var(--ui-primary)] text-white border-[var(--ui-primary)]' :'bg-white text-slate-600 border-slate-200 hover:border-[var(--ui-primary)]'}`}>
                {s ==='all' ?'Semua' : s ==='sent' ?'Sukses' : s ==='failed' ?'Gagal' : s ==='cancelled' ? 'Dibatalkan' :'Pending'}</Button>
            ))}
          </div>

          <div className="bg-white rounded-[var(--ui-radius-small)] border-none shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead className="text-xs text-slate-500 uppercase bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3 font-bold text-left">Penerima</th>
                  <th className="px-4 py-3 font-bold text-left">Pesan</th>
                  <th className="px-4 py-3 font-bold text-center">Status</th>
                  <th className="px-4 py-3 font-bold text-center">Tipe</th>
                  <th className="px-4 py-3 font-bold text-left">Waktu</th>
                  <th className="px-4 py-3 font-bold text-center">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-400">Memuat...</td></tr>
                ) : paginatedLogs.length === 0 ? (
                  <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-400">Belum ada riwayat pengiriman.</td></tr>
                ) : paginatedLogs.map(log => (
                  <tr key={log.id} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <p className="font-bold text-slate-700">{log.recipient_name ||'-'}</p>
                      <p className="text-xs text-slate-400 font-mono">{log.phone}</p>
                    </td>
                    <td className="px-4 py-3 max-w-xs">
                      <p className="text-xs text-slate-600 line-clamp-2">{log.message}</p>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-[var(--ui-radius-small)] text-[10px] font-bold uppercase ${log.status ==='sent' ?'bg-emerald-100 text-emerald-700' : log.status ==='failed' ?'bg-rose-100 text-rose-700' : log.status === 'cancelled' ? 'bg-slate-100 text-slate-700' :'bg-amber-100 text-amber-700'}`}>
                        {log.status ==='sent' ? <CheckCircle2 size={10} /> : log.status ==='failed' ? <AlertCircle size={10} /> : <Clock size={10} />}
                        {log.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="text-xs bg-slate-100 text-slate-600 px-2 py-1 rounded-[var(--ui-radius-small)] font-mono">{log.trigger_type}</span>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-400">
                      {new Date(log.sent_at).toLocaleDateString('id-ID', { day:'2-digit', month:'short', hour:'2-digit', minute:'2-digit' })}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {log.status === 'pending' ? (
                        <button onClick={() => handleCancelLog(log.id)} className="px-2 py-1 bg-rose-50 text-rose-600 hover:bg-rose-100 transition-colors rounded text-[10px] font-bold border border-rose-200">
                          Batalkan
                        </button>
                      ) : (
                        <span className="text-slate-300 text-xs">-</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            
            <TablePagination 
              currentPage={currentPage}
              totalPages={totalPages}
              totalItems={filteredLogs.length}
              itemsPerPage={itemsPerPage}
              onPageChange={setCurrentPage}
              onItemsPerPageChange={(val) => { setItemsPerPage(val); setCurrentPage(1); }}
              isLoading={isLoading}
            />
          </div>
        </div>
      )}
      {/* Walikelas Tab */}
      {activeTab ==='walikelas' && (
        <div className="bg-white rounded-[var(--ui-radius-small)] border-none shadow-sm p-6 space-y-6">
          <div className="flex flex-col sm:flex-row justify-between sm:items-center pb-4 border-b border-slate-100 gap-3">
            <div>
              <h2 className="font-bold text-slate-700 flex items-center gap-2"><UserCog size={18} /> Data Walikelas</h2>
              <p className="text-xs text-slate-500 mt-1">Data walikelas terhubung secara otomatis dengan Data Kelas & Nomor WhatsApp di Data Guru.</p>
            </div>
            <div className="text-xs font-bold text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-[var(--ui-radius-small)] border border-emerald-100 flex items-center gap-1.5 self-start">
              <CheckCircle2 size={14} /> Terkoneksi Otomatis
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {(classesList.length > 0 ? classesList : INITIAL_CLASSES).map(cls => {
              const hrTeacher = teachersList.find(t => t.code === cls.homeroom);
              const phone = hrTeacher?.phone ||"";
              
              return (
                <div key={cls.name} className="p-4 bg-slate-50 border-none rounded-[var(--ui-radius-small)] space-y-3 relative group transition-all">
                  <div className="flex justify-between items-center">
                    <h3 className="font-black text-slate-700 text-sm">{cls.name}</h3>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-[var(--ui-radius-small)] uppercase tracking-widest bg-white border-none text-slate-500">{cls.major}</span>
                  </div>
                  
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Nama Walikelas</label>
                    <div className="w-full px-3 py-2 bg-white border border-slate-150 rounded-[var(--ui-radius-small)] text-xs font-bold text-slate-800">
                      {hrTeacher ? hrTeacher.name :"Belum ditentukan"}
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">No. WhatsApp</label>
                    <div className={`w-full px-3 py-2 border rounded-[var(--ui-radius-small)] text-xs font-bold ${phone ?'bg-white text-slate-800 border-slate-150' :'bg-amber-50/50 text-amber-600 border-amber-200/50'}`}>
                      {phone ||"Belum diatur di Data Guru"}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {toast && (
        <div className={`fixed bottom-6 right-6 px-4 py-3 rounded-[var(--ui-radius-small)] shadow-sm font-medium text-sm flex items-center gap-2 animate-in slide-in-from-bottom-5 text-white max-w-sm ${toast.type ==='error' ?'bg-rose-600' :'bg-emerald-600'}`}>
          {toast.type ==='error' ? <AlertCircle size={18} /> : <CheckCircle2 size={18} />} {toast.message}
        </div>
      )}
    </div>
  );
}
