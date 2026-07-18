

const DEFAULT_TITLE = "TimeSchedule | Jadwal, Denah & Modul Ajar Sekolah";
const DEFAULT_FAVICON = "/favicon.svg";

const ensureMetaTag = (name) => {
  let tag = document.querySelector(`meta[name="${name}"]`);
  if (!tag) {
    tag = document.createElement("meta");
    tag.setAttribute("name", name);
    document.head.appendChild(tag);
  }
  return tag;
};

const ensureFaviconTag = () => {
  let tag = document.querySelector('link[rel="icon"]');
  if (!tag) {
    tag = document.createElement("link");
    tag.setAttribute("rel", "icon");
    document.head.appendChild(tag);
  }
  return tag;
};

export const applyDocumentBranding = (settings = {}) => {
  if (typeof document === "undefined") return;

  const appName = settings.appName || "TimeSchedule";
  document.title = settings.siteTitle || `${appName} | Jadwal, Denah & Modul Ajar Sekolah`;

  const favicon = ensureFaviconTag();
  const faviconHref = settings.faviconImage || DEFAULT_FAVICON;
  const faviconMime = /^data:([^;]+);/.exec(faviconHref)?.[1] || "image/svg+xml";
  favicon.setAttribute("href", faviconHref);
  favicon.setAttribute("type", faviconMime);

  ensureMetaTag("theme-color").setAttribute("content", settings.primaryColor || "#064e3b");
  ensureMetaTag("description").setAttribute(
    "content",
    settings.siteDescription || settings.heroSubtitle || "TimeSchedule adalah aplikasi jadwal, denah ruang, dan modul ajar sekolah untuk pengelolaan akademik yang rapi dan terpusat."
  );

  // INJECT CSS VARIABLES GLOBALLY
  const root = document.documentElement;
  if (settings.primaryColor) {
    root.style.setProperty('--ui-primary', settings.primaryColor);
    root.style.setProperty('--primary', settings.primaryColor);
    root.style.setProperty('--sidebar-primary', settings.primaryColor);
  }
  if (settings.accentColor) {
    root.style.setProperty('--ui-accent', settings.accentColor);
    root.style.setProperty('--accent', settings.accentColor);
  }
  if (settings.primaryButtonColor) {
    root.style.setProperty('--ui-primary-btn', settings.primaryButtonColor);
  }
  if (settings.actionButtonColor) {
    root.style.setProperty('--ui-accent-btn', settings.actionButtonColor);
  }
  if (settings.bgColor) {
    root.style.setProperty('--ui-bg-page', settings.bgColor);
    root.style.setProperty('--ui-bg', settings.bgColor);
    root.style.setProperty('--background', settings.bgColor);
  }
  if (settings.textColor) {
    root.style.setProperty('--ui-text', settings.textColor);
    root.style.setProperty('--foreground', settings.textColor);
  }
  if (settings.uiRadius) {
    // Map radius settings from Tampilan WEB (sm, md, lg, full) to px sizes
    let radiusControl = '16px';
    let radiusCard = '24px';
    let radiusVal = "0.45rem";
    if (settings.uiRadius === 'sm') { radiusControl = '8px'; radiusCard = '12px'; radiusVal = "0.25rem"; }
    if (settings.uiRadius === 'lg') { radiusControl = '24px'; radiusCard = '32px'; radiusVal = "0.85rem"; }
    if (settings.uiRadius === 'full') { radiusControl = '999px'; radiusCard = '32px'; radiusVal = "9999px"; }
    root.style.setProperty('--ui-radius-control', radiusControl);
    root.style.setProperty('--ui-radius-card', radiusCard);
    root.style.setProperty('--radius', radiusVal);
  }

  // Dynamic Font Family
  if (settings.fontFamily) {
    const fontName = settings.fontFamily;
    let stack = '"Plus Jakarta Sans", system-ui, -apple-system, sans-serif';
    if (fontName === 'Lexend') stack = '"Lexend", "Plus Jakarta Sans", system-ui, sans-serif';
    else if (fontName === 'Poppins') stack = '"Poppins", "Plus Jakarta Sans", system-ui, sans-serif';
    else if (fontName === 'Nunito') stack = '"Nunito", "Plus Jakarta Sans", system-ui, sans-serif';
    root.style.fontFamily = stack;
    root.style.setProperty('--font-sans-family', stack);
    root.style.setProperty('--font-sans', stack);
  }

  // Accessibility Font Scaling
  if (settings.fontSizeScale) {
    let size = "15px";
    if (settings.fontSizeScale === "kecil") size = "13px";
    else if (settings.fontSizeScale === "besar") size = "16.5px";
    else if (settings.fontSizeScale === "sangat-besar") size = "18px";
    root.style.fontSize = size;
  } else {
    root.style.fontSize = "15px";
  }

  // Accessibility Touch Targets
  if (settings.touchTargetSize === "besar") {
    root.classList.add("accessibility-touch-large");
  } else {
    root.classList.remove("accessibility-touch-large");
  }

  // Sidebar Style Classes
  root.classList.remove("sidebar-white", "sidebar-gray", "sidebar-primary");
  if (settings.sidebarStyle === "abu-abu") {
    root.classList.add("sidebar-gray");
  } else if (settings.sidebarStyle === "tema-utama") {
    root.classList.add("sidebar-primary");
  } else {
    root.classList.add("sidebar-white");
  }

  // Header Style Classes
  root.classList.remove("header-glass", "header-solid", "header-minimal");
  if (settings.headerStyle === "solid") {
    root.classList.add("header-solid");
  } else if (settings.headerStyle === "minimal") {
    root.classList.add("header-minimal");
  } else {
    root.classList.add("header-glass");
  }

  // Card Style Classes
  root.classList.remove("card-bordered", "card-elevated", "card-flat");
  if (settings.cardStyle === "shadow") {
    root.classList.add("card-elevated");
  } else if (settings.cardStyle === "flat") {
    root.classList.add("card-flat");
  } else {
    root.classList.add("card-bordered");
  }

  // Theme Vibrancy Classes
  root.classList.remove("vibrancy-soft", "vibrancy-bright", "vibrancy-gradient");
  if (settings.themeVibrancy === "soft") {
    root.classList.add("vibrancy-soft");
  } else if (settings.themeVibrancy === "vibrant") {
    root.classList.add("vibrancy-bright");
  } else {
    root.classList.add("vibrancy-gradient");
  }

  // Backdrop Patterns Classes
  root.classList.remove("bg-grid-lines", "bg-grid-dots", "bg-grid-gradient", "bg-grid-plain");
  if (settings.bgGridType === "dots") {
    root.classList.add("bg-grid-dots");
  } else if (settings.bgGridType === "gradient") {
    root.classList.add("bg-grid-gradient");
  } else if (settings.bgGridType === "plain") {
    root.classList.add("bg-grid-plain");
  } else {
    root.classList.add("bg-grid-lines");
  }

  // Page Transitions Classes
  root.classList.remove("transition-smooth", "transition-slide", "transition-none");
  if (settings.pageTransition === "slide") {
    root.classList.add("transition-slide");
  } else if (settings.pageTransition === "none") {
    root.classList.add("transition-none");
  } else {
    root.classList.add("transition-smooth");
  }
};

export const resetDocumentBranding = () => {
  if (typeof document === "undefined") return;
  document.title = DEFAULT_TITLE;
  ensureFaviconTag().setAttribute("href", DEFAULT_FAVICON);
  
  const root = document.documentElement;
  root.style.removeProperty('--ui-primary');
  root.style.removeProperty('--ui-accent');
  root.style.removeProperty('--ui-primary-btn');
  root.style.removeProperty('--ui-accent-btn');
  root.style.removeProperty('--ui-bg-page');
  root.style.removeProperty('--ui-bg');
  root.style.removeProperty('--ui-text');
  root.style.removeProperty('--ui-radius-control');
  root.style.removeProperty('--ui-radius-card');
  root.style.removeProperty('--primary');
  root.style.removeProperty('--accent');
  root.style.removeProperty('--background');
  root.style.removeProperty('--foreground');
  root.style.removeProperty('--radius');
  root.style.removeProperty('--sidebar-primary');
  root.style.removeProperty('--font-sans');
  root.style.fontFamily = "";
  root.style.fontSize = "15px";
  root.classList.remove(
    "accessibility-touch-large",
    "sidebar-white", "sidebar-gray", "sidebar-primary",
    "header-glass", "header-solid", "header-minimal",
    "card-bordered", "card-elevated", "card-flat",
    "vibrancy-soft", "vibrancy-bright", "vibrancy-gradient",
    "bg-grid-lines", "bg-grid-dots", "bg-grid-gradient", "bg-grid-plain",
    "transition-smooth", "transition-slide", "transition-none"
  );
};
