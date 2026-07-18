import { useEffect, useMemo, useState } from'react';
import { useAppStore } from'../store/useAppStore';
import { subscribeDatabaseSnapshot } from'../utils/dataSource.js';
import { loadInitialState } from'../utils/state.js';
import { Calendar, Users, Search, Printer } from'lucide-react';
import JadwalPiket from'./kedisiplinan/JadwalPiket.jsx';
import { CustomSelect } from'../components/CustomSelect.jsx';
import { LegacyScheduleTable } from'../components/LegacyPreview.jsx';
import { Button } from '../components/ui.jsx';


export default function JadwalPage() {
  const [activeSubTab, setActiveSubTab] = useState("pelajaran"); //"pelajaran" or"piket"
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedGrade, setSelectedGrade] = useState("Semua");
  const [selectedMajor, setSelectedMajor] = useState("Semua");
  const [selectedClass, setSelectedClass] = useState("Semua");
  const [dataVersion, setDataVersion] = useState(0);
  const { getClasses, getSchedule, getTeachers } = useAppStore();
  const [scheduleData, setScheduleData] = useState(() => ({
    classes: getClasses(),
    schedule: getSchedule(),
  }));

  useEffect(() => {
    const refresh = () => {
      setScheduleData({ classes: getClasses(), schedule: getSchedule() });
      setDataVersion((version) => version + 1);
    };
    return subscribeDatabaseSnapshot(refresh);
  }, [getClasses, getSchedule]);

  const { classes, schedule } = scheduleData;
  const teachers = useMemo(() => getTeachers(), [getTeachers, dataVersion]);
  const majors = useMemo(() => [...new Set(classes.map((item) => item.major).filter(Boolean))].filter(m => m.toLowerCase() !=='semua' && m.toLowerCase() !=='all').sort(), [classes]);
  
  const appSettings = useMemo(() => {
    const defaults = {
      primaryColor:"#064e3b",
      accentColor:"#a3e635",
      fontFamily:"Lexend",
      logoText:"TS",
      appName:"TimeSchedule",
      footerText:"© 2026 TimeSchedule by Admin.",
      contactEmail:"admin@school.sch.id",
      contactPhone:"+62 123-456-789"
    };

    return { ...defaults, ...loadInitialState("appSettings", defaults) };
  // dataVersion is updated when the active database snapshot changes.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dataVersion]);
  const { primaryColor, accentColor, fontFamily, appName, logoText, footerText, contactEmail, contactPhone } = appSettings;

  // Filter classes available for Class filter based on active Grade & Major
  const availableClassesForDropdown = useMemo(() => {
    let list = classes;
    if (selectedGrade && selectedGrade !=="Semua") {
      list = list.filter(c => c.name.startsWith(selectedGrade +""));
    }
    if (selectedMajor && selectedMajor !=="Semua") {
      list = list.filter(c => c.major === selectedMajor);
    }
    return list;
  }, [classes, selectedGrade, selectedMajor]);

  const selectedClassEffective = useMemo(() => {
    if (selectedClass ==="Semua") return"Semua";
    const isValid = availableClassesForDropdown.some((c) => c.name === selectedClass);
    return isValid ? selectedClass :"Semua";
  }, [availableClassesForDropdown, selectedClass]);

  // Dynamic filter for columns to be displayed in schedule table
  const filteredClasses = useMemo(() => {
    let result = classes;

    // Filter by Grade
    if (selectedGrade && selectedGrade !=="Semua") {
      result = result.filter(c => c.name.startsWith(selectedGrade +""));
    }

    // Filter by Major
    if (selectedMajor && selectedMajor !=="Semua") {
      result = result.filter(c => c.major === selectedMajor);
    }

    // Filter by Class
    if (selectedClass && selectedClass !=="Semua") {
      result = result.filter(c => c.name === selectedClass);
    }

    // Filter by search query (smart search)
    if (searchQuery.trim() !=="") {
      const query = searchQuery.toLowerCase().trim();
      result = result.filter(c => {
        // Match class name
        if (c.name.toLowerCase().includes(query)) return true;

        // Match subjects, teachers, or rooms scheduled for this class on the selected day
        const classSchedule = schedule.filter(s => s.className === c.name);
        return classSchedule.some(s => 
          (s.subject && s.subject.toLowerCase().includes(query)) ||
          (s.teacherCode && s.teacherCode.toLowerCase().includes(query)) ||
          (s.roomId && s.roomId.toLowerCase().includes(query))
        );
      });
    }

    return result;
  }, [classes, selectedGrade, selectedMajor, selectedClass, searchQuery, schedule]);

  // Options configuration for CustomSelect components
  
  const gradeOptions = [
    { label:"Semua Tingkat", value:"Semua" },
    { label:"Tingkat X", value:"X" },
    { label:"Tingkat XI", value:"XI" },
    { label:"Tingkat XII", value:"XII" },
  ];

  const majorOptions = [
    { label:"Semua Jurusan", value:"Semua" },
    ...majors.map(m => ({ label: `Jurusan ${m}`, value: m }))
  ];

  const classOptions = [
    { label:"Semua Kelas", value:"Semua" },
    ...availableClassesForDropdown.map(c => ({ label: c.name, value: c.name }))
  ];

  return (
    <div className="w-full flex flex-col gap-6 animate-fade-in print-landscape relative">
      <div className="flex flex-col gap-6 w-full max-w-full">


        {/* Tab Switcher */}
        <div className="flex bg-white/60 backdrop-blur-xl border border-white/50 p-1.5 rounded-[var(--ui-radius-control)] self-start z-30 print-hidden shadow-sm">
          <Button variant="outline" 
            type="button"
            onClick={() =>setActiveSubTab("pelajaran")}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-bold transition-all ${activeSubTab === "pelajaran" ? "text-white" : "text-slate-600 hover:bg-slate-100"}`}
            style={activeSubTab ==="pelajaran" ? { backgroundColor: primaryColor } : {}}
          >
            <Calendar size={14} />
            <span>Jadwal Pelajaran</span></Button>
          <Button variant="outline" 
            type="button"
            onClick={() =>setActiveSubTab("piket")}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-bold transition-all ${activeSubTab === "piket" ? "text-white" : "text-slate-600 hover:bg-slate-100"}`}
            style={activeSubTab ==="piket" ? { backgroundColor: primaryColor } : {}}
          >
            <Users size={14} />
            <span>Jadwal Piket</span></Button>
        </div>

        {activeSubTab ==="pelajaran" ? (
          <>
            {/* Search & Filters Card */}
            <div className="bg-white/60 backdrop-blur-xl rounded-[var(--ui-radius-control)] p-4 md:p-5 shadow-sm border border-white/50 flex flex-col xl:flex-row gap-3 z-30 print-hidden">
               <div className="relative flex-1 min-w-[220px]">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                  <input 
                     type="text" 
                     placeholder="Cari kelas, mata pelajaran..." 
                     value={searchQuery}
                     onChange={e => setSearchQuery(e.target.value)}
                     className="w-full bg-slate-50 border-none rounded-[var(--ui-radius-small)] py-2.5 pl-10 pr-3 text-[13px] font-medium text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-slate-300 focus:ring-4 transition-all"
                     style={{'--tw-ring-color': `${accentColor}30` }}
                  />
               </div>
               
               <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 shrink-0">
                  <CustomSelect 
                    value={selectedGrade}
                    onChange={setSelectedGrade}
                    options={gradeOptions}
                    placeholder="Pilih Tingkat"
                    accentColor={accentColor}
                    primaryColor={primaryColor}
                    className="w-full min-w-[120px]"
                  />
                  <CustomSelect 
                    value={selectedMajor}
                    onChange={setSelectedMajor}
                    options={majorOptions}
                    placeholder="Pilih Jurusan"
                    accentColor={accentColor}
                    primaryColor={primaryColor}
                    className="w-full min-w-[120px]"
                  />
                  <CustomSelect 
                    value={selectedClass}
                    onChange={setSelectedClass}
                    options={classOptions}
                    placeholder="Pilih Kelas"
                    accentColor={accentColor}
                    primaryColor={primaryColor}
                    className="w-full min-w-[130px]"
                  />
               </div>
            </div>
     
            {/* Schedule Table Container Card */}
            <div className="bg-white/60 backdrop-blur-xl rounded-[var(--ui-radius-small)] shadow-sm border border-white/50 z-10 print:border-none print:-none print:rounded-[var(--ui-radius-small)] shadow-none print:px-6 print:pt-4 print:pb-8 overflow-x-auto custom-scrollbar">
              <div className="px-6 py-5 border-b border-slate-100 flex justify-between items-center print-hidden">
                <h3 className="font-extrabold text-[17px] text-slate-800">
                  Jadwal Pelajaran {selectedGrade !=="Semua" ? `Tingkat ${selectedGrade}` :""} {selectedMajor !=="Semua" ? `| ${selectedMajor}` :""} {selectedClassEffective !=="Semua" ? `| ${selectedClassEffective}` :""}
                </h3>
                <Button 
                  onClick={() => window.print()}
                  style={{ backgroundColor: primaryColor, color: '#fff' }}
                >
                  <Printer size={13} className="mr-1.5 stroke-[2.5]" />
                  Cetak Jadwal
                </Button>
              </div>
              <LegacyScheduleTable 
                displayClasses={filteredClasses} 
                primaryColor={primaryColor}
                accentColor={accentColor}
              />
            </div>
          </>
        ) : (
          <div className="z-10">
            <JadwalPiket teachers={teachers} />
          </div>
        )}
      </div>
    </div>
  );
}
