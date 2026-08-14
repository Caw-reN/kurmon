import { useState } from 'react';
import { CheckCircle2, Download, Upload } from'lucide-react';
;


export function BulkImportModal({
  isOpen,
  onClose,
  activeTab,
  fileInputRef,
  handleFileUpload,
  previewData,
  handlePreviewImport,
  handleProcessImport,
  downloadMasterTemplate,
  openImportGuide,
  bulkText,
  setBulkText,
  exportAllDataToExcel,
}) {
  const isAcademicCalendar = activeTab ==="akademik";
  const isSyllabusImport = activeTab ==="silabus" || activeTab ==="silabusguru";
  const importTitle = isAcademicCalendar ?"Import Kalender Akademik" : isSyllabusImport ?"Import Silabus" : `Import Data ${activeTab.toUpperCase()}`;
  const primaryFileLabel = isAcademicCalendar
    ?"Pilih File Kalender .xlsx / .csv / .txt"
    : isSyllabusImport
      ?"Pilih File Silabus .xlsx / .csv / .txt"
      :"Pilih File .xlsx / .csv / .txt";
  const guideLabel = isAcademicCalendar ?"Buka Panduan Kalender" : isSyllabusImport ?"Buka Panduan Silabus" :"Buka Panduan";
  const templateLabel = isAcademicCalendar ?"Unduh Template Kalender" : isSyllabusImport ?"Unduh Template Modul" :"Unduh Template Excel";
  const exportLabel ="Export Data Saat Ini";
  const textPlaceholder = isAcademicCalendar
    ?"Contoh: UTS Ganjil\t2026-09-15\t2026-09-19\tKurikulum\tPelaksanaan ujian tengah semester"
    : isSyllabusImport
      ?"Contoh: Dasar-Dasar Desain Grafis\tG01\tPertemuan 1: Pengenalan Vektor\tX / Ganjil\tSiswa memahami perbedaan vektor dan bitmap\tKonsep grafis vektor\nKonsep grafis bitmap"
    :"Teks dipisahkan dengan Tab, koma, atau titik koma. Bisa juga upload file Excel template...";
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={importTitle}>
      <div className="space-y-6">
        <div className="bg-slate-50 p-6 border-none rounded-[var(--ui-radius-small)]">
          <h4 className="text-xs font-black mb-4 flex items-center gap-2 text-slate-800 uppercase tracking-wider">
            <FileSpreadsheet className="text-emerald-600" /> 1. Upload File {isAcademicCalendar ?"Kalender" : isSyllabusImport ?"Modul" :"(Excel/CSV/TXT)"}
          </h4>
          <div className="flex gap-3 mb-3">
            <input type="file" accept=".csv,.txt,.xlsx,.xls,.xlsm" ref={fileInputRef} onChange={handleFileUpload} className="hidden" />
            <Button type="button" variant="secondary" onClick={() => fileInputRef.current?.click()} className="flex-1 border-dashed border-2 py-4">
              <Upload size={14} /> {primaryFileLabel}
            </Button>
          </div>
          <p className="text-[10px] text-slate-500 text-center font-bold">
            Belum punya template? <button type="button" onClick={downloadMasterTemplate} className="text-[var(--ui-primary)] hover:underline bg-transparent border-none cursor-pointer">{templateLabel}</button> - <button type="button" onClick={openImportGuide} className="text-[var(--ui-primary)] hover:underline bg-transparent border-none cursor-pointer">{guideLabel}</button> - <button type="button" onClick={exportAllDataToExcel} className="text-[var(--ui-primary)] hover:underline bg-transparent border-none cursor-pointer">{exportLabel}</button>
          </p>
        </div>

        <div className="bg-slate-50 p-6 border-none rounded-[var(--ui-radius-small)]">
          <h4 className="text-xs font-black mb-4 flex items-center gap-2 text-slate-800 uppercase tracking-wider">
            <FileText className="text-emerald-600" /> 2. Paste Teks Bebas {isAcademicCalendar ?"Kalender" : isSyllabusImport ?"Modul" :""}
          </h4>
          <textarea
            className="w-full h-32 border-none rounded-[var(--ui-radius-small)] p-4 text-xs focus:outline-[var(--ui-primary)] mb-4 font-mono font-medium"
            placeholder={textPlaceholder}
            value={bulkText}
            onChange={(e) => setBulkText(e.target.value)}
          />
          <div className="flex gap-3">
            <Button type="button" variant="secondary" onClick={handlePreviewImport} className="flex-1">Pratinjau</Button>
            <Button type="button" onClick={handleProcessImport} className="flex-1">Proses Data</Button>
          </div>
        </div>

        {previewData && (
          <div className="bg-white p-6 border border-emerald-100 rounded-[var(--ui-radius-control)] shadow-sm">
            <h4 className="text-xs font-black mb-4 flex items-center gap-2 text-emerald-800 uppercase tracking-wider">
              Preview Import
            </h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs font-bold">
              <div className="bg-slate-50 rounded-[var(--ui-radius-small)] p-3 border-none">
                <div className="text-[10px] text-slate-500 uppercase tracking-widest mb-1">Baris</div>
                <div className="text-lg text-slate-800">{previewData.total}</div>
              </div>
              <div className="bg-emerald-50 rounded-[var(--ui-radius-small)] p-3 border border-emerald-100">
                <div className="text-[10px] text-emerald-700 uppercase tracking-widest mb-1">Valid</div>
                <div className="text-lg text-emerald-800">{previewData.valid}</div>
              </div>
              <div className="bg-amber-50 rounded-[var(--ui-radius-small)] p-3 border border-amber-100">
                <div className="text-[10px] text-amber-700 uppercase tracking-widest mb-1">Akan Masuk</div>
                <div className="text-lg text-amber-800">{previewData.inserted}</div>
              </div>
              <div className="bg-blue-50 rounded-[var(--ui-radius-small)] p-3 border border-blue-100">
                <div className="text-[10px] text-blue-700 uppercase tracking-widest mb-1">Akan Diperbarui</div>
                <div className="text-lg text-blue-800">{previewData.updated || 0}</div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 mt-3 text-xs font-bold">
              <div className="bg-slate-50 rounded-[var(--ui-radius-small)] p-3 border-none">
                <div className="text-[10px] text-slate-500 uppercase tracking-widest mb-1">Format Salah</div>
                <div className="text-lg text-slate-800">{previewData.reasons?.invalid || 0}</div>
              </div>
              <div className="bg-slate-50 rounded-[var(--ui-radius-small)] p-3 border-none">
                <div className="text-[10px] text-slate-500 uppercase tracking-widest mb-1">Dilewati</div>
                <div className="text-lg text-slate-800">{previewData.skipped || 0}</div>
              </div>
            </div>
            <div className="mt-4">
              <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Contoh Data</div>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {(previewData.samples || []).length > 0 ? previewData.samples.map((sample, index) => (
                  <div key={`${sample}-${index}`} className="bg-slate-50 border-none rounded-[var(--ui-radius-small)] px-3 py-2 text-xs font-mono text-slate-700">
                    {sample}
                  </div>
                )) : (
                  <div className="text-xs text-slate-400 font-medium">Belum ada data valid untuk ditampilkan.</div>
                )}
              </div>
            </div>
            {(previewData.issues || []).length > 0 && (
              <div className="mt-4">
                <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Baris Bermasalah</div>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {previewData.issues.map((issue, index) => (
                    <div key={`${issue}-${index}`} className="bg-amber-50 border border-amber-100 rounded-[var(--ui-radius-small)] px-3 py-2 text-xs font-medium text-amber-900">
                      {issue}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
}

export function AcademicCalendarGuideModal({ isOpen, onClose }) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Panduan Kalender Akademik" maxWidth="max-w-4xl">
      <div className="space-y-6 text-sm text-slate-600 font-medium">
        <div className="bg-gradient-to-r from-[var(--ui-primary)]/10 to-[var(--ui-accent)]/20 border border-[var(--ui-accent)]/40 rounded-[var(--ui-radius-small)] p-4">
          <p className="font-bold text-slate-800 leading-relaxed">
            Panduan ini dibuat sangat sederhana agar nyaman dipakai oleh semua usia. Ikuti langkah di bawah, lalu import file Excel bila datanya sudah siap.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-4">
          {[
            {
              icon: Download,
              title:"1. Unduh Template",
              text:"Klik Template Excel agar format kolom sudah benar dan tidak membingungkan.",
            },
            {
              icon: Upload,
              title:"2. Isi Lalu Import",
              text:"Isi judul agenda, tanggal mulai, tanggal selesai, kategori, dan keterangan di Excel.",
            },
            {
              icon: CheckCircle2,
              title:"3. Cek Hasil",
              text:"Lihat pratinjau import, lalu simpan jika data sudah sesuai.",
            },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <div key={item.title} className="bg-slate-50 border-none rounded-[var(--ui-radius-small)] p-4">
                <div className="w-10 h-10 rounded-[var(--ui-radius-small)] bg-white border-none flex items-center justify-center text-[var(--ui-primary)] shadow-sm">
                  <Icon size={18} />
                </div>
                <h4 className="font-black text-slate-800 mt-3 mb-1">{item.title}</h4>
                <p className="text-xs leading-relaxed">{item.text}</p>
              </div>
            );
          })}
        </div>

        <div className="bg-slate-50 border-none rounded-[var(--ui-radius-small)] p-4">
          <h4 className="font-black text-slate-800 flex items-center gap-2 mb-3">
            <CalendarDays size={16} className="text-[var(--ui-primary)]" />
            Format Kolom Excel
          </h4>
          <div className="overflow-x-auto border-none rounded-[var(--ui-radius-small)] bg-white">
            <table className="w-full text-xs text-left border-collapse">
              <thead>
                <tr className="bg-slate-50">
                  <th className="p-3 border-r border-slate-200 font-black text-slate-700">Kolom A</th>
                  <th className="p-3 border-r border-slate-200 font-black text-slate-700">Kolom B</th>
                  <th className="p-3 border-r border-slate-200 font-black text-slate-700">Kolom C</th>
                  <th className="p-3 border-r border-slate-200 font-black text-slate-700">Kolom D</th>
                  <th className="p-3 font-black text-slate-700">Kolom E</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="p-3 border-t border-r border-slate-200 font-bold text-slate-800">Judul Kegiatan</td>
                  <td className="p-3 border-t border-r border-slate-200 font-bold text-slate-800">Mulai</td>
                  <td className="p-3 border-t border-r border-slate-200 font-bold text-slate-800">Selesai</td>
                  <td className="p-3 border-t border-r border-slate-200 font-bold text-slate-800">Kategori</td>
                  <td className="p-3 border-t border-slate-200 font-bold text-slate-800">Keterangan</td>
                </tr>
                <tr className="bg-slate-50/50 text-[10px] text-slate-500">
                  <td className="p-3 border-t border-r border-slate-200">Contoh: Ujian Tengah Semester</td>
                  <td className="p-3 border-t border-r border-slate-200">2026-09-15</td>
                  <td className="p-3 border-t border-r border-slate-200">2026-09-19</td>
                  <td className="p-3 border-t border-r border-slate-200">Kurikulum</td>
                  <td className="p-3 border-t border-slate-200">Opsional</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p className="text-xs text-slate-500 font-medium mt-3">
            Jika hanya satu hari, isi tanggal mulai dan selesai dengan tanggal yang sama. Kategori boleh mengikuti nama kategori yang sudah ada.
          </p>
        </div>

        <div className="bg-emerald-50 border border-emerald-200 rounded-[var(--ui-radius-small)] p-4">
          <h4 className="font-black text-emerald-900 mb-2 flex items-center gap-2">
            <Sparkles size={16} />
            Tips Agar Tidak Bingung
          </h4>
          <ul className="list-disc pl-5 space-y-1 text-xs text-emerald-800">
            <li>Jangan ubah judul kolom template di baris pertama.</li>
            <li>Jika ragu, biarkan kolom Keterangan kosong.</li>
            <li>Setelah import selesai, cek kembali agenda yang paling penting.</li>
          </ul>
        </div>

        <div className="flex justify-end pt-2 border-t border-slate-100">
          <Button type="button" onClick={onClose} className="px-6 py-2.5 text-xs">
            Tutup Panduan
          </Button>
        </div>
      </div>
    </Modal>
  );
}

export function TeacherCompetencyModal({
  isOpen,
  onClose,
  teacher,
  subjects = [],
  teacherAvailability,
  setTeacherAvailability,
}) {
  const [searchTerm, setSearchTerm] = useState("");

  const filteredSubjects = (subjects || []).filter(s => {
    if (!searchTerm) return true;
    const q = searchTerm.toLowerCase();
    return (
      String(s.name || "").toLowerCase().includes(q) ||
      String(s.major || "").toLowerCase().includes(q) ||
      String(s.grade || "").toLowerCase().includes(q)
    );
  });

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Kompetensi Mapel: ${teacher?.name ||"-"}`} maxWidth="max-w-6xl" scrollable={false}>
      <div className="mb-3.5 relative">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          placeholder="Cari mata pelajaran, jurusan, atau tingkat kelas..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-9 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-[var(--ui-radius-small)] text-xs font-semibold focus:outline-[var(--ui-primary)] focus:bg-white transition-colors"
        />
        {searchTerm && (
          <button type="button" onClick={() => setSearchTerm("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
            <X size={13} />
          </button>
        )}
      </div>

      <div className="max-h-[380px] overflow-y-auto pr-1 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2.5">
        {filteredSubjects.length > 0 ? (
          filteredSubjects.map((s) => {
            const avail = teacherAvailability[teacher?.code] || { subjects: [] };
            const isChecked = avail.subjects.includes(s.name);
            return (
              <label key={s.name} className={`flex items-center gap-2.5 p-2.5 rounded-[var(--ui-radius-small)] border cursor-pointer transition-all ${isChecked ?"bg-[#f4fbf6] border-[var(--ui-primary)] shadow-sm" :"bg-slate-50 border-slate-200 hover:border-emerald-300"}`}>
                <input
                  type="checkbox"
                  className="w-4 h-4 accent-[var(--ui-primary)] shrink-0"
                  checked={isChecked}
                  onChange={(e) => {
                    setTeacherAvailability((prev) => {
                      const next = { ...prev };
                      const current = next[teacher.code] || { days: [], subjects: [] };
                      next[teacher.code] = {
                        ...current,
                        subjects: e.target.checked
                          ? Array.from(new Set([...(current.subjects || []), s.name]))
                          : (current.subjects || []).filter((sub) => sub !== s.name),
                      };
                      return next;
                    });
                  }}
                />
                <div className="font-bold text-slate-800 text-xs leading-tight min-w-0">
                  <span className="truncate block">{s.name}</span>
                  <span className="text-[9px] font-black text-slate-400 block mt-0.5 truncate">{s.grade} - {s.major}</span>
                </div>
              </label>
            );
          })
        ) : (
          <div className="col-span-full py-8 text-center text-xs text-slate-400 font-medium italic">
            Mata pelajaran "{searchTerm}" tidak ditemukan.
          </div>
        )}
      </div>
      <div className="flex gap-3 pt-6 mt-4 border-t border-slate-100">
        <Button 
          type="button" 
          variant="danger" 
          className="text-xs px-4"
          onClick={() => {
            setTeacherAvailability((prev) => {
              const next = { ...prev };
              next[teacher?.code] = {
                ...(next[teacher?.code] || { days: [] }),
                subjects: []
              };
              return next;
            });
          }}
        >
          Reset
        </Button>
        <Button type="button" onClick={onClose} className="flex-1">Selesai Memilih</Button>
      </div>
    </Modal>
  );
}

export function ImportGuideModal({ isOpen, onClose }) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Buku Panduan: Import Excel/Teks" maxWidth="max-w-3xl">
      <div className="space-y-6 text-sm text-slate-600 font-medium">
        <p className="text-center text-slate-500 italic bg-slate-50 p-3 rounded-[var(--ui-radius-small)] border-none/50">
          Panduan ini dibuat sangat sederhana agar bisa dipahami oleh siapa saja, dari Bapak/Ibu guru senior hingga staf muda.
        </p>

        <div>
          <h4 className="text-sm font-black text-slate-800 flex items-center gap-2 mb-2">
            <span className="flex items-center justify-center w-6 h-6 rounded-full bg-emerald-100 text-emerald-700 text-xs font-black shrink-0">1</span>
            Apa itu Fitur Import Excel?
          </h4>
          <p className="pl-8 leading-relaxed">
            Daripada Anda harus mengetik jadwal atau data satu per satu di aplikasi, Anda bisa meng-copy (menyalin) data yang sudah Anda ketik di <strong>Microsoft Excel</strong> lalu mem-paste (menempelkan) data tersebut ke dalam aplikasi. Aplikasi akan membacanya secara otomatis dalam hitungan detik!
          </p>
        </div>

        <div>
          <h4 className="text-sm font-black text-slate-800 flex items-center gap-2 mb-3">
            <span className="flex items-center justify-center w-6 h-6 rounded-full bg-emerald-100 text-emerald-700 text-xs font-black shrink-0">2</span>
            Langkah-Langkah Sangat Mudah
          </h4>
          <div className="pl-8 space-y-4">
            <div className="bg-emerald-50/50 border-l-4 border-emerald-500 p-4 rounded-[var(--ui-radius-small)] -r-xl">
              <h5 className="font-bold text-emerald-900 text-xs mb-1">Langkah A: Buka Microsoft Excel Anda</h5>
              <p className="text-xs text-emerald-800">Siapkan data Anda di Excel. Pastikan urutan kolomnya sudah benar sesuai yang diminta aplikasi.</p>
            </div>
            <div className="bg-emerald-50/50 border-l-4 border-emerald-500 p-4 rounded-[var(--ui-radius-small)] -r-xl">
              <h5 className="font-bold text-emerald-900 text-xs mb-1">Langkah B: Blok dan Salin (Copy) Data di Excel</h5>
              <p className="text-xs text-emerald-800">
                Pilih (blok) baris dan kolom yang berisi data Anda di Excel (<strong>Tidak perlu mengeblok baris judul/header, cukup datanya saja</strong>).
                Tekan tombol <code className="bg-white px-1.5 py-0.5 rounded-[var(--ui-radius-small)] border-none font-mono font-bold text-slate-800 text-[11px] mx-1">Ctrl</code> + <code className="bg-white px-1.5 py-0.5 rounded-[var(--ui-radius-small)] border-none font-mono font-bold text-slate-800 text-[11px]">C</code> di keyboard Anda bersamaan (atau klik kanan lalu pilih"Copy").
              </p>
            </div>
            <div className="bg-emerald-50/50 border-l-4 border-emerald-500 p-4 rounded-[var(--ui-radius-small)] -r-xl">
              <h5 className="font-bold text-emerald-900 text-xs mb-1">Langkah C: Tempel (Paste) di Aplikasi</h5>
              <p className="text-xs text-emerald-800">
                Buka aplikasi jadwal, klik tombol <strong>"Import Data"</strong> atau <strong>"Import Teks"</strong>.
                Klik kotak putih kosong yang tersedia di layar, lalu tekan <code className="bg-white px-1.5 py-0.5 rounded-[var(--ui-radius-small)] border-none font-mono font-bold text-slate-800 text-[11px] mx-1">Ctrl</code> + <code className="bg-white px-1.5 py-0.5 rounded-[var(--ui-radius-small)] border-none font-mono font-bold text-slate-800 text-[11px]">V</code> di keyboard Anda (atau klik kanan pilih"Paste").
              </p>
            </div>
            <div className="bg-emerald-50/50 border-l-4 border-emerald-500 p-4 rounded-[var(--ui-radius-small)] -r-xl">
              <h5 className="font-bold text-emerald-900 text-xs mb-1">Langkah D: Klik Simpan</h5>
              <p className="text-xs text-emerald-800">Setelah teks muncul di kotak putih tersebut, klik tombol <strong>"Proses & Simpan Data"</strong>. Selesai!</p>
            </div>
          </div>
        </div>

        <div>
          <h4 className="text-sm font-black text-slate-800 flex items-center gap-2 mb-3">
            <span className="flex items-center justify-center w-6 h-6 rounded-full bg-emerald-100 text-emerald-700 text-xs font-black shrink-0">3</span>
            Susunan Kolom Excel yang Wajib Diikuti
          </h4>
          <div className="pl-8 space-y-4">
            <p className="text-xs">Agar aplikasi tidak bingung, susunan kolom Excel Anda <strong>harus berurutan dari kiri ke kanan</strong> seperti tabel di bawah ini:</p>
            
            <div>
              <h5 className="font-bold text-slate-800 text-xs mb-2">1. Untuk Data Sesi Belajar (Waktu / Jam)</h5>
              <div className="overflow-x-auto border-none rounded-[var(--ui-radius-small)]">
                <table className="w-full text-xs text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200">
                      <th className="p-3 border-r border-slate-200 font-bold text-slate-700">Kolom A</th>
                      <th className="p-3 border-r border-slate-200 font-bold text-slate-700">Kolom B</th>
                      <th className="p-3 border-r border-slate-200 font-bold text-slate-700">Kolom C</th>
                      <th className="p-3 border-r border-slate-200 font-bold text-slate-700">Kolom D</th>
                      <th className="p-3 font-bold text-slate-700">Kolom E</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-slate-100">
                      <td className="p-3 border-r border-slate-200 font-bold text-slate-800">Hari</td>
                      <td className="p-3 border-r border-slate-200 font-bold text-slate-800">Jam</td>
                      <td className="p-3 border-r border-slate-200 font-bold text-slate-800">Apakah Istirahat?</td>
                      <td className="p-3 border-r border-slate-200 font-bold text-slate-800">Nama Istirahat</td>
                      <td className="p-3 font-bold text-slate-800">Dihitung Berapa JP?</td>
                    </tr>
                    <tr className="bg-slate-50/30 text-[10px] text-slate-500">
                      <td className="p-3 border-r border-slate-200 italic">(Senin / Selasa / dst)</td>
                      <td className="p-3 border-r border-slate-200 italic">(07:00 - 07:45)</td>
                      <td className="p-3 border-r border-slate-200 italic">(Ya / Tidak)</td>
                      <td className="p-3 border-r border-slate-200 italic">(Misal: ISHOMA)</td>
                      <td className="p-3 italic">(Misal: 1 atau 0)</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <div>
              <h5 className="font-bold text-slate-800 text-xs mb-2">2. Untuk Data Mata Pelajaran</h5>
              <div className="overflow-x-auto border-none rounded-[var(--ui-radius-small)]">
                <table className="w-full text-xs text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200">
                      <th className="p-3 border-r border-slate-200 font-bold text-slate-700">Kolom A</th>
                      <th className="p-3 border-r border-slate-200 font-bold text-slate-700">Kolom B</th>
                      <th className="p-3 border-r border-slate-200 font-bold text-slate-700">Kolom C</th>
                      <th className="p-3 border-r border-slate-200 font-bold text-slate-700">Kolom D</th>
                      <th className="p-3 font-bold text-slate-700">Kolom E</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-slate-100">
                      <td className="p-3 border-r border-slate-200 font-bold text-slate-800">Nama Mapel</td>
                      <td className="p-3 border-r border-slate-200 font-bold text-slate-800">Kelas Berapa?</td>
                      <td className="p-3 border-r border-slate-200 font-bold text-slate-800">Jurusan Apa?</td>
                      <td className="p-3 border-r border-slate-200 font-bold text-slate-800">Apakah Praktik?</td>
                      <td className="p-3 font-bold text-slate-800">Durasi Sekali Main</td>
                    </tr>
                    <tr className="bg-slate-50/30 text-[10px] text-slate-500">
                      <td className="p-3 border-r border-slate-200 italic">(Matematika)</td>
                      <td className="p-3 border-r border-slate-200 italic">(X / XI / Semua)</td>
                      <td className="p-3 border-r border-slate-200 italic">(TKJ / TKR / Umum)</td>
                      <td className="p-3 border-r border-slate-200 italic">(Ya / Tidak)</td>
                      <td className="p-3 italic">(Misal: 2)</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <div>
              <h5 className="font-bold text-slate-800 text-xs mb-2">3. Untuk Data Beban Mengajar Guru</h5>
              <div className="overflow-x-auto border-none rounded-[var(--ui-radius-small)]">
                <table className="w-full text-xs text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200">
                      <th className="p-3 border-r border-slate-200 font-bold text-slate-700">Kolom A</th>
                      <th className="p-3 border-r border-slate-200 font-bold text-slate-700">Kolom B</th>
                      <th className="p-3 border-r border-slate-200 font-bold text-slate-700">Kolom C</th>
                      <th className="p-3 border-r border-slate-200 font-bold text-slate-700">Kolom D</th>
                      <th className="p-3 font-bold text-slate-700">Kolom E</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-slate-100">
                      <td className="p-3 border-r border-slate-200 font-bold text-slate-800">Kode Guru</td>
                      <td className="p-3 border-r border-slate-200 font-bold text-slate-800">Nama Mapel</td>
                      <td className="p-3 border-r border-slate-200 font-bold text-slate-800">Target Kelas</td>
                      <td className="p-3 border-r border-slate-200 font-bold text-slate-800">Target Jurusan</td>
                      <td className="p-3 font-bold text-slate-800">Berapa JP Sekali Masuk?</td>
                    </tr>
                    <tr className="bg-slate-50/30 text-[10px] text-slate-500">
                      <td className="p-3 border-r border-slate-200 italic">(G01)</td>
                      <td className="p-3 border-r border-slate-200 italic">(Matematika)</td>
                      <td className="p-3 border-r border-slate-200 italic">(X / XI / All)</td>
                      <td className="p-3 border-r border-slate-200 italic">(TKJ / TKR / All)</td>
                      <td className="p-3 italic">(Misal: 2)</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <div>
              <h5 className="font-bold text-slate-800 text-xs mb-2">4. Untuk Data Ketersediaan Guru</h5>
              <div className="overflow-x-auto border-none rounded-[var(--ui-radius-small)]">
                <table className="w-full text-xs text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200">
                      <th className="p-3 border-r border-slate-200 font-bold text-slate-700">Kolom A</th>
                      <th className="p-3 border-r border-slate-200 font-bold text-slate-700">Kolom B</th>
                      <th className="p-3 font-bold text-slate-700">Kolom C</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-slate-100">
                      <td className="p-3 border-r border-slate-200 font-bold text-slate-800">Kode Guru</td>
                      <td className="p-3 border-r border-slate-200 font-bold text-slate-800">Mapel Kompetensi</td>
                      <td className="p-3 font-bold text-slate-800">Hari Tersedia</td>
                    </tr>
                    <tr className="bg-slate-50/30 text-[10px] text-slate-500">
                      <td className="p-3 border-r border-slate-200 italic">(G01)</td>
                      <td className="p-3 border-r border-slate-200 italic">(Matematika, Fisika)</td>
                      <td className="p-3 italic">(Senin, Selasa, Rabu)</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <div>
              <h5 className="font-bold text-slate-800 text-xs mb-2">5. Untuk Data Jurusan</h5>
              <div className="overflow-x-auto border-none rounded-[var(--ui-radius-small)]">
                <table className="w-full text-xs text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200">
                      <th className="p-3 font-bold text-slate-700">Kolom A</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-slate-100">
                      <td className="p-3 font-bold text-slate-800">Nama Jurusan (Wajib)</td>
                    </tr>
                    <tr className="bg-slate-50/30 text-[10px] text-slate-500">
                      <td className="p-3 italic">(RPL / TKJ / TKR / Akuntansi)</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <div>
              <h5 className="font-bold text-slate-800 text-xs mb-2">6. Untuk Data Kelas</h5>
              <div className="overflow-x-auto border-none rounded-[var(--ui-radius-small)]">
                <table className="w-full text-xs text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200">
                      <th className="p-3 border-r border-slate-200 font-bold text-slate-700">Kolom A</th>
                      <th className="p-3 border-r border-slate-200 font-bold text-slate-700">Kolom B</th>
                      <th className="p-3 font-bold text-slate-700">Kolom C</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-slate-100">
                      <td className="p-3 border-r border-slate-200 font-bold text-slate-800">Nama Kelas</td>
                      <td className="p-3 border-r border-slate-200 font-bold text-slate-800">Jurusan</td>
                      <td className="p-3 font-bold text-slate-800">Wali Kelas (Nama)</td>
                    </tr>
                    <tr className="bg-slate-50/30 text-[10px] text-slate-500">
                      <td className="p-3 border-r border-slate-200 italic">(X RPL 1)</td>
                      <td className="p-3 border-r border-slate-200 italic">(RPL)</td>
                      <td className="p-3 italic">(Budi Santoso, S.Pd)</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <div>
              <h5 className="font-bold text-slate-800 text-xs mb-2">7. Untuk Data Guru</h5>
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
                      <th className="p-3 font-bold text-slate-700">Kolom G</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-slate-100">
                      <td className="p-3 border-r border-slate-200 font-bold text-slate-800">Kode Guru</td>
                      <td className="p-3 border-r border-slate-200 font-bold text-slate-800">Nama Guru</td>
                      <td className="p-3 border-r border-slate-200 font-bold text-slate-800">Password</td>
                      <td className="p-3 border-r border-slate-200 font-bold text-slate-800">Kategori</td>
                      <td className="p-3 border-r border-slate-200 font-bold text-slate-800">Prioritas Jurusan</td>
                      <td className="p-3 border-r border-slate-200 font-bold text-slate-800">Prioritas Tingkat</td>
                      <td className="p-3 font-bold text-slate-800">Target JP</td>
                    </tr>
                    <tr className="bg-slate-50/30 text-[10px] text-slate-500">
                      <td className="p-3 border-r border-slate-200 italic">(G01)</td>
                      <td className="p-3 border-r border-slate-200 italic">(Ahmad Fauzi, M.T)</td>
                      <td className="p-3 border-r border-slate-200 italic">(123456)</td>
                      <td className="p-3 border-r border-slate-200 italic">(Jurusan)</td>
                      <td className="p-3 border-r border-slate-200 italic">(RPL)</td>
                      <td className="p-3 border-r border-slate-200 italic">(XII)</td>
                      <td className="p-3 italic">(24)</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <div>
              <h5 className="font-bold text-slate-800 text-xs mb-2">8. Untuk Data Ruangan</h5>
              <div className="overflow-x-auto border-none rounded-[var(--ui-radius-small)]">
                <table className="w-full text-xs text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200">
                      <th className="p-3 border-r border-slate-200 font-bold text-slate-700">Kolom A</th>
                      <th className="p-3 border-r border-slate-200 font-bold text-slate-700">Kolom B</th>
                      <th className="p-3 border-r border-slate-200 font-bold text-slate-700">Kolom C</th>
                      <th className="p-3 border-r border-slate-200 font-bold text-slate-700">Kolom D</th>
                      <th className="p-3 border-r border-slate-200 font-bold text-slate-700">Kolom E</th>
                      <th className="p-3 font-bold text-slate-700">Kolom F</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-slate-100">
                      <td className="p-3 border-r border-slate-200 font-bold text-slate-800">ID Ruang</td>
                      <td className="p-3 border-r border-slate-200 font-bold text-slate-800">Nama Ruangan</td>
                      <td className="p-3 border-r border-slate-200 font-bold text-slate-800">Tipe</td>
                      <td className="p-3 border-r border-slate-200 font-bold text-slate-800">Jurusan</td>
                      <td className="p-3 border-r border-slate-200 font-bold text-slate-800">Target Tingkat</td>
                      <td className="p-3 font-bold text-slate-800">Prioritas</td>
                    </tr>
                    <tr className="bg-slate-50/30 text-[10px] text-slate-500">
                      <td className="p-3 border-r border-slate-200 italic">(LAB_RPL)</td>
                      <td className="p-3 border-r border-slate-200 italic">(Laboratorium RPL)</td>
                      <td className="p-3 border-r border-slate-200 italic">(Praktik)</td>
                      <td className="p-3 border-r border-slate-200 italic">(RPL)</td>
                      <td className="p-3 border-r border-slate-200 italic">(Semua)</td>
                      <td className="p-3 italic">(Ya)</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        </div>

        <div className="bg-amber-50 border border-amber-200 p-5 rounded-[var(--ui-radius-small)]">
          <h5 className="font-black text-amber-900 text-xs flex items-center gap-2 mb-2">
            💡 Tips Anti Gagal:
          </h5>
          <ul className="list-disc pl-5 space-y-1.5 text-xs text-amber-800 font-medium">
            <li>Jangan sampai ada kolom yang tertinggal/kosong di bagian tengah.</li>
            <li>Jika kolom D atau E tidak ada isinya, Anda bisa mengisi dengan strip"-" atau biarkan kosong jika memang itu kolom terakhir.</li>
            <li>Gunakan huruf besar/kecil tidak masalah, aplikasi sudah pintar menyesuaikan.</li>
          </ul>
        </div>

        <div className="flex justify-end pt-4 border-t border-slate-100">
          <Button type="button" onClick={onClose} className="px-6 py-2.5 text-xs">
            Tutup Panduan
          </Button>
        </div>
      </div>
    </Modal>
  );
}

export function TeacherSyllabusGuideModal({ isOpen, onClose }) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Panduan Silabus & BAB" maxWidth="max-w-4xl">
      <div className="space-y-6 text-sm text-slate-600 font-medium">
        <div className="bg-emerald-50 border border-emerald-100 rounded-[var(--ui-radius-small)] p-4">
          <p className="text-emerald-900 font-bold leading-relaxed">
            Panduan ini dibuat sebagai modal di dalam aplikasi supaya guru tidak perlu bingung. Silabus bisa diisi manual, di-import dari Excel, atau diisi banyak sekaligus.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <div className="bg-slate-50 border-none rounded-[var(--ui-radius-small)] p-4">
            <h4 className="font-black text-slate-800 flex items-center gap-2 mb-2">
              <BookOpen size={16} className="text-emerald-600" />
              1. Tambah Per Pertemuan / BAB
            </h4>
            <p className="text-xs leading-relaxed">
              Gunakan form <strong>Tambah Modul Baru</strong> untuk menambah satu pertemuan atau satu BAB materi.
              Setiap entri mewakili satu topik yang dipublikasikan ke halaman silabus.
            </p>
          </div>

          <div className="bg-slate-50 border-none rounded-[var(--ui-radius-small)] p-4">
            <h4 className="font-black text-slate-800 flex items-center gap-2 mb-2">
              <RefreshCw size={16} className="text-emerald-600" />
              2. Isi Banyak Sekaligus
            </h4>
            <p className="text-xs leading-relaxed">
              Kalau ingin mengganti semua pertemuan/BAB pada mapel yang sama, buka <strong>Isi Banyak Sekaligus</strong>, lalu pilih mode
              <strong> timpa data lama</strong>.
            </p>
          </div>
        </div>

        <div className="bg-slate-50 border-none rounded-[var(--ui-radius-small)] p-4">
          <h4 className="font-black text-slate-800 flex items-center gap-2 mb-3">
            <FileText size={16} className="text-emerald-600" />
            3. Format Isi Cepat
          </h4>
          <p className="text-xs leading-relaxed mb-3">
            Saat update massal, isi satu baris untuk satu pertemuan atau BAB. Kolom dipisahkan dengan <strong>tab</strong> atau tanda <strong>|</strong>.
          </p>
          <div className="bg-white border-none rounded-[var(--ui-radius-small)] p-3 text-xs font-mono text-slate-700 overflow-x-auto">
            Pertemuan 1: Pengenalan Algoritma | Siswa memahami konsep dasar | Definisi algoritma dan contoh sederhana
            <br />
            Pertemuan 2: Variabel dan Tipe Data | Siswa mengenal data dasar | Contoh variabel, konstanta, dan tipe data
          </div>
        </div>

        <div className="bg-amber-50 border border-amber-200 rounded-[var(--ui-radius-small)] p-4">
          <h4 className="font-black text-amber-900 mb-2">Catatan penting</h4>
          <ul className="list-disc pl-5 space-y-1 text-xs text-amber-800">
            <li>Jika mode <strong>Timpa data lama</strong> aktif, semua pertemuan/BAB untuk mapel dan semester yang sama akan diganti.</li>
            <li>Untuk import Excel, gunakan tombol <strong>Import Data</strong> di halaman Silabus lalu cek pratinjau sebelum disimpan.</li>
          </ul>
        </div>

        <div className="flex justify-end pt-2 border-t border-slate-100">
          <Button type="button" onClick={onClose} className="px-6 py-2.5 text-xs">
            Tutup Panduan
          </Button>
        </div>
      </div>
    </Modal>
  );
}

export function SyllabusBatchModal({
  isOpen,
  onClose,
  subjects = [],
  teachers = [],
  formData,
  setFormData,
  onSubmit,
}) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Isi Banyak Sekaligus" maxWidth="max-w-4xl">
      <form
        onSubmit={onSubmit}
        className="space-y-5"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 mb-2 block">Mata Pelajaran</label>
            <UISelect
              value={formData?.subjectName || ""}
              onChange={(e) => setFormData((prev) => ({ ...(prev || {}), subjectName: e.target.value }))}
              className="w-full text-slate-800"
              placeholder="-- Pilih Mapel --"
            >
              {subjects.map((subject) => (
                <option key={subject.name} value={subject.name}>
                  {subject.name}
                </option>
              ))}
            </UISelect>
          </div>
          <div>
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 mb-2 block">Guru Pengajar</label>
            <UISelect
              value={formData?.teacherCode || ""}
              onChange={(e) => setFormData((prev) => ({ ...(prev || {}), teacherCode: e.target.value }))}
              className="w-full text-slate-800"
              placeholder="-- Pilih Guru --"
            >
              {teachers.map((teacher) => (
                <option key={teacher.code} value={teacher.code}>
                  {teacher.code} - {teacher.name}
                </option>
              ))}
            </UISelect>
          </div>
        </div>

        <div>
          <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 mb-2 block">Kelas / Semester</label>
          <input
            type="text"
            value={formData?.gradeSemester ||""}
            onChange={(e) => setFormData((prev) => ({ ...(prev || {}), gradeSemester: e.target.value }))}
            className="w-full border-none bg-slate-50 p-3.5 rounded-[var(--ui-radius-small)] text-sm font-bold focus:bg-white focus:outline-[var(--ui-primary)]"
            placeholder="Contoh: X / Ganjil"
            required
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <label className={`flex items-start gap-3 p-4 rounded-[var(--ui-radius-small)] border cursor-pointer transition-all ${formData?.replaceExisting ?"bg-[#f4fbf6] border-[var(--ui-primary)]" :"bg-slate-50 border-slate-200"}`}>
            <input
              type="radio"
              name="replaceExisting"
              checked={!!formData?.replaceExisting}
              onChange={() => setFormData((prev) => ({ ...(prev || {}), replaceExisting: true }))}
              className="mt-1 accent-[var(--ui-primary)]"
            />
            <span>
              <span className="block font-black text-slate-800 text-sm">Timpa data lama</span>
              <span className="block text-xs text-slate-500 mt-1">Semua pertemuan/BAB pada mapel dan semester yang sama akan diganti.</span>
            </span>
          </label>
          <label className={`flex items-start gap-3 p-4 rounded-[var(--ui-radius-small)] border cursor-pointer transition-all ${!formData?.replaceExisting ?"bg-[#f4fbf6] border-[var(--ui-primary)]" :"bg-slate-50 border-slate-200"}`}>
            <input
              type="radio"
              name="replaceExisting"
              checked={!formData?.replaceExisting}
              onChange={() => setFormData((prev) => ({ ...(prev || {}), replaceExisting: false }))}
              className="mt-1 accent-[var(--ui-primary)]"
            />
            <span>
              <span className="block font-black text-slate-800 text-sm">Tambah tanpa hapus</span>
              <span className="block text-xs text-slate-500 mt-1">Baris baru akan ditambahkan ke data silabus yang sudah ada.</span>
            </span>
          </label>
        </div>

        <div>
          <div className="flex items-center justify-between gap-3 mb-2">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 block">Daftar Pertemuan / BAB</label>
            <span className="text-[10px] font-bold text-slate-400">1 baris = 1 pertemuan/BAB</span>
          </div>
          <textarea
            value={formData?.rowsText ||""}
            onChange={(e) => setFormData((prev) => ({ ...(prev || {}), rowsText: e.target.value }))}
            className="w-full min-h-[220px] border-none bg-slate-50 p-3.5 rounded-[var(--ui-radius-small)] text-sm font-mono font-medium focus:bg-white focus:outline-[var(--ui-primary)]"
            placeholder={"Pertemuan 1: Pengenalan Algoritma | Siswa memahami konsep dasar | Definisi algoritma dan contoh sederhana\nPertemuan 2: Variabel dan Tipe Data | Siswa mengenal data dasar | Contoh variabel, konstanta, dan tipe data"}
            required
          />
          <p className="text-[10px] text-slate-500 font-bold mt-2">
            Format: <span className="font-black">Judul Pertemuan/BAB | Tujuan Pembelajaran | Materi Pembelajaran | Catatan (opsional)</span>.
          </p>
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
          <Button type="button" variant="secondary" onClick={onClose}>Batal</Button>
          <Button type="submit">Simpan Perubahan</Button>
        </div>
      </form>
    </Modal>
  );
}
