const fs = require('fs');
const path = require('path');

const targetFile = path.join('c:', 'laragon', 'www', 'inkscod', 'kurmon', 'src', 'pages', 'DashboardPage.jsx');
let content = fs.readFileSync(targetFile, 'utf8');

const startMarker = "{showMobileNotif && (";
const endMarker = "{showAllAnnouncementsModal && (";

const newModalCode = `{showMobileNotif && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-white border border-slate-200/50 shadow-2xl rounded-3xl w-full max-w-sm max-h-[85vh] flex flex-col animate-in zoom-in-95 duration-300 overflow-hidden">
            
            {/* Header (Sticky) */}
            <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/80 backdrop-blur-md px-5 py-4 shrink-0">
              <div className="flex items-center gap-3">
                 <div className="w-9 h-9 rounded-full bg-[var(--ui-primary)]/10 text-[var(--ui-primary)] flex items-center justify-center shadow-inner">
                   <Bell size={18} strokeWidth={2.5} />
                 </div>
                 <div className="flex flex-col">
                   <h3 className="font-extrabold text-sm text-slate-800 tracking-tight leading-none">Notifikasi</h3>
                   <p className="text-[10px] text-slate-500 font-medium mt-1">Info & Pembaruan Sistem</p>
                 </div>
              </div>
              <button 
                onClick={() => setShowMobileNotif(false)} 
                className="w-8 h-8 rounded-full bg-slate-200/60 hover:bg-slate-300 text-slate-600 flex items-center justify-center transition-colors border-none cursor-pointer active:scale-95"
              >
                <X size={16} strokeWidth={2.5} />
              </button>
            </div>

            {/* Scrollable Content */}
            <div className="flex flex-col gap-6 p-5 overflow-y-auto custom-scrollbar">
              
              {/* Realtime Notification Consent Prompt */}
              <div className="bg-gradient-to-br from-[var(--ui-primary)]/10 to-[var(--ui-primary)]/5 border border-[var(--ui-primary)]/20 rounded-[16px] p-4 flex flex-col gap-3 shrink-0 shadow-sm relative overflow-hidden">
                <div className="absolute top-0 right-0 w-24 h-24 bg-[var(--ui-primary)]/10 rounded-full blur-2xl -mr-10 -mt-10 pointer-events-none" />
                <div className="flex items-start gap-3 relative z-10">
                  <div className="bg-white p-1.5 rounded-full shadow-sm text-[var(--ui-primary)] shrink-0">
                    <BellRing className="w-4 h-4" strokeWidth={2.5} />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[13px] font-black text-slate-800 leading-tight">Notifikasi Realtime</span>
                    <span className="text-[11px] font-medium text-slate-500 mt-1 leading-snug">Terima info absensi & piket langsung di layar Anda secara instan.</span>
                  </div>
                </div>
                <button
                  onClick={() => {
                    if ("Notification" in window) {
                      Notification.requestPermission().then(p => {
                        if (p === 'granted') alert('Notifikasi realtime diaktifkan!');
                      });
                    }
                  }}
                  className="w-full py-2.5 text-white font-bold text-xs rounded-xl active:scale-95 transition-all border-none cursor-pointer flex items-center justify-center gap-2 shadow-md hover:shadow-lg relative z-10"
                  style={{ backgroundColor: "var(--ui-primary)" }}
                >
                  <CheckCircle2 size={16} strokeWidth={2.5} /> Izinkan Sekarang
                </button>
              </div>

              {/* TODAY'S CLASS REMINDERS */}
              <div className="flex flex-col gap-3 shrink-0">
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-4 rounded-full bg-indigo-500" />
                  <span className="text-[11px] font-black text-slate-700 uppercase tracking-widest">
                    Jadwal Mengajar
                  </span>
                </div>
                {!todayClasses || todayClasses.length === 0 ? (
                  <div className="text-xs font-bold text-slate-400 py-4 text-center bg-slate-50 rounded-2xl border border-slate-100 border-dashed">
                    Tidak ada jadwal mengajar hari ini.
                  </div>
                ) : (
                  <div className="flex flex-col gap-2">
                    {todayClasses.map((item, idx) => (
                      <div key={idx} className="flex gap-3 p-3 bg-white border border-slate-200/80 rounded-2xl shadow-sm hover:shadow-md hover:border-indigo-200 transition-all cursor-pointer group">
                        <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                          <Clock3 className="w-5 h-5" strokeWidth={2.5} />
                        </div>
                        <div className="flex flex-col min-w-0 text-left justify-center">
                          <span className="text-xs font-extrabold text-slate-800 truncate mb-0.5 group-hover:text-indigo-600 transition-colors">
                            {item.subject}
                          </span>
                          <div className="flex items-center gap-2 text-[10px] font-bold text-slate-500">
                            <span className="bg-slate-100 px-2 py-0.5 rounded-md text-slate-600">{item.className}</span>
                            <span>Jam {item.jamStart === item.jamEnd ? item.jamStart : \`\${item.jamStart}-\${item.jamEnd}\`}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* ANNOUNCEMENTS / MESSAGES */}
              <div className="flex flex-col gap-3 shrink-0">
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-4 rounded-full bg-rose-500" />
                  <span className="text-[11px] font-black text-slate-700 uppercase tracking-widest">
                    Pengumuman Terbaru
                  </span>
                </div>
                {!dashboardMessages || dashboardMessages.length === 0 ? (
                  <div className="text-xs font-bold text-slate-400 py-4 text-center bg-slate-50 rounded-2xl border border-slate-100 border-dashed">
                    Belum ada pengumuman terbaru.
                  </div>
                ) : (
                  <div className="flex flex-col gap-2">
                    {dashboardMessages.slice(0, 3).map((item, idx) => (
                      <div key={idx} className="flex gap-3 p-3 bg-white border border-slate-200/80 shadow-sm rounded-2xl text-left cursor-pointer hover:bg-slate-50 hover:border-rose-200 hover:shadow-md transition-all group" onClick={() => { setShowMobileNotif(false); setActiveAnnouncementDetail(item); }}>
                        <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-500 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                          <MessageSquare className="w-5 h-5" strokeWidth={2.5} />
                        </div>
                        <div className="flex flex-col min-w-0 justify-center">
                          <span className="text-xs font-extrabold text-slate-800 truncate mb-0.5 group-hover:text-rose-600 transition-colors">
                            {item.title}
                          </span>
                          <span className="text-[10px] font-medium text-slate-500 truncate">
                            {item.sender} • {item.date || 'Hari ini'}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

            </div>
          </div>
        </div>
      )}
      
      {/* Spacer comment */}
      `;

let parts = content.split(startMarker);
if (parts.length > 1) {
  let newFullContent = parts[0];
  
  for (let i = 1; i < parts.length; i++) {
    let part = parts[i];
    let endIndex = part.indexOf(endMarker);
    if (endIndex !== -1) {
      newFullContent += newModalCode + endMarker + part.substring(endIndex + endMarker.length);
    } else {
      // Should not happen if correctly paired
      newFullContent += startMarker + part;
    }
  }
  
  fs.writeFileSync(targetFile, newFullContent);
  console.log('Replaced ' + (parts.length - 1) + ' occurrences.');
} else {
  console.log('Could not find start marker.');
}
