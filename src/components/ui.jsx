import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '@/lib/utils';
import { ChevronDown, Check, X, ChevronRight } from 'lucide-react';


export const UISelect = ({ value, onChange, children, className ="", required, disabled, placeholder ="Pilih...", prefix ="" }) => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const containerRef = useRef(null);
  const options = [];

  React.Children.forEach(children, child => {
    if (React.isValidElement(child) && child.type ==='option') {
      options.push({
        value: child.props.value !== undefined ? child.props.value : child.props.children,
        label: child.props.children,
        disabled: child.props.disabled,
      });
    }
  });

  const sortedOptions = React.useMemo(() => {
    return [...options].sort((a, b) => {
      const aLabel = a.label ? String(a.label) :"";
      const bLabel = b.label ? String(b.label) :"";

      const aIsPlaceholder = a.value ==="" || aLabel.startsWith("--") || aLabel.toLowerCase().includes("pilih");
      const bIsPlaceholder = b.value ==="" || bLabel.startsWith("--") || bLabel.toLowerCase().includes("pilih");

      if (aIsPlaceholder && !bIsPlaceholder) return -1;
      if (!aIsPlaceholder && bIsPlaceholder) return 1;

      return aLabel.localeCompare(bLabel,'id', { sensitivity:'base' });
    });
  }, [options]);

  const filteredOptions = sortedOptions.filter(opt => {
    if (value !== undefined && String(opt.value) === String(value)) {
      return true;
    }
    const label = opt.label ? String(opt.label).toLowerCase() :"";
    return label.includes(search.toLowerCase());
  });

  const activeOption = options.find(opt => String(opt.value) === String(value));
  const displayLabel = activeOption ? activeOption.label : placeholder;

  const [dropdownStyle, setDropdownStyle] = useState({});

  const handleOpen = () => {
    if (open) {
      setOpen(false);
      setSearch("");
      return;
    }
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      setDropdownStyle({
        top: rect.bottom + 4,
        left: rect.left,
        width: rect.width,
      });
    }
    setOpen(true);
    setSearch("");
  };

  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (event) => {
      if (
        containerRef.current && 
        !containerRef.current.contains(event.target) &&
        !event.target.closest('.ui-select-portal')
      ) {
        setOpen(false);
        setSearch("");
      }
    };
    
    const handleScroll = (e) => {
      if (open && !e.target.closest('.ui-select-portal')) {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    window.addEventListener("scroll", handleScroll, true);
    window.addEventListener("resize", handleScroll);
    
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      window.removeEventListener("scroll", handleScroll, true);
      window.removeEventListener("resize", handleScroll);
    };
  }, [open]);

  const splitClassName = (cls) => {
    if (!cls) return { wrapperClass: "", buttonClass: "" };
    const tokens = String(cls).split(/\s+/);
    const layoutKeywords = [
      'w-', 'min-w-', 'max-w-', 'flex-', 'grid-', 'col-', 'row-',
      'absolute', 'relative', 'fixed', 'top-', 'left-', 'right-', 'bottom-',
      'z-', 'm-', 'my-', 'mx-', 'mt-', 'mb-', 'ml-', 'mr-',
      'shrink', 'grow', 'order', 'self-', 'justify-', 'items-', 'align-'
    ];
    const wrapperTokens = [];
    const buttonTokens = [];
    tokens.forEach(token => {
      const isLayout = layoutKeywords.some(keyword => token.startsWith(keyword));
      if (isLayout) {
        wrapperTokens.push(token);
      } else {
        buttonTokens.push(token);
      }
    });
    return {
      wrapperClass: wrapperTokens.join(" "),
      buttonClass: buttonTokens.join(" ")
    };
  };

  const { wrapperClass, buttonClass } = splitClassName(className);

  return (
    <div className={cn("relative w-full", wrapperClass)} ref={containerRef}>
      <button
        type="button"
        disabled={disabled}
        onClick={handleOpen}
        data-slot="select-trigger"
        className={cn("w-full h-9 bg-white border border-slate-200 pl-3 pr-2 rounded-[var(--ui-radius-small)] text-xs font-bold text-slate-800 transition-all cursor-pointer flex items-center justify-between focus:outline-none focus:ring-1 focus:ring-[var(--ui-primary)] focus:border-[var(--ui-primary)]",
          disabled && "cursor-not-allowed opacity-50",
          buttonClass
        )}
      >
        <span className="flex-1 text-left truncate mr-2">
          {prefix}{displayLabel}
        </span>
        <div 
          className="flex items-center justify-center shrink-0 transition-transform duration-200 text-slate-400" 
          style={{ 
            transform: open ? 'rotate(180deg)' : 'rotate(0)' 
          }}
        >
          <ChevronDown size={14} className="stroke-[2.5]" />
        </div>
      </button>

      {open && createPortal(
        <div 
          className="ui-select-portal fixed bg-white border border-slate-150 rounded-xl shadow-lg p-1 min-w-[200px] z-[99999]"
          style={dropdownStyle}
        >
          {options.length > 5 && (
            <div className="uiselect-search-container sticky top-0 z-10">
              <input
                type="text"
                placeholder="Cari..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="uiselect-search-input"
                onClick={(e) => e.stopPropagation()}
                onKeyDown={(e) => {
                  if (e.key ==='' || e.key ==='Enter') {
                    e.stopPropagation();
                  }
                }}
              />
            </div>
          )}
          <div className="max-h-60 overflow-y-auto">
            {filteredOptions.map((opt, idx) => (
              <div
                key={idx}
                onClick={() => {
                  if (opt.disabled) return;
                  if (onChange) onChange({ target: { value: opt.value } });
                  setOpen(false);
                  setSearch("");
                }}
                className={cn("hover:bg-slate-50 text-slate-700 font-semibold rounded-md cursor-pointer transition-colors p-2 text-xs flex items-center justify-between",
                  opt.disabled &&"cursor-not-allowed opacity-50 hover:bg-transparent",
                  String(opt.value) === String(value) &&"bg-slate-100 text-slate-900 font-bold"
                )}
              >
                <span>{opt.label}</span>
                {String(opt.value) === String(value) && <Check size={12} className="text-primary shrink-0 ml-2" />}
              </div>
            ))}
            {filteredOptions.length === 0 && (
              <div className="text-center py-3 text-xs font-bold text-slate-400">
                Tidak ada hasil
              </div>
            )}
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

// Modal — wraps shadcn Dialog
export const Modal = ({ isOpen, onClose, title, children, maxWidth = "max-w-xl", scrollable = true }) => {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs transition-opacity animate-in fade-in duration-200">
      <div className="absolute inset-0" onClick={onClose} />
      <div data-slot="dialog-content" className={cn(
        "bg-white w-full rounded-[var(--ui-radius-card)] shadow-2xl overflow-hidden flex flex-col relative z-10 border border-slate-100 animate-in zoom-in-95 duration-200", 
        maxWidth,
        scrollable ? "max-h-[85vh]" : ""
      )}>
        {title ? (
          <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-slate-100 shrink-0">
            <h3 className="text-sm font-bold text-slate-800 tracking-tight min-w-0 truncate">
              {title}
            </h3>
            <button
              type="button"
              onClick={onClose}
              className="inline-flex items-center justify-center rounded-[var(--ui-radius-small)] p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition-colors border-none bg-transparent cursor-pointer shrink-0"
            >
              <X size={15} strokeWidth={2.5} />
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={onClose}
            className="absolute right-4 top-4 z-50 inline-flex items-center justify-center rounded-[var(--ui-radius-small)] p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition-colors border-none bg-transparent cursor-pointer shrink-0"
          >
            <X size={15} strokeWidth={2.5} />
          </button>
        )}
        <div className={cn("p-5 flex-1 min-h-0", scrollable ? "overflow-y-auto" : "")}>
          {children}
        </div>
      </div>
    </div>,
    document.body
  );
};

export const Button = ({ children, variant = "primary", size = "default", className = "", ...props }) => {
  const variantStyles = {
    primary: 'bg-[var(--ui-primary-btn,var(--ui-primary))] text-white hover:brightness-105 active:scale-95 btn-primary-theme',
    default: 'bg-[var(--ui-primary-btn,var(--ui-primary))] text-white hover:brightness-105 active:scale-95 btn-primary-theme',
    outline: 'border border-slate-200 bg-transparent text-slate-700 hover:bg-slate-50',
    secondary: 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200',
    accent: 'bg-[var(--ui-accent)] text-white hover:brightness-105 active:scale-95 btn-primary-theme',
    danger: 'bg-rose-500 text-white hover:bg-rose-600 active:scale-95',
    destructive: 'bg-rose-500 text-white hover:bg-rose-600 active:scale-95',
    ghost: 'bg-transparent hover:bg-slate-100/80 text-slate-650',
  };

  const sizeStyles = {
    default: 'h-10 px-4 py-2 text-sm font-bold rounded-[var(--ui-radius-small,12px)] gap-1.5',
    sm: 'h-8 px-3 py-1.5 text-xs font-bold rounded-[var(--ui-radius-small,10px)] gap-1.5',
    xs: 'h-6 px-2 py-1 text-[10px] font-bold rounded-[var(--ui-radius-small,8px)] gap-1',
    lg: 'h-11 px-5 py-2.5 text-base font-extrabold rounded-[var(--ui-radius-small,14px)] gap-2',
    icon: 'w-10 h-10 p-2 flex-shrink-0 rounded-[var(--ui-radius-small,12px)] flex items-center justify-center',
  };

  const baseStyles = 'inline-flex items-center justify-center transition-all duration-200 outline-none select-none disabled:pointer-events-none disabled:opacity-50 whitespace-nowrap cursor-pointer';

  const variantClass = variantStyles[variant] || variantStyles.primary;
  const sizeClass = sizeStyles[size] || sizeStyles.default;

  return (
    <button
      data-slot="button"
      data-variant={variant}
      className={cn(baseStyles, variantClass, sizeClass, "print:hidden", className)}
      {...props}
    >
      {children}
    </button>
  );
};

// SidebarNavItem
export const SidebarNavItem = ({ id, icon, label, badge, isActive, onClick, collapsed, isSubMenu }) => {
  const getIconColorClass = (navId) => {
    if (isActive) return isSubMenu ?"text-slate-700" :"text-primary";
    return"text-slate-400 group-hover:text-primary transition-colors";
  };

  if (isSubMenu) {
    return (
      <button
        onClick={() => onClick(id)}
        type="button"
        title={collapsed ? label : undefined}
        className={cn("group relative mb-0.5 flex w-full items-center border-none text-left transition-all cursor-pointer overflow-hidden justify-between","px-3 py-1.5 text-[11px] font-semibold",
          isActive
            ?"text-slate-800 bg-accent/15 border border-accent/25 font-bold"
            :"bg-transparent text-slate-650 hover:text-slate-900 hover:bg-slate-50/40"
        )}
        style={{ borderRadius:"var(--radius, 8px)" }}
      >
        <div className="flex items-center min-w-0 gap-2">
          <div className={cn("flex items-center justify-center shrink-0 w-4 h-4 transition-all",
            getIconColorClass(id)
          )}>
            {React.createElement(icon, { size: 12.5, strokeWidth: 2.5 })}
          </div>
          <span className="truncate">{label}</span>
        </div>
        
        <div className="flex items-center gap-1 shrink-0 ml-auto">
          {!collapsed && badge && (
            <span className="rounded-full bg-primary px-2 py-0.5 text-[9px] font-bold text-primary-foreground">
              {badge}
            </span>
          )}
          {isActive && <ChevronRight size={10} className="text-slate-700 shrink-0" />}
        </div>
      </button>
    );
  }

  return (
    <button
      onClick={() => onClick(id)}
      type="button"
      title={collapsed ? label : undefined}
      className={cn("group relative mb-1.5 flex w-full items-center border-none text-left transition-all cursor-pointer overflow-hidden",
        collapsed ?"justify-center px-0 py-0 min-h-[34px]" :"justify-between px-3.5 py-2","font-semibold text-xs",
        isActive
          ?"bg-primary/10 text-primary shadow-xs font-bold"
          :"bg-transparent text-slate-650 hover:bg-slate-100 hover:text-slate-900"
      )}
      style={{ borderRadius:"var(--radius, 8px)" }}
    >
      <div className={cn("flex items-center min-w-0", collapsed ?"justify-center" :"gap-2.5")}>
        <div className={cn("flex items-center justify-center shrink-0 w-6 h-6 transition-all",
          isActive ?"text-primary" :"text-slate-400 group-hover:text-primary"
        )}>
          {React.createElement(icon, { size: 16, strokeWidth: isActive ? 2.5 : 2 })}
        </div>
        {!collapsed && <span className="truncate text-xs font-bold">{label}</span>}
      </div>
      {!collapsed && badge && (
        <span className="ml-3 shrink-0 rounded-full bg-primary px-2 py-0.5 text-[9px] font-bold text-primary-foreground">
          {badge}
        </span>
      )}
    </button>
  );
};

// DebouncedSearchInput
export const DebouncedSearchInput = ({ value, onChange, placeholder, className, icon: IconComponent }) => {
  const [localValue, setLocalValue] = useState(value ||'');

  useEffect(() => {
    setLocalValue(value ||'');
  }, [value]);

  useEffect(() => {
    const timer = setTimeout(() => { onChange(localValue); }, 300);
    return () => clearTimeout(timer);
  }, [localValue, onChange]);

  return (
    <div className="relative flex-1">
      {IconComponent && <IconComponent size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />}
      <input
        type="text"
        placeholder={placeholder}
        value={localValue}
        onChange={(e) => setLocalValue(e.target.value)}
        className={className || cn("h-9.5 w-full min-w-0 rounded-xl border border-transparent bg-slate-100/80 py-1.5 text-xs transition-all outline-none","placeholder:text-muted-foreground/60 focus-visible:bg-white focus-visible:border-primary/40 focus-visible:ring-2 focus-visible:ring-primary/10","font-bold",
          IconComponent ?"pl-9 pr-3.5" :"px-3.5"
        )}
      />
    </div>
  );
};

export const TablePagination = ({ 
  currentPage, 
  totalPages, 
  totalItems, 
  itemsPerPage, 
  onPageChange, 
  onItemsPerPageChange,
  isLoading 
}) => {
  if (isLoading || totalItems === 0) return null;

  return (
    <div className="px-5 py-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-4 bg-slate-50 rounded-b-[var(--ui-radius-card)]">
      <div className="flex items-center gap-3">
        <span className="text-xs text-slate-500 font-medium">
          Menampilkan {(currentPage - 1) * itemsPerPage + 1} - {Math.min(currentPage * itemsPerPage, totalItems)} dari {totalItems} data
        </span>
        <select 
          value={itemsPerPage} 
          onChange={(e) => onItemsPerPageChange(Number(e.target.value))}
          className="text-xs border border-slate-200 rounded p-1 text-slate-600 bg-white cursor-pointer font-bold outline-none focus:ring-1 focus:ring-primary"
        >
          <option value={20}>20 baris</option>
          <option value={50}>50 baris</option>
          <option value={100}>100 baris</option>
        </select>
      </div>
      {totalPages > 1 && (
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => onPageChange(Math.max(1, currentPage - 1))} disabled={currentPage === 1}>
            Sebelumnya
          </Button>
          <span className="text-xs font-bold text-slate-600 px-2">{currentPage} / {totalPages}</span>
          <Button variant="outline" size="sm" onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))} disabled={currentPage === totalPages}>
            Selanjutnya
          </Button>
        </div>
      )}
    </div>
  );
};
