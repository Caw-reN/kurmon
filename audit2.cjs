const fs = require('fs');

const sidebar = fs.readFileSync('c:/laragon/www/inkscod/kurmon/src/components/admin/AdminSidebar.jsx', 'utf8');
const app = fs.readFileSync('c:/laragon/www/inkscod/kurmon/src/AdminApp.jsx', 'utf8');
const dash = fs.readFileSync('c:/laragon/www/inkscod/kurmon/src/pages/DashboardPage.jsx', 'utf8');
const router = fs.readFileSync('c:/laragon/www/inkscod/kurmon/src/components/admin/AdminContentRouter.jsx', 'utf8');

// Extraction logic
function extractFromRegex(content, regex, extractGroup = 1) {
    const match = regex.exec(content);
    if (!match) return [];
    return match[extractGroup].split(/[\n,]/).map(s => s.replace(/["' ]/g, '')).filter(Boolean);
}

// 1. AdminApp permissions
const kepsekApp = extractFromRegex(app, /kepsekDefaultTabs = \[([\s\S]*?)\];/);
const guruDefApp = extractFromRegex(app, /guruDefaultTabs = \[([\s\S]*?)\];/);
const guruPermApp = extractFromRegex(app, /guruPermissionedTabs = \[([\s\S]*?)\];/);
const tuApp = extractFromRegex(app, /tuDefaultTabs = \[([\s\S]*?)\];/);
const wakaKurApp = extractFromRegex(app, /kurikulum:\s*\[([\s\S]*?)\]/);
const wakaKesApp = extractFromRegex(app, /kesiswaan:\s*\[([\s\S]*?)\]/);
const wakaSarApp = extractFromRegex(app, /sarpras:\s*\[([\s\S]*?)\]/);
const wakaHubApp = extractFromRegex(app, /hubin:\s*\[([\s\S]*?)\]/);
const wakaHumApp = extractFromRegex(app, /humas:\s*\[([\s\S]*?)\]/);
const karApp = extractFromRegex(app, /isAllowed = \[(.*?)\].includes\(id\)/, 1);

const appRoles = {
    kepsek: kepsekApp,
    guru: [...guruDefApp, ...guruPermApp],
    tu: tuApp,
    karyawan: karApp,
    waka_kurikulum: wakaKurApp,
    waka_kesiswaan: wakaKesApp,
    waka_sarpras: wakaSarApp,
    waka_hubin: wakaHubApp,
    waka_humas: wakaHumApp
};

// 2. AdminSidebar structure
function extractSidebarSection(content, startMarker, endMarker) {
    const startIdx = content.indexOf(startMarker);
    const endIdx = content.indexOf(endMarker, startIdx);
    if (startIdx === -1 || endIdx === -1) return [];
    
    const section = content.slice(startIdx, endIdx);
    const ids = [];
    const idRegex = /id:\s*["']([^"']+)["']/g;
    let match;
    while ((match = idRegex.exec(section)) !== null) {
        ids.push(match[1]);
    }
    return [...new Set(ids)];
}

const sidebarRoles = {
    guru: extractSidebarSection(sidebar, 'activeUserRole ==="guru" ? (', 'activeUserRole ==="kepsek" ? ('),
    kepsek: extractSidebarSection(sidebar, 'activeUserRole ==="kepsek" ? (', 'activeUserRole ==="tu" ? ('),
    tu: extractSidebarSection(sidebar, 'activeUserRole ==="tu" ? (', 'activeUserRole ==="karyawan" ? ('),
    karyawan: extractSidebarSection(sidebar, 'activeUserRole ==="karyawan" ? (', 'activeUserRole ==="waka" ? ('),
    waka_kesiswaan: extractSidebarSection(sidebar, 'activeUserDivision ==="kesiswaan" ? (', 'activeUserDivision ==="sarpras" ? ('),
    waka_sarpras: extractSidebarSection(sidebar, 'activeUserDivision ==="sarpras" ? (', 'activeUserDivision ==="humas" ? ('),
    waka_humas: extractSidebarSection(sidebar, 'activeUserDivision ==="humas" ? (', 'activeUserDivision ==="hubin" ? ('),
    waka_hubin: extractSidebarSection(sidebar, 'activeUserDivision ==="hubin" ? (', 'SidebarSection label="Kurikulum"'),
    waka_kurikulum: extractSidebarSection(sidebar, 'SidebarSection label="Kurikulum"', 'isSidebarCollapsed ? (')
};

// 3. Router checks
const kepsekRouter = extractFromRegex(router, /kepsekDefaultTabs = \[([\s\S]*?)\];/); // not used
const wakaKurRouter = extractFromRegex(router, /kurikulum:\s*\[([\s\S]*?)\]/);
const wakaKesRouter = extractFromRegex(router, /kesiswaan:\s*\[([\s\S]*?)\]/);
const wakaSarRouter = extractFromRegex(router, /sarpras:\s*\[([\s\S]*?)\]/);
const wakaHumRouter = extractFromRegex(router, /humas:\s*\[([\s\S]*?)\]/);
const wakaHubRouter = extractFromRegex(router, /hubin:\s*\[([\s\S]*?)\]/);

const routerRoles = {
    waka_kurikulum: wakaKurRouter,
    waka_kesiswaan: wakaKesRouter,
    waka_sarpras: wakaSarRouter,
    waka_humas: wakaHumRouter,
    waka_hubin: wakaHubRouter,
};


for (let role in sidebarRoles) {
    if (!sidebarRoles[role].includes('dashboard')) {
        sidebarRoles[role].unshift('dashboard');
    }
}

console.log('--- AUDIT REPORT 2: ADMINAPP VS SIDEBAR VS ROUTER ---');
for (let role in appRoles) {
    const appTabs = appRoles[role] || [];
    const sideTabs = sidebarRoles[role] || [];
    const routerTabs = routerRoles[role] || null;
    
    // Find what is in sidebar but NOT in AdminApp
    const missingInApp = sideTabs.filter(t => !appTabs.includes(t) && t !== 'dashboard');
    // Find what is in AdminApp but NOT in sidebar
    const missingInSidebar = appTabs.filter(t => !sideTabs.includes(t) && t !== 'dashboard');
    
    let missingInRouter = [];
    if (routerTabs) {
        missingInRouter = appTabs.filter(t => !routerTabs.includes(t) && t !== 'dashboard');
    }

    if (missingInApp.length > 0 || missingInSidebar.length > 0 || missingInRouter.length > 0) {
        console.log(`\n[${role.toUpperCase()}]`);
        if (missingInApp.length > 0) console.log(`  ❌ IN SIDEBAR BUT BLOCKED BY APP PERMISSIONS: ${missingInApp.join(', ')}`);
        if (missingInRouter.length > 0) console.log(`  ❌ IN APP PERMISSIONS BUT BLOCKED BY ROUTER: ${missingInRouter.join(', ')}`);
        // if (missingInSidebar.length > 0) console.log(`  ⚠️ IN ROUTER BUT HIDDEN FROM SIDEBAR: ${missingInSidebar.join(', ')}`);
    } else {
        console.log(`\n[${role.toUpperCase()}] ✅ Perfectly synced`);
    }
}
