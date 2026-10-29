import React, { useState } from 'react';
import { 
  Plus, 
  Trash2, 
  Edit2, 
  RotateCcw, 
  CheckCircle2, 
  X, 
  Tag, 
  Sparkles,
  RefreshCw 
} from 'lucide-react';
import { Modal, Button } from '../../ui.jsx';
import { 
  DEFAULT_STUDENT_ATTENDANCE_NOTES, 
  saveAttendancePresets 
} from '../../../utils/attendancePresets.js';

const COLOR_OPTIONS = [
  { id: 'sky', label: 'Biru (Sky)', class: 'bg-sky-50 text-sky-800 border-sky-300' },
  { id: 'amber', label: 'Oranye / Amber', class: 'bg-amber-50 text-amber-900 border-amber-300' },
  { id: 'purple', label: 'Ungu (Purple)', class: 'bg-purple-50 text-purple-800 border-purple-300' },
  { id: 'teal', label: 'Teal / Toska', class: 'bg-teal-50 text-teal-800 border-teal-300' },
  { id: 'emerald', label: 'Hijau (Emerald)', class: 'bg-emerald-50 text-emerald-800 border-emerald-300' },
  { id: 'rose', label: 'Merah (Rose)', class: 'bg-rose-50 text-rose-800 border-rose-300' },
  { id: 'indigo', label: 'Indigo', class: 'bg-indigo-50 text-indigo-800 border-indigo-300' }
];

const EMPTY_NOTE_FORM = {
  id: '',
  label: '',
  keterangan: '',
  status: 'Hadir',
  category: 'catatan', // 'catatan' | 'kegiatan'
  color: 'sky'
};

export default function ManageAttendanceNotesModal({
  isOpen,
  onClose,
  token,
  notes = [],
  onNotesChange,
  showToast = () => {}
}) {
  const [activeTab, setActiveTab] = useState('all'); // 'all' | 'catatan' | 'kegiatan'
  const [isEditing, setIsEditing] = useState(false);
  const [form, setForm] = useState(EMPTY_NOTE_FORM);
  const [saving, setSaving] = useState(false);

  const filteredNotes = notes.filter(n => {
    if (activeTab === 'catatan') return n.category === 'catatan';
    if (activeTab === 'kegiatan') return n.category === 'kegiatan';
    return true;
  });

  const handleStartCreate = () => {
    setForm({
      id: 'note-' + Date.now(),
      label: '',
      keterangan: '',
      status: 'Hadir',
      category: activeTab === 'kegiatan' ? 'kegiatan' : 'catatan',
      color: activeTab === 'kegiatan' ? 'teal' : 'sky'
    });
    setIsEditing(true);
  };

  const handleStartEdit = (item) => {
    setForm({ ...item });
    setIsEditing(true);
  };

  const handleSaveForm = async (e) => {
    e.preventDefault();
    if (!form.label.trim()) {
      showToast('Label tombol wajib diisi', 'error');
      return;
    }
    if (!form.keterangan.trim()) {
      showToast('Keterangan catatan wajib diisi', 'error');
      return;
    }

    setSaving(true);
    try {
      let updated;
      const exists = notes.some(n => n.id === form.id);
      if (exists) {
        updated = notes.map(n => n.id === form.id ? form : n);
      } else {
        updated = [...notes, form];
      }

      await saveAttendancePresets(token, { studentAttendanceNotes: updated });
      onNotesChange(updated);
      setIsEditing(false);
      setForm(EMPTY_NOTE_FORM);
      showToast('Pilihan catatan & kegiatan presensi berhasil disimpan!');
    } catch (err) {
      showToast(err.message || 'Gagal menyimpan', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Hapus pilihan catatan ini?')) return;
    setSaving(true);
    try {
      const updated = notes.filter(n => n.id !== id);
      await saveAttendancePresets(token, { studentAttendanceNotes: updated });
      onNotesChange(updated);
      showToast('Pilihan catatan berhasil dihapus.');
    } catch (err) {
      showToast(err.message || 'Gagal menghapus', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleResetDefaults = async () => {
    if (!window.confirm('Kembalikan semua pilihan catatan & kegiatan ke pengaturan standar sistem?')) return;
    setSaving(true);
    try {
      await saveAttendancePresets(token, { studentAttendanceNotes: DEFAULT_STUDENT_ATTENDANCE_NOTES });
      onNotesChange(DEFAULT_STUDENT_ATTENDANCE_NOTES);
      showToast('Berhasil di-reset ke pilihan standar sistem.');
    } catch (err) {
      showToast(err.message || 'Gagal reset', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Kelola Pilihan Catatan & Kegiatan Presensi Siswa"
      maxWidth="max-w-2xl"
    >
      <div className="space-y-4 text-xs">
        
        {/* Banner Khusus Super Admin */}
        <div className="bg-amber-500/10 border border-amber-200/90 rounded-[var(--ui-radius-card)] p-3 flex items-start gap-2.5">
          <Sparkles size={16} className="text-amber-600 shrink-0 mt-0.5" />
          <div className="text-amber-900 leading-relaxed font-medium">
            <span className="font-bold block text-[11px] uppercase tracking-wider text-amber-800">Khusus Super Admin</span>
            Pilihan tombol cepat catatan absen dan kegiatan di bawah ini akan otomatis muncul pada form izin/absen seluruh guru, wali kelas, dan kesiswaan.
          </div>
        </div>

        {/* Tab Selector & Actions */}
        <div className="flex items-center justify-between gap-2 flex-wrap border-b border-slate-100 pb-2.5">
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-[var(--ui-radius-small)]">
            {[
              { id: 'all', label: 'Semua Pilihan' },
              { id: 'catatan', label: 'Catatan Khusus' },
              { id: 'kegiatan', label: 'Kegiatan Siswa' }
            ].map(t => (
              <button
                key={t.id}
                type="button"
                onClick={() => { setActiveTab(t.id); setIsEditing(false); }}
                className={`px-2.5 py-1 rounded-[var(--ui-radius-small)] text-[10.5px] font-black transition-all cursor-pointer ${
                  activeTab === t.id 
                    ? 'bg-white text-slate-800 shadow-2xs' 
                    : 'text-slate-500 hover:text-slate-700 bg-transparent'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleResetDefaults}
              disabled={saving}
              className="text-[10.5px] font-bold text-slate-400 hover:text-rose-600 px-2 py-1 transition-colors flex items-center gap-1 cursor-pointer disabled:opacity-50"
              title="Reset ke daftar bawaan"
            >
              <RotateCcw size={12} />
              Reset Bawaan
            </button>
            <Button
              type="button"
              size="sm"
              onClick={handleStartCreate}
              className="flex items-center gap-1.5 font-bold"
              style={{
                background: "var(--ui-primary)",
                color: "#ffffff"
              }}
            >
              <Plus size={14} />
              Tambah Pilihan Baru
            </Button>
          </div>
        </div>

        {/* Form Tambah / Edit */}
        {isEditing && (
          <form onSubmit={handleSaveForm} className="bg-slate-50/80 p-3.5 rounded-[var(--ui-radius-card)] border border-slate-200/90 space-y-3 animate-in fade-in duration-200">
            <div className="flex items-center justify-between border-b border-slate-200/60 pb-2">
              <span className="font-bold text-slate-800 text-[11.5px] flex items-center gap-1.5">
                <Tag size={13} className="text-[var(--ui-primary)]" />
                {form.id && notes.some(n => n.id === form.id) ? 'Edit Pilihan Catatan' : 'Tambah Pilihan Baru'}
              </span>
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X size={14} />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-1">
                  Kategori
                </label>
                <select
                  value={form.category}
                  onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                  className="w-full bg-white border border-slate-200 p-2 rounded-[var(--ui-radius-small)] font-bold text-xs focus:outline-[var(--ui-primary)]"
                >
                  <option value="catatan">Catatan Khusus (Mesin Error, Lupa Tap, Surat Dokter, dll)</option>
                  <option value="kegiatan">Kegiatan Siswa (Ujian TKA, Lomba, Dispensasi, dll)</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-1">
                  Status Absensi Otomatis
                </label>
                <select
                  value={form.status}
                  onChange={e => setForm(f => ({ ...f, status: e.target.value }))}
                  className="w-full bg-white border border-slate-200 p-2 rounded-[var(--ui-radius-small)] font-bold text-xs focus:outline-[var(--ui-primary)]"
                >
                  <option value="Hadir">Hadir (Tetap tercatat hadir)</option>
                  <option value="Izin">Izin</option>
                  <option value="Sakit">Sakit</option>
                  <option value="Terlambat">Dispensasi / Terlambat</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-1">
                  Label Tombol Pill <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={form.label}
                  onChange={e => setForm(f => ({ ...f, label: e.target.value }))}
                  placeholder="Contoh: Ujian TKA / Mesin Error"
                  className="w-full bg-white border border-slate-200 p-2 rounded-[var(--ui-radius-small)] font-bold text-xs focus:outline-[var(--ui-primary)]"
                />
              </div>

              <div>
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-1">
                  Warna Tombol
                </label>
                <select
                  value={form.color}
                  onChange={e => setForm(f => ({ ...f, color: e.target.value }))}
                  className="w-full bg-white border border-slate-200 p-2 rounded-[var(--ui-radius-small)] font-bold text-xs focus:outline-[var(--ui-primary)]"
                >
                  {COLOR_OPTIONS.map(c => (
                    <option key={c.id} value={c.id}>{c.label}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-1">
                Isi Keterangan Otomatis <span className="text-rose-500">*</span>
              </label>
              <textarea
                required
                rows={2}
                value={form.keterangan}
                onChange={e => setForm(f => ({ ...f, keterangan: e.target.value }))}
                placeholder="Teks keterangan yang otomatis diisi ketika tombol ini diklik..."
                className="w-full bg-white border border-slate-200 p-2 rounded-[var(--ui-radius-small)] font-bold text-xs focus:outline-[var(--ui-primary)] resize-none"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-1">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsEditing(false)}
              >
                Batal
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={saving}
                className="flex items-center gap-1 font-bold"
                style={{
                  background: "var(--ui-primary)",
                  color: "#ffffff"
                }}
              >
                {saving ? <RefreshCw size={13} className="animate-spin" /> : <CheckCircle2 size={13} />}
                {saving ? 'Menyimpan...' : 'Simpan Pilihan'}
              </Button>
            </div>
          </form>
        )}

        {/* List of Custom Notes */}
        <div className="divide-y divide-slate-100 max-h-72 overflow-y-auto border border-slate-200/80 rounded-[var(--ui-radius-small)] bg-white">
          {filteredNotes.length === 0 ? (
            <div className="p-8 text-center text-slate-400">
              <Tag size={24} className="mx-auto mb-1.5 opacity-30" />
              <p className="font-bold">Belum ada pilihan pada kategori ini.</p>
            </div>
          ) : (
            filteredNotes.map((item) => {
              const colorObj = COLOR_OPTIONS.find(c => c.id === item.color) || COLOR_OPTIONS[0];
              return (
                <div key={item.id} className="p-3 flex items-start justify-between gap-3 hover:bg-slate-50/70 transition-colors">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className={`px-2 py-0.5 rounded-[var(--ui-radius-pill)] text-[10px] font-black border ${colorObj.class}`}>
                        {item.label}
                      </span>
                      <span className="text-[9px] font-black uppercase tracking-wider text-slate-500 bg-slate-100 px-1.5 py-0.2 rounded">
                        {item.category === 'kegiatan' ? 'Kegiatan Siswa' : 'Catatan Khusus'}
                      </span>
                      <span className="text-[9px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.2 rounded">
                        Status: {item.status}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-600 font-medium leading-relaxed">
                      {item.keterangan}
                    </p>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleStartEdit(item)}
                      className="p-1.5 rounded-[var(--ui-radius-small)] text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                      title="Edit"
                    >
                      <Edit2 size={13} />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(item.id)}
                      className="p-1.5 rounded-[var(--ui-radius-small)] text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                      title="Hapus"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        <div className="flex items-center justify-end pt-2 border-t border-slate-100">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onClose}
          >
            Tutup
          </Button>
        </div>

      </div>
    </Modal>
  );
}

