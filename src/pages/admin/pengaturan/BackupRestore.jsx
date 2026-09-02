import React, { useState } from 'react';
import { DatabaseBackup, Download, UploadCloud, AlertTriangle, ShieldCheck, CheckCircle2 } from 'lucide-react';
import useAuthStore from '../../../store/monitoring/authStore.js';
import { useAppStore } from '../../../store/useAppStore.js';
import { Button } from '../../../components/ui.jsx';
import { saveToServerNow } from '../../../utils/persistence.js';

export default function BackupRestore() {
  const authToken = useAuthStore(state => state.user?.authToken);
  const currentUser = useAuthStore(state => state.user);
  
  const [isDownloading, setIsDownloading] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [restoreMessage, setRestoreMessage] = useState({ text: "", type: "" });
  
  const isSuperAdmin = (currentUser?.role || '').toLowerCase() === 'superadmin';

  const handleDownloadBackup = async () => {
    setIsDownloading(true);
    setRestoreMessage({ text: "", type: "" });
    try {
      const res = await fetch('/api/data/backup', {
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      });
      
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP Error ${res.status}`);
      }
      
      const blob = await res.blob();
      
      // Get filename from Content-Disposition if available
      let filename = `kurmon_backup_${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
      const contentDisposition = res.headers.get('Content-Disposition');
      if (contentDisposition && contentDisposition.indexOf('filename=') !== -1) {
        const filenameMatch = contentDisposition.match(/filename="?([^"]+)"?/);
        if (filenameMatch && filenameMatch[1]) filename = filenameMatch[1];
      }
      
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();
      
      setRestoreMessage({ text: "Backup berhasil diunduh.", type: "success" });
    } catch (err) {
      console.error(err);
      setRestoreMessage({ text: err.message || "Gagal mengunduh backup.", type: "error" });
    } finally {
      setIsDownloading(false);
    }
  };

  const handleRestoreFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    if (file.type !== "application/json" && !file.name.endsWith('.json')) {
      setRestoreMessage({ text: "Harap pilih file backup berformat .json.", type: "error" });
      return;
    }
    
    const confirm = window.confirm("PERINGATAN KRITIS!\n\nProses restore akan MENIMPA SELURUH DATA yang ada saat ini dengan data dari file backup. Pastikan file backup ini valid.\n\nApakah Anda yakin ingin melanjutkan?");
    if (!confirm) {
      e.target.value = "";
      return;
    }

    setIsRestoring(true);
    setRestoreMessage({ text: "Memproses file backup...", type: "info" });
    
    try {
      const text = await file.text();
      const backupData = JSON.parse(text);
      
      if (!backupData || !backupData.payload) {
        throw new Error("File backup tidak valid (tidak mengandung struktur payload).");
      }
      
      setRestoreMessage({ text: "Mengirim data restore ke server...", type: "info" });
      
      // We push the entire payload to the standard save endpoint which merges relations
      await saveToServerNow(backupData.payload, authToken);
      
      setRestoreMessage({ text: "Restore berhasil! Halaman akan dimuat ulang dalam 3 detik.", type: "success" });
      
      setTimeout(() => {
        window.location.reload();
      }, 3000);
      
    } catch (err) {
      console.error(err);
      setRestoreMessage({ text: err.message || "Terjadi kesalahan saat membaca file backup.", type: "error" });
      setIsRestoring(false);
    }
    e.target.value = "";
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <h2 className="text-lg font-black text-slate-800 flex items-center gap-2">
          <DatabaseBackup className="text-[var(--ui-primary)]" />
          Manajemen Pencadangan (Backup & Restore)
        </h2>
        <p className="text-sm font-medium text-slate-500">
          Amankan seluruh konfigurasi, master data, jadwal, dan riwayat sistem dengan fitur Backup. Anda juga dapat memulihkan (Restore) data jika terjadi hal yang tidak diinginkan.
        </p>
      </div>
      
      {restoreMessage.text && (
        <div className={`p-4 rounded-[var(--ui-radius-small)] flex items-start gap-3 border ${
          restoreMessage.type === 'error' ? 'bg-rose-50 border-rose-200 text-rose-800' :
          restoreMessage.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' :
          'bg-indigo-50 border-indigo-200 text-indigo-800'
        }`}>
          {restoreMessage.type === 'error' ? <AlertTriangle size={20} className="shrink-0" /> : <CheckCircle2 size={20} className="shrink-0" />}
          <div>
            <div className="text-sm font-bold">{restoreMessage.type === 'error' ? 'Terjadi Kesalahan' : restoreMessage.type === 'success' ? 'Berhasil' : 'Informasi'}</div>
            <div className="text-xs font-medium mt-0.5">{restoreMessage.text}</div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        
        {/* Backup Card */}
        <div className="ui-card p-6 bg-white border border-slate-200 rounded-[var(--ui-radius-card)] shadow-xs hover:shadow-sm transition-all flex flex-col gap-4">
          <div className="w-12 h-12 rounded-[var(--ui-radius-small)] bg-sky-50 text-sky-600 flex items-center justify-center border border-sky-100">
            <Download size={24} />
          </div>
          <div>
            <h3 className="text-base font-black text-slate-800">Unduh Backup Data</h3>
            <p className="text-xs font-medium text-slate-500 mt-1.5 leading-relaxed">
              Mengekspor semua pengaturan, jadwal aktif, data guru, siswa, kelas, absensi, dan jurnal ke dalam satu file terenkripsi (.json). Anda disarankan melakukan backup ini secara berkala.
            </p>
          </div>
          
          <div className="mt-auto pt-4">
            <Button
              variant="primary"
              onClick={handleDownloadBackup}
              disabled={isDownloading || isRestoring}
              className="w-full justify-center gap-2 shadow-2xs font-bold bg-sky-600 hover:bg-sky-700 border-sky-600"
            >
              {isDownloading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Mengemas Data...
                </>
              ) : (
                <>
                  <Download size={16} />
                  Download Backup
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Restore Card */}
        <div className="ui-card p-6 bg-white border border-slate-200 rounded-[var(--ui-radius-card)] shadow-xs hover:shadow-sm transition-all flex flex-col gap-4">
          <div className="w-12 h-12 rounded-[var(--ui-radius-small)] bg-rose-50 text-rose-600 flex items-center justify-center border border-rose-100">
            <UploadCloud size={24} />
          </div>
          <div>
            <h3 className="text-base font-black text-slate-800">Restore Data (Pemulihan)</h3>
            <p className="text-xs font-medium text-slate-500 mt-1.5 leading-relaxed">
              Mengunggah file backup untuk memulihkan sistem. <strong className="text-rose-600">Perhatian:</strong> Tindakan ini akan <strong>menimpa seluruh data</strong> di database Anda dengan isi dari file backup.
            </p>
          </div>
          
          <div className="mt-auto pt-4 relative">
            {!isSuperAdmin ? (
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-[var(--ui-radius-small)] flex items-center justify-center gap-2 text-slate-500 text-xs font-bold">
                <ShieldCheck size={14} />
                Hanya SuperAdmin yang dapat me-Restore
              </div>
            ) : (
              <label className={`w-full flex items-center justify-center gap-2 p-3.5 rounded-[var(--ui-radius-small)] text-sm font-bold cursor-pointer transition-all ${
                isDownloading || isRestoring ? 'bg-slate-100 text-slate-400 pointer-events-none' : 'bg-rose-600 hover:bg-rose-700 text-white shadow-2xs hover:shadow-sm'
              }`}>
                {isRestoring ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Memulihkan...
                  </>
                ) : (
                  <>
                    <UploadCloud size={16} />
                    Pilih File & Restore
                  </>
                )}
                <input
                  type="file"
                  accept=".json"
                  className="hidden"
                  onChange={handleRestoreFileChange}
                  disabled={isDownloading || isRestoring}
                />
              </label>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
