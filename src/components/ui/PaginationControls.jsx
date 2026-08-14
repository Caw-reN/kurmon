import { useState } from'react';


/**
 * PaginationControls - Komponen paginasi yang reusable dan konsisten
 * 
 * @param {number} currentPage - Halaman aktif saat ini (1-indexed)
 * @param {number} totalItems - Total data keseluruhan
 * @param {number} itemsPerPage - Jumlah item per halaman
 * @param {Function} onPageChange - Callback ketika halaman berubah (newPage) => void
 * @param {Function} onItemsPerPageChange - Callback ketika jumlah baris berubah (newPerPage) => void
 * @param {number[]} pageSizeOptions - Opsi jumlah baris, default: [20, 50, 100]
 */
export function PaginationControls({
  currentPage = 1,
  totalItems = 0,
  itemsPerPage = 20,
  onPageChange,
  onItemsPerPageChange,
  pageSizeOptions = [20, 50, 100]
}) {
  const [showDropdown, setShowDropdown] = useState(false);
  const totalPages = Math.max(1, Math.ceil(totalItems / itemsPerPage));
  const safePage = Math.max(1, Math.min(currentPage, totalPages));
  const startItem = totalItems === 0 ? 0 : (safePage - 1) * itemsPerPage + 1;
  const endItem = Math.min(safePage * itemsPerPage, totalItems);

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-0 px-4 py-3 border-t border-slate-100 bg-slate-50/60 shrink-0">
      {/* Left: Items info + rows selector */}
      <div className="flex items-center gap-2.5">
        <span className="text-[11px] text-slate-500 font-medium">
          {startItem}–{endItem} dari <span className="font-bold text-slate-700">{totalItems}</span> data
        </span>
        
        {/* Rows per page dropdown */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setShowDropdown(v => !v)}
            className="h-6 px-2 rounded-[var(--ui-radius-small)] border border-slate-200 bg-white text-[11px] font-bold text-slate-600 hover:bg-slate-50 transition-all flex items-center gap-1 cursor-pointer"
          >
            <span>{itemsPerPage} baris</span>
            <span className="text-[8px] text-slate-400">▼</span>
          </button>
          {showDropdown && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setShowDropdown(false)}
              />
              <div className="absolute left-0 bottom-7 min-w-[90px] bg-white border border-slate-200 shadow-sm rounded-[var(--ui-radius-small)] p-1 z-50 flex flex-col gap-0.5 animate-in fade-in slide-in-from-bottom-1 duration-150">
                {pageSizeOptions.map(size => (
                  <button
                    key={size}
                    type="button"
                    onClick={() => {
                      onItemsPerPageChange?.(size);
                      onPageChange?.(1);
                      setShowDropdown(false);
                    }}
                    className={`w-full text-left px-2.5 py-1.5 rounded-[var(--ui-radius-small)] text-[10px] font-bold transition-colors cursor-pointer border-none ${
                      itemsPerPage === size
                        ?'bg-[var(--ui-primary)] text-white'
                        :'text-slate-600 hover:bg-slate-50 hover:text-slate-800'
                    }`}
                  >
                    {size} baris
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Right: Page navigation */}
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={() => onPageChange?.(safePage - 1)}
          disabled={safePage <= 1}
          className="w-7 h-7 rounded-[var(--ui-radius-small)] border border-slate-200 bg-white flex items-center justify-center text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer"
        >
          <ChevronLeft size={13} />
        </button>

        <span className="text-[11px] font-semibold text-slate-600 min-w-[60px] text-center">
          {safePage} / {totalPages}
        </span>

        <button
          type="button"
          onClick={() => onPageChange?.(safePage + 1)}
          disabled={safePage >= totalPages}
          className="w-7 h-7 rounded-[var(--ui-radius-small)] border border-slate-200 bg-white flex items-center justify-center text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer"
        >
          <ChevronRight size={13} />
        </button>
      </div>
    </div>
  );
}

/**
 * usePagination - Hook untuk mengelola state paginasi
 * 
 * @param {Array} data - Data asli yang ingin dipaginasi
 * @param {number} defaultPerPage - Jumlah item per halaman, default: 20
 * @returns {{ paginatedData, currentPage, setCurrentPage, itemsPerPage, setItemsPerPage, PaginationBar }}
 */
export function usePagination(data = [], defaultPerPage = 20) {
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(defaultPerPage);

  const totalItems = data.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / itemsPerPage));
  const safePage = Math.max(1, Math.min(currentPage, totalPages));
  const paginatedData = data.slice((safePage - 1) * itemsPerPage, safePage * itemsPerPage);

  const handlePageChange = (page) => setCurrentPage(Math.max(1, Math.min(page, totalPages)));
  const handlePerPageChange = (perPage) => {
    setItemsPerPage(perPage);
    setCurrentPage(1);
  };

  const PaginationBar = () => (
    <PaginationControls
      currentPage={safePage}
      totalItems={totalItems}
      itemsPerPage={itemsPerPage}
      onPageChange={handlePageChange}
      onItemsPerPageChange={handlePerPageChange}
    />
  );

  return {
    paginatedData,
    currentPage: safePage,
    setCurrentPage: handlePageChange,
    itemsPerPage,
    setItemsPerPage: handlePerPageChange,
    PaginationBar
  };
}
