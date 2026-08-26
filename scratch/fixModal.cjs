const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../src/pages/kedisiplinan/JurnalHarianGuru.jsx');
let content = fs.readFileSync(filePath, 'utf8');

// 1. Column 1 (Materi & KBM) flex-col overflow bug
const col1Target = `className={\`w-full lg:w-[40%] flex-col gap-3.5 p-4 overflow-y-auto custom-scrollbar border-b lg:border-b-0 lg:border-r border-slate-200 bg-white \${mobileTab === 'materi' ? 'flex' : 'hidden lg:flex'}\`}`;
const col1Replace = `className={\`w-full lg:w-[40%] flex-col gap-3.5 p-4 overflow-y-auto custom-scrollbar border-b lg:border-b-0 lg:border-r border-slate-200 bg-white min-h-0 \${mobileTab === 'materi' ? 'flex' : 'hidden lg:flex'}\`}`;

if(content.includes(col1Target)) {
    content = content.replace(col1Target, col1Replace);
}

// 2. Lapor Siswa Layout
const laporTarget = `<div className="p-2.5 bg-rose-50/50 border border-rose-200 rounded-xl space-y-2 shadow-2xs">
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-start gap-2">
                      <div className="flex-1 min-w-0 space-y-2">
                        <CustomSelect
                          value={laporSiswaNis}
                          onChange={(val) => setLaporSiswaNis(val)}
                          options={liveStudents.map(s => ({ value: s.nis, label: \`\${s.name} (\${s.nis})\`, searchText: \`\${s.name} \${s.nis}\` }))}
                          placeholder="-- Pilih Siswa Bermasalah --"
                          className="w-full text-xs font-semibold"
                        />
                        <input
                          type="text"
                          placeholder="Tulis masalah (misal: Main HP saat jam KBM)..."
                          value={laporSiswaKasus}
                          onChange={(e) => setLaporSiswaKasus(e.target.value)}
                          onKeyDown={(e) => { if(e.key === 'Enter') { e.preventDefault(); handleAddLaporBk(); } }}
                          className="w-full px-2.5 py-1.5 text-xs bg-white border border-rose-200 rounded-lg text-slate-800 font-medium focus:outline-none focus:ring-1 focus:ring-rose-500 shadow-2xs"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={handleAddLaporBk}
                        disabled={!laporSiswaNis || !laporSiswaKasus.trim()}
                        className="sm:mt-0 px-3 py-2 sm:h-[62px] rounded-lg bg-rose-600 hover:bg-rose-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-black shadow-xs transition-colors cursor-pointer flex items-center justify-center shrink-0 gap-1.5"
                      >
                        <Plus size={14} /> <span className="sm:hidden">Tambah</span>
                      </button>
                    </div>`;

const laporReplace = `<div className="p-2.5 bg-rose-50/50 border border-rose-200 rounded-xl space-y-2 shadow-2xs">
                    <CustomSelect
                      value={laporSiswaNis}
                      onChange={(val) => setLaporSiswaNis(val)}
                      options={liveStudents.map(s => ({ value: s.nis, label: \`\${s.name} (\${s.nis})\`, searchText: \`\${s.name} \${s.nis}\` }))}
                      placeholder="-- Pilih Siswa Bermasalah --"
                      className="w-full text-xs font-semibold"
                    />
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        placeholder="Tulis masalah (misal: Main HP saat jam KBM)..."
                        value={laporSiswaKasus}
                        onChange={(e) => setLaporSiswaKasus(e.target.value)}
                        onKeyDown={(e) => { if(e.key === 'Enter') { e.preventDefault(); handleAddLaporBk(); } }}
                        className="w-full px-2.5 py-1.5 text-xs bg-white border border-rose-200 rounded-lg text-slate-800 font-medium focus:outline-none focus:ring-1 focus:ring-rose-500 shadow-2xs"
                      />
                      <button
                        type="button"
                        onClick={handleAddLaporBk}
                        disabled={!laporSiswaNis || !laporSiswaKasus.trim()}
                        className="h-8 px-3 rounded-lg bg-rose-600 hover:bg-rose-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-black shadow-xs transition-colors cursor-pointer flex items-center justify-center shrink-0"
                      >
                        <Plus size={14} />
                      </button>
                    </div>`;

if(content.includes(laporTarget)) {
    content = content.replace(laporTarget, laporReplace);
}

// 3. Column 2 (Presensi) flex-col overflow bug
const col2Target = `className={\`w-full lg:w-[60%] flex-col h-full bg-slate-50/50 \${mobileTab === 'presensi' ? 'flex' : 'hidden lg:flex'}\`}`;
const col2Replace = `className={\`w-full lg:w-[60%] flex-col h-full min-h-0 bg-slate-50/50 \${mobileTab === 'presensi' ? 'flex' : 'hidden lg:flex'}\`}`;

if(content.includes(col2Target)) {
    content = content.replace(col2Target, col2Replace);
}

// 4. Student Item Padding
const studentPaddingTarget = `className={\`p-2 sm:p-2.5 rounded-xl border transition-all shadow-2xs \${currentStatus === 'Hadir'`;
const studentPaddingReplace = `className={\`p-2 rounded-xl border transition-all shadow-2xs \${currentStatus === 'Hadir'`;

if(content.includes(studentPaddingTarget)) {
    content = content.replace(studentPaddingTarget, studentPaddingReplace);
}

// 5. Attendance Buttons (H T S I A)
const btnsTarget = `<div className="flex items-center gap-1 shrink-0 bg-slate-100/80 p-1 rounded-lg border border-slate-200 w-full sm:w-auto justify-between sm:justify-start">
                            <button type="button" onClick={() => handleUpdateStudentStatus(s.nis, 'Hadir')} className={\`flex-1 sm:flex-none px-2 sm:px-3 py-1.5 sm:py-1 rounded-md text-[11px] sm:text-[10px] font-black transition-all cursor-pointer \${currentStatus === 'Hadir' ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-600 hover:text-emerald-700 hover:bg-emerald-50'}\`}>H</button>
                            <button type="button" onClick={() => handleUpdateStudentStatus(s.nis, 'Terlambat')} className={\`flex-1 sm:flex-none px-2 sm:px-3 py-1.5 sm:py-1 rounded-md text-[11px] sm:text-[10px] font-black transition-all cursor-pointer \${isTelat ? 'bg-yellow-500 text-white shadow-xs' : 'text-slate-600 hover:text-yellow-700 hover:bg-yellow-50'}\`}>T</button>
                            <button type="button" onClick={() => handleUpdateStudentStatus(s.nis, 'Sakit')} className={\`flex-1 sm:flex-none px-2 sm:px-3 py-1.5 sm:py-1 rounded-md text-[11px] sm:text-[10px] font-black transition-all cursor-pointer \${currentStatus === 'Sakit' ? 'bg-amber-500 text-white shadow-xs' : 'text-slate-600 hover:text-amber-700 hover:bg-amber-50'}\`}>S</button>
                            <button type="button" onClick={() => handleUpdateStudentStatus(s.nis, 'Izin')} className={\`flex-1 sm:flex-none px-2 sm:px-3 py-1.5 sm:py-1 rounded-md text-[11px] sm:text-[10px] font-black transition-all cursor-pointer \${['Izin', 'Dispen', 'Dispensasi'].includes(currentStatus) ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-600 hover:text-indigo-700 hover:bg-indigo-50'}\`}>I</button>
                            <button type="button" onClick={() => handleUpdateStudentStatus(s.nis, 'Alpa')} className={\`flex-1 sm:flex-none px-2 sm:px-3 py-1.5 sm:py-1 rounded-md text-[11px] sm:text-[10px] font-black transition-all cursor-pointer \${['Alpa', 'Alpha'].includes(currentStatus) ? 'bg-rose-600 text-white shadow-xs' : 'text-slate-600 hover:text-rose-700 hover:bg-rose-50'}\`}>A</button>
                          </div>`;

const btnsReplace = `<div className="flex items-center gap-1.5 shrink-0 w-full sm:w-auto justify-between sm:justify-start">
                            <button type="button" onClick={() => handleUpdateStudentStatus(s.nis, 'Hadir')} className={\`w-7 h-7 flex items-center justify-center rounded-full text-[10px] font-black transition-all cursor-pointer \${currentStatus === 'Hadir' ? 'bg-emerald-600 text-white shadow-md ring-2 ring-emerald-600/30 ring-offset-1' : 'bg-slate-100 text-slate-500 hover:bg-emerald-100 hover:text-emerald-700'}\`}>H</button>
                            <button type="button" onClick={() => handleUpdateStudentStatus(s.nis, 'Terlambat')} className={\`w-7 h-7 flex items-center justify-center rounded-full text-[10px] font-black transition-all cursor-pointer \${isTelat ? 'bg-yellow-500 text-white shadow-md ring-2 ring-yellow-500/30 ring-offset-1' : 'bg-slate-100 text-slate-500 hover:bg-yellow-100 hover:text-yellow-700'}\`}>T</button>
                            <button type="button" onClick={() => handleUpdateStudentStatus(s.nis, 'Sakit')} className={\`w-7 h-7 flex items-center justify-center rounded-full text-[10px] font-black transition-all cursor-pointer \${currentStatus === 'Sakit' ? 'bg-amber-500 text-white shadow-md ring-2 ring-amber-500/30 ring-offset-1' : 'bg-slate-100 text-slate-500 hover:bg-amber-100 hover:text-amber-700'}\`}>S</button>
                            <button type="button" onClick={() => handleUpdateStudentStatus(s.nis, 'Izin')} className={\`w-7 h-7 flex items-center justify-center rounded-full text-[10px] font-black transition-all cursor-pointer \${['Izin', 'Dispen', 'Dispensasi'].includes(currentStatus) ? 'bg-indigo-600 text-white shadow-md ring-2 ring-indigo-600/30 ring-offset-1' : 'bg-slate-100 text-slate-500 hover:bg-indigo-100 hover:text-indigo-700'}\`}>I</button>
                            <button type="button" onClick={() => handleUpdateStudentStatus(s.nis, 'Alpa')} className={\`w-7 h-7 flex items-center justify-center rounded-full text-[10px] font-black transition-all cursor-pointer \${['Alpa', 'Alpha'].includes(currentStatus) ? 'bg-rose-600 text-white shadow-md ring-2 ring-rose-600/30 ring-offset-1' : 'bg-slate-100 text-slate-500 hover:bg-rose-100 hover:text-rose-700'}\`}>A</button>
                          </div>`;

if(content.includes(btnsTarget)) {
    content = content.replace(btnsTarget, btnsReplace);
}

fs.writeFileSync(filePath, content, 'utf8');
console.log('Patch complete.');
