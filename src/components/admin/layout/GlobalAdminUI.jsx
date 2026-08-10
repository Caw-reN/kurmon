import { Button } from '../../../components/ui.jsx';
import { Info, AlertCircle, CheckCircle2, X } from'lucide-react';
import { cn } from'@/lib/utils';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from'../../ui/dialog.jsx';
;


export function GlobalAdminUI({ notification, setNotification, confirmDialog, setConfirmDialog }) {
  return (
    <>
      {notification && (() => {
        const lower = notification.toLowerCase();
        const isError = notification.includes("[ERROR]") || notification.includes("❌") || lower.includes("gagal") || lower.includes("kesalahan") || lower.includes("error") || (notification.includes("⚠️") && lower.includes("sudah digunakan"));
        const isWarning = notification.includes("[WARNING]") || lower.includes("peringatan") || lower.includes("perhatian") || lower.includes("wajib") || lower.includes("harus") || lower.includes("belum") || lower.includes("tidak boleh") || (notification.includes("⚠️") && !isError);
        const isSuccess = notification.includes("[SUCCESS]") || notification.includes("✅") || lower.includes("berhasil") || lower.includes("disimpan") || lower.includes("ditambahkan") || lower.includes("selesai");
        let IconToUse = Info;
        let colorClass ="bg-white border-slate-200 text-slate-800 shadow-sm";
        let iconClass ="text-blue-500";
        if (isError) {
          IconToUse = AlertCircle;
          colorClass ="bg-red-50 border-red-200 text-red-800 shadow-sm";
          iconClass ="text-rose-600";
        } else if (isWarning) {
          IconToUse = AlertCircle;
          colorClass ="bg-amber-50 border-amber-200 text-amber-800 shadow-sm";
          iconClass ="text-amber-600";
        } else if (isSuccess) {
          IconToUse = CheckCircle2;
          colorClass ="bg-emerald-50 border-emerald-200 text-emerald-800 shadow-sm";
          iconClass ="text-emerald-600";
        }
        const cleanMsg = notification
          .replace(/\[ERROR\]|\[WARNING\]|\[SUCCESS\]/g,"")
          .replace(/(✅|⚠️|❌|🗑️|✏️|🚀|⚙️|🔄|💾|👥|🏫|📅)/gu,"")
          .trim();
        return (
          <div className={cn("fixed bottom-6 right-6 z-[99999] flex items-center gap-3 px-4 py-3 rounded-[var(--ui-radius-small)] border shadow-sm max-w-md bg-white","animate-in slide-in-from-bottom-3 fade-in duration-200",
            colorClass
          )}>
            <IconToUse size={18} className={cn("shrink-0", iconClass)} />
            <p className="text-xs font-bold flex-1">{cleanMsg}</p>
            <button
              onClick={() => setNotification("")}
              className="ml-1 text-current opacity-60 hover:opacity-100 transition-opacity cursor-pointer bg-transparent border-none"
            >
              <X size={15} />
            </button>
          </div>
        );
      })()}

      {/* Confirm Dialog */}
      <Dialog
        open={confirmDialog.isOpen}
        onOpenChange={(open) => {
          if (!open) setConfirmDialog({ isOpen: false, message:"", onConfirm: null });
        }}
      >
        <DialogContent showCloseButton={false} className="max-w-sm gap-0 p-0 overflow-hidden">
          <div className="p-6 flex flex-col items-center text-center gap-3">
            <div className="w-11 h-11 bg-destructive/10 text-destructive rounded-full flex items-center justify-center shrink-0">
              <AlertCircle size={22} />
            </div>
            <DialogHeader className="gap-1">
              <DialogTitle className="text-sm font-bold text-foreground">
                {confirmDialog.title ||"Konfirmasi Tindakan"}
              </DialogTitle>
              <p className="text-xs text-muted-foreground font-medium">{confirmDialog.message}</p>
            </DialogHeader>
          </div>
          <DialogFooter className="flex flex-row gap-2 p-4 pt-0">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setConfirmDialog({ isOpen: false, message:"", onConfirm: null });
              }}
            >
              Batal
            </Button>
            <Button
              type="button"
              variant="destructive"
              className="flex-1"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                if (confirmDialog.onConfirm) {
                  try {
                    void Promise.resolve(confirmDialog.onConfirm()).catch(err => {
                      console.error("Error in onConfirm:", err);
                    });
                  } catch (err) {
                    console.error("Error in onConfirm:", err);
                  }
                }
                setConfirmDialog({ isOpen: false, message:"", onConfirm: null });
              }}
            >
              {confirmDialog.confirmLabel ||"Yakin, Hapus"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
