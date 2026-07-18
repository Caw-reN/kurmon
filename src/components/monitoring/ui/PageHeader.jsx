import { cn } from'@/lib/utils';
import { HelpCircle } from'lucide-react';
import { Button } from'./index.js';


export default function PageHeader({
  icon: Icon,
  title,
  description,
  tabs = [],
  activeTab,
  onTabChange,
  onGuideClick,
  guideText ="Panduan",
  variant ="default",
  children
}) {
  const mappedTabs = tabs.map(tab => ({
    ...tab,
    isActive: tab.isActive !== undefined ? tab.isActive : tab.id === activeTab,
    onClick: tab.onClick || (onTabChange ? () => onTabChange(tab.id) : undefined)
  }));

  const isPlain = variant ==="plain";

  return (
    <div className={cn("relative z-20 flex flex-col gap-2.5 pb-3",
      isPlain ? '-mb-2' : ''
    )}>

      <div
        className={cn("flex flex-col md:flex-row items-start md:items-center justify-between gap-3 relative overflow-hidden rounded-xl w-full",
          !isPlain ? 'p-3.5 border-none bg-primary text-white shadow-md' : 'p-0'
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
          <div>
            <h1 className={cn("text-base md:text-lg font-bold tracking-tight leading-tight",
              !isPlain ?"text-white font-black" :"text-foreground"
            )}>
              {title}
            </h1>
            {description && (
              <p className={cn("text-[10px] md:text-[11.5px] font-semibold mt-0.5",
                !isPlain ?"text-white/80" :"text-muted-foreground"
              )}>
                {description}
              </p>
            )}
          </div>
        </div>
 
        <div className="overflow-x-auto w-full md:w-auto scrollbar-none [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden relative z-10">
          <div className="flex flex-nowrap items-center gap-2 w-max md:w-auto">
            
            {mappedTabs.map((tab) => (
              <button
                key={tab.id || tab.label}
                onClick={tab.onClick}
                className={cn("flex-none flex items-center justify-center gap-1.5 px-3.5 py-2.5 md:px-4 md:py-2","text-xs font-bold rounded-xl transition-all active:translate-y-[1px] cursor-pointer border shrink-0",
                  tab.isActive
                    ? (!isPlain ?'bg-accent text-slate-950 border-accent shadow-md font-black' :'bg-primary text-white border-primary shadow-sm')
                    : (!isPlain ?'bg-white/10 hover:bg-white/20 text-white/90 border-white/10' :'bg-transparent hover:bg-muted text-muted-foreground border-border')
                )}
              >
                {tab.icon && <tab.icon size={14} className="shrink-0" />}
                <span>{tab.label}</span>
              </button>
            ))}
 
            {children}
 
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
      </div>
    </div>
  );
}
