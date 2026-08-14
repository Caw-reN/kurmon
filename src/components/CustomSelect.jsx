import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';


export function CustomSelect({ 
  value, 
  onChange, 
  options = [], 
  placeholder = "Pilih...", 
  className = "",
  searchable = true,
  disabled = false,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const dropdownRef = useRef(null);
  const inputRef = useRef(null);
  const [dropdownStyle, setDropdownStyle] = useState({});

  const handleOpen = () => {
    if (disabled) return;
    if (isOpen) {
      setIsOpen(false);
      setSearchTerm("");
      return;
    }
    if (dropdownRef.current) {
      const rect = dropdownRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      const spaceAbove = rect.top;
      const menuHeight = Math.min(260, options.length * 44 + (searchable ? 52 : 0));
      const showAbove = spaceBelow < menuHeight && spaceAbove > spaceBelow;
      setDropdownStyle({
        top: showAbove ? rect.top - menuHeight - 6 : rect.bottom + 6,
        left: rect.left,
        width: rect.width,
      });
    }
    setIsOpen(true);
    setSearchTerm("");
  };

  useEffect(() => {
    function handleClickOutside(event) {
      if (
        dropdownRef.current && 
        !dropdownRef.current.contains(event.target) &&
        !event.target.closest('.custom-select-portal')
      ) {
        setIsOpen(false);
        setSearchTerm("");
      }
    }
    function handleScroll(e) {
      if (isOpen && !e.target.closest('.custom-select-portal')) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    window.addEventListener("scroll", handleScroll, true);
    window.addEventListener("resize", handleScroll);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      window.removeEventListener("scroll", handleScroll, true);
      window.removeEventListener("resize", handleScroll);
    };
  }, [isOpen]);

  useEffect(() => {
    function handleKeyDown(event) {
      if (event.key === "Escape") {
        setIsOpen(false);
        setSearchTerm("");
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  useEffect(() => {
    if (isOpen && searchable && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen, searchable]);

  const selectedOption = (options || []).find(opt => opt && opt.value === value) || null;
  const displayLabel = selectedOption?.label ?? placeholder;
  const hasValue = selectedOption !== null;

  const filteredOptions = searchable 
    ? (options || []).filter(opt => opt && String(opt.label ?? opt.value ?? "").toLowerCase().includes(String(searchTerm || "").toLowerCase()))
    : (options || []);

  return (
    <div className={`relative min-w-0 ${className}`} ref={dropdownRef}>
      {/* Trigger Button */}
      <button
        data-slot="select-trigger"
        type="button"
        onClick={handleOpen}
        disabled={disabled}
        className={`
          flex h-9 w-full items-center justify-between gap-2
          px-3 text-xs font-bold whitespace-nowrap
          bg-white border border-[var(--ui-border-soft)]
          rounded-[var(--ui-radius-control)]
          shadow-[var(--ui-shadow-control)]
          transition-all
          focus:outline-none focus:border-[var(--ui-primary)] focus:shadow-[var(--ui-focus-ring)]
          disabled:opacity-50 disabled:cursor-not-allowed
          ${isOpen ? 'border-[var(--ui-primary)] shadow-[var(--ui-focus-ring)]' : 'hover:border-slate-300'}
        `}
      >
        <span className={`truncate ${hasValue ? 'text-slate-800' : 'text-slate-400'}`}>
          {displayLabel}
        </span>
        <ChevronDown 
          size={14} 
          strokeWidth={2.5}
          className={`text-slate-400 shrink-0 transition-transform duration-200 ${isOpen ? 'rotate-180 text-[var(--ui-primary)]' : ''}`} 
        />
      </button>
      
      {/* Dropdown Portal */}
      {isOpen && createPortal(
        <div 
          className="custom-select-portal fixed z-[99999] flex flex-col bg-white border border-[var(--ui-border-muted,#e8edf5)] rounded-[var(--ui-radius-small)] overflow-hidden"
          style={{ 
            ...dropdownStyle,
            maxHeight: '260px',
            boxShadow: 'var(--ui-shadow-popover, 0 24px 60px rgba(15,23,42,0.14), 0 0 0 1px rgba(255,255,255,0.5) inset)',
            animation: 'cs-fade-in 0.15s ease-out',
          }}
        >
          <style>{`
            @keyframes cs-fade-in {
              from { opacity: 0; transform: translateY(-6px) scale(0.98); }
              to   { opacity: 1; transform: translateY(0) scale(1); }
            }
            .custom-select-portal .cs-opt:hover {
              background-color: var(--ui-surface-muted, #f5f8fb);
              color: #1e293b;
            }
          `}</style>

          {searchable && (
            <div className="px-2 pt-2 pb-1.5 border-b border-[var(--ui-border-muted,#e8edf5)] shrink-0">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" size={12} />
                <input 
                  ref={inputRef}
                  type="text" 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Ketik untuk mencari..."
                  className="w-full pl-7 pr-3 py-1.5 bg-[var(--ui-surface-muted,#f5f8fb)] border border-[var(--ui-border-muted,#e8edf5)] rounded-[var(--ui-radius-small)] text-xs font-semibold text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-[var(--ui-primary)]"
                  onClick={e => e.stopPropagation()}
                />
              </div>
            </div>
          )}

          <div className="overflow-y-auto" style={{ scrollbarWidth: 'thin' }}>
            {filteredOptions.length === 0 ? (
              <div className="px-4 py-5 text-xs font-semibold text-slate-400 text-center">
                Tidak ada pilihan ditemukan
              </div>
            ) : (
              filteredOptions.map((opt) => {
                const isSelected = opt.value === value;
                return (
                  <button
                    key={opt.value ?? opt.label}
                    type="button"
                    onClick={() => {
                      onChange(opt.value);
                      setIsOpen(false);
                      setSearchTerm("");
                    }}
                    className={`cs-opt w-full text-left flex items-center justify-between gap-2 px-3.5 py-2.5 text-xs font-semibold border-none transition-colors cursor-pointer ${
                      isSelected 
                        ? 'bg-[color-mix(in_srgb,var(--ui-primary,#064e3b)_10%,transparent)] text-[var(--ui-primary,#064e3b)] font-black' 
                        : 'text-slate-600'
                    }`}
                  >
                    <span className="truncate">{opt.label}</span>
                    {isSelected && (
                      <Check size={13} className="shrink-0 text-[var(--ui-primary,#064e3b)]" strokeWidth={3} />
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
