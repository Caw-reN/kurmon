const fs = require('fs');
const glob = require('glob');
const path = require('path');

const files = glob.sync('src/**/*.{jsx,js}');
let totalReplaced = 0;

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  let original = content;
  
  // Safe UI replacements - matching exact substrings that appear in the UI
  const replacements = [
    [/\"Silabus\"/g, '"Modul"'],
    [/\'Silabus\'/g, "'Modul'"],
    [/>Silabus</g, '>Modul<'],
    [/> Silabus</g, '> Modul<'],
    [/Silabus saya/g, 'Modul saya'],
    [/dokumen silabus/g, 'dokumen modul'],
    [/Template Silabus/g, 'Template Modul'],
    [/Tambah Silabus/g, 'Tambah Modul'],
    [/Edit Silabus/g, 'Edit Modul'],
    [/Hapus Silabus/g, 'Hapus Modul'],
    [/Kategori Silabus/g, 'Kategori Modul'],
    [/kategori silabus/g, 'kategori modul'],
    [/Data Silabus/g, 'Data Modul'],
    [/impor silabus/g, 'impor modul'],
    [/Silabus Sekolah/g, 'Modul Sekolah'],
    [/Silabus Terpadu/g, 'Modul Terpadu'],
    [/Manajemen Silabus/g, 'Manajemen Modul'],
    [/Silabus Anda/g, 'Modul Anda'],
    [/>\s*Silabus\s*</g, '>Modul<'], // Catch any weird spacing
    [/7_Silabus/g, '7_Modul'],
    [/12_Kategori_Silabus/g, '12_Kategori_Modul']
  ];

  replacements.forEach(([regex, replacement]) => {
    content = content.replace(regex, replacement);
  });
  
  if (content !== original) {
    fs.writeFileSync(file, content, 'utf8');
    totalReplaced++;
    console.log('Updated', file);
  }
});
console.log('Total files updated:', totalReplaced);
