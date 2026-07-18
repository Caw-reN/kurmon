import { Button } from '../../../components/ui.jsx';
import { useState, useEffect } from'react';
import { Key, Wifi, MessageSquare, HardDrive, Send, Cloud, Settings, LayoutDashboard, KeyRound, DatabaseBackup } from'lucide-react';
import useAuthStore from'../../../store/monitoring/authStore.js';
import { CheckCircle2, EyeOff, Eye, RefreshCw, Edit2, Trash2, X, ShieldCheck, AlertCircle } from'lucide-react';
import { PageHeader } from '../../../components/monitoring/ui/index.js';
;


const SERVICE_PRESETS = [
  { service_name:'whatsapp_fonnte', service_label:'WhatsApp (Fonnte)', icon: MessageSquare, color:'emerald', description:'API Gateway WhatsApp untuk notifikasi otomatis (keterlambatan, pelanggaran, pengumuman). Daftar di fonnte.com.', placeholder_key:'TOKEN_FONNTE_ANDA' },
  { service_name:'telegram_backup', service_label:'Telegram Auto-Backup', icon: Send, color:'blue', description:'Backup database otomatis ke Telegram. Butuh Bot Token dari @BotFather dan Chat ID tujuan.', placeholder_key:'BOT_TOKEN_DARI_BOTFATHER' },
  { service_name:'cloudflare_r2', service_label:'Cloudflare R2 Backup', icon: Cloud, color:'orange', description:'Backup database otomatis ke Cloudflare R2 (S3 API). Gratis 10GB dan tanpa biaya egress.', placeholder_key:'{"accessKeyId":"...","secretAccessKey":"..."}' },
  { service_name:'google_drive', service_label:'Google Drive Backup', icon: HardDrive, color:'blue', description:'Backup database otomatis ke Google Drive. Butuh Service Account JSON dari Google Cloud Console.', placeholder_key:'SERVICE_ACCOUNT_JSON_atau_CLIENT_ID' },
  { service_name:'hikvision_master', service_label:'Hikvision (Finger Print)', icon: Wifi, color:'orange', description:'Integrasi mesin presensi Hikvision untuk absensi otomatis siswa/guru.', placeholder_key:'IP_MESIN:PORT' },
  { service_name:'custom', service_label:'API Custom Lainnya', icon: Key, color:'purple', description:'Tambahkan integrasi pihak ketiga lainnya secara manual.', placeholder_key:'API_KEY_ANDA' },
];

const COLOR_MAP = { emerald:'bg-emerald-50 text-emerald-600 border-emerald-200', blue:'bg-blue-50 text-blue-600 border-blue-200', orange:'bg-orange-50 text-orange-600 border-orange-200', purple:'bg-purple-50 text-purple-600 border-purple-200' };

export default function ManajemenAPIKey({ activeTab: activeSystemTab, setActiveTab: setSystemTab }) {
  const [keys, setKeys] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingKey, setEditingKey] = useState(null);
  const [selectedPreset, setSelectedPreset] = useState(null);
  const [form, setForm] = useState({ service_name:'', service_label:'', api_key:'', is_active: true, extra_config: {} });
  const [showKey, setShowKey] = useState({});
  const [toast, setToast] = useState(null);
  const [isTesting, setIsTesting] = useState(false);
  const authToken = useAuthStore(state => state.user?.authToken);

  const showToast = (message, type ='success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  const fetchKeys = async () => {
    if (!authToken) return;
    setIsLoading(true);
    try {
      const res = await fetch('/api/api-keys', { headers: { Authorization: `Bearer ${authToken}` } });
      const data = await res.json();
      if (data.ok) setKeys(data.data || []);
    } catch (e) { console.error(e); }
    setIsLoading(false);
  };

  useEffect(() => { fetchKeys(); }, [authToken]);

  const openAdd = (preset = null) => {
    setEditingKey(null);
    setSelectedPreset(preset);
    if (preset && preset.service_name !=='custom') {
      setForm({ service_name: preset.service_name, service_label: preset.service_label, api_key:'', is_active: true, extra_config: {} });
    } else {
      setForm({ service_name:'', service_label:'', api_key:'', is_active: true, extra_config: {} });
    }
    setShowModal(true);
  };

  const openEdit = (key) => {
    setEditingKey(key);
    setSelectedPreset(null);
    setForm({ service_name: key.service_name, service_label: key.service_label, api_key:'********', is_active: key.is_active, extra_config: key.extra_config || {} });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.service_name || !form.service_label) return showToast('Nama service wajib diisi.','error');
    const body = { ...form };
    if (editingKey && form.api_key ==='********') delete body.api_key; // Don't overwrite key if not changed
    if (editingKey) body.id = editingKey.id;
    try {
      const res = await fetch('/api/api-keys', {
        method:'POST', headers: { Authorization: `Bearer ${authToken}`,'Content-Type':'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (data.ok) { showToast(editingKey ?'API Key diperbarui!' :'API Key ditambahkan!'); setShowModal(false); fetchKeys(); }
      else showToast(data.error ||'Gagal.','error');
    } catch (e) { showToast('Gagal.','error'); }
  };

  const handleDelete = async (id) => {
    if (!await window.confirmAsync('Hapus API Key ini? Integrasi yang terkait akan berhenti berfungsi.')) return;
    try {
      await fetch('/api/api-keys', {
        method:'POST', headers: { Authorization: `Bearer ${authToken}`,'Content-Type':'application/json' },
        body: JSON.stringify({ action:'delete', id }),
      });
      showToast('Dihapus!'); fetchKeys();
    } catch (e) { showToast('Gagal.','error'); }
  };

  const handleTestWA = async () => {
    setIsTesting(true);
    try {
      const res = await fetch('/api/whatsapp/send', {
        method:'POST', headers: { Authorization: `Bearer ${authToken}`,'Content-Type':'application/json' },
        body: JSON.stringify({ phone:'628123456789', message:'✅ Test koneksi WhatsApp dari Sistem Sekolah berhasil!', trigger_type:'test' }),
      });
      const data = await res.json();
      if (data.ok) showToast('Test WA berhasil dikirim! Cek WhatsApp target.');
      else showToast(data.error ||'Test gagal. Cek kembali API Key.','error');
    } catch (e) { showToast('Gagal terhubung ke server.','error'); }
    setIsTesting(false);
  };

  const getPresetInfo = (service_name) => SERVICE_PRESETS.find(p => p.service_name === service_name);

  return (
    <div className="space-y-6 relative animate-in fade-in duration-300 z-10">
      <PageHeader 
        title="Manajemen API Key & Integrasi"
        description="Kelola semua kredensial dan token layanan pihak ketiga di satu tempat yang aman."
        icon={Key}
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

      {/* Quick Add Presets */}
      <div>
        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Tambah Integrasi Populer</p>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {SERVICE_PRESETS.map(preset => {
            const Icon = preset.icon;
            const isConfigured = keys.some(k => k.service_name === preset.service_name);
            const colorClass = COLOR_MAP[preset.color] || COLOR_MAP.purple;
            return (
              <Button variant="outline" key={preset.service_name} onClick={() =>openAdd(preset)}
                className={`relative text-left ${isConfigured ?'border-emerald-300 bg-emerald-50/30' :'border-dashed border-slate-200 bg-white hover:border-[var(--ui-primary)]'}`}>
                {isConfigured && <span className="absolute top-3 right-3"><CheckCircle2 size={14} className="text-emerald-500" /></span>}
                <div className={`w-10 h-10 rounded-[var(--ui-radius-small)] flex items-center justify-center border mb-3 ${colorClass}`}>
                  <Icon size={20} />
                </div>
                <p className="font-bold text-slate-700 text-sm">{preset.service_label}</p>
                <p className="text-xs text-slate-400 mt-1 leading-relaxed line-clamp-2">{preset.description}</p>
                {isConfigured && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600 mt-2">
                    <CheckCircle2 size={11} className="shrink-0 text-emerald-600" />
                    <span>Sudah dikonfigurasi</span>
                  </span>
                )}</Button>
            );
          })}
        </div>
      </div>

      {/* Configured Keys Table */}
      {keys.length > 0 && (
        <div className="bg-white rounded-[var(--ui-radius-small)] border-none shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
            <h2 className="font-bold text-slate-700">API Key Terkonfigurasi ({keys.length})</h2>
          </div>
          <div className="divide-y divide-slate-100">
            {keys.map(key => {
              const preset = getPresetInfo(key.service_name);
              const Icon = preset?.icon || Key;
              const colorClass = COLOR_MAP[preset?.color] || COLOR_MAP.purple;
              return (
                <div key={key.id} className="px-6 py-4 flex items-center gap-4 hover:bg-slate-50 transition-colors">
                  <div className={`w-10 h-10 rounded-[var(--ui-radius-small)] flex items-center justify-center border shrink-0 ${colorClass}`}>
                    <Icon size={18} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-800 text-sm">{key.service_label}</span>
                      <span className={`px-2 py-0.5 rounded-[var(--ui-radius-small)] text-[10px] font-bold uppercase tracking-wider ${key.is_active ?'bg-emerald-100 text-emerald-700' :'bg-slate-100 text-slate-500'}`}>
                        {key.is_active ?'Aktif' :'Nonaktif'}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs font-mono text-slate-400">{showKey[key.id] ?'key:' + key.api_key?.substring?.(0, 20) +'...' :'••••••••••••••••••••'}</span>
                      <Button variant="outline" onClick={() =>setShowKey(prev => ({ ...prev, [key.id]: !prev[key.id] }))} >
                        {showKey[key.id] ? <EyeOff size={12} /> : <Eye size={12} />}</Button>
                    </div>
                    <p className="text-[10px] text-slate-400 mt-0.5">Diperbarui: {new Date(key.updated_at).toLocaleDateString('id-ID', { day:'2-digit', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit' })}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {key.service_name ==='whatsapp_fonnte' && key.is_active && (
                      <button onClick={handleTestWA} disabled={isTesting}
                        className="flex items-center gap-1">
                        <RefreshCw size={12} className={isTesting ?'animate-spin' :''} /> Test
                      </button>
                    )}
                    <Button variant="outline" onClick={() =>openEdit(key)} ><Edit2 size={14} /></Button>
                    <Button variant="outline" onClick={() =>handleDelete(key.id)} ><Trash2 size={14} /></Button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white rounded-[var(--ui-radius-small)] shadow-sm w-full max-w-md overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <h3 className="font-bold text-slate-800">{editingKey ?'Edit API Key' : `Tambah: ${selectedPreset?.service_label ||'API Key'}`}</h3>
              <Button variant="outline" onClick={() =>setShowModal(false)} ><X size={20} /></Button>
            </div>
            <div className="p-6 space-y-4">
              {selectedPreset && <div className="p-3 bg-slate-50 rounded-[var(--ui-radius-small)] border-none text-xs text-slate-500">{selectedPreset.description}</div>}
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Service Name (ID unik)</label>
                <input type="text" value={form.service_name} onChange={e => setForm(p => ({ ...p, service_name: e.target.value.toLowerCase().replace(/\s/g,'_') }))}
                  disabled={!!selectedPreset && selectedPreset.service_name !=='custom'}
                  className="w-full px-3 py-2 bg-slate-50 border-none rounded-[var(--ui-radius-small)] text-sm font-mono focus:outline-none focus:border-[var(--ui-primary)] disabled:opacity-60" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Label / Nama Tampilan</label>
                <input type="text" value={form.service_label} onChange={e => setForm(p => ({ ...p, service_label: e.target.value }))}
                  className="w-full px-3 py-2 bg-slate-50 border-none rounded-[var(--ui-radius-small)] text-sm font-semibold focus:outline-none focus:border-[var(--ui-primary)]" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">API Key / Token / Service JSON</label>
                <div className="relative">
                  <input type={showKey.modal ?'text' :'password'} value={form.api_key} onChange={e => setForm(p => ({ ...p, api_key: e.target.value }))}
                    placeholder={selectedPreset?.placeholder_key ||'Masukkan token/key...'}
                    className="w-full px-3 py-2 pr-10 bg-slate-50 border-none rounded-[var(--ui-radius-small)] text-sm font-mono focus:outline-none focus:border-[var(--ui-primary)]" />
                  <Button variant="outline" type="button" onClick={() =>setShowKey(p => ({ ...p, modal: !p.modal }))} className="absolute right-3 top-1/2">
                    {showKey.modal ? <EyeOff size={14} /> : <Eye size={14} />}</Button>
                </div>
              </div>
              {form.service_name ==='google_drive' && (
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Folder ID Google Drive (Wajib)</label>
                  <input type="text" value={form.extra_config?.folder_id ||''} onChange={e => setForm(p => ({ ...p, extra_config: { ...p.extra_config, folder_id: e.target.value } }))}
                    placeholder="Contoh: 1A2b3C4d5E6f7G8h9I0j"
                    className="w-full px-3 py-2 bg-slate-50 border-none rounded-[var(--ui-radius-small)] text-sm font-mono focus:outline-none focus:border-[var(--ui-primary)]" />
                  <p className="text-[10px] text-slate-400 mt-1">Buat folder di GDrive Anda, bagikan akses"Editor" ke email Service Account, lalu copas ID folder dari URL.</p>
                </div>
              )}
              {form.service_name ==='telegram_backup' && (
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Chat ID Telegram (Wajib)</label>
                  <input type="text" value={form.extra_config?.chat_id ||''} onChange={e => setForm(p => ({ ...p, extra_config: { ...p.extra_config, chat_id: e.target.value } }))}
                    placeholder="Contoh: 123456789 atau -100987654321"
                    className="w-full px-3 py-2 bg-slate-50 border-none rounded-[var(--ui-radius-small)] text-sm font-mono focus:outline-none focus:border-[var(--ui-primary)]" />
                  <p className="text-[10px] text-slate-400 mt-1">ID Chat pribadi Anda atau ID Grup tempat bot diundang. Buka <b>@userinfobot</b> di Telegram untuk mengetahui Chat ID Anda.</p>
                </div>
              )}
              {form.service_name ==='cloudflare_r2' && (
                <div className="space-y-4 mt-2 border-t border-slate-100 pt-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Endpoint URL (Wajib)</label>
                    <input type="text" value={form.extra_config?.endpoint ||''} onChange={e => setForm(p => ({ ...p, extra_config: { ...p.extra_config, endpoint: e.target.value } }))}
                      placeholder="Contoh: https://<account_id>.r2.cloudflarestorage.com"
                      className="w-full px-3 py-2 bg-slate-50 border-none rounded-[var(--ui-radius-small)] text-sm font-mono focus:outline-none focus:border-[var(--ui-primary)]" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Nama Bucket (Wajib)</label>
                    <input type="text" value={form.extra_config?.bucket ||''} onChange={e => setForm(p => ({ ...p, extra_config: { ...p.extra_config, bucket: e.target.value } }))}
                      placeholder="Contoh: kurmon-backup-bucket"
                      className="w-full px-3 py-2 bg-slate-50 border-none rounded-[var(--ui-radius-small)] text-sm font-mono focus:outline-none focus:border-[var(--ui-primary)]" />
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1">Masukkan Endpoint URL dan Nama Bucket dari Cloudflare R2 Anda.</p>
                </div>
              )}
              <label className="flex items-center gap-3 cursor-pointer p-3 rounded-[var(--ui-radius-small)] bg-slate-50 border-none">
                <input type="checkbox" checked={form.is_active} onChange={e => setForm(p => ({ ...p, is_active: e.target.checked }))} className="w-4 h-4 accent-[var(--ui-primary)]" />
                <div>
                  <span className="font-bold text-slate-700 text-sm">Aktifkan Integrasi</span>
                  <p className="text-xs text-slate-400">Jika tidak aktif, fitur yang membutuhkan key ini akan dinonaktifkan.</p>
                </div>
              </label>
              <div className="pt-4 flex justify-end gap-3">
                <Button variant="outline" type="button" onClick={() =>setShowModal(false)}>Batal</Button>
                <Button variant="outline" onClick={handleSave} ><ShieldCheck size={14} className="mr-1" /> Simpan Key</Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div className={`fixed bottom-6 right-6 px-4 py-3 rounded-[var(--ui-radius-small)] shadow-sm font-medium text-sm flex items-center gap-2 animate-in slide-in-from-bottom-5 text-white ${toast.type ==='error' ?'bg-red-600' :'bg-emerald-600'}`}>
          {toast.type ==='error' ? <AlertCircle size={18} /> : <CheckCircle2 size={18} />} {toast.message}
        </div>
      )}
    </div>
  );
}
