import React from'react';
import { cn } from'@/lib/utils';
import { normalizeText } from'../../utils/adminHelpers.js';
import { DEFAULT_TABLE_SORTS, TABLE_SORT_OPTIONS } from'../../utils/constants.js';
import { ArrowUpDown, Upload, History, Trash2, Plus, Search, ChevronLeft, ChevronRight, Edit3 } from'lucide-react';
import { Badge } from'../ui/badge.jsx';
import { UISelect, Button } from'../ui.jsx';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from'../ui/table.jsx';
import { PageHeader } from '../monitoring/ui/index.js';


const TAB_FILTER_KEYS = {
  kelas: [{ key:"major", label:"Jurusan" }],
  guru: [
    { key:"type", label:"Kategori" },
    { key:"role", label:"Peran" }
  ],
  mapel: [
    { key:"grade", label:"Tingkat" },
    { key:"major", label:"Jurusan" }
  ],
  ruangan: [
    { key:"type", label:"Tipe Ruang" },
    { key:"major", label:"Jurusan" }
  ],
  karyawan: [
    { key:"division", label:"Divisi" }
  ],
  siswa: [
    { key:"class_name", label:"Kelas", altKeys: ["kelas","class"] }
  ],
  beban: [
    { key:"targetGrade", label:"Tingkat" },
    { key:"targetMajor", label:"Jurusan" }
  ]
};

export function useAdminTableRenderer(context) {
  const {
    activeTab,
    getTabPermissionLevel,
    activeUserRole,
    getActiveSortConfig,
    selectedRows,
    getSearchTextForTab,
    searchTerm,
    getTableSort,
    itemsPerPage,
    tablePage,
    getRowKeyForTab,
    tabSubtitles,
    setSearchTerm,
    setTablePage,
    handleSelectAll,
    handleSort,
    renderTableFilters,
    handleBulkDelete,
    setShowImportModal,
    openModal,
    deletedHistory,
    undoLastDelete,
    handleResetRuangan,
    setItemsPerPage,
    setTableSorts,
    updateSelectionForTab
  } = context;

  const [showRowsDropdown, setShowRowsDropdown] = React.useState(false);
  const [tableFilters, setTableFilters] = React.useState({});

   
  const renderTable = (title, columns, data, renderRow, options = {}) => {
    const permLevel = getTabPermissionLevel(options.tabKey || activeTab);
    const isViewOnly = permLevel ==="view" || (permLevel ==="otomatis" && activeUserRole ==="kepsek");
    const tabKey = options.tabKey || activeTab;

    // Dynamic Filter lists & application
    const activeFilters = TAB_FILTER_KEYS[tabKey] || [];
    const getFilterValues = (filterKey, altKeys = []) => {
      const values = new Set();
      data.forEach(item => {
        let val = item[filterKey];
        if (val === undefined && altKeys) {
          for (const alt of altKeys) {
            if (item[alt] !== undefined) {
              val = item[alt];
              break;
            }
          }
        }
        if (val) {
          String(val).split(",").map(v => v.trim()).filter(Boolean).forEach(v => {
            const lowerV = v.toLowerCase();
            if (lowerV !=="semua" && lowerV !=="all") {
              values.add(v);
            }
          });
        }
      });
      return ["Semua", ...Array.from(values).sort()];
    };

    let processedData = data;
    activeFilters.forEach(f => {
      const selectedValue = tableFilters[`${tabKey}_${f.key}`] ||"Semua";
      if (selectedValue !=="Semua") {
        processedData = processedData.filter(item => {
          let val = item[f.key];
          if (val === undefined && f.altKeys) {
            for (const alt of f.altKeys) {
              if (item[alt] !== undefined) {
                val = item[alt];
                break;
              }
            }
          }
          if (!val) return false;
          const itemValues = String(val).split(",").map(v => v.trim().toLowerCase());
          return itemValues.includes(selectedValue.toLowerCase());
        });
      }
    });

    const sortOptions = options.sortOptions || TABLE_SORT_OPTIONS[tabKey] || [];
    const sortConfig = getActiveSortConfig(tabKey);
    const selectedKeys = selectedRows[tabKey] || [];
    const filteredData = processedData.filter(item => normalizeText(getSearchTextForTab(tabKey, item)).includes(normalizeText(searchTerm)));
    const sortedData = getTableSort(tabKey, filteredData);

    // Pagination
    const ITEMS_PER_PAGE = itemsPerPage;
    const totalPages = Math.ceil(sortedData.length / ITEMS_PER_PAGE);
    const safeTablePage = Math.max(1, Math.min(tablePage, totalPages || 1));
    const paginatedData = sortedData.slice((safeTablePage - 1) * ITEMS_PER_PAGE, safeTablePage * ITEMS_PER_PAGE);
    const visibleKeys = paginatedData.map(item => getRowKeyForTab(tabKey, item));
    const allVisibleSelected = visibleKeys.length > 0 && visibleKeys.every(key => selectedKeys.includes(key));
    const selectedCount = selectedKeys.length;

    const defaultSubtitles = {
      siswa: "Kelola data induk siswa, kelas, jurusan, serta status keaktifan akademik siswa.",
      kelas: "Kelola data rombongan belajar (rombel), tingkat kelas, dan wali kelas.",
      jurusan: "Kelola daftar kompetensi keahlian dan konsentrasi keahlian sekolah.",
      data_pegawai: "Kelola data induk seluruh pegawai sekolah, guru, serta staf tata usaha.",
      guru: "Kelola data induk guru, beban mengajar, dan target jam mengajar.",
      karyawan: "Kelola data induk staf dan karyawan sekolah serta status absensi.",
      mapel: "Kelola daftar mata pelajaran beserta alokasi waktu dan jenis ruangannya.",
      ruangan: "Kelola sarana prasarana sekolah, daftar ruangan kelas, laboratorium, dan bengkel.",
      fasilitas: "Kelola sarana prasarana sekolah, daftar ruangan kelas, laboratorium, dan bengkel.",
      beban: "Kelola dan susun pembagian beban mengajar guru untuk setiap mata pelajaran.",
    };

    const actualPageHeader = options.pageHeader !== undefined 
      ? options.pageHeader 
      : <PageHeader 
          title={title} 
          description={(tabSubtitles && tabSubtitles[tabKey]) || defaultSubtitles[tabKey] || `Kelola & pantau data ${title.toLowerCase()} sekolah secara terpusat.`} 
        />;

    return (
      <div className="flex flex-col gap-4 w-full animate-in fade-in duration-300 relative z-10">
        {actualPageHeader}
        <section className="rounded-xl bg-card ring-1 ring-foreground/10 flex flex-col flex-1 overflow-hidden">
          {options.customTabs && (
            <div className="px-4 pt-4 pb-2 border-b border-border bg-muted/30">
              {options.customTabs}
            </div>
          )}

          {/* Toolbar */}
          <div className="p-3 md:p-4 border-b border-border bg-card/90 shrink-0">
            <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-3">
              <div className="text-xs font-medium text-muted-foreground shrink-0">
                <span className="font-semibold text-foreground">{filteredData.length}</span> dari {data.length} data tampil
                {selectedCount > 0 && (
                  <Badge variant="secondary" className="ml-2">{selectedCount} dipilih</Badge>
                )}
              </div>

              <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-2 w-full xl:w-auto">
                {sortOptions.length > 0 && (
                  <div className="col-span-2 sm:col-span-1 flex items-center gap-1.5">
                    <UISelect
                      prefix="Sort:"
                      value={sortConfig.key}
                      onChange={e => setTableSorts(prev => ({
                        ...prev,
                        [tabKey]: { ...(prev[tabKey] || DEFAULT_TABLE_SORTS[tabKey]), key: e.target.value }
                      }))}
                    >
                      {sortOptions.map(option => (
                        <option key={option.value} value={option.value}>{option.label}</option>
                      ))}
                    </UISelect>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={() => setTableSorts(prev => ({
                        ...prev,
                        [tabKey]: { ...(prev[tabKey] || DEFAULT_TABLE_SORTS[tabKey]), dir: sortConfig.dir ==="asc" ?"desc" :"asc" }
                      }))}
                      title={sortConfig.dir ==="asc" ?"Urutan A-Z" :"Urutan Z-A"}
                    >
                      <ArrowUpDown size={13} />
                    </Button>
                  </div>
                )}

                {/* Dynamic Filters */}
                {activeFilters.map(f => {
                  const optionsList = getFilterValues(f.key, f.altKeys);
                  if (optionsList.length <= 1) return null;
                  const currentValue = tableFilters[`${tabKey}_${f.key}`] ||"Semua";
                  return (
                    <div key={f.key} className="col-span-2 sm:col-span-1 flex items-center gap-1.5">
                      <UISelect
                        prefix={`${f.label}:`}
                        value={currentValue}
                        onChange={e => {
                          setTableFilters(prev => ({
                            ...prev,
                            [`${tabKey}_${f.key}`]: e.target.value
                          }));
                          setTablePage(1);
                        }}
                      >
                        {optionsList.map(opt => (
                          <option key={opt} value={opt}>{opt}</option>
                        ))}
                      </UISelect>
                    </div>
                  );
                })}

                {options.customHeaderButtons}

                {!isViewOnly && (
                  <Button variant="outline" onClick={() => openModal("bulk","add")} className="text-xs hidden sm:flex gap-1.5">
                    <Upload size={13} /> Import Teks
                  </Button>
                )}

                {deletedHistory.length > 0 && (
                  <Button variant="outline" onClick={undoLastDelete} className="text-xs gap-1.5">
                    <History size={13} /> Undo Hapus
                  </Button>
                )}

                {selectedCount > 0 && !isViewOnly && (
                  <>
                    <Button 
                      variant="outline" 
                      onClick={() => openModal('bulk_edit', 'edit', { tabKey, ids: selectedKeys })} 
                      className="text-xs gap-1.5 text-indigo-700 bg-indigo-50/90 hover:bg-indigo-100 border-indigo-300 font-bold"
                    >
                      <Edit3 size={13} /> Edit Massal ({selectedCount})
                    </Button>
                    <Button variant="destructive" onClick={() => handleBulkDelete(tabKey, selectedKeys)} className="text-xs gap-1.5">
                      <Trash2 size={13} /> Hapus ({selectedCount})
                    </Button>
                  </>
                )}

                {tabKey ==="ruangan" && (
                  <Button variant="destructive" onClick={handleResetRuangan} className="text-xs gap-1.5">
                    <Trash2 size={13} /> Kosongkan Semua
                  </Button>
                )}

                {!isViewOnly && (
                  <Button onClick={() => openModal(tabKey,"add")} className="text-xs gap-1.5">
                    <Plus size={13} strokeWidth={2.5} /> Tambah
                  </Button>
                )}
              </div>
            </div>
            {/* Search */}
            <div className="mt-3">
              <div className="relative w-full">
                <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text"
                  placeholder={`Cari ${title.toLowerCase()}...`}
                  value={searchTerm}
                  onChange={e => { setSearchTerm(e.target.value); setTablePage(1); }}
                  className={cn("h-7 w-full min-w-0 rounded-md border border-input bg-input/20 pl-8 pr-3 py-0.5 text-xs","transition-colors outline-none placeholder:text-muted-foreground font-medium","focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30"
                  )}
                />
              </div>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto flex-1">
            <Table>
              <TableHeader className="bg-muted/50 sticky top-0 z-10">
                <TableRow className="border-border">
                  <TableHead className="w-10 text-center px-3">
                    <input
                      type="checkbox"
                      checked={allVisibleSelected}
                      onChange={e => updateSelectionForTab(tabKey, current => {
                        const currentSet = new Set(current);
                        if (e.target.checked) {
                          visibleKeys.forEach(key => currentSet.add(key));
                        } else {
                          visibleKeys.forEach(key => currentSet.delete(key));
                        }
                        return [...currentSet];
                      })}
                      className="accent-primary cursor-pointer w-3.5 h-3.5"
                      aria-label={`Pilih semua ${tabKey} yang tampil`}
                    />
                  </TableHead>
                  <TableHead 
                    className="w-12 text-center text-[10px] font-bold text-muted-foreground uppercase tracking-wider px-3 cursor-pointer hover:bg-muted/80 transition-colors select-none"
                    onClick={() => {
                      const numberKey = tabKey === "guru" || tabKey === "karyawan" ? "code" : tabKey === "siswa" ? "nis" : tabKey === "ruangan" ? "id" : tabKey === "beban" ? "teacherCode" : "code";
                      setTableSorts(prev => {
                        const current = prev[tabKey] || DEFAULT_TABLE_SORTS[tabKey] || { key: numberKey, dir: "asc" };
                        return {
                          ...prev,
                          [tabKey]: { key: numberKey, dir: current.key === numberKey && current.dir === "asc" ? "desc" : "asc" }
                        };
                      });
                    }}
                    title="Klik untuk mengurutkan berdasarkan Nomor/Kode"
                  >
                    <div className="flex items-center justify-center gap-1">
                      <span>No</span>
                      {(sortConfig.key === "code" || sortConfig.key === "nis" || sortConfig.key === "id" || sortConfig.key === "teacherCode") && (
                        <span className="text-[9px] font-black text-primary">{sortConfig.dir === "asc" ? "▲" : "▼"}</span>
                      )}
                    </div>
                  </TableHead>
                  {columns.map((col, idx) => {
                    const name = String(col).toLowerCase();
                    let alignClass = "text-left";
                    if (
                      name.includes("kode") || 
                      name.includes("nis") || 
                      name.includes("wali") || 
                      name.includes("jp") || 
                      name.includes("alat") || 
                      name.includes("status") || 
                      name.includes("hari") || 
                      name.includes("jam") ||
                      name.includes("lantai")
                    ) {
                      alignClass = "text-center";
                    }

                    const getSortKeyForCol = (colStr) => {
                      const s = String(colStr).toLowerCase();
                      if (s.includes("kode") || s.includes("nis") || s.includes("id ruang")) {
                        return tabKey === "guru" || tabKey === "karyawan" ? "code" : tabKey === "siswa" ? "nis" : tabKey === "ruangan" ? "id" : "code";
                      }
                      if (s.includes("nama")) return "name";
                      if (s.includes("jurusan")) return "major";
                      if (s.includes("tingkat")) return "grade";
                      if (s.includes("divisi")) return "division";
                      if (s.includes("tipe") || s.includes("kategori")) return "type";
                      if (s.includes("jp")) return "targetWeeklyJp";
                      return null;
                    };

                    const targetSortKey = getSortKeyForCol(col);
                    const isActiveSort = targetSortKey && sortConfig.key === targetSortKey;

                    return (
                      <TableHead 
                        key={idx} 
                        className={cn(
                          "text-[10px] font-semibold text-muted-foreground uppercase tracking-wider px-3 select-none",
                          alignClass,
                          targetSortKey ? "cursor-pointer hover:bg-muted/80 hover:text-foreground transition-colors" : ""
                        )}
                        onClick={() => {
                          if (!targetSortKey) return;
                          setTableSorts(prev => {
                            const current = prev[tabKey] || DEFAULT_TABLE_SORTS[tabKey] || { key: targetSortKey, dir: "asc" };
                            return {
                              ...prev,
                              [tabKey]: { key: targetSortKey, dir: current.key === targetSortKey && current.dir === "asc" ? "desc" : "asc" }
                            };
                          });
                        }}
                        title={targetSortKey ? `Klik untuk mengurutkan berdasarkan ${col}` : undefined}
                      >
                        <div className={cn("flex items-center gap-1", alignClass === "text-center" ? "justify-center" : "justify-start")}>
                          <span>{col}</span>
                          {isActiveSort && (
                            <span className="text-[9px] font-black text-primary">{sortConfig.dir === "asc" ? "▲" : "▼"}</span>
                          )}
                        </div>
                      </TableHead>
                    );
                  })}
                  <TableHead className="text-right text-[10px] font-semibold text-muted-foreground uppercase tracking-wider px-3">
                    Aksi
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedData.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={columns.length + 3} className="px-6 py-14 text-center">
                      <Search size={22} className="mx-auto mb-2 text-muted-foreground/40" />
                      <p className="text-sm font-semibold text-foreground">Tidak ada data yang cocok.</p>
                      <p className="mt-1 text-xs text-muted-foreground">Coba ubah kata pencarian atau tambah data baru.</p>
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedData.map((item, idx) => renderRow(item, idx, selectedKeys.includes(getRowKeyForTab(tabKey, item))))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination — always visible */}
          <div className="p-2.5 border-t border-border bg-muted/20 flex items-center justify-between shrink-0 flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-muted-foreground font-medium">
                  {sortedData.length === 0 ? 0 : (safeTablePage - 1) * ITEMS_PER_PAGE + 1}–{Math.min(safeTablePage * ITEMS_PER_PAGE, sortedData.length)} dari {sortedData.length}
                </span>
                <div className="relative inline-block text-left">
                  <button
                    type="button"
                    onClick={() => setShowRowsDropdown(!showRowsDropdown)}
                    className="h-6 rounded-lg border border-border bg-card px-2 text-[11px] font-bold text-slate-700 hover:bg-slate-50 transition-all flex items-center gap-1 cursor-pointer select-none"
                  >
                    <span>{itemsPerPage} baris</span>
                    <span className="text-[8px] text-slate-400">▼</span>
                  </button>

                  {showRowsDropdown && (
                    <>
                      <div 
                        className="fixed inset-0 z-40 bg-transparent" 
                        onClick={() => setShowRowsDropdown(false)}
                      />
                      <div className="absolute left-0 bottom-7 min-w-[90px] bg-card border border-slate-200/60 shadow-lg rounded-xl p-1 z-50 flex flex-col gap-0.5 animate-in fade-in slide-in-from-bottom-1 duration-150">
                        {[20, 50, 100].map(val => (
                          <button
                            key={val}
                            type="button"
                            onClick={() => {
                              setItemsPerPage(val);
                              setTablePage(1);
                              setShowRowsDropdown(false);
                            }}
                            className={cn("w-full text-left px-2.5 py-1.5 rounded-lg text-[10px] font-bold transition-colors cursor-pointer",
                              itemsPerPage === val 
                                ?"bg-primary text-white" 
                                :"text-slate-600 hover:bg-slate-50 hover:text-slate-800"
                            )}
                          >
                            {val} baris
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <Button
                  variant="outline"
                  size="icon-sm"
                  onClick={() => setTablePage(p => Math.max(1, p - 1))}
                  disabled={safeTablePage === 1}
                >
                  <ChevronLeft size={13} />
                </Button>
                <span className="text-[11px] font-medium text-muted-foreground px-2">
                  {safeTablePage} / {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="icon-sm"
                  onClick={() => setTablePage(p => Math.min(totalPages, p + 1))}
                  disabled={safeTablePage === totalPages}
                >
                  <ChevronRight size={13} />
                </Button>
              </div>
            </div>
        </section>
      </div>
    );
  };

  return { renderTable };
}
