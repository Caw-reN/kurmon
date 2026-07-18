

export const assessGenerateReadiness = ({ currentUser, classes, rooms, teachers, teachingLoads, days, timeSlots, teacherAvailability, strictCompetency }) => {
  const blockers = [];
  const warnings = [];
  const role = currentUser?.role === "superadmin" ? "admin" : currentUser?.role;
  const canGenerateRole = role === "admin" || (role === "waka" && (!currentUser?.division || (currentUser?.division || "").toLowerCase() === "kurikulum"));

  if (!canGenerateRole) blockers.push("Hanya SuperAdmin atau Waka Kurikulum yang bisa generate jadwal.");
  if (!Array.isArray(classes) || classes.length === 0) blockers.push("Belum ada data kelas.");
  if (!Array.isArray(rooms) || rooms.length === 0) blockers.push("Belum ada data ruangan.");
  if (!Array.isArray(teachers) || teachers.length === 0) blockers.push("Belum ada data guru.");
  if (!Array.isArray(teachingLoads) || teachingLoads.length === 0) blockers.push("Belum ada data beban mengajar.");
  if (!Array.isArray(days) || days.length === 0) blockers.push("Belum ada hari aktif.");

  const hasTeachSlots = Object.values(timeSlots || {}).some((slots) => Array.isArray(slots) && slots.some((slot) => !slot.isBreak));
  if (!hasTeachSlots) blockers.push("Belum ada jam pelajaran aktif.");

  const teacherCodes = new Set((teachers || []).map((teacher) => String(teacher.code || "").trim().toLowerCase()).filter(Boolean));
  const classMajors = new Set((classes || []).map((kelas) => String(kelas.major || "").trim().toLowerCase()).filter(Boolean));
  const roomMajors = new Set((rooms || []).map((room) => String(room.major || "").trim().toLowerCase()).filter(Boolean));
  const hasTheoryRoom = (rooms || []).some((room) => room.type === "Teori");
  const hasPracticeRoom = (rooms || []).some((room) => room.type === "Praktik");

  const parseTeacherCodes = (raw) => {
    if (!raw) return [];
    return String(raw).split(",").map((c) => String(c || "").trim().toLowerCase()).filter(Boolean);
  };

  const invalidTeacherLoads = (teachingLoads || []).filter((load) => {
    const codes = parseTeacherCodes(load.teacherCode);
    return codes.length === 0 || codes.some((code) => !teacherCodes.has(code));
  });
  if (invalidTeacherLoads.length > 0) {
    const details = invalidTeacherLoads.slice(0, 3).map(l => `${l.teacherCode} (${l.subject})`).join(', ');
    const more = invalidTeacherLoads.length > 3 ? ', dll' : '';
    warnings.push(`${invalidTeacherLoads.length} beban mengajar memakai kode guru yang tidak ada dan akan dilewati (Contoh: ${details}${more}).`);
  }

  const orphanMajorLoads = (teachingLoads || []).filter((load) => {
    const majors = String(load.targetMajor || "All").split(',').map(m => m.trim().toLowerCase()).filter(Boolean);
    if (majors.includes("all")) return false;
    return !majors.some(m => classMajors.has(m));
  });
  if (orphanMajorLoads.length > 0) {
    const details = orphanMajorLoads.slice(0, 3).map(l => `${l.teacherCode} (${l.subject})`).join(', ');
    const more = orphanMajorLoads.length > 3 ? ', dll' : '';
    warnings.push(`${orphanMajorLoads.length} beban mengajar menargetkan jurusan yang tidak punya kelas dan akan dilewati (Contoh: ${details}${more}).`);
  }

  const unavailableTeachers = (teachingLoads || []).filter((load) => {
    const codes = parseTeacherCodes(load.teacherCode);
    return codes.some((code) => {
      const originalKey = Object.keys(teacherAvailability || {}).find(k => String(k).toLowerCase() === code);
      const entry = originalKey ? teacherAvailability[originalKey] : null;
      return !entry || !Array.isArray(entry.days) || entry.days.length === 0;
    });
  });
  if (unavailableTeachers.length > 0) {
    const details = unavailableTeachers.slice(0, 3).map(l => `${l.teacherCode} (${l.subject})`).join(', ');
    const more = unavailableTeachers.length > 3 ? ', dll' : '';
    warnings.push(`${unavailableTeachers.length} beban mengajar berpotensi gagal karena guru belum diatur hari tersedianya (Contoh: ${details}${more}).`);
  }

  if (Array.isArray(rooms) && rooms.length > 0 && !hasTheoryRoom) warnings.push("Belum ada ruangan teori; hanya mapel praktik yang mungkin dapat dipasang.");
  if (Array.isArray(rooms) && rooms.length > 0 && !hasPracticeRoom) warnings.push("Belum ada ruangan praktik, mapel praktik tidak akan terpasang.");

  const practiceMajorRooms = [...roomMajors].filter((major) => major && major !== "all");
  const classMajorsWithoutPracticeRoom = [...classMajors].filter((major) => !practiceMajorRooms.includes(major) && !roomMajors.has("all"));
  if (classMajorsWithoutPracticeRoom.length > 0 && hasPracticeRoom) {
    warnings.push(`Sebagian jurusan belum punya ruang praktik khusus: ${classMajorsWithoutPracticeRoom.join(", ").toUpperCase()}.`);
  }

  if (strictCompetency) {
    const hasCompetency = Object.values(teacherAvailability || {}).some((entry) => Array.isArray(entry?.subjects) && entry.subjects.length > 0);
    if (!hasCompetency) warnings.push("Strict Kompetensi aktif, tapi kompetensi mapel guru belum diisi.");
  }

  return {
    canGenerate: blockers.length === 0,
    blockers,
    warnings,
  };
};
