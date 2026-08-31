import React, { useState, useMemo } from 'react';
import { Shield, Clock, Calendar, User, FileText, CheckCircle2, X, AlertTriangle, Search } from 'lucide-react';
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
      const token = localStorage.getItem('token') || localStorage.getItem('kurmon_token');
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
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-200 animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-5 py-4 bg-slate-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Shield size={18} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-black tracking-tight">Koreksi Presensi & Jam Detil</h3>
                <span className="text-[9px] font-black uppercase bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded-full">
                  Super Admin
                </span>
              </div>
              <p className="text-[10px] text-slate-400 font-medium mt-0.5">Edit dan input waktu presensi spesifik (Rahasia)</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-7 h-7 rounded-lg bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white flex items-center justify-center cursor-pointer transition-colors"
          >
            <X size={15} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 overflow-y-auto space-y-4 text-xs flex-1">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 flex items-center gap-2 font-semibold text-xs">
              <AlertTriangle size={15} className="shrink-0 text-rose-600" />
              <span>{error}</span>
            </div>
          )}

          {/* 1. Pilih Tipe Personel */}
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
                  className={`py-2 px-3 rounded-xl font-bold text-xs border transition-all cursor-pointer text-center
                    ${personType === t.id 
                      ? 'bg-indigo-50 border-indigo-500 text-indigo-900 shadow-2xs ring-2 ring-indigo-500/20' 
                      : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-white'}`}
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
                  className="w-full h-8.5 pl-8 pr-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:bg-white focus:outline-none focus:border-indigo-500 transition-all"
                />
              </div>

              <select
                value={selectedPersonId}
                onChange={e => setSelectedPersonId(e.target.value)}
                required
                className="w-full bg-slate-50 border border-slate-200 p-2.5 rounded-xl text-xs font-bold text-slate-800 focus:bg-white focus:outline-none focus:border-indigo-500"
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
                  className="w-full bg-slate-50 border border-slate-200 p-2 rounded-xl text-xs font-bold text-slate-800 focus:bg-white focus:outline-none focus:border-indigo-500"
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
                  className="w-full h-8.5 pl-8 pr-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-800 focus:bg-white focus:outline-none focus:border-indigo-500"
                />
              </div>
              <div className="flex gap-1 mt-1">
                {['06:30:00', '06:45:00', '06:55:00', '07:10:00'].map(preset => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setTime(preset)}
                    className="text-[9px] font-semibold bg-slate-100 hover:bg-indigo-50 hover:text-indigo-600 px-1.5 py-0.5 rounded border border-slate-200 cursor-pointer"
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
                className="w-full bg-slate-50 border border-slate-200 p-2 rounded-xl text-xs font-bold text-slate-800 focus:bg-white focus:outline-none focus:border-indigo-500"
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
                className="w-full h-8.5 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-semibold text-slate-800 focus:bg-white focus:outline-none focus:border-indigo-500"
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
              className="w-full bg-slate-50 border border-slate-200 p-2.5 rounded-xl text-xs font-medium text-slate-800 focus:bg-white focus:outline-none focus:border-indigo-500 resize-none"
            />
          </div>

          {/* Footer Actions */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 cursor-pointer transition-colors"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black shadow-sm flex items-center gap-1.5 cursor-pointer transition-all disabled:opacity-50"
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
