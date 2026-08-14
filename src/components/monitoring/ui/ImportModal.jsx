import { useState, useRef, useCallback } from'react';
import * as XLSX from'xlsx';


const getColumnDetail = (col) => {
  switch (col.toLowerCase()) {
    case'kode guru':
      return { desc:'Kode unik guru pembimbing', ex:'G01, G02...' };
    case'nama guru':
      return { desc:'Nama lengkap guru beserta gelar', ex:'Budi Santoso, S.Pd' };
    case'jurusan':
      return { desc:'Singkatan nama jurusan/kompetensi', ex:'RPL, TKJ, TKR...' };
    case'kapasitas':
      return { desc:'Maksimal jumlah siswa yang dibimbing', ex:'5, 8, 10' };
    case'nama perusahaan':
      return { desc:'Nama lengkap dunia usaha/industri', ex:'PT Inovasi Teknologi' };
    case'alamat':
      return { desc:'Alamat lengkap lokasi perusahaan', ex:'Jl. Sudirman No 123' };
    case'kota':
      return { desc:'Kota lokasi industri berada', ex:'Jakarta, Bekasi, Bandung' };
    case'telepon':
      return { desc:'Nomor telepon hubung / WhatsApp HRD', ex:'021-123456, 0812...' };
    case'bidang usaha':
      return { desc:'Sektor / Bidang bisnis perusahaan', ex:'IT / Software, Otomotif' };
    case'kuota':
      return { desc:'Jumlah kapasitas penampungan siswa', ex:'2, 5, 10' };
    default:
      return { desc:'Kolom data isian', ex:'-' };
  }
};

const ImportModal = ({ 
  isOpen, 
  onClose, 
  title, 
  expectedColumns = [], 
  onDownloadTemplate, 
  onImport,
  onExportCurrent,
  guideText ="Pastikan format file Excel sesuai dengan template yang disediakan."
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [file, setFile] = useState(null);
  const [previewData, setPreviewData] = useState([]);
  const [columns, setColumns] = useState([]);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const fileInputRef = useRef(null);

  const resetState = () => {
    setFile(null);
    setPreviewData([]);
    setColumns([]);
    setError('');
    setIsSubmitting(false);
  };

  const handleClose = () => {
    resetState();
    onClose();
  };

  const parseExcel = useCallback((file) => {
    const ext = file.name.split('.').pop().toLowerCase();
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        let jsonData = [];
        if (ext ==='csv' || ext ==='txt') {
          const text = e.target.result;
          const workbook = XLSX.read(text, { type:'string' });
          const firstSheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[firstSheetName];
          jsonData = XLSX.utils.sheet_to_json(worksheet, { defval:"" });
        } else {
          const data = new Uint8Array(e.target.result);
          const workbook = XLSX.read(data, { type:'array' });
          const firstSheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[firstSheetName];
          jsonData = XLSX.utils.sheet_to_json(worksheet, { defval:"" });
        }
        
        if (jsonData.length === 0) {
          setError('File kosong atau tidak terbaca.');
          return;
        }

        // Ambil header dari baris pertama
        const fileColumns = Object.keys(jsonData[0]);
        setColumns(fileColumns);
        setPreviewData(jsonData);
        setError('');
      } catch (err) {
        console.error("Excel parse error:", err);
        setError('Gagal membaca file. Pastikan format file adalah .xlsx, .xls, .csv, atau .txt.');
      }
    };
    reader.onerror = () => {
      setError('Gagal membaca file.');
    };

    if (ext ==='csv' || ext ==='txt') {
      reader.readAsText(file);
    } else {
      reader.readAsArrayBuffer(file);
    }
  }, []);

  const onDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const onDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const onDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const droppedFile = e.dataTransfer.files[0];
      handleFileSelection(droppedFile);
    }
  };

  const handleFileSelection = (selectedFile) => {
    if (!selectedFile) return;
    
    // Check file type
    const fileType = selectedFile.name.split('.').pop().toLowerCase();
    const validExtensions = ['xlsx','xls','xlsm','csv','txt'];
    if (!validExtensions.includes(fileType)) {
      setError('Format file tidak didukung. Harap gunakan file .xlsx, .xls, .csv, atau .txt');
      setFile(null);
      setPreviewData([]);
      return;
    }

    setFile(selectedFile);
    setError('');
    parseExcel(selectedFile);
  };

  const handleFileInput = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFileSelection(e.target.files[0]);
    }
  };

  const handleProcessImport = async () => {
    if (!previewData || previewData.length === 0) {
      setError('Tidak ada data untuk diimpor.');
      return;
    }
    
    setIsSubmitting(true);
    try {
      await onImport(previewData);
      handleClose();
    } catch (err) {
      setError(err.message ||'Terjadi kesalahan saat memproses data.');
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
      <div className="bg-white rounded-[var(--ui-radius-small)] shadow-sm w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header Modal */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div>
            <h2 className="text-lg font-bold text-slate-800">{title}</h2>
            <p className="text-sm text-slate-500">Unggah file Excel untuk memasukkan data secara massal.</p>
          </div>
          <button 
            onClick={handleClose}
            className="w-8 h-8 flex items-center justify-center rounded-[var(--ui-radius-small)] hover:bg-slate-200 text-slate-500 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto flex-1 bg-white">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Kolom Kiri: Uploader */}
            <div className="lg:col-span-2 space-y-4">
              <div className="bg-slate-50 p-6 border-none rounded-[var(--ui-radius-small)]">
                <h4 className="text-xs font-black mb-4 flex items-center gap-2 text-slate-800 uppercase tracking-wider">
                  <FileSpreadsheet className="text-emerald-600" /> 1. Upload File (Excel/CSV/TXT)
                </h4>
                <div className="flex gap-3 mb-3">
                  <input 
                    type="file" 
                    ref={fileInputRef} 
                    onChange={handleFileInput} 
                    accept=".csv,.txt,.xlsx,.xls,.xlsm" 
                    className="hidden" 
                  />
                  <Button 
                    type="button" 
                    variant="secondary" 
                    onClick={() => fileInputRef.current?.click()} 
                    className="flex-1 border-dashed border-2 py-4"
                  >
                    <Upload size={14} /> {file ? file.name :"Pilih File .xlsx / .csv / .txt"}
                  </Button>
                </div>
                
                {file && (
                  <div className="mt-3 flex items-center justify-between bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-[var(--ui-radius-small)] px-4 py-2.5 text-xs font-semibold">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 size={16} className="text-emerald-600" />
                      <span>File"{file.name}" ({(file.size / 1024).toFixed(1)} KB) berhasil dibaca · {previewData.length} baris data</span>
                    </div>
                    <button type="button" onClick={resetState} className="text-slate-400 hover:text-slate-600 font-bold border-none bg-transparent cursor-pointer">Hapus</button>
                  </div>
                )}
                
                <p className="text-[10px] text-slate-500 text-center font-bold mt-4">
                  Belum punya template? <button type="button" onClick={onDownloadTemplate} className="text-[var(--ui-primary)] hover:underline bg-transparent border-none cursor-pointer font-bold">Unduh Template Excel</button> - <button type="button" onClick={() => {
                    const el = document.getElementById('panduan-impor-card');
                    if (el) el.scrollIntoView({ behavior:'smooth' });
                  }} className="text-[var(--ui-primary)] hover:underline bg-transparent border-none cursor-pointer font-bold">Buka Panduan</button>{onExportCurrent && <> - <button type="button" onClick={onExportCurrent} className="text-[var(--ui-primary)] hover:underline bg-transparent border-none cursor-pointer font-bold">Export Data Saat Ini</button></>}
                </p>
              </div>

              {error && (
                <div className="bg-rose-50 border-l-4 border-rose-500 p-4 rounded-[var(--ui-radius-small)] -r-lg flex items-start gap-3">
                  <AlertCircle size={20} className="text-rose-500 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-semibold text-rose-800 text-sm">Terjadi Kesalahan</h4>
                    <p className="text-rose-600 text-sm mt-1">{error}</p>
                  </div>
                </div>
              )}
            </div>

            {/* Kolom Kanan: Panduan */}
            <div id="panduan-impor-card" className="space-y-4">
              <div className="bg-blue-50 border border-blue-100 rounded-[var(--ui-radius-small)] p-5">
                <div className="flex items-center gap-2 text-blue-700 font-bold mb-3">
                  <BookOpen size={18} />
                  <h3>Panduan Impor</h3>
                </div>
                <p className="text-sm text-blue-800 mb-4 leading-relaxed">
                  {guideText}
                </p>
                <div className="bg-white/70 rounded-[var(--ui-radius-small)] p-3 text-xs text-slate-700">
                  <span className="font-semibold block mb-2 text-slate-800">Kolom Wajib (Header):</span>
                  <ul className="space-y-2 pl-0 list-none">
                    {expectedColumns.map((col, idx) => {
                      const detail = getColumnDetail(col);
                      return (
                        <li key={idx} className="border-b border-slate-100 last:border-0 pb-1.5 last:pb-0">
                          <code className="bg-blue-100/70 text-blue-800 px-1 py-0.5 rounded font-mono font-bold text-[10px]">{col}</code>
                          <span className="block text-[11px] text-slate-600 mt-0.5">{detail.desc}</span>
                          <span className="block text-[9px] text-slate-400 italic">Contoh: {detail.ex}</span>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              </div>
            </div>
          </div>

          {/* Tabel Preview (Opsional, tampil jika ada data) */}
          {previewData.length > 0 && (
            <div className="mt-8 border-none rounded-[var(--ui-radius-small)] overflow-hidden">
              <div className="bg-slate-50 px-4 py-3 border-b border-slate-200">
                <h3 className="font-bold text-slate-700 text-sm">Pratinjau Data (5 Baris Pertama)</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-sm">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200">
                      <th className="px-4 py-3 font-semibold text-slate-600 whitespace-nowrap">#</th>
                      {columns.map((col, i) => (
                        <th key={i} className="px-4 py-3 font-semibold text-slate-600 whitespace-nowrap">{col}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {previewData.slice(0, 5).map((row, i) => (
                      <tr key={i} className="hover:bg-slate-50/50">
                        <td className="px-4 py-3 text-slate-400 font-medium">{i + 1}</td>
                        {columns.map((col, j) => (
                          <td key={j} className="px-4 py-3 text-slate-700 max-w-[200px] truncate" title={row[col]}>
                            {row[col] !== undefined && row[col] !== null ? String(row[col]) :'-'}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {previewData.length > 5 && (
                <div className="px-4 py-2 bg-slate-50 text-center text-xs text-slate-500 border-t border-slate-200">
                  Dan {previewData.length - 5} baris lainnya...
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer Modal */}
        <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex justify-end gap-3">
          <Button variant="outline" onClick={handleClose} disabled={isSubmitting}>
            Batal
          </Button>
          <Button 
            variant="primary" 
            onClick={handleProcessImport}
            disabled={!file || previewData.length === 0 || isSubmitting}
            className="min-w-[140px]"
          >
            {isSubmitting ? (
              <><Loader2 size={16} className="animate-spin" /> Memproses...</>
            ) : (
              <><Upload size={16} /> Impor Data ({previewData.length})</>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ImportModal;
