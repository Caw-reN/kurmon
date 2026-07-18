import { Button } from '../../../components/ui.jsx';
import { useState, useEffect, useMemo, useRef } from'react';
import { CreditCard } from'lucide-react';
import jsPDF from'jspdf';
import html2canvas from'html2canvas';
import useAuthStore from'../../../store/monitoring/authStore.js';
import { useAppStore } from'../../../store/useAppStore.js';
import { compressImage } from'../../../utils/imageUtils.js';
import { User, QrCode, Printer, Download, Search, Plus, Eye, Edit2, X, AlertCircle, CheckCircle2 } from'lucide-react';
import { PageHeader } from '../../../components/monitoring/ui/index.js';
;
import { UISelect } from'../../../components/ui.jsx';


const DEFAULT_CARD_CONFIG = {
  bg_color:'#064e3b',
  text_color:'#0f172a',
  accent_color:'#a3e635',
  header_text:'KARTU TANDA PELAJAR',
  show_photo: true,
  show_barcode: true,
  show_nisn: true,
  show_kelas: true,
  show_jurusan: true,
  show_tahun: true,
  front_template:'',
  back_template:'',
};

function StudentCard({ student, school, config, cardRef }) {
  const frontBg = config.front_template ||'';
  const backBg = config.back_template ||'';
  const [qrCode, setQrCode] = useState("");
  const appClassesRaw = useAppStore(state => state.classes);
  const appClasses = appClassesRaw || [];

  const getStudentMajor = (s) => {
    if (s?.major) return s.major;
    if (s?.class_name) {
      const cls = appClasses.find(c => String(c.name).toLowerCase() === String(s.class_name).toLowerCase());
      if (cls && cls.major) return cls.major;
    }
    return'';
  };

  useEffect(() => {
    if (!student) return;
    if (config.show_barcode) {
      import("qrcode").then((QRCode) => {
        const origin = window.location.origin;
        const qrData = `${origin}/validasi-siswa?nis=${student.nis}&nama=${encodeURIComponent(student.name ||'')}`;
        QRCode.default.toDataURL(qrData, { margin: 1, width: 200 }).then(setQrCode).catch(console.error);
      }).catch(console.error);
    }
  }, [student, config.show_barcode]);

  return (
    <div ref={cardRef} className="student-card-wrapper flex gap-4 items-start" style={{ fontFamily:'inherit' }}>
      {/* FRONT CARD */}
      <div 
        className="w-[320px] h-[200px] rounded-[var(--ui-radius-small)] shadow-sm relative overflow-hidden bg-slate-200 shrink-0"
        style={{ 
          backgroundImage: frontBg ? `url(${frontBg})` :'none', 
          backgroundSize:'cover', backgroundPosition:'center',
          backgroundColor: frontBg ?'transparent' : config.bg_color 
        }}
      >
        {!frontBg && <div className="absolute inset-0 flex items-center justify-center text-xs font-bold text-white/50 z-0">Belum ada template depan</div>}
        
        {/* Photo Box (Top Left) */}
        {config.show_photo && (
           <div className="absolute top-[35%] left-[11%] w-[14%] h-[35%] overflow-hidden z-10 flex items-center justify-center bg-white shadow-sm p-1">
             {student?.photo ? (
                <img src={student.photo} alt="Foto" className="w-full h-full object-cover" />
             ) : (
                <User size={30} className="w-full h-full text-slate-300" />
             )}
           </div>
        )}

        {/* Data Box (Top Right) */}
        <div className="absolute top-[35%] left-[30%] w-[58%] h-[40%] z-10 flex flex-col justify-start pt-1 gap-[2px] pl-1" style={{ color: config.text_color ||'#000000' }}>
           <p className="text-[8px] font-bold leading-tight">NIS: {student?.nis ||'000'}</p>
           <p className="text-[10px] font-black uppercase leading-tight truncate" style={{ marginTop:'2px', marginBottom:'2px' }}>{student?.name || student?.namaSiswa ||'NAMA SISWA'}</p>
           <p className="text-[8px] font-bold leading-tight">TTL: {student?.ttl ||'-'}</p>
           <p className="text-[8px] font-bold leading-tight truncate">Jurusan: {getStudentMajor(student) ||'Umum'}</p>
           
           {/* Positioned at the bottom of the data box (aligning with photo bottom) */}
           <div className="absolute bottom-1 left-1">
             <p className="text-[5px] italic font-semibold">*Berlaku selama menjadi siswa SMK Karya Guna 2 Bekasi</p>
           </div>
        </div>

        {/* QR TTD & Kepsek Box (Bottom Right) */}
        <div className="absolute bottom-[4%] right-[4%] w-[24%] flex flex-col items-center justify-end z-10" style={{ color: config.text_color ||'#000000' }}>
           <p className="text-[5px] mb-0.5">Bekasi, {new Date(student?.updated_at || student?.created_at || new Date()).toLocaleDateString('id-ID', { day:'numeric', month:'long', year:'numeric' })}</p>
           {config.show_barcode && (
             <div className="w-[50%] aspect-square flex items-center justify-center bg-white/50 rounded-[var(--ui-radius-small)] p-0.5">
               {qrCode ? (
                  <img src={qrCode} alt="QR TTD" className="w-full h-full object-contain mix-blend-multiply" />
               ) : (
                  <QrCode size={12} className="text-slate-400" />
               )}
             </div>
           )}
           <p className="text-[6px] font-bold leading-tight text-center mt-0.5 border-b border-black/20 pb-0.5">
             {school.kepala_sekolah ||'Nama Kepsek'}
           </p>
        </div>
      </div>

      {/* BACK CARD */}
      <div 
        className="w-[320px] h-[200px] rounded-[var(--ui-radius-small)] shadow-sm relative overflow-hidden bg-slate-200 shrink-0"
        style={{ 
          backgroundImage: backBg ? `url(${backBg})` :'none', 
          backgroundSize:'cover', backgroundPosition:'center',
          backgroundColor: backBg ?'transparent' : config.bg_color 
        }}
      >
        {!backBg && <div className="absolute inset-0 flex items-center justify-center text-xs font-bold text-white/50 z-0">Belum ada template belakang</div>}
      </div>
    </div>
  );
}

export default function KartuPelajar({ students: propStudents = [] }) {
  const [students, setStudents] = useState(propStudents);
  const [school, setSchool] = useState({});
  const [config, setConfig] = useState(DEFAULT_CARD_CONFIG);
  const [templateId, setTemplateId] = useState(null);
  


  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedClass, setSelectedClass] = useState('all');
  const [selectedStudents, setSelectedStudents] = useState([]);
  const [previewStudent, setPreviewStudent] = useState(null);
  const [editForm, setEditForm] = useState(null);
  const [activeTab, setActiveTab] = useState('cetak');
  const [toast, setToast] = useState(null);
  const [isPrinting, setIsPrinting] = useState(false);
  const printRef = useRef();
  const authToken = useAuthStore(state => state.user?.authToken);

  const [requests, setRequests] = useState([]);
  const [requestStats, setRequestStats] = useState({});
  const [showRequestModal, setShowRequestModal] = useState(null);
  const [requestReason, setRequestReason] = useState('Kartu Hilang');

  const showToast = (message, type ='success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  useEffect(() => {
    const fetchData = async () => {
      if (!authToken) return;
      
      let fetchedSchool = {};
      let fetchedStudents = propStudents || [];

      setIsLoading(true);
      try {
        const [studRes, schoolRes, templateRes] = await Promise.all([
          (!propStudents || propStudents.length === 0) ? fetch('/api/data/load', { headers: { Authorization: `Bearer ${authToken}` } }) : Promise.resolve(null),
          fetch('/api/school-profile', { headers: { Authorization: `Bearer ${authToken}` } }),
          fetch('/api/student-cards', { headers: { Authorization: `Bearer ${authToken}` } })
        ]);

        if (studRes) {
          const studData = await studRes.json();
          if (studData.payload && studData.payload.students) fetchedStudents = studData.payload.students;
        }
        
        const schoolData = await schoolRes.json();
        if (schoolData.ok) fetchedSchool = schoolData.data || {};

        const templateData = await templateRes.json();
        if (templateData.ok && templateData.data && templateData.data.length > 0) {
          const defaultTemplate = templateData.data[0];
          setTemplateId(defaultTemplate.id);
          if (defaultTemplate.config) {
            setConfig(prev => ({ ...prev, ...defaultTemplate.config }));
          }
        }
      } catch (e) { console.error(e); }
      
      setStudents(fetchedStudents);
      setSchool(fetchedSchool);
      setIsLoading(false);
    };
    fetchData();
  }, [authToken, propStudents]);

  const fetchRequests = async () => {
    if (!authToken) return;
    try {
      const res = await fetch('/api/student-card-requests', { headers: { Authorization: `Bearer ${authToken}` } });
      const data = await res.json();
      if (data.ok) {
        setRequests(data.data || []);
        const statsLookup = {};
        (data.stats || []).forEach(s => {
          statsLookup[s.nis] = parseInt(s.count || 0);
        });
        setRequestStats(statsLookup);
      }
    } catch (e) { console.error(e); }
  };

  useEffect(() => {
    fetchRequests();
  }, [authToken]);

  const logPrintAction = async (student) => {
    try {
      // 1. Create a request
      await fetch('/api/student-card-requests', {
        method:'POST',
        headers: {'Content-Type':'application/json', Authorization: `Bearer ${authToken}` },
        body: JSON.stringify({
          action:'create',
          nis: student.nis,
          nama: student.namaSiswa || student.name,
          kelas: student.class_name ||'Umum',
          alasan:'Cetak/Download Langsung (Tanpa Antrean)'
        })
      });
      // 2. Load and auto-complete the print request
      const listRes = await fetch('/api/student-card-requests', { headers: { Authorization: `Bearer ${authToken}` } });
      const listData = await listRes.json();
      if (listData.ok) {
        const pending = listData.data.find(r => r.nis === student.nis && r.status ==='pending');
        if (pending) {
          await fetch('/api/student-card-requests', {
            method:'POST',
            headers: {'Content-Type':'application/json', Authorization: `Bearer ${authToken}` },
            body: JSON.stringify({ action:'selesai', id: pending.id })
          });
        }
      }
      fetchRequests();
    } catch (e) { console.error(e); }
  };

  const classes = useMemo(() => ['all', ...new Set(students.map(s => s.class_name).filter(Boolean).sort())], [students]);
  const majors = useMemo(() => [...new Set(students.map(s => s.major).filter(Boolean).sort())], [students]);

  const filteredStudents = useMemo(() => {
    return students.filter(s => {
      const matchSearch = !searchTerm || (s.namaSiswa || s.name)?.toLowerCase().includes(searchTerm.toLowerCase()) || s.nis?.includes(searchTerm);
      const matchClass = selectedClass ==='all' || s.class_name === selectedClass;
      return matchSearch && matchClass;
    });
  }, [students, searchTerm, selectedClass]);

  const handlePrint = () => {
    if (selectedStudents.length === 0) return showToast('Pilih minimal satu siswa untuk dicetak!','error');
    setIsPrinting(true);
    selectedStudents.forEach(nis => {
      const student = students.find(s => s.nis === nis);
      if (student) logPrintAction(student);
    });
    setTimeout(() => {
      window.print();
      setIsPrinting(false);
    }, 300);
  };

  const handleDownloadPDF = () => {
    if (selectedStudents.length === 0) return showToast('Pilih minimal satu siswa untuk diunduh!','error');
    setIsPrinting(true);
    showToast('Menyiapkan file PDF, mohon tunggu...','success');
    
    setTimeout(async () => {
      try {
        const printArea = document.querySelector('.print-area');
        if (!printArea) throw new Error("Print area not found");
        
        const cards = printArea.querySelectorAll('.student-card-wrapper');
        if (cards.length === 0) throw new Error("Tidak ada kartu");
        
        const pdf = new jsPDF({
          orientation:'landscape',
          unit:'px',
          format: [656, 200]
        });

        for (let i = 0; i < cards.length; i++) {
          const card = cards[i];
          const canvas = await html2canvas(card, {
            scale: 2, 
            useCORS: true,
            logging: false,
            backgroundColor:'#ffffff'
          });
          const imgData = canvas.toDataURL('image/jpeg', 1.0);
          
          if (i > 0) pdf.addPage([656, 200],'landscape');
          pdf.addImage(imgData,'JPEG', 0, 0, 656, 200);
        }
        
        pdf.save(`Kartu_Pelajar_${new Date().getTime()}.pdf`);
        selectedStudents.forEach(nis => {
          const student = students.find(s => s.nis === nis);
          if (student) logPrintAction(student);
        });
        showToast('PDF berhasil diunduh!');
      } catch (err) {
        console.error(err);
        showToast('Gagal memproses PDF','error');
      } finally {
        setIsPrinting(false);
      }
    }, 500);
  };

  const handleSaveManual = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/data/load', { headers: { Authorization: `Bearer ${authToken}` } });
      const data = await res.json();
      if (data.payload) {
         let updatedStudents = data.payload.students || [];
         if (editForm.isNew) {
            editForm.data.created_at = new Date().toISOString();
            if (updatedStudents.find(s => s.nis === editForm.data.nis)) {
               return showToast('NIS sudah terdaftar','error');
            }
            updatedStudents.push(editForm.data);
         } else {
            editForm.data.updated_at = new Date().toISOString();
            updatedStudents = updatedStudents.map(s => s.nis === editForm.data.nis ? { ...s, ...editForm.data } : s);
         }
         
         data.payload.students = updatedStudents;
         
         const saveRes = await fetch('/api/data/save', {
           method:'POST',
           headers: {'Content-Type':'application/json', Authorization: `Bearer ${authToken}` },
           body: JSON.stringify({ payload: data.payload })
         });
         
         if (saveRes.ok) {
            showToast('Data berhasil disimpan');
            setStudents(updatedStudents);
            setEditForm(null);
         } else {
            showToast('Gagal menyimpan ke server','error');
         }
      }
    } catch(e) {
       console.error(e);
       showToast('Terjadi kesalahan','error');
    }
  };

  const [isSavingDesign, setIsSavingDesign] = useState(false);
  const handleSaveDesignToDB = async () => {
    setIsSavingDesign(true);
    showToast('Menyimpan desain ke database...','success');
    try {
      const res = await fetch('/api/student-cards', {
        method:'POST',
        headers: {'Content-Type':'application/json', Authorization: `Bearer ${authToken}` },
        body: JSON.stringify({
          id: templateId,
          name:'Desain Utama',
          config: config,
          is_default: true
        })
      });
      const data = await res.json();
      if (data.ok) {
        showToast('Desain berhasil disimpan permanen di database!');
      } else {
        showToast('Gagal menyimpan desain:' + (data.error ||''),'error');
      }
    } catch (error) {
      console.error(error);
      showToast('Gagal menghubungi server','error');
    } finally {
      setIsSavingDesign(false);
    }
  };

  const studentsToPrint = useMemo(() => {
    if (previewStudent) return [previewStudent];
    return students.filter(s => selectedStudents.includes(s.nis));
  }, [students, selectedStudents, previewStudent]);

  const tabs = [
    { id:'cetak', label:'Pilih & Cetak' },
    { id:'desain', label:'Desain Kartu' },
    { id:'pengajuan', label:'Log & Persetujuan Cetak' }
  ];

  return (
    <div className="space-y-6 relative animate-in fade-in duration-300 z-10">
      <PageHeader 
        title="Generator Kartu Pelajar"
        description="Desain dan cetak Kartu Tanda Pelajar dengan foto dan barcode otomatis."
        icon={CreditCard}
        tabs={tabs}
        activeTab={activeTab}
        onTabChange={setActiveTab}
      />

      {/* Print Tab */}
      {activeTab ==='cetak' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          {/* Action Card */}
          <div className="ui-card flex flex-col md:flex-row justify-between items-start md:items-center gap-4 p-4 md:p-5 relative">
            <div>
              <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                <Printer size={16} className="text-[var(--ui-primary)]" />
                Cetak Kartu Tanda Pelajar
              </h3>
              <p className="text-xs text-slate-500 font-medium mt-1">
                Pilih satu atau beberapa siswa di bawah ini untuk mencetak kartu fisik atau mengunduh dokumen PDF.
              </p>
            </div>
            <div className="flex gap-2 w-full md:w-auto shrink-0 justify-end">
              <Button variant="outline" size="sm" className="flex items-center gap-2" 
                onClick={handlePrint} 
                disabled={selectedStudents.length === 0 || isPrinting}
                
              >
                <Printer size={14} /> Cetak {selectedStudents.length > 0 ? `(${selectedStudents.length})` :''}
              </Button>
              <Button variant="outline" size="sm" className="flex items-center gap-2" 
                onClick={handleDownloadPDF} 
                disabled={selectedStudents.length === 0 || isPrinting}
                
              >
                <Download size={14} /> Download PDF
              </Button>
            </div>
          </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr,340px] gap-6">
          {/* Student List */}
          <div className="ui-card overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex flex-col md:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                <input value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="Cari siswa..."
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 border-none rounded-[var(--ui-radius-small)] text-sm focus:outline-none focus:border-[var(--ui-primary)]" />
              </div>
              <UISelect value={selectedClass} onChange={e => setSelectedClass(e.target.value)}
                className="px-3 py-2 bg-slate-50 border-none rounded-[var(--ui-radius-small)] text-sm font-semibold focus:outline-none focus:border-[var(--ui-primary)]">
                {classes.map(c => <option key={c} value={c}>{c ==='all' ?'Semua Kelas' : c}</option>)}
              </UISelect>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() =>setEditForm({ isNew: true, data: { name:'', nis:'', ttl:'', major:'', class_name:'' } })} className="flex items-center gap-1"><Plus size={12}/> Buat Manual</Button>
                <Button variant="outline" onClick={() =>setSelectedStudents(filteredStudents.map(s => s.nis))} >Pilih Semua</Button>
                <Button variant="outline" onClick={() =>setSelectedStudents([])} >Kosongkan</Button>
              </div>
            </div>
            <div className="max-h-[500px] overflow-y-auto">
              {isLoading ? (
                <p className="text-center text-slate-400 py-8">Memuat data siswa...</p>
              ) : filteredStudents.length === 0 ? (
                <p className="text-center text-slate-400 py-8">Tidak ada siswa ditemukan.</p>
              ) : (
                <table className="w-full text-sm">
                  <thead className="sticky top-0 text-xs text-slate-500 uppercase bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th className="px-4 py-3 w-10">
                        <input type="checkbox" checked={selectedStudents.length === filteredStudents.length && filteredStudents.length > 0}
                          onChange={e => setSelectedStudents(e.target.checked ? filteredStudents.map(s => s.nis) : [])}
                          className="accent-[var(--ui-primary)]" />
                      </th>
                      <th className="px-4 py-3 font-bold text-left">Nama Siswa</th>
                      <th className="px-4 py-3 font-bold text-left">NIS</th>
                      <th className="px-4 py-3 font-bold text-left">Kelas</th>
                      <th className="px-4 py-3 font-bold text-center">Cetak</th>
                      <th className="px-4 py-3 font-bold text-center">Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredStudents.map(student => (
                      <tr key={student.nis} className="border-b border-slate-100 hover:bg-slate-50">
                        <td className="px-4 py-3">
                          <input type="checkbox" checked={selectedStudents.includes(student.nis)}
                            onChange={e => {
                              if (e.target.checked) setSelectedStudents(prev => [...prev, student.nis]);
                              else setSelectedStudents(prev => prev.filter(n => n !== student.nis));
                            }}
                            className="accent-[var(--ui-primary)]" />
                        </td>
                        <td className="px-4 py-3 font-bold text-slate-700">{student.namaSiswa || student.name}</td>
                        <td className="px-4 py-3 text-slate-500 font-mono text-xs">{student.nis}</td>
                        <td className="px-4 py-3 text-slate-500">{student.class_name}</td>
                        <td className="px-4 py-3 text-center text-xs font-bold text-slate-600">
                          {requestStats[student.nis] || 0}x
                        </td>
                        <td className="px-4 py-3 text-center flex items-center justify-center gap-1">
                          <Button variant="outline" onClick={() =>setPreviewStudent(previewStudent?.nis === student.nis ? null : student)}
                            className={`${previewStudent?.nis === student.nis ?'bg-[var(--ui-primary)] text-white' :'text-slate-400 hover:text-[var(--ui-primary)] bg-slate-100'}`}
                            title="Preview Kartu">
                            <Eye size={14} /></Button>
                          <Button variant="outline" onClick={() =>setShowRequestModal(student)}
                            
                            title="Ajukan Cetak Ulang">
                            <CreditCard size={14} /></Button>
                          <Button variant="outline" onClick={() =>setEditForm({ isNew: false, data: student })}
                            
                            title="Edit Data">
                            <Edit2 size={14} /></Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          {/* Preview Panel */}
          <div className="space-y-4">
            <div className="bg-slate-800 rounded-[var(--ui-radius-small)] p-6 flex flex-col items-center gap-4 min-h-[280px] justify-center">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Preview Kartu</p>
              <StudentCard student={previewStudent || (selectedStudents.length > 0 ? students.find(s => s.nis === selectedStudents[0]) : null) || { name:'NAMA SISWA', nis:'001', class_name:'X TKJ 1', major:'TKJ' }} school={school} config={config} />
              {!previewStudent && selectedStudents.length > 0 && (
                <p className="text-xs text-slate-400 mt-2">Menampilkan kartu siswa pertama yang dipilih</p>
              )}
            </div>
          </div>
          </div>
        </div>
      )}

      {/* Design Tab */}
      {activeTab ==='desain' && (
        <div className="grid grid-cols-1 lg:grid-cols-[1fr,340px] gap-6">
          <div className="ui-card p-6 space-y-5">
            <div className="flex justify-between items-center">
              <h2 className="font-bold text-slate-700">Kustomisasi Desain Kartu</h2>
              <button onClick={handleSaveDesignToDB} disabled={isSavingDesign} className="flex items-center gap-2">
                {isSavingDesign ?'Menyimpan...' :'Simpan ke Database'}
              </button>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Template Depan (Gambar)</label>
                <input type="file" accept="image/*" onChange={e => {
                  const file = e.target.files[0];
                  if (file) {
                    compressImage(file, { maxWidth: 1000, maxHeight: 600, quality: 0.8 }).then(compressedBase64 => {
                      setConfig(p => ({ ...p, front_template: compressedBase64 }));
                    });
                  }
                }} className="w-full text-sm file:mr-4 file:py-2 file:px-4 file:rounded-[var(--ui-radius-small)] file:border-0 file:text-sm file:font-semibold file:bg-[var(--ui-primary)] file:text-white hover:file:bg-[var(--ui-primary)]/90" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Template Belakang (Gambar)</label>
                <input type="file" accept="image/*" onChange={e => {
                  const file = e.target.files[0];
                  if (file) {
                    compressImage(file, { maxWidth: 1000, maxHeight: 600, quality: 0.8 }).then(compressedBase64 => {
                      setConfig(p => ({ ...p, back_template: compressedBase64 }));
                    });
                  }
                }} className="w-full text-sm file:mr-4 file:py-2 file:px-4 file:rounded-[var(--ui-radius-small)] file:border-0 file:text-sm file:font-semibold file:bg-[var(--ui-primary)] file:text-white hover:file:bg-[var(--ui-primary)]/90" />
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-100">
              {[
                { key:'text_color', label:'Warna Teks Overlay' },
                { key:'bg_color', label:'Warna Fallback' },
              ].map(field => (
                <div key={field.key}>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">{field.label}</label>
                  <div className="flex items-center gap-2">
                    <input type="color" value={config[field.key]} onChange={e => setConfig(p => ({ ...p, [field.key]: e.target.value }))}
                      className="w-10 h-10 rounded-[var(--ui-radius-small)] border-none cursor-pointer" />
                    <span className="text-xs font-mono text-slate-400">{config[field.key]}</span>
                  </div>
                </div>
              ))}
            </div>
            
            <div className="grid grid-cols-3 gap-4 pt-4 border-t border-slate-100">
              {[
                { key:'show_photo', label:'Tampilkan Foto' },
                { key:'show_nisn', label:'Tampilkan NISN' },
                { key:'show_kelas', label:'Tampilkan Kelas' },
              ].map(field => (
                <label key={field.key} className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={config[field.key]} onChange={e => setConfig(p => ({ ...p, [field.key]: e.target.checked }))}
                    className="w-4 h-4 accent-[var(--ui-primary)]" />
                  <span className="text-xs font-semibold text-slate-600">{field.label}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            <div className="bg-slate-800 rounded-[var(--ui-radius-small)] p-6 flex flex-col items-center gap-4 justify-center">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Preview Desain</p>
              <StudentCard student={{ name:'BUDI SANTOSO', nis:'12345', nisn:'0012345678', class_name:'XI TKJ 2', major:'TKJ' }} school={school} config={config} />
            </div>
          </div>
        </div>
      )}
      {/* Log & Persetujuan Cetak Tab */}
      {activeTab ==='pengajuan' && (
        <div className="ui-card p-6 space-y-6 animate-in fade-in duration-200">
          <div className="flex justify-between items-center border-b border-slate-100 pb-4">
            <div>
              <h2 className="text-sm font-black text-slate-800 uppercase tracking-widest">Daftar Pengajuan Cetak Ulang</h2>
              <p className="text-xs text-slate-500 mt-1">Kelola permohonan penggantian kartu pelajar yang hilang, rusak, atau baru.</p>
            </div>
          </div>
          
          <div className="overflow-x-auto border border-slate-150 rounded-[var(--ui-radius-small)]">
            <table className="w-full text-sm">
              <thead className="text-xs text-slate-500 uppercase bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-6 py-4 font-bold text-left">Siswa</th>
                  <th className="px-6 py-4 font-bold text-left">NIS</th>
                  <th className="px-6 py-4 font-bold text-left">Kelas</th>
                  <th className="px-6 py-4 font-bold text-left">Alasan Pengajuan</th>
                  <th className="px-6 py-4 font-bold text-left">Tanggal</th>
                  <th className="px-6 py-4 font-bold text-center">Status</th>
                  <th className="px-6 py-4 font-bold text-right">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {requests.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-8 text-center text-slate-400">
                      Belum ada log pengajuan cetak kartu pelajar.
                    </td>
                  </tr>
                ) : (
                  requests.map(reqItem => (
                    <tr key={reqItem.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4 font-bold text-slate-800">{reqItem.nama}</td>
                      <td className="px-6 py-4 font-mono text-xs text-slate-500">{reqItem.nis}</td>
                      <td className="px-6 py-4 text-slate-600">{reqItem.kelas}</td>
                      <td className="px-6 py-4 text-slate-600">{reqItem.alasan}</td>
                      <td className="px-6 py-4 text-slate-500 text-xs">
                        {new Date(reqItem.created_at).toLocaleDateString('id-ID', {
                          day:'2-digit',
                          month:'short',
                          year:'numeric',
                          hour:'2-digit',
                          minute:'2-digit'
                        })}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-[var(--ui-radius-small)] text-xs font-bold ${
                          reqItem.status ==='pending' ?'bg-amber-100 text-amber-800' :
                          reqItem.status ==='disetujui' ?'bg-blue-100 text-blue-800' :
                          reqItem.status ==='selesai' ?'bg-emerald-100 text-emerald-800' :'bg-red-100 text-red-800'
                        }`}>
                          {reqItem.status ==='pending' ?'Menunggu' :
                           reqItem.status ==='disetujui' ?'Disetujui' :
                           reqItem.status ==='selesai' ?'Selesai' :'Ditolak'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right flex items-center justify-end gap-1.5">
                        {reqItem.status ==='pending' && (
                          <>
                            <Button variant="outline"
                              onClick={async () =>{
                                const response = await fetch('/api/student-card-requests', {
                                  method:'POST',
                                  headers: {'Content-Type':'application/json', Authorization: `Bearer ${authToken}` },
                                  body: JSON.stringify({ action:'approve', id: reqItem.id })
                                });
                                if (response.ok) {
                                  showToast('Permohonan disetujui!');
                                  fetchRequests();
                                }
                              }}
                              
                            >
                              Setujui</Button>
                            <Button variant="outline"
                              onClick={async () =>{
                                const response = await fetch('/api/student-card-requests', {
                                  method:'POST',
                                  headers: {'Content-Type':'application/json', Authorization: `Bearer ${authToken}` },
                                  body: JSON.stringify({ action:'reject', id: reqItem.id })
                                });
                                if (response.ok) {
                                  showToast('Permohonan ditolak!');
                                  fetchRequests();
                                }
                              }}
                              
                            >
                              Tolak</Button>
                          </>
                        )}
                        {reqItem.status ==='disetujui' && (
                          <Button variant="outline"
                            onClick={async () =>{
                              const studentObj = students.find(s => s.nis === reqItem.nis) || { name: reqItem.nama, nis: reqItem.nis, class_name: reqItem.kelas };
                              setPreviewStudent(studentObj);
                              setIsPrinting(true);
                              
                              await fetch('/api/student-card-requests', {
                                method:'POST',
                                headers: {'Content-Type':'application/json', Authorization: `Bearer ${authToken}` },
                                body: JSON.stringify({ action:'selesai', id: reqItem.id })
                              });
                              
                              setTimeout(() => {
                                window.print();
                                setIsPrinting(false);
                                setPreviewStudent(null);
                                showToast('Kartu dicetak & status diperbarui!');
                                fetchRequests();
                              }, 400);
                            }}
                            
                          >
                            Cetak Sekarang</Button>
                        )}
                        {(reqItem.status ==='selesai' || reqItem.status ==='ditolak') && (
                          <Button variant="outline"
                            onClick={async () =>{
                              if (!await window.confirmAsync('Hapus log riwayat ini?')) return;
                              const response = await fetch('/api/student-card-requests', {
                                method:'POST',
                                headers: {'Content-Type':'application/json', Authorization: `Bearer ${authToken}` },
                                body: JSON.stringify({ action:'delete', id: reqItem.id })
                              });
                              if (response.ok) {
                                showToast('Log riwayat pengajuan dihapus!');
                                fetchRequests();
                              }
                            }}
                            
                          >
                            Hapus</Button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Hidden Print Area */}
      {isPrinting && (
        <div className="print-area bg-white z-[9999] flex flex-wrap gap-4 p-4 justify-start content-start">
          {studentsToPrint.map(student => (
            <StudentCard key={student.nis} student={student} school={school} config={config} />
          ))}
        </div>
      )}

      {/* Ajukan Cetak Ulang Modal */}
      {showRequestModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-[var(--ui-radius-small)] shadow-sm w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-bold text-slate-800">Ajukan Cetak Ulang Kartu</h3>
              <Button variant="outline" type="button" onClick={() =>setShowRequestModal(null)} ><X size={18} /></Button>
            </div>
            <form onSubmit={async (e) => {
              e.preventDefault();
              try {
                const res = await fetch('/api/student-card-requests', {
                  method:'POST',
                  headers: {'Content-Type':'application/json', Authorization: `Bearer ${authToken}` },
                  body: JSON.stringify({
                    action:'create',
                    nis: showRequestModal.nis,
                    nama: showRequestModal.namaSiswa || showRequestModal.name,
                    kelas: showRequestModal.class_name ||'Umum',
                    alasan: requestReason
                  })
                });
                if (res.ok) {
                  showToast('Permohonan cetak ulang berhasil diajukan!');
                  setShowRequestModal(null);
                  fetchRequests();
                } else {
                  showToast('Gagal mengajukan permohonan','error');
                }
              } catch (e) {
                console.error(e);
                showToast('Gagal menghubungi server','error');
              }
            }} className="p-4 space-y-4">
              <div className="p-3 bg-slate-50 rounded-lg text-xs space-y-1">
                <p className="text-slate-500 font-semibold">Detail Siswa:</p>
                <p className="font-bold text-slate-800">{showRequestModal.namaSiswa || showRequestModal.name} (NIS: {showRequestModal.nis})</p>
                <p className="text-slate-600">Kelas: {showRequestModal.class_name}</p>
                <p className="text-blue-600 font-bold mt-1">Frekuensi Cetak Sebelumnya: {requestStats[showRequestModal.nis] || 0} kali</p>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Alasan Penggantian Kartu</label>
                <UISelect value={requestReason} onChange={e => setRequestReason(e.target.value)}
                  className="w-full px-3 py-2 border-none focus:outline-[var(--ui-primary)] rounded-[var(--ui-radius-small)] text-sm bg-white">
                  <option value="Kartu Hilang">Kartu Hilang</option>
                  <option value="Kartu Rusak / Patah">Kartu Rusak / Patah</option>
                  <option value="Perbaikan Data Siswa">Perbaikan Data Siswa</option>
                  <option value="Siswa Baru (Cetak Pertama)">Siswa Baru (Cetak Pertama)</option>
                  <option value="Lainnya">Lainnya</option>
                </UISelect>
              </div>
              {requestReason ==='Lainnya' && (
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">Keterangan Tambahan</label>
                  <textarea required placeholder="Masukkan alasan detail..." onChange={e => setRequestReason(e.target.value)}
                    className="w-full px-3 py-2 border-none focus:outline-[var(--ui-primary)] rounded-[var(--ui-radius-small)] text-sm bg-slate-50" />
                </div>
              )}
              <div className="pt-2 flex justify-end gap-2">
                <Button variant="outline" type="button" onClick={() =>setShowRequestModal(null)} >Batal</Button>
                <Button variant="outline" type="submit" >Kirim Pengajuan</Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Print styles */}
      <style>{`
        @media print {
          body * { visibility: hidden !important; }
          .print-area, .print-area * { visibility: visible !important; }
          .print-area { position: fixed; top: 0; left: 0; width: 100%; }
        }`}</style>

      {/* Edit Modal */}
      {editForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-[var(--ui-radius-small)] shadow-sm w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-bold text-slate-800">{editForm.isNew ?'Buat Data Manual' :'Edit Data Kartu'}</h3>
              <Button variant="outline" type="button" onClick={() =>setEditForm(null)} ><X size={18} /></Button>
            </div>
            <form onSubmit={handleSaveManual} className="p-4 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">NIS</label>
                <input required disabled={!editForm.isNew} value={editForm.data.nis ||''} onChange={e => setEditForm({ ...editForm, data: { ...editForm.data, nis: e.target.value } })} className="w-full px-3 py-2 border-none focus:outline-[var(--ui-primary)] rounded-[var(--ui-radius-small)] text-sm disabled:bg-slate-50 disabled:text-slate-500" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Nama Lengkap</label>
                <input required value={editForm.data.name || editForm.data.namaSiswa ||''} onChange={e => setEditForm({ ...editForm, data: { ...editForm.data, name: e.target.value, namaSiswa: e.target.value } })} className="w-full px-3 py-2 border-none focus:outline-[var(--ui-primary)] rounded-[var(--ui-radius-small)] text-sm" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Tempat, Tanggal Lahir (TTL)</label>
                <input placeholder="Contoh: Bekasi, 12 Agustus 2008" value={editForm.data.ttl ||''} onChange={e => setEditForm({ ...editForm, data: { ...editForm.data, ttl: e.target.value } })} className="w-full px-3 py-2 border-none focus:outline-[var(--ui-primary)] rounded-[var(--ui-radius-small)] text-sm" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Jurusan</label>
                <UISelect required value={editForm.data.major ||''} onChange={e => setEditForm({ ...editForm, data: { ...editForm.data, major: e.target.value } })} className="w-full px-3 py-2 border-none focus:outline-[var(--ui-primary)] rounded-[var(--ui-radius-small)] text-sm bg-white">
                  <option value="">- Pilih Jurusan -</option>
                  {majors.map(m => <option key={m} value={m}>{m}</option>)}
                </UISelect>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Kelas (opsional untuk di sistem)</label>
                <input value={editForm.data.class_name ||''} onChange={e => setEditForm({ ...editForm, data: { ...editForm.data, class_name: e.target.value } })} className="w-full px-3 py-2 border-none focus:outline-[var(--ui-primary)] rounded-[var(--ui-radius-small)] text-sm" />
              </div>
              <div className="pt-2 flex justify-end gap-2">
                <Button variant="outline" type="button" onClick={() =>setEditForm(null)} >Batal</Button>
                <Button variant="outline" type="submit" >Simpan Data</Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {toast && (
        <div className={`fixed bottom-6 right-6 px-4 py-3 rounded-[var(--ui-radius-small)] shadow-sm font-medium text-sm flex items-center gap-2 animate-in slide-in-from-bottom-5 text-white ${toast.type ==='error' ?'bg-red-600' :'bg-emerald-600'} z-50`}>
          {toast.type ==='error' ? <AlertCircle size={18} /> : <CheckCircle2 size={18} />} {toast.message}
        </div>
      )}
    </div>
  );
}
