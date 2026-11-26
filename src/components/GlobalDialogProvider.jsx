import { useState, useEffect, useCallback } from 'react';
import { Info, AlertTriangle } from 'lucide-react';
import { Button, Modal } from './ui.jsx';


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
      {alertConfig && (() => {
        const msg = String(alertConfig.message || '').toLowerCase();
        const isSuccess = msg.includes('berhasil') || msg.includes('sukses') || msg.includes('tersimpan') || msg.includes('selesai');
        const isWarning = msg.includes('gagal') || msg.includes('error') || msg.includes('salah') || msg.includes('peringatan');
        const mascotSrc = isSuccess 
          ? '/maskot/kara-gana/gerak/gana-jempol.svg' 
          : isWarning 
            ? '/maskot/kara-gana/ekspresi/kara-terkejut.svg' 
            : '/maskot/kara-gana/gerak/kara-melambai.svg';
        const fallbackSrc = '/maskot/kara-gana/kara-avatar.svg';

        return (
          <Modal isOpen={true} onClose={closeAlert} title={isSuccess ? "Berhasil" : isWarning ? "Peringatan" : "Informasi"} maxWidth="max-w-sm" scrollable={false}>
            <div className="flex flex-col items-center justify-center p-2 text-center">
              <div className="w-20 h-20 mb-3 flex items-center justify-center">
                <img 
                  src={mascotSrc} 
                  alt="Kara & Gana" 
                  className="w-full h-full object-contain select-none drop-shadow-xs animate-in zoom-in-95 duration-200"
                  onError={(e) => { e.currentTarget.src = fallbackSrc; }}
                />
              </div>
              <p className="text-slate-700 font-semibold text-sm whitespace-pre-wrap">{alertConfig.message}</p>
            </div>
            <div className="flex justify-center mt-5">
              <Button onClick={closeAlert} variant="primary" className="px-8 w-full sm:w-auto">
                OK
              </Button>
            </div>
          </Modal>
        );
      })()}

      {/* Confirm Modal */}
      {confirmConfig && (
        <Modal isOpen={true} onClose={handleCancelAction} title="Konfirmasi Tindakan" maxWidth="max-w-sm" scrollable={false}>
          <div className="flex flex-col items-center justify-center p-2 text-center">
            <div className="w-20 h-20 mb-3 flex items-center justify-center">
              <img 
                src="/maskot/kara-gana/ekspresi/gana-berpikir.svg" 
                alt="Gana Konfirmasi" 
                className="w-full h-full object-contain select-none drop-shadow-xs animate-in zoom-in-95 duration-200"
                onError={(e) => { e.currentTarget.src = "/maskot/kara-gana/gana-avatar.svg"; }}
              />
            </div>
            <p className="text-slate-700 font-semibold text-sm whitespace-pre-wrap">{confirmConfig.message}</p>
          </div>
          <div className="flex justify-center gap-2.5 mt-5 w-full">
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
