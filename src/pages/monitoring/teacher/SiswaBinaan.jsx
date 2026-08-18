import { useState, useEffect } from'react';
import { ChevronUp, ChevronDown, Badge, BookOpen, Loader2 } from'lucide-react';
import { Avatar } from'../../../components/monitoring/ui/index.js';


/**
 * teacher/SiswaBinaan.jsx
 * Detail siswa bimbingan guru — diambil dari database.
 */





const SiswaCard = ({ siswa }) => {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="bg-white border-none rounded-[var(--ui-radius-small)] overflow-hidden">
      <button className="w-full flex items-center gap-4 text-left"
        onClick={() => setExpanded(!expanded)}>
        <Avatar name={siswa.name || siswa.nis ||'?'} size="lg" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <p className="font-bold text-slate-800">{siswa.name || siswa.username ||'Siswa'}</p>
          </div>
          <p className="text-xs text-slate-400">{siswa.kelas || siswa.class ||'-'} · {siswa.nis}</p>
        </div>
        <div className="text-slate-400">
          {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </div>
      </button>

      {expanded && (
        <div className="border-t border-slate-200 p-4 space-y-3 bg-slate-50">
          <div className="bg-white rounded-[var(--ui-radius-small)] p-3">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Tempat PKL</p>
            <p className="text-sm font-semibold text-slate-800">
              {siswa.location_id ? `Lokasi #${siswa.location_id}` :'Belum ditentukan'}
            </p>
          </div>
          <div className="bg-white rounded-[var(--ui-radius-small)] p-3">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Status PKL</p>
            <Badge variant={siswa.status ||'aktif'} label={siswa.status ||'Aktif'} />
          </div>
        </div>
      )}
    </div>
  );
};

const SiswaBinaan = () => {
  const [siswas, setSiswas] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/monitoring/pkl-students', {
      headers: {'Authorization': `Bearer ${JSON.parse(sessionStorage.getItem('school_schedule_session_v1'))?.authToken}` }
    })
    .then(res => res.json())
    .then(data => {
      if (data.ok) setSiswas(data.data || []);
      setLoading(false);
    })
    .catch(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Siswa Bimbingan</h1>
          <p className="text-sm text-slate-400 mt-0.5">
            {loading ?'Memuat...' : `${siswas.length} siswa PKL terdaftar`}
          </p>
        </div>
        <div className="hidden sm:flex items-center gap-2 text-sm text-[var(--ui-primary)] font-semibold bg-slate-100 px-3 py-1.5 rounded-[var(--ui-radius-small)]">
          <BookOpen size={14} />
          Realtime
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center p-20 bg-white border-none rounded-[var(--ui-radius-small)]">
          <Loader2 className="animate-spin text-[var(--ui-primary)]" size={32} />
        </div>
      ) : siswas.length === 0 ? (
        <div className="p-10 text-center text-slate-500 bg-white border border-dashed border-slate-300 rounded-[var(--ui-radius-small)]">
          <BookOpen className="mx-auto mb-3 text-slate-300" size={40} />
          <p className="font-semibold">Belum ada siswa PKL yang terdaftar.</p>
          <p className="text-xs mt-1 text-slate-400">Data akan muncul otomatis setelah admin menugaskan siswa.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {siswas.map(s => <SiswaCard key={s.id || s.nis} siswa={s} />)}
        </div>
      )}
    </div>
  );
};

export default SiswaBinaan;
