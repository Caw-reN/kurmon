import { Button } from '../../../components/ui.jsx';
import { useState, useEffect, useMemo } from'react';
import { FileText, Printer, FileSignature } from'lucide-react';
import useAuthStore from'../../../store/monitoring/authStore.js';
import { useAppStore } from'../../../store/useAppStore';
import { Plus, Edit2, Trash2, X, AlertCircle, CheckCircle2 } from'lucide-react';
import { PageHeader } from '../../../components/monitoring/ui/index.js';
;
import { UISelect } from'../../../components/ui.jsx';


const JENIS_SURAT = [
  { key:'sp1', label:'Surat Panggilan 1 (SP1)', desc:'Peringatan pertama untuk siswa bermasalah' },
  { key:'sp2', label:'Surat Panggilan 2 (SP2)', desc:'Peringatan kedua, orang tua wajib hadir' },
  { key:'sp3', label:'Surat Panggilan 3 (SP3)', desc:'Peringatan ketiga, ancaman skorsing' },
  { key:'ket_aktif', label:'Surat Keterangan Aktif', desc:'Menerangkan bahwa siswa masih aktif bersekolah' },
  { key:'ket_lulus', label:'Surat Keterangan Lulus', desc:'Surat keterangan kelulusan sementara' },
  { key:'mutasi', label:'Surat Keterangan Mutasi', desc:'Perpindahan siswa ke sekolah lain' },
  { key:'dispensasi', label:'Surat Dispensasi', desc:'Izin tidak masuk untuk kegiatan resmi' },
  { key:'custom', label:'Template Custom', desc:'Buat template surat sesuai kebutuhan' },
];

const PLACEHOLDER_VARIABLES = [
  { var:'{NAMA_SISWA}', desc:'Nama lengkap siswa' },
  { var:'{NIS}', desc:'Nomor Induk Siswa' },
  { var:'{NISN}', desc:'Nomor Induk Siswa Nasional' },
  { var:'{KELAS}', desc:'Kelas siswa' },
  { var:'{JURUSAN}', desc:'Jurusan/Kompetensi' },
  { var:'{NAMA_SEKOLAH}', desc:'Nama sekolah' },
  { var:'{NAMA_KEPSEK}', desc:'Nama Kepala Sekolah' },
  { var:'{NIP_KEPSEK}', desc:'NIP Kepala Sekolah' },
  { var:'{TANGGAL}', desc:'Tanggal hari ini' },
  { var:'{KETERANGAN}', desc:'Keterangan / alasan khusus' },
  { var:'{TOTAL_POIN}', desc:'Total poin pelanggaran' },
];

function PrintPreview({ template, student, school, appSettings = {} }) {
  const today = new Date().toLocaleDateString('id-ID', { weekday:'long', year:'numeric', month:'long', day:'numeric' });
  const rendered = (template?.isi_template ||'').replace(/{NAMA_SISWA}/g, student?.name ||'[NAMA_SISWA]').replace(/{NIS}/g, student?.nis ||'[NIS]').replace(/{NISN}/g, student?.nisn ||'[NISN]').replace(/{KELAS}/g, student?.class_name ||'[KELAS]').replace(/{JURUSAN}/g, student?.major ||'[JURUSAN]').replace(/{NAMA_SEKOLAH}/g, school?.nama_sekolah ||'[NAMA_SEKOLAH]').replace(/{NAMA_KEPSEK}/g, school?.kepala_sekolah ||'[NAMA_KEPSEK]').replace(/{NIP_KEPSEK}/g, school?.nip_kepsek ||'[NIP_KEPSEK]').replace(/{TANGGAL}/g, today).replace(/{KETERANGAN}/g,'[KETERANGAN]').replace(/{TOTAL_POIN}/g,'[TOTAL_POIN]');

  return (
    <div className="bg-white p-8 rounded-[var(--ui-radius-small)] border-2 border-slate-200 text-sm leading-loose font-serif text-slate-800" style={{ minHeight:'400px' }}>
      {/* Kop Surat */}
      {appSettings.useKopSuratGambar && appSettings.kopSuratGambar ? (
        <img src={appSettings.kopSuratGambar} alt="Kop Surat" className="w-full h-auto object-contain mb-6" />
      ) : (
        <div className="flex items-center gap-4 pb-4 border-b-4 border-double border-slate-800 mb-6">
          {school?.logo_url && <img src={school.logo_url} alt="Logo" className="w-16 h-16 object-contain" />}
          <div className="text-center flex-1">
            <p className="text-xs">PEMERINTAH DAERAH</p>
            <h2 className="font-black text-xl uppercase">{school?.nama_sekolah ||'NAMA SEKOLAH'}</h2>
            <p className="text-xs">{school?.alamat ||'Alamat Sekolah'}</p>
            <p className="text-xs">Telp: {school?.telepon ||'-'} | Website: {school?.website ||'-'}</p>
            <p className="text-xs">Email: {school?.email ||'-'}</p>
          </div>
        </div>
      )}
      <div className="whitespace-pre-wrap text-justify">{rendered || <span className="text-slate-300 italic">Isi template akan muncul di sini...</span>}</div>
    </div>
  );
}

export default function ESurat() {
  const [templates, setTemplates] = useState([]);
  const [students, setStudents] = useState([]);
  const [school, setSchool] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [form, setForm] = useState({ jenis:'sp1', nama:'', isi_template:'' });
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [studentSearch, setStudentSearch] = useState('');
  const [activeTab, setActiveTab] = useState('cetak');
  const [toast, setToast] = useState(null);
  const authToken = useAuthStore(state => state.user?.authToken);

  const showToast = (msg, type ='success') => { setToast({ message: msg, type }); setTimeout(() => setToast(null), 3500); };

  const fetchData = async () => {
    if (!authToken) return;
    setIsLoading(true);
    try {
      const [tRes, sRes, scRes] = await Promise.all([
        fetch('/api/esurat', { headers: { Authorization: `Bearer ${authToken}` } }),
        fetch('/api/data/load', { headers: { Authorization: `Bearer ${authToken}` } }),
        fetch('/api/school-profile', { headers: { Authorization: `Bearer ${authToken}` } }),
      ]);
      const tData = await tRes.json(); if (tData.ok) setTemplates(tData.data || []);
      const sData = await sRes.json(); if (sData.payload && sData.payload.students) setStudents(sData.payload.students);
      const scData = await scRes.json(); if (scData.ok) setSchool(scData.data || {});
    } catch (e) { console.error(e); }
    setIsLoading(false);
  };

  useEffect(() => { fetchData(); }, [authToken]);

  const handleSave = async () => {
    if (!form.jenis || !form.nama || !form.isi_template) return showToast('Semua field wajib diisi!','error');
    try {
      const body = editingTemplate ? { ...form, id: editingTemplate.id } : form;
      const res = await fetch('/api/esurat', {
        method:'POST', headers: { Authorization: `Bearer ${authToken}`,'Content-Type':'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (data.ok) { showToast(editingTemplate ?'Template diperbarui!' :'Template ditambahkan!'); setShowModal(false); fetchData(); }
      else showToast(data.error ||'Gagal.','error');
    } catch (e) { showToast('Gagal.','error'); }
  };

  const handleDelete = async (id) => {
    if (!await window.confirmAsync('Hapus template surat ini?')) return;
    try {
      await fetch('/api/esurat', {
        method:'POST', headers: { Authorization: `Bearer ${authToken}`,'Content-Type':'application/json' },
        body: JSON.stringify({ action:'delete', id }),
      });
      showToast('Dihapus!'); fetchData();
    } catch (e) { showToast('Gagal.','error'); }
  };

  const handlePrint = () => {
    if (!selectedTemplate || !selectedStudent) return showToast('Pilih template dan siswa terlebih dahulu!','error');
    window.print();
  };

  const filteredStudents = useMemo(() => students.filter(s => !studentSearch || (s.namaSiswa || s.name)?.toLowerCase().includes(studentSearch.toLowerCase()) || s.nis?.includes(studentSearch)), [students, studentSearch]);

  const tabs = [
    { id:'cetak', label:'Cetak Surat', icon: Printer },
    { id:'template', label:'Kelola Template', icon: FileText }
  ];

  return (
    <div className="space-y-4 relative animate-in fade-in duration-300">
      <PageHeader
        title="E-Surat & Template Surat"
        icon={FileSignature}
        description="Buat, kelola, dan cetak berbagai template surat sekolah dengan variabel otomatis."
        tabs={tabs}
        activeTab={activeTab}
        onTabChange={setActiveTab}
      >
        <Button variant="outline" 
          onClick={() =>{ setEditingTemplate(null); setForm({ jenis:'sp1', nama:'', isi_template:'' }); setShowModal(true); }} 
          className="flex items-center gap-1.5 md: md: md: cursor-pointer shrink-0"
        >
          <Plus size={14} /> Buat Template</Button>
      </PageHeader>

      {activeTab ==='cetak' && (
        <div className="grid grid-cols-1 lg:grid-cols-[300px,1fr] gap-6">
          {/* Panel Kiri */}
          <div className="space-y-4">
            <div className="ui-card p-4 space-y-3">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">1. Pilih Template</p>
              {templates.length === 0 ? <p className="text-xs text-slate-400">Belum ada template. Buat di tab"Kelola Template".</p> :
                templates.map(t => (
                  <Button variant="outline" key={t.id} onClick={() =>setSelectedTemplate(t)}
                    className={`w-full text-left ${selectedTemplate?.id === t.id ?'bg-[var(--ui-primary)]/10 border-[var(--ui-primary)] text-[var(--ui-primary)]' :'bg-slate-50 border-slate-200 text-slate-700 hover:border-[var(--ui-primary)]'}`}>
                    <p className="font-bold text-sm">{t.nama}</p>
                    <p className="text-xs opacity-60">{JENIS_SURAT.find(j => j.key === t.jenis)?.label || t.jenis}</p></Button>
                ))
              }
            </div>
            <div className="ui-card p-4 space-y-3">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">2. Pilih Siswa</p>
              <input value={studentSearch} onChange={e => setStudentSearch(e.target.value)} placeholder="Cari siswa..."
                className="w-full px-3 py-2 bg-slate-50 border-none rounded-[var(--ui-radius-small)] text-sm focus:outline-none focus:border-[var(--ui-primary)]" />
              <div className="max-h-48 overflow-y-auto space-y-1">
                {filteredStudents.slice(0, 20).map(s => (
                  <Button variant="outline" key={s.nis} onClick={() =>setSelectedStudent(s)}
                    className={`w-full text-left ${selectedStudent?.nis === s.nis ?'bg-[var(--ui-primary)]/10 text-[var(--ui-primary)] font-bold' :'text-slate-600 hover:bg-slate-50'}`}>
                    {s.namaSiswa || s.name} <span className="opacity-60">({s.class_name})</span></Button>
                ))}
              </div>
            </div>
            <button onClick={handlePrint} disabled={!selectedTemplate || !selectedStudent} className="w-full flex items-center justify-center gap-2">
              <Printer size={14} /> Cetak Surat
            </button>
          </div>
          {/* Preview */}
          <div className="print-area">
            <PrintPreview template={selectedTemplate} student={selectedStudent} school={school} appSettings={useAppStore.getState().appSettings} />
          </div>
        </div>
      )}

      {activeTab ==='template' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {isLoading ? <p className="text-slate-400 py-8">Memuat...</p> : templates.length === 0 ? (
            <div className="col-span-3 text-center py-16 text-slate-400">
              <FileText size={48} className="mx-auto mb-4 opacity-30" />
              <p className="font-bold">Belum ada template surat.</p>
              <p className="text-sm mt-1">Klik"Buat Template" untuk memulai.</p>
            </div>
          ) : templates.map(t => {
            const jenis = JENIS_SURAT.find(j => j.key === t.jenis);
            return (
              <div key={t.id} className="ui-card p-5 hover:-translate-y-1 transition-all">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div>
                    <span className="text-[10px] font-bold bg-[var(--ui-primary)]/10 text-[var(--ui-primary)] px-2 py-0.5 rounded-[var(--ui-radius-small)] uppercase tracking-wider">{jenis?.label || t.jenis}</span>
                    <h3 className="font-bold text-slate-800 mt-2">{t.nama}</h3>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <Button variant="outline" onClick={() =>{ setEditingTemplate(t); setForm({ jenis: t.jenis, nama: t.nama, isi_template: t.isi_template }); setShowModal(true); }}
                      ><Edit2 size={13} /></Button>
                    <Button variant="outline" onClick={() =>handleDelete(t.id)} ><Trash2 size={13} /></Button>
                  </div>
                </div>
                <p className="text-xs text-slate-500 line-clamp-3 leading-relaxed">{t.isi_template}</p>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white rounded-[var(--ui-radius-small)] shadow-sm w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white">
              <h3 className="font-bold text-slate-800">{editingTemplate ?'Edit Template' :'Buat Template Baru'}</h3>
              <Button variant="outline" onClick={() =>setShowModal(false)}><X size={20} className="text-slate-400" /></Button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Jenis Surat</label>
                  <UISelect value={form.jenis} onChange={e => setForm(p => ({ ...p, jenis: e.target.value }))}
                    className="w-full px-3 py-2 bg-slate-50 border-none rounded-[var(--ui-radius-small)] text-sm font-semibold focus:outline-none focus:border-[var(--ui-primary)]">
                    {JENIS_SURAT.map(j => <option key={j.key} value={j.key}>{j.label}</option>)}
                  </UISelect>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Nama Template</label>
                  <input type="text" value={form.nama} onChange={e => setForm(p => ({ ...p, nama: e.target.value }))} placeholder="Nama template..."
                    className="w-full px-3 py-2 bg-slate-50 border-none rounded-[var(--ui-radius-small)] text-sm font-semibold focus:outline-none focus:border-[var(--ui-primary)]" />
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Isi Template</label>
                  <div className="flex flex-wrap gap-1">
                    {PLACEHOLDER_VARIABLES.map(v => (
                      <Button variant="outline" key={v.var} onClick={() =>setForm(p => ({ ...p, isi_template: p.isi_template + v.var }))}
                        title={v.desc} >
                        {v.var}</Button>
                    ))}
                  </div>
                </div>
                <textarea rows={12} value={form.isi_template} onChange={e => setForm(p => ({ ...p, isi_template: e.target.value }))}
                  placeholder="Tulis isi template surat. Gunakan tombol variabel di atas untuk menyisipkan data otomatis..."
                  className="w-full px-3 py-2 bg-slate-50 border-none rounded-[var(--ui-radius-small)] text-sm font-mono focus:outline-none focus:border-[var(--ui-primary)] resize-y" />
              </div>
              <div className="pt-4 flex justify-end gap-3">
                <Button variant="outline" type="button" onClick={() =>setShowModal(false)}>Batal</Button>
                <Button variant="outline" onClick={handleSave} >Simpan Template</Button>
              </div>
            </div>
          </div>
        </div>
      )}

      <style>{`@media print { body * { visibility: hidden !important; } .print-area, .print-area * { visibility: visible !important; } .print-area { position: fixed; top: 0; left: 0; width: 100%; } }`}</style>

      {toast && (
        <div className={`fixed bottom-6 right-6 px-4 py-3 rounded-[var(--ui-radius-small)] shadow-sm font-medium text-sm flex items-center gap-2 animate-in slide-in-from-bottom-5 text-white ${toast.type ==='error' ?'bg-red-600' :'bg-emerald-600'}`}>
          {toast.type ==='error' ? <AlertCircle size={18} /> : <CheckCircle2 size={18} />} {toast.message}
        </div>
      )}
    </div>
  );
}
