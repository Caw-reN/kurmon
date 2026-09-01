import React, { useRef, useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import {
  ChevronDown, X, RefreshCw, LogOut, PanelLeftClose, PanelLeftOpen, DatabaseBackup, Settings,
  LayoutDashboard, Calendar, CalendarDays, ClipboardList, MessageSquare, Trophy, Briefcase, Users, GraduationCap, Building2, Activity
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
  handleBackupExport,
  isBackingUp,
  sidebarScrollRef,
  sidebarScrollPos
}) {
  const isCollapsed = isSidebarCollapsed && !isMobileMenuOpen;
  const fallbackScrollRef = useRef(null);
  const fallbackScrollPos = useRef(0);
  const refToUse = sidebarScrollRef || fallbackScrollRef;
  const posToUse = sidebarScrollPos || fallbackScrollPos;

  // Restore scroll position on mount
  useEffect(() => {
    const savedPos = sessionStorage.getItem("admin_sidebar_scroll_top");
    if (savedPos && refToUse.current) {
      refToUse.current.scrollTop = parseInt(savedPos, 10);
    }
  }, [refToUse]);

  // Scroll active item into view on mount or tab change
  useEffect(() => {
    if (refToUse.current) {
      const timer = setTimeout(() => {
        if (!refToUse.current) return;
        const activeEl = refToUse.current.querySelector(".bg-primary\\/10, .bg-accent\\/15");
        if (activeEl) {
          activeEl.scrollIntoView({ block: "nearest", behavior: "smooth" });
        }
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [activeTab, refToUse]);

  const SidebarSection = ({ label }) => {
    if (isCollapsed) return null;
    return (
      <div className="mt-2.5 mb-1 px-3 flex items-center">
        <span className="text-[9px] font-semibold text-muted-foreground uppercase tracking-[0.15em]">
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
        <div className="mb-1.5 w-full flex justify-center">
          <button
            onClick={() => {
              toggleSidebar();
              if (!isOpen) toggleGroup(groupKey);
            }}
            type="button"
            title={label}
            className={cn(
              "group relative flex items-center justify-center rounded-[var(--ui-radius-small)] border-none transition-all cursor-pointer",
              "w-10 h-10 hover:bg-muted hover:text-foreground",
              hasActiveChild ? "bg-primary/10 text-primary font-bold shadow-xs" : "text-muted-foreground"
            )}
          >
            {Icon && (
              <Icon 
                size={18} 
                strokeWidth={hasActiveChild ? 2.5 : 2}
                className={cn(hasActiveChild ? "text-primary" : "text-muted-foreground group-hover:text-foreground transition-colors")} 
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
            "group relative mb-1 flex w-full items-center justify-between rounded-[var(--ui-radius-small)] border-none",
            "px-2.5 py-1.5 text-xs font-semibold transition-all cursor-pointer",
            hasActiveChild ? "text-primary font-bold bg-primary/5" : "text-muted-foreground hover:bg-muted hover:text-foreground"
          )}
        >
          <div className="flex items-center gap-2.5 min-w-0">
            {Icon && (
              <Icon 
                size={15} 
                strokeWidth={hasActiveChild ? 2.5 : 2}
                className={cn(hasActiveChild ? "text-primary" : "text-muted-foreground group-hover:text-foreground transition-colors")} 
              />
            )}
            <span className="truncate">{label}</span>
          </div>
          <ChevronDown
            size={14}
            className={cn("text-muted-foreground group-hover:text-foreground transition-transform duration-200 shrink-0", isOpen ? "rotate-0" : "-rotate-90")}
          />
        </button>
        <div
          className="overflow-hidden transition-[max-height,opacity,margin] duration-300 ease-in-out ml-5.5 pl-3 border-l border-slate-200/60 flex flex-col gap-1 sidebar-submenus"
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
        {renderNavItem({ id: 'laporan_absensi', icon: ClipboardList, label: 'Rekap Absensi' })}
        {renderNavItem({ id: 'pesan', icon: MessageSquare, label: 'Pengumuman' })}
        {renderNavItem({ id: 'kedisiplinan_bpbk', icon: Trophy, label: 'Buku BPBK' })}
        {renderNavItem({ id: 'pkl_dashboard', icon: Briefcase, label: 'Dashboard PKL' })}
        {renderNavItem({ id: 'akademik', icon: CalendarDays, label: 'Kalender' })}

        {/* DATA UTAMA */}
        <SidebarSection label="DATA UTAMA" />
        {renderNavItem({ id: 'dataguru', icon: Users, label: 'Data Guru', activeIds: ['dataguru', 'guru', 'data_pegawai'] })}
        {renderNavItem({ id: 'datasiswa', icon: GraduationCap, label: 'Data Siswa', activeIds: ['datasiswa', 'siswa'] })}
        {renderNavItem({ id: 'dataperusahaan', icon: Building2, label: 'Mitra DUDI', activeIds: ['dataperusahaan', 'pkl_data_perusahaan'] })}

        {/* LOG AKTIVITAS */}
        <SidebarSection label="AKTIVITAS" />
        {renderNavItem({ id: 'keamanan', icon: Activity, label: 'Log Aktivitas' })}
      </>
    );
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // DYNAMIC MENU RENDERER — reads from MENU_REGISTRY
  // Groups items by section, renders renderNavItem for each
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
    const sectionMap = {};
    for (const item of MENU_REGISTRY) {
      // Skip admin-only items for non-admins
      if (item.adminOnly) continue;
      // Skip walas-only items if user is not walas (handled separately below)
      if (item.specialCondition === 'walas_only') continue;

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

    // Special: Wali Kelas section (only if user is walas)
    if (currentUser?.isWalas || currentUser?.walasClass) {
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
        renderedSections.splice(3, 0,
          <React.Fragment key="walas">
            <SidebarSection label={`Wali Kelas (${currentUser.walasClass || 'Kelas Ampuan'})`} />
            {renderedWalas}
          </React.Fragment>
        );
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
    const groupOrder = ['dataMaster', 'tataUsaha', 'kurikulum', 'kesiswaan', 'hubin', 'sarpras', 'absensi', 'informasiUmum', 'sistem'];
    const sectionLabels = {
      dataMaster: 'DATA UTAMA',
      tataUsaha: 'MANAJEMEN SEKOLAH',
      kurikulum: null,
      kesiswaan: null,
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
        "app-sidebar border-r border-border bg-card flex flex-col shrink-0 relative transition-all duration-300 ease-in-out",
        isCollapsed ? "w-[68px]" : "w-[268px]",
        isMobileMenuOpen ? "fixed inset-y-0 left-0 z-50 shadow-sm translate-x-0" : "hidden lg:flex z-30 -translate-x-full lg:translate-x-0"
      )}
    >
      {/* Header / Logo */}
      <div className={cn("flex items-center shrink-0 relative z-10 bg-transparent transition-all border-none", isCollapsed ? "h-[85px] justify-center px-2 py-2" : "h-[80px] px-[18px]")}>
        {!isCollapsed ? (
          <div className="flex items-center gap-3 cursor-pointer hover:opacity-85 transition-opacity min-w-0 w-full justify-between">
            <div className="flex items-center gap-3 min-w-0">
              {appSettings.sidebarLogoMode !== "text" && (
                <img
                  src={appSettings.logoWebUrl || appSettings.logoUrl || appSettings.faviconImage || "/favicon.svg"}
                  alt="Brand Logo"
                  className="w-11 h-11 object-contain shrink-0 rounded-[var(--ui-radius-small)]"
                />
              )}
              {appSettings.sidebarLogoMode !== "logo" && (
                <div className="flex flex-col min-w-0 leading-tight select-none">
                  <span className="font-extrabold text-slate-800 text-[14px] tracking-tight truncate">
                    {appSettings.appName || "My Workspace"}
                  </span>
                  {appSettings.appSubtitle && (
                    <span className="text-[10px] font-semibold text-slate-400 tracking-tight truncate mt-0.5">
                      {appSettings.appSubtitle}
                    </span>
                  )}
                </div>
              )}
            </div>
            {isMobileMenuOpen ? (
              <button
                type="button"
                onClick={() => setIsMobileMenuOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 bg-slate-100 hover:bg-slate-200/80 rounded-[var(--ui-radius-small)] lg:hidden border-none cursor-pointer flex items-center justify-center"
                title="Tutup Menu"
              >
                <X size={15} strokeWidth={2.5} />
              </button>
            ) : (
              <button
                type="button"
                onClick={toggleSidebar}
                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100/80 rounded-[var(--ui-radius-small)] hidden lg:flex border border-slate-200/60 cursor-pointer items-center justify-center transition-all shrink-0 active:scale-95 shadow-2xs"
                title="Sembunyikan Sidebar"
              >
                <PanelLeftClose size={16} strokeWidth={2.5} />
              </button>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2.5">
            <img
              src={appSettings.logoWebUrl || appSettings.logoUrl || appSettings.faviconImage || "/favicon.svg"}
              alt="Brand Logo"
              className="w-11 h-11 object-contain shrink-0 rounded-[var(--ui-radius-small)] cursor-pointer hover:opacity-85 transition-opacity"
              onClick={toggleSidebar}
            />
            <button
              type="button"
              onClick={toggleSidebar}
              className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100/80 rounded-[var(--ui-radius-small)] border border-slate-200/60 cursor-pointer flex items-center justify-center transition-all active:scale-95"
              title="Perluas Sidebar"
            >
              <PanelLeftOpen size={13} strokeWidth={2.5} />
            </button>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav
        ref={refToUse}
        onScroll={(e) => {
          const scrollTop = e.currentTarget.scrollTop;
          posToUse.current = scrollTop;
          sessionStorage.setItem("admin_sidebar_scroll_top", scrollTop);
        }}
        className={cn("flex-1 overflow-y-auto hide-scrollbar pt-3 pb-6 relative z-10 transition-all", isCollapsed ? "px-2" : "px-[18px]")}
      >
        {renderDynamicMenu()}

        {/* Config access for non-admin with granted config permissions */}
        {hasAnyConfigAccess() && (
          <SidebarGroup label="Konfigurasi Sistem" icon={Settings} groupKey="sistem">
            {renderNavItem({ id: "fitur", icon: MENU_REGISTRY.find(m => m.id === 'fitur')?.icon, label: "Kontrol Fitur" })}
            {renderNavItem({ id: "hak_akses", icon: MENU_REGISTRY.find(m => m.id === 'hak_akses')?.icon, label: "Hak Akses Role" })}
            {renderNavItem({ id: "tampilan", icon: MENU_REGISTRY.find(m => m.id === 'tampilan')?.icon, label: "Tampilan Web" })}
            {renderNavItem({ id: "pengaturanuser", icon: MENU_REGISTRY.find(m => m.id === 'fitur')?.icon, label: "Pengaturan User" })}
          </SidebarGroup>
        )}
      </nav>

      {/* Backup / Export Data - hanya untuk Admin/Superadmin */}
      {isSuperAdminRole(activeUserRole) && (
        <div className={`px-4 pb-2 shrink-0 ${isSidebarCollapsed ? "flex justify-center" : ""}`}>
          {isSidebarCollapsed ? (
            <button
              onClick={handleBackupExport}
              disabled={isBackingUp}
              type="button"
              className="ui-control flex items-center justify-center p-3 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 transition-all cursor-pointer bg-white w-11 h-11 rounded-[var(--ui-radius-small)] disabled:opacity-50"
              title="Backup & Export Data"
            >
              {isBackingUp ? <RefreshCw size={18} className="animate-spin" /> : <DatabaseBackup size={18} />}
            </button>
          ) : (
            <button
              onClick={handleBackupExport}
              disabled={isBackingUp}
              type="button"
              className="w-full flex items-center justify-center gap-2 p-2.5 text-secondary-foreground font-bold text-xs hover:bg-secondary/80 transition-all cursor-pointer bg-secondary rounded-[var(--ui-radius-small)] disabled:opacity-50 border-none"
            >
              {isBackingUp ? <RefreshCw size={15} strokeWidth={2.5} className="animate-spin" /> : <DatabaseBackup size={15} strokeWidth={2.5} />}
              <span>{isBackingUp ? "Membackup..." : "Backup & Export Data"}</span>
            </button>
          )}
        </div>
      )}

      {/* Footer Logout Button */}
      <div className={cn("p-3 pt-2 border-t border-border/40 bg-card/80 shrink-0", isSidebarCollapsed ? "flex justify-center" : "")}>
        {isSidebarCollapsed ? (
          <button
            onClick={handleLogout}
            type="button"
            className="flex items-center justify-center p-2.5 text-rose-600 hover:text-rose-700 hover:bg-rose-100 transition-all cursor-pointer bg-rose-50 w-10 h-10 rounded-[var(--ui-radius-small)] border-none"
            title="Keluar Sistem"
          >
            <LogOut size={16} />
          </button>
        ) : (
          <button
            onClick={handleLogout}
            type="button"
            className="w-full flex items-center justify-center gap-2 p-2.5 text-rose-600 font-bold text-xs hover:bg-rose-100 hover:text-rose-700 transition-all cursor-pointer bg-rose-50 rounded-[var(--ui-radius-small)] border-none"
          >
            <LogOut size={15} strokeWidth={2.5} />
            <span>Keluar Sistem</span>
          </button>
        )}
      </div>
    </aside>
  );
}
