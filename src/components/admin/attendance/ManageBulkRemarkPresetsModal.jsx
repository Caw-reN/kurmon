import React, { useState } from 'react';
import { 
  Plus, 
  Trash2, 
  Edit2, 
  RotateCcw, 
  CheckCircle2, 
  X, 
  Sparkles,
  RefreshCw 
} from 'lucide-react';
import { Modal, Button } from '../../ui.jsx';
import { 
  DEFAULT_BULK_REMARK_PRESETS, 
  saveAttendancePresets 
} from '../../../utils/attendancePresets.js';

const TONE_OPTIONS = [
  { id: 'emerald', label: 'Hijau (Emerald)', class: 'bg-emerald-100 text-emerald-800 border-emerald-200' },
  { id: 'amber', label: 'Kuning / Oranye (Amber)', class: 'bg-amber-100 text-amber-800 border-amber-200' },
  { id: 'indigo', label: 'Biru (Indigo)', class: 'bg-indigo-100 text-indigo-800 border-indigo-200' },
  { id: 'purple', label: 'Ungu (Purple)', class: 'bg-purple-100 text-purple-800 border-purple-200' },
  { id: 'rose', label: 'Merah (Rose)', class: 'bg-rose-100 text-rose-800 border-rose-200' }
];

const EMPTY_PRESET_FORM = {
  id: '',
  title: '',
  label: '',
  keterangan: '',
  level: 'all', // 'all' | 'XII' | 'XI' | 'X' | 'specific'
  badgeTone: 'bg-emerald-100 text-emerald-800 border-emerald-200'
};

export default function ManageBulkRemarkPresetsModal({
  isOpen,
  onClose,
  token,
  presets = [],
  onPresetsChange,
  showToast = () => {}
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [form, setForm] = useState(EMPTY_PRESET_FORM);
  const [saving, setSaving] = useState(false);

  const handleStartCreate = () => {
    setForm({
      id: 'preset-' + Date.now(),
      title: '',
      label: '',
      keterangan: '',
      level: 'all',
      badgeTone: 'bg-emerald-100 text-emerald-800 border-emerald-200'
    });
    setIsEditing(true);
  };

  const handleStartEdit = (item) => {
    setForm({ ...item });
    setIsEditing(true);
  };

  const handleSaveForm = async (e) => {
    e.preventDefault();
    if (!form.title.trim()) {
      showToast('Judul tombol template wajib diisi', 'error');
      return;
    }
    if (!form.label.trim()) {
      showToast('Label badge wajib diisi', 'error');
      return;
    }
    if (!form.keterangan.trim()) {
      showToast('Keterangan default wajib diisi', 'error');
      return;
    }

    setSaving(true);
    try {
      let updated;
      const exists = presets.some(p => p.id === form.id);
      if (exists) {
        updated = presets.map(p => p.id === form.id ? form : p);
      } else {
        updated = [...presets, form];
      }

      await saveAttendancePresets(token, { bulkRemarkPresets: updated });
      onPresetsChange(updated);
      setIsEditing(false);
      setForm(EMPTY_PRESET_FORM);
      showToast('Template pilihan keterangan massal berhasil disimpan!');
    } catch (err) {
      showToast(err.message || 'Gagal menyimpan', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Hapus template pilihan ini?')) return;
    setSaving(true);
    try {
      const updated = presets.filter(p => p.id !== id);
      await saveAttendancePresets(token, { bulkRemarkPresets: updated });
      onPresetsChange(updated);
      showToast('Template pilihan berhasil dihapus.');
    } catch (err) {
      showToast(err.message || 'Gagal menghapus', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleResetDefaults = async () => {
    if (!window.confirm('Kembalikan semua pilihan template ke pengaturan standar sistem?')) return;
    setSaving(true);
    try {
      await saveAttendancePresets(token, { bulkRemarkPresets: DEFAULT_BULK_REMARK_PRESETS });
      onPresetsChange(DEFAULT_BULK_REMARK_PRESETS);
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
      title="Kelola Template Pilihan Keterangan Massal"
      maxWidth="max-w-2xl"
    >
      <div className="space-y-4 text-xs">
        
        {/* Banner Khusus Super Admin */}
        <div className="bg-amber-500/10 border border-amber-200/90 rounded-[var(--ui-radius-card)] p-3 flex items-start gap-2.5">
          <Sparkles size={16} className="text-amber-600 shrink-0 mt-0.5" />
          <div className="text-amber-900 leading-relaxed font-medium">
            <span className="font-bold block text-[11px] uppercase tracking-wider text-amber-800">Khusus Super Admin</span>
            Template tombol pilihan di bawah ini akan otomatis muncul pada form pembuatan Keterangan Massal untuk mempermudah kesiswaan, walas, dan admin dalam mengisi data secara 1-klik.
          </div>
        </div>

        {/* Action Header */}
        <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
          <span className="text-[11px] font-black text-slate-700 uppercase tracking-wider">
            Daftar Template Tersedia ({presets.length})
          </span>

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
              Tambah Template Baru
            </Button>
          </div>
        </div>

        {/* Form Tambah / Edit Template */}
        {isEditing && (
          <form onSubmit={handleSaveForm} className="bg-slate-50/80 p-3.5 rounded-[var(--ui-radius-card)] border border-slate-200/90 space-y-3 animate-in fade-in duration-200">
            <div className="flex items-center justify-between border-b border-slate-200/60 pb-2">
              <span className="font-bold text-slate-800 text-[11.5px] flex items-center gap-1.5">
                <Sparkles size={13} className="text-amber-500" />
                {form.id && presets.some(p => p.id === form.id) ? 'Edit Template Pilihan' : 'Tambah Template Baru'}
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
                  Judul Tombol Template <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={form.title}
                  onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                  placeholder="Contoh: Ujian TKA (Kelas XII - 3 Sesi)"
                  className="w-full bg-white border border-slate-200 p-2 rounded-[var(--ui-radius-small)] font-bold text-xs focus:outline-[var(--ui-primary)]"
                />
              </div>

              <div>
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-1">
                  Label Badge Singkat <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={form.label}
                  onChange={e => setForm(f => ({ ...f, label: e.target.value }))}
                  placeholder="Contoh: Ujian TKA / Lab Dipakai Ujian"
                  className="w-full bg-white border border-slate-200 p-2 rounded-[var(--ui-radius-small)] font-bold text-xs focus:outline-[var(--ui-primary)]"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-1">
                  Target Kelas Default
                </label>
                <select
                  value={form.level}
                  onChange={e => setForm(f => ({ ...f, level: e.target.value }))}
                  className="w-full bg-white border border-slate-200 p-2 rounded-[var(--ui-radius-small)] font-bold text-xs focus:outline-[var(--ui-primary)]"
                >
                  <option value="all">Semua Kelas (Seluruh Sekolah)</option>
                  <option value="XII">Otomatis Pilih Semua Kelas XII</option>
                  <option value="XI">Otomatis Pilih Semua Kelas XI</option>
                  <option value="X">Otomatis Pilih Semua Kelas X</option>
                  <option value="specific">Pilih Kelas Manual Saat Pakai</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-1">
                  Warna Tema Badge
                </label>
                <select
                  value={TONE_OPTIONS.find(t => t.class === form.badgeTone)?.id || 'emerald'}
                  onChange={e => {
                    const found = TONE_OPTIONS.find(t => t.id === e.target.value);
                    if (found) setForm(f => ({ ...f, badgeTone: found.class }));
                  }}
                  className="w-full bg-white border border-slate-200 p-2 rounded-[var(--ui-radius-small)] font-bold text-xs focus:outline-[var(--ui-primary)]"
                >
                  {TONE_OPTIONS.map(t => (
                    <option key={t.id} value={t.id}>{t.label}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-1">
                Keterangan Default Lengkap <span className="text-rose-500">*</span>
              </label>
              <textarea
                required
                rows={2}
                value={form.keterangan}
                onChange={e => setForm(f => ({ ...f, keterangan: e.target.value }))}
                placeholder="Penjelasan lengkap alasan pembebasan absensi..."
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
                {saving ? 'Menyimpan...' : 'Simpan Template'}
              </Button>
            </div>
          </form>
        )}

        {/* List of Custom Presets */}
        <div className="divide-y divide-slate-100 max-h-72 overflow-y-auto border border-slate-200/80 rounded-[var(--ui-radius-small)] bg-white">
          {presets.length === 0 ? (
            <div className="p-8 text-center text-slate-400">
              <Sparkles size={24} className="mx-auto mb-1.5 opacity-30 text-amber-500" />
              <p className="font-bold">Belum ada template pilihan kustom.</p>
            </div>
          ) : (
            presets.map((item) => (
              <div key={item.id} className="p-3 flex items-start justify-between gap-3 hover:bg-slate-50/70 transition-colors">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="font-bold text-slate-800 text-[11.5px]">
                      {item.title}
                    </span>
                    <span className={`px-2 py-0.5 rounded-[var(--ui-radius-small)] text-[9.5px] font-black border ${item.badgeTone || 'bg-slate-100 text-slate-700'}`}>
                      {item.label}
                    </span>
                    <span className="text-[9px] font-bold text-slate-500 bg-slate-100 px-1.5 py-0.2 rounded">
                      Target: {item.level === 'XII' ? 'Semua XII' : item.level === 'XI' ? 'Semua XI' : item.level === 'X' ? 'Semua X' : item.level === 'specific' ? 'Manual' : 'Semua Kelas'}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 font-medium leading-relaxed">
                    {item.keterangan}
                  </p>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={() => handleStartEdit(item)}
                    className="p-1.5 rounded-[var(--ui-radius-small)] text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                    title="Edit Template"
                  >
                    <Edit2 size={13} />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(item.id)}
                    className="p-1.5 rounded-[var(--ui-radius-small)] text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                    title="Hapus Template"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            ))
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

