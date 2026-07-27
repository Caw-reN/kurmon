import { Button } from '../../components/ui.jsx';
import { useState, useEffect, useMemo, useCallback } from'react';
import { Users } from'lucide-react';
import useAuthStore from'../../store/monitoring/authStore.js';
import { Calendar, RefreshCw, Search, AlertCircle, CheckCircle2 } from'lucide-react';
import { PageHeader } from'../../components/monitoring/ui/index.js';
import { CustomSelect } from'../../components/CustomSelect.jsx';


const HARI_ID = ['Minggu','Senin','Selasa','Rabu','Kamis','Jumat','Sabtu'];

const STATUS_CONFIG = {'Hadir': { color:'bg-emerald-100 text-emerald-700 border-emerald-200', dot:'bg-emerald-500' },'Sakit': { color:'bg-sky-100 text-sky-700 border-sky-200', dot:'bg-sky-500' },'Izin': { color:'bg-blue-100 text-blue-700 border-blue-200', dot:'bg-blue-500' },'Alpa': { color:'bg-red-100 text-red-700 border-red-200', dot:'bg-red-500' },'Belum Terdeteksi': { color:'bg-amber-100 text-amber-700 border-amber-200', dot:'bg-amber-500' },
};

function StatusBadge({ status }) {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG['Belum Terdeteksi'];
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${cfg.color}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
      {status}
    </span>
  );
}

export default function AbsensiKBM({ classes = [], schedule = [] }) {
  const user = useAuthStore(state => state.user);
  const authToken = user?.authToken;
  const teacherCode = user?.code || user?.id ||'';

  const [tanggal, setTanggal] = useState(new Date().toISOString().split('T')[0]);
  const [filterKelas, setFilterKelas] = useState('');
  const [absensiData, setAbsensiData] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [lastUpdated, setLastUpdated] = useState(null);

  // Ambil kelas yang diajar guru hari ini
  const todayKelas = useMemo(() => {
    const today = new Date(tanggal);
    const dayName = HARI_ID[today.getDay()];
    if (!schedule || !Array.isArray(schedule) || !teacherCode) return [];
    const mySlots = schedule.filter(s => {
      if (s.day !== dayName) return false;
      const codes = (s.teacherCode ||'').split(',').map(c => c.trim());
      return codes.includes(teacherCode);
    });
    return [...new Set(mySlots.map(s => s.className))];
  }, [schedule, tanggal, teacherCode]);

  // Auto-select kelas pertama yang diajar guru hari ini
  useEffect(() => {
    if (todayKelas.length > 0 && !filterKelas) {
      setFilterKelas(todayKelas[0]);
    }
  }, [todayKelas]);

  const fetchAbsensi = useCallback(async () => {
    if (!authToken || !filterKelas) return;
    setIsLoading(true);
    try {
      const res = await fetch(`/api/kedisiplinan/absensi-kelas?kelas=${encodeURIComponent(filterKelas)}&tanggal=${tanggal}`, {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      const data = await res.json();
      if (data.ok) {
        setAbsensiData(data.data || []);
        setLastUpdated(new Date());
      }
    } catch (e) { console.error(e); }
    setIsLoading(false);
  }, [authToken, filterKelas, tanggal]);

  useEffect(() => { fetchAbsensi(); }, [fetchAbsensi]);

  const filteredData = useMemo(() => {
    return absensiData.filter(s => {
      const matchSearch = !search || (s.name ||'').toLowerCase().includes(search.toLowerCase()) || String(s.nis).includes(search);
      const matchStatus = filterStatus ==='all' || s.status === filterStatus;
      return matchSearch && matchStatus;
    });
  }, [absensiData, search, filterStatus]);

  // Stats
  const stats = useMemo(() => {
    const counts = { Hadir: 0, Sakit: 0, Izin: 0, Alpa: 0,'Belum Terdeteksi': 0 };
    absensiData.forEach(s => { if (counts[s.status] !== undefined) counts[s.status]++; });
    const hadir = counts['Hadir'];
    const total = absensiData.length;
    const pct = total > 0 ? Math.round((hadir / total) * 100) : 0;
    return { ...counts, total, hadir, pct };
  }, [absensiData]);

  const classOptions = useMemo(() => {
    const allClasses = classes.map(c => ({ value: c.name, label: c.name }));
    return allClasses;
  }, [classes]);

  const hariIni = HARI_ID[new Date(tanggal).getDay()];
  const isToday = tanggal === new Date().toISOString().split('T')[0];

  return (
    <div className="flex flex-col gap-4 w-full animate-in fade-in duration-300">
      <PageHeader
        title="Absensi Kelas (Mode KBM)"
        icon={Users}
        description="Lihat kehadiran siswa hari ini saat mengajar. Data diambil langsung dari sistem."
      />

      {/* Filter Bar */}
      <div className="ui-card p-4 flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="flex flex-wrap items-center gap-3 w-full">
          <div className="flex items-center gap-2">
            <Calendar size={15} className="text-slate-400" />
            <input
              type="date"
              value={tanggal}
              onChange={e => { setTanggal(e.target.value); setFilterKelas(''); }}
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold focus:outline-none focus:border-[var(--ui-primary)] transition-all"
            />
          </div>
          <div className="w-[180px]">
            <CustomSelect
              options={classOptions}
              value={filterKelas}
              onChange={v => setFilterKelas(v)}
              placeholder="Pilih Kelas..."
            />
          </div>
          <Button variant="outline" onClick={fetchAbsensi} disabled={isLoading || !filterKelas}
            className="flex items-center gap-1.5 shrink-0">
            <RefreshCw size={13} className={isLoading ?'animate-spin' :''} /> Refresh
          </Button>
        </div>
        {lastUpdated && (
          <p className="text-[10px] text-slate-400 whitespace-nowrap shrink-0">
            Update: {lastUpdated.toLocaleTimeString('id-ID', { hour:'2-digit', minute:'2-digit' })}
          </p>
        )}
      </div>

      {/* Jadwal Guru Hari Ini */}
      {todayKelas.length > 0 && (
        <div className="ui-card p-4">
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Kelas yang Anda Ajar Hari Ini ({hariIni})</p>
          <div className="flex flex-wrap gap-2">
            {todayKelas.map(k => (
              <Button variant="outline"
                key={k}
                onClick={() =>setFilterKelas(k)}
                className={`cursor-pointer ${filterKelas === k ?'bg-[var(--ui-primary)] text-white shadow-md' :'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
              >
                {k}</Button>
            ))}
          </div>
        </div>
      )}

      {/* Stats Bar */}
      {absensiData.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {[
            { key:'Hadir', label:'Hadir', val: stats.Hadir, color:'border-emerald-200 bg-emerald-50', textColor:'text-emerald-700' },
            { key:'Sakit', label:'Sakit', val: stats.Sakit, color:'border-sky-200 bg-sky-50', textColor:'text-sky-700' },
            { key:'Izin', label:'Izin', val: stats.Izin, color:'border-blue-200 bg-blue-50', textColor:'text-blue-700' },
            { key:'Alpa', label:'Alpa', val: stats.Alpa, color:'border-red-200 bg-red-50', textColor:'text-red-700' },
            { key:'Belum Terdeteksi', label:'Belum Terdeteksi', val: stats['Belum Terdeteksi'], color:'border-amber-200 bg-amber-50', textColor:'text-amber-700' },
          ].map(st => (
            <Button variant="outline"
              key={st.key}
              onClick={() =>setFilterStatus(filterStatus === st.key ?'all' : st.key)}
              className={`cursor-pointer text-left ${st.color}${filterStatus === st.key ?'ring-2 ring-offset-1 ring-current' :'hover:opacity-90'}`}
            >
              <p className={`text-2xl font-black ${st.textColor}`}>{st.val}</p>
              <p className={`text-xs font-bold ${st.textColor} opacity-80`}>{st.label}</p></Button>
          ))}
        </div>
      )}

      {/* Kehadiran Progress */}
      {absensiData.length > 0 && (
        <div className="ui-card p-5">
          <div className="flex items-center justify-between mb-2">
            <div>
              <h3 className="font-bold text-slate-800 text-sm">
                Tingkat Kehadiran — <span className="text-[var(--ui-primary)]">{filterKelas}</span>
              </h3>
              <p className="text-xs text-slate-500">
                {hariIni}, {new Date(tanggal).toLocaleDateString('id-ID', { day:'numeric', month:'long', year:'numeric' })}
                {isToday && <span className="ml-2 text-[10px] font-bold bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded-full">Hari Ini</span>}
              </p>
            </div>
            <span className={`text-3xl font-black ${stats.pct >= 90 ?'text-emerald-600' : stats.pct >= 75 ?'text-amber-600' :'text-red-600'}`}>
              {stats.pct}%
            </span>
          </div>
          <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
            <div
              className={`h-3 rounded-full transition-all duration-700 ${stats.pct >= 90 ?'bg-emerald-500' : stats.pct >= 75 ?'bg-amber-500' :'bg-red-500'}`}
              style={{ width: `${stats.pct}%` }}
            />
          </div>
          <p className="text-xs text-slate-500 mt-2">{stats.hadir} hadir dari {stats.total} siswa</p>
        </div>
      )}

      {/* Tabel Siswa */}
      {filterKelas ? (
        <div className="ui-card overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
            <h3 className="font-bold text-slate-800 text-sm">
              Daftar Kehadiran — {filterKelas}
            </h3>
            <div className="relative">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Cari siswa..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-8 pr-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:border-[var(--ui-primary)] transition-all"
              />
            </div>
          </div>

          {isLoading ? (
            <div className="p-10 text-center">
              <div className="w-6 h-6 border-2 border-[var(--ui-primary)] border-t-transparent rounded-full animate-spin mx-auto mb-2" />
              <p className="text-sm text-slate-500">Memuat data absensi...</p>
            </div>
          ) : filteredData.length === 0 ? (
            <div className="p-10 text-center">
              <Users size={36} className="mx-auto text-slate-300 mb-3" />
              <p className="text-sm font-bold text-slate-500">Tidak ada siswa ditemukan</p>
              <p className="text-xs text-slate-400 mt-1">Data absensi belum tersedia untuk kelas ini</p>
            </div>
          ) : (
            <>
              {/* Siswa Tidak Hadir — Prioritas di atas */}
              {filteredData.some(s => s.status !=='Hadir') && (
                <div>
                  <div className="px-5 py-2 bg-red-50/80 border-b border-red-100">
                    <p className="text-xs font-black text-red-700 uppercase tracking-wider flex items-center gap-1">
                      <AlertCircle size={12} /> Tidak Hadir / Perlu Perhatian
                    </p>
                  </div>
                  <div className="divide-y divide-red-50">
                    {filteredData.filter(s => s.status !=='Hadir').map((siswa, idx) => (
                      <div key={siswa.nis} className="px-5 py-3.5 flex items-center gap-4 hover:bg-red-50/30 transition-colors">
                        <div className="w-7 h-7 rounded-full bg-slate-200 flex items-center justify-center text-xs font-black text-slate-500 shrink-0">
                          {idx + 1}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-slate-800 text-sm truncate">{siswa.name}</p>
                          <p className="text-[10px] text-slate-500">NIS: {siswa.nis}</p>
                        </div>
                        <div className="flex items-center gap-3">
                          {siswa.keterangan && (
                            <span className="text-xs text-slate-500 italic max-w-[140px] truncate">{siswa.keterangan}</span>
                          )}
                          <StatusBadge status={siswa.status} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Siswa Hadir */}
              {filteredData.some(s => s.status ==='Hadir') && (
                <div>
                  <div className="px-5 py-2 bg-emerald-50/80 border-y border-emerald-100">
                    <p className="text-xs font-black text-emerald-700 uppercase tracking-wider flex items-center gap-1">
                      <CheckCircle2 size={12} /> Hadir ({filteredData.filter(s => s.status ==='Hadir').length})
                    </p>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-0 divide-x divide-y divide-slate-100">
                    {filteredData.filter(s => s.status ==='Hadir').map((siswa, idx) => (
                      <div key={siswa.nis} className="px-4 py-3 flex items-center gap-2.5 hover:bg-emerald-50/20 transition-colors">
                        <div className="w-5 h-5 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
                          <CheckCircle2 size={11} className="text-emerald-600" />
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold text-slate-700 text-xs truncate">{siswa.name}</p>
                          <p className="text-[10px] text-slate-400">{siswa.nis}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      ) : (
        <div className="ui-card p-10 text-center">
          <Users size={40} className="mx-auto text-slate-300 mb-3" />
          <h3 className="font-bold text-slate-500">Pilih Kelas</h3>
          <p className="text-sm text-slate-400 mt-1">Pilih kelas yang ingin dilihat absensinya dari dropdown di atas.</p>
          {todayKelas.length > 0 && (
            <div className="mt-4 flex justify-center flex-wrap gap-2">
              {todayKelas.map(k => (
                <Button variant="outline"
                  key={k}
                  onClick={() =>setFilterKelas(k)}
                  className="cursor-pointer"
                >
                  {k}</Button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Keterangan */}
      <div className="ui-card p-4 bg-amber-50/50 border border-amber-100">
        <p className="text-xs font-bold text-amber-800 flex items-center gap-2 mb-1">
          <AlertCircle size={14} /> Catatan Penting
        </p>
        <ul className="text-xs text-amber-700 space-y-0.5 list-disc ml-4">
          <li><strong>Hadir</strong>: Terdeteksi scan mesin absensi Hikvision</li>
          <li><strong>Sakit / Izin / Alpa</strong>: Dicatat manual oleh admin atau wali kelas di sistem</li>
          <li><strong>Belum Terdeteksi</strong>: Tidak scan & tidak ada catatan — kemungkinan telat atau lupa scan</li>
          <li>Data ini hanya untuk referensi guru saat mengajar dan diperbarui secara manual</li>
        </ul>
      </div>
    </div>
  );
}
