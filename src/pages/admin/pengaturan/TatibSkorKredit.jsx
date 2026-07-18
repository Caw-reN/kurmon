import { Button } from '../../../components/ui.jsx';
import { useState, useEffect, useMemo } from 'react';
import { BookOpen } from 'lucide-react';
import useAuthStore from '../../../store/monitoring/authStore.js';
import { useAppStore } from '../../../store/useAppStore.js';
import { ShieldAlert, Award, HelpCircle, Search, Plus, Edit2, Trash2, X, Save, AlertCircle, CheckCircle2, Upload, Download } from 'lucide-react';
import { PageHeader } from '../../../components/monitoring/ui/index.js';
import * as XLSX from 'xlsx';
import { UISelect, Modal } from '../../../components/ui.jsx';


export default function TatibSkorKredit() {
  const [items, setItems] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all'); //'all','pelanggaran','prestasi'
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [toast, setToast] = useState(null);
  const [form, setForm] = useState({ nama_tindakan:'', jenis:'pelanggaran', nilai_poin: 10 });
  const authToken = useAuthStore(state => state.user?.authToken);
  const userRole = useAuthStore(state => state.user?.role ||'guru');
  const isAdmin = ['admin','superadmin','waka_kesiswaan','guru'].includes(userRole);

  const { kedisiplinanSettings, updateKedisiplinanSettings } = useAppStore();
  const [batasPoin, setBatasPoin] = useState(100);

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
      const res = await fetch('/api/kedisiplinan/rules.pdf', { method:'HEAD' });
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
    if (file.type !=='application/pdf') {
      showToast('File harus format PDF!','error');
      return;
    }
    
    setIsUploading(true);
    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const fileData = evt.target.result;
        const res = await fetch('/api/kedisiplinan/upload-rules', {
          method:'POST',
          headers: {'Content-Type':'application/json','Authorization': `Bearer ${authToken}`
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
          showToast('Gagal mengunggah PDF:' + (data.error ||'error'),'error');
        }
      } catch (err) {
        console.error(err);
        showToast('Gagal mengunggah PDF','error');
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
        method:'POST',
        headers: {'Authorization': `Bearer ${authToken}` }
      });
      if (res.ok) {
        showToast('Dokumen PDF Peraturan dihapus.');
        setHasPdf(false);
        updateKedisiplinanSettings({ hasRulesPdf: false });
      }
    } catch (e) {
      console.error(e);
      showToast('Gagal menghapus PDF','error');
    }
  };

  const showToast = (message, type ='success') => {
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
      showToast('Gagal memuat tata tertib','error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [authToken]);

  const filteredItems = useMemo(() => {
    return items.filter(item => {
      const matchSearch = !searchTerm || item.nama_tindakan?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchType = filterType ==='all' || String(item.jenis ||'').toLowerCase() === filterType.toLowerCase();
      return matchSearch && matchType;
    });
  }, [items, searchTerm, filterType]);

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.nama_tindakan.trim()) return showToast('Nama tindakan wajib diisi','error');
    if (form.nilai_poin <= 0) return showToast('Skor poin harus lebih besar dari 0','error');

    try {
      const res = await fetch('/api/kedisiplinan/master', {
        method:'POST',
        headers: {'Content-Type':'application/json', Authorization: `Bearer ${authToken}` },
        body: JSON.stringify(editingItem ? { ...form, id: editingItem.id } : form)
      });
      const data = await res.json();
      if (data.ok) {
        showToast(editingItem ?'Tata tertib diperbarui!' :'Tata tertib ditambahkan!');
        setShowModal(false);
        fetchData();
      } else {
        showToast('Gagal menyimpan:' + (data.error ||''),'error');
      }
    } catch (e) {
      console.error(e);
      showToast('Terjadi kesalahan','error');
    }
  };

  const handleDelete = async (id) => {
    if (!await window.confirmAsync('Hapus aturan tata tertib ini?')) return;
    try {
      const res = await fetch('/api/kedisiplinan/master', {
        method:'POST',
        headers: {'Content-Type':'application/json', Authorization: `Bearer ${authToken}` },
        body: JSON.stringify({ action:'delete', id })
      });
      const data = await res.json();
      if (data.ok) {
        showToast('Aturan berhasil dihapus!');
        fetchData();
      } else {
        showToast('Gagal menghapus','error');
      }
    } catch (e) {
      console.error(e);
      showToast('Terjadi kesalahan','error');
    }
  };

  const openAdd = () => {
    setEditingItem(null);
    setForm({ nama_tindakan:'', jenis:'pelanggaran', nilai_poin: 10 });
    setShowModal(true);
  };

  const openEdit = (item) => {
    setEditingItem(item);
    setForm({ nama_tindakan: item.nama_tindakan, jenis: String(item.jenis ||'pelanggaran').toLowerCase(), nilai_poin: item.nilai_poin });
    setShowModal(true);
  };

  return (
    <div className="space-y-6 relative animate-in fade-in duration-300 z-10">
      <PageHeader 
        title="Aturan & Tatib Skor Kredit"
        description="Daftar tata tertib sekolah beserta skor kredit poin pelanggaran dan penghargaan prestasi siswa."
        icon={BookOpen}
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Info Poin */}
        <div className="ui-card p-5 flex items-center gap-4 bg-red-50/60 border-red-150">
          <div className="w-12 h-12 rounded-[var(--ui-radius-small)] bg-red-100 flex items-center justify-center text-red-600 shrink-0">
            <ShieldAlert size={22} />
          </div>
          <div>
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Tingkat Pelanggaran</h4>
            <p className="text-sm font-black text-red-800 mt-1">Maksimal {batasPoin} Poin (Drop Out)</p>
          </div>
        </div>

        <div className="ui-card p-5 flex items-center gap-4 bg-emerald-50/60 border-emerald-150">
          <div className="w-12 h-12 rounded-[var(--ui-radius-small)] bg-emerald-100 flex items-center justify-center text-emerald-600 shrink-0">
            <Award size={22} />
          </div>
          <div>
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Poin Penghargaan</h4>
            <p className="text-sm font-black text-emerald-800 mt-1">Mengurangi akumulasi poin pelanggaran</p>
          </div>
        </div>

        <div className="ui-card p-5 flex items-center gap-4 bg-blue-50/60 border-blue-150">
          <div className="w-12 h-12 rounded-[var(--ui-radius-small)] bg-blue-100 flex items-center justify-center text-blue-600 shrink-0">
            <HelpCircle size={22} />
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Batas Poin Bermasalah</h4>
            {isAdmin ? (
              <div className="flex items-center gap-2 mt-1">
                <input
                  type="text"
                  inputMode="numeric"
                  value={batasPoin}
                  onChange={(e) => handleUpdateBatasPoin(parseInt(e.target.value.replace(/[^0-9]/g,'')) || 0)}
                  className="w-16 px-1.5 py-0.5 text-xs font-bold border border-slate-200 rounded-[var(--ui-radius-small)] bg-white focus:outline-none focus:ring-1 focus:ring-[var(--ui-primary)] text-slate-700"
                />
                <span className="text-[11px] font-bold text-blue-700 truncate">Poin (DO)</span>
              </div>
            ) : (
              <p className="text-sm font-black text-blue-800 mt-1">{batasPoin} Poin (DO)</p>
            )}
          </div>
        </div>

        <div className="ui-card p-5 flex items-center gap-4 bg-purple-50/60 border-purple-150">
          <div className="w-12 h-12 rounded-[var(--ui-radius-small)] bg-purple-100 flex items-center justify-center text-purple-600 shrink-0">
            <BookOpen size={22} />
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">PDF Peraturan Sekolah</h4>
            <div className="mt-1 flex items-center gap-2">
              {hasPdf ? (
                <>
                  <a
                    href="/api/kedisiplinan/rules.pdf"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs font-bold text-purple-700 hover:underline flex items-center gap-1"
                  >
                    Lihat PDF
                  </a>
                  {isAdmin && (
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={handlePdfDelete}
                    >
                      Hapus
                    </Button>
                  )}
                </>
              ) : (
                <span className="text-xs font-bold text-slate-400">Belum diunggah</span>
              )}
            </div>
            {isAdmin && (
              <div className="mt-1.5">
                <label className="text-[10px] font-extrabold px-2 py-1 bg-purple-600 hover:bg-purple-700 text-white rounded-[var(--ui-radius-small)] cursor-pointer inline-block">
                  {isUploading ?'Mengunggah...' : hasPdf ?'Ganti PDF' :'Unggah PDF'}
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

      <div className="ui-card p-6 space-y-4">
        {/* Toolbar */}
        <div className="flex flex-col md:flex-row gap-4 justify-between items-stretch md:items-center">
          <div className="flex flex-wrap gap-2 flex-1 items-center">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
              <input value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="Cari tata tertib..."
                className="w-full pl-9 pr-3 py-2 bg-slate-50 border-none rounded-[var(--ui-radius-small)] text-sm focus:outline-none focus:border-[var(--ui-primary)]" />
            </div>
            <UISelect value={filterType} onChange={e => setFilterType(e.target.value)}
              className="px-3 py-2 bg-slate-50 border-none rounded-[var(--ui-radius-small)] text-sm font-semibold focus:outline-none focus:border-[var(--ui-primary)]">
              <option value="all">Semua Tipe</option>
              <option value="pelanggaran">Pelanggaran (Skor Minus)</option>
              <option value="prestasi">Penghargaan (Skor Plus)</option>
            </UISelect>
          </div>

          {isAdmin && (
            <Button onClick={openAdd} className="md:self-auto">
              <Plus size={14} className="mr-2" /> Tambah Aturan Baru
            </Button>
          )}
        </div>

        {/* List Table */}
        <div className="overflow-x-auto border border-slate-150 rounded-[var(--ui-radius-small)]">
          <table className="w-full text-sm">
            <thead className="text-xs text-slate-500 bg-slate-50 border-b border-slate-200 uppercase">
              <tr>
                <th className="px-6 py-4 font-bold text-left">Deskripsi Tindakan / Kriteria</th>
                <th className="px-6 py-4 font-bold text-center w-36">Tipe Poin</th>
                <th className="px-6 py-4 font-bold text-center w-36">Skor Kredit</th>
                {isAdmin && <th className="px-6 py-4 font-bold text-right w-28">Aksi</th>}
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={isAdmin ? 4 : 3} className="px-6 py-8 text-center text-slate-400">Memuat data tatib...</td></tr>
              ) : filteredItems.length === 0 ? (
                <tr><td colSpan={isAdmin ? 4 : 3} className="px-6 py-8 text-center text-slate-400">Tidak ada aturan ditemukan.</td></tr>
              ) : (
                filteredItems.map(item => (
                  <tr key={item.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 font-bold text-slate-700">{item.nama_tindakan}</td>
                    <td className="px-6 py-4 text-center">
                      <span className={`inline-flex px-2.5 py-0.5 rounded-[var(--ui-radius-small)] text-xs font-bold ${
                        String(item.jenis ||'').toLowerCase() ==='pelanggaran' ?'bg-red-100 text-red-800' :'bg-emerald-100 text-emerald-800'
                      }`}>
                        {String(item.jenis ||'').toLowerCase() ==='pelanggaran' ?'Pelanggaran' :'Prestasi'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center font-black">
                      <span className={String(item.jenis ||'').toLowerCase() ==='pelanggaran' ?'text-red-600' :'text-emerald-600'}>
                        {String(item.jenis ||'').toLowerCase() ==='pelanggaran' ?'-' :'+'}{item.nilai_poin}
                      </span>
                    </td>
                    {isAdmin && (
                      <td className="px-6 py-4 text-right flex items-center justify-end gap-1.5">
                        <Button variant="ghost" size="icon" onClick={() => openEdit(item)}  title="Edit">
                          <Edit2 size={16} className="text-slate-500" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(item.id)}  title="Hapus">
                          <Trash2 size={16} className="text-red-500" />
                        </Button>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit / Add Modal */}
      {showModal && (
        <Modal
          isOpen={true}
          onClose={() => setShowModal(false)}
          title={editingItem ?'Edit Aturan Tatib' :'Tambah Aturan Tatib'}
          width="md"
        >
            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Deskripsi Tindakan / Aturan</label>
                <input required value={form.nama_tindakan} onChange={e => setForm({ ...form, nama_tindakan: e.target.value })}
                  placeholder="Contoh: Terlambat masuk sekolah..."
                  className="w-full px-3 py-2 border border-slate-200 focus:outline-[var(--ui-primary)] rounded-[var(--ui-radius-small)] text-sm bg-slate-50" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">Tipe</label>
                  <UISelect value={form.jenis} onChange={e => setForm({ ...form, jenis: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 focus:outline-[var(--ui-primary)] rounded-[var(--ui-radius-small)] text-sm bg-slate-50">
                    <option value="pelanggaran">Pelanggaran (Minus)</option>
                    <option value="prestasi">Prestasi (Plus)</option>
                  </UISelect>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">Nilai Poin</label>
                  <input type="text" inputMode="numeric" required value={form.nilai_poin} onChange={e => setForm({ ...form, nilai_poin: parseInt(e.target.value.replace(/[^0-9]/g,'')) || 0 })}
                    className="w-full px-3 py-2 border border-slate-200 focus:outline-[var(--ui-primary)] rounded-[var(--ui-radius-small)] text-sm bg-slate-50" />
                </div>
              </div>
              <div className="pt-2 flex justify-end gap-2">
                <Button variant="ghost" type="button" onClick={() => setShowModal(false)} >Batal</Button>
                <Button type="submit">
                  <Save size={14} className="mr-2" /> Simpan Aturan
                </Button>
              </div>
            </form>
        </Modal>
      )}

      {toast && (
        <div className={`fixed bottom-6 right-6 px-4 py-3 rounded-[var(--ui-radius-small)] shadow-sm font-medium text-sm flex items-center gap-2 animate-in slide-in-from-bottom-5 text-white ${toast.type ==='error' ?'bg-red-600' :'bg-emerald-600'} z-50`}>
          {toast.type ==='error' ? <AlertCircle size={18} /> : <CheckCircle2 size={18} />} {toast.message}
        </div>
      )}
    </div>
  );
}
