import React, { useRef, useState, useEffect, useMemo } from 'react';
import { cn } from '@/lib/utils';
import {
  ChevronDown, X, RefreshCw, LogOut, PanelLeftClose, PanelLeftOpen, DatabaseBackup, Settings, Shield,
  LayoutDashboard, Calendar, CalendarDays, ClipboardList, MessageSquare, Trophy, Briefcase, Users, GraduationCap, Building2, Activity, FileText,
  CheckCircle2, FileSpreadsheet, Search, Plus, Bell, ChevronRight, User
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
  const [showQuickActions, setShowQuickActions] = useState(false);
  const searchInputRef = useRef(null);
  const quickActionRef = useRef(null);

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

  // Click outside to close quick action menu
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (quickActionRef.current && !quickActionRef.current.contains(e.target)) {
        setShowQuickActions(false);
      }
    };
    if (showQuickActions) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showQuickActions]);

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
        const activeEl = refToUse.current.querySelector(".bg-slate-100, .bg-primary\\/10");
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
    if (isCollapsed) {
      return (
        <div className="mt-3 mb-1 w-full flex justify-center">
          <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider text-center">
            {label}
          </span>
        </div>
      );
    }
    return (
      <div className="mt-3.5 mb-1 px-3 flex items-center">
        <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">
          {label}
        </span>
      </div>
    );
  };

  const SidebarGroup = ({ label, icon: Icon, groupKey, children }) => {
    const isOpen = expandedGroups?.[groupKey] !== false;
    const [isHoveredFlyout, setIsHoveredFlyout] = useState(false);

    // Cek apakah ada menu anak yang sedang aktif
    const hasActiveChild = React.Children.toArray(children).some(child => {
      if (!React.isValidElement(child)) return false;
      const childId = child.props?.id;
      const childActiveIds = child.props?.activeIds;
      return childId === activeTab || (Array.isArray(childActiveIds) && childActiveIds.includes(activeTab));
    });

    if (isCollapsed) {
      return (
        <div 
          className="mb-1 w-full flex justify-center group relative"
          onMouseEnter={() => setIsHoveredFlyout(true)}
          onMouseLeave={() => setIsHoveredFlyout(false)}
        >
          <button
            onClick={() => {
              toggleSidebar();
              if (!isOpen) toggleGroup(groupKey);
            }}
            type="button"
            className={cn(
              "flex items-center justify-center rounded-lg border-none transition-all cursor-pointer w-9 h-9",
              hasActiveChild 
                ? "bg-slate-100 text-slate-900 font-bold shadow-2xs" 
                : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
            )}
          >
            {Icon && (
              <Icon 
                size={18} 
                strokeWidth={hasActiveChild ? 2.4 : 2}
                className={cn(hasActiveChild ? "text-slate-900" : "text-slate-500 group-hover:text-slate-800 transition-colors")} 
              />
            )}
          </button>

          {/* Dark Tooltip Label (Reference Image Style) */}
          <div className="absolute left-full ml-2.5 top-1.5 bg-slate-900 text-white text-[11px] font-semibold px-2.5 py-1 rounded-md shadow-xl whitespace-nowrap z-50 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity">
            {label}
          </div>

          {/* Flyout Submenu Card in Collapsed Mode (Exact Reference Image Style) */}
          {isHoveredFlyout && (
            <div className="absolute left-full ml-2 top-7 bg-white rounded-xl border border-slate-200/90 shadow-2xl p-1.5 min-w-[150px] z-50 flex flex-col gap-0.5 animate-in fade-in zoom-in-95 duration-150">
              <div className="px-2.5 py-1 text-[10.5px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100 mb-1">
                {label}
              </div>
              {React.Children.map(children, (child) => {
                if (React.isValidElement(child)) {
                  return React.cloneElement(child, { isSubMenu: true, collapsed: false });
                }
                return child;
              })}
            </div>
          )}
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
            isOpen 
              ? "text-slate-900 font-bold bg-slate-50/90" 
              : hasActiveChild 
                ? "text-slate-900 font-bold bg-slate-50/60" 
                : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
          )}
        >
          <div className="flex items-center gap-2.5 min-w-0">
            {Icon && (
              <Icon 
                size={16} 
                strokeWidth={hasActiveChild ? 2.4 : 2}
                className={cn(hasActiveChild ? "text-slate-900" : "text-slate-500 group-hover:text-slate-800 transition-colors")} 
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
          className="overflow-hidden transition-[max-height,opacity,margin] duration-300 ease-in-out ml-4 pl-3.5 border-l border-slate-200 flex flex-col gap-0.5 sidebar-submenus relative"
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
      if (item.id === 'pesan') continue; // Handled as Notifications item
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
      if (item.id === 'pesan') continue; // Handled separately as Notifications
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
        {renderNavItem({ id: 'dashboard', icon: MENU_REGISTRY.find(m => m.id === 'dashboard')?.icon || LayoutDashboard, label: 'Dashboard' })}
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
      {/* ─── 1. HEADER LOGO (Smart Reference Style) ─── */}
      <div className={cn("flex items-center shrink-0 border-b border-slate-100 transition-all", isCollapsed ? "h-[64px] justify-center px-2" : "h-[64px] px-3.5 justify-between")}>
        {!isCollapsed ? (
          <div className="flex items-center justify-between w-full min-w-0 gap-2">
            <div className="flex items-center gap-2.5 min-w-0">
              {/* Geometric / Butterfly Logo Shape */}
              <div className="w-8 h-8 rounded-lg bg-[#1e293b] text-white flex items-center justify-center font-black shadow-xs shrink-0 p-1.5">
                {appSettings.logoWebUrl || appSettings.logoUrl ? (
                  <img
                    src={appSettings.logoWebUrl || appSettings.logoUrl}
                    alt="Brand Logo"
                    className="w-full h-full object-contain filter invert"
                  />
                ) : (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-5 h-5 text-white">
                    <path d="M12 3c-4.97 0-9 4.03-9 9 0 2.12.74 4.07 1.97 5.61L12 12V3z" fill="currentColor" fillOpacity="0.8" />
                    <path d="M12 3c4.97 0 9 4.03 9 9 0 2.12-.74 4.07-1.97 5.61L12 12V3z" fill="currentColor" />
                    <path d="M12 21c-4.97 0-9-4.03-9-9 0-2.12.74-4.07 1.97-5.61L12 12v9z" fill="currentColor" />
                    <path d="M12 21c4.97 0 9-4.03 9-9 0-2.12-.74-4.07-1.97-5.61L12 12v9z" fill="currentColor" fillOpacity="0.8" />
                  </svg>
                )}
              </div>
              <div className="flex flex-col min-w-0 select-none">
                <span className="font-black text-slate-900 text-sm tracking-widest uppercase truncate">
                  {appSettings.appName || "SMART"}
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
              className="w-8 h-8 rounded-lg bg-[#1e293b] text-white flex items-center justify-center font-black shadow-xs shrink-0 cursor-pointer p-1.5 hover:opacity-90 transition-opacity"
              title="Perluas Sidebar"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-5 h-5 text-white">
                <path d="M12 3c-4.97 0-9 4.03-9 9 0 2.12.74 4.07 1.97 5.61L12 12V3z" fill="currentColor" fillOpacity="0.8" />
                <path d="M12 3c4.97 0 9 4.03 9 9 0 2.12-.74 4.07-1.97 5.61L12 12V3z" fill="currentColor" />
                <path d="M12 21c-4.97 0-9-4.03-9-9 0-2.12.74-4.07 1.97-5.61L12 12v9z" fill="currentColor" />
                <path d="M12 21c4.97 0 9-4.03 9-9 0-2.12-.74-4.07-1.97-5.61L12 12v9z" fill="currentColor" fillOpacity="0.8" />
              </svg>
            </div>
          </div>
        )}
      </div>

      {/* ─── 2. PRIMARY ACTION BUTTON (+ New Report Style) ─── */}
      <div className="px-3 pt-3 pb-1 shrink-0 relative" ref={quickActionRef}>
        {!isCollapsed ? (
          <div>
            <button
              type="button"
              onClick={() => setShowQuickActions(prev => !prev)}
              className="w-full bg-[#1e293b] hover:bg-[#0f172a] text-white font-semibold text-xs py-2 px-3 rounded-xl flex items-center justify-center gap-2 shadow-xs transition-colors cursor-pointer border-none"
            >
              <Plus size={14} strokeWidth={2.5} />
              <span>+ Aksi Cepat KBM</span>
            </button>

            {/* Quick Actions Dropdown */}
            {showQuickActions && (
              <div className="absolute top-full left-3 right-3 mt-1.5 bg-white rounded-xl border border-slate-200 shadow-xl p-1.5 z-50 animate-in fade-in zoom-in-95 duration-150 flex flex-col gap-0.5">
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('generate');
                    setShowQuickActions(false);
                  }}
                  className="flex items-center gap-2 px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:text-slate-900 hover:bg-slate-100 rounded-lg text-left transition-colors border-none cursor-pointer"
                >
                  <Calendar size={13} className="text-slate-400" />
                  <span>Jadwal Pelajaran</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('jurnal_harian');
                    setShowQuickActions(false);
                  }}
                  className="flex items-center gap-2 px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:text-slate-900 hover:bg-slate-100 rounded-lg text-left transition-colors border-none cursor-pointer"
                >
                  <FileText size={13} className="text-slate-400" />
                  <span>Jurnal Mengajar Guru</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('laporan_absensi');
                    setShowQuickActions(false);
                  }}
                  className="flex items-center gap-2 px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:text-slate-900 hover:bg-slate-100 rounded-lg text-left transition-colors border-none cursor-pointer"
                >
                  <ClipboardList size={13} className="text-slate-400" />
                  <span>Rekap Absensi Harian</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('pesan');
                    setShowQuickActions(false);
                  }}
                  className="flex items-center gap-2 px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:text-slate-900 hover:bg-slate-100 rounded-lg text-left transition-colors border-none cursor-pointer"
                >
                  <MessageSquare size={13} className="text-slate-400" />
                  <span>Pengumuman Baru</span>
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="flex justify-center">
            <button
              type="button"
              onClick={toggleSidebar}
              className="w-10 h-7 bg-[#1e293b] hover:bg-[#0f172a] text-white font-bold text-xs rounded-lg flex items-center justify-center shadow-xs transition-colors cursor-pointer border-none"
              title="Aksi Cepat"
            >
              <Plus size={14} strokeWidth={2.5} />
            </button>
          </div>
        )}
      </div>

      {/* ─── 3. NAVIGATION SECTION (Menu) ─── */}
      <SidebarSection label="Menu" />

      <nav
        ref={refToUse}
        onScroll={(e) => {
          const scrollTop = e.currentTarget.scrollTop;
          posToUse.current = scrollTop;
          sessionStorage.setItem("admin_sidebar_scroll_top", scrollTop);
        }}
        className={cn("flex-1 overflow-y-auto hide-scrollbar pt-1 pb-4 relative z-10 transition-all", isCollapsed ? "px-2" : "px-3")}
      >
        {renderDynamicMenu()}

        {/* Notifications (Reports/Notifications in reference image) */}
        {checkIsAllowed('pesan', 'pesan') && (
          renderNavItem({
            id: 'pesan',
            icon: Bell,
            label: 'Notifications',
            badge: '2',
            badgeColor: 'bg-emerald-600 text-white'
          })
        )}

        {/* Settings item (Settings in reference image) */}
        {renderNavItem({
          id: 'pengaturan',
          icon: Settings,
          label: 'Settings',
        })}

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
      </nav>

      {/* ─── 4. BOTTOM PROFILE SECTION (Smart Reference Style) ─── */}
      <div className="border-t border-slate-100 bg-white shrink-0">
        <SidebarSection label="Profile" />
        
        {!isCollapsed ? (
          <div className="px-3 pb-3 pt-1 flex flex-col gap-2">
            {/* User row */}
            <div 
              onClick={onOpenProfile}
              className="flex items-center gap-2.5 cursor-pointer hover:opacity-85 transition-opacity px-1"
              title="Buka Pengaturan Profil"
            >
              <div className="w-8 h-8 rounded-full border border-slate-200 overflow-hidden bg-slate-100 flex items-center justify-center font-bold text-xs text-slate-700 shrink-0">
                {currentUser?.avatar ? (
                  <img src={currentUser.avatar} alt="User" className="w-full h-full object-cover" />
                ) : (
                  <span>{(currentUser?.name || currentUser?.username || "O").slice(0, 2).toUpperCase()}</span>
                )}
              </div>
              <div className="flex flex-col min-w-0 text-left">
                <span className="font-bold text-xs text-slate-800 truncate">
                  {currentUser?.name || currentUser?.username || "Omotolani"}
                </span>
                <span className="text-[11px] text-slate-400 font-medium truncate">
                  {currentUser?.email || activeRoleLabel || "omotolani@example.com"}
                </span>
              </div>
            </div>

            {/* Standalone Log Out Button (Exact Reference Style) */}
            <button
              type="button"
              onClick={handleLogout}
              className="border border-slate-200/90 bg-white hover:bg-slate-50 hover:border-slate-300 text-slate-700 hover:text-slate-900 text-xs font-semibold py-1.5 px-3 rounded-lg w-full flex items-center justify-center gap-2 shadow-2xs transition-colors cursor-pointer"
            >
              <LogOut size={13} strokeWidth={2.2} />
              <span>Log out</span>
            </button>

            {/* Backup for superadmin */}
            {isSuperAdminRole(activeUserRole) && (
              <button
                type="button"
                onClick={handleBackupExport}
                disabled={isBackingUp}
                className="text-[10.5px] font-semibold text-slate-400 hover:text-slate-600 flex items-center justify-center gap-1.5 py-0.5 border-none bg-transparent cursor-pointer disabled:opacity-50"
              >
                {isBackingUp ? <RefreshCw size={11} className="animate-spin" /> : <DatabaseBackup size={11} />}
                <span>{isBackingUp ? "Membackup..." : "Backup Data"}</span>
              </button>
            )}
          </div>
        ) : (
          <div className="pb-3 pt-1 flex flex-col items-center gap-2">
            {/* Centered avatar */}
            <div 
              onClick={onOpenProfile}
              className="w-8 h-8 rounded-full border border-slate-200 overflow-hidden bg-slate-100 flex items-center justify-center font-bold text-xs text-slate-700 cursor-pointer hover:ring-2 hover:ring-slate-300 transition-all shrink-0"
              title={currentUser?.name || "Profil"}
            >
              {currentUser?.avatar ? (
                <img src={currentUser.avatar} alt="User" className="w-full h-full object-cover" />
              ) : (
                <span>{(currentUser?.name || currentUser?.username || "O").slice(0, 2).toUpperCase()}</span>
              )}
            </div>

            {/* Centered logout button */}
            <button
              type="button"
              onClick={handleLogout}
              className="w-8 h-8 rounded-lg border border-slate-200/80 bg-white hover:bg-slate-50 text-slate-600 hover:text-slate-900 flex items-center justify-center transition-colors cursor-pointer shadow-2xs"
              title="Log out"
            >
              <LogOut size={13} strokeWidth={2.2} />
            </button>
          </div>
        )}
      </div>
    </aside>
  );
}
