import { cn } from '@/lib/utils';
import { HelpCircle } from 'lucide-react';
import Button from './Button.jsx';
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
  actions,
  children
}) {
  const appSettings = useAppStore((state) => state.appSettings) || {};
  const headerStyle = appSettings.headerStyle || 'primary';

  const mappedTabs = tabs.map(tab => ({
    ...tab,
    isActive: tab.isActive !== undefined ? tab.isActive : tab.id === activeTab,
    onClick: tab.onClick || (onTabChange ? () => onTabChange(tab.id) : undefined)
  }));

  const isPlain = variant === "plain";

  return (
    <div className={cn("relative z-20 flex flex-col gap-2.5", isPlain ? '-mb-2' : '')}>
      {/* Mobile Actions Bar (Only if actions exist, without duplicating header title/icon with AdminHeader) */}
      {!isPlain && actions && (
        <div className="sm:hidden flex items-center justify-end gap-2 px-1 py-0.5">
          {actions}
        </div>
      )}

      {/* Mobile Sub-Nav Tabs (Shown on Mobile screens when not plain and mappedTabs has items) */}
      {!isPlain && mappedTabs.length > 0 && (
        <div className="sm:hidden w-full pt-1 mb-2">
          <div 
            role="tablist" 
            aria-label={title || "Navigasi Sub-Tab"}
            className={cn("grid gap-1.5 w-full", mappedTabs.length === 1 ? "grid-cols-1" : "grid-cols-2")}
          >
            {mappedTabs.map((tab, idx) => {
              const TabIcon = tab.icon;
              const isLastOdd = mappedTabs.length % 2 !== 0 && idx === mappedTabs.length - 1;
              return (
                <button
                  key={tab.id || tab.label}
                  type="button"
                  role="tab"
                  aria-selected={tab.isActive}
                  onClick={tab.onClick}
                  className={cn(
                    "flex items-center justify-center gap-1.5 px-2.5 py-2.5 rounded-xl text-xs font-bold transition-all border cursor-pointer w-full text-center leading-tight min-h-[42px] shadow-2xs",
                    isLastOdd ? "col-span-2" : "",
                    tab.isActive
                      ? "bg-emerald-600 text-white border-emerald-600 font-black shadow-xs"
                      : "bg-white text-slate-700 hover:text-slate-900 border-slate-200/90"
                  )}
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
              ? 'hidden sm:flex flex-col md:flex-row items-start md:items-center justify-between gap-4 relative rounded-2xl w-full p-4 sm:p-5 text-white transition-all bg-emerald-600 border border-emerald-500/30 shadow-xs overflow-hidden'
              : headerStyle === 'glass'
              ? 'hidden sm:flex flex-col md:flex-row items-start md:items-center justify-between gap-4 relative rounded-2xl w-full p-4 sm:p-5 border border-white/50 bg-white/75 backdrop-blur-md text-slate-900 shadow-xs transition-all'
              : headerStyle === 'minimal'
              ? 'hidden sm:flex flex-col md:flex-row items-start md:items-center justify-between gap-4 relative rounded-none w-full p-0 bg-transparent text-slate-900 border-none transition-all'
              : 'hidden sm:flex flex-col md:flex-row items-start md:items-center justify-between gap-4 relative rounded-2xl w-full p-4 sm:p-5 border border-slate-200/80 bg-[var(--card,#ffffff)] text-slate-900 shadow-xs transition-all'
            : 'flex flex-col md:flex-row items-start md:items-center justify-between gap-3 relative rounded-lg w-full p-0'
        )}
        style={!isPlain && headerStyle === 'primary' ? { backgroundColor: 'var(--ui-primary, #16a34a)' } : undefined}
      >
        <div className="flex items-center gap-3.5 relative z-10 w-full md:w-auto min-w-0">
          {Icon && (
            <div 
              className={cn(
                "w-11 h-11 rounded-xl flex items-center justify-center shrink-0 border shadow-2xs transition-all",
                headerStyle === 'primary'
                  ? "bg-white/15 text-white border-white/25 backdrop-blur-xs"
                  : !isPlain
                  ? "bg-emerald-50 text-emerald-600 border-emerald-200/80"
                  : "bg-emerald-50 text-emerald-600 border-emerald-200/80"
              )}
            >
              <Icon size={20} className="shrink-0" strokeWidth={2.2} />
            </div>
          )}
          <div className="min-w-0 flex-1">
            <h1 
              className={cn(
                "text-base md:text-lg font-black tracking-tight leading-tight truncate",
                headerStyle === 'primary' ? "text-white" : "text-slate-900"
              )}
            >
              {title}
            </h1>
            {description && (
              <p 
                className={cn(
                  "text-xs font-medium mt-0.5 line-clamp-2 md:line-clamp-none leading-relaxed",
                  headerStyle === 'primary' ? "text-emerald-100/90" : "text-slate-500"
                )}
              >
                {description}
              </p>
            )}
          </div>
        </div>

        {/* Actions or Tabs */}
        {(mappedTabs.length > 0 || actions || children) && (
          <div className="overflow-x-auto w-full md:w-auto scrollbar-none relative z-10 shrink-0">
            <div 
              role={mappedTabs.length > 0 ? "tablist" : undefined}
              aria-label={title || "Navigasi Sub-Tab"}
              className="flex items-center gap-2 w-max md:w-auto shrink-0"
            >
              {mappedTabs.map((tab) => {
                const isActive = tab.isActive;
                const isPrimaryHeader = headerStyle === 'primary';
                
                return (
                  <button
                    key={tab.id || tab.label}
                    type="button"
                    role="tab"
                    aria-selected={isActive}
                    onClick={tab.onClick}
                    className={cn(
                      "shrink-0 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer border flex items-center gap-1.5 shadow-2xs",
                      isActive
                        ? isPrimaryHeader
                          ? "bg-white text-emerald-900 border-white shadow-xs font-extrabold"
                          : "bg-emerald-600 text-white border-emerald-600 font-extrabold shadow-xs"
                        : isPrimaryHeader
                        ? "bg-white/10 text-white hover:bg-white/20 border-white/15"
                        : "bg-white text-slate-600 hover:text-slate-900 border-slate-200/80 hover:bg-slate-50"
                    )}
                  >
                    {tab.icon && (
                      <tab.icon 
                        size={14} 
                        className={cn("shrink-0", isActive && isPrimaryHeader ? "text-emerald-800" : "")} 
                      />
                    )}
                    <span>{tab.label}</span>
                  </button>
                );
              })}

              {actions}
              {children}

              {onGuideClick && (
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={onGuideClick}
                  title={guideText || "Panduan"}
                  className={cn(
                    "shrink-0 rounded-xl w-9 h-9 flex items-center justify-center transition-colors border",
                    headerStyle === 'primary'
                      ? "text-white/80 hover:text-white hover:bg-white/15 border-white/20"
                      : "text-slate-500 hover:text-slate-900 hover:bg-slate-100 border-slate-200/80"
                  )}
                >
                  <HelpCircle size={15} />
                </Button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
