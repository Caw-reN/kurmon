import { useState, useRef, useEffect } from'react';
import { createPortal } from'react-dom';
import { ChevronDown, Search } from'lucide-react';


export function CustomSelect({ 
  value, 
  onChange, 
  options = [], 
  placeholder ="Pilih...", 
  accentColor ="#a3e635", 
  primaryColor ="#064e3b", 
  className ="",
  searchable = true
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const dropdownRef = useRef(null);
  const inputRef = useRef(null);

  const [dropdownStyle, setDropdownStyle] = useState({});

  const handleOpen = () => {
    if (isOpen) {
      setIsOpen(false);
      setSearchTerm("");
      return;
    }
    if (dropdownRef.current) {
      const rect = dropdownRef.current.getBoundingClientRect();
      setDropdownStyle({
        top: rect.bottom + 6,
        left: rect.left,
        width: rect.width,
      });
    }
    setIsOpen(true);
    setSearchTerm("");
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      // Don't close if clicking inside the dropdown menu (handled by portal ref)
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

  // Handle keypress events (like Escape to close)
  useEffect(() => {
    function handleKeyDown(event) {
      if (event.key ==="Escape") {
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

  const selectedOption = options.find(opt => opt.value === value) || { label: placeholder, value };
  const filteredOptions = searchable 
    ? options.filter(opt => opt.label.toLowerCase().includes(searchTerm.toLowerCase()))
    : options;

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      <button
        data-slot="select-trigger"
        type="button"
        onClick={handleOpen}
        className="flex h-9 w-full items-center justify-between whitespace-nowrap bg-white pl-3 pr-2 text-xs font-bold rounded-[var(--ui-radius-small)] border border-slate-200 focus:outline-none focus:border-[var(--ui-primary)] focus:ring-1 focus:ring-[var(--ui-primary)] transition-all disabled:cursor-not-allowed disabled:opacity-50"
      >
        <span className="truncate mr-2 text-slate-700">{selectedOption.label}</span>
        <div 
          className="flex items-center justify-center shrink-0 transition-transform duration-200 text-slate-400" 
          style={{ 
            transform: isOpen ?'rotate(180deg)' :'rotate(0)' 
          }}
        >
          <ChevronDown size={14} className="stroke-[2.5]" />
        </div>
      </button>
      
      {isOpen && createPortal(
        <div 
          className="custom-select-portal fixed z-[99999] flex flex-col bg-white/95 backdrop-blur-md border border-slate-100 rounded-[var(--ui-radius-small)] shadow-xl animate-fade-in"
          style={{ 
            ...dropdownStyle,
            animation:'dropdown-fade-in 0.15s ease-out',
            maxHeight:'250px'
          }}
        >
          <style>{`
            @keyframes dropdown-fade-in {
              from { opacity: 0; transform: translateY(-4px); }
              to { opacity: 1; transform: translateY(0); }
            }`}</style>
          
          {searchable && (
            <div className="px-2 py-2 border-b border-slate-100 shrink-0">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" size={12} />
                <input 
                  ref={inputRef}
                  type="text" 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Ketik untuk mencari..."
                  className="w-full pl-7 pr-3 py-1.5 bg-slate-50 border-none rounded text-xs focus:outline-none focus:ring-1 focus:ring-slate-200 text-slate-700 font-medium"
                  onClick={e => e.stopPropagation()}
                />
              </div>
            </div>
          )}

          <div className="overflow-y-auto custom-scrollbar py-1" style={{ scrollbarWidth:'thin' }}>
            {filteredOptions.length === 0 ? (
              <div className="px-3 py-4 text-xs font-medium text-slate-400 text-center">
                Pencarian tidak ditemukan
              </div>
            ) : (
              filteredOptions.map((opt) => {
                const isSelected = opt.value === value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => {
                      onChange(opt.value);
                      setIsOpen(false);
                      setSearchTerm("");
                    }}
                    className="w-full text-left transition-colors duration-150 truncate cursor-pointer block border-none h-10 px-4 text-sm font-bold"
                    style={{
                      backgroundColor: isSelected ? `${primaryColor}15` :'transparent',
                      color: isSelected ? primaryColor :'#475569',
                      fontWeight: isSelected ?'700' :'500'
                    }}
                    onMouseEnter={(e) => {
                      if (!isSelected) {
                        e.currentTarget.style.backgroundColor ='#f1f5f9';
                        e.currentTarget.style.color ='#1e293b';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isSelected) {
                        e.currentTarget.style.backgroundColor ='transparent';
                        e.currentTarget.style.color ='#475569';
                      }
                    }}
                  >
                    {opt.label}
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
