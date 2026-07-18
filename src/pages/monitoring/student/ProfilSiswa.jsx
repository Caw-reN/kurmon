import { User, GraduationCap, Shield } from'lucide-react';
import useAuthStore from'../../../store/monitoring/authStore';
import { Badge } from'lucide-react';
import { Avatar } from'../../../components/monitoring/ui/index.js';


/**
 * student/ProfilSiswa.jsx
 * Halaman profil siswa — informasi dari authStore, bukan dummy data.
 */





const ProfilSiswa = () => {
  const { user } = useAuthStore();

  const nama = user?.name || user?.username ||'Siswa';
  const nis = user?.username ||'-';
  const kelas = user?.kelas || user?.class_name || user?.class ||'-';
  const jurusan = user?.jurusan || (kelas !=='-' ? (kelas.split('')[1] ||'-') :'-');

  const infoItems = [
    { label:'NIS', value: nis, icon: Shield },
    { label:'Kelas', value: kelas, icon: GraduationCap },
    { label:'Jurusan', value: jurusan, icon: GraduationCap },
    { label:'Status', value: user?.status ||'Aktif', icon: User },
  ];

  return (
    <div className="px-4 pb-8 pt-4 space-y-5 max-w-3xl mx-auto w-full">
      {/* Profile header */}
      <div className="bg-[var(--ui-primary)] rounded-[var(--ui-radius-small)] p-6 text-center relative overflow-hidden">
        <div className="absolute -top-6 -right-6 w-24 h-24 rounded-full bg-white/10" />
        <div className="relative z-10">
          <Avatar name={nama} size="xl" className="mx-auto mb-3" />
          <h1 className="text-lg font-extrabold text-white">{nama}</h1>
          <p className="text-white/70 text-xs mt-0.5">{kelas}</p>
          {jurusan !=='-' && (
            <Badge variant={jurusan} label={jurusan} withDot={false}
              className="mt-2 !bg-white/20 !text-white border border-white/20" />
          )}
        </div>
      </div>

      {/* Info list */}
      <div className="bg-white border-none rounded-[var(--ui-radius-small)] overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-200">
          <p className="font-bold text-sm text-slate-800">Informasi Akun</p>
        </div>
        <div className="divide-y divide-slate-200">
          {infoItems.map(item => (
            <div key={item.label} className="flex items-start gap-3 px-4 py-3.5">
              <div className="w-8 h-8 bg-bg rounded-[var(--ui-radius-small)] flex items-center justify-center flex-shrink-0 mt-0.5">
                <item.icon size={15} className="text-slate-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">{item.label}</p>
                <p className="text-sm font-semibold text-slate-800 mt-0.5 leading-snug">{item.value}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ProfilSiswa;
