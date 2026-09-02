import React, { useState, useEffect } from 'react';
import { Modal } from '../ui.jsx';
import { Button } from '../ui.jsx';
import { CustomSelect } from '../CustomSelect.jsx';
import { Edit3, CheckCircle2, AlertCircle, X, Sparkles } from 'lucide-react';

/**
 * BulkEditModal.jsx
 * Modal untuk melakukan update massal (Bulk Edit) pada item yang di-select di tabel Master Data.
 */
export default function BulkEditModal({
  isOpen,
  onClose,
  tabKey,
  selectedIds = [],
  students = [],
  setStudents,
  classes = [],
  setClasses,
  teachers = [],
  setTeachers,
  staffs = [],
  setStaffs,
  majors = [],
  setMajors,
  subjects = [],
  setSubjects,
  rooms = [],
  setRooms,
  saveDatabaseNow,
  showNotification,
  updateSelectionForTab
}) {
  const [targetClass, setTargetClass] = useState('');
  const [targetGender, setTargetGender] = useState('');
  const [targetHomeroom, setTargetHomeroom] = useState('');
  const [targetMajor, setTargetMajor] = useState('');
  const [targetType, setTargetType] = useState('');
  const [targetGrade, setTargetGrade] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setTargetClass('');
      setTargetGender('');
      setTargetHomeroom('');
      setTargetMajor('');
      setTargetType('');
      setTargetGrade('');
      setIsSaving(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const count = selectedIds.length;

  const getTabLabel = (key) => {
    switch (key) {
      case 'siswa': return 'Data Siswa';
      case 'kelas': return 'Data Kelas';
      case 'jurusan': return 'Data Jurusan';
      case 'guru': return 'Data Guru';
      case 'karyawan': return 'Data Karyawan';
      case 'data_pegawai': return 'Data Pegawai';
      case 'mapel': return 'Mata Pelajaran';
      case 'ruangan': 
      case 'fasilitas': return 'Data Ruangan';
      default: return key;
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (count === 0) return;

    setIsSaving(true);
    try {
      const selectedSet = new Set(selectedIds.map(id => String(id).trim().toLowerCase()));

      if (tabKey === 'siswa') {
        if (!targetClass && !targetGender) {
          if (showNotification) showNotification("Pilih minimal satu opsi perubahan (misal Kelas atau Jenis Kelamin).", "warning");
          setIsSaving(false);
          return;
        }

        const updated = students.map(s => {
          const key1 = String(s.id || '').trim().toLowerCase();
          const key2 = String(s.code || '').trim().toLowerCase();
          const key3 = String(s.nis || '').trim().toLowerCase();
          if (selectedSet.has(key1) || selectedSet.has(key2) || selectedSet.has(key3)) {
            return {
              ...s,
              ...(targetClass ? { class_name: targetClass, kelas: targetClass } : {}),
              ...(targetGender ? { gender: targetGender } : {})
            };
          }
          return s;
        });

        if (setStudents) setStudents(updated);
        if (saveDatabaseNow) saveDatabaseNow();
        if (showNotification) showNotification(`Berhasil memperbarui kelas/data ${count} siswa!`, "success");
        if (updateSelectionForTab) updateSelectionForTab('siswa', () => []);
      } 
      else if (tabKey === 'kelas') {
        if (!targetHomeroom && !targetMajor) {
          if (showNotification) showNotification("Pilih minimal satu perubahan untuk kelas.", "warning");
          setIsSaving(false);
          return;
        }

        const updated = classes.map(c => {
          const key = String(c.name || '').trim().toLowerCase();
          if (selectedSet.has(key)) {
            return {
              ...c,
              ...(targetHomeroom ? { homeroom: targetHomeroom } : {}),
              ...(targetMajor ? { major: targetMajor } : {})
            };
          }
          return c;
        });

        if (setClasses) setClasses(updated);
        if (saveDatabaseNow) saveDatabaseNow();
        if (showNotification) showNotification(`Berhasil memperbarui ${count} kelas!`, "success");
        if (updateSelectionForTab) updateSelectionForTab('kelas', () => []);
      }
      else if (['guru', 'karyawan', 'data_pegawai'].includes(tabKey)) {
        if (!targetType && !targetMajor) {
          if (showNotification) showNotification("Pilih minimal satu perubahan data pegawai.", "warning");
          setIsSaving(false);
          return;
        }

        const updatedT = teachers.map(t => {
          const key = String(t.code || '').trim().toLowerCase();
          if (selectedSet.has(key)) {
            return {
              ...t,
              ...(targetType ? { type: targetType } : {}),
              ...(targetMajor ? { preferredMajor: targetMajor } : {})
            };
          }
          return t;
        });

        if (setTeachers) setTeachers(updatedT);
        if (saveDatabaseNow) saveDatabaseNow();
        if (showNotification) showNotification(`Berhasil memperbarui ${count} data pegawai!`, "success");
        if (updateSelectionForTab) updateSelectionForTab(tabKey, () => []);
      }
      else if (tabKey === 'mapel') {
        if (!targetMajor && !targetGrade) {
          if (showNotification) showNotification("Pilih minimal satu perubahan mata pelajaran.", "warning");
          setIsSaving(false);
          return;
        }

        const updatedS = subjects.map(m => {
          const key = String(m.name || '').trim().toLowerCase();
          if (selectedSet.has(key)) {
            return {
              ...m,
              ...(targetMajor ? { major: targetMajor } : {}),
              ...(targetGrade ? { grade: targetGrade } : {})
            };
          }
          return m;
        });

        if (setSubjects) setSubjects(updatedS);
        if (saveDatabaseNow) saveDatabaseNow();
        if (showNotification) showNotification(`Berhasil memperbarui ${count} mata pelajaran!`, "success");
        if (updateSelectionForTab) updateSelectionForTab('mapel', () => []);
      }
      else if (['ruangan', 'fasilitas'].includes(tabKey)) {
        if (!targetType && !targetMajor) {
          if (showNotification) showNotification("Pilih minimal satu perubahan ruangan.", "warning");
          setIsSaving(false);
          return;
        }

        const updatedR = rooms.map(r => {
          const key = String(r.id || '').trim().toLowerCase();
          if (selectedSet.has(key)) {
            return {
              ...r,
              ...(targetType ? { type: targetType } : {}),
              ...(targetMajor ? { major: targetMajor } : {})
            };
          }
          return r;
        });

        if (setRooms) setRooms(updatedR);
        if (saveDatabaseNow) saveDatabaseNow();
        if (showNotification) showNotification(`Berhasil memperbarui ${count} ruangan!`, "success");
        if (updateSelectionForTab) updateSelectionForTab(tabKey, () => []);
      }

      onClose();
    } catch (err) {
      console.error("Bulk edit error:", err);
      if (showNotification) showNotification("Gagal melakukan perubahan massal.", "error");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <div className="p-6 w-full max-w-md space-y-5 font-sans">
        
        {/* Header */}
        <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
          <div className="w-11 h-11 rounded-[var(--ui-radius-card)] bg-indigo-50 text-indigo-600 border border-indigo-200/80 flex items-center justify-center shrink-0 shadow-xs">
            <Edit3 size={22} />
          </div>
          <div>
            <h3 className="font-black text-slate-900 text-base leading-tight">Edit Massal (Bulk Edit)</h3>
            <p className="text-xs font-bold text-indigo-600 mt-0.5">
              {count} data {getTabLabel(tabKey)} terpilih
            </p>
          </div>
        </div>

        {/* Info Box */}
        <div className="p-3.5 rounded-[var(--ui-radius-small)] bg-indigo-50/80 border border-indigo-200 text-xs font-medium text-indigo-900 leading-relaxed">
          Perubahan yang dimasukkan di bawah ini akan diterapkan secara otomatis ke <strong className="font-bold">{count} item</strong> yang Anda centang.
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          
          {/* 1. SISWA FORM */}
          {tabKey === 'siswa' && (
            <>
              <div>
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 mb-1.5 block">
                  Ubah Kelas Ke:
                </label>
                <CustomSelect
                  value={targetClass}
                  onChange={(val) => setTargetClass(val)}
                  options={[
                    { value: '', label: '-- Biarkan Tetap / Jangan Ubah Kelas --' },
                    ...(classes || []).map(c => ({ value: c.name, label: `Kelas ${c.name}` }))
                  ]}
                  searchable={true}
                  placeholder="Pilih Kelas"
                />
              </div>

              <div>
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 mb-1.5 block">
                  Ubah Jenis Kelamin Ke:
                </label>
                <CustomSelect
                  value={targetGender}
                  onChange={(val) => setTargetGender(val)}
                  options={[
                    { value: '', label: '-- Biarkan Tetap / Jangan Ubah Jenis Kelamin --' },
                    { value: 'L', label: 'Laki-laki (L)' },
                    { value: 'P', label: 'Perempuan (P)' }
                  ]}
                  searchable={false}
                  placeholder="Pilih Jenis Kelamin"
                />
              </div>
            </>
          )}

          {/* 2. KELAS FORM */}
          {tabKey === 'kelas' && (
            <>
              <div>
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 mb-1.5 block">
                  Ubah Wali Kelas Ke:
                </label>
                <CustomSelect
                  value={targetHomeroom}
                  onChange={(val) => setTargetHomeroom(val)}
                  options={[
                    { value: '', label: '-- Biarkan Tetap / Jangan Ubah Wali Kelas --' },
                    ...(teachers || []).map(t => ({ value: t.code, label: `${t.name || t.code} (${t.code})` }))
                  ]}
                  searchable={true}
                  placeholder="Pilih Wali Kelas"
                />
              </div>

              <div>
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 mb-1.5 block">
                  Ubah Jurusan Ke:
                </label>
                <CustomSelect
                  value={targetMajor}
                  onChange={(val) => setTargetMajor(val)}
                  options={[
                    { value: '', label: '-- Biarkan Tetap / Jangan Ubah Jurusan --' },
                    ...(majors || []).map(m => {
                      const mName = typeof m === 'object' ? m.name : m;
                      return { value: mName, label: `Jurusan ${mName}` };
                    })
                  ]}
                  searchable={true}
                  placeholder="Pilih Jurusan"
                />
              </div>
            </>
          )}

          {/* 3. GURU / KARYAWAN FORM */}
          {['guru', 'karyawan', 'data_pegawai'].includes(tabKey) && (
            <>
              <div>
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 mb-1.5 block">
                  Ubah Tipe / Peran Ke:
                </label>
                <CustomSelect
                  value={targetType}
                  onChange={(val) => setTargetType(val)}
                  options={[
                    { value: '', label: '-- Biarkan Tetap / Jangan Ubah Tipe --' },
                    { value: 'Umum', label: 'Umum' },
                    { value: 'Kejuruan', label: 'Kejuruan' },
                    { value: 'Piket', label: 'Guru Piket' }
                  ]}
                  searchable={false}
                  placeholder="Pilih Tipe"
                />
              </div>

              <div>
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 mb-1.5 block">
                  Ubah Preferensi Jurusan Ke:
                </label>
                <CustomSelect
                  value={targetMajor}
                  onChange={(val) => setTargetMajor(val)}
                  options={[
                    { value: '', label: '-- Biarkan Tetap / Jangan Ubah Jurusan --' },
                    { value: 'Semua', label: 'Semua Jurusan' },
                    ...(majors || []).map(m => {
                      const mName = typeof m === 'object' ? m.name : m;
                      return { value: mName, label: `Jurusan ${mName}` };
                    })
                  ]}
                  searchable={true}
                  placeholder="Pilih Preferensi Jurusan"
                />
              </div>
            </>
          )}

          {/* 4. MAPEL FORM */}
          {tabKey === 'mapel' && (
            <>
              <div>
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 mb-1.5 block">
                  Ubah Kategori Jurusan Ke:
                </label>
                <CustomSelect
                  value={targetMajor}
                  onChange={(val) => setTargetMajor(val)}
                  options={[
                    { value: '', label: '-- Biarkan Tetap / Jangan Ubah Jurusan --' },
                    { value: 'Umum', label: 'Mata Pelajaran Umum' },
                    ...(majors || []).map(m => {
                      const mName = typeof m === 'object' ? m.name : m;
                      return { value: mName, label: `Jurusan ${mName}` };
                    })
                  ]}
                  searchable={true}
                  placeholder="Pilih Kategori Jurusan"
                />
              </div>

              <div>
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 mb-1.5 block">
                  Ubah Tingkat Target Ke:
                </label>
                <CustomSelect
                  value={targetGrade}
                  onChange={(val) => setTargetGrade(val)}
                  options={[
                    { value: '', label: '-- Biarkan Tetap / Jangan Ubah Tingkat --' },
                    { value: 'Semua', label: 'Semua Tingkat' },
                    { value: 'X', label: 'Tingkat X' },
                    { value: 'XI', label: 'Tingkat XI' },
                    { value: 'XII', label: 'Tingkat XII' }
                  ]}
                  searchable={false}
                  placeholder="Pilih Tingkat"
                />
              </div>
            </>
          )}

          {/* 5. RUANGAN FORM */}
          {['ruangan', 'fasilitas'].includes(tabKey) && (
            <>
              <div>
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 mb-1.5 block">
                  Ubah Jenis Ruangan Ke:
                </label>
                <CustomSelect
                  value={targetType}
                  onChange={(val) => setTargetType(val)}
                  options={[
                    { value: '', label: '-- Biarkan Tetap / Jangan Ubah Jenis --' },
                    { value: 'Teori', label: 'Ruang Teori (Kelas)' },
                    { value: 'Praktik', label: 'Ruang Praktik (Lab/Bengkel)' }
                  ]}
                  searchable={false}
                  placeholder="Pilih Jenis Ruangan"
                />
              </div>

              <div>
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 mb-1.5 block">
                  Ubah Alokasi Jurusan Ke:
                </label>
                <CustomSelect
                  value={targetMajor}
                  onChange={(val) => setTargetMajor(val)}
                  options={[
                    { value: '', label: '-- Biarkan Tetap / Jangan Ubah Jurusan --' },
                    { value: 'All', label: 'Semua Jurusan (Umum)' },
                    ...(majors || []).map(m => {
                      const mName = typeof m === 'object' ? m.name : m;
                      return { value: mName, label: `Jurusan ${mName}` };
                    })
                  ]}
                  searchable={true}
                  placeholder="Pilih Alokasi Jurusan"
                />
              </div>
            </>
          )}

          <div className="pt-3 flex items-center justify-end gap-3 border-t border-slate-100">
            <Button
              type="button"
              variant="secondary"
              onClick={onClose}
              disabled={isSaving}
              className="text-xs gap-1.5 font-bold"
            >
              <X size={15} /> Batal
            </Button>
            <Button
              type="submit"
              disabled={isSaving}
              className="text-xs gap-1.5 font-black bg-indigo-600 hover:bg-indigo-700 text-white"
            >
              <CheckCircle2 size={15} /> {isSaving ? "Menyimpan..." : `Terapkan ke ${count} Item`}
            </Button>
          </div>

        </form>

      </div>
    </Modal>
  );
}
