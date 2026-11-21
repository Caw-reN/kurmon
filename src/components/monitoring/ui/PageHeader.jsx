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

      {/* Mobile Sub-Nav Tabs (Shown on Mobile screens when not plain and mappedTabs has more than 1 item) */}
      {!isPlain && mappedTabs.length > 1 && (
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
                      ? "text-white font-black shadow-xs border-transparent"
                      : "bg-white text-slate-700 hover:text-slate-900 border-slate-200/90"
                  )}
                  style={tab.isActive ? { backgroundColor: 'var(--ui-primary, #064e3b)' } : undefined}
                >
                  {TabIcon && <TabIcon size={14} className="shrink-0" />}
                  <span className="leading-tight text-[10.5px] font-extrabold text-center line-clamp-2 break-words">{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Desktop & Default Header Container - Clean Modern Card that follows website settings */}
      <div
        className={cn(
          !isPlain 
            ? 'hidden sm:flex flex-col md:flex-row items-start md:items-center justify-between gap-4 relative rounded-2xl w-full p-4 sm:p-5 border border-slate-200/80 bg-white text-slate-900 shadow-xs transition-all'
            : 'flex flex-col md:flex-row items-start md:items-center justify-between gap-3 relative rounded-lg w-full p-0'
        )}
      >
        <div className="flex items-center gap-3.5 relative z-10 w-full md:w-auto min-w-0">
          {Icon && (
            <div 
              className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0 border shadow-2xs transition-all"
              style={{
                backgroundColor: 'color-mix(in srgb, var(--ui-primary, #064e3b) 12%, transparent)',
                color: 'var(--ui-primary, #064e3b)',
                borderColor: 'color-mix(in srgb, var(--ui-primary, #064e3b) 25%, transparent)'
              }}
            >
              <Icon size={20} className="shrink-0" strokeWidth={2.2} />
            </div>
          )}
          <div className="min-w-0 flex-1">
            <h1 className="text-base md:text-lg font-black tracking-tight leading-tight truncate text-slate-900">
              {title}
            </h1>
            {description && (
              <p className="text-xs font-medium mt-0.5 line-clamp-2 md:line-clamp-none leading-relaxed text-slate-500">
                {description}
              </p>
            )}
          </div>
        </div>

        {/* Actions or Tabs */}
        {(mappedTabs.length > 1 || actions || children) && (
          <div className="overflow-x-auto w-full md:w-auto scrollbar-none relative z-10 shrink-0">
            <div 
              role={mappedTabs.length > 1 ? "tablist" : undefined}
              aria-label={title || "Navigasi Sub-Tab"}
              className="flex items-center gap-2 w-max md:w-auto shrink-0"
            >
              {mappedTabs.length > 1 && mappedTabs.map((tab) => {
                const isActive = tab.isActive;
                
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
                        ? "text-white font-extrabold shadow-xs border-transparent"
                        : "bg-white text-slate-600 hover:text-slate-900 border-slate-200/80 hover:bg-slate-50"
                    )}
                    style={isActive ? { backgroundColor: 'var(--ui-primary, #064e3b)' } : undefined}
                  >
                    {tab.icon && (
                      <tab.icon 
                        size={14} 
                        className={cn("shrink-0", isActive ? "text-white" : "text-slate-400")} 
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
                  className="shrink-0 rounded-xl w-9 h-9 flex items-center justify-center transition-colors border text-slate-500 hover:text-slate-900 hover:bg-slate-100 border-slate-200/80"
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
