const fs = require('fs');
const content = fs.readFileSync('src/pages/admin/master_data/DataSiswa.jsx', 'utf8');

const regex = /      showToast\("Pengaturan kelas PKL berhasil disimpan!"\);[\s\S]*?      const perusahaan = perusahaanPKL\.find\(p => p\.id === s\.perusahaanId\);/m;

const replacement = `      showToast("Pengaturan kelas PKL berhasil disimpan!");
    } catch (e) {
      showToast("Gagal menyimpan pengaturan", "error");
    }
    setIsSavingSettings(false);
  };

  const pklStudents = useMemo(() => {
     return students.filter(s => s.class_name && s.class_name.toUpperCase().startsWith(eligibleClass.toUpperCase()))
        .map(s => {
           const mapping = pklStudentsMapping.find(m => m.nis === s.nis) || {};
            return {
               id: s.nis,
               nis: s.nis,
               nama: s.name,
               kelas: s.class_name,
               jurusan: s.class_name.split(' ')[1] || 'Umum',
               perusahaanId: mapping.location_id,
               guruPembimbingCode: mapping.teacher_code,
               statusPKL: mapping.location_id ? 'Sudah PKL' : 'Belum PKL',
               lamaPKL: mapping.location_id ? '6 Bulan' : '-'
            };
        });
  }, [students, eligibleClass, pklStudentsMapping]);

  const jurusanOptions = useMemo(() => ['Semua', ...Array.from(new Set(pklStudents.map(s => s.jurusan))).filter(Boolean).filter(m => m.toLowerCase() !== 'semua' && m.toLowerCase() !== 'all')], [pklStudents]);
  const kelasOptions = useMemo(() => ['Semua', ...Array.from(new Set(pklStudents.map(s => s.kelas))).filter(Boolean).filter(k => k.toLowerCase() !== 'semua' && k.toLowerCase() !== 'all')], [pklStudents]);

  const filtered = useMemo(() => {
    return pklStudents.filter((s) => {
      const matchSearch =
        s.nama.toLowerCase().includes(search.toLowerCase()) ||
        s.nis.includes(search);
      const matchJurusan = filterJurusan === 'Semua' || s.jurusan === filterJurusan;
      const matchKelas = filterKelas === 'Semua' || s.kelas === filterKelas;
      return matchSearch && matchJurusan && matchKelas;
    });
  }, [pklStudents, search, filterJurusan, filterKelas]);

  const stats = [
    { label: 'Total Siswa PKL', value: pklStudents.length, icon: Users, iconBg: 'bg-blue-100', iconColor: 'text-blue-600' },
    { label: 'Sudah PKL', value: pklStudents.filter(s => s.statusPKL === 'Sudah PKL').length, icon: CheckCircle2, iconBg: 'bg-emerald-100', iconColor: 'text-emerald-600' },
    { label: 'Belum PKL', value: pklStudents.filter(s => s.statusPKL === 'Belum PKL').length, icon: XCircle, iconBg: 'bg-red-100', iconColor: 'text-red-600' },
  ];

  const handleExport = () => {
    const exportData = filtered.map(s => {
      const guru = teachers.find(g => g.code === s.guruPembimbingCode);
      const perusahaan = perusahaanPKL.find(p => p.id === s.perusahaanId);`;

const newContent = content.replace(regex, replacement);
fs.writeFileSync('src/pages/admin/master_data/DataSiswa.jsx', newContent);
console.log('Fixed DataSiswa.jsx');
