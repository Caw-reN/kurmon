import React, { useState, useMemo, useEffect, useRef } from 'react';
import { BookOpen, Search, ShieldAlert, CheckCircle2, History, MessageSquare, Download, Users, TrendingUp, AlertOctagon, Printer, X, MonitorDot, Trash2 } from 'lucide-react';
import { Button, Modal, UISelect, TablePagination } from '../../components/ui.jsx';
import { CustomSelect } from '../../components/CustomSelect.jsx';
import { PageHeader, StatCard, SharedDashboardLogs } from '../../components/monitoring/ui/index.js';
import useAuthStore from "../../store/monitoring/authStore.js";
import * as XLSX from 'xlsx';

export default function DashboardBPBK({ students = [], classes = [] }) {
  const [riwayat, setRiwayat] = useState([]);
  const [konseling, setKonseling] = useState([]);
  
  const [search, setSearch] = useState("");
  const [filterClass, setFilterClass] = useState("all");
  
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);

  const authToken = useAuthStore(state => state.user?.authToken);
  const [isLoading, setIsLoading] = useState(false);
  
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [formKonseling, setFormKonseling] = useState({ jenis_kasus:'', tindak_lanjut:'', catatan_konseling:'' });

  // For Printing SP
  const [spData, setSpData] = useState(null);

  const fetchData = async () => {
    if (!authToken) return;
    setIsLoading(true);
    try {
      const [resRiwayat, resKonseling] = await Promise.all([
         fetch("/api/kedisiplinan/riwayat", { headers: {"Authorization": `Bearer ${authToken}` } }),
         fetch("/api/kedisiplinan/konseling", { headers: {"Authorization": `Bearer ${authToken}` } })
      ]);
      const dataRiwayat = await resRiwayat.json();
      const dataKonseling = await resKonseling.json();
      if (dataRiwayat.ok) setRiwayat(dataRiwayat.data || []);
      if (dataKonseling.ok) setKonseling(dataKonseling.data || []);
    } catch (e) {
      console.error(e);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, [authToken]);

  useEffect(() => {
    setCurrentPage(1);
  }, [search, filterClass]);

  const studentPoints = useMemo(() => {
    const map = {};
    students.forEach(s => {
      map[s.nis] = { ...s, total_poin: 0, catatan_terakhir:'-' };
    });
    riwayat.forEach(r => {
      if (map[r.siswa_nis]) {
        map[r.siswa_nis].total_poin += (r.poin || 0);
        if (map[r.siswa_nis].catatan_terakhir ==='-') {
          map[r.siswa_nis].catatan_terakhir = r.tindakan_nama;
        }
      }
    });
    return Object.values(map).filter(s => s.total_poin > 0);
  }, [students, riwayat]);

  const filteredStudents = useMemo(() => {
    return studentPoints.filter(s => {
      const studentName = s.namaSiswa || s.name ||'';
      const mClass = filterClass ==="all" || s.class_name === filterClass;
      const mSearch = search ==="" || studentName.toLowerCase().includes(search.toLowerCase()) || String(s.nis).toLowerCase().includes(search.toLowerCase());
      return mClass && mSearch;
    }).sort((a, b) => b.total_poin - a.total_poin);
  }, [studentPoints, search, filterClass]);

  const totalPages = Math.ceil(filteredStudents.length / itemsPerPage);
  const safePage = Math.max(1, Math.min(currentPage, totalPages || 1));
  const paginatedStudents = useMemo(() => {
    return filteredStudents.slice((safePage - 1) * itemsPerPage, safePage * itemsPerPage);
  }, [filteredStudents, safePage, itemsPerPage]);

  const openDetail = (s) => {
    setSelectedStudent(s);
    setShowDetailModal(true);
  };

  const saveKonseling = async (e) => {
    e.preventDefault();
    if (!authToken || !selectedStudent) return;
    try {
      const res = await fetch("/api/kedisiplinan/konseling", {
        method:"POST",
        headers: {"Authorization": `Bearer ${authToken}`,"Content-Type":"application/json" },
        body: JSON.stringify({ siswa_nis: selectedStudent.nis, ...formKonseling })
      });
      if (res.ok) {
        alert("Catatan konseling tersimpan.");
        setFormKonseling({ jenis_kasus:'', tindak_lanjut:'', catatan_konseling:'' });
        fetchData();
      }
    } catch (e) {
      console.error(e);
      alert("Gagal menyimpan konseling");
    }
  };

  const deleteKonseling = async (id) => {
    if (!confirm("Hapus catatan konseling ini?")) return;
    try {
      const res = await fetch("/api/kedisiplinan/konseling", {
        method:"POST",
        headers: {"Authorization": `Bearer ${authToken}`,"Content-Type":"application/json" },
        body: JSON.stringify({ action:"delete", id })
      });
      if (res.ok) fetchData();
    } catch (e) {
      console.error(e);
    }
  };

  const getStatusInfo = (poin) => {
    if (poin >= 100) return { label:"Kritis (DO)", type:"SP3", color:"bg-red-100 text-red-700" };
    if (poin >= 50) return { label:"Peringatan 2", type:"SP2", color:"bg-amber-100 text-amber-700" };
    if (poin >= 20) return { label:"Peringatan 1", type:"SP1", color:"bg-yellow-100 text-yellow-700" };
    return { label:"Aman", type:"Aman", color:"bg-slate-100 text-slate-700" };
  };

  const exportExcel = () => {
    const ws = XLSX.utils.json_to_sheet(filteredStudents.map(s => ({
      NIS: s.nis,
      Nama: s.namaSiswa || s.name,
      Kelas: s.class_name,"Total Poin": s.total_poin,"Pelanggaran Terakhir": s.catatan_terakhir
    })));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws,"Rekap_Kedisiplinan");
    XLSX.writeFile(wb, `Rekap_Kedisiplinan_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const handlePrintSP = (student) => {
    const info = getStatusInfo(student.total_poin);
    setSpData({ ...student, sp_type: info.type });
    // setTimeout to allow state to render the hidden print div before printing
    setTimeout(() => {
      window.print();
      setSpData(null);
    }, 500);
  };

  // Stat Cards
  const totalPantauan = studentPoints.filter(s => s.total_poin >= 20).length;
  const totalKritis = studentPoints.filter(s => s.total_poin >= 100).length;
  const thisMonth = new Date().toISOString().slice(0, 7); // YYYY-MM
  const logsThisMonth = riwayat.filter(r => r.tanggal_kejadian.startsWith(thisMonth)).length;

  return (
    <div className="space-y-6  relative print:p-0 print:m-0">
      
      {/* --- PRINT ONLY VIEW --- */}
      {spData && (
        <div className="hidden print:block fixed inset-0 bg-white z-[9999] p-10 font-serif text-black">
           <div className="text-center border-b-4 border-black pb-4 mb-6">
              <h1 className="text-2xl font-bold uppercase">Surat Peringatan ({spData.sp_type})</h1>
              <h2 className="text-xl font-bold mt-1">Lembaga Pendidikan & Pelatihan</h2>
              <p className="text-sm">Jalan Pendidikan No.123, Kota Ilmu</p>
           </div>
           
           <div className="mb-6 space-y-2 text-justify">
             <p>Yang bertanda tangan di bawah ini, Kepala Sekolah dengan ini memberikan surat peringatan kepada:</p>
             <table className="mt-4 mb-4 font-bold ml-6">
                <tbody>
                  <tr><td className="pr-4 py-1">Nama Siswa</td><td>: {spData.name}</td></tr>
                  <tr><td className="pr-4 py-1">NIS</td><td>: {spData.nis}</td></tr>
                  <tr><td className="pr-4 py-1">Kelas</td><td>: {spData.class_name}</td></tr>
                </tbody>
             </table>
             <p>Sehubungan dengan pelanggaran tata tertib sekolah yang telah dilakukan berulang kali oleh siswa tersebut, sehingga poin pelanggaran telah mencapai angka <strong>{spData.total_poin} poin</strong>.</p>
             <p>Adapun jenis pelanggaran terakhir yang dilakukan adalah: <strong>{spData.catatan_terakhir}</strong>.</p>
             <p className="mt-4">Surat peringatan {spData.sp_type} ini diberikan agar siswa yang bersangkutan dapat memperbaiki perilakunya dan menaati tata tertib sekolah. Jika di kemudian hari kembali melakukan pelanggaran, maka pihak sekolah akan memberikan sanksi yang lebih tegas sesuai dengan peraturan yang berlaku.</p>
           </div>
           
           <div className="flex justify-between mt-16 pt-8">
              <div className="text-center">
                 <p className="mb-16">Orang Tua / Wali Siswa</p>
                 <p className="font-bold border-b border-black inline-block w-48">( ........................................ )</p>
              </div>
              <div className="text-center">
                 <p className="mb-16">Mengetahui, Kepala Sekolah</p>
                 <p className="font-bold border-b border-black inline-block w-48">( ........................................ )</p>
              </div>
           </div>
        </div>
      )}
      
      {/* ─────── Shared Activity Logs ─────── */}
      <div className="mt-4">
        <SharedDashboardLogs />
      </div>

      {/* ----------------------- */}



      <div className="print:hidden mb-2">
        <PageHeader
          icon={ShieldAlert}
          title="Dashboard BP/BK"
          description="Monitoring kedisiplinan dan poin pelanggaran siswa."
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 print:hidden">
        <StatCard
          label="Siswa Dalam Pantauan"
          value={totalPantauan}
          sub="Batas poin >= 20 (SP1)"
          icon={AlertOctagon}
          iconBg="bg-amber-100"
          iconColor="text-amber-600"
        />
        <StatCard
          label="Siswa Kritis"
          value={totalKritis}
          sub="Batas poin >= 100 (DO)"
          icon={ShieldAlert}
          iconBg="bg-red-100"
          iconColor="text-red-600"
        />
        <StatCard
          label="Pelanggaran Bulan Ini"
          value={logsThisMonth}
          sub="Catatan selama bulan berjalan"
          icon={TrendingUp}
          iconBg="bg-blue-100"
          iconColor="text-blue-600"
        />
      </div>

      <div className="ui-card flex flex-col print:hidden">
        <div className="p-4 border-b border-slate-100 flex flex-col md:flex-row gap-4 justify-between items-center bg-slate-50/50 rounded-t-[var(--ui-radius-card)]">
          <div className="flex items-center gap-2 w-full md:w-auto">
            <div className="relative flex-1 md:w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input
                type="text"
                placeholder="Cari siswa atau NIS..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-white border-none rounded-[var(--ui-radius-small)] text-sm focus:outline-none focus:border-[var(--ui-primary)] focus:ring-2 focus:ring-[var(--ui-primary)]/20 transition-all font-medium"
              />
            </div>
            <CustomSelect
              options={[{value:'all', label:'Semua Kelas'}, ...classes.map(c => ({value: c.name, label: c.name}))]}
              value={filterClass}
              onChange={setFilterClass}
              className="w-56"
            />
          </div>
          <Button 
            onClick={exportExcel} 
            variant="outline"
            size="sm"
            className="flex items-center gap-1.5 shrink-0"
          >
            <Download size={14}/>
            <span>Export Rekap</span>
          </Button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-slate-500 uppercase bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-6 py-4 font-bold">Siswa & Kelas</th>
                <th className="px-6 py-4 font-bold text-center">Poin</th>
                <th className="px-6 py-4 font-bold">Status Pantauan</th>
                <th className="px-6 py-4 font-bold">Kasus Terakhir</th>
                <th className="px-6 py-4 font-bold text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr><td colSpan="5" className="px-6 py-12 text-center text-slate-500 font-medium">Memuat data monitoring...</td></tr>
              ) : paginatedStudents.length === 0 ? (
                <tr>
                   <td colSpan="5" className="px-6 py-16 text-center text-slate-500">
                     <Users size={48} className="mx-auto mb-4 text-slate-300"/>
                     <p className="font-bold text-lg text-slate-600 mb-1">Tidak Ada Data Siswa</p>
                     <p className="font-medium text-sm">Belum ada siswa yang memiliki rekor pelanggaran sesuai filter pencarian Anda.</p>
                   </td>
                </tr>
              ) : (
                paginatedStudents.map((s) => {
                  const statusInfo = getStatusInfo(s.total_poin);
                  return (
                  <tr key={s.nis} className="hover:bg-slate-50 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <div className="font-bold text-sm text-slate-800">{s.namaSiswa || s.name}</div>
                        <div className="text-[11px] text-slate-500">{s.nis}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className={`font-bold px-3 py-1.5 rounded-[var(--ui-radius-small)] border text-sm inline-block min-w-[3rem] ${statusInfo.color.replace('text-','border-').replace('100','200')} ${statusInfo.color}`}>
                         {s.total_poin}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                       <span className={`px-2.5 py-1 rounded-[var(--ui-radius-small)] text-[11px] font-bold ${statusInfo.color}`}>{statusInfo.label}</span>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-[12px] text-slate-600 line-clamp-2 max-w-[200px]" title={s.catatan_terakhir}>{s.catatan_terakhir}</p>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2 items-center">
                        {s.total_poin >= 20 && (
                          <Button size="sm" variant="outline" onClick={() => handlePrintSP(s)} className="text-[11px] bg-red-50 text-red-600 border-red-200 hover:bg-red-600 hover:text-white transition-all px-2" title="Cetak SP">
                             <Printer size={14}/> <span>PDF SP</span>
                          </Button>
                        )}
                        <Button size="sm" variant="outline" onClick={() => openDetail(s)} className="text-[11px] bg-white hover:border-[var(--ui-primary)] hover:text-[var(--ui-primary)] transition-all">
                          <BookOpen size={14} className="mr-1.5"/> Buku Konseling
                        </Button>
                      </div>
                    </td>
                  </tr>
                )})
              )}
            </tbody>
          </table>
        </div>

        <TablePagination 
          currentPage={safePage}
          totalPages={totalPages}
          totalItems={filteredStudents.length}
          itemsPerPage={itemsPerPage}
          onPageChange={setCurrentPage}
          onItemsPerPageChange={(val) => { setItemsPerPage(val); setCurrentPage(1); }}
          isLoading={isLoading}
        />
      </div>

      <Modal isOpen={showDetailModal} onClose={() => setShowDetailModal(false)} title="Buku Konseling Siswa" maxWidth="max-w-4xl">
        {selectedStudent && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 print:hidden">
            <div className="lg:col-span-5 space-y-4">
              <div className="bg-slate-50 border-none p-4 rounded-[var(--ui-radius-small)] relative">
                <div className="flex items-center gap-4 border-b border-slate-100 pb-4">
                   <div className="w-12 h-12 rounded-full bg-[var(--ui-primary)]/10 text-[var(--ui-primary)] flex items-center justify-center font-black text-lg">
                      {(selectedStudent.namaSiswa || selectedStudent.name ||'S').charAt(0).toUpperCase()}
                   </div>
                   <div>
                      <h2 className="text-xl font-bold text-slate-800">{selectedStudent.namaSiswa || selectedStudent.name}</h2>
                      <div className="text-sm font-medium text-slate-500">{selectedStudent.nis} • Kelas {selectedStudent.class_name}</div>
                   </div>
                </div>
                <div className="flex items-center justify-between p-2 bg-white rounded-[var(--ui-radius-card)] border-none shadow-sm mt-4">
                   <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase">Akumulasi Poin</p>
                      <p className="text-xl font-bold text-red-600 leading-none mt-0.5">{selectedStudent.total_poin}</p>
                   </div>
                   <div className="text-right">
                      <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Status</p>
                      <span className={`px-2 py-0.5 rounded-[var(--ui-radius-small)] text-[10px] font-bold ${getStatusInfo(selectedStudent.total_poin).color}`}>{getStatusInfo(selectedStudent.total_poin).label}</span>
                   </div>
                </div>
              </div>
              
              <div>
                <h3 className="text-sm font-bold text-slate-800 mb-3 flex items-center gap-2"><History size={16} className="text-slate-400"/> Riwayat Pelanggaran</h3>
                <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                  {riwayat.filter(r => r.siswa_nis === selectedStudent.nis).map(r => (
                    <div key={r.id} className="bg-white border-none p-3 rounded-[var(--ui-radius-card)] shadow-sm hover:-md transition- relative pl-10">
                      <div className="absolute left-3 top-4 w-5 h-5 rounded-full bg-red-100 text-red-600 flex items-center justify-center text-[10px] font-bold border border-red-200">!</div>
                      <div className="flex justify-between items-start mb-1.5 gap-2">
                        <p className="text-xs font-bold text-slate-800 leading-snug">{r.tindakan_nama}</p>
                        <span className="text-[10px] font-bold text-red-600 bg-red-50 px-1.5 py-0.5 rounded-[var(--ui-radius-small)] border border-red-100 flex-shrink-0">+{r.poin}</span>
                      </div>
                      <p className="text-[11px] text-slate-600 bg-slate-50 p-2 rounded-[var(--ui-radius-small)] italic border-none break-words w-full">"{r.catatan ||'Tanpa catatan tambahan'}"</p>
                      <div className="flex justify-between items-center mt-2 pt-2 border-t border-slate-100 text-[10px] text-slate-500 font-medium">
                        <span>Dilaporkan: {r.pelapor_nama}</span>
                        <span>{new Date(r.tanggal_kejadian).toLocaleDateString('id-ID')}</span>
                      </div>
                    </div>
                  ))}
                  {riwayat.filter(r => r.siswa_nis === selectedStudent.nis).length === 0 && (
                     <p className="text-[11px] text-slate-400 italic text-center py-4 bg-slate-50 rounded-[var(--ui-radius-small)] border border-dashed border-slate-200">Belum ada riwayat pelanggaran tercatat.</p>
                  )}
                </div>
              </div>
            </div>

            <div className="lg:col-span-7 border-t lg:border-t-0 lg:border-l border-slate-200 pt-4 lg:pt-0 lg:pl-6 space-y-6">
               <div>
                  <h3 className="text-sm font-bold text-slate-800 mb-3 flex items-center gap-2"><MessageSquare size={16} className="text-[var(--ui-primary)]"/> Sesi Konseling Baru</h3>
                  <form onSubmit={saveKonseling} className="bg-white border-none p-5 rounded-xl shadow-sm space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1.5">Topik / Jenis Kasus</label>
                        <input required value={formKonseling.jenis_kasus} onChange={e=>setFormKonseling({...formKonseling, jenis_kasus: e.target.value})} className="w-full px-3 py-2 text-sm bg-slate-50 border-none rounded-[var(--ui-radius-small)] outline-none focus:border-[var(--ui-primary)] focus:bg-white transition-colors" placeholder="Misal: Indisipliner Keterlambatan" />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1.5">Tindak Lanjut / Solusi</label>
                        <UISelect required value={formKonseling.tindak_lanjut} onChange={e=>setFormKonseling({...formKonseling, tindak_lanjut: e.target.value})} className="w-full">
                          <option value="">-- Pilih Tindakan --</option>
                          <option value="Teguran Lisan">Teguran Lisan</option>
                          <option value="Surat Peringatan 1 (SP1)">Surat Peringatan 1 (SP1)</option>
                          <option value="Surat Peringatan 2 (SP2)">Surat Peringatan 2 (SP2)</option>
                          <option value="Surat Peringatan 3 (SP3/DO)">Surat Peringatan 3 (SP3/DO)</option>
                          <option value="Pemanggilan Orang Tua">Pemanggilan Orang Tua</option>
                          <option value="Bimbingan Khusus">Bimbingan Khusus</option>
                        </UISelect>
                      </div>
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1.5">Hasil Pembinaan / Catatan</label>
                      <textarea required rows="3" value={formKonseling.catatan_konseling} onChange={e=>setFormKonseling({...formKonseling, catatan_konseling: e.target.value})} className="w-full px-3 py-2 text-sm bg-slate-50 border-none rounded-[var(--ui-radius-small)] outline-none focus:border-[var(--ui-primary)] focus:bg-white resize-none transition-colors" placeholder="Tuliskan rangkuman hasil wawancara, respon siswa, dan komitmen yang disepakati..."></textarea>
                    </div>
                    <Button type="submit" className="w-full text-sm py-2.5">Simpan Catatan Konseling</Button>
                  </form>
               </div>

               <div>
                 <h3 className="text-sm font-bold text-slate-800 mb-3 flex items-center gap-2">Riwayat Konseling Siswa</h3>
                 <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                   {konseling.filter(k => k.siswa_nis === selectedStudent.nis).map(k => (
                     <div key={k.id} className="relative pl-4 border-l-2 border-[var(--ui-primary)] pb-4 group">
                       <div className="absolute w-3 h-3 rounded-full bg-[var(--ui-primary)] -left-[7px] top-1 border-2 border-white shadow-sm"></div>
                       
                       <div className="flex justify-between items-start">
                         <div>
                           <p className="text-[10px] font-bold text-[var(--ui-primary)] mb-0.5 bg-[var(--ui-primary)]/10 inline-block px-1.5 py-0.5 rounded-[var(--ui-radius-small)]">{new Date(k.tanggal_konseling).toLocaleDateString('id-ID', { weekday:'long', year:'numeric', month:'long', day:'numeric' })}</p>
                           <p className="text-[13px] font-bold text-slate-800 mt-1">{k.jenis_kasus}</p>
                         </div>
                         <Button variant="outline" onClick={() =>deleteKonseling(k.id)} className="text-slate-300 hover:text-red-500 hover:bg-red-50 p-1.5 rounded-lg transition-colors opacity-0 group-hover:opacity-100">
                           <Trash2 size={14} /></Button>
                       </div>
                       
                       <p className="text-[11px] text-slate-600 font-medium my-1 flex items-center gap-1.5">
                          Tindak Lanjut: <span className="bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded-[var(--ui-radius-small)] text-[10px] border border-amber-200 font-bold">{k.tindak_lanjut}</span>
                       </p>
                       <div className="bg-slate-50 p-2.5 rounded-[var(--ui-radius-small)] border-none mt-2 relative">
                          <p className="text-[11px] text-slate-600 font-medium">"{k.catatan_konseling}"</p>
                       </div>
                       <p className="text-[9px] text-slate-400 font-bold uppercase mt-2">PENGINPUT: {k.guru_bk_nama}</p>
                     </div>
                   ))}
                   {konseling.filter(k => k.siswa_nis === selectedStudent.nis).length === 0 && (
                     <div className="text-center py-6 bg-slate-50 rounded-[var(--ui-radius-small)] border border-dashed border-slate-200">
                        <BookOpen size={24} className="mx-auto mb-2 text-slate-300"/>
                        <p className="text-[11px] text-slate-500 font-medium">Belum pernah ada sesi konseling.</p>
                     </div>
                   )}
                 </div>
               </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
