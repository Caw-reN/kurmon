import { useState, useEffect, useMemo } from 'react';
import { 
  Key, Wifi, MessageSquare, HardDrive, Send, Cloud, Settings, 
  LayoutDashboard, KeyRound, DatabaseBackup, CheckCircle2, EyeOff, 
  Eye, RefreshCw, Edit2, Trash2, ShieldCheck, AlertCircle, 
  Plus, AlertTriangle, Copy, Check, Search, Shield, Server,
  Sparkles, ExternalLink, Lock, Info
} from 'lucide-react';
import useAuthStore from '../../../store/monitoring/authStore.js';
import { PageHeader } from '../../../components/monitoring/ui/index.js';
import { Modal } from '../../../components/ui.jsx';
import { CustomSelect } from '../../../components/CustomSelect.jsx';

const SERVICE_PRESETS = [
  { 
    service_name_prefix: 'whatsapp_fonnte', 
    service_label: 'WhatsApp (Fonnte)', 
    category: 'Pesan & Notifikasi',
    icon: MessageSquare, 
    color: 'emerald', 
    description: 'API Gateway WhatsApp untuk notifikasi otomatis presensi, broadcast, dan alert. Daftar di fonnte.com.', 
    placeholder_key: 'TOKEN_FONNTE_ANDA',
    docs_url: 'https://fonnte.com'
  },
  { 
    service_name_prefix: 'whatsapp_official', 
    service_label: 'WhatsApp Cloud API (Meta)', 
    category: 'Pesan & Notifikasi',
    icon: MessageSquare, 
    color: 'emerald', 
    description: 'API Resmi dari Meta Developer. Membutuhkan Phone Number ID dan System User Access Token.', 
    placeholder_key: 'ACCESS_TOKEN_META',
    docs_url: 'https://developers.facebook.com'
  },
  { 
    service_name_prefix: 'telegram_backup', 
    service_label: 'Telegram Auto-Backup', 
    category: 'Pencadangan Cloud',
    icon: Send, 
    color: 'sky', 
    description: 'Kirim file database dan laporan terenkripsi otomatis ke Channel / Grup Telegram Anda.', 
    placeholder_key: 'BOT_TOKEN_DARI_BOTFATHER',
    docs_url: 'https://t.me/BotFather'
  },
  { 
    service_name_prefix: 'google_drive', 
    service_label: 'Google Drive Cloud', 
    category: 'Pencadangan Cloud',
    icon: HardDrive, 
    color: 'teal', 
    description: 'Penyimpanan cadangan otomatis ke Google Drive menggunakan Google Cloud Service Account.', 
    placeholder_key: 'SERVICE_ACCOUNT_JSON_atau_CLIENT_ID',
    docs_url: 'https://console.cloud.google.com'
  },
  { 
    service_name_prefix: 'cloudflare_r2', 
    service_label: 'Cloudflare R2 Storage', 
    category: 'Pencadangan Cloud',
    icon: Cloud, 
    color: 'amber', 
    description: 'Penyimpanan S3-compatible berkecepatan tinggi, gratis 10GB dan tanpa biaya transfer egress.', 
    placeholder_key: '{"accessKeyId":"...","secretAccessKey":"..."}',
    docs_url: 'https://dash.cloudflare.com'
  },
  { 
    service_name_prefix: 'hikvision_master', 
    service_label: 'Hikvision Presensi', 
    category: 'Hardware & Mesin',
    icon: Wifi, 
    color: 'indigo', 
    description: 'Integrasi mesin presensi biometrik & fingerprint Hikvision untuk sinkronisasi absensi real-time.', 
    placeholder_key: 'IP_MESIN:PORT'
  },
  { 
    service_name_prefix: 'custom', 
    service_label: 'API Kustom / Lainnya', 
    category: 'Eksternal',
    icon: Key, 
    color: 'purple', 
    description: 'Tambahkan token otorisasi atau integrasi pihak ketiga mandiri lainnya ke dalam sistem.', 
    placeholder_key: 'API_KEY_ANDA'
  },
];

const COLOR_MAP = { 
  emerald: { 
    bg: 'bg-emerald-50 text-emerald-600 border-emerald-200/80', 
    iconBg: 'bg-emerald-100/70 text-emerald-700',
    badge: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    ring: 'focus:ring-emerald-500/20'
  }, 
  sky: { 
    bg: 'bg-sky-50 text-sky-600 border-sky-200/80', 
    iconBg: 'bg-sky-100/70 text-sky-700',
    badge: 'bg-sky-50 text-sky-700 border-sky-200',
    ring: 'focus:ring-sky-500/20'
  }, 
  teal: { 
    bg: 'bg-teal-50 text-teal-600 border-teal-200/80', 
    iconBg: 'bg-teal-100/70 text-teal-700',
    badge: 'bg-teal-50 text-teal-700 border-teal-200',
    ring: 'focus:ring-teal-500/20'
  }, 
  amber: { 
    bg: 'bg-amber-50 text-amber-600 border-amber-200/80', 
    iconBg: 'bg-amber-100/70 text-amber-700',
    badge: 'bg-amber-50 text-amber-700 border-amber-200',
    ring: 'focus:ring-amber-500/20'
  }, 
  indigo: { 
    bg: 'bg-indigo-50 text-indigo-600 border-indigo-200/80', 
    iconBg: 'bg-indigo-100/70 text-indigo-700',
    badge: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    ring: 'focus:ring-indigo-500/20'
  }, 
  purple: { 
    bg: 'bg-purple-50 text-purple-600 border-purple-200/80', 
    iconBg: 'bg-purple-100/70 text-purple-700',
    badge: 'bg-purple-50 text-purple-700 border-purple-200',
    ring: 'focus:ring-purple-500/20'
  } 
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
  const [copiedId, setCopiedId] = useState(null);
  const [toast, setToast] = useState(null);
  const [isTesting, setIsTesting] = useState(false);
  
  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // 'all' | 'active' | 'inactive'

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
    setForm({ 
      service_name: key.service_name, 
      service_label: key.service_label, 
      api_key: '********', 
      is_active: key.is_active, 
      extra_config: key.extra_config || {} 
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.service_name || !form.service_label) return showToast('Nama service dan label wajib diisi.', 'error');
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
        showToast(editingKey ? 'Kredensial API berhasil diperbarui!' : 'Integrasi API baru berhasil ditambahkan!'); 
        setShowModal(false); 
        fetchKeys(); 
      } else {
        showToast(data.error || 'Gagal menyimpan konfigurasi API Key.', 'error');
      }
    } catch (e) { 
      showToast('Terjadi kesalahan koneksi ke server.', 'error'); 
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
      showToast('API Key berhasil dihapus dari sistem!'); 
      fetchKeys();
    } catch (e) { 
      showToast('Gagal menghapus API Key.', 'error'); 
    } finally {
      setDeleteTarget(null);
    }
  };

  const handleCopyKey = (keyItem) => {
    if (!keyItem.api_key) return;
    navigator.clipboard.writeText(keyItem.api_key);
    setCopiedId(keyItem.id);
    showToast(`Token ${keyItem.service_label} berhasil disalin!`);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleTestWA = async () => {
    setIsTesting(true);
    try {
      const res = await fetch('/api/whatsapp/send', {
        method: 'POST', 
        headers: { Authorization: `Bearer ${authToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: '628123456789', message: '✅ Tes koneksi WhatsApp dari Sistem Sekolah berhasil!', trigger_type: 'test' }),
      });
      const data = await res.json();
      if (data.ok) showToast('Pesan uji coba WA terkirim! Periksa perangkat WhatsApp tujuan.');
      else showToast(data.error || 'Uji coba gagal. Periksa kembali token API WhatsApp Anda.', 'error');
    } catch (e) { 
      showToast('Gagal terhubung ke gateway WhatsApp.', 'error'); 
    } finally {
      setIsTesting(false);
    }
  };

  const getPresetInfo = (service_name) => {
    const preset = SERVICE_PRESETS.find(p => service_name.startsWith(p.service_name_prefix));
    return preset || SERVICE_PRESETS.find(p => p.service_name_prefix === 'custom');
  };

  // Filtered keys
  const filteredKeys = useMemo(() => {
    return keys.filter(k => {
      const matchesSearch = 
        k.service_label?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        k.service_name?.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesStatus = 
        statusFilter === 'all' ? true :
        statusFilter === 'active' ? k.is_active :
        !k.is_active;

      return matchesSearch && matchesStatus;
    });
  }, [keys, searchQuery, statusFilter]);

  const activeCount = keys.filter(k => k.is_active).length;

  return (
    <div className="space-y-6 relative animate-in fade-in duration-300 z-10">
      <PageHeader 
        title="Manajemen API Key & Integrasi"
        description="Kelola seluruh kredensial, token pihak ketiga, dan integrasi cloud sekolah di satu tempat yang aman dan terpusat."
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

      {/* KPI METRIC CARDS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="p-4 rounded-[var(--ui-radius-card)] bg-white border border-slate-200/80 shadow-xs flex items-center gap-3.5 hover:shadow-sm transition-all">
          <div className="w-11 h-11 rounded-[var(--ui-radius-small)] bg-emerald-50 text-emerald-600 border border-emerald-100 flex items-center justify-center shrink-0">
            <CheckCircle2 size={22} />
          </div>
          <div className="min-w-0">
            <p className="text-[10.5px] font-black uppercase tracking-wider text-slate-400">Integrasi Aktif</p>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-xl font-black text-slate-800">{activeCount}</span>
              <span className="inline-flex items-center px-1.5 py-0.5 rounded-[var(--ui-radius-pill)] text-[9px] font-bold bg-emerald-100 text-emerald-700">
                Live
              </span>
            </div>
          </div>
        </div>

        <div className="p-4 rounded-[var(--ui-radius-card)] bg-white border border-slate-200/80 shadow-xs flex items-center gap-3.5 hover:shadow-sm transition-all">
          <div className="w-11 h-11 rounded-[var(--ui-radius-small)] bg-indigo-50 text-indigo-600 border border-indigo-100 flex items-center justify-center shrink-0">
            <KeyRound size={22} />
          </div>
          <div className="min-w-0">
            <p className="text-[10.5px] font-black uppercase tracking-wider text-slate-400">Total Kunci</p>
            <p className="text-xl font-black text-slate-800 mt-0.5">{keys.length} <span className="text-xs font-semibold text-slate-400">Service</span></p>
          </div>
        </div>

        <div className="p-4 rounded-[var(--ui-radius-card)] bg-white border border-slate-200/80 shadow-xs flex items-center gap-3.5 hover:shadow-sm transition-all">
          <div className="w-11 h-11 rounded-[var(--ui-radius-small)] bg-amber-50 text-amber-600 border border-amber-100 flex items-center justify-center shrink-0">
            <Server size={22} />
          </div>
          <div className="min-w-0">
            <p className="text-[10.5px] font-black uppercase tracking-wider text-slate-400">Pilihan Integrasi</p>
            <p className="text-xl font-black text-slate-800 mt-0.5">{SERVICE_PRESETS.length} <span className="text-xs font-semibold text-slate-400">Preset</span></p>
          </div>
        </div>

        <div className="p-4 rounded-[var(--ui-radius-card)] bg-white border border-slate-200/80 shadow-xs flex items-center gap-3.5 hover:shadow-sm transition-all">
          <div className="w-11 h-11 rounded-[var(--ui-radius-small)] bg-purple-50 text-purple-600 border border-purple-100 flex items-center justify-center shrink-0">
            <ShieldCheck size={22} />
          </div>
          <div className="min-w-0">
            <p className="text-[10.5px] font-black uppercase tracking-wider text-slate-400">Keamanan Token</p>
            <p className="text-xs font-black text-purple-700 mt-1 flex items-center gap-1">
              <Lock size={12} /> Masking Aktif
            </p>
          </div>
        </div>
      </div>

      {/* QUICK ADD PRESETS GRID */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-black text-slate-600 uppercase tracking-wider flex items-center gap-2">
            <Sparkles size={14} className="text-emerald-500" />
            Integrasi Layanan Terpopuler
          </h3>
          <span className="text-[11px] font-semibold text-slate-400">Klik layanan untuk konfigurasi cepat</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {SERVICE_PRESETS.map(preset => {
            const Icon = preset.icon;
            const isConfigured = keys.some(k => k.service_name.startsWith(preset.service_name_prefix));
            const colorCfg = COLOR_MAP[preset.color] || COLOR_MAP.purple;
            
            return (
              <button 
                type="button"
                key={preset.service_name_prefix} 
                onClick={() => openAdd(preset)}
                className={`group w-full text-left p-4 rounded-[var(--ui-radius-card)] border transition-all duration-200 cursor-pointer flex flex-col justify-between gap-3 shadow-xs hover:shadow-md hover:-translate-y-0.5 relative overflow-hidden ${
                  isConfigured 
                    ? 'border-emerald-200/90 bg-gradient-to-br from-emerald-50/40 via-white to-white' 
                    : 'border-slate-200/80 bg-white hover:border-slate-300'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-[var(--ui-radius-small)] flex items-center justify-center border shrink-0 transition-transform group-hover:scale-105 ${colorCfg.bg}`}>
                      <Icon size={20} />
                    </div>
                    <div>
                      <span className="text-[9.5px] font-black uppercase tracking-wider text-slate-400 block">{preset.category}</span>
                      <h4 className="font-extrabold text-slate-800 text-sm tracking-tight leading-snug group-hover:text-emerald-700 transition-colors">
                        {preset.service_label}
                      </h4>
                    </div>
                  </div>

                  {isConfigured ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-[var(--ui-radius-pill)] text-[10px] font-black bg-emerald-100 text-emerald-700 border border-emerald-200 shrink-0">
                      <CheckCircle2 size={11} className="text-emerald-600" />
                      <span>Terkonfigurasi</span>
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-[var(--ui-radius-pill)] text-[10px] font-bold bg-slate-100 text-slate-500 border border-slate-200/80 shrink-0 group-hover:bg-emerald-50 group-hover:text-emerald-600 group-hover:border-emerald-200 transition-colors">
                      <Plus size={11} />
                      <span>Konfigurasi</span>
                    </span>
                  )}
                </div>

                <p className="text-xs text-slate-500 font-medium leading-relaxed line-clamp-2">
                  {preset.description}
                </p>

                <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] font-bold text-slate-400 group-hover:text-slate-600">
                  <span>ID: <code className="font-mono text-[10px] text-slate-500">{preset.service_name_prefix}</code></span>
                  <span className="flex items-center gap-1 text-emerald-600 group-hover:translate-x-0.5 transition-transform">
                    Atur Kredensial &rarr;
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* CONFIGURED KEYS SECTION */}
      <div className="bg-white rounded-[var(--ui-radius-card)] border border-slate-200/80 shadow-xs overflow-hidden">
        {/* Header Toolbar */}
        <div className="p-4 border-b border-slate-100 bg-slate-50/70 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-[var(--ui-radius-small)] bg-emerald-600 text-white flex items-center justify-center font-bold text-xs shadow-xs">
              <KeyRound size={16} />
            </div>
            <div>
              <h3 className="font-extrabold text-slate-800 text-sm">
                Daftar Kunci & Token Terkonfigurasi
              </h3>
              <p className="text-[11px] font-medium text-slate-400">
                Menampilkan {filteredKeys.length} dari total {keys.length} kredensial tersimpan
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2 flex-wrap">
            {/* Search Input */}
            <div className="relative flex-1 sm:w-56">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input 
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Cari service..."
                className="w-full pl-8 pr-3 py-1.5 bg-white border border-slate-200 rounded-[var(--ui-radius-small)] text-xs font-semibold placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              />
            </div>

            {/* Filter Status */}
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="py-1.5 px-3 bg-white border border-slate-200 rounded-[var(--ui-radius-small)] text-xs font-bold text-slate-600 focus:outline-none cursor-pointer"
            >
              <option value="all">Semua Status</option>
              <option value="active">Aktif Saja</option>
              <option value="inactive">Nonaktif</option>
            </select>

            {/* Add Custom Button */}
            <button
              type="button"
              onClick={() => openAdd(null)}
              className="py-1.5 px-3.5 rounded-[var(--ui-radius-small)] font-bold text-xs bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs shrink-0"
            >
              <Plus size={14} />
              <span>Key Kustom</span>
            </button>
          </div>
        </div>

        {/* Content Body */}
        {isLoading ? (
          <div className="p-12 text-center text-slate-400 flex flex-col items-center gap-3">
            <RefreshCw size={28} className="animate-spin text-emerald-600" />
            <p className="font-bold text-xs text-slate-500">Memuat konfigurasi API Key...</p>
          </div>
        ) : filteredKeys.length === 0 ? (
          <div className="p-12 text-center text-slate-400 space-y-2.5">
            <Key size={42} className="mx-auto text-slate-300" />
            <p className="font-bold text-sm text-slate-700">Tidak Ada Kunci Ditemukan</p>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              {searchQuery || statusFilter !== 'all' 
                ? 'Tidak ada hasil yang sesuai dengan filter pencarian Anda.' 
                : 'Belum ada API Key yang tersimpan. Klik salah satu integrasi populer di atas untuk memulai.'}
            </p>
          </div>
        ) : (
          <>
            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/50 text-[10.5px] font-black uppercase tracking-wider text-slate-400">
                    <th className="px-5 py-3">Layanan & Service ID</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Token / Nilai Kredensial</th>
                    <th className="px-4 py-3">Terakhir Diperbarui</th>
                    <th className="px-5 py-3 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredKeys.map(key => {
                    const preset = getPresetInfo(key.service_name);
                    const Icon = preset?.icon || Key;
                    const style = COLOR_MAP[preset?.color] || COLOR_MAP.purple;
                    const isRevealed = showKey[key.id];
                    const isCopied = copiedId === key.id;

                    return (
                      <tr key={key.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-3">
                            <div className={`w-9 h-9 rounded-[var(--ui-radius-small)] flex items-center justify-center border shrink-0 ${style.bg}`}>
                              <Icon size={18} />
                            </div>
                            <div>
                              <span className="font-extrabold text-slate-800 text-xs block">{key.service_label}</span>
                              <code className="text-[10px] font-mono text-slate-400 font-semibold">{key.service_name}</code>
                            </div>
                          </div>
                        </td>

                        <td className="px-4 py-3.5">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-[var(--ui-radius-pill)] text-[10px] font-black uppercase tracking-wider border ${
                            key.is_active 
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                              : 'bg-slate-100 text-slate-500 border-slate-200'
                          }`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${key.is_active ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`} />
                            {key.is_active ? 'Aktif' : 'Nonaktif'}
                          </span>
                        </td>

                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-2">
                            <span className="text-[11px] font-mono text-slate-600 font-semibold bg-slate-100 px-2.5 py-1 rounded-[var(--ui-radius-small)] border border-slate-200/80 select-all">
                              {isRevealed 
                                ? (key.api_key || '••••••••••••••••••••') 
                                : '••••••••••••••••••••'}
                            </span>
                            
                            {/* Toggle Reveal */}
                            <button 
                              type="button" 
                              onClick={() => setShowKey(prev => ({ ...prev, [key.id]: !prev[key.id] }))} 
                              className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-[var(--ui-radius-small)] transition-colors border-none bg-transparent cursor-pointer"
                              title={isRevealed ? "Sembunyikan Token" : "Tampilkan Token"}
                            >
                              {isRevealed ? <EyeOff size={14} /> : <Eye size={14} />}
                            </button>

                            {/* Copy Token */}
                            <button 
                              type="button" 
                              onClick={() => handleCopyKey(key)} 
                              className={`p-1.5 rounded-[var(--ui-radius-small)] transition-colors border-none cursor-pointer ${
                                isCopied ? 'bg-emerald-100 text-emerald-700' : 'text-slate-400 hover:text-slate-700 hover:bg-slate-100 bg-transparent'
                              }`}
                              title="Salin Token"
                            >
                              {isCopied ? <Check size={14} /> : <Copy size={14} />}
                            </button>
                          </div>
                        </td>

                        <td className="px-4 py-3.5 text-slate-500 text-[11px] font-medium">
                          {new Date(key.updated_at).toLocaleDateString('id-ID', { 
                            day: '2-digit', month: 'short', year: 'numeric', 
                            hour: '2-digit', minute: '2-digit' 
                          })}
                        </td>

                        <td className="px-5 py-3.5 text-right">
                          <div className="inline-flex items-center gap-1.5">
                            {key.service_name.startsWith('whatsapp') && key.is_active && (
                              <button 
                                type="button"
                                onClick={handleTestWA} 
                                disabled={isTesting}
                                className="py-1 px-2.5 rounded-[var(--ui-radius-small)] font-bold text-[11px] bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 flex items-center gap-1 transition-colors cursor-pointer disabled:opacity-50"
                              >
                                <RefreshCw size={11} className={isTesting ? 'animate-spin' : ''} />
                                <span>Test WA</span>
                              </button>
                            )}
                            
                            <button
                              type="button"
                              onClick={() => openEdit(key)}
                              className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-[var(--ui-radius-small)] transition-colors border-none bg-transparent cursor-pointer"
                              title="Edit Konfigurasi"
                            >
                              <Edit2 size={14} />
                            </button>
                            <button
                              type="button"
                              onClick={() => setDeleteTarget(key)}
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-[var(--ui-radius-small)] transition-colors border-none bg-transparent cursor-pointer"
                              title="Hapus Kunci"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile Card List View */}
            <div className="md:hidden divide-y divide-slate-100">
              {filteredKeys.map(key => {
                const preset = getPresetInfo(key.service_name);
                const Icon = preset?.icon || Key;
                const style = COLOR_MAP[preset?.color] || COLOR_MAP.purple;
                const isRevealed = showKey[key.id];
                const isCopied = copiedId === key.id;

                return (
                  <div key={key.id} className="p-4 space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <div className={`w-9 h-9 rounded-[var(--ui-radius-small)] flex items-center justify-center border shrink-0 ${style.bg}`}>
                          <Icon size={17} />
                        </div>
                        <div>
                          <h4 className="font-extrabold text-slate-800 text-xs">{key.service_label}</h4>
                          <code className="text-[10px] font-mono text-slate-400 font-semibold">{key.service_name}</code>
                        </div>
                      </div>

                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-[var(--ui-radius-pill)] text-[9.5px] font-black uppercase tracking-wider border ${
                        key.is_active 
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                          : 'bg-slate-100 text-slate-500 border-slate-200'
                      }`}>
                        {key.is_active ? 'Aktif' : 'Nonaktif'}
                      </span>
                    </div>

                    {/* Token container */}
                    <div className="flex items-center justify-between gap-2 p-2 bg-slate-50 rounded-[var(--ui-radius-small)] border border-slate-200/70">
                      <span className="text-[11px] font-mono text-slate-600 font-semibold truncate">
                        {isRevealed ? (key.api_key || '••••••••') : '••••••••••••••••••••'}
                      </span>
                      <div className="flex items-center gap-1 shrink-0">
                        <button 
                          type="button" 
                          onClick={() => setShowKey(prev => ({ ...prev, [key.id]: !prev[key.id] }))} 
                          className="p-1 text-slate-400 hover:text-slate-700 rounded bg-transparent border-none cursor-pointer"
                        >
                          {isRevealed ? <EyeOff size={13} /> : <Eye size={13} />}
                        </button>
                        <button 
                          type="button" 
                          onClick={() => handleCopyKey(key)} 
                          className="p-1 text-slate-400 hover:text-slate-700 rounded bg-transparent border-none cursor-pointer"
                        >
                          {isCopied ? <Check size={13} className="text-emerald-600" /> : <Copy size={13} />}
                        </button>
                      </div>
                    </div>

                    {/* Footer Actions */}
                    <div className="flex items-center justify-between pt-1">
                      <span className="text-[10px] font-medium text-slate-400">
                        Diperbarui: {new Date(key.updated_at).toLocaleDateString('id-ID', { day: '2-digit', month: 'short' })}
                      </span>
                      <div className="flex items-center gap-1.5">
                        {key.service_name.startsWith('whatsapp') && key.is_active && (
                          <button 
                            type="button"
                            onClick={handleTestWA}
                            disabled={isTesting}
                            className="py-1 px-2.5 rounded-[var(--ui-radius-small)] font-bold text-[11px] bg-emerald-50 text-emerald-700 border border-emerald-200"
                          >
                            Test WA
                          </button>
                        )}
                        <button 
                          type="button"
                          onClick={() => openEdit(key)}
                          className="p-1.5 text-slate-500 hover:bg-slate-100 rounded-[var(--ui-radius-small)] bg-transparent border-none cursor-pointer"
                        >
                          <Edit2 size={13} />
                        </button>
                        <button 
                          type="button"
                          onClick={() => setDeleteTarget(key)}
                          className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-[var(--ui-radius-small)] bg-transparent border-none cursor-pointer"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* ADD / EDIT MODAL */}
      <Modal 
        isOpen={showModal} 
        onClose={() => setShowModal(false)} 
        title={editingKey ? `Edit Kredensial: ${form.service_label}` : `Konfigurasi Integrasi: ${selectedPreset?.service_label || 'Key Kustom'}`} 
        maxWidth="max-w-lg"
      >
        <div className="space-y-4 text-xs font-semibold text-slate-600">
          {selectedPreset && (
            <div className="p-3.5 bg-slate-50/80 rounded-[var(--ui-radius-small)] border border-slate-200/80 text-xs text-slate-600 font-medium leading-relaxed flex items-start gap-3">
              <div className="w-6 h-6 rounded bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 font-bold mt-0.5">
                <Info size={14} />
              </div>
              <div className="space-y-1">
                <p>{selectedPreset.description}</p>
                {selectedPreset.docs_url && (
                  <a 
                    href={selectedPreset.docs_url} 
                    target="_blank" 
                    rel="noreferrer" 
                    className="inline-flex items-center gap-1 text-emerald-600 hover:text-emerald-700 font-bold text-[11px] mt-1"
                  >
                    Dokumentasi Resmi <ExternalLink size={10} />
                  </a>
                )}
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[10.5px] font-black text-slate-500 uppercase tracking-wider mb-1.5">
                Service ID (Sistem)
              </label>
              <input 
                type="text" 
                value={form.service_name} 
                onChange={e => setForm(p => ({ ...p, service_name: e.target.value.toLowerCase().replace(/\s/g, '_') }))}
                disabled={!!selectedPreset && selectedPreset.service_name_prefix !== 'custom' && !selectedPreset.service_name_prefix.startsWith('whatsapp')}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-[var(--ui-radius-small)] text-xs font-mono focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 disabled:opacity-60 font-semibold" 
              />
            </div>

            <div>
              <label className="block text-[10.5px] font-black text-slate-500 uppercase tracking-wider mb-1.5">
                Label Tampilan
              </label>
              <input 
                type="text" 
                value={form.service_label} 
                onChange={e => setForm(p => ({ ...p, service_label: e.target.value }))}
                placeholder="Contoh: WhatsApp Guru Piket"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-[var(--ui-radius-small)] text-xs font-semibold focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20" 
              />
            </div>
          </div>

          <div>
            <label className="block text-[10.5px] font-black text-slate-500 uppercase tracking-wider mb-1.5">
              Kunci / Token Rahasia (API Key)
            </label>
            <div className="relative">
              <input 
                type={showKey.modal ? 'text' : 'password'} 
                value={form.api_key} 
                onChange={e => setForm(p => ({ ...p, api_key: e.target.value }))}
                placeholder={selectedPreset?.placeholder_key || 'Masukkan token atau API key rahasia...'}
                className="w-full px-3 py-2.5 pr-10 bg-slate-50 border border-slate-200 rounded-[var(--ui-radius-small)] text-xs font-mono focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 font-semibold" 
              />
              <button 
                type="button" 
                onClick={() => setShowKey(p => ({ ...p, modal: !p.modal }))} 
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 border-none bg-transparent cursor-pointer"
                title={showKey.modal ? "Sembunyikan" : "Tampilkan"}
              >
                {showKey.modal ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
            <p className="text-[10.5px] text-slate-400 font-medium mt-1">
              Token akan dienkripsi dan disimpan secara aman di database server sekolah.
            </p>
          </div>

          {/* EXTRA CONFIGURATION FIELDS */}
          {form.service_name.startsWith('telegram') && (
            <div className="p-3 bg-sky-50/40 rounded-[var(--ui-radius-small)] border border-sky-100 space-y-2">
              <label className="block text-[10.5px] font-black text-sky-800 uppercase tracking-wider">Target Chat ID</label>
              <input 
                type="text" 
                value={form.extra_config?.chat_id || ''} 
                onChange={e => setForm(p => ({ ...p, extra_config: { ...p.extra_config, chat_id: e.target.value } }))}
                placeholder="Contoh: 123456789 atau -100123456789"
                className="w-full px-3 py-2 bg-white border border-sky-200 rounded-[var(--ui-radius-small)] text-xs font-mono focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-500/20 font-semibold" 
              />
              <p className="text-[10px] text-slate-500 font-medium">ID personal atau grup (biasanya berawalan -100) sebagai target utama notifikasi bot.</p>
            </div>
          )}

          {form.service_name.startsWith('whatsapp') && (
            <div className="p-3 bg-emerald-50/40 rounded-[var(--ui-radius-small)] border border-emerald-100 space-y-2">
              <label className="block text-[10.5px] font-black text-emerald-800 uppercase tracking-wider">Peruntukan Jurusan</label>
              <CustomSelect
                value={form.extra_config?.jurusan || 'default'}
                onChange={val => setForm(p => ({ ...p, extra_config: { ...p.extra_config, jurusan: val } }))}
                searchable={false}
                options={[
                  { value: 'default', label: 'Default / Semua Jurusan' },
                  ...jurusans.map(j => ({ value: j.kode, label: `${j.kode} - ${j.nama}` }))
                ]}
              />
              <p className="text-[10px] text-slate-500 font-medium">Jika diisi jurusan tertentu, notifikasi siswa/guru jurusan tersebut akan otomatis dialihkan ke nomor WhatsApp ini.</p>
            </div>
          )}

          {form.service_name.startsWith('whatsapp_official') && (
            <div>
              <label className="block text-[10.5px] font-black text-slate-500 uppercase tracking-wider mb-1.5">Phone Number ID (Meta Wajib)</label>
              <input 
                type="text" 
                value={form.extra_config?.phone_number_id || ''} 
                onChange={e => setForm(p => ({ ...p, extra_config: { ...p.extra_config, phone_number_id: e.target.value } }))}
                placeholder="Contoh: 104829104829"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-[var(--ui-radius-small)] text-xs font-mono focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 font-semibold" 
              />
            </div>
          )}

          {form.service_name === 'google_drive' && (
            <div>
              <label className="block text-[10.5px] font-black text-slate-500 uppercase tracking-wider mb-1.5">Folder ID Google Drive</label>
              <input 
                type="text" 
                value={form.extra_config?.folder_id || ''} 
                onChange={e => setForm(p => ({ ...p, extra_config: { ...p.extra_config, folder_id: e.target.value } }))}
                placeholder="Contoh: 1A2b3C4d5E6f7G8h9I0j"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-[var(--ui-radius-small)] text-xs font-mono focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 font-semibold" 
              />
              <p className="text-[10px] text-slate-400 mt-1 font-medium">Buat folder di GDrive, bagikan akses Editor ke email Service Account Anda, lalu tempelkan ID folder di sini.</p>
            </div>
          )}

          {form.service_name === 'telegram_backup' && (
            <div>
              <label className="block text-[10.5px] font-black text-slate-500 uppercase tracking-wider mb-1.5">Chat ID Telegram (Wajib)</label>
              <input 
                type="text" 
                value={form.extra_config?.chat_id || ''} 
                onChange={e => setForm(p => ({ ...p, extra_config: { ...p.extra_config, chat_id: e.target.value } }))}
                placeholder="Contoh: 123456789 atau -100987654321"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-[var(--ui-radius-small)] text-xs font-mono focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 font-semibold" 
              />
              <p className="text-[10px] text-slate-400 mt-1 font-medium">ID akun Telegram Anda atau ID Grup tempat bot ditambahkan.</p>
            </div>
          )}

          {form.service_name === 'cloudflare_r2' && (
            <div className="space-y-3 pt-2 border-t border-slate-100">
              <div>
                <label className="block text-[10.5px] font-black text-slate-500 uppercase tracking-wider mb-1.5">Endpoint S3 URL</label>
                <input 
                  type="text" 
                  value={form.extra_config?.endpoint || ''} 
                  onChange={e => setForm(p => ({ ...p, extra_config: { ...p.extra_config, endpoint: e.target.value } }))}
                  placeholder="https://<account_id>.r2.cloudflarestorage.com"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-[var(--ui-radius-small)] text-xs font-mono focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 font-semibold" 
                />
              </div>
              <div>
                <label className="block text-[10.5px] font-black text-slate-500 uppercase tracking-wider mb-1.5">Nama Bucket R2</label>
                <input 
                  type="text" 
                  value={form.extra_config?.bucket || ''} 
                  onChange={e => setForm(p => ({ ...p, extra_config: { ...p.extra_config, bucket: e.target.value } }))}
                  placeholder="Contoh: kurmon-backup-sekolah"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-[var(--ui-radius-small)] text-xs font-mono focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 font-semibold" 
                />
              </div>
            </div>
          )}

          <label className="flex items-center gap-3 cursor-pointer p-3 rounded-[var(--ui-radius-small)] bg-slate-50 border border-slate-100 hover:bg-slate-100/60 transition-colors">
            <input 
              type="checkbox" 
              checked={form.is_active} 
              onChange={e => setForm(p => ({ ...p, is_active: e.target.checked }))} 
              className="w-4 h-4 accent-emerald-600 rounded" 
            />
            <div>
              <span className="font-black text-slate-800 text-xs block">Aktifkan Kredensial Ini</span>
              <p className="text-[10.5px] text-slate-400 font-medium">Layanan yang membutuhkan integrasi ini dapat langsung menggunakannya.</p>
            </div>
          </label>

          <div className="pt-3 flex justify-end gap-2 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setShowModal(false)}
              className="py-2 px-4 rounded-[var(--ui-radius-small)] font-bold text-xs bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors cursor-pointer"
            >
              Batal
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="py-2 px-5 rounded-[var(--ui-radius-small)] font-black text-xs bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
            >
              <ShieldCheck size={14} />
              <span>Simpan Konfigurasi</span>
            </button>
          </div>
        </div>
      </Modal>

      {/* VERIFIKASI HAPUS MODAL */}
      <Modal isOpen={!!deleteTarget} onClose={() => setDeleteTarget(null)} title="Konfirmasi Hapus API Key" maxWidth="max-w-md">
        <div className="space-y-4 text-xs font-semibold text-slate-600">
          <div className="flex items-start gap-3 p-3.5 bg-rose-50 border border-rose-100 rounded-[var(--ui-radius-small)] text-rose-800">
            <AlertTriangle size={22} className="shrink-0 text-rose-600 mt-0.5" />
            <div>
              <p className="font-black text-xs">Hapus API Key {deleteTarget?.service_label}?</p>
              <p className="text-[11px] text-rose-700 mt-1 leading-relaxed">
                Tindakan ini tidak dapat dibatalkan. Seluruh integrasi dan fitur otomatis yang menggunakan kredensial ini akan terhenti.
              </p>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setDeleteTarget(null)}
              className="py-2 px-4 rounded-[var(--ui-radius-small)] font-bold text-xs bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors cursor-pointer"
            >
              Batal
            </button>
            <button
              type="button"
              onClick={confirmDelete}
              className="py-2 px-4 rounded-[var(--ui-radius-small)] font-black text-xs bg-rose-600 hover:bg-rose-700 text-white transition-colors cursor-pointer shadow-xs"
            >
              Ya, Hapus Kredensial
            </button>
          </div>
        </div>
      </Modal>

      {/* TOAST NOTIFIKASI */}
      {toast && (
        <div className={`fixed bottom-6 right-6 px-4 py-3 rounded-[var(--ui-radius-small)] shadow-md font-bold text-xs flex items-center gap-2 animate-in slide-in-from-bottom-5 text-white z-50 ${toast.type === 'error' ? 'bg-rose-600' : 'bg-emerald-600'}`}>
          {toast.type === 'error' ? <AlertCircle size={16} /> : <CheckCircle2 size={16} />} {toast.message}
        </div>
      )}
    </div>
  );
}
