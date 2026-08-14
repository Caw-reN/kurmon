import { useState, useMemo } from'react';
import { Users } from'lucide-react';
import * as XLSX from'xlsx';
import usePenugasanStore from'../../../store/monitoring/penugasanStore';
import { usePagination } from '../../../components/ui/PaginationControls.jsx';

/**
 * admin/DataGuru.jsx
 * Manajemen data guru pembimbing dengan kapasitas bimbingan.
 */










const DataGuru = ({ teachers = [], students = [], setTeachers }) => {
  const { kapasitasGuru, setKapasitasGuru, getLoadPerGuru } = usePenugasanStore();
  const [editingKapasitas, setEditingKapasitas] = useState(null);
  const [kapasitasInput, setKapasitasInput] = useState('');
  const [showImportModal, setShowImportModal] = useState(false);
  const [toast, setToast] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  const showToast = (message, type ='success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  const load = getLoadPerGuru(teachers);

  // Filter teachers based on search query
  const filteredTeachers = useMemo(() => {
    if (!searchQuery.trim()) return teachers;
    const lowerQ = searchQuery.toLowerCase();
    return teachers.filter(t => 
      (t.nama || t.name || '').toLowerCase().includes(lowerQ) ||
      (t.mapel || t.subject || '').toLowerCase().includes(lowerQ) ||
      (t.jurusan || t.major || '').toLowerCase().includes(lowerQ)
    );
  }, [teachers, searchQuery]);

  // Use Pagination Hook
  const { paginatedData: currentTeachers, PaginationBar } = usePagination(filteredTeachers, 20);

  const handleEditKapasitas = (guruId, current) => {
    setEditingKapasitas(guruId);
    setKapasitasInput(String(current));
  };

  const handleSaveKapasitas = (guruId) => {
    const val = parseInt(kapasitasInput);
    if (!isNaN(val) && val >= 1 && val <= 50) {
      setKapasitasGuru(guruId, val);
      setEditingKapasitas(null);
    } else {
      showToast('Kapasitas harus berupa angka antara 1 hingga 50.', 'error');
    }
  };

  const handleExport = () => {
    const exportData = teachers.map(g => ({
      ID: g.id,
      Nama: g.nama || g.name,
      Mapel: g.mapel,
      Jurusan: g.jurusan || g.major,"Kapasitas Bimbingan": kapasitasGuru[g.id] || 5
    }));
    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws,"Data_Guru");
    XLSX.writeFile(wb,"Data_Guru_PKL.xlsx");
  };

  const handleDownloadTemplate = () => {
    const templateData = [
      {'Kode Guru':'G01','Nama Guru':'Budi Santoso, S.Pd','Jurusan':'RPL','Kapasitas': 5
      }
    ];
    const ws = XLSX.utils.json_to_sheet(templateData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws,"Template Guru");
    XLSX.writeFile(wb,"Template_Master_Guru.xlsx");
  };

  // BUG-04 FIX: handleProcessImport sekarang menyimpan data ke database via API.
  // Sebelumnya hanya setTeachers() (state lokal) yang dijalankan — data hilang saat refresh.
  const handleProcessImport = async (jsonData) => {
    if (!Array.isArray(jsonData) || jsonData.length === 0) {
      showToast('Data import kosong atau tidak valid.', 'error');
      return;
    }

    const existingMap = new Map((teachers || []).map(g => [
      String(g.code || g.id || '').trim().toLowerCase(),
      g
    ]));

    let importedCount = 0;
    const invalidRows = [];

    jsonData.forEach((row, idx) => {
      const code = String(row['Kode Guru'] || row['kode'] || row['id'] || '').trim();
      const name = String(row['Nama Guru'] || row['nama'] || '').trim();

      if (!code) {
        invalidRows.push(`Baris ${idx + 1}: Kode Guru kosong`);
        return;
      }

      const kapasitas = parseInt(row['Kapasitas'] || row['kapasitas'] || 5);
      if (!isNaN(kapasitas) && kapasitas >= 1 && kapasitas <= 50) {
        setKapasitasGuru(code, kapasitas);
      }

      const newGuru = {
        ...(existingMap.get(code.toLowerCase()) || {}),
        code,
        name: name || existingMap.get(code.toLowerCase())?.name || code,
        major: String(row['Jurusan'] || row['jurusan'] || existingMap.get(code.toLowerCase())?.major || '').trim(),
      };

      existingMap.set(code.toLowerCase(), newGuru);
      importedCount++;
    });

    if (importedCount === 0) {
      showToast(`Tidak ada data valid yang bisa diimport. ${invalidRows.length} baris bermasalah.`, 'error');
      return;
    }

    const mergedTeachers = Array.from(existingMap.values());

    // Update state lokal terlebih dahulu (optimistic update)
    if (setTeachers) setTeachers(mergedTeachers);

    // Simpan ke database via API /api/data/save
    try {
      const token = (() => {
        try { return JSON.parse(sessionStorage.getItem('school_schedule_session_v1') || '{}')?.authToken; }
        catch { return null; }
      })();

      const res = await fetch('/api/data/save', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ payload: { teachers: mergedTeachers } }),
      });

      const resData = await res.json();

      if (!resData.ok && !resData.noChanges) {
        throw new Error(resData.error || 'Server menolak penyimpanan data.');
      }

      const successMsg = `✅ Berhasil import ${importedCount} guru dan tersimpan ke database.${invalidRows.length > 0 ? ` (${invalidRows.length} baris dilewati)` : ''}`;
      showToast(successMsg, 'success');

    } catch (err) {
      console.error('[DataGuru Import] Gagal menyimpan ke database:', err);
      showToast(`⚠️ Data diimport ke halaman ini, tapi gagal tersimpan ke database: ${err.message}. Data mungkin hilang saat refresh.`, 'warning');
    }
  };


  return (
    <div className="space-y-4">
      <PageHeader
        icon={Users}
        title="Data Guru Pembimbing"
        description={`${teachers.length} guru aktif terdaftar`}
      >
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
          <div className="relative w-full sm:w-64">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input 
              type="text" 
              placeholder="Cari guru..." 
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 bg-white border border-slate-200 rounded-[var(--ui-radius-small)] text-sm focus:outline-none focus:border-[var(--ui-primary)]"
            />
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <Button variant="outline" onClick={() =>setShowImportModal(true)} className="flex items-center gap-1.5 cursor-pointer">
              <Upload size={16} /> Impor</Button>
            <button onClick={handleExport} className="flex items-center gap-1.5 cursor-pointer">
              <Download size={16} /> Ekspor
            </button>
          </div>
        </div>
      </PageHeader>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {currentTeachers.length === 0 ? (
          <div className="col-span-full py-12 text-center text-slate-400">
            {searchQuery ? 'Tidak ada guru yang sesuai pencarian.' : 'Tidak ada data guru.'}
          </div>
        ) : (
        currentTeachers.map(guru => {
          const siswaGuru = students.filter(s => s.guruPembimbingId === guru.id);
          const kapasitas = kapasitasGuru[guru.id] || 5;
          const terpakai  = load[guru.id] || 0;
          const persen    = Math.round((terpakai / kapasitas) * 100);
          const isEditing = editingKapasitas === guru.id;

          return (
            <div key={guru.id}
              className="bg-white border-none rounded-[var(--ui-radius-small)] p-5 space-y-4">
              {/* Header */}
              <div className="flex items-start gap-3">
                <Avatar name={guru.nama || guru.name} size="lg" />
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-slate-800 leading-tight">{guru.nama || guru.name}</p>
                  <p className="text-xs text-slate-400 mt-0.5">{guru.mapel || guru.subject}</p>
                  <Badge variant={guru.jurusan || guru.major} label={guru.jurusan || guru.major} withDot={false} className="mt-2" />
                </div>
              </div>

              {/* Kapasitas */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Kapasitas Bimbingan</p>
                  {isEditing ? (
                    <div className="flex items-center gap-1.5">
                      <input
                        type="text" inputMode="numeric"
                        value={kapasitasInput}
                        onChange={e => setKapasitasInput(e.target.value.replace(/[^0-9]/g,''))}
                        className="w-12 text-xs text-center border border-primary rounded-[var(--ui-radius-small)] px-1.5 py-1
                          focus:outline-none focus:ring-2 focus:ring-[var(--ui-primary)]"
                        autoFocus
                      />
                      <Button variant="outline" onClick={() =>handleSaveKapasitas(guru.id)}
                        >
                        <Check size={12} /></Button>
                    </div>
                  ) : (
                    <Button variant="outline" onClick={() =>handleEditKapasitas(guru.id, kapasitas)}
                      className="flex items-center gap-1">
                      <Edit3 size={11} /> Edit</Button>
                  )}
                </div>

                <div className="flex items-center gap-2 mb-1.5">
                  <div className="flex-1 h-2 bg-gray-100 rounded-[var(--ui-radius-small)] overflow-hidden">
                    <div
                      className={`h-full rounded-[var(--ui-radius-small)] transition-all ${
                        persen >= 100 ?'bg-danger' : persen >= 80 ?'bg-amber-500' :'bg-[var(--ui-primary)]'
                      }`}
                      style={{ width: `${Math.min(persen, 100)}%` }}
                    />
                  </div>
                  <span className={`text-xs font-bold ${persen >= 100 ?'text-danger' :'text-slate-800'}`}>
                    {terpakai}/{kapasitas}
                  </span>
                </div>

                <p className="text-[10px] text-slate-400">
                  {kapasitas - terpakai > 0
                    ? `Sisa ${kapasitas - terpakai} slot tersedia`
                    :'Kapasitas penuh'}
                </p>
              </div>

              {/* Siswa bimbingan */}
              {siswaGuru.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                    Siswa Bimbingan
                  </p>
                  <div className="space-y-2">
                    {siswaGuru.map(s => (
                      <div key={s.id} className="flex items-center gap-2">
                        <Avatar name={s.nama || s.name} size="xs" />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-slate-800 truncate">{s.nama || s.name}</p>
                          <p className="text-[10px] text-slate-400">{s.kelas || s.className}</p>
                        </div>
                        <Badge variant={s.statusHadir ||'Hadir'} withDot />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {siswaGuru.length === 0 && (
                <p className="text-xs text-slate-400 italic text-center py-2">Belum ada siswa bimbingan</p>
              )}
            </div>
          );
        }))}
      </div>
      
      {/* Pagination Controls */}
      {filteredTeachers.length > 0 && (
        <div className="ui-card mt-2 rounded-[var(--ui-radius-card)] border border-slate-100 overflow-hidden">
          <PaginationBar />
        </div>
      )}

      {showImportModal && (
        <ImportModal
          isOpen={showImportModal}
          onClose={() => setShowImportModal(false)}
          title="Import Data Guru Pembimbing"
          expectedColumns={['Kode Guru','Nama Guru','Jurusan','Kapasitas']}
          guideText="Pastikan file Excel memiliki header di baris pertama. Data yang diunggah akan ditambahkan ke sistem atau diperbarui (ditimpa) jika Kode Guru sudah ada."
          onDownloadTemplate={handleDownloadTemplate}
          onImport={handleProcessImport}
          onExportCurrent={handleExport}
        />
      )}
      {toast && (
        <div className={`fixed bottom-6 right-6 px-4 py-3 rounded-[var(--ui-radius-small)] shadow-sm font-medium text-sm flex items-center gap-2 animate-in slide-in-from-bottom-5 text-white z-[100] ${toast.type ==='error' ?'bg-rose-600' :'bg-emerald-600'}`}>
          {toast.message}
        </div>
      )}
    </div>
  );
};

export default DataGuru;
