import { useState, useEffect } from 'react';
import { 
  Key, Wifi, MessageSquare, HardDrive, Send, Cloud, Settings, 
  LayoutDashboard, KeyRound, DatabaseBackup, CheckCircle2, EyeOff, 
  Eye, RefreshCw, Edit2, Trash2, X, ShieldCheck, AlertCircle, 
  Plus, AlertTriangle
} from 'lucide-react';
import useAuthStore from '../../../store/monitoring/authStore.js';
import { PageHeader } from '../../../components/monitoring/ui/index.js';
import { Modal } from '../../../components/ui.jsx';

const SERVICE_PRESETS = [
  { service_name_prefix: 'whatsapp_fonnte', service_label: 'WhatsApp (Fonnte)', icon: MessageSquare, color: 'emerald', description: 'API Gateway WhatsApp untuk notifikasi. Daftar di fonnte.com.', placeholder_key: 'TOKEN_FONNTE_ANDA' },
  { service_name_prefix: 'whatsapp_official', service_label: 'WhatsApp Cloud API (Resmi)', icon: MessageSquare, color: 'emerald', description: 'API Resmi dari Meta. Butuh Phone Number ID & Access Token.', placeholder_key: 'ACCESS_TOKEN_META' },
  { service_name_prefix: 'telegram_backup', service_label: 'Telegram Auto-Backup', icon: Send, color: 'blue', description: 'Backup database otomatis ke Telegram. Butuh Bot Token dari @BotFather dan Chat ID tujuan.', placeholder_key: 'BOT_TOKEN_DARI_BOTFATHER' },
  { service_name_prefix: 'cloudflare_r2', service_label: 'Cloudflare R2 Backup', icon: Cloud, color: 'orange', description: 'Backup database otomatis ke Cloudflare R2 (S3 API). Gratis 10GB dan tanpa biaya egress.', placeholder_key: '{"accessKeyId":"...","secretAccessKey":"..."}' },
  { service_name_prefix: 'google_drive', service_label: 'Google Drive Backup', icon: HardDrive, color: 'blue', description: 'Backup database otomatis ke Google Drive. Butuh Service Account JSON dari Google Cloud Console.', placeholder_key: 'SERVICE_ACCOUNT_JSON_atau_CLIENT_ID' },
  { service_name_prefix: 'hikvision_master', service_label: 'Hikvision (Finger Print)', icon: Wifi, color: 'orange', description: 'Integrasi mesin presensi Hikvision untuk absensi otomatis siswa/guru.', placeholder_key: 'IP_MESIN:PORT' },
  { service_name_prefix: 'custom', service_label: 'API Custom Lainnya', icon: Key, color: 'purple', description: 'Tambahkan integrasi pihak ketiga lainnya secara manual.', placeholder_key: 'API_KEY_ANDA' },
];

const COLOR_MAP = { 
  emerald: { bg: 'bg-emerald-50 text-emerald-600 border-emerald-100', activeBadge: 'bg-emerald-100/80 text-emerald-700 border-emerald-200' }, 
  blue: { bg: 'bg-blue-50 text-blue-600 border-blue-100', activeBadge: 'bg-blue-100/80 text-blue-700 border-blue-200' }, 
  orange: { bg: 'bg-orange-50 text-orange-600 border-orange-100', activeBadge: 'bg-orange-100/80 text-orange-700 border-orange-200' }, 
  purple: { bg: 'bg-purple-50 text-purple-600 border-purple-100', activeBadge: 'bg-purple-100/80 text-purple-700 border-purple-200' } 
};

export default function ManajemenAPIKey({ activeTab: activeSystemTab, setActiveTab: setSystemTab }) {
  const [keys, setKeys] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingKey, setEditingKey] = useState(null);
  const [selectedPreset, setSelectedPreset] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [form, setForm] = useState({ service_name: '', service_label: '', api_key: '', is_active: true, extra_config: {} });
  const [showKey, setShowKey] = useState({});
  const [toast, setToast] = useState(null);
  const [isTesting, setIsTesting] = useState(false);
  const authToken = useAuthStore(state => state.user?.authToken);

  const [jurusans, setJurusans] = useState([]);

  const showToast = (message, type = 'success') => {
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
      
      const jurRes = await fetch('/api/master/jurusan', { headers: { Authorization: `Bearer ${authToken}` } });
      const jurData = await jurRes.json();
      if (jurData.ok) setJurusans(jurData.data || []);
    } catch (e) { 
      console.error(e); 
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchKeys(); }, [authToken]);

  const openAdd = (preset = null) => {
    setEditingKey(null);
    setSelectedPreset(preset);
    if (preset && preset.service_name_prefix !== 'custom') {
      const isWa = preset.service_name_prefix.startsWith('whatsapp');
      setForm({ 
        service_name: isWa ? `${preset.service_name_prefix}_baru` : preset.service_name_prefix, 
        service_label: preset.service_label, 
        api_key: '', 
        is_active: true, 
        extra_config: isWa ? { jurusan: 'default' } : {} 
      });
    } else {
      setForm({ service_name: '', service_label: '', api_key: '', is_active: true, extra_config: {} });
    }
    setShowModal(true);
  };

  const openEdit = (key) => {
    setEditingKey(key);
    setSelectedPreset(null);
    setForm({ service_name: key.service_name, service_label: key.service_label, api_key: '********', is_active: key.is_active, extra_config: key.extra_config || {} });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.service_name || !form.service_label) return showToast('Nama service wajib diisi.', 'error');
    const body = { ...form };
    if (editingKey && form.api_key === '********') delete body.api_key;
    if (editingKey) body.id = editingKey.id;
    try {
      const res = await fetch('/api/api-keys', {
        method: 'POST', 
        headers: { Authorization: `Bearer ${authToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (data.ok) { 
        showToast(editingKey ? 'API Key berhasil diperbarui!' : 'API Key berhasil ditambahkan!'); 
        setShowModal(false); 
        fetchKeys(); 
      } else {
        showToast(data.error || 'Gagal menyimpan API Key.', 'error');
      }
    } catch (e) { 
      showToast('Terjadi kesalahan koneksi.', 'error'); 
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      await fetch('/api/api-keys', {
        method: 'POST', 
        headers: { Authorization: `Bearer ${authToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delete', id: deleteTarget.id }),
      });
      showToast('API Key berhasil dihapus!'); 
      fetchKeys();
    } catch (e) { 
      showToast('Gagal menghapus API Key.', 'error'); 
    } finally {
      setDeleteTarget(null);
    }
  };

  const handleTestWA = async () => {
    setIsTesting(true);
    try {
      const res = await fetch('/api/whatsapp/send', {
        method: 'POST', 
        headers: { Authorization: `Bearer ${authToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: '628123456789', message: '✅ Test koneksi WhatsApp dari Sistem Sekolah berhasil!', trigger_type: 'test' }),
      });
      const data = await res.json();
      if (data.ok) showToast('Test WA berhasil dikirim! Cek WhatsApp target.');
      else showToast(data.error || 'Test gagal. Cek kembali API Key.', 'error');
    } catch (e) { 
      showToast('Gagal terhubung ke server.', 'error'); 
    } finally {
      setIsTesting(false);
    }
  };

  const getPresetInfo = (service_name) => {
    const preset = SERVICE_PRESETS.find(p => service_name.startsWith(p.service_name_prefix));
    return preset || SERVICE_PRESETS.find(p => p.service_name_prefix === 'custom');
  };

  return (
    <div className="space-y-6 relative animate-in fade-in duration-300 z-10">
      <PageHeader 
        title="Manajemen API Key & Integrasi"
        description="Kelola semua kredensial dan token layanan pihak ketiga di satu tempat yang aman."
        icon={Key}
        tabs={[
          { id: "fitur", label: "Fitur", icon: Settings },
          { id: "tampilan", label: "Tampilan Web", icon: LayoutDashboard },
          { id: "whatsapp", label: "WhatsApp", icon: MessageSquare },
          { id: "api_keys", label: "API Key", icon: KeyRound },
          { id: "gdrive_backup", label: "Backup", icon: DatabaseBackup }
        ]}
        activeTab={activeSystemTab}
        onTabChange={setSystemTab}
      />

      {/* QUICK ADD PRESETS GRID */}
      <div>
        <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3.5 flex items-center gap-1.5">
          <Plus size={14} className="text-emerald-500" /> Tambah Integrasi Populer
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {SERVICE_PRESETS.map(preset => {
            const Icon = preset.icon;
            const isConfigured = keys.some(k => k.service_name.startsWith(preset.service_name_prefix));
            const style = COLOR_MAP[preset.color] || COLOR_MAP.purple;
            
            return (
              <button 
                type="button"
                key={preset.service_name_prefix} 
                onClick={() => openAdd(preset)}
                className={`w-full text-left p-4 rounded-2xl border transition-all duration-200 cursor-pointer flex flex-col justify-between gap-3 shadow-2xs hover:shadow-md hover:-translate-y-0.5 ${
                  isConfigured 
                    ? 'border-emerald-200/90 bg-emerald-50/20 hover:border-emerald-400' 
                    : 'border-slate-200/80 bg-white hover:border-violet-400 hover:bg-slate-50/50'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center border shrink-0 ${style.bg}`}>
                    <Icon size={20} />
                  </div>

                  {isConfigured ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-700 border border-emerald-200 shrink-0">
                      <CheckCircle2 size={12} className="text-emerald-600 shrink-0" />
                      <span>Dikonfigurasi</span>
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-slate-100 text-slate-500 border border-slate-200/80 shrink-0">
                      <Plus size={11} className="text-slate-400 shrink-0" />
                      <span>Tambah</span>
                    </span>
                  )}
                </div>

                <div className="space-y-1">
                  <h4 className="font-extrabold text-slate-800 text-sm tracking-tight leading-snug">{preset.service_label}</h4>
                  <p className="text-xs text-slate-500 font-medium leading-relaxed line-clamp-2">{preset.description}</p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* CONFIGURED KEYS LIST */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 bg-slate-50/60 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold text-xs">
              <KeyRound size={15} />
            </div>
            <h3 className="font-extrabold text-slate-800 text-xs sm:text-sm">
              API Key Terkonfigurasi ({keys.length})
            </h3>
          </div>
          
          <button
            type="button"
            onClick={() => openAdd(null)}
            className="py-1.5 px-3 rounded-xl font-bold text-xs bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
          >
            <Plus size={14} />
            <span>Tambah Key Custom</span>
          </button>
        </div>

        {keys.length === 0 ? (
          <div className="p-10 text-center text-slate-400 space-y-2">
            <Key size={40} className="mx-auto text-slate-300" />
            <p className="font-bold text-sm text-slate-600">Belum Ada API Key Terkonfigurasi</p>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">Klik salah satu integrasi populer di atas untuk menambahkan token API.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {keys.map(key => {
              const preset = getPresetInfo(key.service_name);
              const Icon = preset?.icon || Key;
              const style = COLOR_MAP[preset?.color] || COLOR_MAP.purple;
              return (
                <div key={key.id} className="p-4 sm:px-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 hover:bg-slate-50/60 transition-colors">
                  <div className="flex items-start sm:items-center gap-3 min-w-0 w-full sm:w-auto">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center border shrink-0 mt-0.5 sm:mt-0 ${style.bg}`}>
                      <Icon size={18} />
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-extrabold text-slate-800 text-xs sm:text-sm">{key.service_label}</span>
                        <span className={`px-2 py-0.5 rounded-full text-[9.5px] font-black uppercase tracking-wider border ${
                          key.is_active 
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                            : 'bg-slate-100 text-slate-500 border-slate-200'
                        }`}>
                          {key.is_active ? 'Aktif' : 'Nonaktif'}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[11px] font-mono text-slate-500 font-semibold bg-slate-100 px-2 py-0.5 rounded-lg border border-slate-200/60">
                          {showKey[key.id] ? (key.api_key?.substring?.(0, 24) + '...') : '••••••••••••••••••••'}
                        </span>
                        <button 
                          type="button" 
                          onClick={() => setShowKey(prev => ({ ...prev, [key.id]: !prev[key.id] }))} 
                          className="p-1 text-slate-400 hover:text-slate-700 rounded-lg transition-colors border-none bg-transparent cursor-pointer"
                          title={showKey[key.id] ? "Sembunyikan" : "Tampilkan Key"}
                        >
                          {showKey[key.id] ? <EyeOff size={13} /> : <Eye size={13} />}
                        </button>
                      </div>

                      <p className="text-[10px] text-slate-400 font-semibold mt-1">
                        Diperbarui: {new Date(key.updated_at).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 self-end sm:self-center shrink-0">
                    {key.service_name.startsWith('whatsapp') && key.is_active && (
                      <button 
                        type="button"
                        onClick={handleTestWA} 
                        disabled={isTesting}
                        className="py-1.5 px-3 rounded-xl font-bold text-xs bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
                      >
                        <RefreshCw size={12} className={isTesting ? 'animate-spin' : ''} />
                        <span>Test WA</span>
                      </button>
                    )}
                    
                    <button
                      type="button"
                      onClick={() => openEdit(key)}
                      className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors border-none bg-transparent cursor-pointer"
                      title="Edit Key"
                    >
                      <Edit2 size={14} />
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeleteTarget(key)}
                      className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors border-none bg-transparent cursor-pointer"
                      title="Hapus Key"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ADD / EDIT MODAL */}
      <Modal 
        isOpen={showModal} 
        onClose={() => setShowModal(false)} 
        title={editingKey ? 'Edit API Key' : `Tambah Integrasi: ${selectedPreset?.service_label || 'API Key'}`} 
        maxWidth="max-w-md"
      >
        <div className="space-y-4 text-xs font-semibold text-slate-600">
          {selectedPreset && (
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-xs text-slate-500 font-medium leading-relaxed">
              {selectedPreset.description}
            </div>
          )}

          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Service ID (Unik)</label>
            <input 
              type="text" 
              value={form.service_name} 
              onChange={e => setForm(p => ({ ...p, service_name: e.target.value.toLowerCase().replace(/\s/g, '_') }))}
              disabled={!!selectedPreset && selectedPreset.service_name_prefix !== 'custom' && !selectedPreset.service_name_prefix.startsWith('whatsapp')}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 disabled:opacity-60 font-semibold" 
            />
            {form.service_name.startsWith('whatsapp') && (
              <p className="text-[10px] text-slate-400 mt-1 font-semibold">Anda bisa mengubah suffix Service ID ini (misal: whatsapp_fonnte_rpl) untuk banyak nomor.</p>
            )}
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Label / Nama Tampilan</label>
            <input 
              type="text" 
              value={form.service_label} 
              onChange={e => setForm(p => ({ ...p, service_label: e.target.value }))}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20" 
            />
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">API Key / Token / Kredensial</label>
            <div className="relative">
              <input 
                type={showKey.modal ? 'text' : 'password'} 
                value={form.api_key} 
                onChange={e => setForm(p => ({ ...p, api_key: e.target.value }))}
                placeholder={selectedPreset?.placeholder_key || 'Masukkan token/key...'}
                className="w-full px-3 py-2 pr-10 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 font-semibold" 
              />
              <button 
                type="button" 
                onClick={() => setShowKey(p => ({ ...p, modal: !p.modal }))} 
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 border-none bg-transparent cursor-pointer"
              >
                {showKey.modal ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
          </div>

          {form.service_name.startsWith('whatsapp') && (
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Peruntukan Jurusan</label>
              <select
                value={form.extra_config?.jurusan || 'default'}
                onChange={e => setForm(p => ({ ...p, extra_config: { ...p.extra_config, jurusan: e.target.value } }))}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              >
                <option value="default">Default / Semua Jurusan</option>
                {jurusans.map(j => (
                  <option key={j.id} value={j.kode}>{j.kode} - {j.nama}</option>
                ))}
              </select>
              <p className="text-[10px] text-slate-400 mt-1 font-semibold">Gunakan token/nomor ini khusus untuk jurusan tertentu. Jika "Default", akan dipakai untuk semua jurusan yang tidak memiliki nomor spesifik.</p>
            </div>
          )}

          {form.service_name.startsWith('whatsapp_official') && (
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Phone Number ID (Wajib)</label>
              <input 
                type="text" 
                value={form.extra_config?.phone_number_id || ''} 
                onChange={e => setForm(p => ({ ...p, extra_config: { ...p.extra_config, phone_number_id: e.target.value } }))}
                placeholder="Contoh: 1234567890"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 font-semibold" 
              />
              <p className="text-[10px] text-slate-400 mt-1 font-semibold">ID Nomor Telepon dari dasbor Facebook/Meta Business.</p>
            </div>
          )}

          {form.service_name === 'google_drive' && (
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Folder ID Google Drive (Wajib)</label>
              <input 
                type="text" 
                value={form.extra_config?.folder_id || ''} 
                onChange={e => setForm(p => ({ ...p, extra_config: { ...p.extra_config, folder_id: e.target.value } }))}
                placeholder="Contoh: 1A2b3C4d5E6f7G8h9I0j"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 font-semibold" 
              />
              <p className="text-[10px] text-slate-400 mt-1 font-semibold">Buat folder di GDrive Anda, bagikan akses "Editor" ke email Service Account, lalu copas ID folder dari URL.</p>
            </div>
          )}

          {form.service_name === 'telegram_backup' && (
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Chat ID Telegram (Wajib)</label>
              <input 
                type="text" 
                value={form.extra_config?.chat_id || ''} 
                onChange={e => setForm(p => ({ ...p, extra_config: { ...p.extra_config, chat_id: e.target.value } }))}
                placeholder="Contoh: 123456789 atau -100987654321"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 font-semibold" 
              />
              <p className="text-[10px] text-slate-400 mt-1 font-semibold">ID Chat pribadi Anda atau ID Grup tempat bot diundang. Buka @userinfobot di Telegram untuk mengetahui Chat ID Anda.</p>
            </div>
          )}

          {form.service_name === 'cloudflare_r2' && (
            <div className="space-y-3 pt-2 border-t border-slate-100">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Endpoint URL (Wajib)</label>
                <input 
                  type="text" 
                  value={form.extra_config?.endpoint || ''} 
                  onChange={e => setForm(p => ({ ...p, extra_config: { ...p.extra_config, endpoint: e.target.value } }))}
                  placeholder="Contoh: https://<account_id>.r2.cloudflarestorage.com"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 font-semibold" 
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Nama Bucket (Wajib)</label>
                <input 
                  type="text" 
                  value={form.extra_config?.bucket || ''} 
                  onChange={e => setForm(p => ({ ...p, extra_config: { ...p.extra_config, bucket: e.target.value } }))}
                  placeholder="Contoh: kurmon-backup-bucket"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 font-semibold" 
                />
              </div>
            </div>
          )}

          <label className="flex items-center gap-2.5 cursor-pointer p-3 rounded-xl bg-slate-50 border border-slate-100 hover:bg-slate-100/50 transition-colors">
            <input 
              type="checkbox" 
              checked={form.is_active} 
              onChange={e => setForm(p => ({ ...p, is_active: e.target.checked }))} 
              className="w-4 h-4 accent-emerald-600 rounded" 
            />
            <div>
              <span className="font-extrabold text-slate-800 text-xs">Aktifkan Integrasi</span>
              <p className="text-[10.5px] text-slate-400 font-semibold">Fitur yang menggunakan key ini dapat berjalan.</p>
            </div>
          </label>

          <div className="pt-3 flex justify-end gap-2 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setShowModal(false)}
              className="py-2 px-4 rounded-xl font-bold text-xs bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors cursor-pointer"
            >
              Batal
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="py-2 px-4 rounded-xl font-black text-xs bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
            >
              <ShieldCheck size={14} />
              <span>Simpan Key</span>
            </button>
          </div>
        </div>
      </Modal>

      {/* VERIFIKASI HAPUS MODAL */}
      <Modal isOpen={!!deleteTarget} onClose={() => setDeleteTarget(null)} title="Konfirmasi Hapus API Key" maxWidth="max-w-md">
        <div className="space-y-4 text-xs font-semibold text-slate-600">
          <div className="flex items-center gap-3 p-3 bg-rose-50 border border-rose-100 rounded-xl text-rose-800">
            <AlertTriangle size={24} className="shrink-0 text-rose-600" />
            <div>
              <p className="font-black text-xs">Hapus API Key {deleteTarget?.service_label}?</p>
              <p className="text-[11px] text-rose-700 mt-0.5">Integrasi yang membutuhkan token ini akan terhenti.</p>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setDeleteTarget(null)}
              className="py-2 px-4 rounded-xl font-bold text-xs bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors cursor-pointer"
            >
              Batal
            </button>
            <button
              type="button"
              onClick={confirmDelete}
              className="py-2 px-4 rounded-xl font-black text-xs bg-rose-600 hover:bg-rose-700 text-white transition-colors cursor-pointer shadow-xs"
            >
              Ya, Hapus
            </button>
          </div>
        </div>
      </Modal>

      {/* TOAST */}
      {toast && (
        <div className={`fixed bottom-6 right-6 px-4 py-3 rounded-xl shadow-lg font-bold text-xs flex items-center gap-2 animate-in slide-in-from-bottom-5 text-white z-50 ${toast.type === 'error' ? 'bg-rose-600' : 'bg-emerald-600'}`}>
          {toast.type === 'error' ? <AlertCircle size={16} /> : <CheckCircle2 size={16} />} {toast.message}
        </div>
      )}
    </div>
  );
}
