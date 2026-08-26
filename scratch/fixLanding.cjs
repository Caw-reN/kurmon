const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../src/pages/LandingPage.jsx');
let content = fs.readFileSync(filePath, 'utf8');

// 1. Desktop background
const desktopTarget = `{appSettings.heroImage ? (
        <div
          className="hidden md:block absolute top-0 left-0 w-full h-[54vh] pointer-events-none z-0 opacity-100 transition-all duration-700 bg-no-repeat bg-cover bg-center"
          style={{
            backgroundImage: \`url(\${appSettings.heroImage})\`
          }}
        />
      ) : (`;
const desktopReplace = `{appSettings.heroImage ? (
        <img
          src={appSettings.heroImage}
          fetchpriority="high"
          loading="eager"
          className="hidden md:block absolute top-0 left-0 w-full h-[54vh] pointer-events-none z-0 opacity-100 transition-all duration-700 object-cover object-center"
          alt="Hero Background"
        />
      ) : (`;

content = content.replace(desktopTarget, desktopReplace);

// 2. Mobile background and H1
// Because of string interpolation and exact spacing, let's use regex for the mobile background `style`

const mobileTarget = `className="w-full relative flex flex-col text-white select-none px-5 pb-6.5 pt-5 rounded-b-[var(--ui-radius-card)] overflow-hidden"
          style={{
            backgroundImage: appSettings.heroImage 
              ? \`linear-gradient(135deg, \${hexToRgba(primaryColor ||'#064e3b', 0.94)} 0%, \${hexToRgba(primaryColor ||'#064e3b', 0.88)} 100%), url(\${appSettings.heroImage})\`
              : \`linear-gradient(135deg, \${primaryColor ||'#064e3b'} 0%, \${(primaryColor ||'#064e3b')}dd 100%)\`,
            backgroundSize:'cover',
            backgroundPosition:'center',
          }}`;

const mobileReplace = `className="w-full relative flex flex-col text-white select-none px-5 pb-6.5 pt-5 rounded-b-[var(--ui-radius-card)] overflow-hidden"
        >
        {appSettings.heroImage && (
          <img 
            src={appSettings.heroImage} 
            fetchpriority="high" 
            loading="eager" 
            className="absolute inset-0 w-full h-full object-cover object-center z-0" 
            alt="Mobile Hero" 
          />
        )}
        <div 
          className="absolute inset-0 z-0"
          style={{
            background: \`linear-gradient(135deg, \${hexToRgba(primaryColor ||'#064e3b', appSettings.heroImage ? 0.94 : 1)} 0%, \${hexToRgba(primaryColor ||'#064e3b', appSettings.heroImage ? 0.88 : 0.86)} 100%)\`
          }}
        />
        <div className="relative z-10 flex flex-col w-full h-full pointer-events-none absolute inset-0"><div className="pointer-events-auto h-full w-full"></div></div>`;
// Wait, actually I just need to put `relative z-10` on the inner wrappers!
// Let's replace the whole block more carefully.

const mobileBlockRegex = /<div\s+className="w-full relative flex flex-col text-white select-none px-5 pb-6\.5 pt-5 rounded-b-\[var\(--ui-radius-card\)\] overflow-hidden"[\s\S]*?style=\{\{[\s\S]*?\}\}\s*>\s*\{\/\* Sparkles backdrop illustration \*\/\}/;

const newMobileBlock = `<div
          className="w-full relative flex flex-col text-white select-none px-5 pb-6.5 pt-5 rounded-b-[var(--ui-radius-card)] overflow-hidden"
        >
        {appSettings.heroImage && (
          <img 
            src={appSettings.heroImage} 
            fetchpriority="high" 
            loading="eager" 
            className="absolute inset-0 w-full h-full object-cover object-center z-0" 
            alt="Mobile Hero Background" 
          />
        )}
        <div 
          className="absolute inset-0 z-0"
          style={{
            background: \`linear-gradient(135deg, \${hexToRgba(primaryColor ||'#064e3b', appSettings.heroImage ? 0.94 : 1)} 0%, \${hexToRgba(primaryColor ||'#064e3b', appSettings.heroImage ? 0.88 : 0.86)} 100%)\`
          }}
        />
        {/* Sparkles backdrop illustration */}`;

content = content.replace(mobileBlockRegex, newMobileBlock);

// Also wrap the inner content of Mobile Hero with relative z-10 if not already wrapped
// Wait, Top Bar has `className="flex items-center justify-between mb-5 w-full"`
content = content.replace(
  `className="flex items-center justify-between mb-5 w-full"`, 
  `className="flex items-center justify-between mb-5 w-full relative z-10"`
);
content = content.replace(
  `className="absolute left-6 top-16 text-white/5 animate-pulse"`,
  `className="absolute left-6 top-16 text-white/10 animate-pulse z-10"`
);
content = content.replace(
  `className="absolute right-12 bottom-6 text-white/5 animate-pulse"`,
  `className="absolute right-12 bottom-6 text-white/10 animate-pulse z-10"`
);

// 3. Mobile H1
const h1Target = `<h1 className="text-[28px] font-black leading-tight mt-0.5">Selamat Datang</h1>`;
const h1Replace = `<h1 className="text-[28px] font-black leading-tight mt-0.5">Selamat Datang{appSettings.appName ? \` di \${appSettings.appName}\` : ''}</h1>`;
content = content.replace(h1Target, h1Replace);

fs.writeFileSync(filePath, content, 'utf8');
console.log('Fixed LCP and SEO in LandingPage.jsx');
