import { Button } from '../../../components/ui.jsx';
import { useState, useEffect, useMemo } from 'react';
import { BookOpen, ShieldAlert, Award, HelpCircle, Search, Plus, Edit2, Trash2, X, Save, AlertCircle, CheckCircle2, Upload, Download, Calendar, Settings2, ChevronDown, ChevronUp, FileText, Filter } from 'lucide-react';
import useAuthStore from '../../../store/monitoring/authStore.js';
import { useAppStore } from '../../../store/useAppStore.js';
import { PageHeader } from '../../../components/monitoring/ui/index.js';
import { UISelect, Modal } from '../../../components/ui.jsx';

export default function TatibSkorKredit() {
  const [items, setItems] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all'); // 'all','pelanggaran','prestasi'
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [toast, setToast] = useState(null);
  const [showSettingsPanel, setShowSettingsPanel] = useState(false); // Collapsible on mobile

  const [form, setForm] = useState({ nama_tindakan: '', jenis: 'pelanggaran', nilai_poin: 10 });
  const authToken = useAuthStore(state => state.user?.authToken);
  const userRole = useAuthStore(state => state.user?.role || 'guru');
  const isAdmin = ['admin', 'superadmin', 'waka_kesiswaan', 'guru'].includes(userRole);

  const { kedisiplinanSettings, updateKedisiplinanSettings } = useAppStore();
  const [batasPoin, setBatasPoin] = useState(100);
  const [startDate, setStartDate] = useState('2026-08-01');

  const fetchStartDate = async () => {
    try {
      const res = await fetch('/api/kedisiplinan/attendance-start-date', {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      const data = await res.json();
      if (data.ok && data.startDate) setStartDate(data.startDate);
    } catch (e) {}
  };

  useEffect(() => {
    if (authToken) fetchStartDate();
  }, [authToken]);

  const handleUpdateStartDate = async (val) => {
    setStartDate(val);
    try {
      await fetch('/api/kedisiplinan/attendance-start-date', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`
        },
        body: JSON.stringify({ startDate: val })
      });
      showToast('Tanggal mulai hitung absensi diperbarui!');
    } catch (e) {
      showToast('Gagal mengubah tanggal mulai absensi', 'error');
    }
  };

  useEffect(() => {
    if (kedisiplinanSettings?.batasPoinSiswaBermasalah) {
      setBatasPoin(kedisiplinanSettings.batasPoinSiswaBermasalah);
    }
  }, [kedisiplinanSettings]);

  const handleUpdateBatasPoin = (val) => {
    setBatasPoin(val);
    updateKedisiplinanSettings({ batasPoinSiswaBermasalah: val });
  };

  const [hasPdf, setHasPdf] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const checkPdfExists = async () => {
    try {
      const res = await fetch('/api/kedisiplinan/rules.pdf', { method: 'HEAD' });
      setHasPdf(res.ok);
    } catch {
      setHasPdf(false);
    }
  };

  useEffect(() => {
    checkPdfExists();
  }, []);

  const handlePdfUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.type !== 'application/pdf') {
      showToast('File harus format PDF!', 'error');
      return;
    }
    
    setIsUploading(true);
    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const fileData = evt.target.result;
        const res = await fetch('/api/kedisiplinan/upload-rules', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authToken}`
          },
          body: JSON.stringify({
            fileData,
            fileName: file.name
          })
        });
        const data = await res.json();
        if (data.ok) {
          showToast('Dokumen PDF Peraturan berhasil diunggah!');
          setHasPdf(true);
          updateKedisiplinanSettings({ hasRulesPdf: true });
        } else {
          showToast('Gagal mengunggah PDF: ' + (data.error || 'error'), 'error');
        }
      } catch (err) {
        console.error(err);
        showToast('Gagal mengunggah PDF', 'error');
      } finally {
        setIsUploading(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const handlePdfDelete = async () => {
    if (!await window.confirmAsync('Hapus dokumen PDF peraturan ini?')) return;
    try {
      const res = await fetch('/api/kedisiplinan/delete-rules', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${authToken}` }
      });
      if (res.ok) {
        showToast('Dokumen PDF Peraturan dihapus.');
        setHasPdf(false);
        updateKedisiplinanSettings({ hasRulesPdf: false });
      }
    } catch (e) {
      console.error(e);
      showToast('Gagal menghapus PDF', 'error');
    }
  };

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  const fetchData = async () => {
    if (!authToken) return;
    setIsLoading(true);
    try {
      const res = await fetch('/api/kedisiplinan/master', { headers: { Authorization: `Bearer ${authToken}` } });
      const data = await res.json();
      if (data.ok) {
        setItems(data.data || []);
      }
    } catch (e) {
      console.error(e);
      showToast('Gagal memuat tata tertib', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [authToken]);

  // Counts for summary tabs
  const countTotal = items.length;
  const countPelanggaran = useMemo(() => items.filter(i => String(i.jenis || '').toLowerCase() === 'pelanggaran').length, [items]);
  const countPrestasi = useMemo(() => items.filter(i => String(i.jenis || '').toLowerCase() === 'prestasi').length, [items]);

  const filteredItems = useMemo(() => {
    return items.filter(item => {
      const matchSearch = !searchTerm || item.nama_tindakan?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchType = filterType === 'all' || String(item.jenis || '').toLowerCase() === filterType.toLowerCase();
      return matchSearch && matchType;
    });
  }, [items, searchTerm, filterType]);

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.nama_tindakan.trim()) return showToast('Nama tindakan wajib diisi', 'error');
    if (form.nilai_poin <= 0) return showToast('Skor poin harus lebih besar dari 0', 'error');

    try {
      const res = await fetch('/api/kedisiplinan/master', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authToken}` },
        body: JSON.stringify(editingItem ? { ...form, id: editingItem.id } : form)
      });
      const data = await res.json();
      if (data.ok) {
        showToast(editingItem ? 'Tata tertib diperbarui!' : 'Tata tertib ditambahkan!');
        setShowModal(false);
        fetchData();
      } else {
        showToast('Gagal menyimpan: ' + (data.error || ''), 'error');
      }
    } catch (e) {
      console.error(e);
      showToast('Terjadi kesalahan', 'error');
    }
  };

  const handleDelete = async (id) => {
    if (!await window.confirmAsync('Hapus aturan tata tertib ini?')) return;
    try {
      const res = await fetch('/api/kedisiplinan/master', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authToken}` },
        body: JSON.stringify({ action: 'delete', id })
      });
      const data = await res.json();
      if (data.ok) {
        showToast('Aturan berhasil dihapus!');
        fetchData();
      } else {
        showToast('Gagal menghapus', 'error');
      }
    } catch (e) {
      console.error(e);
      showToast('Terjadi kesalahan', 'error');
    }
  };

  const openAdd = () => {
    setEditingItem(null);
    setForm({ nama_tindakan: '', jenis: 'pelanggaran', nilai_poin: 10 });
    setShowModal(true);
  };

  const openEdit = (item) => {
    setEditingItem(item);
    setForm({ nama_tindakan: item.nama_tindakan, jenis: String(item.jenis || 'pelanggaran').toLowerCase(), nilai_poin: item.nilai_poin });
    setShowModal(true);
  };

  return (
    <div className="space-y-5 relative animate-in fade-in duration-300 z-10 pb-12">
      {/* Top Header */}
      <PageHeader 
        title="Aturan & Tatib Skor Kredit"
        description="Daftar tata tertib sekolah beserta skor kredit poin pelanggaran dan penghargaan prestasi siswa."
        icon={BookOpen}
      />

      {/* Settings Bar & Collapsible Trigger for Mobile */}
      <div className="bg-white rounded-[var(--ui-radius-card)] p-4 sm:p-5 border border-slate-200/80 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-[var(--ui-radius-small)] bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
              <Settings2 size={18} />
            </div>
            <div>
              <h3 className="text-sm font-extrabold text-slate-800">Parameter & Dokumen Peraturan</h3>
              <p className="text-[11px] text-slate-400 font-medium">Batas poin DO, tanggal mulai absensi, dan PDF Tatib</p>
            </div>
          </div>

          <button 
            onClick={() => setShowSettingsPanel(!showSettingsPanel)}
            className="md:hidden flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-[var(--ui-radius-small)] transition-all"
          >
            {showSettingsPanel ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            {showSettingsPanel ? 'Sembunyikan' : 'Atur Parameter'}
          </button>
        </div>

        {/* Setting Cards Container (Always visible on Desktop, Collapsible on Mobile) */}
        <div className={`${showSettingsPanel ? 'block' : 'hidden md:grid'} grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-1 border-t border-slate-100`}>
          {/* Card 1: Tingkat Pelanggaran */}
          <div className="p-3.5 rounded-[var(--ui-radius-small)] bg-red-50/70 border border-red-100 flex items-center gap-3">
            <div className="w-10 h-10 rounded-[var(--ui-radius-small)] bg-red-100 text-rose-600 flex items-center justify-center shrink-0">
              <ShieldAlert size={20} />
            </div>
            <div>
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-rose-500">Tingkat Pelanggaran</span>
              <p className="text-xs font-black text-red-800 mt-0.5">Maks. {batasPoin} Poin (Drop Out)</p>
            </div>
          </div>

          {/* Card 2: Batas Poin Bermasalah */}
          <div className="p-3.5 rounded-[var(--ui-radius-small)] bg-blue-50/70 border border-blue-100 flex items-center gap-3">
            <div className="w-10 h-10 rounded-[var(--ui-radius-small)] bg-blue-100 text-blue-600 flex items-center justify-center shrink-0">
              <HelpCircle size={20} />
            </div>
            <div className="flex-1 min-w-0">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-blue-500">Batas Poin DO</span>
              {isAdmin ? (
                <div className="flex items-center gap-1.5 mt-0.5">
                  <input
                    type="text"
                    inputMode="numeric"
                    value={batasPoin}
                    onChange={(e) => handleUpdateBatasPoin(parseInt(e.target.value.replace(/[^0-9]/g, '')) || 0)}
                    className="w-16 px-2 py-0.5 text-xs font-black border border-blue-200 rounded-[var(--ui-radius-small)] bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-blue-900"
                  />
                  <span className="text-[10px] font-bold text-blue-600">Poin</span>
                </div>
              ) : (
                <p className="text-xs font-black text-blue-800 mt-0.5">{batasPoin} Poin</p>
              )}
            </div>
          </div>

          {/* Card 3: Mulai Hitung Absensi */}
          <div className="p-3.5 rounded-[var(--ui-radius-small)] bg-amber-50/70 border border-amber-100 flex items-center gap-3">
            <div className="w-10 h-10 rounded-[var(--ui-radius-small)] bg-amber-100 text-amber-600 flex items-center justify-center shrink-0">
              <Calendar size={20} />
            </div>
            <div className="flex-1 min-w-0">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-amber-600">Mulai Hitung Absensi</span>
              {isAdmin ? (
                <div className="mt-0.5">
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => handleUpdateStartDate(e.target.value)}
                    className="px-2 py-0.5 text-xs font-bold border border-amber-200 rounded-[var(--ui-radius-small)] bg-white focus:outline-none focus:ring-2 focus:ring-amber-500 text-amber-900"
                  />
                </div>
              ) : (
                <p className="text-xs font-black text-amber-800 mt-0.5">{startDate}</p>
              )}
            </div>
          </div>

          {/* Card 4: PDF Peraturan Sekolah */}
          <div className="p-3.5 rounded-[var(--ui-radius-small)] bg-purple-50/70 border border-purple-100 flex items-center gap-3">
            <div className="w-10 h-10 rounded-[var(--ui-radius-small)] bg-purple-100 text-purple-600 flex items-center justify-center shrink-0">
              <FileText size={20} />
            </div>
            <div className="flex-1 min-w-0">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-purple-500">PDF Tatib Sekolah</span>
              <div className="flex items-center gap-2 mt-0.5">
                {hasPdf ? (
                  <>
                    <a
                      href="/api/kedisiplinan/rules.pdf"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs font-extrabold text-purple-700 hover:underline flex items-center gap-1"
                    >
                      <Download size={12} /> Unduh PDF
                    </a>
                    {isAdmin && (
                      <button
                        onClick={handlePdfDelete}
                        className="text-[10px] text-rose-600 hover:underline font-bold"
                      >
                        Hapus
                      </button>
                    )}
                  </>
                ) : (
                  <span className="text-xs font-bold text-slate-400">Belum diunggah</span>
                )}
              </div>
              {isAdmin && (
                <div className="mt-1">
                  <label className="text-[10px] font-black px-2 py-0.5 bg-purple-600 hover:bg-purple-700 text-white rounded-md cursor-pointer inline-block transition-all shadow-xs">
                    {isUploading ? 'Mengunggah...' : hasPdf ? 'Ganti PDF' : 'Unggah PDF'}
                    <input
                      type="file"
                      accept="application/pdf"
                      onChange={handlePdfUpload}
                      disabled={isUploading}
                      className="hidden"
                    />
                  </label>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="bg-white rounded-[var(--ui-radius-card)] border border-slate-200/80 shadow-xs overflow-hidden">
        {/* Controls Toolbar: Search, Filter Tabs & Add Button */}
        <div className="p-4 sm:p-5 border-b border-slate-100 space-y-4">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            {/* Filter Tabs */}
            <div className="flex items-center bg-slate-100 p-1 rounded-[var(--ui-radius-small)] shrink-0 self-start sm:self-auto overflow-x-auto max-w-full">
              <button
                onClick={() => setFilterType('all')}
                className={`px-3.5 py-1.5 rounded-[var(--ui-radius-small)] text-xs font-black transition-all ${
                  filterType === 'all'
                    ? 'bg-white text-slate-800 shadow-xs'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                Semua ({countTotal})
              </button>
              <button
                onClick={() => setFilterType('pelanggaran')}
                className={`px-3.5 py-1.5 rounded-[var(--ui-radius-small)] text-xs font-black transition-all ${
                  filterType === 'pelanggaran'
                    ? 'bg-rose-500 text-white shadow-xs'
                    : 'text-slate-500 hover:text-rose-600'
                }`}
              >
                Pelanggaran ({countPelanggaran})
              </button>
              <button
                onClick={() => setFilterType('prestasi')}
                className={`px-3.5 py-1.5 rounded-[var(--ui-radius-small)] text-xs font-black transition-all ${
                  filterType === 'prestasi'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-slate-500 hover:text-emerald-700'
                }`}
              >
                Prestasi ({countPrestasi})
              </button>
            </div>

            {/* Add Button */}
            {isAdmin && (
              <Button onClick={openAdd} className="bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs px-4 py-2 rounded-[var(--ui-radius-small)] shadow-sm flex items-center justify-center gap-1.5 shrink-0">
                <Plus size={16} /> Tambah Aturan Baru
              </Button>
            )}
          </div>

          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="Cari nama tindakan, aturan, atau pelanggaran..."
              className="w-full pl-10 pr-9 py-2.5 bg-slate-50 border border-slate-200 rounded-[var(--ui-radius-small)] text-xs sm:text-sm font-semibold focus:outline-none focus:bg-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all placeholder:text-slate-400"
            />
            {searchTerm && (
              <button onClick={() => setSearchTerm('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                <X size={14} />
              </button>
            )}
          </div>
        </div>

        {/* Desktop View Table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm">
            <thead className="bg-slate-50/80 text-slate-400 font-extrabold uppercase tracking-wider text-[11px] border-b border-slate-150">
              <tr>
                <th className="px-6 py-3.5">Deskripsi Aturan & Kriteria</th>
                <th className="px-6 py-3.5 text-center w-36">Tipe Poin</th>
                <th className="px-6 py-3.5 text-center w-32">Skor Kredit</th>
                {isAdmin && <th className="px-6 py-3.5 text-right w-28">Aksi</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={isAdmin ? 4 : 3} className="px-6 py-12 text-center text-slate-400 font-medium">
                    Memuat data tata tertib...
                  </td>
                </tr>
              ) : filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={isAdmin ? 4 : 3} className="px-6 py-12 text-center text-slate-400 font-medium">
                    Tidak ada aturan tata tertib ditemukan.
                  </td>
                </tr>
              ) : (
                filteredItems.map((item, idx) => {
                  const isPelanggaran = String(item.jenis || '').toLowerCase() === 'pelanggaran';
                  return (
                    <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-6 py-4 font-bold text-slate-800">
                        {item.nama_tindakan}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className={`inline-flex px-3 py-1 rounded-[var(--ui-radius-pill)] text-xs font-black ${
                          isPelanggaran ? 'bg-red-50 text-red-700 border border-red-200/60' : 'bg-emerald-50 text-emerald-700 border border-emerald-200/60'
                        }`}>
                          {isPelanggaran ? 'Pelanggaran' : 'Prestasi'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center font-black text-sm">
                        <span className={isPelanggaran ? 'text-rose-600' : 'text-emerald-600'}>
                          {isPelanggaran ? `- ${item.nilai_poin}` : `+ ${item.nilai_poin}`}
                        </span>
                      </td>
                      {isAdmin && (
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => openEdit(item)}
                              className="p-1.5 hover:bg-slate-100 text-slate-500 hover:text-slate-800 rounded-[var(--ui-radius-small)] transition-colors"
                              title="Edit Aturan"
                            >
                              <Edit2 size={15} />
                            </button>
                            <button
                              onClick={() => handleDelete(item.id)}
                              className="p-1.5 hover:bg-red-50 text-slate-400 hover:text-rose-600 rounded-[var(--ui-radius-small)] transition-colors"
                              title="Hapus Aturan"
                            >
                              <Trash2 size={15} />
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile View Card List */}
        <div className="block md:hidden divide-y divide-slate-100">
          {isLoading ? (
            <div className="p-8 text-center text-slate-400 text-xs font-medium">Memuat data tata tertib...</div>
          ) : filteredItems.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-xs font-medium">Tidak ada aturan tata tertib ditemukan.</div>
          ) : (
            filteredItems.map(item => {
              const isPelanggaran = String(item.jenis || '').toLowerCase() === 'pelanggaran';
              return (
                <div key={item.id} className="p-4 hover:bg-slate-50/60 transition-colors flex flex-col gap-2.5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-2 flex-1">
                      <span className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${isPelanggaran ? 'bg-rose-500' : 'bg-emerald-500'}`} />
                      <span className="font-extrabold text-xs text-slate-800 leading-snug">{item.nama_tindakan}</span>
                    </div>

                    <span className={`px-2.5 py-1 rounded-[var(--ui-radius-small)] text-xs font-black shrink-0 ${
                      isPelanggaran ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-800'
                    }`}>
                      {isPelanggaran ? `- ${item.nilai_poin} POIN` : `+ ${item.nilai_poin} POIN`}
                    </span>
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md ${
                      isPelanggaran ? 'bg-red-50 text-rose-600 border border-red-100' : 'bg-emerald-50 text-emerald-600 border border-emerald-100'
                    }`}>
                      {isPelanggaran ? 'Pelanggaran' : 'Prestasi'}
                    </span>

                    {isAdmin && (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => openEdit(item)}
                          className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-[var(--ui-radius-small)] transition-colors flex items-center gap-1"
                        >
                          <Edit2 size={12} /> Edit
                        </button>
                        <button
                          onClick={() => handleDelete(item.id)}
                          className="px-2.5 py-1 bg-red-50 hover:bg-red-100 text-rose-600 text-xs font-bold rounded-[var(--ui-radius-small)] transition-colors flex items-center gap-1"
                        >
                          <Trash2 size={12} /> Hapus
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Edit / Add Modal */}
      {showModal && (
        <Modal
          isOpen={true}
          onClose={() => setShowModal(false)}
          title={editingItem ? 'Edit Aturan Tatib' : 'Tambah Aturan Tatib Baru'}
          width="md"
        >
          <form onSubmit={handleSave} className="space-y-4 pt-1">
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1.5">Deskripsi Tindakan / Aturan</label>
              <input
                required
                value={form.nama_tindakan}
                onChange={e => setForm({ ...form, nama_tindakan: e.target.value })}
                placeholder="Contoh: Terlambat masuk sekolah..."
                className="w-full px-3.5 py-2.5 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 rounded-[var(--ui-radius-small)] text-xs font-bold bg-slate-50 text-slate-800 placeholder:text-slate-400"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1.5">Tipe Poin</label>
                <UISelect
                  value={form.jenis}
                  onChange={e => setForm({ ...form, jenis: e.target.value })}
                  className="w-full px-3.5 py-2.5 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 rounded-[var(--ui-radius-small)] text-xs font-bold bg-slate-50 text-slate-800"
                >
                  <option value="pelanggaran">Pelanggaran (Minus)</option>
                  <option value="prestasi">Prestasi (Plus)</option>
                </UISelect>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1.5">Nilai Poin</label>
                <input
                  type="text"
                  inputMode="numeric"
                  required
                  value={form.nilai_poin}
                  onChange={e => setForm({ ...form, nilai_poin: parseInt(e.target.value.replace(/[^0-9]/g, '')) || 0 })}
                  className="w-full px-3.5 py-2.5 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 rounded-[var(--ui-radius-small)] text-xs font-bold bg-slate-50 text-slate-800"
                />
              </div>
            </div>

            <div className="pt-3 flex justify-end gap-2 border-t border-slate-100 mt-2">
              <Button variant="ghost" type="button" onClick={() => setShowModal(false)} className="rounded-[var(--ui-radius-small)] text-xs font-bold">
                Batal
              </Button>
              <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-[var(--ui-radius-small)] text-xs font-black px-4 py-2">
                <Save size={14} className="mr-1.5" /> Simpan Aturan
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* Toast Notification */}
      {toast && (
        <div className={`fixed bottom-6 right-6 px-4 py-3 rounded-[var(--ui-radius-card)] shadow-sm font-bold text-xs flex items-center gap-2 animate-in slide-in-from-bottom-5 text-white ${
          toast.type === 'error' ? 'bg-rose-600' : 'bg-emerald-600'
        } z-50`}>
          {toast.type === 'error' ? <AlertCircle size={18} /> : <CheckCircle2 size={18} />} {toast.message}
        </div>
      )}
    </div>
  );
}
