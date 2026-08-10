import { Button } from '../../components/ui.jsx';
import { normalizeUserRole, ROLE_OPTIONS, WAKA_DIVISION_OPTIONS, SUBROLE_OPTIONS_BY_DIVISION } from '../../utils/constants.js';
import { CheckCircle2 } from'lucide-react';
import { Modal, UISelect } from'../ui.jsx';
;


export default function CrudModals({
  modalConfig, closeModal, handleSave, formData, setFormData,
  classes, majors, teachers, subjects, currentUser,
  isSavingModal,
  GRADES, isAllLike, isSuperAdminRole, appSettings,
  rooms, parseCsvList, serializeCsvList, days, selectedDaySetting, teacherAvailability, csvValuesIntersect, setBulkConflictMode, bulkConflictMode, setBulkLoadGrades, bulkLoadGrades, setBulkLoadMajors, bulkLoadMajors, handleBulkAddLoads, calendarCategories, syllabuses, sameText, syllabusCategories
}) {
  const isClassMajorMismatch = modalConfig?.type ==="kelas" && formData?.major && formData?.name && !formData.name.toUpperCase().includes(formData.major.toUpperCase());

  const friendlyModalNames = {
    siswa:"Siswa",
    kelas:"Kelas",
    jurusan:"Jurusan",
    ruangan:"Ruangan",
    guru:"Guru",
    karyawan:"Karyawan",
    Karyawan:"Karyawan",
    mapel:"Mata Pelajaran",
    copy_waktu:"Salin Jadwal Waktu",
    beban:"Beban Mengajar",
    kategori_kalender:"Kategori Kalender",
    event_kalender:"Kegiatan Kalender",
    kategori_silabus:"Kategori Modul Ajar",
    silabus:"Pertemuan Modul Ajar",
    waka_roles:"Hak Akses Waka",
    waktu:"Slot Waktu Hari"
  };

  return (
    <>
      {/* CRUD MODALS */}
      
      <Modal
        isOpen={modalConfig.isOpen && !["bulk","admin","ketersediaan_mapel","generate_slots","silabus_batch","profile_edit","lock_info","bulk_edit"].includes(modalConfig.type)}
        onClose={closeModal}
        title={modalConfig.type ==="silabus" ? `${modalConfig.action ==="add" ?"Tambah" :"Edit"} Pertemuan Modul Ajar` : `${modalConfig.action ==="add" ?"Tambah" :"Edit"} Data ${friendlyModalNames[modalConfig.type] || modalConfig.type}`}
        maxWidth={modalConfig.type ==="silabus" ?"max-w-5xl" : ["guru","karyawan","Karyawan"].includes(modalConfig.type) ?"max-w-3xl" :"max-w-xl"}
      >
        <form onSubmit={handleSave} noValidate className={["guru","karyawan","Karyawan"].includes(modalConfig.type) ?"space-y-3" :"space-y-4"}>
          {modalConfig.type ==="siswa" && (
            <>
              <div>
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 mb-2 block">NIS / NISN</label>
                <input
                  type="text"
                  required
                  disabled={modalConfig.action ==="edit"}
                  value={formData.nis || formData.code ||""}
                  onChange={(e) => setFormData({ ...formData, nis: e.target.value.replace(/[^0-9]/g,''), code: e.target.value.replace(/[^0-9]/g,'') })}
                  className="w-full border-none bg-slate-50 p-3.5 rounded-[var(--ui-radius-small)] text-sm font-bold focus:bg-white focus:outline-[var(--ui-primary)] disabled:opacity-60"
                  placeholder="Contoh: 12345678"
                />
              </div>
              <div>
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 mb-2 block">Nama Lengkap</label>
                <input
                  type="text"
                  required
                  value={formData.name || formData.nama ||""}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value, nama: e.target.value })}
                  className="w-full border-none bg-slate-50 p-3.5 rounded-[var(--ui-radius-small)] text-sm font-bold focus:bg-white focus:outline-[var(--ui-primary)]"
                  placeholder="Contoh: Ahmad Dhani"
                />
              </div>
              <div className="flex flex-col gap-4">
                <div>
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 mb-2 block">Kelas</label>
                  <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto p-1">
                    {classes.map((c) => (
                        <button
                          key={c.name}
                          type="button"
                          onClick={() => setFormData({ ...formData, class_name: c.name, kelas: c.name })}
                          className={`px-3 py-1.5 rounded-[var(--ui-radius-small)] text-xs font-bold transition-colors border ${
                            (formData.class_name === c.name || formData.kelas === c.name)
                              ?"bg-[var(--ui-primary)] text-white border-[var(--ui-primary)] shadow-sm"
                              :"bg-white text-slate-600 border-slate-200 hover:border-[var(--ui-primary)] hover:text-[var(--ui-primary)]"
                          }`}
                        >
                        {c.name}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 mb-2 block">Jenis Kelamin</label>
                  <div className="flex gap-2 p-1">
                    {[
                      { val:"L", label:"Laki-laki" },
                      { val:"P", label:"Perempuan" }
                    ].map(opt => (
                        <button
                          key={opt.val}
                          type="button"
                          onClick={() => setFormData({ ...formData, gender: opt.val })}
                          className={`flex-1 py-2 rounded-[var(--ui-radius-small)] text-sm font-bold transition-colors border ${
                            (formData.gender ||"L") === opt.val
                              ?"bg-[var(--ui-primary)] text-white border-[var(--ui-primary)] shadow-sm"
                              :"bg-white text-slate-600 border-slate-200 hover:border-[var(--ui-primary)] hover:text-[var(--ui-primary)]"
                          }`}
                        >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              <div>
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 mb-2 block">No. HP Orang Tua (WhatsApp)</label>
                <input
                  type="text"
                  value={formData.wa_ortu || formData.phone ||""}
                  onChange={(e) => setFormData({ ...formData, wa_ortu: e.target.value.replace(/[^0-9]/g,''), phone: e.target.value.replace(/[^0-9]/g,'') })}
                  className="w-full border-none bg-slate-50 p-3.5 rounded-[var(--ui-radius-small)] text-sm font-bold focus:bg-white focus:outline-[var(--ui-primary)]"
                  placeholder="Contoh: 628123456789 (gunakan format kode negara)"
                />
                <p className="text-[10px] text-slate-500 font-bold mt-1">Gunakan awalan 62 untuk notifikasi otomatis WhatsApp.</p>
              </div>
            </>
          )}
          {modalConfig.type ==="kelas" && (
            <>
              <div><label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 mb-2 block">Nama Kelas</label><input type="text" required value={formData.name ||""} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="w-full border-none bg-slate-50 p-3.5 rounded-[var(--ui-radius-small)] text-sm font-bold focus:bg-white focus:outline-[var(--ui-primary)]" placeholder="Contoh: X TKR 1" /></div>
              <div><label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 mb-2 block">Jurusan</label><UISelect required value={formData.major ||""} onChange={(e) => setFormData({ ...formData, major: e.target.value })} className="w-full border-none bg-slate-50 p-3.5 rounded-[var(--ui-radius-small)] text-sm font-bold focus:bg-white focus:outline-[var(--ui-primary)]"><option value="">-- Pilih Jurusan --</option>{majors.map((m) => (<option key={m}>{m}</option>))}</UISelect></div>
              {isSuperAdminRole(currentUser?.role) && (
                <div>
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 mb-2 block">Wali Kelas</label>
                  <UISelect
                    value={formData.homeroom ||""}
                    onChange={(e) => setFormData({ ...formData, homeroom: e.target.value })}
                    className="w-full border-none bg-slate-50 p-3.5 rounded-[var(--ui-radius-small)] text-sm font-bold focus:bg-white focus:outline-[var(--ui-primary)]"
                  >
                    <option value="">-- Pilih Wali Kelas (Opsional) --</option>
                    {teachers.map((t) => (
                      <option key={t.code} value={t.code}>{t.name} ({t.code})</option>
                    ))}
                  </UISelect>
                </div>
              )}
              {isClassMajorMismatch && <div className="text-xs font-bold text-rose-600 bg-red-50 border border-red-200 px-3 py-2 rounded-[var(--ui-radius-small)]">Nama kelas harus memuat jurusan yang dipilih.</div>}
            </>
          )}
          {modalConfig.type ==="jurusan" && (
            <>
              <div><label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 mb-2 block">Nama Jurusan</label><input type="text" required value={formData.name ||""} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="w-full border-none bg-slate-50 p-3.5 rounded-[var(--ui-radius-small)] text-sm font-bold focus:bg-white focus:outline-[var(--ui-primary)]" placeholder="Contoh: TKR" /></div>
            </>
          )}
          {modalConfig.type ==="ruangan" && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 mb-2 block">ID Ruang</label><input type="text" required value={formData.id ||""} onChange={(e) => setFormData({ ...formData, id: e.target.value })} className="w-full border-none bg-slate-50 p-3.5 rounded-[var(--ui-radius-small)] text-sm font-bold focus:bg-white focus:outline-[var(--ui-primary)] uppercase" placeholder="B01" /></div>
                <div><label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 mb-2 block">Tipe</label><UISelect required value={formData.type ||""} onChange={(e) => setFormData({ ...formData, type: e.target.value })} className="w-full border-none bg-slate-50 p-3.5 rounded-[var(--ui-radius-small)] text-sm font-bold focus:bg-white focus:outline-[var(--ui-primary)]"><option value="" disabled>-- Pilih Tipe --</option><option value="Teori">Teori (Kelas)</option><option value="Praktik">Praktik (Bengkel/Lab)</option></UISelect></div>
              </div>
              <div><label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 mb-2 block">Nama Ruangan</label><input type="text" required value={formData.name ||""} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="w-full border-none bg-slate-50 p-3.5 rounded-[var(--ui-radius-small)] text-sm font-bold focus:bg-white focus:outline-[var(--ui-primary)]" placeholder="Bengkel Otomotif / Lab Bahasa" /></div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 mb-2 block">Khusus Jurusan</label><UISelect required value={formData.major ||""} onChange={(e) => setFormData({ ...formData, major: e.target.value })} className="w-full border-none bg-slate-50 p-3.5 rounded-[var(--ui-radius-small)] text-sm font-bold focus:bg-white focus:outline-[var(--ui-primary)]"><option value="" disabled>-- Pilih Jurusan --</option><option value="All">Semua Jurusan / Umum</option>{majors.map((m) => (<option key={m}>{m}</option>))}</UISelect></div>
                <div><label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 mb-2 block">Target Tingkat Kelas</label><UISelect required value={formData.targetGrade ||"Semua"} onChange={(e) => setFormData({ ...formData, targetGrade: e.target.value })} className="w-full border-none bg-slate-50 p-3.5 rounded-[var(--ui-radius-small)] text-sm font-bold focus:bg-white focus:outline-[var(--ui-primary)]"><option value="Semua">Semua Tingkat (Umum)</option><option value="X">Khusus Kelas X</option><option value="XI">Khusus Kelas XI</option><option value="XII">Khusus Kelas XII</option></UISelect></div>
              </div>
              <div className="flex items-center gap-3 p-3.5 bg-slate-50 border-none rounded-[var(--ui-radius-small)] mt-2 cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => setFormData({ ...formData, isPriority: !formData.isPriority })}>
                 <input type="checkbox" checked={!!formData.isPriority} onChange={() => {}} className="w-5 h-5 accent-[var(--ui-primary)] pointer-events-none" />
                 <div>
                   <div className="text-sm font-bold text-slate-800">Jadikan Prioritas Utama</div>
                   <div className="text-[10px] text-slate-500 font-medium">Ruang ini akan selalu didahulukan dipakai saat generate jadwal otomatis.</div>
                 </div>
              </div>
            </>
          )}
          {["guru","karyawan","Karyawan"].includes(modalConfig.type) && (
            <>
              {/* Row 1: Kode & Nama Lengkap */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="md:col-span-1">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 mb-1.5 block">
                    {modalConfig.type ==="guru" ?"Kode Guru" :"Kode Karyawan"}
                  </label>
                  <input
                    type="text"
                    required
                    disabled={modalConfig.action ==="edit"}
                    value={formData.code ||""}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                    className={`w-full border-none p-3 rounded-[var(--ui-radius-small)] text-xs font-mono font-bold ${
                      modalConfig.action ==="edit"
                        ?"bg-slate-100 cursor-not-allowed opacity-75"
                        :"bg-slate-50 focus:bg-white focus:outline-[var(--ui-primary)]"
                    }`}
                    placeholder={modalConfig.type ==="guru" ?"G01" :"K01"}
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 mb-1.5 block">Nama Lengkap</label>
                  <input type="text" required value={formData.name ||""} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="w-full border-none bg-slate-50 p-3 rounded-[var(--ui-radius-small)] text-xs font-bold focus:bg-white focus:outline-[var(--ui-primary)]" placeholder="Budi Santoso, S.Pd" />
                </div>
              </div>

              {/* Row 2: No. WhatsApp & WA Notifikasi */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 mb-1.5 block">No. WhatsApp / HP</label>
                  <input type="text" value={formData.phone ||""} onChange={(e) => setFormData({ ...formData, phone: e.target.value.replace(/[^0-9]/g,'') })} className="w-full border-none bg-slate-50 p-3 rounded-[var(--ui-radius-small)] text-xs font-bold focus:bg-white focus:outline-[var(--ui-primary)]" placeholder="Contoh: 628123456789" />
                </div>
                <div>
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 mb-1.5 block">WA Penerima Notifikasi (Opsional)</label>
                  <input type="text" value={formData.notify_phone ||""} onChange={(e) => setFormData({ ...formData, notify_phone: e.target.value.replace(/[^0-9]/g,'') })} className="w-full border-none bg-slate-50 p-3 rounded-[var(--ui-radius-small)] text-xs font-bold focus:bg-white focus:outline-[var(--ui-primary)]" placeholder="Contoh: 628123456789" />
                </div>
              </div>

              {/* Row 3: Level Akses & Bidang Waka */}
              {isSuperAdminRole(currentUser?.role) && (
                <div className="space-y-3 rounded-[var(--ui-radius-small)] border border-slate-200 bg-slate-50/50 p-3">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 mb-1.5 block">Level Akses</label>
                      <UISelect
                        value={normalizeUserRole(formData.role)}
                        onChange={(e) => {
                          const nextRole = normalizeUserRole(e.target.value);
                          setFormData({
                            ...formData,
                            role: nextRole,
                            division: nextRole === "waka" ? (formData.division || WAKA_DIVISION_OPTIONS[0].value) : "",
                            subrole: ""
                          });
                        }}
                        className="w-full"
                      >
                        {ROLE_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>{option.label}</option>
                        ))}
                      </UISelect>
                    </div>
                    <div>
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 mb-1.5 block">Bidang Waka</label>
                      {normalizeUserRole(formData.role) === "waka" ? (
                        <UISelect
                          value={formData.division || WAKA_DIVISION_OPTIONS[0].value}
                          onChange={(e) => setFormData({ ...formData, division: e.target.value, subrole: "" })}
                          className="w-full text-amber-700"
                        >
                          {WAKA_DIVISION_OPTIONS.map((option) => (
                            <option key={option.value} value={option.value}>
                              {appSettings[`waka${option.value.charAt(0).toUpperCase() + option.value.slice(1)}Label`] || option.label}
                            </option>
                          ))}
                        </UISelect>
                      ) : (
                        <UISelect
                          disabled
                          value=""
                          className="w-full text-slate-400"
                        >
                          <option value="">Tidak perlu bidang</option>
                        </UISelect>
                      )}
                    </div>
                  </div>
                  {/* Subrole / Jabatan */}
                  {(normalizeUserRole(formData.role) === "guru" || normalizeUserRole(formData.role) === "karyawan" || normalizeUserRole(formData.role) === "tu") && (
                    <div>
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 mb-1.5 block">
                        Jabatan / Tugas Tambahan
                      </label>
                      <UISelect
                        value={formData.subrole || ""}
                        onChange={(e) => setFormData({ ...formData, subrole: e.target.value })}
                        className="w-full"
                      >
                        {(SUBROLE_OPTIONS_BY_DIVISION[formData.division] || SUBROLE_OPTIONS_BY_DIVISION[formData.role] || SUBROLE_OPTIONS_BY_DIVISION.none).map((opt) => (
                          <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                      </UISelect>
                      <p className="text-[10px] text-slate-400 font-medium mt-1 ml-1">Menentukan posisi spesifik dan hak akses bawaan personel ini.</p>
                    </div>
                  )}
                </div>
              )}

              {/* Row 4: Kategori & Prioritas Jurusan */}
              {modalConfig.type ==="guru" ? (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="md:col-span-1">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 mb-1.5 block">Kategori</label>
                    <UISelect 
                      required 
                      value={formData.type ||"Umum"} 
                      onChange={(e) => setFormData({ ...formData, type: e.target.value })} 
                      className="w-full"
                    >
                      <option value="Umum">Guru Umum</option>
                      <option value="Jurusan">Guru Kejuruan</option>
                      <option value="Campuran">Guru Campuran</option>
                    </UISelect>
                  </div>
                  <div className="md:col-span-2">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 mb-1.5 block">Prioritas Jurusan</label>
                    <div className="border border-slate-200 bg-white rounded-[var(--ui-radius-small)] p-2.5 shadow-sm">
                      <div className="flex items-center gap-2 mb-1.5 pb-1.5 border-b border-slate-100">
                        <input 
                          type="checkbox" 
                          checked={!formData.preferredMajor || formData.preferredMajor ==="Semua" || formData.preferredMajor ==="All"}
                          onChange={(e) => {
                            if (e.target.checked) setFormData({ ...formData, preferredMajor:"Semua" });
                          }}
                          className="w-4 h-4 rounded-[var(--ui-radius-small)] text-[var(--ui-primary)] focus:ring-[var(--ui-primary)] border-slate-300 cursor-pointer"
                        />
                        <label className="text-xs font-bold text-slate-700 cursor-pointer flex-1" onClick={() => setFormData({ ...formData, preferredMajor:"Semua" })}>Semua Jurusan</label>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 max-h-24 overflow-y-auto">
                        {majors.map((m) => {
                          const isSemua = !formData.preferredMajor || formData.preferredMajor ==="Semua" || formData.preferredMajor ==="All";
                          const selectedMajors = isSemua ? [] : String(formData.preferredMajor).split(',').map(x=>x.trim()).filter(Boolean);
                          const isChecked = selectedMajors.includes(m);
                          
                          const toggleCheck = () => {
                            let nextMajors = [...selectedMajors];
                            if (!isChecked) {
                              if (!nextMajors.includes(m)) nextMajors.push(m);
                            } else {
                              nextMajors = nextMajors.filter(x => x !== m);
                            }
                            const nextVal = nextMajors.length > 0 ? nextMajors.join(',') :"Semua";
                            setFormData({ ...formData, preferredMajor: nextVal });
                          };

                          return (
                            <div key={m} className="flex items-center gap-1.5 py-0.5 hover:bg-slate-50 rounded-[var(--ui-radius-small)] px-1 transition-colors">
                              <input 
                                type="checkbox" 
                                checked={isChecked}
                                onChange={toggleCheck}
                                className="w-3.5 h-3.5 rounded-[var(--ui-radius-small)] text-[var(--ui-primary)] focus:ring-[var(--ui-primary)] border-slate-300 cursor-pointer"
                              />
                              <label className="text-[11px] font-semibold text-slate-600 cursor-pointer flex-1 truncate" onClick={toggleCheck}>{m}</label>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div>
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 mb-1.5 block">Bagian / Divisi</label>
                  <input
                    type="text"
                    required
                    value={formData.division ||""}
                    onChange={(e) => setFormData({ ...formData, division: e.target.value })}
                    className="w-full border-none bg-slate-50 p-3 rounded-[var(--ui-radius-small)] text-xs font-bold focus:bg-white focus:outline-[var(--ui-primary)]"
                    placeholder="Contoh: Kebersihan, Keamanan, Administrasi, dll."
                  />
                </div>
              )}

              {/* Row 5: Prioritas Tingkat & Target JP */}
              {modalConfig.type ==="guru" && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 mb-1.5 block">Prioritas Tingkat</label>
                    <UISelect required value={formData.preferredGrade ||"Semua"} onChange={(e) => setFormData({ ...formData, preferredGrade: e.target.value })} className="w-full">
                      <option value="Semua">Semua Tingkat</option>
                      {GRADES.filter(g => g !=='Semua').map((m) => (<option key={m} value={m}>Tingkat {m}</option>))}
                    </UISelect>
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 mb-1.5 block">Target JP/Minggu</label>
                    <input type="text" inputMode="numeric" value={formData.targetWeeklyJp ||""} onChange={(e) => setFormData({ ...formData, targetWeeklyJp: e.target.value.replace(/[^0-9]/g,'') })} className="w-full border-none bg-slate-50 p-3 rounded-[var(--ui-radius-small)] text-xs font-bold focus:bg-white focus:outline-[var(--ui-primary)]" placeholder="Contoh: 40" />
                  </div>
                </div>
              )}

              {/* Row 6: Password Akun */}
              <div>
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 mb-1.5 block">Password Akun</label>
                <input type="password" value={formData.password ||""} onChange={(e) => setFormData({ ...formData, password: e.target.value })} className="w-full border-none bg-slate-50 p-3 rounded-[var(--ui-radius-small)] text-xs font-bold focus:bg-white focus:outline-[var(--ui-primary)]" placeholder={modalConfig.action ==="add" ?"Kosongkan untuk password default 123" :"Kosongkan jika tidak diubah"} />
              </div>
            </>
          )}
          {modalConfig.type ==="mapel" && (
            <>
              <div><label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 mb-2 block">Nama Mapel</label><input type="text" required value={formData.name ||""} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="w-full border-none bg-slate-50 p-3.5 rounded-[var(--ui-radius-small)] text-sm font-bold focus:bg-white focus:outline-[var(--ui-primary)]" placeholder="Contoh: Pemrograman Dasar" /></div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 mb-2 block">Tingkat (Grade)</label>
                  <div className="border-none bg-slate-50 p-3 rounded-[var(--ui-radius-small)]">
                    {(() => {
                      const selectedGrades = String(formData.grade ||"Semua").split(",").map((x) => x.trim()).filter((x) => x && x !=="Semua");
                      const isAllGrades = !formData.grade || formData.grade ==="Semua";
                      return (
                        <div className="space-y-2">
                          <label className={`cursor-pointer px-3 py-2 rounded-[var(--ui-radius-small)] border text-xs font-bold transition-colors flex items-center justify-between ${isAllGrades ?'bg-[var(--ui-primary)] text-white border-[var(--ui-primary)] shadow-sm' :'bg-white text-slate-600 border-slate-200 hover:border-emerald-300'}`}>
                            <input type="checkbox" className="hidden" checked={isAllGrades} onChange={() => setFormData({ ...formData, grade:"Semua" })} />
                            <span>Semua Kelas</span>
                            {isAllGrades && <CheckCircle2 size={14} />}
                          </label>
                          <div className="grid grid-cols-3 gap-2">
                            {GRADES.filter((g) => g !=="Semua").map((g) => {
                              const isSelected = !isAllGrades && selectedGrades.includes(g);
                              return (
                                <label key={g} className={`cursor-pointer px-3 py-2 rounded-[var(--ui-radius-small)] border text-xs font-bold text-center transition-colors ${isSelected ?'bg-[var(--ui-primary)] text-white border-[var(--ui-primary)] shadow-sm' :'bg-white text-slate-600 border-slate-200 hover:border-emerald-300'}`}>
                                  <input
                                    type="checkbox"
                                    className="hidden"
                                    checked={isSelected}
                                    onChange={(e) => {
                                      const nextGrades = e.target.checked
                                        ? [...new Set([...selectedGrades, g])]
                                        : selectedGrades.filter((item) => item !== g);
                                      setFormData({ ...formData, grade: nextGrades.length > 0 ? nextGrades.join(",") :"Semua" });
                                    }}
                                  />
                                  Kelas {g}
                                </label>
                              );
                            })}
                          </div>
                          <p className="text-[10px] text-slate-500 font-bold">Dipilih: {isAllGrades ?"Semua Kelas" : selectedGrades.map((g) => `Kelas ${g}`).join(",")}</p>
                        </div>
                      );
                    })()}
                  </div>
                </div>
                <div>
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 mb-2 block">Khusus Jurusan</label>
                  <div className="flex flex-wrap gap-2">
                    <label className={`cursor-pointer px-3 py-2 rounded-[var(--ui-radius-small)] border text-xs font-bold transition-colors ${(!formData.major || formData.major ==="Umum" || formData.major ==="All") ?'bg-[var(--ui-primary)] text-white border-[var(--ui-primary)] shadow-sm' :'bg-slate-50 text-slate-600 border-slate-200 hover:border-emerald-300'}`}>
                      <input type="checkbox" className="hidden" 
                        checked={!formData.major || formData.major ==="Umum" || formData.major ==="All"}
                        onChange={() => setFormData({ ...formData, major:"Umum" })} />
                      Umum (Semua Jurusan)
                    </label>
                    {majors.map(m => {
                      const currentMajors = (formData.major && formData.major !=="Umum" && formData.major !=="All") ? formData.major.split(",").map(x=>x.trim()).filter(Boolean) : [];
                      const isSelected = currentMajors.includes(m);
                      return (
                        <label key={m} className={`cursor-pointer px-3 py-2 rounded-[var(--ui-radius-small)] border text-xs font-bold transition-colors ${isSelected ?'bg-[var(--ui-primary)] text-white border-[var(--ui-primary)] shadow-sm' :'bg-slate-50 text-slate-600 border-slate-200 hover:border-emerald-300'}`}>
                          <input type="checkbox" className="hidden"
                            checked={isSelected}
                            onChange={(e) => {
                              let nextMajors = [...currentMajors];
                              if (e.target.checked) {
                                nextMajors.push(m);
                              } else {
                                nextMajors = nextMajors.filter(x => x !== m);
                              }
                              setFormData({ ...formData, major: nextMajors.length > 0 ? nextMajors.join(",") :"Umum" });
                            }}
                          />
                          {m}
                        </label>
                      );
                    })}
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 mb-2 block">Durasi Default (JP)</label><input type="text" inputMode="numeric" required value={formData.defaultDuration ||""} onChange={(e) => setFormData({ ...formData, defaultDuration: e.target.value.replace(/[^0-9]/g,'') })} className="w-full border-none bg-slate-50 p-3.5 rounded-[var(--ui-radius-small)] text-sm font-bold focus:bg-white focus:outline-[var(--ui-primary)]" /></div>
                <div><label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 mb-2 block">Posisi Jadwal</label><UISelect required value={formData.position ||"any"} onChange={(e) => setFormData({ ...formData, position: e.target.value })} className="w-full border-none bg-slate-50 p-3.5 rounded-[var(--ui-radius-small)] text-sm font-bold focus:bg-white focus:outline-[var(--ui-primary)]"><option value="any">Bebas (Otomatis)</option><option value="any_not_last">Bebas (Kecuali Jam Terakhir)</option><option value="first">Awal Pagi (Jam Pertama)</option><option value="last">Akhir Siang (Jam Terakhir)</option><option value="after_practice">Khusus: Di Hari Praktik (Bebas Jam)</option><option value="after_practice_last">Khusus: Di Hari Praktik (Jam Terakhir)</option>{Array.from({ length: 15 }, (_, i) => i + 1).map(num => (<option key={`slot_${num}`} value={`slot_${num}`}>Spesifik: Jam ke-{num}</option>))}</UISelect></div>
              </div>
              <div className="flex items-center gap-3 bg-[#f4fbf6] p-4 border border-[var(--ui-primary)]/20 rounded-[var(--ui-radius-small)] cursor-pointer"><input type="checkbox" id="block" checked={formData.isBlock || false} onChange={(e) => setFormData({ ...formData, isBlock: e.target.checked })} className="w-5 h-5 accent-[var(--ui-primary)] cursor-pointer" /><label htmlFor="block" className="text-sm font-bold text-[var(--ui-primary)] cursor-pointer">Jadikan Mapel Praktik (Butuh Lab/Bengkel)</label></div>
              {(formData.isBlock || false) && (
                <div className="border-none rounded-[var(--ui-radius-small)] p-4 bg-slate-50/70">
                  <div className="flex items-center justify-between gap-3 mb-3">
                    <div>
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 block">Ruangan Praktik yang Diizinkan</label>
                      <p className="text-[10px] text-slate-500 font-semibold ml-1 mt-1">Pilih lebih dari satu ruang jika mapel ini bisa dipakai di beberapa lab/bengkel. Kosongkan untuk memakai semua ruang praktik.</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, practiceRoomIds:"" })}
                      className="text-[11px] text-slate-500 hover:text-slate-700 bg-white border-none rounded-[var(--ui-radius-small)] h-10 px-4 text-sm font-bold"
                    >
                      Kosongkan
                    </button>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-52 overflow-y-auto pr-1">
                    {rooms.filter((r) => String(r.type ||"").trim().toLowerCase() ==="praktik").length > 0 ? (
                      rooms.filter((r) => String(r.type ||"").trim().toLowerCase() ==="praktik").map((room) => {
                        const selectedIds = parseCsvList(formData.practiceRoomIds);
                        const isSelected = selectedIds.includes(room.id);
                        const toggleRoom = () => {
                          const nextIds = isSelected
                            ? selectedIds.filter((id) => id !== room.id)
                            : [...selectedIds, room.id];
                          setFormData({ ...formData, practiceRoomIds: serializeCsvList(nextIds) });
                        };
                        return (
                          <label key={room.id} className={`flex items-center gap-3 px-3 py-2.5 rounded-[var(--ui-radius-small)] border cursor-pointer transition-colors ${isSelected ?"bg-[var(--ui-primary)]/10 border-[var(--ui-primary)]/30" :"bg-white border-slate-200 hover:border-[var(--ui-primary)]/20"}`}>
                            <input type="checkbox" checked={isSelected} onChange={toggleRoom} className="w-4 h-4 accent-[var(--ui-primary)] cursor-pointer" />
                            <div className="min-w-0">
                              <div className="text-xs font-bold text-slate-800 truncate">{room.name}</div>
                              <div className="text-[10px] font-semibold text-slate-500 truncate">{room.id} - {room.major ||"All"}</div>
                            </div>
                          </label>
                        );
                      })
                    ) : (
                      <div className="text-xs font-semibold text-slate-500 bg-white border border-dashed border-slate-200 rounded-[var(--ui-radius-small)] p-3">Belum ada data ruangan praktik. Tambahkan ruangan praktik terlebih dahulu.</div>
                    )}
                  </div>
                </div>
              )}
            </>
          )}
          {modalConfig.type ==="copy_waktu" && (
            <>
              <div>
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 mb-2 block">Salin Dari Hari</label>
                <UISelect value={formData.sourceDay ||""} onChange={(e) => setFormData({ ...formData, sourceDay: e.target.value })} className="w-full border-none bg-slate-50 p-3.5 rounded-[var(--ui-radius-small)] text-sm font-bold focus:bg-white focus:outline-[var(--ui-primary)]" required>
                  <option value="">-- Pilih Hari Sumber --</option>
                  {days.filter(d => d !== selectedDaySetting).map(d => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </UISelect>
                <p className="text-[10px] text-orange-500 font-bold mt-2">Peringatan: Tindakan ini akan menghapus jadwal waktu di hari {selectedDaySetting} saat ini dan menimpanya dengan jadwal dari hari yang dipilih!</p>
              </div>
            </>
          )}

          {modalConfig.type ==="beban" && (
            <>
              <div>
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 mb-2 block">Mengajar Mapel</label>
                <UISelect value={formData.subject ||""} onChange={(e) => { const s = subjects.find((x) => x.name === e.target.value); setFormData({ ...formData, subject: e.target.value, isBlock: s?.isBlock || false, duration: s?.defaultDuration || 2, targetGrade: s?.grade !=='Semua' ? s?.grade :'All', targetMajor: !isAllLike(s?.major, ["Umum","Semua","All"]) ? s?.major :'All', teacherCode:"" }); }} required className="w-full border-none bg-slate-50 p-3.5 rounded-[var(--ui-radius-small)] text-sm font-bold focus:bg-white focus:outline-[var(--ui-primary)]">
                  <option value="">-- Pilih Mapel --</option>{subjects.map((s) => (<option key={s.name} value={s.name}>{s.name} {s.isBlock ?"(Praktik)" :""} {!isAllLike(s.major, ["Umum","Semua","All"]) || s.grade !=='Semua' ? `[${s.grade}-${s.major}]` :""}</option>))}
                </UISelect>
                <p className="text-[10px] text-slate-500 font-bold mt-2">Target mapel terisi otomatis dari master mapel, tetap bisa diubah manual.</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 mb-2 block">Guru Utama (Wajib)</label>
                  <UISelect value={formData.teacherCode ||""} onChange={(e) => setFormData({ ...formData, teacherCode: e.target.value })} required className="w-full border-none bg-slate-50 p-3.5 rounded-[var(--ui-radius-small)] text-sm font-bold focus:bg-white focus:outline-[var(--ui-primary)]">
                    <option value="">-- Pilih Guru Utama --</option>{teachers.map((t) => {
                      const isRecommendedSubj = formData.subject && teacherAvailability[t.code]?.subjects?.includes(formData.subject);
                      const isRecommendedMajor = t.preferredMajor &&
                        !isAllLike(t.preferredMajor, ["Semua","All"]) &&
                        csvValuesIntersect(t.preferredMajor, formData.targetMajor ||"All", ["Semua","All"]);
                      const recommendedText = (isRecommendedSubj && isRecommendedMajor) ?"(Mapel & Jurusan)" : isRecommendedSubj ?"(Kompetensi)" : isRecommendedMajor ?"(Jurusan)" :"";
                      return (<option key={t.code} value={t.code}>{t.code} - {t.name} {recommendedText}</option>);
                    })}
                  </UISelect>
                </div>
                <div>
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 mb-2 block">Guru Pendamping (Team Teaching)</label>
                  <UISelect value={formData.teamTeacher ||""} onChange={(e) => setFormData({ ...formData, teamTeacher: e.target.value })} className="w-full border-none bg-slate-50 p-3.5 rounded-[var(--ui-radius-small)] text-sm font-bold focus:bg-white focus:outline-[var(--ui-primary)]">
                    <option value="">-- Tidak Ada --</option>
                    {teachers.filter(t => t.code !== formData.teacherCode).map((t) => (
                      <option key={t.code} value={t.code}>{t.code} - {t.name}</option>
                    ))}
                  </UISelect>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 mb-2 block">Untuk Tingkat</label>
                  <div className="border-none bg-slate-50 p-3 rounded-[var(--ui-radius-small)] text-sm">
                    <label className="flex items-center gap-2 font-bold text-slate-700 mb-2"><input type="checkbox" checked={(formData.targetGrade ||"All") ==="All"} onChange={(e) => setFormData({ ...formData, targetGrade: e.target.checked ?"All" :"" })} className="accent-[var(--ui-primary)]" /> Semua Tingkat</label>
                    <div className="flex gap-4">
                      {["X","XI","XII"].map((g) => {
                        const selected = (formData.targetGrade ||"").split(",").map((x) => x.trim()).includes(g);
                        return <label key={g} className="flex items-center gap-2 font-bold text-slate-700"><input type="checkbox" checked={(formData.targetGrade ||"All") !=="All" && selected} onChange={(e) => { const arr = (formData.targetGrade ||"All").split(",").map((x) => x.trim()).filter(Boolean).filter(x => x !=="All"); const next = e.target.checked ? [...new Set([...arr, g])] : arr.filter((x) => x !== g); setFormData({ ...formData, targetGrade: next.length ? next.join(",") :"All" }); }} className="accent-[var(--ui-primary)]" /> {g}</label>;
                      })}
                    </div>
                    <p className="text-[10px] text-slate-500 font-bold mt-2">Dipilih: {(formData.targetGrade ||"All") ==="All" ?"Semua Tingkat" : (formData.targetGrade ||"-")}</p>
                  </div>
                </div>
                <div>
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 mb-2 block">Untuk Jurusan</label>
                  <div className="border-none bg-slate-50 p-3 rounded-[var(--ui-radius-small)] text-sm">
                    <label className="flex items-center gap-2 font-bold text-slate-700 mb-2">
                      <input type="checkbox" checked={(formData.targetMajor ||"All") ==="All"} onChange={(e) => setFormData({ ...formData, targetMajor: e.target.checked ?"All" :"" })} className="accent-[var(--ui-primary)]" /> Semua Jurusan
                    </label>
                    <div className="flex flex-wrap gap-4">
                      {majors.map((m) => {
                        const selected = (formData.targetMajor ||"").split(",").map((x) => x.trim()).includes(m);
                        return (
                          <label key={m} className="flex items-center gap-2 font-bold text-slate-700">
                            <input type="checkbox" checked={(formData.targetMajor ||"All") !=="All" && selected} onChange={(e) => { const arr = (formData.targetMajor ||"All").split(",").map((x) => x.trim()).filter(Boolean).filter(x => x !=="All"); const next = e.target.checked ? [...new Set([...arr, m])] : arr.filter((x) => x !== m); setFormData({ ...formData, targetMajor: next.length ? next.join(",") :"All" }); }} className="accent-[var(--ui-primary)]" /> {m}
                          </label>
                        );
                      })}
                    </div>
                    <p className="text-[10px] text-slate-500 font-bold mt-2">Dipilih: {(formData.targetMajor ||"All") ==="All" ?"Semua Jurusan" : (formData.targetMajor ||"-")}</p>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div><label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 mb-2 block">Durasi (JP) Per Kelas</label><input type="text" inputMode="numeric" required value={formData.duration ||""} onChange={(e) => setFormData({ ...formData, duration: e.target.value.replace(/[^0-9]/g,'') })} className="w-full border-none bg-slate-50 p-3.5 rounded-[var(--ui-radius-small)] text-sm font-bold focus:bg-white focus:outline-[var(--ui-primary)]" /></div>
                <div>
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 mb-2 block">Maks Kelas</label>
                  <input type="text" inputMode="numeric" value={formData.maxClasses ||""} onChange={(e) => setFormData({ ...formData, maxClasses: e.target.value.replace(/[^0-9]/g,'') })} className="w-full border-none bg-slate-50 p-3.5 rounded-[var(--ui-radius-small)] text-sm font-bold focus:bg-white focus:outline-[var(--ui-primary)]" placeholder="Kosong = bebas" />
                  <p className="text-[10px] text-slate-500 font-bold mt-2">Contoh: isi 1 agar guru ini hanya dipakai untuk 1 kelas pada beban ini.</p>
                </div>
              </div>
              {modalConfig.action ==="add" && (
                <div className="border border-[var(--ui-primary)]/30 bg-[var(--ui-accent)]/20/40 rounded-[var(--ui-radius-small)] p-3 space-y-3">
                  <p className="text-[10px] font-black text-[var(--ui-primary)] uppercase tracking-widest">Quick Add Massal</p>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                    <button type="button" onClick={() => setBulkConflictMode("skip")} className={`px-2 py-1 rounded-[var(--ui-radius-small)] text-xs font-bold border ${bulkConflictMode ==="skip" ?"bg-[var(--ui-primary)] text-white border-[var(--ui-primary)]" :"bg-white text-slate-600 border-slate-200"}`}>Skip Duplikat</button>
                    <button type="button" onClick={() => setBulkConflictMode("replace")} className={`px-2 py-1 rounded-[var(--ui-radius-small)] text-xs font-bold border ${bulkConflictMode ==="replace" ?"bg-[var(--ui-primary)] text-white border-[var(--ui-primary)]" :"bg-white text-slate-600 border-slate-200"}`}>Replace Existing</button>
                    <button type="button" onClick={() => setBulkConflictMode("keep")} className={`px-2 py-1 rounded-[var(--ui-radius-small)] text-xs font-bold border ${bulkConflictMode ==="keep" ?"bg-[var(--ui-primary)] text-white border-[var(--ui-primary)]" :"bg-white text-slate-600 border-slate-200"}`}>Keep Both</button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {["X","XI","XII"].map((g) => (
                      <button type="button" key={g} onClick={() => setBulkLoadGrades((prev) => prev.includes(g) ? prev.filter((x) => x !== g) : [...prev, g])} className={`px-2 py-1 rounded-[var(--ui-radius-small)] text-xs font-bold border ${bulkLoadGrades.includes(g) ?"bg-[var(--ui-primary)] text-white border-[var(--ui-primary)]" :"bg-white text-slate-600 border-slate-200"}`}>{g}</button>
                    ))}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {majors.map((m) => (
                      <button type="button" key={m} onClick={() => setBulkLoadMajors((prev) => prev.includes(m) ? prev.filter((x) => x !== m) : [...prev, m])} className={`px-2 py-1 rounded-[var(--ui-radius-small)] text-xs font-bold border ${bulkLoadMajors.includes(m) ?"bg-[var(--ui-accent)] text-[var(--ui-primary)] border-[var(--ui-accent)]" :"bg-white text-slate-600 border-slate-200"}`}>{m}</button>
                    ))}
                  </div>
                  {(bulkLoadGrades.length > 0 && bulkLoadMajors.length > 0) && (
                    <div className="bg-white border border-[var(--ui-primary)]/20 rounded-[var(--ui-radius-small)] p-2 max-h-28 overflow-y-auto">
                      <p className="text-[10px] font-bold text-slate-500 mb-1">Preview kombinasi:</p>
                      <div className="flex flex-wrap gap-1">
                        {bulkLoadGrades.flatMap((g) => bulkLoadMajors.map((m) => `${g}-${m}`)).map((k) => (
                          <span key={k} className="text-[10px] px-2 py-0.5 rounded-[var(--ui-radius-small)] bg-slate-100 text-slate-700 font-bold">{k}</span>
                        ))}
                      </div>
                    </div>
                  )}
                  <Button type="button" variant="accent" className="w-full text-xs" onClick={handleBulkAddLoads}>Tambah Massal ({bulkLoadGrades.length * bulkLoadMajors.length || 0} Entri)</Button>
                </div>
              )}
            </>
          )}
          {modalConfig.type ==="kategori_kalender" && (
            <>
              <div>
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 mb-2 block">Nama Kategori</label>
                <input type="text" required value={formData.name ||""} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="w-full border-none bg-slate-50 p-3.5 rounded-[var(--ui-radius-small)] text-sm font-bold focus:bg-white focus:outline-[var(--ui-primary)]" placeholder="Contoh: Kesiswaan, Libur Nasional" />
              </div>
              <div>
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 mb-2 block">Warna Kategori</label>
                <UISelect value={formData.color ||"blue"} onChange={(e) => setFormData({ ...formData, color: e.target.value })} required className="w-full border-none bg-slate-50 p-3.5 rounded-[var(--ui-radius-small)] text-sm font-bold focus:bg-white focus:outline-[var(--ui-primary)]">
                  <option value="blue">Biru (Blue)</option>
                  <option value="emerald">Hijau (Emerald)</option>
                  <option value="rose">Merah (Rose)</option>
                  <option value="amber">Kuning (Amber)</option>
                  <option value="orange">Oranye (Orange)</option>
                  <option value="purple">Ungu (Purple)</option>
                  <option value="slate">Abu-abu (Slate)</option>
                </UISelect>
              </div>
            </>
          )}
          {modalConfig.type ==="event_kalender" && (
            <>
              <div>
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 mb-2 block">Nama Kegiatan</label>
                <input type="text" required value={formData.title ||""} onChange={(e) => setFormData({ ...formData, title: e.target.value })} className="w-full border-none bg-slate-50 p-3.5 rounded-[var(--ui-radius-small)] text-sm font-bold focus:bg-white focus:outline-[var(--ui-primary)]" placeholder="Contoh: Ujian Tengah Semester" />
              </div>
              <div className="flex gap-4">
                <div className="flex-1">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 mb-2 block">Mulai</label>
                  <input type="date" required value={formData.dateStart ||""} onChange={(e) => setFormData({ ...formData, dateStart: e.target.value })} className="w-full border-none bg-slate-50 p-3.5 rounded-[var(--ui-radius-small)] text-sm font-bold focus:bg-white focus:outline-[var(--ui-primary)]" />
                </div>
                <div className="flex-1">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 mb-2 block">Selesai</label>
                  <input type="date" required value={formData.dateEnd ||""} onChange={(e) => setFormData({ ...formData, dateEnd: e.target.value })} className="w-full border-none bg-slate-50 p-3.5 rounded-[var(--ui-radius-small)] text-sm font-bold focus:bg-white focus:outline-[var(--ui-primary)]" />
                </div>
              </div>
              <div>
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 mb-2 block">Kategori</label>
                <UISelect value={formData.categoryId ||""} onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })} required className="w-full border-none bg-slate-50 p-3.5 rounded-[var(--ui-radius-small)] text-sm font-bold focus:bg-white focus:outline-[var(--ui-primary)]">
                  {calendarCategories.map(cat => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))}
                </UISelect>
              </div>
              <div>
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 mb-2 block">Deskripsi / Keterangan Tambahan</label>
                <textarea value={formData.description ||""} onChange={(e) => setFormData({ ...formData, description: e.target.value })} className="w-full border-none bg-slate-50 p-3.5 rounded-[var(--ui-radius-small)] text-sm font-bold focus:bg-white focus:outline-[var(--ui-primary)] min-h-[80px]" placeholder="Penjelasan tambahan terkait acara..." />
              </div>
            </>
          )}
          {modalConfig.type ==="kategori_silabus" && (
            <>
              <div>
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 mb-2 block">Nama Kategori</label>
                <input type="text" required value={formData.name ||""} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="w-full border-none bg-slate-50 p-3.5 rounded-[var(--ui-radius-small)] text-sm font-bold focus:bg-white focus:outline-[var(--ui-primary)]" placeholder="Contoh: Praktikum, Ujian, dll" />
              </div>
              <div>
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 mb-2 block">Warna Kategori</label>
                <UISelect value={formData.color ||"blue"} onChange={(e) => setFormData({ ...formData, color: e.target.value })} required className="w-full border-none bg-slate-50 p-3.5 rounded-[var(--ui-radius-small)] text-sm font-bold focus:bg-white focus:outline-[var(--ui-primary)]">
                  <option value="blue">Biru (Blue)</option>
                  <option value="emerald">Hijau (Emerald)</option>
                  <option value="rose">Merah (Rose)</option>
                  <option value="amber">Kuning (Amber)</option>
                  <option value="purple">Ungu (Purple)</option>
                  <option value="slate">Abu-abu (Slate)</option>
                </UISelect>
              </div>
            </>
          )}
          {modalConfig.type ==="silabus" && (
            (() => {
              const [gradeRaw ="X", semesterRaw ="Ganjil"] = String(formData.gradeSemester ||"X / Ganjil").split("/").map((item) => item.trim());
              const selectedGrade = ["X","XI","XII"].includes(gradeRaw) ? gradeRaw :"X";
              const selectedSemesterValue = ["Ganjil","Genap"].includes(semesterRaw) ? semesterRaw :"Ganjil";
              const updateGradeSemester = (next = {}) => {
                const grade = next.grade || selectedGrade;
                const semester = next.semester || selectedSemesterValue;
                setFormData({ ...formData, gradeSemester: `${grade} / ${semester}` });
              };
              const subjectMeetingCount = syllabuses.filter((item) => sameText(item.subjectName, formData.subjectName)).length;
              const suggestedMeetingNumber = modalConfig.action ==="add" ? subjectMeetingCount + 1 : Math.max(subjectMeetingCount, 1);
              const materialLineCount = String(formData.materials ||"").split("\n").map((line) => line.trim()).filter(Boolean).length;

              return (
                <>
                  <div className="rounded-[var(--ui-radius-small)] border border-[var(--ui-primary)]/15 bg-[var(--ui-accent)]/15 p-4">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[var(--ui-primary)]">Alur pengisian</p>
                        <h4 className="mt-1 text-lg font-black text-slate-800">Isi identitas, judul pertemuan, lalu materi.</h4>
                        <p className="mt-1 text-xs font-bold text-slate-500">Materi bisa ditulis per baris agar tampil sebagai poin A, B, C di halaman silabus.</p>
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-center">
                        {["Mapel","Pertemuan","Materi"].map((item, index) => (
                          <div key={item} className="rounded-[var(--ui-radius-small)] bg-white border-none px-3 py-2 shadow-sm">
                            <p className="text-[10px] font-black text-slate-400">Step {index + 1}</p>
                            <p className="text-xs font-black text-slate-700">{item}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  <section className="rounded-[var(--ui-radius-small)] border-none bg-white p-4">
                    <div className="flex items-center gap-2 mb-4">
                      <div className="w-8 h-8 rounded-[var(--ui-radius-small)] bg-slate-100 text-slate-500 flex items-center justify-center font-black">1</div>
                      <div>
                        <h4 className="text-sm font-black text-slate-800">Identitas Modul Ajar</h4>
                        <p className="text-[11px] font-bold text-slate-400">Tentukan mapel, guru, kelas, semester, dan kategori.</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 mb-2 block">Mata Pelajaran</label>
                        <UISelect value={formData.subjectName ||""} onChange={(e) => setFormData({ ...formData, subjectName: e.target.value })} required className="w-full border-none bg-slate-50 p-3.5 rounded-[var(--ui-radius-small)] text-sm font-bold focus:bg-white focus:outline-[var(--ui-primary)]">
                          <option value="">-- Pilih Mapel --</option>
                          {subjects.map((subject) => (
                            <option key={subject.name} value={subject.name}>{subject.name}</option>
                          ))}
                        </UISelect>
                      </div>
                      <div>
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 mb-2 block">Guru Pengajar</label>
                        <UISelect
                          value={formData.teacherCode || teachers[0]?.code || currentUser?.code ||""}
                          onChange={(e) => setFormData({ ...formData, teacherCode: e.target.value })}
                          required
                          disabled={currentUser?.role ==="guru"}
                          className="w-full border-none bg-slate-50 p-3.5 rounded-[var(--ui-radius-small)] text-sm font-bold focus:bg-white focus:outline-[var(--ui-primary)] disabled:bg-slate-100 disabled:text-slate-500"
                        >
                          <option value="">-- Pilih Guru --</option>
                          {teachers.map((teacher) => (
                            <option key={teacher.code} value={teacher.code}>{teacher.code} - {teacher.name}</option>
                          ))}
                        </UISelect>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 mb-2 block">Kelas</label>
                          <UISelect value={selectedGrade} onChange={(e) => updateGradeSemester({ grade: e.target.value })} required className="w-full border-none bg-slate-50 p-3.5 rounded-[var(--ui-radius-small)] text-sm font-bold focus:bg-white focus:outline-[var(--ui-primary)]">
                            <option value="X">Kelas X</option>
                            <option value="XI">Kelas XI</option>
                            <option value="XII">Kelas XII</option>
                          </UISelect>
                        </div>
                        <div>
                          <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 mb-2 block">Semester</label>
                          <UISelect value={selectedSemesterValue} onChange={(e) => updateGradeSemester({ semester: e.target.value })} required className="w-full border-none bg-slate-50 p-3.5 rounded-[var(--ui-radius-small)] text-sm font-bold focus:bg-white focus:outline-[var(--ui-primary)]">
                            <option value="Ganjil">Ganjil</option>
                            <option value="Genap">Genap</option>
                          </UISelect>
                        </div>
                      </div>
                      <div>
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 mb-2 block">Kategori Modul Ajar</label>
                        <UISelect value={formData.categoryId ||""} onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })} className="w-full border-none bg-slate-50 p-3.5 rounded-[var(--ui-radius-small)] text-sm font-bold focus:bg-white focus:outline-[var(--ui-primary)]">
                          <option value="">-- Tanpa Kategori --</option>
                          {syllabusCategories?.map((cat) => (
                            <option key={cat.id} value={cat.id}>{cat.name}</option>
                          ))}
                        </UISelect>
                      </div>
                    </div>
                  </section>

                  <section className="rounded-[var(--ui-radius-small)] border-none bg-white p-4">
                    <div className="flex items-center gap-2 mb-4">
                      <div className="w-8 h-8 rounded-[var(--ui-radius-small)] bg-slate-100 text-slate-500 flex items-center justify-center font-black">2</div>
                      <div>
                        <h4 className="text-sm font-black text-slate-800">Judul Pertemuan</h4>
                        <p className="text-[11px] font-bold text-slate-400">Beri nama singkat agar mudah dipilih di tab pertemuan.</p>
                      </div>
                    </div>
                    <div>
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-2">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 block">Judul Pertemuan / BAB</label>
                        <button
                          type="button"
                          onClick={() => setFormData({ ...formData, title: `Pertemuan ${suggestedMeetingNumber}: ` })}
                          className="w-fit rounded-[var(--ui-radius-small)] border-none bg-slate-50 text-[10px] text-slate-500 hover:bg-white hover:text-[var(--ui-primary)] h-10 px-4 text-sm font-bold"
                        >
                          Pakai format Pertemuan {suggestedMeetingNumber}
                        </button>
                      </div>
                      <input
                        type="text"
                        required
                        value={formData.title ||""}
                        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                        className="w-full border-none bg-slate-50 p-3.5 rounded-[var(--ui-radius-small)] text-sm font-bold focus:bg-white focus:outline-[var(--ui-primary)]"
                        placeholder="Contoh: Pertemuan 1: Pengenalan Algoritma"
                      />
                    </div>
                  </section>

                  <section className="rounded-[var(--ui-radius-small)] border-none bg-white p-4">
                    <div className="flex items-center gap-2 mb-4">
                      <div className="w-8 h-8 rounded-[var(--ui-radius-small)] bg-slate-100 text-slate-500 flex items-center justify-center font-black">3</div>
                      <div>
                        <h4 className="text-sm font-black text-slate-800">Isi Pembelajaran</h4>
                        <p className="text-[11px] font-bold text-slate-400">Tulis tujuan, materi inti, dan catatan bila ada.</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.25fr] gap-3">
                      <div className="space-y-3">
                        <div>
                          <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 mb-2 block">Tujuan Pembelajaran</label>
                          <textarea value={formData.objectives ||""} onChange={(e) => setFormData({ ...formData, objectives: e.target.value })} className="w-full border-none bg-slate-50 p-3.5 rounded-[var(--ui-radius-small)] text-sm font-bold focus:bg-white focus:outline-[var(--ui-primary)] min-h-[120px]" placeholder="Contoh: Siswa memahami konsep dasar dan mampu menerapkannya." />
                        </div>
                        <div>
                          <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 mb-2 block">Catatan (Opsional)</label>
                          <textarea value={formData.notes ||""} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} className="w-full border-none bg-slate-50 p-3.5 rounded-[var(--ui-radius-small)] text-sm font-bold focus:bg-white focus:outline-[var(--ui-primary)] min-h-[100px]" placeholder="Remedial, pengayaan, tugas, atau catatan lain" />
                        </div>
                      </div>
                      <div>
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-2">
                          <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 block">Materi Pembelajaran</label>
                          <span className="text-[10px] font-black text-slate-400">{materialLineCount} poin materi</span>
                        </div>
                        <textarea
                          value={formData.materials ||""}
                          onChange={(e) => setFormData({ ...formData, materials: e.target.value })}
                          className="w-full border-none bg-slate-50 p-3.5 rounded-[var(--ui-radius-small)] text-sm font-bold focus:bg-white focus:outline-[var(--ui-primary)] min-h-[245px]"
                          placeholder={"Konsep grafis berbasis vektor\nKonsep grafis berbasis bitmap\nKarakteristik format file"}
                        />
                        <div className="mt-2 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 rounded-[var(--ui-radius-small)] bg-slate-50 border-none px-3 py-2">
                          <p className="text-[10px] font-bold text-slate-500">Satu baris = satu poin materi. Tidak perlu menulis A/B/C manual.</p>
                          {!String(formData.materials ||"").trim() && (
                            <button
                              type="button"
                              onClick={() => setFormData({ ...formData, materials:"Konsep dasar materi\nContoh penerapan\nLatihan atau diskusi" })}
                              className="w-fit rounded-[var(--ui-radius-small)] bg-white border-none text-[10px] text-slate-500 hover:text-[var(--ui-primary)] h-10 px-4 text-sm font-bold"
                            >
                              Isi contoh
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </section>
                </>
              );
            })()
          )}
          {modalConfig.type ==="waka_roles" && (
            <div className="space-y-4">
              <div className="bg-[var(--ui-primary)]/10/50 border border-blue-100 p-3 rounded-[var(--ui-radius-small)] mb-2">
                <p className="text-xs font-bold text-blue-800">Sesuaikan nama peran Waka yang tampil di aplikasi.</p>
              </div>
              {WAKA_DIVISION_OPTIONS.map(div => {
                const key = `waka${div.value.charAt(0).toUpperCase() + div.value.slice(1)}Label`;
                return (
                  <div key={div.value}>
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 mb-2 block">Default: {div.label}</label>
                    <input 
                      type="text" 
                      value={formData[key] || div.label} 
                      onChange={(e) => setFormData({ ...formData, [key]: e.target.value })} 
                      placeholder={div.label}
                      className="w-full border-none bg-slate-50 p-3.5 rounded-[var(--ui-radius-small)] text-sm font-bold focus:bg-white focus:outline-[var(--ui-primary)]" 
                    />
                  </div>
                );
              })}
            </div>
          )}
          {modalConfig.type ==="waktu" && (
            <>
              <div>
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 mb-2 block">Pengaturan Jam Pelajaran Pintar</label>
                {(() => {
                  const labelParts = (formData.label ||"07.00 - 00.00").split(" -");
                  const sTime = (labelParts[0]?.trim() ||"").replace('.',':');
                  const eTime = (labelParts[1]?.trim() ||"").replace('.',':');
                  const jpCount = formData.jpCount || 1;
                  const minsPerJp = formData.minsPerJp || 45;

                  const handleAutoCalc = (start, jp, mins) => {
                    if (!start || start.length !== 5) return start;
                    const [h, m] = start.split(':').map(Number);
                    const totalMins = h * 60 + m + (jp * mins);
                    const newH = Math.floor(totalMins / 60) % 24;
                    const newM = totalMins % 60;
                    return `${String(newH).padStart(2,'0')}:${String(newM).padStart(2,'0')}`;
                  };
                  return (
                    <div className="space-y-4">
                      {!formData.isBreak && (
                        <div className="grid grid-cols-2 gap-4 bg-[var(--ui-accent)]/10 p-4 rounded-[var(--ui-radius-small)] border border-[var(--ui-accent)]/20">
                           <div>
                             <label className="text-[10px] font-black text-[var(--ui-primary)] uppercase block mb-1">Jumlah JP</label>
                             <input type="text" inputMode="numeric" value={jpCount} onChange={(e) => {
                               const newVal = parseInt(e.target.value.replace(/[^0-9]/g,'')) || 1;
                               const newEnd = handleAutoCalc(sTime, newVal, minsPerJp);
                               setFormData({ ...formData, jpCount: newVal, label: `${sTime.replace(':','.')} - ${newEnd.replace(':','.')}` });
                             }} className="w-full border border-[var(--ui-primary)]/20 bg-white p-2 rounded-[var(--ui-radius-small)] text-sm font-bold text-center" />
                           </div>
                           <div>
                             <label className="text-[10px] font-black text-[var(--ui-primary)] uppercase block mb-1">Menit per JP</label>
                             <input type="text" inputMode="numeric" value={minsPerJp} onChange={(e) => {
                               const newVal = parseInt(e.target.value.replace(/[^0-9]/g,'')) || 45;
                               const newEnd = handleAutoCalc(sTime, jpCount, newVal);
                               setFormData({ ...formData, minsPerJp: newVal, label: `${sTime.replace(':','.')} - ${newEnd.replace(':','.')}` });
                             }} className="w-full border border-[var(--ui-primary)]/20 bg-white p-2 rounded-[var(--ui-radius-small)] text-sm font-bold text-center" />
                           </div>
                        </div>
                      )}

                      <div className="flex items-center gap-2 bg-slate-50 p-2 rounded-[var(--ui-radius-small)] border-none">
                        <input 
                          type="time" 
                          value={sTime.length === 5 ? sTime :""} 
                          onChange={(ev) => {
                            const newStart = ev.target.value;
                            const newEnd = formData.isBreak ? eTime : handleAutoCalc(newStart, jpCount, minsPerJp);
                            setFormData({ ...formData, label: `${newStart.replace(':','.')} - ${newEnd.replace(':','.')}` });
                          }}
                          className="p-3 border-none rounded-[var(--ui-radius-small)] text-sm font-bold flex-1 focus:bg-white"
                          required={!formData.isBreak}
                        />
                        <span className="font-bold text-slate-400">-</span>
                        <input 
                          type="time" 
                          value={eTime.length === 5 ? eTime :""} 
                          onChange={(ev) => setFormData({ ...formData, label: `${sTime.replace(':','.')} - ${ev.target.value.replace(':','.')}` })}
                          className="p-3 border-none rounded-[var(--ui-radius-small)] text-sm font-bold flex-1 focus:bg-white"
                          required={!formData.isBreak}
                        />
                      </div>
                    </div>
                  );
                })()}
              </div>
              <div className="flex items-center gap-3 bg-orange-50 p-4 border border-orange-100 rounded-[var(--ui-radius-small)] cursor-pointer"><input type="checkbox" id="break" checked={formData.isBreak || false} onChange={(e) => setFormData({ ...formData, isBreak: e.target.checked })} className="w-5 h-5 accent-orange-600 cursor-pointer" /><label htmlFor="break" className="text-sm font-bold text-orange-900 cursor-pointer">Tandai Sebagai Kegiatan / Non-Pelajaran</label></div>
              {formData.isBreak && (<div><label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 mb-2 block">Nama Kegiatan Opsional</label><input type="text" value={formData.labelBreak ||""} onChange={(e) => setFormData({ ...formData, labelBreak: e.target.value })} className="w-full border-none bg-slate-50 p-3.5 rounded-[var(--ui-radius-small)] text-sm font-bold focus:bg-white focus:outline-[var(--ui-primary)]" placeholder="Contoh: UPACARA BENDERA / ISTIRAHAT" /></div>)}
            </>
          )}
          <div className="sticky bottom-0 z-20 -mx-3.5 sm:-mx-4 -mb-3.5 sm:-mb-4 mt-5 flex justify-end gap-3 border-t border-slate-200 bg-white/95 px-3.5 sm:px-4 py-3 shadow-[0_-12px_28px_rgba(15,23,42,0.06)] backdrop-blur"><Button type="button" variant="secondary" onClick={closeModal} disabled={isSavingModal}>Batal</Button><Button type="submit" disabled={isClassMajorMismatch || isSavingModal}>{isSavingModal ?"Menyimpan..." : modalConfig.type ==="silabus" ?"Simpan Pertemuan" :"Simpan Data"}</Button></div>
        </form>
      </Modal>
    </>
  );
}
