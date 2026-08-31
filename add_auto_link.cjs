const fs = require('fs');
let content = fs.readFileSync('server/routes/hikvision.mjs', 'utf8');

const newFunc = `
export async function autoLinkHikvisionTeachersAndStaffs(dbPool) {
  if (!dbPool) return;
  try {
    const resT = await dbPool.query("SELECT payload FROM mst_teachers");
    const teachers = resT.rows.map(r => r.payload);
    
    const resS = await dbPool.query("SELECT payload FROM mst_staffs");
    const staffs = resS.rows.map(r => r.payload);
    
    const allEmployees = [...teachers, ...staffs];
    if (allEmployees.length === 0) return;

    const hikRes = await dbPool.query(\`
      SELECT * FROM hikvision_students 
      WHERE class_name IN ('guru', 'karyawan', 'staff') OR class_name IS NULL
    \`);

    for (const h of hikRes.rows) {
      const hNis = String(h.nis || '').trim().toLowerCase();
      const hName = String(h.name || '').trim().toLowerCase();
      
      // JANGAN PERNAH SYNC ADMIN MACHINE!
      if (hName === 'ngadmin' || hName.includes('admin')) {
        continue;
      }

      const matched = allEmployees.find(e => {
        const eNis = String(e.code || e.nip || e.staff_code || '').trim().toLowerCase();
        const eName = String(e.name || e.nama || '').trim().toLowerCase();
        
        return (
          (eNis && hNis && eNis === hNis) ||
          (eName && hName && eName === hName)
        );
      });

      if (matched) {
        const fullNis = matched.code || matched.nip || matched.staff_code;
        const className = matched.role === 'waka' || matched.role === 'kepsek' || matched.role === 'guru' ? 'guru' : 'karyawan';

        if (h.nis !== fullNis || h.class_name !== className) {
          await dbPool.query(
            "UPDATE hikvision_students SET nis = $1, class_name = $2 WHERE id = $3",
            [fullNis, className, h.id]
          );
          await dbPool.query(
            "UPDATE hikvision_logs SET employee_id = $1 WHERE employee_id = $2",
            [fullNis, h.nis]
          );
        }
      }
    }
  } catch (e) {
    console.warn("autoLinkHikvisionTeachersAndStaffs warning:", e.message);
  }
}
`;

content = content.replace("export async function handleHikvisionRoutes", newFunc + "\nexport async function handleHikvisionRoutes");
fs.writeFileSync('server/routes/hikvision.mjs', content);
console.log("Added autoLinkHikvisionTeachersAndStaffs!");
