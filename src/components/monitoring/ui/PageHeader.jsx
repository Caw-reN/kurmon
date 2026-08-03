import { cn } from '@/lib/utils';
import { HelpCircle, ChevronLeft } from 'lucide-react';
import { Button } from './index.js';

export default function PageHeader({
  icon: Icon,
  title,
  description,
  tabs = [],
  activeTab,
  onTabChange,
  onGuideClick,
  guideText = "Panduan",
  variant = "default",
  onBack,
  children
}) {
  const mappedTabs = tabs.map(tab => ({
    ...tab,
    isActive: tab.isActive !== undefined ? tab.isActive : tab.id === activeTab,
    onClick: tab.onClick || (onTabChange ? () => onTabChange(tab.id) : undefined)
  }));

  const isPlain = variant === "plain";

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else if (typeof window !== 'undefined' && window.__setActiveTab) {
      window.__setActiveTab('dashboard');
    }
  };

  return (
    <div className={cn("relative z-20 flex flex-col gap-2.5 pb-2", isPlain ? '-mb-2' : '')}>
      {/* Mobile Navigation Header (Shown on Mobile screens when not plain) */}
      {!isPlain && (
        <div className="sm:hidden flex items-center justify-between gap-3 pt-1 pb-1">
          <button
            type="button"
            onClick={handleBack}
            className="w-9 h-9 rounded-full bg-white border border-slate-200 shadow-xs flex items-center justify-center text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer shrink-0"
            title="Kembali ke Dashboard"
          >
            <ChevronLeft size={20} strokeWidth={2.5} />
          </button>
          <h2 className="text-sm font-black text-slate-800 text-center flex-1 tracking-tight truncate px-2">
            {title}
          </h2>
          <div className="w-9 shrink-0" />
        </div>
      )}

      {/* Mobile Hero Header Card (Shown on Mobile screens when not plain) */}
      {!isPlain && (
        <div 
          className="sm:hidden w-full rounded-3xl p-4 text-white shadow-md flex items-center gap-3.5 relative overflow-hidden mb-1"
          style={{ background: "linear-gradient(135deg, var(--ui-primary) 0%, color-mix(in srgb, var(--ui-primary) 75%, #0f172a) 100%)" }}
        >
          {Icon && (
            <div className="w-11 h-11 rounded-2xl bg-white/20 backdrop-blur-md text-white flex items-center justify-center shrink-0 border border-white/20 shadow-inner">
              <Icon size={22} strokeWidth={2.2} />
            </div>
          )}
          <div className="flex-1 min-w-0">
            {description ? (
              <p className="text-xs font-semibold text-white/95 leading-relaxed">
                {description}
              </p>
            ) : (
              <p className="text-xs font-semibold text-white/80 leading-relaxed">
                Kelola &amp; pantau informasi modul sekolah secara real-time.
              </p>
            )}
          </div>
        </div>
      )}

      {/* Mobile Sub-Nav Tabs (Shown on Mobile screens when not plain and mappedTabs has items) */}
      {!isPlain && mappedTabs.length > 0 && (
        <div className="sm:hidden w-full -mt-0.5 mb-1.5">
          <div className={cn("grid gap-1.5 w-full", mappedTabs.length === 1 ? "grid-cols-1" : "grid-cols-2")}>
            {mappedTabs.map((tab, idx) => {
              const TabIcon = tab.icon;
              const isLastOdd = mappedTabs.length % 2 !== 0 && idx === mappedTabs.length - 1;
              return (
                <button
                  key={tab.id || tab.label}
                  onClick={tab.onClick}
                  className={cn(
                    "flex items-center justify-center gap-1.5 px-2.5 py-2.5 rounded-xl text-xs font-bold transition-all border cursor-pointer w-full text-center leading-tight min-h-[42px]",
                    isLastOdd ? "col-span-2" : "",
                    tab.isActive
                      ? "bg-slate-900 text-white border-slate-900 shadow-xs font-black"
                      : "bg-white text-slate-700 hover:text-slate-900 border-slate-200/90 shadow-2xs"
                  )}
                  style={tab.isActive ? {
                    background: "var(--ui-primary)",
                    borderColor: "var(--ui-primary)",
                    color: "#ffffff"
                  } : {}}
                >
                  {TabIcon && <TabIcon size={14} className="shrink-0" />}
                  <span className="leading-tight text-[10.5px] font-extrabold text-center line-clamp-2 break-words">{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Desktop & Default Header Container */}
      <div
        className={cn(
          !isPlain ? 'hidden sm:flex flex-col md:flex-row items-start md:items-center justify-between gap-3 relative rounded-xl w-full p-3.5 sm:p-4 border-none bg-primary text-white shadow-md' : 'flex flex-col md:flex-row items-start md:items-center justify-between gap-3 relative rounded-xl w-full p-0'
        )}
      >
        <div className="flex items-center gap-3 relative z-10 w-full md:w-auto">
          {Icon && (
            <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-sm",
              !isPlain ?"bg-accent text-slate-950 border border-accent/20" :"bg-primary/10 text-primary border border-primary/20"
            )}>
              <Icon size={18} className="shrink-0" />
            </div>
          )}
          <div className="min-w-0 flex-1">
            <h1 className={cn("text-sm sm:text-base md:text-lg font-bold tracking-tight leading-tight truncate",
              !isPlain ?"text-white font-black" :"text-foreground"
            )}>
              {title}
            </h1>
            {description && (
              <p className={cn("text-[10.5px] md:text-[11.5px] font-semibold mt-0.5 line-clamp-2 md:line-clamp-none leading-normal",
                !isPlain ?"text-white/85" :"text-muted-foreground"
              )}>
                {description}
              </p>
            )}
          </div>
        </div>

        {mappedTabs.length > 0 && (
          <div className="overflow-x-auto w-full md:w-auto scrollbar-none [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden relative z-10 -mx-1 px-1">
            <div className="flex flex-nowrap items-center gap-2 w-max md:w-auto pb-0.5">
              
              {mappedTabs.map((tab) => (
                <button
                  key={tab.id || tab.label}
                  onClick={tab.onClick}
                  className={cn("flex-none flex items-center justify-center gap-1.5 px-3 py-2 md:px-4 md:py-2","text-xs font-bold rounded-xl transition-all active:scale-95 cursor-pointer border shrink-0 whitespace-nowrap",
                    tab.isActive
                      ? (!isPlain ?'bg-accent text-slate-950 border-accent shadow-md font-black' :'bg-primary text-white border-primary shadow-sm')
                      : (!isPlain ?'bg-white/15 hover:bg-white/25 text-white border-white/15 font-semibold' :'bg-transparent hover:bg-muted text-muted-foreground border-border')
                  )}
                >
                  {tab.icon && <tab.icon size={14} className="shrink-0" />}
                  <span>{tab.label}</span>
                </button>
              ))}
   
              {onGuideClick && (
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={onGuideClick}
                  title={guideText ||"Panduan"}
                  className={cn("shrink-0 rounded-xl w-9.5 h-9.5 flex items-center justify-center border",
                    !isPlain ?"text-white/90 hover:bg-white/25 border-white/10 bg-white/10" :"text-muted-foreground hover:text-primary hover:bg-muted border-border"
                  )}
                >
                  <HelpCircle size={14} />
                </Button>
              )}
            </div>
          </div>
        )}

        {/* Children always rendered (e.g. action buttons like Tambah Mesin) */}
        {children && (
          <div className="flex items-center gap-2 relative z-10 shrink-0">
            {children}
          </div>
        )}
      </div>
    </div>
  );
}
