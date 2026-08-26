import { Button } from '../components/ui.jsx';
import { useState, useEffect, useCallback } from'react';
import { Info, AlertTriangle } from'lucide-react';
import { Modal } from'./ui.jsx';
;


export default function GlobalDialogProvider({ children }) {
  const [alertConfig, setAlertConfig] = useState(null);
  const [confirmConfig, setConfirmConfig] = useState(null);

  useEffect(() => {
    // Override default window.alert
    window.alert = (message) => {
      // Allow react to batch render
      setTimeout(() => {
         setAlertConfig({ message: String(message) });
      }, 0);
    };

    // Create a new async window.confirmAsync & override native confirm
    window.confirmAsync = (message) => {
      return new Promise((resolve) => {
        setConfirmConfig({
          message: String(message),
          onConfirm: () => resolve(true),
          onCancel: () => resolve(false)
        });
      });
    };

    window.confirm = (message) => {
      return window.confirmAsync(message);
    };
  }, []);

  const closeAlert = useCallback(() => setAlertConfig(null), []);
  
  const handleConfirmAction = useCallback(() => {
    if (confirmConfig?.onConfirm) confirmConfig.onConfirm();
    setConfirmConfig(null);
  }, [confirmConfig]);
  
  const handleCancelAction = useCallback(() => {
    if (confirmConfig?.onCancel) confirmConfig.onCancel();
    setConfirmConfig(null);
  }, [confirmConfig]);

  return (
    <>
      {children}
      
      {/* Alert Modal */}
      {alertConfig && (
        <Modal isOpen={true} onClose={closeAlert} title="Informasi" maxWidth="max-w-sm" scrollable={false}>
          <div className="flex flex-col items-center justify-center p-2 text-center">
            <Info size={42} className="text-indigo-500 mb-4 opacity-90" />
            <p className="text-slate-700 font-medium whitespace-pre-wrap">{alertConfig.message}</p>
          </div>
          <div className="flex justify-center mt-6">
            <Button onClick={closeAlert} variant="primary" className="px-8 w-full sm:w-auto">
              OK
            </Button>
          </div>
        </Modal>
      )}

      {/* Confirm Modal */}
      {confirmConfig && (
        <Modal isOpen={true} onClose={handleCancelAction} title="Konfirmasi" maxWidth="max-w-sm" scrollable={false}>
          <div className="flex flex-col items-center justify-center p-2 text-center">
            <AlertTriangle size={42} className="text-amber-500 mb-4 opacity-90" />
            <p className="text-slate-700 font-medium whitespace-pre-wrap">{confirmConfig.message}</p>
          </div>
          <div className="flex justify-center gap-3 mt-6 w-full">
            <Button variant="secondary" onClick={handleCancelAction} className="flex-1">
              Batal
            </Button>
            <Button variant="danger" onClick={handleConfirmAction} className="flex-1 text-white bg-rose-600 hover:bg-rose-700 border-none">
              Ya, Lanjutkan
            </Button>
          </div>
        </Modal>
      )}
    </>
  );
}
