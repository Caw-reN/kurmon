import React, { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { 
  Loader2, ShieldCheck, AlertTriangle, User, CheckCircle2, 
  XCircle, Lock, ShieldAlert, Sparkles, Building2, Check, ArrowLeft 
} from 'lucide-react';

export default function ValidasiSiswa() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('v') || searchParams.get('token');
  const rawNis = searchParams.get('nis');

  const [status, setStatus] = useState('loading'); // loading | valid | invalid | tampered | error
  const [errorMessage, setErrorMessage] = useState('');
  const [student, setStudent] = useState(null);
  const [schoolName, setSchoolName] = useState('SMK Karya Guna 2 Bekasi');
  const [isEncrypted, setIsEncrypted] = useState(false);
  const [imgLoaded, setImgLoaded] = useState(false);

  useEffect(() => {
    // Jika tidak ada token terenkripsi dan tidak ada NIS
    if (!token && !rawNis) {
      setStatus('invalid');
      setErrorMessage('Link verifikasi kartu tidak lengkap atau tidak valid.');
      return;
    }

    const fetchValidationData = async () => {
      try {
        // Prioritaskan token terenkripsi (?v= atau ?token=)
        const verifyUrl = token 
          ? `/api/student/verify?v=${encodeURIComponent(token)}`
          : `/api/student/verify?nis=${encodeURIComponent(rawNis)}`;

        const response = await fetch(verifyUrl);
        const result = await response.json().catch(() => ({}));

        if (!response.ok) {
          if (response.status === 403 || result?.tampered) {
            setStatus('tampered');
            setErrorMessage(result?.message || 'Akses ditolak: Mengganti NIS langsung di link dilarang demi keamanan data.');
          } else if (response.status === 404) {
            setStatus('invalid');
            setErrorMessage(result?.message || 'Data kartu pelajar ini tidak terdaftar di sistem sekolah.');
          } else {
            setStatus('error');
            setErrorMessage(result?.message || 'Gagal mengambil data dari server.');
          }
          return;
        }

        if (result.ok && result.student) {
          if (result.school && result.school.name) {
            setSchoolName(result.school.name);
          }
          setStudent(result.student);
          setIsEncrypted(Boolean(result.isEncrypted || token));
          setStatus('valid');
        } else {
          setStatus('invalid');
          setErrorMessage(result?.message || 'Data siswa tidak valid.');
        }
      } catch (err) {
        console.error('Validation Error:', err);
        setStatus('error');
        setErrorMessage('Terjadi gangguan jaringan saat memverifikasi kartu.');
      }
    };

    fetchValidationData();
  }, [token, rawNis]);

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center font-sans text-slate-800 p-4">
        <div className="w-16 h-16 rounded-2xl bg-emerald-50 border border-emerald-200/80 flex items-center justify-center mb-4 shadow-sm">
          <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
        </div>
        <h2 className="text-lg font-black text-slate-900 tracking-tight">Memverifikasi Tanda Tangan Digital...</h2>
        <p className="text-xs text-slate-500 mt-1 text-center max-w-sm">
          Mohon tunggu, sistem sedang memverifikasi keaslian kode kartu pelajar dan mendekripsi data dari server.
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-100 to-slate-200/80 flex items-center justify-center p-4 font-sans text-slate-800">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl overflow-hidden border border-slate-200/80 animate-in fade-in zoom-in-95 duration-300">
        
        {/* Header Banner */}
        <div className={`p-6 text-white flex flex-col items-center justify-center text-center relative overflow-hidden ${
          status === 'valid' ? 'bg-gradient-to-br from-emerald-600 to-teal-700' : 'bg-gradient-to-br from-rose-600 to-rose-800'
        }`}>
          {/* Subtle background badge ornament */}
          <div className="absolute -right-6 -bottom-6 w-32 h-32 bg-white/10 rounded-full blur-xl pointer-events-none" />
          
          {status === 'valid' ? (
            <div className="w-16 h-16 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center mb-2 shadow-inner border border-white/30">
              <ShieldCheck size={36} className="text-white" strokeWidth={2.2} />
            </div>
          ) : (
            <div className="w-16 h-16 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center mb-2 shadow-inner border border-white/30">
              <ShieldAlert size={36} className="text-white" strokeWidth={2.2} />
            </div>
          )}

          <h1 className="text-xl font-black uppercase tracking-wider text-white">
            {status === 'valid' ? 'Kartu Sah & Tervalidasi' : (status === 'tampered' ? 'Verifikasi Ditolak' : 'Data Tidak Ditemukan')}
          </h1>
          <p className="text-white/90 text-xs mt-1 font-medium max-w-xs">
            {status === 'valid' 
              ? `Identitas Resmi Pelajar ${schoolName}` 
              : `Sistem Pengamanan Data Siswa ${schoolName}`}
          </p>

          {/* Badge Enkripsi Terverifikasi */}
          {status === 'valid' && (
            <div className="mt-3 inline-flex items-center gap-1.5 px-3 py-1 bg-white/15 backdrop-blur-md rounded-full border border-white/25 text-[10px] font-extrabold tracking-wide text-white">
              <Lock size={11} className="text-emerald-200" />
              <span>Tanda Tangan Digital Terenkripsi AES-256</span>
            </div>
          )}
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-5">
          {status === 'valid' && student ? (
            <>
              {/* Foto & Status Keaktifan */}
              <div className="flex flex-col items-center gap-3">
                <div className="relative w-28 h-36 rounded-xl overflow-hidden bg-slate-100 border-2 border-emerald-300 shadow-md flex items-center justify-center shrink-0">
                  {student.photo ? (
                    <>
                      <img 
                        src={student.photo} 
                        alt={student.name || student.namaSiswa} 
                        onLoad={() => setImgLoaded(true)}
                        className={`w-full h-full object-cover transition-opacity duration-300 ${imgLoaded ? 'opacity-100' : 'opacity-0'}`} 
                      />
                      {!imgLoaded && (
                        <div className="absolute inset-0 flex items-center justify-center bg-slate-100">
                          <Loader2 size={20} className="animate-spin text-emerald-600" />
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="flex flex-col items-center justify-center text-slate-300 gap-1 p-2 text-center">
                      <User size={44} strokeWidth={1.5} />
                      <span className="text-[9px] font-bold text-slate-400 leading-tight">Foto Belum Tersedia</span>
                    </div>
                  )}

                  <div className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-xs">
                    <Check size={12} strokeWidth={3} />
                  </div>
                </div>
                
                <div className="text-center">
                  <div className="inline-flex items-center gap-1.5 bg-emerald-50 text-emerald-800 px-3 py-1 rounded-full text-xs font-black border border-emerald-200 shadow-2xs">
                    <CheckCircle2 size={14} className="text-emerald-600" /> Siswa Aktif &amp; Terdaftar
                  </div>
                </div>
              </div>

              {/* Data Detail Siswa */}
              <div className="bg-slate-50/80 rounded-xl p-4 border border-slate-200/70 space-y-3">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Nama Lengkap</span>
                  <span className="font-black text-slate-900 text-base leading-tight block">
                    {student.name || student.namaSiswa || '-'}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-200/60">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">NIS</span>
                    <span className="font-mono font-extrabold text-slate-800 text-xs">
                      {student.nis || '-'}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Kelas</span>
                    <span className="font-bold text-slate-800 text-xs">
                      {student.class_name || student.kelas || '-'}
                    </span>
                  </div>
                </div>

                <div className="pt-1 border-t border-slate-200/60">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Kompetensi Keahlian / Jurusan</span>
                  <span className="font-bold text-slate-800 text-xs block">
                    {student.major || student.jurusan || '-'}
                  </span>
                </div>

                <div className="pt-1 border-t border-slate-200/60">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Tempat, Tanggal Lahir</span>
                  <span className="font-semibold text-slate-700 text-xs block">
                    {student.ttl || '-'}
                  </span>
                </div>
              </div>
              
              <div className="p-3 bg-emerald-50/60 border border-emerald-200/70 rounded-xl text-center">
                <p className="text-[11px] text-emerald-900 font-semibold leading-relaxed">
                  Kartu pelajar ini adalah identitas resmi dan sah yang dikeluarkan oleh sistem informasi <strong>{schoolName}</strong>.
                </p>
              </div>
            </>
          ) : (
            /* Tampilan Penolakan / Error Tamper */
            <div className="text-center py-4 space-y-3">
              <div className="w-14 h-14 rounded-full bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center mx-auto shadow-2xs">
                <XCircle size={32} />
              </div>

              <div>
                <h3 className="text-base font-black text-slate-900">
                  {status === 'tampered' ? 'Kode Verifikasi Tidak Cocok' : 'Kartu Tidak Terdaftar'}
                </h3>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed max-w-sm mx-auto">
                  {errorMessage || 'Tanda tangan digital kartu tidak sah atau telah dimodifikasi secara manual.'}
                </p>
              </div>

              {status === 'tampered' && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-left space-y-1">
                  <div className="flex items-center gap-1.5 text-amber-900 font-bold text-xs">
                    <Lock size={13} className="text-amber-700 shrink-0" />
                    <span>Perlindungan Privasi Siswa Aktif</span>
                  </div>
                  <p className="text-[11px] text-amber-800/90 leading-relaxed">
                    Untuk mencegah manipulasi URL dan melindungi privasi data siswa, validasi kartu <strong>hanya dapat dibuka melalui pemindaian QR Code resmi</strong> yang tercetak pada kartu pelajar fisik.
                  </p>
                </div>
              )}
            </div>
          )}
          
          <div className="pt-2">
            <Link 
              to="/" 
              className="w-full flex justify-center items-center gap-1.5 bg-slate-900 hover:bg-slate-800 active:scale-98 text-white rounded-xl transition-all h-10 px-4 text-xs font-black shadow-xs cursor-pointer"
            >
              <ArrowLeft size={14} />
              <span>Kembali ke Beranda Sekolah</span>
            </Link>
          </div>
        </div>

      </div>
    </div>
  );
}
