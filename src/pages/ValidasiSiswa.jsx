import { useEffect, useState } from'react';
import { useSearchParams } from'react-router-dom';


export default function ValidasiSiswa() {
  const [searchParams] = useSearchParams();
  const nis = searchParams.get('nis');
  const [status, setStatus] = useState('loading'); // loading, valid, invalid, error
  const [student, setStudent] = useState(null);
  const [schoolName, setSchoolName] = useState('SMK Karya Guna 2 Bekasi');

  useEffect(() => {
    if (!nis) {
      setStatus('invalid');
      return;
    }

    const fetchValidationData = async () => {
      try {
        const response = await fetch(`/api/student/verify?nis=${nis}`);
        if (!response.ok) {
           if (response.status === 404) {
              setStatus('invalid');
           } else {
              throw new Error('Gagal mengambil data dari server');
           }
           return;
        }
        const result = await response.json();
        
        if (result.ok && result.student) {
          if (result.school && result.school.name) {
             setSchoolName(result.school.name);
          }
          setStudent(result.student);
          setStatus('valid');
        } else {
          setStatus('invalid');
        }
      } catch (err) {
        console.error(err);
        setStatus('error');
      }
    };

    fetchValidationData();
  }, [nis]);

  if (status ==='loading') {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center font-sans text-slate-800 p-4">
        <Loader2 className="w-10 h-10 animate-spin text-emerald-600 mb-4" />
        <h2 className="text-xl font-bold">Memverifikasi Data...</h2>
        <p className="text-sm text-slate-500 mt-2 text-center">Mohon tunggu, sedang mencocokkan data dengan server pusat.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4 font-sans text-slate-800">
      <div className="max-w-md w-full bg-white rounded-[var(--ui-radius-small)] shadow-sm overflow-hidden border-none">
        
        {/* Header */}
        <div className={`p-6 text-white flex flex-col items-center justify-center text-center ${status ==='valid' ?'bg-emerald-600' :'bg-rose-600'}`}>
          {status ==='valid' ? (
            <ShieldCheck size={56} className="mb-2" />
          ) : (
            <AlertTriangle size={56} className="mb-2" />
          )}
          <h1 className="text-2xl font-black uppercase tracking-wide">
            {status ==='valid' ?'Data Tervalidasi' :'Data Tidak Ditemukan'}
          </h1>
          <p className="text-white/80 text-sm mt-1">
            {status ==='valid' ? `Validasi Kartu Pelajar ${schoolName}` :'Kartu Pelajar ini tidak terdaftar di sistem kami'}
          </p>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {status ==='valid' && student ? (
            <>
              <div className="flex flex-col items-center gap-4">
                <div className="w-24 h-32 rounded-[var(--ui-radius-small)] overflow-hidden bg-slate-100 border-2 border-slate-200 shadow-sm flex items-center justify-center shrink-0">
                  {student.photo ? (
                    <img src={student.photo} alt={student.name} className="w-full h-full object-cover" />
                  ) : (
                    <User size={40} className="text-slate-300" />
                  )}
                </div>
                
                <div className="text-center">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Status Siswa</p>
                  <div className="inline-flex items-center gap-1.5 bg-emerald-50 text-emerald-700 px-3 py-1 rounded-[var(--ui-radius-small)] text-sm font-bold border border-emerald-200">
                    <CheckCircle2 size={16} /> Aktif / Terdaftar
                  </div>
                </div>
              </div>

              <div className="bg-slate-50 rounded-[var(--ui-radius-small)] p-4 border-none space-y-3">
                <div className="flex flex-col">
                  <span className="text-xs font-bold text-slate-400 uppercase">Nama Lengkap</span>
                  <span className="font-bold text-slate-800 text-base">{student.name || student.namaSiswa ||'-'}</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-xs font-bold text-slate-400 uppercase">NIS / Nomor Induk Siswa</span>
                  <span className="font-mono text-slate-700">{student.nis ||'-'}</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-xs font-bold text-slate-400 uppercase">Tempat, Tanggal Lahir</span>
                  <span className="text-slate-700">{student.ttl ||'-'}</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-xs font-bold text-slate-400 uppercase">Jurusan</span>
                  <span className="text-slate-700">{student.major ||'-'}</span>
                </div>
              </div>
              
              <p className="text-xs text-center text-slate-500 font-semibold bg-blue-50 text-blue-700 p-3 rounded-[var(--ui-radius-small)]">
                Kartu pelajar ini adalah identitas resmi dan valid yang dikeluarkan oleh sistem informasi {schoolName}.
              </p>
            </>
          ) : (
            <div className="text-center py-6">
              <XCircle size={48} className="mx-auto text-rose-500 mb-4 opacity-50" />
              <h3 className="text-lg font-bold text-slate-800 mb-2">Validasi Gagal</h3>
              <p className="text-sm text-slate-500">
                Data untuk kartu ini (NIS: <span className="font-mono font-bold">{nis ||'Kosong'}</span>) tidak ditemukan di dalam database {schoolName}. 
                <br/><br/>
                Pastikan kartu ini asli atau silakan hubungi pihak tata usaha sekolah.
              </p>
            </div>
          )}
          
          <div className="pt-2">
             <Link to="/" className="w-full flex justify-center items-center bg-[var(--ui-primary)] hover:opacity-90 text-white rounded-[var(--ui-radius-control)] transition-colors h-10 px-4 text-sm font-bold">
               Kembali ke Beranda
             </Link>
          </div>
        </div>
        
      </div>
    </div>
  );
}
