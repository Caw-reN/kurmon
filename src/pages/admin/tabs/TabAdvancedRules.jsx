import { SlidersHorizontal } from'lucide-react';
;


export default function TabAdvancedRules(props) {
  const { tabSubtitles, showNotification, advancedRules, setAdvancedRules } = props;
  const { ...allProps } = props;
  // Destructure specific props as needed in the component

return (
  <div className="flex flex-col gap-4 w-full animate-in fade-in duration-300">
    <PageHeader
      title="Aturan Penjadwalan Lanjutan"
      description={tabSubtitles["advanced_rules"]}
      icon={SlidersHorizontal}
    />
    <div className="bg-white border-none rounded-[var(--ui-radius-card)] shadow-sm p-6 md:p-6 flex flex-col">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          showNotification("Aturan penjadwalan berhasil disimpan!","success",
          );
        }}
        className="space-y-6"
      >
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* KOLOM KIRI */}
          <div className="space-y-6">
            <div className="border-none rounded-[var(--ui-radius-small)] p-5 bg-slate-50/50 space-y-4">
              <div>
                <p className="text-[11px] font-black text-slate-800 uppercase tracking-widest">
                  Batas Maksimal Jam Pelajaran Harian
                </p>
                <p className="text-[10px] font-bold text-slate-500 mt-0.5">
                  Generator akan mencoba agar total jam di kelas setiap
                  hari tidak melebihi batas berikut.
                </p>
              </div>

              <div className="space-y-4 pt-2">
                {/* KELAS X */}
                <div className="bg-white border-none rounded-[var(--ui-radius-card)] p-3 shadow-sm flex items-center justify-between">
                  <div className="flex flex-col">
                    <span className="text-sm font-black text-slate-700">
                      Tingkat X
                    </span>
                    <span className="text-[10px] text-slate-500 font-semibold">
                      Reguler (Sen-Kam)
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      inputMode="numeric"
                      value={advancedRules.gradeXMaxJp || 12}
                      onChange={(e) =>
                        setAdvancedRules({
                          ...advancedRules,
                          gradeXMaxJp: parseInt(e.target.value.replace(/[^0-9]/g,'')) || 12
                        })
                      }
                      className="w-16 border-none bg-slate-50 p-2 rounded-[var(--ui-radius-small)] text-center text-sm font-bold focus:outline-[var(--ui-primary)]"
                    />
                    <span className="text-xs font-bold text-slate-400">
                      JP
                    </span>
                  </div>
                </div>
                {/* KELAS X RABU */}
                <div className="bg-white border-none rounded-[var(--ui-radius-card)] p-3 shadow-sm flex items-center justify-between border-l-4 border-l-[var(--ui-accent)]">
                  <div className="flex flex-col">
                    <span className="text-sm font-black text-slate-700">
                      Tingkat X (Khusus Rabu)
                    </span>
                    <span className="text-[10px] text-slate-500 font-semibold">
                      Batas JP khusus hari Rabu
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      inputMode="numeric"
                      value={advancedRules.gradeXWedJp || 14}
                      onChange={(e) =>
                        setAdvancedRules({
                          ...advancedRules,
                          gradeXWedJp: parseInt(e.target.value.replace(/[^0-9]/g,'')) || 14
                        })
                      }
                      className="w-16 border-none bg-slate-50 p-2 rounded-[var(--ui-radius-small)] text-center text-sm font-bold focus:outline-[var(--ui-primary)]"
                    />
                    <span className="text-xs font-bold text-slate-400">
                      JP
                    </span>
                  </div>
                </div>

                <hr className="border-slate-100" />

                {/* KELAS XI */}
                <div className="bg-white border-none rounded-[var(--ui-radius-card)] p-3 shadow-sm flex items-center justify-between">
                  <div className="flex flex-col">
                    <span className="text-sm font-black text-slate-700">
                      Tingkat XI
                    </span>
                    <span className="text-[10px] text-slate-500 font-semibold">
                      Reguler (Sen-Kam)
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      inputMode="numeric"
                      value={advancedRules.gradeXIMaxJp || 10}
                      onChange={(e) =>
                        setAdvancedRules({
                          ...advancedRules,
                          gradeXIMaxJp: parseInt(e.target.value.replace(/[^0-9]/g,'')) || 10
                        })
                      }
                      className="w-16 border-none bg-slate-50 p-2 rounded-[var(--ui-radius-small)] text-center text-sm font-bold focus:outline-[var(--ui-primary)]"
                    />
                    <span className="text-xs font-bold text-slate-400">
                      JP
                    </span>
                  </div>
                </div>
                {/* KELAS XI RABU */}
                <div className="bg-white border-none rounded-[var(--ui-radius-card)] p-3 shadow-sm flex items-center justify-between border-l-4 border-l-[var(--ui-accent)]">
                  <div className="flex flex-col">
                    <span className="text-sm font-black text-slate-700">
                      Tingkat XI (Khusus Rabu)
                    </span>
                    <span className="text-[10px] text-slate-500 font-semibold">
                      Batas JP khusus hari Rabu
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      inputMode="numeric"
                      value={advancedRules.gradeXIWedJp || 12}
                      onChange={(e) =>
                        setAdvancedRules({
                          ...advancedRules,
                          gradeXIWedJp: parseInt(e.target.value.replace(/[^0-9]/g,'')) || 12
                        })
                      }
                      className="w-16 border-none bg-slate-50 p-2 rounded-[var(--ui-radius-small)] text-center text-sm font-bold focus:outline-[var(--ui-primary)]"
                    />
                    <span className="text-xs font-bold text-slate-400">
                      JP
                    </span>
                  </div>
                </div>

                <hr className="border-slate-100" />

                {/* KELAS XII */}
                <div className="bg-white border-none rounded-[var(--ui-radius-card)] p-3 shadow-sm flex items-center justify-between">
                  <div className="flex flex-col">
                    <span className="text-sm font-black text-slate-700">
                      Tingkat XII
                    </span>
                    <span className="text-[10px] text-slate-500 font-semibold">
                      Reguler (Sen-Kam)
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      inputMode="numeric"
                      value={advancedRules.gradeXIIMaxJp || 10}
                      onChange={(e) =>
                        setAdvancedRules({
                          ...advancedRules,
                          gradeXIIMaxJp: parseInt(e.target.value.replace(/[^0-9]/g,'')) || 10
                        })
                      }
                      className="w-16 border-none bg-slate-50 p-2 rounded-[var(--ui-radius-small)] text-center text-sm font-bold focus:outline-[var(--ui-primary)]"
                    />
                    <span className="text-xs font-bold text-slate-400">
                      JP
                    </span>
                  </div>
                </div>
                {/* KELAS XII RABU */}
                <div className="bg-white border-none rounded-[var(--ui-radius-card)] p-3 shadow-sm flex items-center justify-between border-l-4 border-l-[var(--ui-accent)]">
                  <div className="flex flex-col">
                    <span className="text-sm font-black text-slate-700">
                      Tingkat XII (Khusus Rabu)
                    </span>
                    <span className="text-[10px] text-slate-500 font-semibold">
                      Batas JP khusus hari Rabu
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      inputMode="numeric"
                      value={advancedRules.gradeXIIWedJp || 12}
                      onChange={(e) =>
                        setAdvancedRules({
                          ...advancedRules,
                          gradeXIIWedJp: parseInt(e.target.value.replace(/[^0-9]/g,'')) || 12
                        })
                      }
                      className="w-16 border-none bg-slate-50 p-2 rounded-[var(--ui-radius-small)] text-center text-sm font-bold focus:outline-[var(--ui-primary)]"
                    />
                    <span className="text-xs font-bold text-slate-400">
                      JP
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* KOLOM KANAN */}
          <div className="space-y-6">
            <div className="border-none rounded-[var(--ui-radius-small)] p-5 bg-slate-50/50 space-y-4">
              <div>
                <p className="text-[11px] font-black text-slate-800 uppercase tracking-widest">
                  Aturan Hari Jumat
                </p>
                <p className="text-[10px] font-bold text-slate-500 mt-0.5">
                  Konfigurasi batasan khusus untuk jadwal di hari Jumat.
                </p>
              </div>

              <div className="pt-2">
                <label className="flex items-start gap-3 p-3 bg-white border-none rounded-[var(--ui-radius-card)] cursor-pointer hover:border-[var(--ui-primary)]/50 transition-colors shadow-sm">
                  <div className="flex items-center h-5 mt-0.5">
                    <input
                      type="checkbox"
                      checked={advancedRules.fridayTheoryLimit}
                      onChange={(e) =>
                        setAdvancedRules({
                          ...advancedRules,
                          fridayTheoryLimit: e.target.checked
                        })
                      }
                      className="w-4 h-4 rounded-[var(--ui-radius-small)] text-[var(--ui-primary)] focus:ring-[var(--ui-primary)] border-slate-300"
                    />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-sm font-bold text-slate-700">
                      Batasi Mapel Teori Setengah Hari
                    </span>
                    <span className="text-xs text-slate-500 mt-1">
                      Jika aktif, mapel kategori Teori di hari Jumat
                      hanya akan dialokasikan pada jam pagi (hingga
                      istirahat kedua maksimal). Hanya Praktik/Lab yang
                      bisa berjalan hingga sore.
                    </span>
                  </div>
                </label>
              </div>
            </div>

            <div className="border-none rounded-[var(--ui-radius-small)] p-5 bg-slate-50/50 space-y-4">
              <div>
                <p className="text-[11px] font-black text-slate-800 uppercase tracking-widest">
                  Aturan Jam Terakhir
                </p>
                <p className="text-[10px] font-bold text-slate-500 mt-0.5">
                  Konfigurasi batasan mapel tertentu pada jam pelajaran
                  terakhir di hari tertentu.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                <div className="bg-white p-4 rounded-[var(--ui-radius-card)] border-none shadow-sm">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1 block">
                    Kata Kunci Mapel Jam Terakhir
                  </label>
                  <input
                    type="text"
                    value={advancedRules.lastPeriodSubject ||""}
                    onChange={(e) =>
                      setAdvancedRules({
                        ...advancedRules,
                        lastPeriodSubject: e.target.value
                      })
                    }
                    placeholder="Misal: Koding, Pramuka (Kosongkan jika bebas)"
                    className="w-full border-none bg-slate-50 p-2.5 rounded-[var(--ui-radius-small)] text-sm font-bold focus:bg-white focus:outline-[var(--ui-primary)]"
                  />
                  <p className="text-[10px] text-slate-400 mt-1 font-medium">
                    Jika diisi, jam terakhir pada hari terpilih{""}
                    <strong>hanya</strong> akan diisi oleh mapel ini
                    atau akan dibiarkan kosong.
                  </p>
                </div>
                <div className="bg-white p-4 rounded-[var(--ui-radius-card)] border-none shadow-sm flex flex-col gap-3">
                  <div>
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1 block">
                      Jam Terakhir (Sen, Sel, Kam, Jum)
                    </label>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-slate-700">
                        Jam ke-
                      </span>
                      <input
                        type="text"
                        inputMode="numeric"
                        value={advancedRules.lastPeriodNormal || 7}
                        onChange={(e) =>
                          setAdvancedRules({
                            ...advancedRules,
                            lastPeriodNormal:
                              parseInt(e.target.value.replace(/[^0-9]/g,'')) || 7
                          })
                        }
                        className="w-16 border-none bg-slate-50 p-2 rounded-[var(--ui-radius-small)] text-center text-sm font-bold focus:outline-[var(--ui-primary)]"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1 block">
                      Jam Terakhir Khusus (Rabu)
                    </label>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-slate-700">
                        Jam ke-
                      </span>
                      <input
                        type="text"
                        inputMode="numeric"
                        value={advancedRules.lastPeriodWednesday || 8}
                        onChange={(e) =>
                          setAdvancedRules({
                            ...advancedRules,
                            lastPeriodWednesday:
                              parseInt(e.target.value.replace(/[^0-9]/g,'')) || 8
                          })
                        }
                        className="w-16 border-none bg-slate-50 p-2 rounded-[var(--ui-radius-small)] text-center text-sm font-bold focus:outline-[var(--ui-primary)]"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="pt-4 mt-8 border-t border-slate-200 flex justify-end">
          <button
            type="submit"
            className="w-full sm:w-auto"
          >
            Simpan Pengaturan
          </button>
        </div>
      </form>
    </div>
  </div>
);
}
