import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '@/lib/utils';


export const UISelect = ({ value, onChange, children, className = "", required, disabled, placeholder = "Pilih...", prefix = "" }) => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const containerRef = useRef(null);
  const options = [];

  const parseChildren = (childList, currentGroup = null) => {
    React.Children.forEach(childList, child => {
      if (!React.isValidElement(child)) return;
      if (child.type === 'option') {
        options.push({
          value: child.props.value !== undefined ? child.props.value : child.props.children,
          label: child.props.children,
          disabled: child.props.disabled,
          group: currentGroup
        });
      } else if (child.type === 'optgroup') {
        parseChildren(child.props.children, child.props.label || 'Kategori');
      }
    });
  };

  parseChildren(children);

  const filteredOptions = options.filter(opt => {
    if (value !== undefined && String(opt.value) === String(value)) {
      return true;
    }
    const label = opt.label ? String(opt.label).toLowerCase() : "";
    const group = opt.group ? String(opt.group).toLowerCase() : "";
    return label.includes(search.toLowerCase()) || group.includes(search.toLowerCase());
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
        width: Math.max(rect.width, 220),
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
    <div className={cn("relative w-full font-inherit", wrapperClass)} ref={containerRef}>
      <button
        type="button"
        disabled={disabled}
        onClick={handleOpen}
        data-slot="select-trigger"
        className={cn("w-full h-9 bg-white border border-slate-200/90 pl-3 pr-2 rounded-[var(--ui-radius-control)] text-xs font-bold text-slate-800 transition-all cursor-pointer flex items-center justify-between focus:outline-none focus:ring-2 focus:ring-[var(--ui-primary)]/20 focus:border-[var(--ui-primary)] shadow-2xs hover:border-slate-300",
          disabled && "cursor-not-allowed opacity-50 bg-slate-100",
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
          className="ui-select-portal fixed bg-white border border-slate-200/90 rounded-[var(--ui-radius-control)] shadow-sm p-1.5 min-w-[200px] z-[99999] animate-in fade-in zoom-in-95 duration-150 font-inherit"
          style={dropdownStyle}
        >
          {options.length > 5 && (
            <div className="uiselect-search-container sticky top-0 z-10 bg-white pb-1.5 pt-0.5 px-0.5">
              <input
                type="text"
                placeholder="Cari kata kunci…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-[var(--ui-radius-small)] text-xs font-semibold focus:outline-none focus:bg-white focus:ring-2 focus:ring-[var(--ui-primary)]/20 focus:border-[var(--ui-primary)]"
                onClick={(e) => e.stopPropagation()}
                onKeyDown={(e) => {
                  if (e.key === ' ' || e.key === 'Enter') {
                    e.stopPropagation();
                  }
                }}
              />
            </div>
          )}
          <div className="max-h-60 overflow-y-auto space-y-0.5">
            {filteredOptions.map((opt, idx) => {
              const showGroupHeader = opt.group && (idx === 0 || filteredOptions[idx - 1]?.group !== opt.group);
              const isSelected = String(opt.value) === String(value);

              return (
                <React.Fragment key={idx}>
                  {showGroupHeader && (
                    <div className="px-2 pt-2 pb-1 text-[10px] font-black uppercase tracking-wider text-slate-400 bg-slate-50/80 rounded-[var(--ui-radius-small)] mt-1">
                      {opt.group}
                    </div>
                  )}
                  <div
                    onClick={() => {
                      if (opt.disabled) return;
                      if (onChange) onChange({ target: { value: opt.value } });
                      setOpen(false);
                      setSearch("");
                    }}
                    className={cn(
                      "px-2.5 py-2 text-xs font-semibold rounded-[var(--ui-radius-small)] cursor-pointer transition-all flex items-center justify-between text-slate-700 hover:bg-[var(--ui-primary)]/10 hover:text-[var(--ui-primary)]",
                      opt.disabled && "cursor-not-allowed opacity-50 hover:bg-transparent hover:text-slate-400",
                      isSelected && "bg-[var(--ui-primary)]/15 text-[var(--ui-primary)] font-black"
                    )}
                  >
                    <span className="truncate">{opt.label}</span>
                    {isSelected && <Check size={14} className="text-[var(--ui-primary)] shrink-0 ml-2 stroke-[2.5]" />}
                  </div>
                </React.Fragment>
              );
            })}
            {filteredOptions.length === 0 && (
              <div className="text-center py-3 text-xs font-bold text-slate-400">
                Tidak ada opsi cocok
              </div>
            )}
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

// Modal — wraps shadcn Dialog / Responsive Bottom Sheet on mobile
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
    <div className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/60 backdrop-blur-xs transition-opacity animate-in fade-in duration-200">
      <div className="absolute inset-0" onClick={onClose} />
      <div 
        data-slot="dialog-content" 
        className={cn(
          "bg-white w-full rounded-t-3xl sm:rounded-[var(--ui-radius-card)] shadow-2xl sm:shadow-xs overflow-hidden flex flex-col relative z-10 border-t sm:border border-slate-100/80 animate-in slide-in-from-bottom-6 sm:slide-in-from-bottom-0 sm:zoom-in-95 duration-250", 
          maxWidth,
          scrollable ? "max-h-[92vh] sm:max-h-[85vh]" : ""
        )}
      >
        {/* Mobile Top Drag Handle */}
        <div className="w-full flex justify-center pt-2.5 pb-1 sm:hidden shrink-0">
          <div className="w-12 h-1.5 rounded-full bg-slate-300/80" />
        </div>

        {title ? (
          <div className="flex items-center justify-between gap-3 px-5 py-3.5 sm:py-4 border-b border-slate-100 shrink-0">
            <h3 className="text-sm font-bold text-slate-800 tracking-tight min-w-0 truncate">
              {title}
            </h3>
            <button
              type="button"
              onClick={onClose}
              className="inline-flex items-center justify-center rounded-[var(--ui-radius-small)] p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition-colors border-none bg-transparent cursor-pointer shrink-0"
            >
              <X size={16} strokeWidth={2.5} />
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={onClose}
            className="absolute right-4 top-3 sm:top-4 z-50 inline-flex items-center justify-center rounded-[var(--ui-radius-small)] p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition-colors border-none bg-transparent cursor-pointer shrink-0"
          >
            <X size={16} strokeWidth={2.5} />
          </button>
        )}
        <div className={cn("p-4 sm:p-5 flex-1 min-h-0 pb-[calc(16px+env(safe-area-inset-bottom))] sm:pb-5", scrollable ? "overflow-y-auto custom-scrollbar" : "")}>
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
        className={className || cn("h-9.5 w-full min-w-0 rounded-[var(--ui-radius-small)] border border-transparent bg-slate-100/80 py-1.5 text-xs transition-all outline-none","placeholder:text-muted-foreground/60 focus-visible:bg-white focus-visible:border-primary/40 focus-visible:ring-2 focus-visible:ring-primary/10","font-bold",
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
        <UISelect 
          value={itemsPerPage} 
          onChange={(e) => onItemsPerPageChange(Number(e.target.value))}
          className="text-xs border border-slate-200 rounded p-1 text-slate-600 bg-white cursor-pointer font-bold outline-none focus:ring-1 focus:ring-primary min-w-[100px]"
        >
          <option value={20}>20 baris</option>
          <option value={50}>50 baris</option>
          <option value={100}>100 baris</option>
        </UISelect>
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

export const UITimeInput24 = ({
  value = "",
  onChange,
  className = "",
  placeholder = "00:00",
  disabled = false,
  required = false
}) => {
  const [open, setOpen] = useState(false);
  const [inputValue, setInputValue] = useState(value || "");
  const containerRef = useRef(null);
  const dropdownRef = useRef(null);

  useEffect(() => {
    setInputValue(value || "");
  }, [value]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (
        containerRef.current && !containerRef.current.contains(e.target) &&
        dropdownRef.current && !dropdownRef.current.contains(e.target)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const emitChange = (val) => {
    setInputValue(val);
    if (onChange) {
      onChange({ target: { value: val } });
    }
  };

  const handleInputChange = (e) => {
    let raw = e.target.value.replace(/[^0-9:]/g, "");
    if (raw.length === 2 && !raw.includes(":") && inputValue.length < raw.length) {
      raw = raw + ":";
    }
    if (raw.length > 5) raw = raw.slice(0, 5);
    setInputValue(raw);
    if (onChange) {
      onChange({ target: { value: raw } });
    }
  };

  const handleBlur = () => {
    if (!inputValue) return;
    const parts = inputValue.split(":");
    let h = parseInt(parts[0] || "0", 10);
    let m = parseInt(parts[1] || "0", 10);
    if (isNaN(h) || h < 0) h = 0;
    if (h > 23) h = 23;
    if (isNaN(m) || m < 0) m = 0;
    if (m > 59) m = 59;
    const formatted = `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
    emitChange(formatted);
  };

  const selectHour = (h) => {
    const parts = (inputValue || "00:00").split(":");
    const m = parts[1] || "00";
    const formatted = `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
    emitChange(formatted);
  };

  const selectMinute = (m) => {
    const parts = (inputValue || "00:00").split(":");
    const h = parts[0] || "00";
    const formatted = `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
    emitChange(formatted);
    setOpen(false);
  };

  const [dropdownPos, setDropdownPos] = useState({});

  const handleFocus = () => {
    if (disabled) return;
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      setDropdownPos({
        top: rect.bottom + window.scrollY + 4,
        left: rect.left + window.scrollX,
        width: 220
      });
    }
    setOpen(true);
  };

  const currentHour = parseInt((inputValue || "00:00").split(":")[0] || "0", 10);
  const currentMinute = parseInt((inputValue || "00:00").split(":")[1] || "0", 10);

  const hours = Array.from({ length: 24 }, (_, i) => i);
  const minutes = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55];

  return (
    <div ref={containerRef} className="relative inline-block w-full">
      <div className="relative flex items-center">
        <input
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          onBlur={handleBlur}
          onFocus={handleFocus}
          placeholder={placeholder}
          disabled={disabled}
          required={required}
          maxLength={5}
          className={cn(
            "w-full border border-slate-200 bg-white rounded-[var(--ui-radius-small)] px-3 py-2 text-xs font-bold focus:border-[var(--ui-primary)] focus:ring-1 focus:ring-[var(--ui-primary)] outline-none tracking-wider text-slate-800",
            className
          )}
        />
        <Clock
          size={14}
          className="absolute right-2.5 text-slate-400 pointer-events-none"
        />
      </div>

      {open && createPortal(
        <div
          ref={dropdownRef}
          style={{
            position: 'absolute',
            top: `${dropdownPos.top}px`,
            left: `${dropdownPos.left}px`,
            width: `${dropdownPos.width}px`,
            zIndex: 99999
          }}
          className="bg-white border border-slate-200 rounded-[var(--ui-radius-small)] shadow-sm p-2 animate-in fade-in-50 zoom-in-95"
        >
          <div className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1 px-1 flex justify-between">
            <span>Pilih Jam (24H)</span>
            <span>Menit</span>
          </div>
          <div className="grid grid-cols-2 gap-1 h-44">
            {/* Hours column 00 - 23 */}
            <div className="overflow-y-auto pr-1 custom-scrollbar space-y-0.5 border-r border-slate-100">
              {hours.map(h => {
                const formattedH = String(h).padStart(2, "0");
                const isSelected = currentHour === h;
                return (
                  <button
                    key={h}
                    type="button"
                    onClick={() => selectHour(h)}
                    className={cn(
                      "w-full text-center py-1 text-xs font-bold rounded cursor-pointer transition-colors",
                      isSelected
                        ? "bg-[var(--ui-primary)] text-white"
                        : "text-slate-700 hover:bg-slate-100"
                    )}
                  >
                    {formattedH}:00
                  </button>
                );
              })}
            </div>
            {/* Minutes column */}
            <div className="overflow-y-auto pl-1 custom-scrollbar space-y-0.5">
              {minutes.map(m => {
                const formattedM = String(m).padStart(2, "0");
                const isSelected = Math.abs(currentMinute - m) < 3;
                return (
                  <button
                    key={m}
                    type="button"
                    onClick={() => selectMinute(m)}
                    className={cn(
                      "w-full text-center py-1 text-xs font-bold rounded cursor-pointer transition-colors",
                      isSelected
                        ? "bg-[var(--ui-primary)] text-white"
                        : "text-slate-700 hover:bg-slate-100"
                    )}
                  >
                    :{formattedM}
                  </button>
                );
              })}
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};
