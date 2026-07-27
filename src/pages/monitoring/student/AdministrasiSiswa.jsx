import React, { useState, useEffect } from'react';
import useAuthStore from'../../../store/monitoring/authStore.js';
import { loadInitialState } from'../../../utils/state.js';
import { CheckCircle, AlertCircle, XCircle, Clock, Plus, FileText, Printer, Download, ArrowLeft, Trash2, Send, Building, RefreshCw } from'lucide-react';
import { PaginationControls } from'../../../components/ui/PaginationControls.jsx';
import { Button } from'../../../components/ui.jsx';


const AdministrasiSiswa = () => {
  const { user } = useAuthStore();
  const [activeTab, setActiveTab] = useState("surat"); // surat, konfirmasi, mutasi
  const [viewMode, setViewMode] = useState("list"); // list, create
  const [loading, setLoading] = useState(false);

  const appSettings = React.useMemo(() => {
    const defaults = { 
      useKopSuratGambar: false,
      kopSuratGambar:"",
      kopSuratLogo:"", 
      kopSuratBaris1:"", 
      kopSuratBaris2:"", 
      kopSuratBaris3:"", 
      primaryColor:"var(--ui-primary)" 
    };
    return { ...defaults, ...loadInitialState("appSettings", defaults) };
  }, []);

  // Data
  const [suratList, setSuratList] = useState([]);
  const [mutasiList, setMutasiList] = useState([]);

  // Form Pengajuan Surat
  const [formSurat, setFormSurat] = useState({ pt_name:"", pt_address:"", students: [{ nis: user?.username ||"", nama: user?.name ||"", kelas: user?.class_name ||"", nisn:"" }] });
  
  // Form Konfirmasi
  const [formKonfirmasi, setFormKonfirmasi] = useState({ start_date:"", end_date:"" });

  // Form Mutasi
  const [formMutasi, setFormMutasi] = useState({ new_pt_name:"", alasan:"" });
  const [suratError, setSuratError] = useState("");
  const [konfirmasiError, setKonfirmasiError] = useState("");
  const [mutasiError, setMutasiError] = useState("");
  const [toast, setToast] = useState(null);
  const [suratPage, setSuratPage] = useState(1);
  const SURAT_PER_PAGE = 12;

  const showToast = (message, type ='success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  const fetchSurat = async () => {
    try {
      const res = await fetch("/api/pkl/surat-pengantar", {
        headers: { Authorization: `Bearer ${user?.authToken}` }
      });
      const data = await res.json();
      if (data.ok) setSuratList(data.data);
    } catch (e) { console.error(e); }
  };

  const fetchMutasi = async () => {
    try {
      const res = await fetch("/api/pkl/mutasi", {
        headers: { Authorization: `Bearer ${user?.authToken}` }
      });
      const data = await res.json();
      if (data.ok) setMutasiList(data.data);
    } catch (e) { console.error(e); }
  };

  useEffect(() => {
    if (user?.authToken) {
      if (activeTab ==="surat" || activeTab ==="konfirmasi") {
        Promise.resolve().then(() => fetchSurat());
      }
      if (activeTab ==="mutasi") {
        Promise.resolve().then(() => fetchMutasi());
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, activeTab]);

  const handleAddStudentToSurat = () => {
    setFormSurat({
      ...formSurat,
      students: [...formSurat.students, { nis:"", nama:"", kelas:"", nisn:"" }]
    });
  };

  const handleRemoveStudentFromSurat = (index) => {
    const next = [...formSurat.students];
    next.splice(index, 1);
    setFormSurat({ ...formSurat, students: next });
  };

  const handleStudentChange = (index, field, value) => {
    const next = [...formSurat.students];
    next[index][field] = value;
    setFormSurat({ ...formSurat, students: next });
  };

  const submitSurat = async (e) => {
    e.preventDefault();
    setSuratError("");
    if (!formSurat.pt_name) return setSuratError("Nama PT wajib diisi");
    setLoading(true);
    try {
      const res = await fetch("/api/pkl/surat-pengantar", {
        method:"POST",
        headers: {"Content-Type":"application/json", Authorization: `Bearer ${user?.authToken}` },
        body: JSON.stringify(formSurat)
      });
      const data = await res.json();
      if (data.ok) {
        showToast("Berhasil mengajukan surat pengantar");
        setFormSurat({ pt_name:"", pt_address:"", students: [{ nis: user?.username ||"", nama: user?.name ||"", kelas: user?.class_name ||"", nisn:"" }] });
        fetchSurat();
        setViewMode("list");
      } else {
        setSuratError(data.error ||"Gagal mengajukan");
      }
    } catch {
      setSuratError("Terjadi kesalahan sistem");
    }
    setLoading(false);
  };

  const submitKonfirmasi = async (e) => {
    e.preventDefault();
    setKonfirmasiError("");
    if (!formKonfirmasi.start_date || !formKonfirmasi.end_date) return setKonfirmasiError("Tanggal wajib diisi");
    setLoading(true);
    try {
      const res = await fetch("/api/pkl/konfirmasi", {
        method:"POST",
        headers: {"Content-Type":"application/json", Authorization: `Bearer ${user?.authToken}` },
        body: JSON.stringify(formKonfirmasi)
      });
      const data = await res.json();
      if (data.ok) {
        showToast("Berhasil konfirmasi jadwal PKL");
      } else {
        setKonfirmasiError(data.error ||"Gagal konfirmasi");
      }
    } catch {
      setKonfirmasiError("Terjadi kesalahan sistem");
    }
    setLoading(false);
  };

  const submitMutasi = async (e) => {
    e.preventDefault();
    setMutasiError("");
    if (!formMutasi.new_pt_name || !formMutasi.alasan) return setMutasiError("PT Baru dan Alasan wajib diisi");
    setLoading(true);
    try {
      const res = await fetch("/api/pkl/mutasi", {
        method:"POST",
        headers: {"Content-Type":"application/json", Authorization: `Bearer ${user?.authToken}` },
        body: JSON.stringify(formMutasi)
      });
      const data = await res.json();
      if (data.ok) {
        showToast("Berhasil mengajukan mutasi/pindah");
        setFormMutasi({ new_pt_name:"", alasan:"" });
        fetchMutasi();
        setViewMode("list");
      } else {
        setMutasiError(data.error ||"Gagal mengajukan mutasi");
      }
    } catch {
      setMutasiError("Terjadi kesalahan sistem");
    }
    setLoading(false);
  };

  const getSuratHtml = (surat, mode ='print') => {
    const months = ["Januari","Februari","Maret","April","Mei","Juni","Juli","Agustus","September","Oktober","November","Desember"];
    const today = new Date();
    const dateString = `${String(today.getDate()).padStart(2,'0')} ${months[today.getMonth()]} ${today.getFullYear()}`;
    const nomor = surat.nomor_surat ||"B.106/VI/TKJ/2026";
    const address = surat.pt_address ||"Jalan Mayor Madmuin Hasibuan No 68\\nRT 004 RW 004 Margahayu Bekasi Timur\\nKota Bekasi, Jawa Barat 17113";

    return `
      <html>
        <head>
          <title>Surat Pengantar PKL - ${surat.nama_perusahaan || surat.pt_name_temp}</title>
          ${mode ==='pdf' ?'<script src="https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js"></script>' :''}
          <style>
            @page { size: ${appSettings.defaultPaperSize === 'F4' ? '215mm 330mm' : 'A4'}; margin: 15mm 20mm; }
            body { 
              font-family:'Times New Roman', Times, serif; 
              font-size: 11pt; 
              line-height: 1.3; 
              color: black; 
              margin: ${mode ==='pdf' ?'0' :'0'}; 
              padding: ${mode ==='pdf' ?'15mm 20mm' :'0'}; 
              width: ${mode ==='pdf' ? (appSettings.defaultPaperSize === 'F4' ? '175mm' : '170mm') :'auto'}; 
            }
            .header-container { display: flex; align-items: center; border-bottom: 3px solid black; padding-bottom: 5px; margin-bottom: 2px; position: relative; }
            .header-container::after { content:''; position: absolute; bottom: -3px; left: 0; width: 100%; border-bottom: 1px solid black; }
            .logo-placeholder { width: 90px; height: 90px; border: 1px solid transparent; margin-right: 15px; display: flex; align-items: center; justify-content: center; }
            .header-text { text-align: center; flex: 1; margin-left: -50px; }
            .header-text h1 { font-size: 14pt; font-weight: bold; margin: 0; }
            .header-text h2 { font-size: 12pt; font-weight: bold; margin: 2px 0; }
            .header-text h3 { font-size: 16pt; font-weight: 900; margin: 2px 0; }
            .header-text p { font-size: 9pt; margin: 1px 0; }
            
            .meta-info { width: 100%; margin-top: 20px; border-collapse: collapse; }
            .meta-info td { vertical-align: top; padding: 1px; }
            
            .recipient { margin-top: 20px; }
            .recipient p { margin: 2px 0; }
            
            .content { margin-top: 20px; text-align: justify; }
            .content p { margin: 10px 0; }
            
            .students-table { width: 100%; border-collapse: collapse; margin: 20px 0; border: 2px solid black; }
            .students-table th, .students-table td { border: 1px solid black; padding: 6px; text-align: center; font-size: 11pt; }
            .students-table th { font-weight: bold; }
            
            .signature-area { margin-top: 40px; float: right; width: 300px; text-align: center; position: relative; }
            .signature-area p { margin: 0; }
            .signature-area .role { font-weight: bold; margin-bottom: 70px; }
            .signature-area .name { font-weight: bold; text-decoration: underline; }
            
            .footer { clear: both; margin-top: 100px; font-size: 9pt; }
            .footer p { margin: 1px 0; }
          </style>
        </head>
        <body>
          <div id="surat-content">
            ${appSettings.useKopSuratGambar && appSettings.kopSuratGambar ? `
            <div style="margin-bottom: 24px;">
              <img src="${appSettings.kopSuratGambar}" style="width: 100%; height: auto; object-fit: contain;" onerror="this.style.display='none'" />
            </div>
            ` : appSettings.kopSuratLogo ? `
            <div class="header-container">
              <div class="logo-placeholder" style="width: 100px; height: 100px; margin-right: 15px;">
                 <img src="${appSettings.kopSuratLogo}" style="width: 100%; height: 100%; object-fit: contain;" onerror="this.style.display='none'" />
              </div>
              <div class="header-text" style="flex: 1; text-align: center; padding-right: 80px;">
                <h1 style="font-size: 11pt; font-weight: bold; margin: 0; text-transform: uppercase;">${appSettings.kopSuratBaris1}</h1>
                <h2 style="font-size: 16pt; font-weight: bold; margin: 2px 0; text-transform: uppercase; color: ${appSettings.primaryColor ||'black'}">${appSettings.kopSuratBaris2}</h2>
                <h3 style="font-size: 18pt; font-weight: 900; margin: 2px 0; text-transform: uppercase; color: ${appSettings.primaryColor ||'black'}">${appSettings.kopSuratBaris3}</h3>
              </div>
            </div>
            ` : `
            <div class="header-container">
              <div class="logo-placeholder">
                 <img src="/logo.png" style="width: 100%; max-height: 100px; object-fit: contain;" onerror="this.style.display='none'" />
              </div>
              <div class="header-text">
                <h1>YAYASAN KARYA GUNA BANGSA</h1>
                <h2>SEKOLAH MENENGAH KEJURUAN KARYA GUNA 2 BEKASI</h2>
                <p>KELOMPOK : TEKNOLOGI INDUSTRI DAN BISNIS MANAJEMEN</p>
                <h3>TERAKREDITASI"A"</h3>
                <p>Kep.BAS.Prop.Jawa Barat No 1347/BAN-SM/SK/2021, Tgl 8 Desember 2021</p>
                <p>Jl.Karang Satria RT.10/16 Duren Jaya Bekasi Timur Telp. ( 021 ) 8800523</p>
                <p>Wabsite : smkkaryaguna2bekasi.sch.id Email:info@smkkaryaguna2bekasi.sch.id</p>
              </div>`}
            </div>
            
            <table class="meta-info">
              <tr>
                <td style="width: 60px;">Nomor</td>
                <td style="width: 10px;">:</td>
                <td style="font-weight: bold;">${nomor}</td>
                <td style="text-align: right;">${dateString}</td>
              </tr>
              <tr>
                <td>H a l</td>
                <td>:</td>
                <td colspan="2" style="font-weight: bold;">Permohonan Praktek Kerja Lapangan</td>
              </tr>
            </table>

            <div class="recipient">
              <p>Kepada Yth.</p>
              <p style="font-weight: bold;">Pimpinan Instansi</p>
              <p style="font-weight: bold;">${surat.nama_perusahaan || surat.pt_name_temp}</p>
              <p>${address.replace(/\\n/g,'<br/>')}</p>
              <p>Dengan hormat,</p>
            </div>

            <div class="content">
              <p>Salam sejahtera semoga Tuhan Yang Maha Kuasa senantiasa merahmati kita dalam menjalankan aktivitas sehari - hari , aamiin.</p>
              
              <p>Dalam rangka menyesuaikan pembelajaran disekolah dengan dunia usaha/industri, bersama ini kami mohon kepada Bapak/ibu pimpinan kiranya berkenan menerima siswa/siswi berikut :</p>
              
              <table class="students-table">
                <thead>
                  <tr>
                    <th style="width: 50px;">NO</th>
                    <th>NAMA SISWA</th>
                    <th>N I S</th>
                    <th>KELAS/KOMPETENSI<br/>KEAHLIAN</th>
                  </tr>
                </thead>
                <tbody>
                  ${surat.students.map((s, idx) => `
                    <tr>
                      <td>${idx + 1}.</td>
                      <td>${s.nama}</td>
                      <td>${s.nis}</td>
                      <td>${s.kelas}</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
              
              <p>Untuk mengikuti/melaksanakan praktek kerja lapangan pada perusahaan yang bapak/ibu pimpin.</p>
              
              <p>Karena keterbatasan jadwal belajar mengajar disekolah, kami akan sangat senang jika waktu yang di berikan sekitar 3,5 bulan, dari tanggal <strong>15 Juni 2026</strong> sampai <strong>30 September 2026</strong>.</p>
              
              <p>Demikian permohonan ini kami sampaikan, atas perhatiannya terima kasih.</p>
            </div>
            
            <div class="signature-area">
              <p class="role">KEPALA SEKOLAH</p>
              <p class="name">Yunie Purwiasih, M.Pd</p>
            </div>
            
            <div class="footer">
              <p>Contact Person :</p>
              <p>1.&nbsp;&nbsp;&nbsp;&nbsp;Mardiansyah, S.Pd : 0812 1855 6225</p>
              <p>2.&nbsp;&nbsp;&nbsp;&nbsp;Email : <a href="mailto:mardiansyah@guru.smkkg2.sch.id" style="color: blue;">mardiansyah@guru.smkkg2.sch.id</a> |</p>
            </div>
          </div>
          
          ${mode ==='print' ? `
          <script>
            setTimeout(() => {
              window.print();
            }, 500);
          </script>
          ` : `
          <script>
            function runExportPDF() {
              if (typeof html2pdf === 'undefined') {
                setTimeout(runExportPDF, 200);
                return;
              }
              const element = document.getElementById('surat-content');
              const opt = {
                margin:       [0, 0, 0, 0],
                filename:     'Surat_Pengantar_PKL.pdf',
                image:        { type: 'jpeg', quality: 1 },
                html2canvas:  { scale: 2, useCORS: true },
                jsPDF:        { unit: 'mm', format: ${paperFormatStr}, orientation: 'portrait' }
              };
              html2pdf().set(opt).from(element).save().then(() => {
                 setTimeout(() => window.close(), 1000);
              }).catch(function(err) {
                 console.error(err);
                 window.print();
              });
            }
            if (document.readyState === 'complete') {
              runExportPDF();
            } else {
              window.addEventListener('load', runExportPDF);
            }
          </script>`}
        </body>
      </html>
    `;
  };


  const handlePrintSurat = (surat) => {
    const printWindow = window.open('','_blank');
    printWindow.document.write(getSuratHtml(surat,'print'));
    printWindow.document.close();
  };

  const handleDownloadPDF = (surat) => {
    const printWindow = window.open('','_blank');
    printWindow.document.write(getSuratHtml(surat,'pdf'));
    printWindow.document.close();
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case'stempel_selesai':
        return <span className="bg-emerald-100 text-emerald-700 px-2.5 py-1 rounded-[var(--ui-radius-small)] text-[10px] font-extrabold flex items-center gap-1 w-max shadow-sm"><CheckCircle size={12}/> Sah (Selesai)</span>;
      case'acc':
      case'acc_hubin':
        return <span className="bg-blue-100 text-blue-700 px-2.5 py-1 rounded-[var(--ui-radius-small)] text-[10px] font-extrabold flex items-center gap-1 w-max shadow-sm"><AlertCircle size={12}/> ACC (Tunggu Stempel)</span>;
      case'rejected':
        return <span className="bg-red-100 text-red-700 px-2.5 py-1 rounded-[var(--ui-radius-small)] text-[10px] font-extrabold flex items-center gap-1 w-max shadow-sm"><XCircle size={12}/> Ditolak</span>;
      default:
        return <span className="bg-amber-100 text-amber-700 px-2.5 py-1 rounded-[var(--ui-radius-small)] text-[10px] font-extrabold flex items-center gap-1 w-max shadow-sm"><Clock size={12}/> Pending</span>;
    }
  };

  return (
    <div className="space-y-6 max-w-3xl mx-auto w-full">
      <div className="mb-6 md:mb-8">
        <h1 className="text-2xl md:text-3xl font-black text-slate-800 tracking-tight">Administrasi PKL</h1>
        <p className="text-sm md:text-base text-slate-500 mt-1 md:mt-2 max-w-2xl">Kelola pengajuan surat pengantar, konfirmasi jadwal, dan permohonan pindah tempat PKL dengan mudah.</p>
      </div>

      <div className="flex bg-white rounded-xl shadow-sm border-none p-1.5 mb-8 w-full overflow-x-auto no-scrollbar gap-1">
        <Button variant="outline" onClick={() =>{ setActiveTab("surat"); setViewMode("list"); }} className={`flex-1 md:flex-none ${activeTab ==="surat" ?"bg-[var(--ui-primary)] text-white border-transparent" :"text-slate-600 hover:bg-slate-50 border-slate-200"}`}>Surat Pengantar</Button>
        <Button variant="outline" onClick={() =>{ setActiveTab("konfirmasi"); setViewMode("list"); }} className={`flex-1 md:flex-none ${activeTab ==="konfirmasi" ?"bg-[var(--ui-primary)] text-white border-transparent" :"text-slate-600 hover:bg-slate-50 border-slate-200"}`}>Konfirmasi PKL</Button>
        <Button variant="outline" onClick={() =>{ setActiveTab("mutasi"); setViewMode("list"); }} className={`flex-1 md:flex-none ${activeTab ==="mutasi" ?"bg-[var(--ui-primary)] text-white border-transparent" :"text-slate-600 hover:bg-slate-50 border-slate-200"}`}>Pengajuan Pindah</Button>
      </div>

      {activeTab ==="surat" && viewMode ==="list" && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
            <div>
              <h2 className="text-xl font-black text-slate-800">Riwayat Pengajuan Surat</h2>
              <p className="text-sm text-slate-500">Daftar surat pengantar yang pernah diajukan.</p>
            </div>
            <Button onClick={() => setViewMode("create")} className="w-full sm:w-auto">
              <Plus size={16} className="mr-2"/> Buat Pengajuan Baru
            </Button>
          </div>

          {suratList.length === 0 ? (
            <div className="bg-white p-12 rounded-[var(--ui-radius-small)] border-none border-dashed text-center flex flex-col items-center justify-center">
              <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mb-5 border-none shadow-sm">
                <FileText size={36} className="text-slate-300"/>
              </div>
              <h3 className="font-bold text-slate-700 text-xl mb-2">Belum Ada Pengajuan</h3>
              <p className="text-slate-500 text-sm max-w-sm mb-6">Anda belum pernah mengajukan surat pengantar PKL ke perusahaan manapun.</p>
              <Button onClick={() => setViewMode("create")} >Mulai Ajukan Sekarang</Button>
            </div>
          ) : (
            <>
            <div className="grid grid-cols-1 gap-4">
              {suratList
                .slice((suratPage - 1) * SURAT_PER_PAGE, suratPage * SURAT_PER_PAGE)
                .map((surat) => (
                <div key={surat.id} className="bg-white p-5 rounded-[var(--ui-radius-card)] border-none shadow-sm flex flex-col gap-4 hover:border-slate-300 transition-colors">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h3 className="font-bold text-slate-800 text-lg mb-1 leading-tight">{surat.nama_perusahaan || surat.pt_name_temp}</h3>
                      <p className="text-xs text-slate-500 font-medium flex items-center gap-1.5 mb-2">
                        <Clock size={12}/> {new Date(surat.created_at).toLocaleString("id-ID", {day:"2-digit",month:"short",year:"numeric"})}
                      </p>
                      {getStatusBadge(surat.status)}
                    </div>
                  </div>
                  <div className="bg-slate-50 rounded-[var(--ui-radius-small)] p-3 border-none">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Anggota Kelompok</p>
                    <div className="flex flex-wrap gap-1.5">
                      {surat.students?.map((s, i) => (
                        <span key={i} className="bg-white border-none text-slate-600 px-2.5 py-1 rounded-[var(--ui-radius-small)] text-[11px] font-bold shadow-sm">{s.nama}</span>
                      ))}
                    </div>
                  </div>
                  {(surat.status ==="acc_hubin" || surat.status ==="stempel_selesai") && (
                    <div className="mt-auto space-y-3">
                      {surat.status ==="acc_hubin" ? (
                        <div className="bg-amber-50 border border-amber-200 p-3 rounded-[var(--ui-radius-small)] flex items-start gap-2.5 shadow-sm">
                          <AlertCircle className="text-amber-500 shrink-0 mt-0.5" size={16}/>
                          <p className="text-xs text-amber-800 leading-relaxed">
                            <strong>Penting:</strong> Walaupun surat sudah di-ACC dan dicetak, Anda <strong>tetap wajib</strong> meminta cap/stempel basah dari pihak HUBIN untuk validasi dokumen secara fisik.
                          </p>
                        </div>
                      ) : (
                        <div className="bg-emerald-50 border border-emerald-200 p-3 rounded-[var(--ui-radius-small)] flex items-start gap-2.5 shadow-sm">
                          <CheckCircle className="text-emerald-500 shrink-0 mt-0.5" size={16}/>
                          <p className="text-xs text-emerald-800 leading-relaxed">
                            <strong>Selesai!</strong> Surat Anda sudah di-ACC dan mendapatkan stempel basah. Anda bisa mengunduh salinan digitalnya untuk keperluan arsip.
                          </p>
                        </div>
                      )}
                      <div className="grid grid-cols-2 gap-2">
                        <Button variant="outline" onClick={() => handlePrintSurat(surat)} className="w-full flex items-center justify-center gap-2">
                          <Printer size={16}/> Cetak
                        </Button>
                        <Button variant="outline" onClick={() => handleDownloadPDF(surat)} className="w-full flex items-center justify-center gap-2">
                          <Download size={16}/> Unduh PDF
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
            <PaginationControls
              currentPage={suratPage}
              totalItems={suratList.length}
              itemsPerPage={SURAT_PER_PAGE}
              onPageChange={setSuratPage}
              onItemsPerPageChange={() => {}}
              pageSizeOptions={[12]}
            />
            </>
          )}
        </div>
      )}

      {activeTab ==="surat" && viewMode ==="create" && (
        <div className="bg-white p-6 md:p-8 rounded-[var(--ui-radius-card)] border-none shadow-sm max-w-2xl mx-auto">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-8 border-b border-slate-100 pb-5">
            <Button variant="ghost" size="icon" onClick={() => setViewMode("list")}><ArrowLeft size={20}/></Button>
            <div>
              <h2 className="text-xl font-black text-slate-800">Form Pengajuan Surat</h2>
              <p className="text-xs text-slate-500 mt-1">Lengkapi data tujuan perusahaan dan anggota kelompok Anda.</p>
            </div>
          </div>

          <form onSubmit={submitSurat} className="space-y-6">
            <div className="bg-slate-50/50 p-5 rounded-[var(--ui-radius-small)] border-none">
              <div className="mb-5">
                <label className="text-xs font-bold text-slate-700 mb-2 block uppercase tracking-wider">Nama Instansi / Tempat PKL</label>
                <input required type="text" value={formSurat.pt_name} onChange={e => setFormSurat({...formSurat, pt_name: e.target.value})} className="w-full border border-slate-300 bg-white p-3.5 rounded-xl text-sm font-semibold focus:border-[var(--ui-primary)] focus:ring-4 focus:ring-[var(--ui-primary)]/10 outline-none transition-all shadow-sm" placeholder="Contoh: PT. Astra Honda Motor" />
              </div>
              
              <div>
                <label className="text-xs font-bold text-slate-700 mb-2 block uppercase tracking-wider">Alamat Lengkap Instansi</label>
                <textarea required rows={3} value={formSurat.pt_address} onChange={e => setFormSurat({...formSurat, pt_address: e.target.value})} className="w-full border border-slate-300 bg-white p-3.5 rounded-xl text-sm font-semibold focus:border-[var(--ui-primary)] focus:ring-4 focus:ring-[var(--ui-primary)]/10 outline-none resize-none transition-all shadow-sm" placeholder="Contoh: Jl. Mayor Madmuin Hasibuan No 68..." />
              </div>
            </div>
            
            <div className="bg-slate-50/50 p-5 rounded-[var(--ui-radius-small)] border-none">
              <div className="flex justify-between items-center mb-4">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Daftar Siswa Kelompok</label>
                <Button variant="outline" size="sm" type="button" onClick={handleAddStudentToSurat} className="flex items-center gap-1.5"><Plus size={14}/> Tambah Anggota</Button>
              </div>
              
              <div className="space-y-4">
                {formSurat.students.map((s, idx) => (
                  <div key={idx} className="bg-white p-4 md:p-5 rounded-xl border-none relative group transition-all hover:border-[var(--ui-primary)]/30 hover:-md">
                    {idx > 0 && <Button variant="ghost" size="icon" type="button" onClick={() => handleRemoveStudentFromSurat(idx)} className="absolute top-2 right-2 text-red-500 hover:text-red-700 md:opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 size={16}/></Button>}
                    
                    <div className="flex flex-col gap-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">NIS Siswa</label>
                          <input required type="text" value={s.nis} onChange={e => handleStudentChange(idx,'nis', e.target.value)} placeholder="NIS" className="w-full border-none bg-slate-50 focus:bg-white p-3 rounded-[var(--ui-radius-small)] text-sm font-semibold focus:border-[var(--ui-primary)] outline-none transition-colors" />
                        </div>
                        <div>
                          <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">NISN (Opsional)</label>
                          <input type="text" value={s.nisn} onChange={e => handleStudentChange(idx,'nisn', e.target.value)} placeholder="NISN" className="w-full border-none bg-slate-50 focus:bg-white p-3 rounded-[var(--ui-radius-small)] text-sm font-semibold focus:border-[var(--ui-primary)] outline-none transition-colors" />
                        </div>
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Nama Lengkap</label>
                        <input required type="text" value={s.nama} onChange={e => handleStudentChange(idx,'nama', e.target.value)} placeholder="Nama Siswa" className="w-full border-none bg-slate-50 focus:bg-white p-3 rounded-[var(--ui-radius-small)] text-sm font-semibold focus:border-[var(--ui-primary)] outline-none transition-colors" />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Kelas</label>
                        <input required type="text" value={s.kelas} onChange={e => handleStudentChange(idx,'kelas', e.target.value)} placeholder="Contoh: XI TKR 1" className="w-full border-none bg-slate-50 focus:bg-white p-3 rounded-[var(--ui-radius-small)] text-sm font-semibold focus:border-[var(--ui-primary)] outline-none transition-colors" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {suratError && (
              <div className="p-3 bg-rose-50 border border-rose-100 rounded-[var(--ui-radius-small)] flex items-start gap-2 text-rose-600 text-xs font-semibold animate-in zoom-in-95 duration-200 mt-4">
                <AlertCircle size={14} className="shrink-0 mt-0.5" />
                <span className="leading-relaxed">{suratError}</span>
              </div>
            )}

            <Button type="submit" className="w-full flex items-center justify-center gap-2 mt-8">
              <Send size={18}/> {loading ?"Memproses Pengajuan..." :"Kirim Pengajuan Surat"}
            </Button>
          </form>
        </div>
      )}


      {activeTab ==="konfirmasi" && (() => {
        const suratSelesai = suratList.filter(s => s.status ==='stempel_selesai');
        const suratAcc = suratList.filter(s => s.status ==='acc_hubin');
        const canKonfirmasi = suratSelesai.length > 0;

        if (!canKonfirmasi) {
          return (
            <div className="bg-white p-8 md:p-10 rounded-[var(--ui-radius-control)] border-none shadow-sm max-w-xl mx-auto relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-1.5 bg-amber-400"></div>
              <div className="text-center mb-6">
                <div className="w-20 h-20 bg-amber-50 text-amber-500 rounded-[var(--ui-radius-small)] flex items-center justify-center mx-auto mb-4 border border-amber-200">
                  <AlertCircle size={36}/>
                </div>
                <h2 className="text-2xl font-black text-slate-800">Konfirmasi Terkunci</h2>
                <p className="text-sm text-slate-500 mt-3 max-w-sm mx-auto leading-relaxed">
                  Anda belum bisa melakukan konfirmasi PKL. Surat pengantar Anda harus sudah melalui proses ACC <strong>dan</strong> mendapatkan stempel dari HUBIN terlebih dahulu.
                </p>
              </div>
              <div className="space-y-3">
                {suratList.length === 0 ? (
                  <div className="bg-red-50 border border-red-200 p-4 rounded-[var(--ui-radius-small)] flex items-start gap-3">
                    <XCircle size={18} className="text-red-500 shrink-0 mt-0.5"/>
                    <div>
                      <p className="text-sm font-bold text-red-800">Belum Ada Surat Pengantar</p>
                      <p className="text-xs text-red-600 mt-1">Buat pengajuan surat pengantar terlebih dahulu di tab <strong>Surat Pengantar</strong>.</p>
                    </div>
                  </div>
                ) : suratAcc.length > 0 ? (
                  <div className="bg-amber-50 border border-amber-200 p-4 rounded-[var(--ui-radius-small)] flex items-start gap-3">
                    <AlertCircle size={18} className="text-amber-500 shrink-0 mt-0.5"/>
                    <div>
                      <p className="text-sm font-bold text-amber-800">Surat Sudah di-ACC, Tunggu Stempel</p>
                      <p className="text-xs text-amber-700 mt-1">Surat Anda sudah di-ACC oleh HUBIN. Minta cap/stempel basah dari pihak HUBIN untuk melanjutkan.</p>
                    </div>
                  </div>
                ) : (
                  <div className="bg-slate-50 border-none p-4 rounded-[var(--ui-radius-small)] flex items-start gap-3">
                    <Clock size={18} className="text-slate-400 shrink-0 mt-0.5"/>
                    <div>
                      <p className="text-sm font-bold text-slate-700">Surat Masih Pending</p>
                      <p className="text-xs text-slate-500 mt-1">Surat pengajuan Anda belum di-ACC. Tunggu proses verifikasi dari pihak sekolah.</p>
                    </div>
                  </div>
                )}
                <div className="text-center pt-2">
                  <Button variant="outline" onClick={() => { setActiveTab('surat'); setViewMode('list'); }} >
                    Lihat Status Surat Pengantar &rarr;
                  </Button>
                </div>
              </div>
            </div>
          );
        }

        return (
          <div className="bg-white p-8 md:p-10 rounded-[var(--ui-radius-control)] border-none shadow-sm max-w-xl mx-auto relative overflow-hidden">
           <div className="absolute top-0 left-0 w-full h-1.5 bg-[var(--ui-primary)]"></div>
           <div className="text-center mb-8">
             <div className="w-20 h-20 bg-[var(--ui-primary)]/5 text-[var(--ui-primary)] rounded-[var(--ui-radius-small)] flex items-center justify-center mx-auto mb-4 border border-[var(--ui-primary)]/10 shadow-inner"><Building size={32}/></div>
             <h2 className="text-2xl font-black text-slate-800">Lapor Diterima PKL</h2>
             <div className="inline-flex items-center gap-1.5 mt-2 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-[var(--ui-radius-small)]">
               <CheckCircle size={14} className="text-emerald-600"/>
               <span className="text-xs font-bold text-emerald-700">Surat Pengantar Tervalidasi</span>
             </div>
             <p className="text-sm text-slate-500 mt-3 max-w-sm mx-auto">Isi form ini karena surat pengantar Anda sudah resmi distempel dan Anda <strong>resmi</strong> memulai PKL.</p>
           </div>
           
           <form onSubmit={submitKonfirmasi} className="space-y-6">
             <div className="grid grid-cols-2 gap-5">
               <div>
                 <label className="text-xs font-bold text-slate-700 mb-1.5 block uppercase tracking-wider">Tanggal Mulai PKL</label>
                 <input required type="date" value={formKonfirmasi.start_date} onChange={e => setFormKonfirmasi({...formKonfirmasi, start_date: e.target.value})} className="w-full border border-slate-300 bg-slate-50 p-3.5 rounded-[var(--ui-radius-small)] text-sm font-bold focus:border-[var(--ui-primary)] outline-none transition-colors shadow-inner" />
               </div>
               <div>
                 <label className="text-xs font-bold text-slate-700 mb-1.5 block uppercase tracking-wider">Tanggal Selesai PKL</label>
                 <input required type="date" value={formKonfirmasi.end_date} onChange={e => setFormKonfirmasi({...formKonfirmasi, end_date: e.target.value})} className="w-full border border-slate-300 bg-slate-50 p-3.5 rounded-[var(--ui-radius-small)] text-sm font-bold focus:border-[var(--ui-primary)] outline-none transition-colors shadow-inner" />
               </div>
             </div>
             
             <div className="bg-amber-50 border border-amber-200 p-4 rounded-[var(--ui-radius-small)] flex items-start gap-3 text-amber-800 mt-4 shadow-sm">
               <AlertCircle size={20} className="shrink-0 mt-0.5 text-amber-600"/>
               <p className="text-xs md:text-sm font-medium leading-relaxed">Pastikan tanggal sesuai dengan kesepakatan antara pihak sekolah dan perusahaan. Jadwal ini akan digunakan untuk melacak periode aktif absensi Anda.</p>
             </div>

             {konfirmasiError && (
              <div className="p-3 bg-rose-50 border border-rose-100 rounded-[var(--ui-radius-small)] flex items-start gap-2 text-rose-600 text-xs font-semibold animate-in zoom-in-95 duration-200 mt-4">
                <AlertCircle size={14} className="shrink-0 mt-0.5" />
                <span className="leading-relaxed">{konfirmasiError}</span>
              </div>
             )}

             <Button type="submit" className="w-full mt-6">
                {loading ?"Menyimpan Jadwal..." :"Simpan Konfirmasi PKL"}
             </Button>
           </form>
          </div>
        );
      })()}


      {activeTab ==="mutasi" && viewMode ==="list" && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
            <div>
              <h2 className="text-xl font-black text-slate-800">Riwayat Pengajuan Pindah</h2>
              <p className="text-sm text-slate-500">Daftar permohonan pindah lokasi PKL.</p>
            </div>
            <Button onClick={() => setViewMode("create")} className="w-full sm:w-auto">
              <RefreshCw size={16} className="mr-2" /> Ajukan Pindah Lokasi
            </Button>
          </div>

          {mutasiList.length === 0 ? (
            <div className="bg-white p-12 rounded-[var(--ui-radius-small)] border-none border-dashed text-center flex flex-col items-center justify-center">
              <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mb-5 border-none shadow-sm">
                <RefreshCw size={36} className="text-slate-300"/>
              </div>
              <h3 className="font-bold text-slate-700 text-xl mb-2">Tidak Ada Riwayat Pindah</h3>
              <p className="text-slate-500 text-sm max-w-sm mb-6">Anda belum pernah mengajukan permohonan mutasi atau pindah tempat PKL.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {mutasiList.map((mutasi) => (
                <div key={mutasi.id} className="bg-white p-5 rounded-[var(--ui-radius-card)] border-none shadow-sm relative overflow-hidden group hover:border-slate-300 transition-colors">
                  <div className="flex items-center justify-between gap-3 mb-5">
                     <div className="flex-1 bg-slate-50 p-3 rounded-[var(--ui-radius-small)] border-none">
                       <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider mb-1">Dari Perusahaan</p>
                       <p className="font-bold text-slate-700 text-sm truncate">{mutasi.old_pt_name ||"-"}</p>
                     </div>
                     <div className="shrink-0 text-[var(--ui-primary)]/40 p-2"><ArrowLeft size={16} className="rotate-180"/></div>
                     <div className="flex-1 bg-[var(--ui-primary)]/5 p-3 rounded-[var(--ui-radius-small)] border border-[var(--ui-primary)]/10 text-right">
                       <p className="text-[9px] text-[var(--ui-primary)]/60 font-bold uppercase tracking-wider mb-1">Ke Tempat Baru</p>
                       <p className="font-bold text-[var(--ui-primary)] text-sm truncate">{mutasi.new_pt_name || mutasi.new_pt_name_temp}</p>
                     </div>
                  </div>
                  
                  <div className="mb-5 px-1">
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-1.5">Alasan Kepindahan</p>
                    <p className="text-sm text-slate-700 italic leading-relaxed">"{mutasi.alasan}"</p>
                  </div>

                  <div className="border-t border-slate-100 pt-5">
                    <p className="text-[10px] font-black text-slate-800 mb-3 uppercase tracking-widest text-center">Status Persetujuan Berjenjang</p>
                    {mutasi.final_status ==='acc' ? (
                      <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 p-3.5 rounded-[var(--ui-radius-small)] text-center font-bold flex items-center justify-center gap-2 text-sm shadow-sm">
                        <CheckCircle size={18}/> Mutasi Resmi Disetujui
                      </div>
                    ) : mutasi.final_status ==='rejected' ? (
                      <div className="bg-red-50 border border-red-200 text-red-700 p-3.5 rounded-[var(--ui-radius-small)] text-center font-bold flex items-center justify-center gap-2 text-sm shadow-sm">
                        <XCircle size={18}/> Permohonan Ditolak
                      </div>
                    ) : (
                      <div className="grid grid-cols-4 gap-2 text-center text-[10px] font-bold">
                        <div className={`p-2.5 rounded-[var(--ui-radius-small)] flex flex-col items-center gap-1.5 transition-colors ${mutasi.acc_walas ==='acc' ?'bg-emerald-100 text-emerald-800' :'bg-slate-50 text-slate-400 border-none'}`}>
                          {mutasi.acc_walas ==='acc' ? <CheckCircle size={16}/> : <Clock size={16}/>}
                          <span>Walas</span>
                        </div>
                        <div className={`p-2.5 rounded-[var(--ui-radius-small)] flex flex-col items-center gap-1.5 transition-colors ${mutasi.acc_pembimbing ==='acc' ?'bg-emerald-100 text-emerald-800' :'bg-slate-50 text-slate-400 border-none'}`}>
                          {mutasi.acc_pembimbing ==='acc' ? <CheckCircle size={16}/> : <Clock size={16}/>}
                          <span>Pembimbing</span>
                        </div>
                        <div className={`p-2.5 rounded-[var(--ui-radius-small)] flex flex-col items-center gap-1.5 transition-colors ${mutasi.acc_kaprog ==='acc' ?'bg-emerald-100 text-emerald-800' :'bg-slate-50 text-slate-400 border-none'}`}>
                          {mutasi.acc_kaprog ==='acc' ? <CheckCircle size={16}/> : <Clock size={16}/>}
                          <span>Kaprog</span>
                        </div>
                        <div className={`p-2.5 rounded-[var(--ui-radius-small)] flex flex-col items-center gap-1.5 transition-colors ${mutasi.acc_hubin ==='acc' ?'bg-emerald-100 text-emerald-800' :'bg-slate-50 text-slate-400 border-none'}`}>
                          {mutasi.acc_hubin ==='acc' ? <CheckCircle size={16}/> : <Clock size={16}/>}
                          <span>HUBIN</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab ==="mutasi" && viewMode ==="create" && (
        <div className="bg-white p-6 md:p-8 rounded-[var(--ui-radius-card)] border-none shadow-sm max-w-2xl mx-auto">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-8 border-b border-slate-100 pb-5">
            <Button variant="ghost" size="icon" onClick={() => setViewMode("list")}><ArrowLeft size={20}/></Button>
            <div>
              <h2 className="text-xl font-black text-slate-800">Form Pengajuan Pindah</h2>
              <p className="text-xs text-slate-500 mt-1">Lengkapi tempat baru dan alasan mengapa Anda ingin pindah lokasi PKL.</p>
            </div>
          </div>

          <form onSubmit={submitMutasi} className="space-y-6">
            <div className="bg-slate-50/50 p-5 rounded-[var(--ui-radius-small)] border-none">
              <label className="text-xs font-bold text-slate-700 mb-2 block uppercase tracking-wider">PT / Tempat PKL Baru</label>
              <input required type="text" value={formMutasi.new_pt_name} onChange={e => setFormMutasi({...formMutasi, new_pt_name: e.target.value})} className="w-full border border-slate-300 bg-white p-3.5 rounded-xl text-sm font-semibold focus:border-[var(--ui-primary)] focus:ring-4 focus:ring-[var(--ui-primary)]/10 outline-none transition-all shadow-sm" placeholder="Tulis nama tempat baru dengan lengkap" />
            </div>
            <div className="bg-slate-50/50 p-5 rounded-[var(--ui-radius-small)] border-none">
              <label className="text-xs font-bold text-slate-700 mb-2 block uppercase tracking-wider">Alasan Pindah</label>
              <textarea required rows={4} value={formMutasi.alasan} onChange={e => setFormMutasi({...formMutasi, alasan: e.target.value})} className="w-full border border-slate-300 bg-white p-3.5 rounded-xl text-sm font-medium focus:border-[var(--ui-primary)] focus:ring-4 focus:ring-[var(--ui-primary)]/10 outline-none resize-none transition-all shadow-sm" placeholder="Jelaskan secara rinci mengapa Anda perlu pindah lokasi..." />
            </div>
            
            <div className="bg-blue-50 border border-blue-200 p-4 rounded-[var(--ui-radius-small)] flex items-start gap-3 text-blue-800 shadow-sm">
               <AlertCircle size={20} className="shrink-0 mt-0.5 text-blue-600"/>
               <p className="text-xs md:text-sm font-medium leading-relaxed">Pengajuan mutasi akan melalui tahapan persetujuan dari Wali Kelas, Guru Pembimbing, Kepala Program, hingga akhirnya disetujui oleh HUBIN.</p>
            </div>

            {mutasiError && (
              <div className="p-3 bg-rose-50 border border-rose-100 rounded-[var(--ui-radius-small)] flex items-start gap-2 text-rose-600 text-xs font-semibold animate-in zoom-in-95 duration-200 mt-4">
                <AlertCircle size={14} className="shrink-0 mt-0.5" />
                <span className="leading-relaxed">{mutasiError}</span>
              </div>
            )}

            <Button type="submit" className="w-full flex items-center justify-center gap-2 mt-8">
              <Send size={18}/> {loading ?"Memproses..." :"Kirim Pengajuan Mutasi"}
            </Button>
          </form>
        </div>
      )}

      {toast && (
        <div className={`fixed bottom-6 right-6 px-4 py-3 rounded-[var(--ui-radius-small)] shadow-lg font-medium text-sm flex items-center gap-2 animate-in slide-in-from-bottom-5 text-white z-[100] ${toast.type ==='error' ?'bg-red-600' :'bg-emerald-600'}`}>
          {toast.type ==='error' ? <AlertCircle size={18} /> : <CheckCircle size={18} />} {toast.message}
        </div>
      )}
    </div>
  );
};

export default AdministrasiSiswa;
