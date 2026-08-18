import { Button } from '../../../components/ui.jsx';
import { useState, useRef, useCallback } from'react';
import { Upload, ChevronRight } from'lucide-react';
import * as XLSX from'xlsx';
import { Info, Download, FileSpreadsheet, CheckCircle2, AlertCircle, Badge } from'lucide-react';
import { PageHeader } from '../../../components/monitoring/ui/index.js';
;
import { Modal } from'../../../components/ui.jsx';


/**
 * admin/ImportData.jsx
 * Halaman Import Data PKL dengan Drag-and-Drop uploader.
 * Menggunakan SheetJS (xlsx) untuk membaca dan preview data Excel.
 */







// ──────────────────────────────────────────
// Kolom yang diharapkan ada di file Excel
// ──────────────────────────────────────────
const EXPECTED_COLUMNS = ['no','nis','namaSiswa','kelas','kodeGuru','namaPerusahaan','tanggalMulai','tanggalSelesai'];

// Mapping header Excel ke key internal
const HEADER_MAP = {'no':'no','nis':'nis','nama siswa':'namaSiswa','nama_siswa':'namaSiswa','kelas':'kelas','kode guru':'kodeGuru','kode_guru':'kodeGuru','nama guru':'namaGuru', // Tetap dukung nama guru sebagai fallback jika dibutuhkan'nama_guru':'namaGuru','nama perusahaan':'namaPerusahaan','nama_perusahaan':'namaPerusahaan','tanggal mulai':'tanggalMulai','tanggal_mulai':'tanggalMulai','tanggal selesai':'tanggalSelesai','tanggal_selesai':'tanggalSelesai',
};

const ImportData = ({ teachers = [], students = [], authToken ="", setActiveTab }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [file, setFile]             = useState(null);
  const [previewData, setPreviewData] = useState([]);
  const [columns, setColumns]         = useState([]);
  const [error, setError]             = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [isGuideOpen, setIsGuideOpen] = useState(false);
  const fileInputRef = useRef(null);

  // ──────────────────────────────────────────
  // Parse Excel dengan SheetJS
  // ──────────────────────────────────────────
  const parseExcel = useCallback((file) => {
    setError('');
    setPreviewData([]);
    setColumns([]);
    setSubmitSuccess(false);

    const ext = file.name.split('.').pop().toLowerCase();
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        let jsonData = [];
        let worksheet;
        if (ext ==='csv' || ext ==='txt') {
          const text = e.target.result;
          const workbook = XLSX.read(text, { type:'string' });
          const sheetName = workbook.SheetNames[0];
          worksheet = workbook.Sheets[sheetName];
        } else {
          const data = new Uint8Array(e.target.result);
          const workbook = XLSX.read(data, { type:'array' });
          const sheetName = workbook.SheetNames[0];
          worksheet = workbook.Sheets[sheetName];
        }

        // Convert ke array of objects
        const rawRows = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
        if (rawRows.length < 2) {
          setError('File kosong atau hanya berisi header.');
          return;
        }

        // Normalisasi header (lowercase + trim)
        const headers = rawRows[0].map((h) => String(h).toLowerCase().trim());
        const mappedHeaders = headers.map((h) => HEADER_MAP[h] || h);

        // Parse rows
        const parsedRows = rawRows.slice(1)
          .filter((row) => row.some((cell) => cell !== undefined && cell !==''))
          .map((row) => {
            const obj = {};
            mappedHeaders.forEach((key, i) => {
              obj[key] = row[i] ??'';
            });
            return obj;
          });

        if (parsedRows.length === 0) {
          setError('Tidak ada data yang ditemukan.');
          return;
        }

        setColumns(mappedHeaders);
        setPreviewData(parsedRows);
      } catch (err) {
        setError('Gagal membaca file. Pastikan format file adalah .xlsx, .xls, .csv, atau .txt');
      }
    };
    if (ext ==='csv' || ext ==='txt') {
      reader.readAsText(file);
    } else {
      reader.readAsArrayBuffer(file);
    }
  }, []);

  // ──────────────────────────────────────────
  // File handling
  // ──────────────────────────────────────────
  const handleFile = useCallback(
    (selectedFile) => {
      if (!selectedFile) return;
      const fileType = selectedFile.name.split('.').pop().toLowerCase();
      const validExtensions = ['xlsx','xls','xlsm','csv','txt'];
      if (!validExtensions.includes(fileType)) {
        setError('Format file tidak valid. Harap upload file .xlsx, .xls, .csv, atau .txt');
        return;
      }
      setFile(selectedFile);
      parseExcel(selectedFile);
    },
    [parseExcel]
  );

  const handleDrop = useCallback(
    (e) => {
      e.preventDefault();
      setIsDragging(false);
      const droppedFile = e.dataTransfer.files[0];
      handleFile(droppedFile);
    },
    [handleFile]
  );

  const handleRemoveFile = () => {
    setFile(null);
    setPreviewData([]);
    setColumns([]);
    setError('');
    setSubmitSuccess(false);
    if (fileInputRef.current) fileInputRef.current.value ='';
  };

  const handleDownloadTemplate = () => {
    const templateData = [{'No': 1,'NIS':'242510001','Nama Siswa':'Ahmad Dahlan','Kelas':'XI RPL 1','Kode Guru':'G001','Nama Guru':'Budi Santoso','Nama Perusahaan':'PT Teknologi Maju','Tanggal Mulai':'2026-07-01','Tanggal Selesai':'2026-12-31'
    }];
    const ws = XLSX.utils.json_to_sheet(templateData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws,"Template Import PKL");
    XLSX.writeFile(wb,"Template_Import_Data_PKL.xlsx");
  };

  const handleExportCurrent = async () => {
    try {
      const locRes = await fetch("/api/pkl/locations", {
        headers: {"Authorization": `Bearer ${authToken}` }
      });
      const locData = locRes.ok ? await locRes.json() : { data: [] };
      const currentLocations = Array.isArray(locData.data) ? locData.data : [];

      const mapRes = await fetch("/api/monitoring/pkl-students", {
        headers: {"Authorization": `Bearer ${authToken}` }
      });
      const mapData = mapRes.ok ? await mapRes.json() : { data: [] };
      const currentMappings = Array.isArray(mapData.data) ? mapData.data : [];

      const exportData = students.map((s, idx) => {
        const mapping = currentMappings.find(m => m.nis === s.nis) || {};
        const guru = teachers.find(g => g.code === mapping.teacher_code);
        const perusahaan = currentLocations.find(l => l.id === mapping.location_id);
        return {
          No: idx + 1,
          NIS: s.nis,"Nama Siswa": s.name || s.namaSiswa ||"",
          Kelas: s.class_name || s.kelas ||"","Kode Guru": mapping.teacher_code ||"","Nama Guru": guru?.name ||"Belum Ditugaskan","Nama Perusahaan": perusahaan?.nama_perusahaan ||"Belum Ditempatkan","Tanggal Mulai": mapping.start_date ||"","Tanggal Selesai": mapping.end_date ||""
        };
      });

      const ws = XLSX.utils.json_to_sheet(exportData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws,"Siswa PKL Saat Ini");
      XLSX.writeFile(wb,"Data_Siswa_PKL_Saat_Ini.xlsx");
    } catch (err) {
      console.error("Gagal mengekspor data saat ini:", err);
      setError("Gagal mengekspor data saat ini.");
    }
  };

  // ──────────────────────────────────────────
  // Submit (simulasi API call)
  // ──────────────────────────────────────────
  const handleSubmit = async () => {
    if (!authToken) {
      setError('Sesi kedaluwarsa. Silakan masuk kembali.');
      return;
    }
    setIsSubmitting(true);
    setError('');
    try {
      // 1. Fetch current companies/locations
      const locRes = await fetch("/api/pkl/locations", {
        headers: {"Authorization": `Bearer ${authToken}` }
      });
      if (!locRes.ok) throw new Error("Gagal mengambil data perusahaan");
      const locData = await locRes.json();
      const currentLocations = Array.isArray(locData.data) ? locData.data : [];

      // 2. Resolve companies and create missing ones
      const resolvedUpdates = [];
      for (const row of previewData) {
        if (!row.nis) continue;
        
        let matchedLocId = null;
        const ptName = String(row.namaPerusahaan ||'').trim();
        if (ptName) {
          // Look up in existing locations
          const matched = currentLocations.find(l => 
            String(l.nama_perusahaan ||'').toLowerCase().trim() === ptName.toLowerCase()
          );
          if (matched) {
            matchedLocId = matched.id;
          } else {
            // Create a new company location
            try {
              const createRes = await fetch("/api/pkl/locations", {
                method:"POST",
                headers: {"Content-Type":"application/json","Authorization": `Bearer ${authToken}`
                },
                body: JSON.stringify({
                  nama_perusahaan: ptName,
                  alamat:"-",
                  status:"aktif",
                  jurusan: row.kelas ? (row.kelas.split('')[1] ||'Umum') :'Umum'
                })
              });
              if (createRes.ok) {
                const created = await createRes.json();
                if (created.ok && created.data) {
                  matchedLocId = created.data.id;
                  // Add to local list to avoid creating duplicates for subsequent rows
                  currentLocations.push(created.data);
                }
              }
            } catch (err) {
              console.warn("Gagal membuat lokasi PKL:", ptName, err);
            }
          }
        }

        // Try matching guru code
        const teacherCode = String(row.kodeGuru ||'').trim() || null;

        resolvedUpdates.push({
          nis: String(row.nis).trim(),
          location_id: matchedLocId,
          teacher_code: teacherCode,
          start_date: row.tanggalMulai || null,
          end_date: row.tanggalSelesai || null,
          status:'aktif'
        });
      }

      // 3. Send bulk update to /api/monitoring/pkl-students/bulk
      const bulkRes = await fetch("/api/monitoring/pkl-students/bulk", {
        method:"POST",
        headers: {"Content-Type":"application/json","Authorization": `Bearer ${authToken}`
        },
        body: JSON.stringify({ updates: resolvedUpdates })
      });

      if (!bulkRes.ok) {
        throw new Error("Gagal menyimpan data siswa PKL");
      }

      setIsSubmitting(false);
      setSubmitSuccess(true);
      
      // Auto redirect back to pkl_data_siswa after 2.5 seconds
      if (setActiveTab) {
        setTimeout(() => {
          setActiveTab("pkl_data_siswa");
        }, 2500);
      }

    } catch (err) {
      console.error("Import error:", err);
      setError(err.message ||'Terjadi kesalahan saat mengimport data');
      setIsSubmitting(false);
    }
  };

  // ──────────────────────────────────────────
  // Column label display
  // ──────────────────────────────────────────
  const colLabels = {
    no:'No', nis:'NIS', namaSiswa:'Nama Siswa', kelas:'Kelas',
    kodeGuru:'Kode Guru', namaGuru:'Nama Guru', namaPerusahaan:'Perusahaan',
    tanggalMulai:'Tgl Mulai', tanggalSelesai:'Tgl Selesai',
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <PageHeader
        icon={Upload}
        title="Import Data PKL"
        description="Upload file Excel (.xlsx) berisi data Guru Pembimbing → Siswa → Perusahaan"
      />

      {/* Info banner */}
      <div className="flex items-start gap-3 bg-sky-50 border border-sky-200 rounded-[var(--ui-radius-small)] p-3">
        <Info size={16} className="text-sky-600 mt-0.5 flex-shrink-0" />
        <div className="text-sm text-sky-800">
          <p className="font-semibold mb-1">Format File yang Diharapkan</p>
          <p className="text-xs text-sky-600 leading-relaxed">
            Kolom: <code className="bg-sky-100 px-1 py-0.5 rounded-[var(--ui-radius-small)] font-mono">No | NIS | Nama Siswa | Kelas | Kode Guru | Nama Perusahaan | Tanggal Mulai | Tanggal Selesai</code>
          </p>
          <Button variant="outline" size="sm" onClick={handleDownloadTemplate} className="mt-2 inline-flex items-center gap-1.5">
            <Download size={14} className="mr-1.5" /> Download Template Excel
          </Button>
        </div>
      </div>

      {/* ─────── Drop Zone ─────── */}
      {!file ? (
        <div className="bg-slate-50 p-6 border-none rounded-[var(--ui-radius-small)]">
          <h4 className="text-xs font-black mb-4 flex items-center gap-2 text-slate-800 uppercase tracking-wider">
            <FileSpreadsheet className="text-emerald-600" /> 1. Upload File (Excel/CSV/TXT)
          </h4>
          <div className="flex gap-3 mb-3">
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,.txt,.xlsx,.xls,.xlsm"
              className="hidden"
              onChange={(e) => handleFile(e.target.files[0])}
            />
            <Button
              variant="outline"
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex-1"
            >
              <Upload size={14} className="mr-1.5" /> Pilih File .xlsx / .csv / .txt
            </Button>
          </div>
          <p className="text-[10px] text-slate-500 text-center font-bold mt-4">
            Belum punya template? <button type="button" onClick={handleDownloadTemplate} className="text-[var(--ui-primary)] hover:underline cursor-pointer">Unduh Template Excel</button> - <Button variant="outline" type="button" onClick={() =>setIsGuideOpen(true)} className="text-[var(--ui-primary)] hover:underline cursor-pointer">Buka Panduan</Button> - <button type="button" onClick={handleExportCurrent} className="text-[var(--ui-primary)] hover:underline cursor-pointer">Export Data Saat Ini</button>
          </p>
        </div>
      ) : (
        /* ─────── File Info ─────── */
        <div className="flex items-center justify-between bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-[var(--ui-radius-small)] px-4 py-2.5 text-xs font-semibold">
          <div className="flex items-center gap-2">
            <CheckCircle2 size={16} className="text-emerald-600" />
            <span>File"{file.name}" ({(file.size / 1024).toFixed(1)} KB) berhasil dibaca · {previewData.length} baris data</span>
          </div>
          <Button variant="ghost" size="sm" type="button" onClick={handleRemoveFile}>Hapus</Button>
        </div>
      )}

      {/* Error state */}
      {error && (
        <div className="flex items-center gap-3 bg-red-50 border border-red-200 text-red-700
          rounded-[var(--ui-radius-small)] p-4 text-sm">
          <AlertCircle size={18} className="flex-shrink-0" />
          {error}
        </div>
      )}

      {/* Success state */}
      {submitSuccess && (
        <div className="flex items-center gap-3 bg-emerald-50 border border-emerald-200
          text-emerald-700 rounded-[var(--ui-radius-small)] p-4 text-sm font-semibold">
          <CheckCircle2 size={18} className="flex-shrink-0" />
          Berhasil! {previewData.length} data siswa PKL telah diimport ke sistem.
        </div>
      )}

      {/* ─────── Preview Table ─────── */}
      {previewData.length > 0 && !submitSuccess && (
        <div className="bg-white border-none rounded-[var(--ui-radius-small)] overflow-hidden">
          {/* Table header */}
          <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
            <div>
              <h2 className="font-bold text-slate-800">Preview Data</h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Menampilkan {Math.min(previewData.length, 10)} dari {previewData.length} baris
              </p>
            </div>
            <Badge variant="default" label={`${previewData.length} siswa`} withDot={false} />
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-bg text-xs text-slate-400 uppercase tracking-wider">
                  {columns.map((col) => (
                    <th key={col} className="px-4 py-3 text-left font-semibold whitespace-nowrap">
                      {colLabels[col] || col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {previewData.slice(0, 10).map((row, i) => (
                  <tr key={i} className="hover:bg-bg transition-colors">
                    {columns.map((col) => (
                      <td key={col} className="px-4 py-3 text-gray-700 whitespace-nowrap">
                        {String(row[col] ??'-')}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {previewData.length > 10 && (
            <p className="text-xs text-center text-slate-400 py-3 border-t border-slate-200">
              ... dan {previewData.length - 10} baris lainnya
            </p>
          )}

          {/* Submit actions */}
          <div className="px-5 py-4 border-t border-slate-200 bg-bg flex flex-col sm:flex-row
            items-center justify-between gap-3">
            <p className="text-xs text-slate-400">
              Pastikan data sudah benar sebelum submit. Proses ini tidak dapat dibatalkan.
            </p>
            <div className="flex gap-3 w-full sm:w-auto">
              <Button variant="outline" onClick={handleRemoveFile} >
                Batal
              </Button>
              <Button
                icon={ChevronRight}
                iconPosition="right"
                onClick={handleSubmit}
               >
                {isSubmitting ?'Mengimport...' : `Import ${previewData.length} Data`}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ─────── Template Download ─────── */}
      {!file && (
        <div className="text-center">
          <p className="text-xs text-slate-400 mb-2">Belum punya template?</p>
          <Button
            variant="ghost"
            onClick={() => {
              // Buat file template sederhana dengan SheetJS
              const ws = XLSX.utils.aoa_to_sheet([
                ['No','NIS','Nama Siswa','Kelas','Kode Guru','Nama Perusahaan','Tanggal Mulai','Tanggal Selesai'],
                [1,'2324001','Contoh Nama Siswa','XII TJKT 1','G01','PT Contoh Perusahaan','2026-07-01','2026-12-31'],
              ]);
              const wb = XLSX.utils.book_new();
              XLSX.utils.book_append_sheet(wb, ws,'Data PKL');
              XLSX.writeFile(wb,'template_import_pkl.xlsx');
            }}
            className="text-xs font-semibold text-[var(--ui-primary)] flex items-center gap-1 mx-auto"
          >
            <FileSpreadsheet size={14} className="mr-1.5" />
            Download Template Excel
          </Button>
        </div>
      )}

      <Modal isOpen={isGuideOpen} onClose={() => setIsGuideOpen(false)} title="Panduan Impor Data Siswa PKL" maxWidth="max-w-3xl">
        <div className="space-y-6 text-sm text-slate-600 font-medium">
          <p className="text-center text-slate-500 italic bg-slate-50 p-3 rounded-[var(--ui-radius-small)]">
            Gunakan panduan ini untuk menyusun file Excel Anda agar dapat diimpor langsung ke sistem penugasan PKL.
          </p>

          <div>
            <h4 className="text-sm font-black text-slate-800 flex items-center gap-2 mb-3">
              Format Kolom Excel (Wajib Berurutan)
            </h4>
            <div className="overflow-x-auto border-none rounded-[var(--ui-radius-small)]">
              <table className="w-full text-xs text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th className="p-3 border-r border-slate-200 font-bold text-slate-700">Kolom A</th>
                    <th className="p-3 border-r border-slate-200 font-bold text-slate-700">Kolom B</th>
                    <th className="p-3 border-r border-slate-200 font-bold text-slate-700">Kolom C</th>
                    <th className="p-3 border-r border-slate-200 font-bold text-slate-700">Kolom D</th>
                    <th className="p-3 border-r border-slate-200 font-bold text-slate-700">Kolom E</th>
                    <th className="p-3 border-r border-slate-200 font-bold text-slate-700">Kolom F</th>
                    <th className="p-3 border-r border-slate-200 font-bold text-slate-700">Kolom G</th>
                    <th className="p-3 font-bold text-slate-700">Kolom H</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-slate-100">
                    <td className="p-3 border-r border-slate-200 font-bold text-slate-800">No</td>
                    <td className="p-3 border-r border-slate-200 font-bold text-slate-800">NIS</td>
                    <td className="p-3 border-r border-slate-200 font-bold text-slate-800">Nama Siswa</td>
                    <td className="p-3 border-r border-slate-200 font-bold text-slate-800">Kelas</td>
                    <td className="p-3 border-r border-slate-200 font-bold text-slate-800">Kode Guru</td>
                    <td className="p-3 border-r border-slate-200 font-bold text-slate-800">Nama Perusahaan</td>
                    <td className="p-3 border-r border-slate-200 font-bold text-slate-800">Tanggal Mulai</td>
                    <td className="p-3 font-bold text-slate-800">Tanggal Selesai</td>
                  </tr>
                  <tr className="bg-slate-50/30 text-[10px] text-slate-500">
                    <td className="p-3 border-r border-slate-200 italic">1</td>
                    <td className="p-3 border-r border-slate-200 italic">242510001</td>
                    <td className="p-3 border-r border-slate-200 italic">Ahmad Dahlan</td>
                    <td className="p-3 border-r border-slate-200 italic">XII RPL 1</td>
                    <td className="p-3 border-r border-slate-200 italic">G001</td>
                    <td className="p-3 border-r border-slate-200 italic">PT Kencana Maju</td>
                    <td className="p-3 border-r border-slate-200 italic">2026-07-01</td>
                    <td className="p-3 italic">2026-12-31</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-100 p-4 rounded-[var(--ui-radius-small)] space-y-2">
            <h4 className="font-bold text-blue-900 text-xs">Penjelasan Kolom & Aturan Pengisian:</h4>
            <ul className="list-disc pl-5 space-y-1.5 text-xs text-blue-800">
              <li><strong>NIS</strong>: Harus sesuai dengan NIS siswa yang sudah terdaftar di database utama.</li>
              <li><strong>Kode Guru</strong>: Harus terdaftar di Master Data Guru (misal: G001, G002...).</li>
              <li><strong>Nama Perusahaan</strong>: Jika nama perusahaan belum terdaftar, sistem akan otomatis mendaftarkannya sebagai lokasi PKL baru!</li>
              <li><strong>Format Tanggal</strong>: Sangat disarankan menggunakan format standar internasional <code className="bg-white/60 px-1 py-0.5 rounded font-mono font-bold text-slate-700">YYYY-MM-DD</code> (contoh: 2026-07-01).</li>
            </ul>
          </div>

          <div className="flex justify-end pt-4 border-t border-slate-100">
            <Button variant="outline" size="sm" type="button" onClick={() => setIsGuideOpen(false)}>Tutup Panduan</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default ImportData;
