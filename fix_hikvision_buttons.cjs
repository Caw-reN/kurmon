const fs = require('fs');
const path = require('path');

const files = [
  'src/pages/admin/hikvision/HikvisionTeacherReport.jsx',
  'src/pages/admin/hikvision/HikvisionStudentReport.jsx',
  'src/pages/admin/hikvision/HikvisionStaffReport.jsx'
];

for (const file of files) {
  let content = fs.readFileSync(file, 'utf8');
  let original = content;

  // Add Button import if missing
  if (!content.includes('Button } from')) {
    content = content.replace(/import \{ Modal \}/, 'import { Modal, Button }');
    if (!content.includes('Button } from')) { // if Modal wasn't there
        content = content.replace(/import \{ UISelect \}/, 'import { UISelect, Button }');
    }
  }

  // Replace Terapkan
  content = content.replace(/<button[^>]*onClick=\{fetchData\}[^>]*>[\s\S]*?Terapkan[\s\S]*?<\/button>/g, 
    '<Button onClick={fetchData} disabled={loading} className="flex-1 md:flex-none gap-2"><Filter size={16} /> Terapkan</Button>');

  // Replace Kirim Rekap WA (only in teacher report)
  content = content.replace(/<button[^>]*Kirim Rekap WA[^>]*>[\s\S]*?<\/button>/g, 
    '<Button variant="outline" onClick={() => setWaDropdownOpen(!waDropdownOpen)} disabled={sendingWA} className="w-full md:w-auto gap-2"><MessageCircle size={16} /> {sendingWA ? "Mengirim..." : "Kirim Rekap WA"}</Button>');

  // Replace Input Manual
  content = content.replace(/<button[^>]*Input Manual[^>]*>[\s\S]*?<\/button>/g, 
    '<Button variant="outline" onClick={() => setIsModalOpen(true)} className="flex-1 md:flex-none gap-2"><Edit3 size={16} /> Input Manual</Button>');
    
  // Replace Input Surat (Student report)
  content = content.replace(/<button[^>]*Input Surat[^>]*>[\s\S]*?<\/button>/g, 
    '<Button variant="outline" onClick={() => handleCellClick(s, todayNum)} className="gap-2"><Edit3 size={16} /> Input Surat</Button>');

  // Replace Excel Export
  content = content.replace(/<button[^>]*Excel Export[^>]*>[\s\S]*?<\/button>/g, 
    '<Button variant="outline" onClick={handleExport} disabled={loading || data.length === 0} className="flex-1 md:flex-none gap-2 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 border-emerald-200"><FileSpreadsheet size={16} /> Excel Export</Button>');
  
  // Also handle "Export Excel" in Staff report
  content = content.replace(/<button[^>]*Export Excel[^>]*>[\s\S]*?<\/button>/g, 
    '<Button variant="outline" onClick={handleExport} disabled={loading || data.length === 0} className="flex-1 md:flex-none gap-2 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 border-emerald-200"><FileSpreadsheet size={16} /> Export Excel</Button>');

  // Replace PDF Export
  content = content.replace(/<button[^>]*PDF Export[^>]*>[\s\S]*?<\/button>/g, 
    '<Button variant="destructive" onClick={handleExportPDF} disabled={loading || data.length === 0} className="flex-1 md:flex-none gap-2"><FileText size={16} /> PDF Export</Button>');

  if (content !== original) {
    fs.writeFileSync(file, content, 'utf8');
    console.log(`Updated ${file}`);
  }
}
