import React, { useRef, useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '@/lib/utils';
import {
  ChevronDown, X, RefreshCw, LogOut, ChevronsLeft, ChevronsRight, DatabaseBackup, Settings, Shield,
  LayoutDashboard, Calendar, CalendarDays, ClipboardList, MessageSquare, Trophy, Briefcase, Users, GraduationCap, Building2, Activity, FileText,
  CheckCircle2, FileSpreadsheet, Search, ChevronsUpDown, User,
  BookOpen, Clock, Cpu, HardDrive, Palette, Database, FolderOpen
} from 'lucide-react';
import { MENU_REGISTRY } from '@/utils/menuRegistry';
import { normalizeUserRole } from '@/utils/constants';

const SECTION_METADATA = {
  'Jadwal & Agenda': { key: 'jadwal_agenda', icon: Calendar, label: 'Jadwal & Agenda' },
  'Pembelajaran': { key: 'pembelajaran', icon: BookOpen, label: 'Pembelajaran' },
  'Wali Kelas': { key: 'wali_kelas', icon: GraduationCap, label: 'Wali Kelas' },
  'Kehadiran': { key: 'kehadiran', icon: Clock, label: 'Kehadiran' },
  'Kesiswaan': { key: 'kesiswaan', icon: Users, label: 'Kesiswaan' },
  'Data Master': { key: 'data_master', icon: Database, label: 'Data Master' },
  'Administrasi': { key: 'administrasi', icon: FileText, label: 'Administrasi' },
  'PKL & Hubin': { key: 'pkl_hubin', icon: Briefcase, label: 'PKL & Hubin' },
  'Sarana & Prasarana': { key: 'sarpras', icon: Building2, label: 'Sarana & Prasarana' },
  'Mesin Absensi': { key: 'mesin_absensi', icon: Cpu, label: 'Mesin Absensi' },
  'Tampilan': { key: 'tampilan', icon: Palette, label: 'Tampilan Web' },
  'Aktivitas': { key: 'aktivitas', icon: Activity, label: 'Aktivitas' },
  'Komunikasi': { key: 'komunikasi', icon: MessageSquare, label: 'Komunikasi' },
  'Pengaturan': { key: 'pengaturan', icon: Settings, label: 'Pengaturan' },
  'Konfigurasi Sistem': { key: 'sistem', icon: Settings, label: 'Konfigurasi Sistem' },
};

const SECTION_ORDER = [
  'Jadwal & Agenda',
  'Pembelajaran',
  'Wali Kelas',
  'Kehadiran',
  'Kesiswaan',
  'Data Master',
  'Administrasi',
  'PKL & Hubin',
  'Sarana & Prasarana',
  'Mesin Absensi',
  'Aktivitas',
  'Tampilan',
  'Pengaturan',
  'Komunikasi',
];

const getSectionMeta = (sectionName) => {
  if (SECTION_METADATA[sectionName]) return SECTION_METADATA[sectionName];
  return {
    key: String(sectionName).toLowerCase().replace(/[^a-z0-9]/g, '_'),
    icon: FolderOpen,
    label: sectionName,
  };
};

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

  const isMac = useMemo(() => {
    return typeof navigator !== 'undefined' && /Mac|iPod|iPhone|iPad/.test(navigator.platform || navigator.userAgent);
  }, []);
  const shortcutLabel = isMac ? '⌘K' : 'Ctrl+K';
  const [activeFlyout, setActiveFlyout] = useState(null);
  const flyoutTimerRef = useRef(null);

  // Custom Animated Scrollbar States
  const [scrollProgress, setScrollProgress] = useState(0);
  const [thumbHeight, setThumbHeight] = useState(28);
  const [isScrolling, setIsScrolling] = useState(false);
  const [hasOverflow, setHasOverflow] = useState(false);
  const [isHoveringNav, setIsHoveringNav] = useState(false);
  const scrollTimeoutRef = useRef(null);
  const trackRef = useRef(null);

  const updateScrollMetrics = () => {
    const el = refToUse.current;
    if (!el) return;
    const { scrollTop, scrollHeight, clientHeight } = el;
    const overflow = scrollHeight > clientHeight + 5;
    setHasOverflow(overflow);
    if (!overflow) return;

    const visibleRatio = clientHeight / scrollHeight;
    const calculatedThumbHeight = Math.max(24, Math.min(120, clientHeight * visibleRatio));
    setThumbHeight(calculatedThumbHeight);

    const maxScroll = scrollHeight - clientHeight;
    const progress = maxScroll > 0 ? scrollTop / maxScroll : 0;
    setScrollProgress(progress);
  };

  const handleScroll = (e) => {
    const scrollTop = e.currentTarget.scrollTop;
    posToUse.current = scrollTop;
    sessionStorage.setItem("admin_sidebar_scroll_top", scrollTop);
    updateScrollMetrics();

    setIsScrolling(true);
    if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
    scrollTimeoutRef.current = setTimeout(() => {
      setIsScrolling(false);
    }, 700);
  };

  const handleThumbMouseDown = (e) => {
    e.preventDefault();
    e.stopPropagation();
    const startY = e.clientY;
    const el = refToUse.current;
    if (!el) return;
    const startScrollTop = el.scrollTop;
    const track = trackRef.current;
    const trackHeight = track ? track.clientHeight : el.clientHeight;
    const availableTrack = trackHeight - thumbHeight;
    const maxScroll = el.scrollHeight - el.clientHeight;

    const handleMouseMove = (moveEvent) => {
      const deltaY = moveEvent.clientY - startY;
      const scrollRatio = availableTrack > 0 ? deltaY / availableTrack : 0;
      el.scrollTop = Math.max(0, Math.min(maxScroll, startScrollTop + scrollRatio * maxScroll));
      setIsScrolling(true);
    };

    const handleMouseUp = () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
      scrollTimeoutRef.current = setTimeout(() => setIsScrolling(false), 700);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  const handleTrackClick = (e) => {
    if (!trackRef.current || !refToUse.current) return;
    const rect = trackRef.current.getBoundingClientRect();
    const clickY = e.clientY - rect.top;
    const trackHeight = rect.height;
    const ratio = Math.max(0, Math.min(1, clickY / trackHeight));
    const maxScroll = refToUse.current.scrollHeight - refToUse.current.clientHeight;
    refToUse.current.scrollTo({ top: ratio * maxScroll, behavior: 'smooth' });
  };

  const openFlyout = (targetEl, data) => {
    if (!isCollapsed) return;
    if (flyoutTimerRef.current) {
      clearTimeout(flyoutTimerRef.current);
      flyoutTimerRef.current = null;
    }
    const rect = targetEl.getBoundingClientRect();
    const newTop = rect.top + rect.height / 2;
    const newLeft = rect.right + 10;

    setActiveFlyout({
      ...data,
      top: newTop,
      left: newLeft,
    });
  };

  const scheduleCloseFlyout = () => {
    if (flyoutTimerRef.current) clearTimeout(flyoutTimerRef.current);
    flyoutTimerRef.current = setTimeout(() => {
      setActiveFlyout(null);
    }, 150);
  };

  const cancelCloseFlyout = () => {
    if (flyoutTimerRef.current) {
      clearTimeout(flyoutTimerRef.current);
      flyoutTimerRef.current = null;
    }
  };

  // Mouse hover event delegation for instant, high-performance tooltips in collapsed mode
  const handleSidebarMouseMove = (e) => {
    if (!isCollapsed) {
      if (activeFlyout) setActiveFlyout(null);
      return;
    }
    const target = e.target.closest('[data-sidebar-tooltip]');
    if (target) {
      if (target.hasAttribute('data-sidebar-group')) return;
      const label = target.getAttribute('data-sidebar-tooltip');
      const rect = target.getBoundingClientRect();
      const newTop = rect.top + rect.height / 2;
      const newLeft = rect.right + 10;

      if (!activeFlyout || activeFlyout.label !== label || Math.abs(activeFlyout.top - newTop) > 3) {
        cancelCloseFlyout();
        setActiveFlyout({
          type: 'item',
          label,
          top: newTop,
          left: newLeft,
        });
      }
    } else {
      const isOverFlyout = e.target.closest('[data-sidebar-flyout]');
      const isOverGroup = e.target.closest('[data-sidebar-group]');
      if (!isOverFlyout && !isOverGroup && activeFlyout && activeFlyout.type === 'item') {
        scheduleCloseFlyout();
      }
    }
  };

  const handleSidebarMouseLeave = () => {
    scheduleCloseFlyout();
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

  // Update scroll metrics on mount, tab changes, and group toggles
  useEffect(() => {
    updateScrollMetrics();
    const timer = setTimeout(updateScrollMetrics, 120);
    return () => clearTimeout(timer);
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
    'dataMaster', 'tataUsaha', 'kurikulum', 'kesiswaan', 'kehadiran', 'hubin', 'sarpras', 'absensi', 'informasiUmum', 'sistem',
    'jadwal_agenda', 'pembelajaran', 'wali_kelas', 'kehadiran', 'administrasi', 'pkl_hubin', 'mesin_absensi', 'tampilan', 'aktivitas', 'komunikasi', 'pengaturan', 'data_master'
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
    const isAdmin = isSuperAdminRole(activeUserRole);
    return MENU_REGISTRY.filter(item => {
      if (item.adminOnly && !isAdmin) return false;
      if (item.hideInSidebar) return false;

      const isAllowed = typeof checkIsAllowed === 'function'
        ? checkIsAllowed(item.id, item.featureKey)
        : true;
      if (!isAllowed) return false;

      const labelMatch = item.label?.toLowerCase().includes(q);
      const groupMatch = item.adminGroup?.toLowerCase().includes(q);
      const sectionMatch = item.section?.toLowerCase().includes(q);
      const idMatch = item.id?.toLowerCase().includes(q);
      return labelMatch || groupMatch || sectionMatch || idMatch;
    });
  }, [searchQuery, checkIsAllowed, isSuperAdminRole, activeUserRole]);

  const SidebarSection = ({ label }) => {
    if (isCollapsed) return null;
    return (
      <div className="pt-3 pb-1 px-2.5 flex items-center">
        <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 select-none">
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
      return childId === activeTab || child.props?.isActive || (Array.isArray(childActiveIds) && childActiveIds.includes(activeTab));
    });

    if (isCollapsed) {
      const subItems = React.Children.toArray(children).map(child => {
        if (!React.isValidElement(child)) return null;
        const childId = child.props?.id;
        const childActiveIds = child.props?.activeIds;
        const childIsActive = childId === activeTab || child.props?.isActive || (Array.isArray(childActiveIds) && childActiveIds.includes(activeTab));
        return {
          id: childId,
          label: child.props?.label || childId,
          icon: child.props?.icon,
          badge: child.props?.badge,
          isActive: childIsActive,
        };
      }).filter(Boolean);

      return (
        <div
          className="mb-1 w-full flex justify-center"
          onMouseEnter={(e) => {
            if (subItems.length > 0) {
              openFlyout(e.currentTarget, {
                type: 'group',
                label,
                icon: Icon,
                subItems,
                hasActiveChild,
              });
            } else {
              openFlyout(e.currentTarget, {
                type: 'item',
                label,
                icon: Icon,
                hasActiveChild,
              });
            }
          }}
          onMouseLeave={scheduleCloseFlyout}
        >
          <button
            onClick={() => {
              toggleSidebar();
              if (!isOpen) toggleGroup(groupKey);
            }}
            type="button"
            data-sidebar-group="true"
            aria-label={label}
            className={cn(
              "flex items-center justify-center rounded-lg border-none transition-all cursor-pointer w-9 h-9",
              hasActiveChild
                ? "bg-primary/10 text-primary font-bold"
                : "text-slate-500 hover:bg-slate-100 hover:text-slate-900"
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
      <div className="mb-0.5 w-full">
        <button
          onClick={() => toggleGroup(groupKey)}
          type="button"
          className={cn(
            "group relative flex w-full items-center justify-between rounded-lg border-none",
            "px-2.5 py-1.5 text-xs font-semibold transition-all cursor-pointer",
            hasActiveChild
              ? "text-slate-900 font-bold bg-slate-100/80"
              : "text-slate-600 hover:bg-slate-100/70 hover:text-slate-900"
          )}
        >
          <div className="flex items-center gap-2.5 min-w-0">
            {Icon && (
              <div className={cn(
                "w-7 h-7 rounded-lg flex items-center justify-center shrink-0 transition-colors",
                hasActiveChild
                  ? "bg-primary/15 text-primary"
                  : "bg-slate-100/90 text-slate-500 group-hover:bg-slate-200/80 group-hover:text-slate-800"
              )}>
                <Icon
                  size={15}
                  strokeWidth={hasActiveChild ? 2.4 : 2}
                  className="transition-colors"
                />
              </div>
            )}
            <span className="truncate">{label}</span>
          </div>
          <ChevronDown
            size={14}
            className={cn("text-slate-400 group-hover:text-slate-600 transition-transform duration-200 shrink-0", isOpen ? "rotate-0" : "-rotate-90")}
          />
        </button>
        <div
          className="overflow-hidden transition-[max-height,opacity,margin] duration-300 ease-in-out ml-2.5 pl-2 border-l border-slate-200/80 flex flex-col gap-0.5 sidebar-submenus relative"
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
  // DYNAMIC MENU RENDERER — reads from MENU_REGISTRY
  // ─────────────────────────────────────────────────────────────────────────────
  const renderDynamicMenu = () => {
    const isAdmin = isSuperAdminRole(activeUserRole);

    if (isAdmin) {
      return renderAdminMenu();
    }

    // For non-admin users: group MENU_REGISTRY into collapsible SidebarGroup accordions
    const isWalasUser = Boolean(currentUser?.isWalas || currentUser?.walasClass);
    const div = (currentUser?.division || "").toLowerCase().trim();
    const subrole = (currentUser?.subrole || "").toLowerCase().trim();
    const activeSubrole = subrole;
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
    const isPureWalas = isWalasUser && !isKesiswaanTeam && !isKurikulumTeam && !isBKTeam && role !== 'kepsek';

    const sectionMap = {};
    for (const item of MENU_REGISTRY) {
      if (item.adminOnly) continue;
      if (item.hideInSidebar) continue;
      if (item.id === 'dashboard') continue; // Rendered explicitly at the top of menu

      // If user has walas responsibilities, walas-specific items are isolated inside the Wali Kelas accordion
      if (isWalasUser && role !== 'kepsek' && ['catatan_walikelas', 'walas_report', 'rekap_jurnal_kelas', 'kedisiplinan_absensi'].includes(item.id)) {
        continue;
      }

      if (item.specialCondition === 'walas_only') {
        if (!isWalasUser && !isKesiswaanTeam && !isBKTeam && !isAdmin) {
          continue;
        }
        const isPermitted = typeof checkIsAllowed === 'function' ? checkIsAllowed(item.id, item.featureKey) : true;
        if (!isPermitted) {
          continue;
        }
      }

      // Pastikan item yang tidak diizinkan untuk role ini tidak masuk ke grup menu
      const isItemPermitted = typeof checkIsAllowed === 'function'
        ? checkIsAllowed(item.id, item.featureKey)
        : true;
      if (!isItemPermitted) {
        continue;
      }

      const section = item.section || '_root';
      if (!sectionMap[section]) sectionMap[section] = [];
      sectionMap[section].push(item);
    }

    const sortedSections = Object.entries(sectionMap).sort(([a], [b]) => {
      const idxA = SECTION_ORDER.indexOf(a);
      const idxB = SECTION_ORDER.indexOf(b);
      if (idxA !== -1 && idxB !== -1) return idxA - idxB;
      if (idxA !== -1) return -1;
      if (idxB !== -1) return 1;
      return a.localeCompare(b);
    });

    const renderedGroups = [];

    for (const [sectionName, items] of sortedSections) {
      if (sectionName === '_root') {
        // Direct root items (like Dashboard)
        items.forEach(item => {
          const navEl = renderNavItem({
            id: item.id,
            icon: item.icon,
            label: item.label,
            featureKey: item.featureKey,
            activeIds: item.activeIds,
          });
          if (navEl) renderedGroups.push(navEl);
        });
        continue;
      }

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

      // If Komunikasi with single item (e.g. Pesan Dashboard), render directly as a bottom nav item
      if (sectionName === 'Komunikasi' && renderedItems.length === 1) {
        renderedGroups.push(
          <React.Fragment key={sectionName}>
            {renderedItems}
          </React.Fragment>
        );
        continue;
      }

      const meta = getSectionMeta(sectionName);
      renderedGroups.push(
        <SidebarGroup
          key={meta.key}
          label={meta.label}
          icon={meta.icon}
          groupKey={meta.key}
        >
          {renderedItems}
        </SidebarGroup>
      );
    }

    // Special: Wali Kelas accordion group (for all walas teachers)
    if (isWalasUser && role !== 'kepsek') {
      const walasItemIds = ['catatan_walikelas', 'walas_report', 'rekap_jurnal_kelas', 'kedisiplinan_absensi'];
      const walasItems = MENU_REGISTRY.filter(i => walasItemIds.includes(i.id));
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
        const walasClassLabel = currentUser.walasClass || 'Kelas Ampuan';
        const walasGroup = (
          <SidebarGroup
            key="wali_kelas"
            label={`Wali Kelas (${walasClassLabel})`}
            icon={GraduationCap}
            groupKey="wali_kelas"
          >
            {renderedWalas}
          </SidebarGroup>
        );
        // Insert right after Pembelajaran or Jadwal & Agenda
        const insertIdx = Math.min(2, renderedGroups.length);
        renderedGroups.splice(insertIdx, 0, walasGroup);
      }
    }

    return (
      <>
        {renderNavItem({
          id: 'dashboard',
          icon: MENU_REGISTRY.find(m => m.id === 'dashboard')?.icon || LayoutDashboard,
          label: 'Dashboard',
        })}
        {renderedGroups}
      </>
    );
  };

  const renderAdminMenu = () => {
    // Build group map from registry
    const groupMap = {};
    const rootItems = [];

    for (const item of MENU_REGISTRY) {
      if (item.hideInSidebar) continue;
      if (!item.adminGroupKey || !item.adminGroup) {
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
      onMouseOver={handleSidebarMouseMove}
      onMouseLeave={handleSidebarMouseLeave}
      className={cn(
        "app-sidebar border-r border-slate-200/80 bg-white flex flex-col shrink-0 relative transition-all duration-300 ease-in-out rounded-none !rounded-none select-none h-full max-h-screen overflow-hidden",
        isCollapsed ? "w-[68px]" : "w-[264px]",
        isMobileMenuOpen ? "fixed inset-y-0 left-0 z-50 translate-x-0" : "hidden lg:flex z-30 -translate-x-full lg:translate-x-0"
      )}
    >
      {/* ─── 1. HEADER (Untitled UI Style) ─── */}
      <div className={cn("flex items-center shrink-0 border-b border-slate-100 transition-all", isCollapsed ? "h-14 justify-center px-2" : "h-14 px-3.5 justify-between")}>
        {!isCollapsed ? (
          <div className="flex items-center justify-between w-full min-w-0 gap-2">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0 overflow-hidden">
                <img
                  src={appSettings.logoWebUrl || appSettings.logoUrl || appSettings.faviconImage || "/favicon.svg"}
                  alt="Brand Logo"
                  className="w-6 h-6 object-contain"
                />
              </div>
              <div className="flex flex-col min-w-0 select-none">
                <span className="font-bold text-slate-900 text-[13.5px] leading-tight tracking-tight truncate">
                  {appSettings.appName || "KG2 School"}
                </span>
                <span className="text-[11px] font-medium text-slate-400 leading-tight tracking-tight truncate mt-0.5">
                  {appSettings.appSubtitle || appSettings.instansiName || "smkkg2.sch.id"}
                </span>
              </div>
            </div>
            {isMobileMenuOpen ? (
              <button
                type="button"
                onClick={() => setIsMobileMenuOpen(false)}
                className="w-8 h-8 text-slate-500 hover:text-slate-900 bg-slate-100 hover:bg-slate-200/80 rounded-lg lg:hidden border-none cursor-pointer flex items-center justify-center transition-colors"
                title="Tutup Menu"
                aria-label="Tutup Menu"
              >
                <X size={16} strokeWidth={2.5} />
              </button>
            ) : (
              <button
                type="button"
                onClick={toggleSidebar}
                className="w-8 h-8 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg hidden lg:flex border border-slate-200/80 cursor-pointer items-center justify-center transition-all shrink-0"
                title="Ciutkan Sidebar"
                aria-label="Ciutkan Sidebar"
              >
                <ChevronsLeft size={16} strokeWidth={2.4} />
              </button>
            )}
          </div>
        ) : (
          <div className="flex items-center justify-center w-full">
            <button
              type="button"
              onClick={toggleSidebar}
              data-sidebar-tooltip="Perluas Sidebar"
              aria-label="Perluas Sidebar"
              className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0 cursor-pointer hover:border-primary/40 hover:bg-primary/20 transition-all group"
              title="Perluas Sidebar"
            >
              <img
                src={appSettings.logoWebUrl || appSettings.logoUrl || appSettings.faviconImage || "/favicon.svg"}
                alt="Brand Logo"
                className="w-5 h-5 object-contain group-hover:hidden transition-all"
              />
              <ChevronsRight size={16} strokeWidth={2.4} className="text-primary hidden group-hover:block transition-all" />
            </button>
          </div>
        )}
      </div>

      {/* ─── 2. SEARCH BAR WITH SHORTCUT BADGE (Untitled UI Style) ─── */}
      {!isCollapsed ? (
        <div className="px-3 pt-3 pb-1 shrink-0 flex flex-col gap-1.5">
          <div className="relative flex items-center">
            <Search size={15} className="absolute left-2.5 text-slate-400 pointer-events-none" />
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari menu..."
              className="w-full h-[34px] bg-slate-50/70 hover:bg-slate-50 focus:bg-white border border-slate-200/90 hover:border-slate-300 focus:border-primary pl-8 pr-14 text-[12.5px] rounded-lg text-slate-800 placeholder-slate-400 transition-all font-medium"
            />
            <div className="absolute right-2 flex items-center gap-1">
              {searchQuery ? (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery("");
                    searchInputRef.current?.focus();
                  }}
                  className="p-1 text-slate-400 hover:text-slate-600 rounded-md hover:bg-slate-200/60 cursor-pointer border-none bg-transparent transition-colors flex items-center justify-center"
                  title="Hapus pencarian"
                  aria-label="Hapus pencarian"
                >
                  <X size={12} strokeWidth={2.5} />
                </button>
              ) : (
                <kbd className="hidden sm:inline-flex items-center text-[10px] font-semibold text-slate-400 bg-white border border-slate-200/90 px-1.5 py-0.5 rounded-md select-none">
                  {shortcutLabel}
                </kbd>
              )}
            </div>
          </div>

          {/* Quick Collapse / Expand Micro Bar */}
          {!searchQuery.trim() && (
            <div className="flex items-center justify-between px-1 pt-1.5 text-slate-400 select-none">
              <span className="font-bold uppercase tracking-wider text-[10.5px] text-slate-400">
                Daftar Menu
              </span>
              <button
                type="button"
                onClick={handleToggleAllGroups}
                className="text-[11px] font-semibold text-slate-500 hover:text-primary hover:bg-slate-100/90 px-1.5 py-0.5 rounded-md transition-colors flex items-center gap-1 cursor-pointer border-none bg-transparent active:scale-95"
                title={isAnyGroupOpen ? "Tutup semua sub-menu agar ringkas" : "Buka semua sub-menu"}
              >
                <ChevronsUpDown size={12} strokeWidth={2.4} className="text-slate-400" />
                <span>{isAnyGroupOpen ? "Tutup Semua" : "Buka Semua"}</span>
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="pt-2 pb-1 flex justify-center shrink-0">
          <button
            type="button"
            onClick={() => {
              toggleSidebar();
              setTimeout(() => searchInputRef.current?.focus(), 160);
            }}
            data-sidebar-tooltip={`Cari Menu (${shortcutLabel})`}
            aria-label="Cari Menu"
            className="w-9 h-9 flex items-center justify-center rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-all cursor-pointer border border-slate-200/60 bg-white"
            title={`Cari Menu (${shortcutLabel})`}
          >
            <Search size={16} strokeWidth={2} />
          </button>
        </div>
      )}

      {/* ─── 3. NAVIGATION LIST (Custom Animated Scrollbar on the Left) ─── */}
      <div
        className="relative flex-1 flex flex-col min-h-0 overflow-hidden"
        onMouseEnter={() => setIsHoveringNav(true)}
        onMouseLeave={() => setIsHoveringNav(false)}
      >
        {/* Subtle Top & Bottom Gradient Masks for Modern Depth */}
        {!isCollapsed && hasOverflow && scrollProgress > 0.02 && (
          <div className="absolute top-0 left-0 right-0 h-4 bg-gradient-to-b from-white to-transparent z-20 pointer-events-none" />
        )}
        {!isCollapsed && hasOverflow && scrollProgress < 0.98 && (
          <div className="absolute bottom-0 left-0 right-0 h-4 bg-gradient-to-t from-white to-transparent z-20 pointer-events-none" />
        )}

        <nav
          ref={refToUse}
          tabIndex={0}
          onKeyDown={handleNavKeyDown}
          onScroll={handleScroll}
          className={cn(
            "flex-1 sidebar-scroll-left pt-1.5 pb-6 relative z-10 transition-all focus:outline-none",
            isCollapsed ? "px-2" : "pl-2.5 pr-2.5"
          )}
          style={{ scrollBehavior: 'smooth' }}
          title="Gunakan scroll mouse atau seret scrollbar di kiri untuk menggulir"
        >
          <div className="w-full flex flex-col min-w-0" style={{ direction: 'ltr' }}>
            {searchQuery.trim() ? (
              <div className="flex flex-col gap-1 py-1">
                <div className="px-3 py-1 text-[10px] font-black text-slate-400 uppercase tracking-wider">
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
                          "flex items-center justify-between px-2.5 py-1.5 text-xs font-semibold rounded-lg text-left transition-colors cursor-pointer border-none",
                          isActive
                            ? "bg-primary/10 text-primary font-bold"
                            : "text-slate-700 hover:bg-slate-100 hover:text-slate-900"
                        )}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className={cn("w-7 h-7 rounded-lg flex items-center justify-center shrink-0", isActive ? "bg-primary text-white" : "bg-slate-100 text-slate-500")}>
                            {item.icon && React.createElement(item.icon, { size: 15, strokeWidth: isActive ? 2.4 : 2 })}
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
                {typeof hasAnyConfigAccess === 'function' && hasAnyConfigAccess() && (() => {
                  const configNavItems = [
                    renderNavItem({
                      id: "hak_akses",
                      icon: MENU_REGISTRY.find(m => m.id === 'hak_akses')?.icon || UserCog,
                      label: "Hak Akses & Pengguna",
                      activeIds: ['hak_akses', 'manajemen_role', 'pengaturanuser', 'status_password', 'log_password', 'audit_log']
                    }),
                    renderNavItem({
                      id: "fitur",
                      icon: MENU_REGISTRY.find(m => m.id === 'fitur')?.icon || SlidersHorizontal,
                      label: "Sistem & Integrasi",
                      activeIds: ['fitur', 'tampilan', 'api_keys', 'whatsapp', 'gdrive_backup']
                    })
                  ].filter(Boolean);

                  if (configNavItems.length === 0) return null;

                  return (
                    <SidebarGroup label="Konfigurasi Sistem" icon={Settings} groupKey="sistem">
                      {configNavItems}
                    </SidebarGroup>
                  );
                })()}
              </>
            )}
          </div>
        </nav>
      </div>

      {/* ─── 4. BOTTOM BAR: BACKUP, PROMINENT LOGOUT & DETAILED VERSION ─── */}
      {!isCollapsed ? (
        <div className="p-3 border-t border-slate-200/80 bg-slate-50/40 shrink-0 flex flex-col gap-2 relative">
          {/* Quick Action: Backup & Logout in neat harmonious row */}
          <div className="flex items-center gap-2">
            {isSuperAdminRole(activeUserRole) && (
              <button
                type="button"
                onClick={handleBackupExport}
                disabled={isBackingUp}
                className="flex-1 h-9 flex items-center justify-center gap-1.5 px-2 text-xs font-semibold text-slate-700 hover:text-slate-900 bg-white hover:bg-slate-100 border border-slate-200/80 rounded-lg transition-all cursor-pointer disabled:opacity-50"
                title="Backup & Export Database"
              >
                {isBackingUp ? <RefreshCw size={13} className="animate-spin text-primary" /> : <DatabaseBackup size={14} className="text-slate-500" />}
                <span className="truncate">{isBackingUp ? "Backup..." : "Backup"}</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleLogout}
              className={cn(
                "h-9 flex items-center justify-center gap-1.5 px-3 text-xs font-bold text-rose-600 hover:text-white bg-rose-50/80 hover:bg-rose-600 border border-rose-200/80 hover:border-rose-600 rounded-lg transition-all cursor-pointer active:scale-95",
                isSuperAdminRole(activeUserRole) ? "flex-1" : "w-full"
              )}
              title="Keluar dari akun aplikasi"
            >
              <LogOut size={14} strokeWidth={2.4} />
              <span>Keluar</span>
            </button>
          </div>

          {/* Unified Compact System & Version Status Card */}
          <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200/70 flex flex-col gap-1 select-none">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                <span className="text-[11px] font-bold text-slate-700">Sistem Aktif</span>
              </div>
              <span className="font-mono text-emerald-700 font-bold bg-white border border-emerald-200/80 px-1.5 py-0.5 rounded-md text-[10px]">
                {appVersion.version}
              </span>
            </div>
            <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1 border-t border-slate-200/50">
              <span className="truncate font-medium" title={appVersion.detail}>
                {appVersion.date ? `${appVersion.date}${appVersion.time ? ', ' + appVersion.time : ''}` : (appVersion.detail || 'Terbaru')}
              </span>
              {appVersion.commit && (
                <span className="font-mono text-slate-500 font-semibold shrink-0 ml-1">
                  #{appVersion.commit}
                </span>
              )}
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
            className="w-9 h-9 flex items-center justify-center rounded-lg bg-rose-50 text-rose-600 hover:bg-rose-600 hover:text-white border border-rose-200/80 transition-all cursor-pointer active:scale-95"
            title="Keluar Sistem"
          >
            <LogOut size={16} strokeWidth={2.4} />
          </button>

          {/* Detailed Version Status Indicator in Collapsed Mode */}
          <div
            data-sidebar-tooltip={`Versi ${appVersion.version} (${appVersion.commit ? '#' + appVersion.commit : 'Terbaru'})`}
            className="w-9 h-9 rounded-lg bg-emerald-50 border border-emerald-200/80 flex items-center justify-center cursor-default"
          >
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
          </div>
        </div>
      )}

      {/* ─── 5. FLOATING PORTAL FLYOUT / TOOLTIP FOR COLLAPSED SIDEBAR ─── */}
      {activeFlyout && isCollapsed && typeof document !== 'undefined' && createPortal(
        <div
          data-sidebar-flyout="true"
          onMouseEnter={cancelCloseFlyout}
          onMouseLeave={scheduleCloseFlyout}
          className="fixed z-[99999] transition-all duration-150 ease-out flex items-center pointer-events-auto"
          style={{
            top: `${Math.max(20, Math.min(window.innerHeight - 300, activeFlyout.top))}px`,
            left: `${activeFlyout.left}px`,
            transform: 'translateY(-50%)',
          }}
        >
          {/* Hover Bridge */}
          <div className="absolute -left-3 top-0 bottom-0 w-3 bg-transparent pointer-events-auto" />

          {activeFlyout.type === 'group' && activeFlyout.subItems && activeFlyout.subItems.length > 0 ? (
            <div className="relative bg-white text-slate-800 text-xs rounded-xl border border-slate-200 shadow-xl overflow-hidden min-w-[210px] max-w-[280px] p-1.5 animate-in fade-in-0 zoom-in-95 duration-100 select-none flex flex-col gap-1">
              <div className="px-2.5 py-2 bg-slate-50/90 rounded-lg border border-slate-100 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 font-bold text-slate-800 text-xs truncate min-w-0">
                  {activeFlyout.icon && (
                    <div className="w-5 h-5 rounded-md bg-white border border-slate-200/70 flex items-center justify-center shrink-0 text-primary">
                      <activeFlyout.icon size={13} strokeWidth={2.4} />
                    </div>
                  )}
                  <span className="truncate">{activeFlyout.label}</span>
                </div>
                <span className="text-[10px] font-bold text-slate-500 bg-white border border-slate-200/80 px-1.5 py-0.5 rounded-md shrink-0">
                  {activeFlyout.subItems.length} menu
                </span>
              </div>

              <div className="flex flex-col gap-0.5 max-h-[min(480px,calc(100vh-100px))] overflow-y-auto scrollbar-none no-scrollbar px-0.5">
                {activeFlyout.subItems.map(item => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      setActiveTab(item.id);
                      setActiveFlyout(null);
                    }}
                    className={cn(
                      "w-full flex items-center justify-between px-2.5 py-2 text-xs rounded-lg text-left transition-all cursor-pointer border-none",
                      item.isActive
                        ? "bg-primary/10 text-primary font-bold"
                        : "text-slate-600 hover:text-slate-900 hover:bg-slate-100/80 font-medium"
                    )}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      {item.icon ? (
                        <div className={cn(
                          "w-4 h-4 flex items-center justify-center shrink-0 transition-colors",
                          item.isActive ? "text-primary" : "text-slate-400 group-hover:text-slate-700"
                        )}>
                          <item.icon size={13} strokeWidth={item.isActive ? 2.4 : 1.9} />
                        </div>
                      ) : (
                        <span
                          className={cn(
                            "w-1.5 h-1.5 rounded-full shrink-0 transition-colors",
                            item.isActive ? "bg-primary" : "bg-slate-300 group-hover:bg-slate-500"
                          )}
                          aria-hidden="true"
                        />
                      )}
                      <span className="truncate">{item.label}</span>
                    </div>
                    {item.badge && (
                      <span className={cn(
                        "text-[10px] px-1.5 py-0.5 rounded-md font-semibold ml-1.5 shrink-0",
                        item.isActive ? "bg-primary text-white" : "bg-slate-100 text-slate-600 border border-slate-200/60"
                      )}>
                        {item.badge}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="relative bg-slate-900 text-white text-xs font-semibold px-3 py-1.5 rounded-lg border border-slate-800 shadow-xl whitespace-nowrap flex items-center gap-2 animate-in fade-in-0 zoom-in-95 duration-100 pointer-events-none select-none">
              <span>{activeFlyout.label}</span>
            </div>
          )}
        </div>,
        document.body
      )}
    </aside>
  );
}
