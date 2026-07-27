import React, { useState, useEffect, useCallback } from'react';
import useAuthStore from'../../../store/monitoring/authStore';
import * as XLSX from'xlsx';
import { FileText, Download, CalendarIcon, HardDrive, Search } from'lucide-react';
import { CustomSelect } from'../../../components/CustomSelect.jsx';
import { TablePagination } from'../../../components/ui.jsx';


const authHeaders = (token) => ({"Authorization": `Bearer ${token}` });

export default function HikvisionReport({ type ='siswa' }) {
  const [logs, setLogs] = useState([]);
  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);
  
  const [filter, setFilter] = useState({
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
    deviceId:'all',
  });
  
  const authToken = useAuthStore(state => state.user?.authToken);

  const handleSearch = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams(filter);
      params.append('type', type);
      const res = await fetch(`/api/hikvision/report?${params.toString()}`, { headers: authHeaders(authToken) });
      const data = await res.json();
      if (data.ok) {
        setLogs(data.logs || []);
      }
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
    setCurrentPage(1);
  }, [filter, type, authToken]);

  useEffect(() => {
    // Fetch devices for filter dropdown
    const fetchDevices = async () => {
      try {
        const res = await fetch("/api/hikvision/dashboard", { headers: authHeaders(authToken) });
        const data = await res.json();
        if (data.ok) {
          // Filter mesin sesuai tipe laporan
          const filtered = (data.devices || []).filter(d => (d.device_type ||'siswa') === type);
          setDevices(filtered);
        }
      } catch (err) {
        console.error(err);
      }
    };
    fetchDevices();
    handleSearch();
  }, [type, authToken, handleSearch]);

  const handleExport = () => {
    const ws = XLSX.utils.json_to_sheet(logs.map(log => ({"Waktu": new Date(log.timestamp).toLocaleString('id-ID'),"ID": log.nis,"Nama": log.student_name,"Mesin": log.location,"IP Address": log.ip_address,"Event":"Wajah Valid"
    })));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, `Laporan ${type ==='guru' ?'Guru' :'Siswa'}`);
    XLSX.writeFile(wb, `Laporan_Absensi_Hikvision_${type}_${filter.startDate}.xlsx`);
  };

  const paginatedLogs = React.useMemo(() => logs.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage), [logs, currentPage, itemsPerPage]);
  const totalPages = Math.ceil(logs.length / itemsPerPage);

  return (
    <div className="flex flex-col gap-4 animate-in fade-in duration-300">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-white p-4 rounded-[var(--ui-radius-card)] shadow-sm border-none">
        <div className="flex items-center gap-3">
          <div>
            <h2 className="text-xl font-black text-slate-800 tracking-tight flex items-center gap-2">
              <FileText className="text-[var(--ui-primary)]" size={24} /> Laporan Kehadiran {type ==="guru" ?"Guru" :"Siswa"}
            </h2>
            <p className="text-sm text-slate-500 mt-1 font-medium">Lihat dan unduh rekapitulasi absensi {type ==="guru" ?"guru" :"siswa"}.</p>
          </div>
                  </div>
        <div>
          <button onClick={handleExport} disabled={logs.length === 0} className="flex items-center gap-2">
            <Download size={16} /> Export Excel
          </button>
        </div>
      </div>

      <div className="bg-white p-4 rounded-[var(--ui-radius-card)] shadow-sm border-none">
        <div className="flex flex-col md:flex-row gap-3 items-end">
          <div className="flex-1">
            <label className="block text-xs font-bold text-slate-600 mb-1 flex items-center gap-1"><CalendarIcon size={12}/> Dari Tanggal</label>
            <input className="px-3 py-2 bg-slate-50 border-none rounded-[var(--ui-radius-small)] text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-full"  
              type="date" 
              value={filter.startDate} 
              onChange={e => setFilter({...filter, startDate: e.target.value})} 
              className="w-full"
            />
          </div>
          <div className="flex-1">
            <label className="block text-xs font-bold text-slate-600 mb-1 flex items-center gap-1"><CalendarIcon size={12}/> Sampai Tanggal</label>
            <input className="px-3 py-2 bg-slate-50 border-none rounded-[var(--ui-radius-small)] text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-full"  
              type="date" 
              value={filter.endDate} 
              onChange={e => setFilter({...filter, endDate: e.target.value})} 
              className="w-full"
            />
          </div>
          <div className="flex-1">
            <label className="block text-xs font-bold text-slate-600 mb-1 flex items-center gap-1"><HardDrive size={12}/> Mesin</label>
            <CustomSelect
              value={filter.deviceId}
              onChange={val => setFilter({...filter, deviceId: val})}
              options={[
                { value:"all", label:"Semua Mesin" },
                ...devices.map(d => ({ value: d.id, label: `${d.location} (${d.ip_address})` }))
              ]}
            />
          </div>
          <div>
            <button onClick={handleSearch} className="flex items-center gap-2">
              <Search size={16} /> Tampilkan
            </button>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-[var(--ui-radius-small)] shadow-sm border-none overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-slate-50 border-b border-slate-100 text-slate-500">
              <tr>
                <th className="px-4 py-2.5 font-bold">Waktu Scan</th>
                <th className="px-4 py-2.5 font-bold">ID / {type ==="guru" ?"NIP" :"NIS"}</th>
                <th className="px-4 py-2.5 font-bold">Nama</th>
                <th className="px-4 py-2.5 font-bold">Mesin</th>
                <th className="px-4 py-2.5 font-bold">Event</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading ? (
                <tr><td colSpan={6} className="p-8 text-center text-slate-400">Memuat laporan...</td></tr>
              ) : paginatedLogs.map(log => (
                <tr key={log.id} className="hover:bg-slate-50">
                  <td className="px-4 py-2.5 font-medium text-slate-700">
                    {new Date(log.timestamp).toLocaleString('id-ID', { dateStyle:'medium', timeStyle:'short' })}
                  </td>
                  <td className="px-4 py-2.5 text-slate-500">{log.nis}</td>
                  <td className="px-4 py-2.5 font-bold text-slate-800">{log.student_name}</td>
                  
                  <td className="px-4 py-2.5 text-slate-600 font-medium">{log.location}</td>
                  <td className="px-4 py-2.5">
                    <span className={`px-2 py-1 rounded-[var(--ui-radius-small)] text-xs font-bold border bg-[var(--ui-primary)]/10 text-[var(--ui-primary)] border-[var(--ui-primary)]/20`}>Wajah Valid</span>
                  </td>
                </tr>
              ))}
              {!loading && logs.length === 0 && (
                <tr><td colSpan={5} className="p-8 text-center text-slate-400">Tidak ada data absensi untuk filter yang dipilih.</td></tr>
              )}
            </tbody>
          </table>
        </div>
        <TablePagination 
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={logs.length}
          itemsPerPage={itemsPerPage}
          onPageChange={setCurrentPage}
          onItemsPerPageChange={(val) => { setItemsPerPage(val); setCurrentPage(1); }}
          isLoading={loading}
        />
      </div>
    </div>
  );
}
