import React, { useRef, useState, useEffect, useMemo } from 'react';
import { cn } from '@/lib/utils';
import {
  ChevronDown, ChevronUp, ChevronRight, X, RefreshCw, LogOut, PanelLeftClose, PanelLeftOpen, DatabaseBackup, Settings, Shield,
  LayoutDashboard, Calendar, CalendarDays, ClipboardList, MessageSquare, Trophy, Briefcase, Users, GraduationCap, Building2, Activity, FileText,
  CheckCircle2, FileSpreadsheet, Search, User
} from 'lucide-react';
import { MENU_REGISTRY } from '@/utils/menuRegistry';
import { normalizeUserRole } from '@/utils/constants';

export default function AdminSidebar({
  isMobileMenuOpen, setIsMobileMenuOpen,
  isSidebarCollapsed, toggleSidebar,
  appSettings, currentUser, uiFontClass,
  activeTab, setActiveTab,
  renderNavItem,
  hasAnyConfigAccess,
  handleLogout,
  expandedGroups,
  toggleGroup,
  isSuperAdminRole,
  activeUserRole,
  checkIsAllowed,
  handleBackupExport,
  isBackingUp,
  sidebarScrollRef,
  sidebarScrollPos,
  activeRoleLabel,
  onOpenProfile
}) {
  const isCollapsed = isSidebarCollapsed && !isMobileMenuOpen;
  const fallbackScrollRef = useRef(null);
  const fallbackScrollPos = useRef(0);
  const refToUse = sidebarScrollRef || fallbackScrollRef;
  const posToUse = sidebarScrollPos || fallbackScrollPos;

  const [searchQuery, setSearchQuery] = useState('');
  const searchInputRef = useRef(null);

  // Keyboard shortcut Ctrl+K / Cmd+K to focus search
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        if (isSidebarCollapsed) toggleSidebar();
        setTimeout(() => searchInputRef.current?.focus(), 150);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isSidebarCollapsed, toggleSidebar]);

  // Restore scroll position on mount
  useEffect(() => {
    const savedPos = sessionStorage.getItem("admin_sidebar_scroll_top");
    if (savedPos && refToUse.current) {
      refToUse.current.scrollTop = parseInt(savedPos, 10);
    }
  }, [refToUse]);

  // Scroll active item into view on mount or tab change
  useEffect(() => {
    if (refToUse.current && !searchQuery.trim()) {
      const timer = setTimeout(() => {
        if (!refToUse.current) return;
        const activeEl = refToUse.current.querySelector(".bg-\\[\\#f3f4f6\\], .bg-\\[\\#e5e7eb\\]");
        if (activeEl) {
          activeEl.scrollIntoView({ block: "nearest", behavior: "smooth" });
        }
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [activeTab, refToUse, searchQuery]);

  // Real-time search filter across MENU_REGISTRY
  const filteredSearchItems = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const q = searchQuery.toLowerCase().trim();
    return MENU_REGISTRY.filter(item => {
      const isAllowed = typeof checkIsAllowed === 'function'
        ? (checkIsAllowed(item.id, item.featureKey) || (Array.isArray(item.activeIds) && item.activeIds.some(aid => checkIsAllowed(aid, item.featureKey))))
        : true;
      if (!isAllowed) return false;
      
      const labelMatch = item.label?.toLowerCase().includes(q);
      const groupMatch = item.adminGroup?.toLowerCase().includes(q);
      const sectionMatch = item.section?.toLowerCase().includes(q);
      const idMatch = item.id?.toLowerCase().includes(q);
      return labelMatch || groupMatch || sectionMatch || idMatch;
    });
  }, [searchQuery, checkIsAllowed]);

  const SidebarSection = ({ label }) => {
    if (isCollapsed) return null;
    return (
      <div className="mt-4 mb-2 px-1 flex items-center">
        <span className="text-[11px] font-medium text-slate-400">
          {label}
        </span>
      </div>
    );
  };

  const SidebarGroup = ({ label, icon: Icon, groupKey, children }) => {
    const isOpen = expandedGroups?.[groupKey] !== false;

    // Check if any child is active
    const hasActiveChild = React.Children.toArray(children).some(child => {
      if (!React.isValidElement(child)) return false;
      const childId = child.props?.id;
      const childActiveIds = child.props?.activeIds;
      return childId === activeTab || (Array.isArray(childActiveIds) && childActiveIds.includes(activeTab));
    });

    if (isCollapsed) {
      return (
        <div className="mb-1 w-full flex justify-center group relative">
          <button
            onClick={() => {
              toggleSidebar();
              if (!isOpen) toggleGroup(groupKey);
            }}
            type="button"
            className={cn(
              "flex items-center justify-center rounded-xl border-none transition-colors cursor-pointer w-10 h-10",
              hasActiveChild 
                ? "bg-[#f3f4f6] text-slate-900" 
                : "text-slate-400 hover:bg-slate-100/80 hover:text-slate-700"
            )}
          >
            {Icon && (
              <Icon 
                size={17} 
                strokeWidth={hasActiveChild ? 2 : 1.8}
                className={cn(hasActiveChild ? "text-slate-900" : "text-slate-400 group-hover:text-slate-700 transition-colors")} 
              />
            )}
          </button>

          {/* Dark Tooltip Pill (Exact Reference Image) */}
          <div className="absolute left-full ml-2.5 top-1 bg-slate-900 text-white text-xs font-medium px-2.5 py-1 rounded-md shadow-md whitespace-nowrap z-50 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity">
            {label}
          </div>

          {/* Floating White Submenu Card on Hover (Exact Reference Image 2nd Column) */}
          <div className="absolute left-full ml-2.5 top-8 bg-white rounded-2xl shadow-xl border border-slate-100 p-2 min-w-[155px] z-50 opacity-0 group-hover:opacity-100 pointer-events-none group-hover:pointer-events-auto transition-all flex flex-col gap-0.5">
            {React.Children.map(children, (child) => {
              if (!React.isValidElement(child)) return null;
              const childId = child.props?.id;
              const childLabel = child.props?.label;
              const isChildActive = childId === activeTab || (Array.isArray(child.props?.activeIds) && child.props.activeIds.includes(activeTab));
              return (
                <button
                  key={childId}
                  onClick={() => {
                    setActiveTab(childId);
                    if (isMobileMenuOpen) setIsMobileMenuOpen(false);
                  }}
                  type="button"
                  className={cn(
                    "py-1.5 px-3 text-xs rounded-lg transition-colors cursor-pointer border-none text-left flex items-center justify-between",
                    isChildActive
                      ? "bg-[#e5e7eb] text-slate-900 font-semibold"
                      : "text-slate-500 hover:text-slate-900 hover:bg-slate-50 font-normal"
                  )}
                >
                  <span className="truncate">{childLabel}</span>
                  {isChildActive && <ChevronRight size={12} className="text-slate-400 shrink-0 ml-1" />}
                </button>
              );
            })}
          </div>
        </div>
      );
    }

    return (
      <div className="mb-1 w-full">
        <button
          onClick={() => toggleGroup(groupKey)}
          type="button"
          className={cn(
            "group relative flex w-full items-center justify-between rounded-xl border-none",
            "px-3.5 py-2.5 text-xs transition-colors cursor-pointer",
            isOpen || hasActiveChild 
              ? "text-slate-900 font-semibold bg-[#f3f4f6]" 
              : "text-slate-500 hover:bg-slate-50/80 hover:text-slate-900 font-normal"
          )}
        >
          <div className="flex items-center gap-3 min-w-0">
            {Icon && (
              <Icon 
                size={16} 
                strokeWidth={isOpen || hasActiveChild ? 2 : 1.8}
                className={cn(isOpen || hasActiveChild ? "text-slate-900" : "text-slate-400 group-hover:text-slate-700 transition-colors")} 
              />
            )}
            <span className="truncate">{label}</span>
          </div>
          {isOpen ? (
            <ChevronUp size={13} className="text-slate-400 shrink-0" />
          ) : (
            <ChevronDown size={13} className="text-slate-400 shrink-0" />
          )}
        </button>

        {/* Tree Submenu List */}
        <div
          className="overflow-hidden transition-[max-height,opacity,margin] duration-200 ease-in-out ml-4 pl-3 border-l border-slate-200/80 flex flex-col gap-0.5 sidebar-submenus relative"
          style={{
            maxHeight: isOpen ? "1000px" : "0px",
            opacity: isOpen ? 1 : 0,
            pointerEvents: isOpen ? "auto" : "none",
            marginTop: isOpen ? "4px" : "0px",
            marginBottom: isOpen ? "4px" : "0px",
          }}
        >
          {React.Children.map(children, (child) => {
            if (React.isValidElement(child)) {
              return React.cloneElement(child, { isSubMenu: true });
            }
            return child;
          })}
        </div>
      </div>
    );
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // KEPSEK MENU RENDERER
  // ─────────────────────────────────────────────────────────────────────────────
  const renderKepsekMenu = () => {
    return (
      <>
        {renderNavItem({
          id: 'dashboard',
          icon: LayoutDashboard,
          label: 'Dashboard',
        })}

        <SidebarSection label="Monitoring & KBM" />
        {renderNavItem({ id: 'generate', icon: Calendar, label: 'Jadwal & KBM' })}
        {renderNavItem({ id: 'laporan_absensi', icon: ClipboardList, label: 'Rekap Kehadiran', activeIds: ['laporan_absensi', 'hikvision_report_guru', 'hikvision_report_karyawan'] })}
        {renderNavItem({ id: 'kedisiplinan_bpbk', icon: Trophy, label: 'Buku BPBK' })}
        {renderNavItem({ id: 'pkl_dashboard', icon: Briefcase, label: 'Dashboard PKL' })}
        {renderNavItem({ id: 'akademik', icon: CalendarDays, label: 'Kalender' })}

        <SidebarSection label="Data Utama" />
        {renderNavItem({ id: 'dataguru', icon: Users, label: 'Data Guru', activeIds: ['dataguru', 'guru', 'data_pegawai', 'karyawan'] })}
        {renderNavItem({ id: 'datasiswa', icon: GraduationCap, label: 'Data Siswa', activeIds: ['datasiswa', 'siswa'] })}
        {renderNavItem({ id: 'dataperusahaan', icon: Building2, label: 'Mitra DUDI', activeIds: ['dataperusahaan', 'pkl_data_perusahaan'] })}
        {renderNavItem({ id: 'riwayat_prestasi', icon: Trophy, label: 'Riwayat Prestasi' })}

        <SidebarSection label="Laporan" />
        {renderNavItem({ id: 'hikvision_report_guru', icon: FileText, label: 'Absensi Guru' })}
        {renderNavItem({ id: 'hikvision_report_siswa', icon: FileText, label: 'Absensi Siswa' })}
        {renderNavItem({ id: 'kedisiplinan_absensi', icon: CheckCircle2, label: 'Izin & Sakit Siswa' })}
        {renderNavItem({ id: 'keterangan_massal', icon: FileSpreadsheet, label: 'Keterangan Massal' })}

        <SidebarSection label="Aktivitas" />
        {renderNavItem({ id: 'audit_log', icon: Activity, label: 'Log Aktivitas' })}
        {renderNavItem({ id: 'keamanan', icon: Shield, label: 'Keamanan Akun' })}
      </>
    );
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // DYNAMIC MENU RENDERER
  // ─────────────────────────────────────────────────────────────────────────────
  const renderDynamicMenu = () => {
    const isAdmin = isSuperAdminRole(activeUserRole);
    const isKepsek = normalizeUserRole(activeUserRole) === 'kepsek' || normalizeUserRole(currentUser?.role) === 'kepsek';

    if (isAdmin) {
      return renderAdminMenu();
    }

    if (isKepsek) {
      return renderKepsekMenu();
    }

    const isWalasUser = Boolean(currentUser?.isWalas || currentUser?.walasClass);
    const div = (currentUser?.division || "").toLowerCase().trim();
    const subrole = (currentUser?.subrole || "").toLowerCase().trim();
    const role = (currentUser?.role || activeUserRole || "").toLowerCase().trim();
    const isBKTeam = role === 'bpbk' || role === 'bk' || subrole === 'bpbk' || subrole === 'bk' ||
      subrole.includes('bk') || subrole.includes('bpbk') ||
      div === 'bk' || div === 'bp/bk' || div === 'bpbk' || Boolean(currentUser?.isBK || currentUser?.isBPBK);
    const isKesiswaanTeam = Boolean(currentUser?.isKesiswaan) || (
      (role === 'waka' && div === 'kesiswaan') ||
      role === 'kesiswaan' ||
      role === 'waka_kesiswaan' ||
      ['waka_kesiswaan', 'sekretaris_kesiswaan', 'anggota_kesiswaan', 'pembina_osis', 'sekretaris_osis'].includes(subrole) ||
      subrole.includes('kesiswaan') ||
      subrole.includes('osis') ||
      (role === 'guru' && (div === 'kesiswaan' || div === 'osis')) ||
      div === 'kesiswaan' ||
      div === 'osis'
    );
    const isKurikulumTeam = Boolean(currentUser?.isKurikulum) || (
      (role === 'waka' && (div === 'kurikulum' || !div)) ||
      role === 'kurikulum' ||
      role === 'waka_kurikulum' ||
      ['waka_kurikulum', 'sekretaris_kurikulum', 'anggota_kurikulum'].includes(subrole) ||
      subrole.includes('kurikulum') ||
      (role === 'guru' && div === 'kurikulum') ||
      div === 'kurikulum'
    );

    const sectionMap = {};
    for (const item of MENU_REGISTRY) {
      if (item.adminOnly) continue;
      if (item.id === 'pesan') continue;
      if (item.specialCondition === 'walas_only') {
        if (isWalasUser && !isKesiswaanTeam && !isKurikulumTeam && !isBKTeam) continue;
        if (typeof checkIsAllowed === 'function' && !checkIsAllowed(item.id, item.featureKey)) {
          continue;
        }
      }

      const section = item.section || '_root';
      if (!sectionMap[section]) sectionMap[section] = [];
      sectionMap[section].push(item);
    }

    const sections = Object.entries(sectionMap);
    const renderedSections = [];

    for (const [sectionName, items] of sections) {
      const renderedItems = items.map(item =>
        renderNavItem({
          id: item.id,
          icon: item.icon,
          label: item.label,
          featureKey: item.featureKey,
          activeIds: item.activeIds,
        })
      ).filter(Boolean);

      if (renderedItems.length === 0) continue;

      renderedSections.push(
        <React.Fragment key={sectionName}>
          {sectionName !== '_root' && <SidebarSection label={sectionName} />}
          {renderedItems}
        </React.Fragment>
      );
    }

    if (currentUser?.isWalas || currentUser?.walasClass) {
      if (!isKesiswaanTeam && !isKurikulumTeam && !isBKTeam) {
        const walasItems = MENU_REGISTRY.filter(i => i.specialCondition === 'walas_only');
        const renderedWalas = walasItems.map(item =>
          renderNavItem({
            id: item.id,
            icon: item.icon,
            label: item.label,
            featureKey: item.featureKey,
            activeIds: item.activeIds,
          })
        ).filter(Boolean);

        if (renderedWalas.length > 0) {
          const insertIdx = Math.min(3, renderedSections.length);
          renderedSections.splice(insertIdx, 0,
            <React.Fragment key="walas">
              <SidebarSection label={`Wali Kelas (${currentUser.walasClass || 'Kelas Ampuan'})`} />
              {renderedWalas}
            </React.Fragment>
          );
        }
      }
    }

    return renderedSections;
  };

  const renderAdminMenu = () => {
    const groupMap = {};
    const rootItems = [];

    for (const item of MENU_REGISTRY) {
      if (item.id === 'pesan') continue;
      if (!item.adminGroupKey) {
        if (!item.adminOnly || isSuperAdminRole(activeUserRole)) {
          rootItems.push(item);
        }
        continue;
      }
      if (!groupMap[item.adminGroupKey]) {
        groupMap[item.adminGroupKey] = {
          label: item.adminGroup,
          icon: item.adminGroupIcon,
          key: item.adminGroupKey,
          items: [],
        };
      }
      groupMap[item.adminGroupKey].items.push(item);
    }

    const groupOrder = ['dataMaster', 'tataUsaha', 'kurikulum', 'kesiswaan', 'kehadiran', 'hubin', 'sarpras', 'absensi', 'informasiUmum', 'sistem'];
    const sectionLabels = {
      dataMaster: 'Data Utama',
      tataUsaha: 'Manajemen Sekolah',
      kurikulum: null,
      kesiswaan: null,
      kehadiran: null,
      hubin: null,
      sarpras: null,
      absensi: 'Pengaturan',
      informasiUmum: null,
      sistem: null,
    };

    const renderedGroups = [];
    let lastSection = null;

    for (const groupKey of groupOrder) {
      const group = groupMap[groupKey];
      if (!group) continue;

      const renderedItems = group.items.map(item =>
        renderNavItem({
          id: item.id,
          icon: item.icon,
          label: item.label,
          featureKey: item.featureKey,
          activeIds: item.activeIds,
        })
      ).filter(Boolean);

      if (renderedItems.length === 0) continue;

      const sectionLabel = sectionLabels[groupKey];
      if (sectionLabel && sectionLabel !== lastSection) {
        renderedGroups.push(<SidebarSection key={`sec-${sectionLabel}`} label={sectionLabel} />);
        lastSection = sectionLabel;
      }

      renderedGroups.push(
        <SidebarGroup key={groupKey} label={group.label} icon={group.icon} groupKey={groupKey}>
          {renderedItems}
        </SidebarGroup>
      );
    }

    for (const [groupKey, group] of Object.entries(groupMap)) {
      if (groupOrder.includes(groupKey)) continue;
      const renderedItems = group.items.map(item =>
        renderNavItem({
          id: item.id,
          icon: item.icon,
          label: item.label,
          featureKey: item.featureKey,
          activeIds: item.activeIds,
        })
      ).filter(Boolean);
      if (renderedItems.length === 0) continue;
      renderedGroups.push(
        <SidebarGroup key={groupKey} label={group.label} icon={group.icon} groupKey={groupKey}>
          {renderedItems}
        </SidebarGroup>
      );
    }

    return (
      <>
        {renderNavItem({ id: 'dashboard', icon: MENU_REGISTRY.find(m => m.id === 'dashboard')?.icon, label: 'Dashboard' })}
        {renderedGroups}
      </>
    );
  };

  return (
    <aside
      className={cn(
        "app-sidebar border-r border-slate-200/80 bg-white flex flex-col shrink-0 relative transition-all duration-300 ease-in-out rounded-none !rounded-none select-none",
        isCollapsed ? "w-[68px] px-2 py-4" : "w-[244px] p-4",
        isMobileMenuOpen ? "fixed inset-y-0 left-0 z-50 shadow-sm translate-x-0" : "hidden lg:flex z-30 -translate-x-full lg:translate-x-0"
      )}
    >
      {/* ─── 1. BRAND HEADER (Exact Reference Style) ─── */}
      <div className={cn("flex items-center shrink-0 w-full", isCollapsed ? "justify-center" : "justify-between")}>
        {!isCollapsed ? (
          <div className="flex items-center justify-between w-full min-w-0">
            <div className="flex items-center gap-2.5 min-w-0">
              {/* Clean Geometric Logo Badge */}
              <div className="w-8 h-8 rounded-lg bg-slate-900 text-white flex items-center justify-center font-black shrink-0 overflow-hidden shadow-2xs p-1.5">
                <img
                  src={appSettings.logoWebUrl || appSettings.logoUrl || appSettings.faviconImage || "/favicon.svg"}
                  alt="Logo"
                  className="w-full h-full object-contain filter invert brightness-200"
                />
              </div>
              <span className="font-extrabold text-slate-900 text-sm tracking-wider uppercase truncate">
                {appSettings.appName || "KURMON"}
              </span>
            </div>
            {isMobileMenuOpen ? (
              <button
                type="button"
                onClick={() => setIsMobileMenuOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg lg:hidden border-none cursor-pointer flex items-center justify-center transition-colors bg-transparent"
                title="Tutup Menu"
              >
                <X size={15} strokeWidth={2} />
              </button>
            ) : (
              <button
                type="button"
                onClick={toggleSidebar}
                className="p-1 text-slate-400 hover:text-slate-700 rounded-lg hidden lg:flex border-none cursor-pointer items-center justify-center transition-colors shrink-0 bg-transparent"
                title="Ciutkan Sidebar"
              >
                <PanelLeftClose size={15} strokeWidth={2} />
              </button>
            )}
          </div>
        ) : (
          <div 
            onClick={toggleSidebar}
            className="w-8 h-8 rounded-lg bg-slate-900 text-white flex items-center justify-center font-black shrink-0 overflow-hidden cursor-pointer shadow-2xs p-1.5 hover:opacity-90 transition-opacity"
            title="Perluas Sidebar"
          >
            <img
              src={appSettings.logoWebUrl || appSettings.logoUrl || appSettings.faviconImage || "/favicon.svg"}
              alt="Logo"
              className="w-full h-full object-contain filter invert brightness-200"
            />
          </div>
        )}
      </div>

      {/* ─── 2. PRIMARY ACTION BUTTON ("+ New Report" Style) ─── */}
      <div className={cn("shrink-0", isCollapsed ? "mt-3 mb-2 flex justify-center w-full" : "mt-4 mb-2 w-full")}>
        {!isCollapsed ? (
          <button
            type="button"
            onClick={() => {
              setActiveTab('jurnal_harian');
              if (isMobileMenuOpen) setIsMobileMenuOpen(false);
            }}
            className="w-full bg-[#1e2530] hover:bg-slate-800 text-white font-medium text-xs py-2.5 px-4 rounded-xl shadow-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer border-none active:scale-[0.99]"
          >
            <span className="text-base leading-none font-normal">+</span>
            <span>Jurnal KBM</span>
          </button>
        ) : (
          <button
            type="button"
            onClick={() => {
              setActiveTab('jurnal_harian');
              if (isMobileMenuOpen) setIsMobileMenuOpen(false);
            }}
            className="bg-[#1e2530] hover:bg-slate-800 text-white text-[10px] font-semibold py-1.5 px-2 rounded-lg text-center cursor-pointer border-none transition-colors shadow-2xs whitespace-nowrap"
            title="Jurnal KBM"
          >
            + Jurnal
          </button>
        )}
      </div>

      {/* ─── 3. SECTION LABEL "Menu" ─── */}
      <div className={cn("text-[11px] font-medium text-slate-400 shrink-0", isCollapsed ? "text-[10px] mt-2 mb-1 text-center" : "mt-2 mb-1 px-1")}>
        Menu
      </div>

      {/* ─── 4. SEARCH INPUT (Clean & Minimalist) ─── */}
      {!isCollapsed && (
        <div className="mb-2 shrink-0">
          <div className="relative flex items-center">
            <Search size={13} className="absolute left-2.5 text-slate-400 pointer-events-none" />
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search"
              className="w-full bg-slate-50/80 border border-slate-200/60 hover:border-slate-300 focus:border-slate-400 pl-8 pr-11 py-1.5 text-xs rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none transition-all font-normal"
            />
            <div className="absolute right-2 flex items-center gap-1">
              {searchQuery ? (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="text-slate-400 hover:text-slate-600 p-0.5 rounded cursor-pointer border-none bg-transparent"
                >
                  <X size={11} />
                </button>
              ) : (
                <kbd className="hidden sm:inline-block text-[9px] font-medium text-slate-400 bg-white border border-slate-200 px-1 py-0.2 rounded">
                  ⌘K
                </kbd>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ─── 5. SCROLLABLE NAVIGATION LIST ─── */}
      <nav
        ref={refToUse}
        onScroll={(e) => {
          const scrollTop = e.currentTarget.scrollTop;
          posToUse.current = scrollTop;
          sessionStorage.setItem("admin_sidebar_scroll_top", scrollTop);
        }}
        className="flex-1 overflow-y-auto hide-scrollbar py-1 relative z-10"
      >
        {searchQuery.trim() ? (
          <div className="flex flex-col gap-1 py-1">
            <div className="px-1 py-1 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
              Hasil ({filteredSearchItems.length})
            </div>
            {filteredSearchItems.length > 0 ? (
              filteredSearchItems.map(item => {
                const isActive = activeTab === item.id || (Array.isArray(item.activeIds) && item.activeIds.includes(activeTab));
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      setActiveTab(item.id);
                      if (isMobileMenuOpen) setIsMobileMenuOpen(false);
                    }}
                    type="button"
                    className={cn(
                      "flex items-center justify-between px-3.5 py-2 text-xs rounded-xl text-left transition-colors cursor-pointer border-none",
                      isActive 
                        ? "bg-[#f3f4f6] text-slate-900 font-semibold" 
                        : "text-slate-500 hover:bg-slate-50 hover:text-slate-900 font-normal"
                    )}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className={cn("w-4 h-4 flex items-center justify-center shrink-0", isActive ? "text-slate-900" : "text-slate-400")}>
                        {item.icon && React.createElement(item.icon, { size: 15, strokeWidth: 1.8 })}
                      </div>
                      <span className="truncate">{item.label}</span>
                    </div>
                    <span className="text-[10px] text-slate-400 font-normal shrink-0 ml-2">
                      {item.adminGroup || item.section || "Menu"}
                    </span>
                  </button>
                );
              })
            ) : (
              <div className="px-2 py-4 text-center text-xs text-slate-400">
                Tidak ada menu yang sesuai
              </div>
            )}
          </div>
        ) : (
          <>
            {renderDynamicMenu()}

            {/* Non-admin granted config access */}
            {hasAnyConfigAccess() && (
              <SidebarGroup label="Konfigurasi Sistem" icon={Settings} groupKey="sistem">
                {renderNavItem({ id: "fitur", icon: MENU_REGISTRY.find(m => m.id === 'fitur')?.icon, label: "Kontrol Fitur" })}
                {renderNavItem({ id: "hak_akses", icon: MENU_REGISTRY.find(m => m.id === 'hak_akses')?.icon, label: "Hak Akses Role" })}
                {renderNavItem({ id: "manajemen_role", icon: MENU_REGISTRY.find(m => m.id === 'manajemen_role')?.icon || Shield, label: "Struktur & Jabatan" })}
                {renderNavItem({ id: "tampilan", icon: MENU_REGISTRY.find(m => m.id === 'tampilan')?.icon, label: "Tampilan Web" })}
                {renderNavItem({ id: "pengaturanuser", icon: MENU_REGISTRY.find(m => m.id === 'hak_akses')?.icon, label: "Pengaturan User" })}
              </SidebarGroup>
            )}

            {/* Notifications / Pesan item */}
            {checkIsAllowed('pesan', 'pesan') && (
              <button
                type="button"
                onClick={() => setActiveTab('pesan')}
                className={cn(
                  "group relative mb-1 flex w-full items-center justify-between border-none text-left transition-colors cursor-pointer",
                  isCollapsed ? "justify-center p-2.5 rounded-xl" : "px-3.5 py-2.5 text-xs rounded-xl",
                  activeTab === 'pesan'
                    ? "bg-[#f3f4f6] text-slate-900 font-semibold"
                    : "text-slate-500 hover:bg-slate-50/80 hover:text-slate-900 font-normal"
                )}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className={cn("flex items-center justify-center shrink-0 w-5 h-5", activeTab === 'pesan' ? "text-slate-900" : "text-slate-400 group-hover:text-slate-700")}>
                    <MessageSquare size={16} strokeWidth={activeTab === 'pesan' ? 2 : 1.8} />
                  </div>
                  {!isCollapsed && <span className="truncate">Notifikasi</span>}
                </div>
                {!isCollapsed && (
                  <span className="ml-2 px-2 py-0.5 text-[10px] font-semibold rounded-md bg-emerald-600 text-white">
                    2
                  </span>
                )}
              </button>
            )}
          </>
        )}
      </nav>

      {/* ─── 6. PROFILE SECTION AT BOTTOM (Exact Reference Style) ─── */}
      {!isCollapsed ? (
        <div className="pt-3 border-t border-slate-100 shrink-0 flex flex-col">
          <div className="text-[11px] font-medium text-slate-400 mb-2.5 px-1">Profile</div>
          
          {/* User Row */}
          <div 
            onClick={onOpenProfile}
            className="flex items-center gap-2.5 px-1 cursor-pointer group"
            title="Buka Pengaturan Profil"
          >
            <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200/80 flex items-center justify-center font-bold text-xs text-slate-700 shrink-0 overflow-hidden shadow-2xs">
              {currentUser?.avatar ? (
                <img src={currentUser.avatar} alt="User" className="w-full h-full object-cover" />
              ) : (
                <span>{(currentUser?.name || currentUser?.username || "A").slice(0, 2).toUpperCase()}</span>
              )}
            </div>
            <div className="flex flex-col min-w-0 text-left">
              <span className="font-semibold text-xs text-slate-900 truncate group-hover:text-primary transition-colors">
                {currentUser?.name || currentUser?.username || "Omotolani"}
              </span>
              <span className="text-[10.5px] text-slate-400 truncate font-normal">
                {currentUser?.email || activeRoleLabel || "omotolani@example.com"}
              </span>
            </div>
          </div>

          {/* Log out Button (Exact Style from Reference Image) */}
          <button
            type="button"
            onClick={handleLogout}
            className="w-full mt-3 py-2 px-3 rounded-xl bg-slate-50 hover:bg-slate-100/90 border border-slate-200/70 text-slate-700 hover:text-slate-900 text-xs font-medium flex items-center justify-center gap-2 cursor-pointer transition-colors shadow-2xs"
          >
            <LogOut size={13} strokeWidth={2} className="text-slate-500" />
            <span>Log out</span>
          </button>
        </div>
      ) : (
        <div className="pt-3 border-t border-slate-100 shrink-0 flex flex-col items-center">
          <div className="text-[10px] font-medium text-slate-400 mb-2 text-center">Profile</div>
          <div className="group relative">
            <button
              type="button"
              onClick={onOpenProfile}
              className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200/80 flex items-center justify-center font-bold text-xs text-slate-700 overflow-hidden cursor-pointer hover:ring-2 hover:ring-slate-300 transition-all shadow-2xs"
            >
              {currentUser?.avatar ? (
                <img src={currentUser.avatar} alt="User" className="w-full h-full object-cover" />
              ) : (
                <span>{(currentUser?.name || currentUser?.username || "A").slice(0, 2).toUpperCase()}</span>
              )}
            </button>
            {/* Floating Tooltip Menu */}
            <div className="absolute left-full ml-2.5 bottom-0 bg-white rounded-xl shadow-xl border border-slate-100 p-2 min-w-[140px] z-50 opacity-0 group-hover:opacity-100 pointer-events-none group-hover:pointer-events-auto transition-all flex flex-col gap-1">
              <div className="px-2 py-1 border-b border-slate-100 flex flex-col">
                <span className="text-xs font-bold text-slate-900 truncate">{currentUser?.name || "User"}</span>
                <span className="text-[10px] text-slate-400 truncate">{currentUser?.email || activeRoleLabel}</span>
              </div>
              <button
                type="button"
                onClick={onOpenProfile}
                className="flex items-center gap-2 px-2 py-1.5 text-xs text-slate-700 hover:text-slate-900 hover:bg-slate-50 rounded-lg border-none bg-transparent cursor-pointer text-left"
              >
                <User size={13} className="text-slate-400" />
                <span>Profil Akun</span>
              </button>
              <button
                type="button"
                onClick={handleLogout}
                className="flex items-center gap-2 px-2 py-1.5 text-xs text-rose-600 hover:bg-rose-50 rounded-lg border-none bg-transparent cursor-pointer text-left"
              >
                <LogOut size={13} strokeWidth={2} />
                <span>Log out</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
}
