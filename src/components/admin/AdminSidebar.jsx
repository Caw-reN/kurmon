import React, { useRef, useState, useEffect, useMemo } from 'react';
import { cn } from '@/lib/utils';
import {
  ChevronDown, X, RefreshCw, LogOut, PanelLeftClose, PanelLeftOpen, DatabaseBackup, Settings, Shield,
  LayoutDashboard, Calendar, CalendarDays, ClipboardList, MessageSquare, Trophy, Briefcase, Users, GraduationCap, Building2, Activity, FileText,
  CheckCircle2, FileSpreadsheet, Search, ChevronsUpDown
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

  const [appVersion, setAppVersion] = useState({
    version: typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : 'v2.1.0',
    detail: typeof __GIT_FULL_DETAIL__ !== 'undefined' ? __GIT_FULL_DETAIL__ : 'Update Terbaru'
  });

  useEffect(() => {
    fetch('/api/version')
      .then(r => r.json())
      .then(data => {
        if (data.ok) setAppVersion({ version: data.version, detail: data.detail });
      })
      .catch(() => {});
  }, []);

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
        const activeEl = refToUse.current.querySelector(".bg-primary\\/10, .bg-accent\\/15");
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
      <div className="mt-4 mb-1.5 px-3 flex items-center">
        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
          {label}
        </span>
      </div>
    );
  };

  const SidebarGroup = ({ label, icon: Icon, groupKey, children }) => {
    const isOpen = expandedGroups?.[groupKey] !== false;

    // Cek apakah ada menu anak yang sedang aktif
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
              "flex items-center justify-center rounded-lg border-none transition-all cursor-pointer w-10 h-10",
              hasActiveChild 
                ? "bg-primary/10 text-primary font-bold shadow-2xs" 
                : "text-slate-500 hover:bg-slate-100/80 hover:text-slate-900"
            )}
          >
            {Icon && (
              <Icon 
                size={18} 
                strokeWidth={hasActiveChild ? 2.5 : 2}
                className={cn(hasActiveChild ? "text-primary" : "text-slate-400 group-hover:text-slate-700 transition-colors")} 
              />
            )}
          </button>
          {/* Untitled UI Dark Tooltip */}
          <div className="absolute left-full ml-2.5 top-1/2 -translate-y-1/2 bg-slate-900 text-white text-[11px] font-medium px-2.5 py-1 rounded-md shadow-xl whitespace-nowrap z-50 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity">
            {label}
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
            "group relative flex w-full items-center justify-between rounded-lg border-none",
            "px-3 py-2 text-xs font-semibold transition-all cursor-pointer",
            hasActiveChild 
              ? "text-slate-900 font-bold bg-slate-50/90" 
              : "text-slate-700 hover:bg-slate-100/70 hover:text-slate-900"
          )}
        >
          <div className="flex items-center gap-2.5 min-w-0">
            {Icon && (
              <Icon 
                size={16} 
                strokeWidth={hasActiveChild ? 2.4 : 2}
                className={cn(hasActiveChild ? "text-primary" : "text-slate-400 group-hover:text-slate-700 transition-colors")} 
              />
            )}
            <span className="truncate">{label}</span>
          </div>
          <ChevronDown
            size={14}
            className={cn("text-slate-400 group-hover:text-slate-600 transition-transform duration-200 shrink-0", isOpen ? "rotate-0" : "-rotate-90")}
          />
        </button>
        <div
          className="overflow-hidden transition-[max-height,opacity,margin] duration-300 ease-in-out ml-5 pl-3 border-l border-slate-200/80 flex flex-col gap-0.5 sidebar-submenus relative"
          style={{
            maxHeight: isOpen ? "1000px" : "0px",
            opacity: isOpen ? 1 : 0,
            pointerEvents: isOpen ? "auto" : "none",
            marginTop: isOpen ? "2px" : "0px",
            marginBottom: isOpen ? "2px" : "0px",
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
  // KEPSEK MENU RENDERER — Khusus Kepala Sekolah (Fokus pada Menu Pintasan & Eksekutif)
  // ─────────────────────────────────────────────────────────────────────────────
  const renderKepsekMenu = () => {
    return (
      <>
        {/* UTAMA */}
        {renderNavItem({
          id: 'dashboard',
          icon: LayoutDashboard,
          label: 'Dashboard',
        })}

        {/* MONITORING & KBM */}
        <SidebarSection label="MONITORING & KBM" />
        {renderNavItem({ id: 'generate', icon: Calendar, label: 'Jadwal & KBM' })}
        {renderNavItem({ id: 'laporan_absensi', icon: ClipboardList, label: 'Rekap Kehadiran', activeIds: ['laporan_absensi', 'hikvision_report_guru', 'hikvision_report_karyawan'] })}
        {renderNavItem({ id: 'pesan', icon: MessageSquare, label: 'Pengumuman' })}
        {renderNavItem({ id: 'kedisiplinan_bpbk', icon: Trophy, label: 'Buku BPBK' })}
        {renderNavItem({ id: 'pkl_dashboard', icon: Briefcase, label: 'Dashboard PKL' })}
        {renderNavItem({ id: 'akademik', icon: CalendarDays, label: 'Kalender' })}

        {/* DATA UTAMA */}
        <SidebarSection label="DATA UTAMA" />
        {renderNavItem({ id: 'dataguru', icon: Users, label: 'Data Guru', activeIds: ['dataguru', 'guru', 'data_pegawai', 'karyawan'] })}
        {renderNavItem({ id: 'datasiswa', icon: GraduationCap, label: 'Data Siswa', activeIds: ['datasiswa', 'siswa'] })}
        {renderNavItem({ id: 'dataperusahaan', icon: Building2, label: 'Mitra DUDI', activeIds: ['dataperusahaan', 'pkl_data_perusahaan'] })}
        {renderNavItem({ id: 'riwayat_prestasi', icon: Trophy, label: 'Riwayat Prestasi' })}

        {/* LAPORAN KEHADIRAN */}
        <SidebarSection label="LAPORAN" />
        {renderNavItem({ id: 'hikvision_report_guru', icon: FileText, label: 'Absensi Guru' })}
        {renderNavItem({ id: 'hikvision_report_siswa', icon: FileText, label: 'Absensi Siswa' })}
        {renderNavItem({ id: 'kedisiplinan_absensi', icon: CheckCircle2, label: 'Izin & Sakit Siswa' })}
        {renderNavItem({ id: 'keterangan_massal', icon: FileSpreadsheet, label: 'Keterangan Massal' })}

        {/* LOG AKTIVITAS */}
        <SidebarSection label="AKTIVITAS" />
        {renderNavItem({ id: 'audit_log', icon: Activity, label: 'Log Aktivitas' })}
        {renderNavItem({ id: 'keamanan', icon: Shield, label: 'Keamanan Akun' })}
      </>
    );
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // DYNAMIC MENU RENDERER — reads from MENU_REGISTRY
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

    // For non-admin users: group MENU_REGISTRY by section and render dynamically
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

    // Special: Wali Kelas section (only for pure walas teachers)
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
    // Build group map from registry
    const groupMap = {};
    const rootItems = [];

    for (const item of MENU_REGISTRY) {
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

    // Ordered groups for admin sidebar
    const groupOrder = ['dataMaster', 'tataUsaha', 'kurikulum', 'kesiswaan', 'kehadiran', 'hubin', 'sarpras', 'absensi', 'informasiUmum', 'sistem'];
    const sectionLabels = {
      dataMaster: 'DATA UTAMA',
      tataUsaha: 'MANAJEMEN SEKOLAH',
      kurikulum: null,
      kesiswaan: null,
      kehadiran: null,
      hubin: null,
      sarpras: null,
      absensi: 'PENGATURAN',
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

    // Render any remaining custom/extra groups not in groupOrder so nothing is ever dropped
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
        isCollapsed ? "w-[68px]" : "w-[264px]",
        isMobileMenuOpen ? "fixed inset-y-0 left-0 z-50 shadow-sm translate-x-0" : "hidden lg:flex z-30 -translate-x-full lg:translate-x-0"
      )}
    >
      {/* ─── 1. HEADER (Untitled UI Style) ─── */}
      <div className={cn("flex items-center shrink-0 border-b border-slate-100/90 transition-all", isCollapsed ? "h-[68px] justify-center px-2" : "h-[68px] px-3.5 justify-between")}>
        {!isCollapsed ? (
          <div className="flex items-center justify-between w-full min-w-0 gap-2">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border border-primary/20 flex items-center justify-center shrink-0 overflow-hidden shadow-2xs">
                <img
                  src={appSettings.logoWebUrl || appSettings.logoUrl || appSettings.faviconImage || "/favicon.svg"}
                  alt="Brand Logo"
                  className="w-7 h-7 object-contain"
                />
              </div>
              <div className="flex flex-col min-w-0 select-none">
                <span className="font-bold text-slate-900 text-xs tracking-tight truncate">
                  {appSettings.appName || "KG2 School"}
                </span>
                <span className="text-[10.5px] font-medium text-slate-400 tracking-tight truncate">
                  {appSettings.appSubtitle || appSettings.instansiName || "smkkg2.sch.id"}
                </span>
              </div>
            </div>
            {isMobileMenuOpen ? (
              <button
                type="button"
                onClick={() => setIsMobileMenuOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 bg-slate-100 hover:bg-slate-200/80 rounded-lg lg:hidden border-none cursor-pointer flex items-center justify-center transition-colors"
                title="Tutup Menu"
              >
                <X size={15} strokeWidth={2.5} />
              </button>
            ) : (
              <button
                type="button"
                onClick={toggleSidebar}
                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100/80 rounded-lg hidden lg:flex border-none cursor-pointer items-center justify-center transition-colors shrink-0"
                title="Sembunyikan Sidebar"
              >
                <PanelLeftClose size={15} strokeWidth={2.2} />
              </button>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2">
            <div 
              onClick={toggleSidebar}
              className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border border-primary/20 flex items-center justify-center shrink-0 overflow-hidden cursor-pointer hover:opacity-85 shadow-2xs"
              title="Perluas Sidebar"
            >
              <img
                src={appSettings.logoWebUrl || appSettings.logoUrl || appSettings.faviconImage || "/favicon.svg"}
                alt="Brand Logo"
                className="w-7 h-7 object-contain"
              />
            </div>
          </div>
        )}
      </div>

      {/* ─── 2. SEARCH BAR (Untitled UI Style) ─── */}
      {!isCollapsed ? (
        <div className="px-3 pt-3 pb-1 shrink-0">
          <div className="relative flex items-center">
            <Search size={14} className="absolute left-2.5 text-slate-400 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search"
              className="w-full bg-white border border-slate-200/90 hover:border-slate-300 focus:border-primary pl-8 pr-7 py-1.5 text-xs rounded-lg text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all shadow-2xs font-medium"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-2 text-slate-400 hover:text-slate-600 p-0.5 rounded cursor-pointer border-none bg-transparent"
              >
                <X size={12} />
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="pt-2 pb-1 flex justify-center shrink-0">
          <div className="group relative">
            <button
              type="button"
              onClick={toggleSidebar}
              className="w-10 h-10 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer border-none bg-transparent"
            >
              <Search size={16} />
            </button>
            <div className="absolute left-full ml-2.5 top-1/2 -translate-y-1/2 bg-slate-900 text-white text-[11px] font-medium px-2.5 py-1 rounded-md shadow-xl whitespace-nowrap z-50 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity">
              Cari Menu
            </div>
          </div>
        </div>
      )}

      {/* ─── 3. NAVIGATION (Tree & Accordion) ─── */}
      <nav
        ref={refToUse}
        onScroll={(e) => {
          const scrollTop = e.currentTarget.scrollTop;
          posToUse.current = scrollTop;
          sessionStorage.setItem("admin_sidebar_scroll_top", scrollTop);
        }}
        className={cn("flex-1 overflow-y-auto hide-scrollbar pt-2 pb-4 relative z-10 transition-all", isCollapsed ? "px-2" : "px-3")}
      >
        {searchQuery.trim() ? (
          <div className="flex flex-col gap-1 py-1">
            <div className="px-3 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              Hasil Pencarian ({filteredSearchItems.length})
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
                      "flex items-center justify-between px-3 py-2 text-xs font-semibold rounded-lg text-left transition-colors cursor-pointer border-none",
                      isActive 
                        ? "bg-primary/10 text-primary font-bold shadow-2xs" 
                        : "text-slate-700 hover:bg-slate-100 hover:text-slate-900"
                    )}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className={cn("w-5 h-5 flex items-center justify-center shrink-0", isActive ? "text-primary" : "text-slate-400")}>
                        {item.icon && React.createElement(item.icon, { size: 16, strokeWidth: isActive ? 2.4 : 2 })}
                      </div>
                      <span className="truncate">{item.label}</span>
                    </div>
                    <span className="text-[10px] text-slate-400 font-medium shrink-0 ml-2">
                      {item.adminGroup || item.section || "Menu"}
                    </span>
                  </button>
                );
              })
            ) : (
              <div className="px-3 py-4 text-center text-xs text-slate-400">
                Tidak ada menu yang sesuai dengan "{searchQuery}"
              </div>
            )}
          </div>
        ) : (
          <>
            {renderDynamicMenu()}

            {/* Config access for non-admin with granted config permissions */}
            {hasAnyConfigAccess() && (
              <SidebarGroup label="Konfigurasi Sistem" icon={Settings} groupKey="sistem">
                {renderNavItem({ id: "fitur", icon: MENU_REGISTRY.find(m => m.id === 'fitur')?.icon, label: "Kontrol Fitur" })}
                {renderNavItem({ id: "hak_akses", icon: MENU_REGISTRY.find(m => m.id === 'hak_akses')?.icon, label: "Hak Akses Role" })}
                {renderNavItem({ id: "manajemen_role", icon: MENU_REGISTRY.find(m => m.id === 'manajemen_role')?.icon || Shield, label: "Struktur & Jabatan" })}
                {renderNavItem({ id: "tampilan", icon: MENU_REGISTRY.find(m => m.id === 'tampilan')?.icon, label: "Tampilan Web" })}
                {renderNavItem({ id: "pengaturanuser", icon: MENU_REGISTRY.find(m => m.id === 'hak_akses')?.icon, label: "Pengaturan User" })}
              </SidebarGroup>
            )}
          </>
        )}
      </nav>

      {/* ─── 4. FOOTER / USER PROFILE CARD (Untitled UI Style) ─── */}
      {!isCollapsed ? (
        <div className="p-3 border-t border-slate-200/70 bg-white shrink-0 flex flex-col gap-2">
          {/* User Profile Card */}
          <div 
            onClick={onOpenProfile}
            className="group flex items-center justify-between p-2 rounded-xl border border-slate-200/80 bg-slate-50/50 hover:bg-slate-100/70 hover:border-slate-300 cursor-pointer transition-all shadow-2xs"
            title="Buka Pengaturan Profil & Akun"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-full bg-primary/10 text-primary border border-primary/20 flex items-center justify-center font-bold text-xs shrink-0 overflow-hidden">
                {currentUser?.avatar ? (
                  <img src={currentUser.avatar} alt="User" className="w-full h-full object-cover" />
                ) : (
                  <span>{(currentUser?.name || currentUser?.username || "A").slice(0, 2).toUpperCase()}</span>
                )}
              </div>
              <div className="flex flex-col min-w-0 text-left">
                <span className="font-bold text-xs text-slate-800 truncate">
                  {currentUser?.name || currentUser?.username || "Administrator"}
                </span>
                <span className="text-[10.5px] text-slate-400 truncate font-medium">
                  {currentUser?.email || activeRoleLabel || "admin@school.sch.id"}
                </span>
              </div>
            </div>
            <ChevronsUpDown size={14} className="text-slate-400 group-hover:text-slate-600 shrink-0" />
          </div>

          {/* Quick Action Row: Backup (if admin) & Logout */}
          <div className="flex items-center gap-1.5 pt-0.5">
            {isSuperAdminRole(activeUserRole) && (
              <button
                type="button"
                onClick={handleBackupExport}
                disabled={isBackingUp}
                className="flex-1 flex items-center justify-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold text-slate-650 hover:text-slate-900 bg-slate-100 hover:bg-slate-200/80 rounded-lg transition-colors cursor-pointer border-none disabled:opacity-50"
                title="Backup Database"
              >
                {isBackingUp ? <RefreshCw size={12} className="animate-spin" /> : <DatabaseBackup size={12} />}
                <span>{isBackingUp ? "Backup..." : "Backup"}</span>
              </button>
            )}
            <button
              type="button"
              onClick={handleLogout}
              className="flex items-center justify-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 rounded-lg transition-colors cursor-pointer border-none flex-1"
              title="Keluar dari akun"
            >
              <LogOut size={12} strokeWidth={2.4} />
              <span>Keluar</span>
            </button>
          </div>

          {/* App Version Info */}
          {isSuperAdminRole(activeUserRole) && (
            <div className="text-[9.5px] text-center font-medium text-slate-400 cursor-default px-1 leading-tight flex items-center justify-center gap-1.5 pt-0.5">
              <span className="font-bold text-slate-500">{appVersion.version}</span>
              <span>•</span>
              <span className="truncate max-w-[120px]">{appVersion.detail}</span>
            </div>
          )}
        </div>
      ) : (
        <div className="p-2 border-t border-slate-200/70 bg-white shrink-0 flex flex-col items-center gap-2">
          {/* User Profile Avatar with Tooltip */}
          <div className="group relative">
            <button
              type="button"
              onClick={onOpenProfile}
              className="w-9 h-9 rounded-full bg-primary/10 text-primary border border-primary/20 flex items-center justify-center font-bold text-xs cursor-pointer hover:ring-2 hover:ring-primary/20 transition-all overflow-hidden"
            >
              {currentUser?.avatar ? (
                <img src={currentUser.avatar} alt="User" className="w-full h-full object-cover" />
              ) : (
                <span>{(currentUser?.name || currentUser?.username || "A").slice(0, 2).toUpperCase()}</span>
              )}
            </button>
            <div className="absolute left-full ml-2.5 top-1/2 -translate-y-1/2 bg-slate-900 text-white text-[11px] font-medium px-2.5 py-1 rounded-md shadow-xl whitespace-nowrap z-50 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity">
              {currentUser?.name || "Profil Akun"}
            </div>
          </div>

          {/* Backup Button in Collapsed Mode */}
          {isSuperAdminRole(activeUserRole) && (
            <div className="group relative">
              <button
                type="button"
                onClick={handleBackupExport}
                disabled={isBackingUp}
                className="w-9 h-9 flex items-center justify-center rounded-lg text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 transition-colors cursor-pointer border-none bg-transparent disabled:opacity-50"
              >
                {isBackingUp ? <RefreshCw size={15} className="animate-spin" /> : <DatabaseBackup size={15} />}
              </button>
              <div className="absolute left-full ml-2.5 top-1/2 -translate-y-1/2 bg-slate-900 text-white text-[11px] font-medium px-2.5 py-1 rounded-md shadow-xl whitespace-nowrap z-50 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity">
                Backup Data
              </div>
            </div>
          )}

          {/* Logout Button with Tooltip */}
          <div className="group relative">
            <button
              type="button"
              onClick={handleLogout}
              className="w-9 h-9 flex items-center justify-center rounded-lg bg-rose-50 text-rose-600 hover:bg-rose-100 transition-colors cursor-pointer border-none"
            >
              <LogOut size={15} />
            </button>
            <div className="absolute left-full ml-2.5 top-1/2 -translate-y-1/2 bg-slate-900 text-white text-[11px] font-medium px-2.5 py-1 rounded-md shadow-xl whitespace-nowrap z-50 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity">
              Keluar Sistem
            </div>
          </div>
        </div>
      )}
    </aside>
  );
}
