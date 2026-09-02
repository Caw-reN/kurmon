import React, { useState, useMemo } from 'react';
import { Shield, Clock, Calendar, User, FileText, CheckCircle2, X, AlertTriangle, Search, Sparkles } from 'lucide-react';
import { useDataStore } from '../../store/useDataStore';
import { useAppStore } from '../../store/useAppStore';

export default function SuperAdminAttendanceOverrideModal({ isOpen, onClose, onSuccess, currentUser }) {
  const userRole = String(currentUser?.role || '').toLowerCase().trim();
  const userName = String(currentUser?.username || '').toLowerCase().trim();
  const isSuperAdmin = ['admin', 'superadmin', 'super_admin'].includes(userRole) || userName === 'admin' || currentUser?.isSuperAdmin;

  const teachers = useDataStore(state => state.teachers) || [];
  const staffs = useDataStore(state => state.staffs) || [];
  const students = useDataStore(state => state.students) || [];

  const [personType, setPersonType] = useState('guru'); // 'guru' | 'karyawan' | 'siswa'
  const [selectedPersonId, setSelectedPersonId] = useState('');
  const [personSearch, setPersonSearch] = useState('');
  const [date, setDate] = useState(() => new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Jakarta' }));
  const [time, setTime] = useState('06:45:00');
  const [outTime, setOutTime] = useState('');
  const [status, setStatus] = useState('Hadir');
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Filter list by search query
  const filteredPeople = useMemo(() => {
    const list = personType === 'guru' ? teachers : personType === 'karyawan' ? staffs : students;
    if (!personSearch.trim()) return list.slice(0, 100);
    const q = personSearch.toLowerCase();
    return list.filter(p => {
      const name = String(p.name || p.nama || '').toLowerCase();
      const code = String(p.code || p.nis || p.nip || p.username || p.id || '').toLowerCase();
      const cls = String(p.class_name || p.kelas || '').toLowerCase();
      return name.includes(q) || code.includes(q) || cls.includes(q);
    }).slice(0, 100);
  }, [personType, teachers, staffs, students, personSearch]);

  const selectedPerson = useMemo(() => {
    const list = personType === 'guru' ? teachers : personType === 'karyawan' ? staffs : students;
    return list.find(p => String(p.code || p.nis || p.nip || p.id || p.username) === selectedPersonId);
  }, [personType, teachers, staffs, students, selectedPersonId]);

  if (!isOpen || !isSuperAdmin) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedPersonId) {
      setError('Silakan pilih orang/peserta yang akan dikoreksi absensinya.');
      return;
    }
    setError('');
    setLoading(true);

    try {
      // Robust token extraction across all possible session storages
      const token = currentUser?.authToken
        || JSON.parse(sessionStorage.getItem('school_schedule_session_v1') || '{}')?.authToken
        || JSON.parse(localStorage.getItem('school_schedule_session_v1') || '{}')?.authToken
        || localStorage.getItem('token')
        || sessionStorage.getItem('token')
        || '';

      const payload = {
        personType,
        personId: selectedPersonId,
        personName: selectedPerson?.name || selectedPerson?.nama || selectedPersonId,
        date,
        time,
        outTime,
        status,
        note: note.trim() || 'Koreksi jam oleh Super Admin'
      };

      const res = await fetch('/api/hikvision/super-admin-override', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify(payload)
      });

      const json = await res.json();
      if (res.ok && json.ok) {
        if (onSuccess) onSuccess(json.message || 'Koreksi jam berhasil disimpan.');
        onClose();
      } else {
        setError(json.error || 'Gagal menyimpan perubahan presensi.');
      }
    } catch (err) {
      console.error(err);
      setError('Terjadi kesalahan jaringan atau server tidak merespon.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-[var(--ui-radius-card)] shadow-[var(--ui-shadow-card)] max-w-lg w-full overflow-hidden border border-slate-200/80 animate-in zoom-in-95 duration-200 flex flex-col max-h-[92vh]">
        {/* Header - Aligned with Web Design System */}
        <div className="px-5 py-4 border-b border-slate-100 bg-slate-50/80 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-[var(--ui-radius-small)] bg-[var(--ui-primary)]/10 border border-[var(--ui-primary)]/20 flex items-center justify-center text-[var(--ui-primary)] shadow-xs shrink-0">
              <Shield size={18} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-black text-slate-800 tracking-tight">Koreksi Presensi & Jam Detil</h3>
                <span className="text-[9px] font-black uppercase bg-[var(--ui-primary)] text-white px-2 py-0.5 rounded-full shadow-xs">
                  Super Admin
                </span>
              </div>
              <p className="text-[10px] text-slate-400 font-medium mt-0.5">Input waktu scan presensi spesifik ke mesin dan database</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-[var(--ui-radius-small)] hover:bg-slate-200/70 text-slate-400 hover:text-slate-700 flex items-center justify-center cursor-pointer transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 overflow-y-auto space-y-4 text-xs flex-1">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-[var(--ui-radius-small)] text-rose-700 flex items-center gap-2 font-semibold text-xs animate-in fade-in">
              <AlertTriangle size={15} className="shrink-0 text-rose-600" />
              <span>{error}</span>
            </div>
          )}

          {/* 1. Pilih Kategori Pengguna */}
          <div>
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider block mb-1.5">
              1. Kategori Pengguna
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'guru', label: 'Guru Pendidik' },
                { id: 'karyawan', label: 'Karyawan' },
                { id: 'siswa', label: 'Siswa' }
              ].map(t => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => { setPersonType(t.id); setSelectedPersonId(''); setPersonSearch(''); }}
                  className={`py-2 px-3 rounded-[var(--ui-radius-control)] font-black text-xs border transition-all cursor-pointer text-center
                    ${personType === t.id 
                      ? 'bg-[var(--ui-primary)] text-white border-[var(--ui-primary)] shadow-sm' 
                      : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-white hover:border-slate-300'}`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* 2. Pilih Orang / Searchable */}
          <div>
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider block mb-1.5">
              2. Pilih {personType === 'guru' ? 'Guru' : personType === 'karyawan' ? 'Karyawan' : 'Siswa'}
            </label>
            <div className="space-y-2">
              <div className="relative">
                <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={personSearch}
                  onChange={e => setPersonSearch(e.target.value)}
                  placeholder={`Cari nama, NIP, NIS atau kode ${personType}...`}
                  className="w-full h-9 pl-8 pr-3 bg-slate-50 border border-slate-200 rounded-[var(--ui-radius-control)] text-xs font-bold text-slate-700 focus:bg-white focus:outline-none focus:border-[var(--ui-primary)] focus:ring-2 focus:ring-[var(--ui-primary)]/15 transition-all"
                />
              </div>

              <select
                value={selectedPersonId}
                onChange={e => setSelectedPersonId(e.target.value)}
                required
                className="w-full bg-slate-50 border border-slate-200 p-2.5 rounded-[var(--ui-radius-control)] text-xs font-bold text-slate-800 focus:bg-white focus:outline-none focus:border-[var(--ui-primary)] focus:ring-2 focus:ring-[var(--ui-primary)]/15"
              >
                <option value="">-- Pilih dari daftar ({filteredPeople.length} ditemukan) --</option>
                {filteredPeople.map(p => {
                  const id = String(p.code || p.nis || p.nip || p.id || p.username);
                  const name = p.name || p.nama || id;
                  const extra = p.class_name || p.kelas || p.code || p.nip || '';
                  return (
                    <option key={id} value={id}>
                      {name} {extra ? `(${extra})` : ''}
                    </option>
                  );
                })}
              </select>
            </div>
          </div>

          {/* 3. Tanggal & Jam Detil */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider block mb-1.5">
                3. Tanggal Absensi
              </label>
              <div className="relative">
                <input
                  type="date"
                  value={date}
                  onChange={e => setDate(e.target.value)}
                  required
                  className="w-full h-9 bg-slate-50 border border-slate-200 px-3 rounded-[var(--ui-radius-control)] text-xs font-bold text-slate-800 focus:bg-white focus:outline-none focus:border-[var(--ui-primary)] focus:ring-2 focus:ring-[var(--ui-primary)]/15"
                />
              </div>
            </div>

            <div>
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider block mb-1.5">
                4. Jam Masuk Detil (HH:mm:ss)
              </label>
              <div className="relative">
                <Clock size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={time}
                  onChange={e => setTime(e.target.value)}
                  placeholder="06:45:00"
                  required
                  pattern="^([0-1]?[0-9]|2[0-3]):[0-5][0-9](:[0-5][0-9])?$"
                  className="w-full h-9 pl-8 pr-3 bg-slate-50 border border-slate-200 rounded-[var(--ui-radius-control)] text-xs font-mono font-black text-slate-800 focus:bg-white focus:outline-none focus:border-[var(--ui-primary)] focus:ring-2 focus:ring-[var(--ui-primary)]/15"
                />
              </div>
              <div className="flex gap-1.5 mt-1.5">
                {['06:30:00', '06:45:00', '06:55:00', '07:10:00'].map(preset => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setTime(preset)}
                    className="text-[9.5px] font-bold bg-slate-100 hover:bg-[var(--ui-primary)]/10 hover:text-[var(--ui-primary)] px-2 py-0.5 rounded-[var(--ui-radius-small)] border border-slate-200 cursor-pointer transition-colors"
                  >
                    {preset.slice(0, 5)}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* 4. Status Kehadiran & Jam Pulang */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider block mb-1.5">
                5. Status Kehadiran
              </label>
              <select
                value={status}
                onChange={e => setStatus(e.target.value)}
                className="w-full h-9 bg-slate-50 border border-slate-200 px-3 rounded-[var(--ui-radius-control)] text-xs font-bold text-slate-800 focus:bg-white focus:outline-none focus:border-[var(--ui-primary)] focus:ring-2 focus:ring-[var(--ui-primary)]/15"
              >
                <option value="Hadir">Hadir (Tepat Waktu)</option>
                <option value="Terlambat">Terlambat</option>
                <option value="Izin">Izin</option>
                <option value="Sakit">Sakit</option>
                <option value="Dinas Luar">Dinas Luar</option>
                <option value="Alpa">Alpa</option>
              </select>
            </div>

            <div>
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider block mb-1.5">
                Jam Pulang (Opsional)
              </label>
              <input
                type="text"
                value={outTime}
                onChange={e => setOutTime(e.target.value)}
                placeholder="15:30:00 (Opsional)"
                className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-[var(--ui-radius-control)] text-xs font-mono font-semibold text-slate-800 focus:bg-white focus:outline-none focus:border-[var(--ui-primary)] focus:ring-2 focus:ring-[var(--ui-primary)]/15"
              />
            </div>
          </div>

          {/* 5. Catatan / Alasan */}
          <div>
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider block mb-1.5">
              6. Catatan Internal / Alasan
            </label>
            <textarea
              value={note}
              onChange={e => setNote(e.target.value)}
              rows={2}
              placeholder="Contoh: Koreksi mesin fingerprint gate timur / Izin kedinasan"
              className="w-full bg-slate-50 border border-slate-200 p-2.5 rounded-[var(--ui-radius-control)] text-xs font-medium text-slate-800 focus:bg-white focus:outline-none focus:border-[var(--ui-primary)] focus:ring-2 focus:ring-[var(--ui-primary)]/15 resize-none"
            />
          </div>

          {/* Footer Actions */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-[var(--ui-radius-control)] text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 cursor-pointer transition-colors"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2.5 bg-[var(--ui-primary)] hover:opacity-95 text-white rounded-[var(--ui-radius-control)] text-xs font-black shadow-xs flex items-center gap-1.5 cursor-pointer transition-all disabled:opacity-50"
            >
              <CheckCircle2 size={14} />
              <span>{loading ? 'Menyimpan Koreksi...' : 'Terapkan Koreksi Jam'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
