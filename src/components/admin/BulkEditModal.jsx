import React, { useState, useEffect } from 'react';
import { Modal } from '../ui.jsx';
import { Button } from '../ui.jsx';
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
          <div className="w-11 h-11 rounded-2xl bg-indigo-50 text-indigo-600 border border-indigo-200/80 flex items-center justify-center shrink-0 shadow-2xs">
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
        <div className="p-3.5 rounded-xl bg-indigo-50/80 border border-indigo-200 text-xs font-medium text-indigo-900 leading-relaxed">
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
                <select
                  value={targetClass}
                  onChange={(e) => setTargetClass(e.target.value)}
                  className="w-full border border-slate-200 bg-slate-50/70 p-3 rounded-xl text-xs font-bold text-slate-800 focus:bg-white focus:outline-indigo-500"
                >
                  <option value="">-- Biarkan Tetap / Jangan Ubah Kelas --</option>
                  {(classes || []).map(c => (
                    <option key={c.name} value={c.name}>Kelas {c.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 mb-1.5 block">
                  Ubah Jenis Kelamin Ke:
                </label>
                <select
                  value={targetGender}
                  onChange={(e) => setTargetGender(e.target.value)}
                  className="w-full border border-slate-200 bg-slate-50/70 p-3 rounded-xl text-xs font-bold text-slate-800 focus:bg-white focus:outline-indigo-500"
                >
                  <option value="">-- Biarkan Tetap / Jangan Ubah Jenis Kelamin --</option>
                  <option value="L">Laki-laki (L)</option>
                  <option value="P">Perempuan (P)</option>
                </select>
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
                <select
                  value={targetHomeroom}
                  onChange={(e) => setTargetHomeroom(e.target.value)}
                  className="w-full border border-slate-200 bg-slate-50/70 p-3 rounded-xl text-xs font-bold text-slate-800 focus:bg-white focus:outline-indigo-500"
                >
                  <option value="">-- Biarkan Tetap / Jangan Ubah Wali Kelas --</option>
                  {(teachers || []).map(t => (
                    <option key={t.code} value={t.code}>{t.name || t.code}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 mb-1.5 block">
                  Ubah Jurusan Ke:
                </label>
                <select
                  value={targetMajor}
                  onChange={(e) => setTargetMajor(e.target.value)}
                  className="w-full border border-slate-200 bg-slate-50/70 p-3 rounded-xl text-xs font-bold text-slate-800 focus:bg-white focus:outline-indigo-500"
                >
                  <option value="">-- Biarkan Tetap / Jangan Ubah Jurusan --</option>
                  {(majors || []).map(m => {
                    const mName = typeof m === 'object' ? m.name : m;
                    return <option key={mName} value={mName}>Jurusan {mName}</option>;
                  })}
                </select>
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
                <select
                  value={targetType}
                  onChange={(e) => setTargetType(e.target.value)}
                  className="w-full border border-slate-200 bg-slate-50/70 p-3 rounded-xl text-xs font-bold text-slate-800 focus:bg-white focus:outline-indigo-500"
                >
                  <option value="">-- Biarkan Tetap / Jangan Ubah Tipe --</option>
                  <option value="Umum">Umum</option>
                  <option value="Kejuruan">Kejuruan</option>
                  <option value="Piket">Guru Piket</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 mb-1.5 block">
                  Ubah Preferensi Jurusan Ke:
                </label>
                <select
                  value={targetMajor}
                  onChange={(e) => setTargetMajor(e.target.value)}
                  className="w-full border border-slate-200 bg-slate-50/70 p-3 rounded-xl text-xs font-bold text-slate-800 focus:bg-white focus:outline-indigo-500"
                >
                  <option value="">-- Biarkan Tetap / Jangan Ubah Jurusan --</option>
                  <option value="Semua">Semua Jurusan</option>
                  {(majors || []).map(m => {
                    const mName = typeof m === 'object' ? m.name : m;
                    return <option key={mName} value={mName}>Jurusan {mName}</option>;
                  })}
                </select>
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
                <select
                  value={targetMajor}
                  onChange={(e) => setTargetMajor(e.target.value)}
                  className="w-full border border-slate-200 bg-slate-50/70 p-3 rounded-xl text-xs font-bold text-slate-800 focus:bg-white focus:outline-indigo-500"
                >
                  <option value="">-- Biarkan Tetap / Jangan Ubah Jurusan --</option>
                  <option value="Umum">Mata Pelajaran Umum</option>
                  {(majors || []).map(m => {
                    const mName = typeof m === 'object' ? m.name : m;
                    return <option key={mName} value={mName}>Jurusan {mName}</option>;
                  })}
                </select>
              </div>

              <div>
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 mb-1.5 block">
                  Ubah Tingkat Target Ke:
                </label>
                <select
                  value={targetGrade}
                  onChange={(e) => setTargetGrade(e.target.value)}
                  className="w-full border border-slate-200 bg-slate-50/70 p-3 rounded-xl text-xs font-bold text-slate-800 focus:bg-white focus:outline-indigo-500"
                >
                  <option value="">-- Biarkan Tetap / Jangan Ubah Tingkat --</option>
                  <option value="Semua">Semua Tingkat</option>
                  <option value="X">Tingkat X</option>
                  <option value="XI">Tingkat XI</option>
                  <option value="XII">Tingkat XII</option>
                </select>
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
                <select
                  value={targetType}
                  onChange={(e) => setTargetType(e.target.value)}
                  className="w-full border border-slate-200 bg-slate-50/70 p-3 rounded-xl text-xs font-bold text-slate-800 focus:bg-white focus:outline-indigo-500"
                >
                  <option value="">-- Biarkan Tetap / Jangan Ubah Jenis --</option>
                  <option value="Teori">Ruang Teori (Kelas)</option>
                  <option value="Praktik">Ruang Praktik (Lab/Bengkel)</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 mb-1.5 block">
                  Ubah Alokasi Jurusan Ke:
                </label>
                <select
                  value={targetMajor}
                  onChange={(e) => setTargetMajor(e.target.value)}
                  className="w-full border border-slate-200 bg-slate-50/70 p-3 rounded-xl text-xs font-bold text-slate-800 focus:bg-white focus:outline-indigo-500"
                >
                  <option value="">-- Biarkan Tetap / Jangan Ubah Jurusan --</option>
                  <option value="All">Semua Jurusan (Umum)</option>
                  {(majors || []).map(m => {
                    const mName = typeof m === 'object' ? m.name : m;
                    return <option key={mName} value={mName}>Jurusan {mName}</option>;
                  })}
                </select>
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
