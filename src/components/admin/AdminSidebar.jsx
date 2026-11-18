import React, { useRef, useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '@/lib/utils';
import {
  ChevronDown, X, RefreshCw, LogOut, PanelLeftClose, PanelLeftOpen, DatabaseBackup, Settings, Shield,
  LayoutDashboard, Calendar, CalendarDays, ClipboardList, MessageSquare, Trophy, Briefcase, Users, GraduationCap, Building2, Activity, FileText,
  CheckCircle2, FileSpreadsheet, Search, ChevronsUpDown, User, ArrowDown, ArrowUp
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
  setExpandedGroups,
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
  const [canScrollDown, setCanScrollDown] = useState(false);
  const [canScrollUp, setCanScrollUp] = useState(false);
  const [hoveredTooltip, setHoveredTooltip] = useState(null);

  // Mouse hover event delegation for instant, high-performance tooltips in collapsed mode
  const handleSidebarMouseMove = (e) => {
    if (!isCollapsed) {
      if (hoveredTooltip) setHoveredTooltip(null);
      return;
    }
    const target = e.target.closest('[data-sidebar-tooltip]');
    if (target) {
      const label = target.getAttribute('data-sidebar-tooltip');
      const rect = target.getBoundingClientRect();
      const newTop = rect.top + rect.height / 2;
      const newLeft = rect.right + 10;

      if (!hoveredTooltip || hoveredTooltip.label !== label || Math.abs(hoveredTooltip.top - newTop) > 3) {
        setHoveredTooltip({
          label,
          top: newTop,
          left: newLeft,
        });
      }
    } else {
      if (hoveredTooltip) setHoveredTooltip(null);
    }
  };

  const handleSidebarMouseLeave = () => {
    setHoveredTooltip(null);
  };

  const [appVersion, setAppVersion] = useState({
    version: typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : 'v2.1.0',
    commit: '',
    date: '',
    time: '',
    detail: typeof __GIT_FULL_DETAIL__ !== 'undefined' ? __GIT_FULL_DETAIL__ : 'Update Sistem Terkini'
  });

  useEffect(() => {
    fetch('/api/version')
      .then(r => r.json())
      .then(data => {
        if (data.ok) {
          setAppVersion({
            version: data.version || 'v2.1.0',
            commit: data.commit || '',
            date: data.date || '',
            time: data.time || '',
            detail: data.detail || `Update ${data.date || ''} (${data.commit || ''})`
          });
        }
      })
      .catch(() => { });
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

  // Helper to check whether content overflows and can scroll down/up
  const checkScrollState = () => {
    const el = refToUse.current;
    if (!el) return;
    const hasOverflow = el.scrollHeight > el.clientHeight + 10;
    setCanScrollUp(hasOverflow && el.scrollTop > 30);
    setCanScrollDown(hasOverflow && el.scrollTop + el.clientHeight < el.scrollHeight - 30);
  };

  useEffect(() => {
    const timer = setTimeout(checkScrollState, 150);
    const el = refToUse.current;
    if (!el) return () => clearTimeout(timer);
    const handleResize = () => checkScrollState();
    window.addEventListener('resize', handleResize);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', handleResize);
    };
  }, [expandedGroups, searchQuery, activeTab, isCollapsed]);

  // Keyboard navigation handler inside the navigation panel
  const handleNavKeyDown = (e) => {
    const el = refToUse.current;
    if (!el) return;
    if (e.key === 'ArrowDown') {
      el.scrollBy({ top: 60, behavior: 'smooth' });
      e.preventDefault();
    } else if (e.key === 'ArrowUp') {
      el.scrollBy({ top: -60, behavior: 'smooth' });
      e.preventDefault();
    } else if (e.key === 'PageDown') {
      el.scrollBy({ top: el.clientHeight * 0.75, behavior: 'smooth' });
      e.preventDefault();
    } else if (e.key === 'PageUp') {
      el.scrollBy({ top: -el.clientHeight * 0.75, behavior: 'smooth' });
      e.preventDefault();
    } else if (e.key === 'Home') {
      el.scrollTo({ top: 0, behavior: 'smooth' });
      e.preventDefault();
    } else if (e.key === 'End') {
      el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
      e.preventDefault();
    }
  };

  const allGroupKeys = useMemo(() => [
    'dataMaster', 'tataUsaha', 'kurikulum', 'kesiswaan', 'kehadiran', 'hubin', 'sarpras', 'absensi', 'informasiUmum', 'sistem'
  ], []);

  const isAnyGroupOpen = useMemo(() => {
    if (!expandedGroups) return false;
    return allGroupKeys.some(key => expandedGroups[key] !== false);
  }, [expandedGroups, allGroupKeys]);

  const handleToggleAllGroups = () => {
    const nextState = !isAnyGroupOpen;
    if (typeof setExpandedGroups === 'function') {
      setExpandedGroups(prev => {
        const next = { ...(prev || {}) };
        allGroupKeys.forEach(k => {
          next[k] = nextState;
        });
        return next;
      });
    } else if (typeof toggleGroup === 'function') {
      allGroupKeys.forEach(k => {
        toggleGroup(k, nextState);
      });
    }
  };

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
        <div className="mb-1 w-full flex justify-center">
          <button
            onClick={() => {
              toggleSidebar();
              if (!isOpen) toggleGroup(groupKey);
            }}
            type="button"
            data-sidebar-tooltip={label}
            aria-label={label}
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
          className="overflow-hidden transition-[max-height,opacity,margin] duration-300 ease-in-out ml-5 pl-3 border-l border-slate-200/90 flex flex-col gap-0.5 sidebar-submenus relative"
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
      onMouseMove={handleSidebarMouseMove}
      onMouseLeave={handleSidebarMouseLeave}
      className={cn(
        "app-sidebar border-r border-slate-200/80 bg-white flex flex-col shrink-0 relative transition-all duration-300 ease-in-out rounded-none !rounded-none select-none h-full max-h-screen overflow-hidden",
        isCollapsed ? "w-[68px]" : "w-[264px]",
        isMobileMenuOpen ? "fixed inset-y-0 left-0 z-50 shadow-sm translate-x-0" : "hidden lg:flex z-30 -translate-x-full lg:translate-x-0"
      )}
    >
      {/* ─── 1. HEADER (Untitled UI Style) ─── */}
      <div className={cn("flex items-center shrink-0 border-b border-slate-100 transition-all", isCollapsed ? "h-[68px] justify-center px-2" : "h-[68px] px-3.5 justify-between")}>
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
              data-sidebar-tooltip={appSettings.appName || "KG2 School"}
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

      {/* ─── 2. SEARCH BAR WITH SHORTCUT BADGE (Untitled UI Style) ─── */}
      {!isCollapsed ? (
        <div className="px-3 pt-3 pb-1 shrink-0 flex flex-col gap-1.5">
          <div className="relative flex items-center">
            <Search size={14} className="absolute left-2.5 text-slate-400 pointer-events-none" />
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search"
              className="w-full bg-white border border-slate-200/90 hover:border-slate-300 focus:border-primary pl-8 pr-12 py-1.5 text-xs rounded-lg text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/15 transition-all shadow-2xs font-medium"
            />
            <div className="absolute right-2 flex items-center gap-1">
              {searchQuery ? (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="text-slate-400 hover:text-slate-600 p-0.5 rounded cursor-pointer border-none bg-transparent"
                >
                  <X size={12} />
                </button>
              ) : (
                <kbd className="hidden sm:inline-block text-[9.5px] font-semibold text-slate-400 bg-slate-100 border border-slate-200/80 px-1.5 py-0.5 rounded">
                  ⌘K
                </kbd>
              )}
            </div>
          </div>

          {/* Quick Collapse / Expand Micro Bar */}
          {!searchQuery.trim() && (
            <div className="flex items-center justify-between px-1 pt-1 text-slate-400 select-none">
              <span className="font-bold uppercase tracking-wider text-[9.5px] text-slate-400">
                Daftar Menu
              </span>
              <button
                type="button"
                onClick={handleToggleAllGroups}
                className="text-[10px] font-semibold text-slate-500 hover:text-primary hover:bg-slate-100/90 px-1.5 py-0.5 rounded transition-colors flex items-center gap-1 cursor-pointer border-none bg-transparent active:scale-95"
                title={isAnyGroupOpen ? "Tutup semua sub-menu agar ringkas" : "Buka semua sub-menu"}
              >
                <ChevronsUpDown size={11} strokeWidth={2.4} className="text-slate-400" />
                <span>{isAnyGroupOpen ? "Tutup Semua" : "Buka Semua"}</span>
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="pt-2 pb-1 flex justify-center shrink-0">
          <button
            type="button"
            onClick={toggleSidebar}
            data-sidebar-tooltip="Cari Menu (⌘K)"
            aria-label="Cari Menu"
            className="w-10 h-10 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer border-none bg-transparent"
          >
            <Search size={16} />
          </button>
        </div>
      )}

      {/* ─── 3. NAVIGATION LIST (Tree & Accordion with Smooth Draggable Scrollbar) ─── */}
      <div className="relative flex-1 flex flex-col min-h-0 overflow-hidden">
        <nav
          ref={refToUse}
          tabIndex={0}
          onKeyDown={handleNavKeyDown}
          onScroll={(e) => {
            const scrollTop = e.currentTarget.scrollTop;
            posToUse.current = scrollTop;
            sessionStorage.setItem("admin_sidebar_scroll_top", scrollTop);
            checkScrollState();
          }}
          className={cn(
            "flex-1 overflow-y-auto overflow-x-hidden sidebar-scrollbar custom-scrollbar pt-1.5 pb-20 relative z-10 transition-all focus:outline-none",
            isCollapsed ? "px-2" : "px-3"
          )}
          title="Gunakan tombol panah keyboard atau seret scrollbar untuk menggulir"
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

        {/* Floating Quick Scroll to Bottom Indicator */}
        {canScrollDown && !isCollapsed && (
          <div className="absolute bottom-3 left-0 right-0 z-20 flex justify-center pointer-events-none">
            <button
              type="button"
              onClick={() => {
                refToUse.current?.scrollTo({ top: refToUse.current.scrollHeight, behavior: 'smooth' });
              }}
              className="pointer-events-auto flex items-center gap-1.5 px-3 py-1 bg-slate-900/90 hover:bg-slate-900 text-white text-[10.5px] font-semibold rounded-full shadow-lg backdrop-blur-xs border border-slate-700/60 cursor-pointer transition-all hover:scale-105 active:scale-95 animate-fade-in"
              title="Klik untuk melompat ke bagian menu paling bawah"
            >
              <ArrowDown size={12} strokeWidth={2.5} className="animate-bounce" />
              <span>Gulir ke Bawah</span>
            </button>
          </div>
        )}

        {/* Floating Quick Scroll to Top Indicator */}
        {!canScrollDown && canScrollUp && !isCollapsed && (
          <div className="absolute bottom-3 left-0 right-0 z-20 flex justify-center pointer-events-none">
            <button
              type="button"
              onClick={() => {
                refToUse.current?.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className="pointer-events-auto flex items-center gap-1.5 px-3 py-1 bg-slate-800/90 hover:bg-slate-900 text-slate-100 text-[10.5px] font-semibold rounded-full shadow-lg backdrop-blur-xs border border-slate-700/60 cursor-pointer transition-all hover:scale-105 active:scale-95 animate-fade-in"
              title="Klik untuk kembali ke menu paling atas"
            >
              <ArrowUp size={12} strokeWidth={2.5} />
              <span>Kembali ke Atas</span>
            </button>
          </div>
        )}
      </div>

      {/* ─── 4. BOTTOM BAR: BACKUP, PROMINENT LOGOUT & DETAILED VERSION ─── */}
      {!isCollapsed ? (
        <div className="p-3 border-t border-slate-200/80 bg-slate-50/40 shrink-0 flex flex-col gap-2 relative">
          {/* Quick Action: Backup (Admin Only) */}
          {isSuperAdminRole(activeUserRole) && (
            <button
              type="button"
              onClick={handleBackupExport}
              disabled={isBackingUp}
              className="w-full flex items-center justify-center gap-2 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:text-slate-900 bg-white hover:bg-slate-50 border border-slate-200/70 rounded-xl transition-all cursor-pointer shadow-2xs disabled:opacity-50"
              title="Backup & Export Database"
            >
              {isBackingUp ? <RefreshCw size={13} className="animate-spin text-primary" /> : <DatabaseBackup size={13} className="text-slate-500" />}
              <span>{isBackingUp ? "Membackup Data..." : "Backup Database"}</span>
            </button>
          )}

          {/* Clear, Highly Visible, Prominent Logout Button */}
          <button
            type="button"
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 text-xs font-bold text-rose-600 hover:text-white bg-rose-50 hover:bg-rose-600 border border-rose-200/80 hover:border-rose-600 rounded-xl transition-all cursor-pointer shadow-2xs active:scale-[0.98]"
            title="Keluar dari akun aplikasi"
          >
            <LogOut size={14} strokeWidth={2.4} />
            <span>Keluar Sistem</span>
          </button>

          {/* Detailed & Clear Version / Update Section */}
          <div className="pt-2 border-t border-slate-200/60 flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                <span className="text-[11px] font-bold text-slate-700 tracking-tight">Sistem Aktif</span>
              </div>
              <span className="font-mono text-emerald-700 font-bold bg-emerald-50 border border-emerald-200/80 px-2 py-0.5 rounded-full text-[10px] shadow-2xs">
                {appVersion.version}
              </span>
            </div>
            <div className="bg-white border border-slate-200/70 rounded-lg px-2.5 py-1.5 flex flex-col gap-0.5 shadow-2xs">
              <div className="flex items-center justify-between text-[10px]">
                <span className="text-slate-400 font-medium">Versi Pembaruan:</span>
                <span className="font-mono text-slate-700 font-bold">{appVersion.commit ? `#${appVersion.commit}` : 'Terbaru'}</span>
              </div>
              <div className="text-[10px] text-slate-500 font-medium truncate" title={appVersion.detail}>
                {appVersion.date ? `${appVersion.date}, ${appVersion.time || ''}` : appVersion.detail}
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="p-2 border-t border-slate-200/80 bg-slate-50/40 shrink-0 flex flex-col items-center gap-2 relative">
          {/* Dedicated Visible Logout Button in Collapsed Mode */}
          <button
            type="button"
            onClick={handleLogout}
            data-sidebar-tooltip="Keluar Sistem"
            aria-label="Keluar Sistem"
            className="w-10 h-10 flex items-center justify-center rounded-xl bg-rose-50 text-rose-600 hover:bg-rose-600 hover:text-white border border-rose-200/80 transition-all cursor-pointer active:scale-95 shadow-2xs"
            title="Keluar Sistem"
          >
            <LogOut size={16} strokeWidth={2.4} />
          </button>

          {/* Detailed Version Status Indicator in Collapsed Mode */}
          <div
            data-sidebar-tooltip={`Versi ${appVersion.version} (${appVersion.commit ? '#' + appVersion.commit : 'Terbaru'})`}
            className="w-8 h-8 rounded-lg bg-emerald-50 border border-emerald-200/80 flex items-center justify-center cursor-default"
          >
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
          </div>
        </div>
      )}

      {/* ─── 5. FLOATING PORTAL TOOLTIP FOR COLLAPSED SIDEBAR (Untitled UI Style) ─── */}
      {hoveredTooltip && isCollapsed && typeof document !== 'undefined' && createPortal(
        <div
          className="fixed z-[99999] pointer-events-none transition-all duration-150 ease-out flex items-center"
          style={{
            top: `${hoveredTooltip.top}px`,
            left: `${hoveredTooltip.left}px`,
            transform: 'translateY(-50%)',
          }}
        >
          <div className="relative bg-slate-900 text-white text-xs font-semibold px-2.5 py-1.5 rounded-lg shadow-2xl border border-slate-700/80 backdrop-blur-md whitespace-nowrap flex items-center gap-1.5 animate-in fade-in-0 zoom-in-95 duration-100">
            {/* Left triangle pointer arrow pointing directly to the icon */}
            <div className="absolute -left-1 top-1/2 -translate-y-1/2 w-2 h-2 bg-slate-900 border-l border-b border-slate-700/80 rotate-45 pointer-events-none" />
            <span>{hoveredTooltip.label}</span>
          </div>
        </div>,
        document.body
      )}
    </aside>
  );
}
