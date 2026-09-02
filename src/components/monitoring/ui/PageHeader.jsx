import { cn } from '@/lib/utils';
import { HelpCircle, ChevronLeft } from 'lucide-react';
import { Button } from './index.js';
import { useAppStore } from '../../../store/useAppStore.js';

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
  const appSettings = useAppStore((state) => state.appSettings) || {};
  const headerStyle = appSettings.headerStyle || 'solid';

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
    <div className={cn("relative z-20 flex flex-col gap-2.5", isPlain ? '-mb-2' : '')}>
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
          className="sm:hidden w-full rounded-[var(--ui-radius-card)] p-3.5 flex items-center gap-3 relative overflow-hidden mb-1 transition-all bg-white border border-slate-200/80 shadow-xs text-slate-900"
        >
          {Icon && (
            <div 
              className="w-9 h-9 rounded-[var(--ui-radius-control)] flex items-center justify-center shrink-0 shadow-xs bg-primary/10 text-primary border border-primary/20"
            >
              <Icon size={18} strokeWidth={2.2} />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold leading-relaxed text-slate-600">
              {description || "Kelola & pantau informasi modul sekolah secara real-time."}
            </p>
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
                    "flex items-center justify-center gap-1.5 px-2.5 py-2.5 rounded-[var(--ui-radius-small)] text-xs font-bold transition-all border cursor-pointer w-full text-center leading-tight min-h-[42px]",
                    isLastOdd ? "col-span-2" : "",
                    tab.isActive
                      ? "bg-slate-900 text-white border-slate-900 shadow-xs font-black"
                      : "bg-white text-slate-700 hover:text-slate-900 border-slate-200/90 shadow-xs"
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
          !isPlain 
            ? headerStyle === 'primary'
              ? 'hidden sm:flex flex-col md:flex-row items-start md:items-center justify-between gap-4 relative rounded-[var(--ui-radius-card)] w-full p-4 sm:p-5 text-white shadow-sm transition-all'
              : headerStyle === 'glass'
              ? 'hidden sm:flex flex-col md:flex-row items-start md:items-center justify-between gap-4 relative rounded-[var(--ui-radius-card)] w-full p-4 sm:p-5 border border-white/50 bg-white/75 backdrop-blur-md text-slate-900 shadow-xs transition-all'
              : headerStyle === 'minimal'
              ? 'hidden sm:flex flex-col md:flex-row items-start md:items-center justify-between gap-4 relative rounded-none w-full p-0 bg-transparent text-slate-900 border-none shadow-none transition-all'
              : 'hidden sm:flex flex-col md:flex-row items-start md:items-center justify-between gap-4 relative rounded-[var(--ui-radius-card)] w-full p-4 sm:p-5 border border-slate-200/80 bg-[var(--card,#ffffff)] text-slate-900 shadow-xs transition-all'
            : 'flex flex-col md:flex-row items-start md:items-center justify-between gap-3 relative rounded-[var(--ui-radius-small)] w-full p-0'
        )}
        style={!isPlain && headerStyle === 'primary' ? { backgroundColor: 'var(--ui-primary, #064e3b)' } : undefined}
      >
        <div className="flex items-center gap-3.5 relative z-10 w-full md:w-auto">
          {Icon && (
            <div 
              className="w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 shadow-sm border"
              style={
                headerStyle === 'primary'
                  ? { backgroundColor: "rgba(255, 255, 255, 0.2)", borderColor: "rgba(255, 255, 255, 0.3)", color: "#ffffff" }
                  : !isPlain 
                  ? { backgroundColor: "var(--ui-primary, #064e3b)", borderColor: "var(--ui-primary, #064e3b)", color: "#ffffff" } 
                  : { backgroundColor: "color-mix(in srgb, var(--ui-primary, #064e3b) 12%, transparent)", borderColor: "color-mix(in srgb, var(--ui-primary, #064e3b) 20%, transparent)", color: "var(--ui-primary, #064e3b)" }
              }
            >
              <Icon size={20} className="shrink-0" strokeWidth={2.2} />
            </div>
          )}
          <div className="min-w-0 flex-1">
            <h1 
              className={cn("text-base md:text-lg font-black tracking-tight leading-tight truncate")}
              style={headerStyle === 'primary' ? { color: '#ffffff' } : { color: 'var(--card-foreground, #0f172a)' }}
            >
              {title}
            </h1>
            {description && (
              <p 
                className={cn("text-xs font-medium mt-0.5 line-clamp-2 md:line-clamp-none leading-relaxed")}
                style={headerStyle === 'primary' ? { color: 'rgba(255, 255, 255, 0.85)' } : { color: 'var(--card-muted, #64748b)' }}
              >
                {description}
              </p>
            )}
          </div>
        </div>

        {mappedTabs.length > 0 && (
          <div className="overflow-x-auto w-full md:w-auto scrollbar-none relative z-10">
            <div className="flex items-center gap-2 w-max md:w-auto shrink-0">
              
              {mappedTabs.map((tab) => {
                const isActive = tab.isActive;
                const isPrimaryHeader = headerStyle === 'primary';
                
                // Determine button variant based on header style and active state
                let variant = "ghost";
                if (isActive) {
                  variant = isPrimaryHeader ? "secondary" : "primary";
                }

                return (
                  <Button
                    key={tab.id || tab.label}
                    variant={variant}
                    onClick={tab.onClick}
                    className={cn(
                      "shrink-0",
                      // Custom text colors for inactive state on primary header
                      !isActive && isPrimaryHeader && "text-white/80 hover:text-white hover:bg-white/10",
                      // Custom text colors for inactive state on default header
                      !isActive && !isPrimaryHeader && "text-slate-500"
                    )}
                  >
                    {tab.icon && (
                      <tab.icon 
                        size={15} 
                        className={cn("shrink-0", isActive && isPrimaryHeader ? "text-slate-800" : "")} 
                      />
                    )}
                    <span className={isActive && isPrimaryHeader ? "text-slate-800" : ""}>{tab.label}</span>
                  </Button>
                );
              })}

              {onGuideClick && (
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={onGuideClick}
                  title={guideText ||"Panduan"}
                  className="shrink-0 rounded-[var(--ui-radius-control)] w-9 h-9 flex items-center justify-center text-slate-500 hover:text-slate-900 hover:bg-white/80 border border-transparent"
                >
                  <HelpCircle size={15} />
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
