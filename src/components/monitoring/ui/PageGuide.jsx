import { useState } from'react';
import { Settings } from'lucide-react';
import { Layout, Info } from'lucide-react';
import { Modal } from'../../ui.jsx';


export default function PageGuide({ 
  activeLabel ="Kelola", 
  activeIcon: ActiveIcon = Settings, 
  title ="Panduan Halaman", 
  children 
}) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <div className="inline-flex items-center bg-white p-1 rounded-[var(--ui-radius-control)] border-none shadow-sm">
        <div className="flex items-center gap-2 px-4 py-1.5 bg-[var(--ui-primary)] text-white font-bold rounded-[var(--ui-radius-small)] text-sm shadow-sm cursor-default">
          <ActiveIcon size={16} /> {activeLabel}
        </div>
        <button 
          onClick={() => setIsOpen(true)}
          className="flex items-center gap-2 text-slate-500 hover:text-slate-700 hover:bg-slate-50 rounded-[var(--ui-radius-small)] transition-colors h-10 px-4 text-sm font-bold"
        >
          <Layout size={16} /> Panduan
        </button>
      </div>

      {isOpen && (
        <Modal 
          isOpen={true} 
          onClose={() => setIsOpen(false)} 
          title={
            <div className="flex items-center gap-2">
              <Info className="text-[var(--ui-primary)]" size={20} />
              {title}
            </div>
          } 
          scrollable={false}
        >
          <div className="w-full max-w-2xl max-h-[85vh] flex flex-col">
            <div className="space-y-6 text-sm text-slate-600 overflow-y-auto custom-scrollbar flex-1 pr-2">
              {children}
            </div>
            
            <div className="mt-6 pt-4 border-t border-slate-100 flex justify-end shrink-0">
              <button onClick={() => setIsOpen(false)} className="bg-[var(--ui-primary)] text-white rounded-[var(--ui-radius-control)] hover:opacity-90 shadow-sm transition-colors h-10 px-4 text-sm font-bold">
                Mengerti
              </button>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
}
