

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

const isColorDark = (hexColor) => {
  if (!hexColor || typeof hexColor !== "string") return false;
  const hex = hexColor.replace("#", "");
  if (hex.length !== 6) return false;
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  const yiq = (r * 299 + g * 587 + b * 114) / 1000;
  return yiq < 135;
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
  if (settings.surfaceColor) {
    root.style.setProperty('--ui-surface', settings.surfaceColor);
    root.style.setProperty('--card', settings.surfaceColor);
    root.style.setProperty('--popover', settings.surfaceColor);
  }

  // Smart Contrast for Card / Header Text
  const surfaceHex = settings.surfaceColor || '#ffffff';
  const cardIsDark = isColorDark(surfaceHex);
  const cardText = settings.cardTextColor || (cardIsDark ? '#f8fafc' : (settings.textColor || '#0f172a'));
  const cardMuted = cardIsDark ? 'rgba(248, 250, 252, 0.75)' : 'rgba(15, 23, 42, 0.65)';
  root.style.setProperty('--card-foreground', cardText);
  root.style.setProperty('--card-muted', cardMuted);
  if (settings.uiRadius) {
    // Map radius settings from Tampilan WEB (sm, md, lg, full) to px sizes
    let radiusControl = '16px';
    let radiusSmall = '12px';
    let radiusCard = '24px';
    let radiusVal = "0.45rem";
    if (settings.uiRadius === 'sm') { radiusControl = '8px'; radiusSmall = '6px'; radiusCard = '12px'; radiusVal = "0.25rem"; }
    if (settings.uiRadius === 'lg') { radiusControl = '24px'; radiusSmall = '16px'; radiusCard = '32px'; radiusVal = "0.85rem"; }
    if (settings.uiRadius === 'full') { radiusControl = '999px'; radiusSmall = '999px'; radiusCard = '32px'; radiusVal = "9999px"; }
    root.style.setProperty('--ui-radius-control', radiusControl);
    root.style.setProperty('--ui-radius-small', radiusSmall);
    root.style.setProperty('--ui-radius-card', radiusCard);
    root.style.setProperty('--radius', radiusVal);
  }

  // Card Style CSS variables mapping
  let cardBg = 'var(--ui-surface, #ffffff)';
  let cardBorder = '1px solid rgba(0, 0, 0, 0.06)';
  let cardShadow = '0 1px 3px 0 rgba(0, 0, 0, 0.02)';

  if (settings.cardStyle === 'shadow') {
    cardBg = 'var(--ui-surface, #ffffff)';
    cardBorder = '1px solid transparent';
    cardShadow = '0 10px 25px -5px rgba(0, 0, 0, 0.05), 0 8px 10px -6px rgba(0, 0, 0, 0.05)';
  } else if (settings.cardStyle === 'flat') {
    cardBg = '#f1f5f9';
    cardBorder = '1px solid transparent';
    cardShadow = 'none';
  }
  root.style.setProperty('--ui-card-bg', cardBg);
  root.style.setProperty('--ui-card-border', cardBorder);
  root.style.setProperty('--ui-card-shadow', cardShadow);

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
    let size = "14px";
    if (settings.fontSizeScale === "kecil") size = "12.5px";
    else if (settings.fontSizeScale === "besar") size = "15.5px";
    else if (settings.fontSizeScale === "sangat-besar") size = "17px";
    root.style.fontSize = size;
    root.style.setProperty('--ui-font-size', size);
  } else {
    root.style.fontSize = "14px";
    root.style.setProperty('--ui-font-size', "14px");
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
  root.classList.remove("header-glass", "header-solid", "header-minimal", "header-primary");
  if (settings.headerStyle === "solid") {
    root.classList.add("header-solid");
  } else if (settings.headerStyle === "minimal") {
    root.classList.add("header-minimal");
  } else if (settings.headerStyle === "glass") {
    root.classList.add("header-glass");
  } else {
    root.classList.add("header-primary");
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

  // Button Style Classes
  root.classList.remove("btn-style-solid", "btn-style-outline", "btn-style-shadow", "btn-style-gradient", "btn-style-flat");
  if (settings.buttonStyle === "outline") {
    root.classList.add("btn-style-outline");
  } else if (settings.buttonStyle === "shadow") {
    root.classList.add("btn-style-shadow");
  } else if (settings.buttonStyle === "gradient") {
    root.classList.add("btn-style-gradient");
  } else if (settings.buttonStyle === "flat") {
    root.classList.add("btn-style-flat");
  } else {
    root.classList.add("btn-style-solid");
  }

  // Layout Mode Classes
  root.classList.remove("layout-boxed", "layout-full");
  if (settings.layoutMode === "boxed") {
    root.classList.add("layout-boxed");
  } else {
    root.classList.add("layout-full");
  }

  // Dynamic Print Size (A4 / F4)
  let printStyle = document.getElementById("dynamic-print-style");
  if (!printStyle) {
    printStyle = document.createElement("style");
    printStyle.id = "dynamic-print-style";
    document.head.appendChild(printStyle);
  }
  const paperSize = settings.defaultPaperSize === "F4" ? "215mm 330mm" : "A4";
  const landscapeSize = settings.defaultPaperSize === "F4" ? "330mm 215mm" : "A4";
  printStyle.innerHTML = `
    @media print {
      @page { size: ${paperSize} portrait !important; margin: 10mm !important; }
      @page landscape-layout { size: ${landscapeSize} landscape !important; margin: 10mm !important; }
      @page portrait-layout { size: ${paperSize} portrait !important; margin: 10mm !important; }
    }
  `;
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
  root.style.removeProperty('--ui-card-bg');
  root.style.removeProperty('--ui-card-border');
  root.style.removeProperty('--ui-card-shadow');
  root.style.removeProperty('--primary');
  root.style.removeProperty('--accent');
  root.style.removeProperty('--background');
  root.style.removeProperty('--foreground');
  root.style.removeProperty('--radius');
  root.style.removeProperty('--sidebar-primary');
  root.style.removeProperty('--font-sans');
  root.style.fontFamily = "";
  root.style.fontSize = "14px";
  root.classList.remove(
    "accessibility-touch-large",
    "sidebar-white", "sidebar-gray", "sidebar-primary",
    "header-glass", "header-solid", "header-minimal", "header-primary",
    "card-bordered", "card-elevated", "card-flat",
    "vibrancy-soft", "vibrancy-bright", "vibrancy-gradient",
    "bg-grid-lines", "bg-grid-dots", "bg-grid-gradient", "bg-grid-plain",
    "transition-smooth", "transition-slide", "transition-none",
    "btn-style-solid", "btn-style-outline", "btn-style-shadow", "btn-style-gradient"
  );

  const printStyle = document.getElementById("dynamic-print-style");
  if (printStyle) printStyle.remove();
};
