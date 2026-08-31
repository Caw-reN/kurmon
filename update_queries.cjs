const fs = require('fs');
let content = fs.readFileSync('server/routes/hikvision.mjs', 'utf8');

content = content.replace(
  "LEFT JOIN mst_teachers mst ON mst.payload->>'code' = l.employee_id OR mst.payload->>'nip' = l.employee_id",
  `LEFT JOIN mst_teachers mst ON (mst.payload->>'code' = l.employee_id OR mst.payload->>'nip' = l.employee_id)
          AND NOT EXISTS (SELECT 1 FROM hikvision_students h_chk WHERE h_chk.nis = l.employee_id AND (h_chk.name ILIKE '%admin%' OR h_chk.name = 'NGADMIN'))`
);

content = content.replace(
  "LEFT JOIN mst_staffs msf ON msf.payload->>'staff_code' = l.employee_id OR msf.payload->>'code' = l.employee_id",
  `LEFT JOIN mst_staffs msf ON (msf.payload->>'staff_code' = l.employee_id OR msf.payload->>'code' = l.employee_id)
          AND NOT EXISTS (SELECT 1 FROM hikvision_students h_chk WHERE h_chk.nis = l.employee_id AND (h_chk.name ILIKE '%admin%' OR h_chk.name = 'NGADMIN'))`
);

// Do it again for the other occurrences (like teacherLogsRes and staffLogsRes)
content = content.replace(
  "LEFT JOIN mst_teachers mst ON (mst.payload->>'code' = l.employee_id OR mst.payload->>'nip' = l.employee_id) AND l.employee_id !~* '^[0-9]{7,}'",
  `LEFT JOIN mst_teachers mst ON (mst.payload->>'code' = l.employee_id OR mst.payload->>'nip' = l.employee_id) AND l.employee_id !~* '^[0-9]{7,}'
          AND NOT EXISTS (SELECT 1 FROM hikvision_students h_chk WHERE h_chk.nis = l.employee_id AND (h_chk.name ILIKE '%admin%' OR h_chk.name = 'NGADMIN'))`
);

content = content.replace(
  "LEFT JOIN mst_staffs msf ON (msf.payload->>'staff_code' = l.employee_id OR msf.payload->>'code' = l.employee_id) AND l.employee_id !~* '^[0-9]{7,}'",
  `LEFT JOIN mst_staffs msf ON (msf.payload->>'staff_code' = l.employee_id OR msf.payload->>'code' = l.employee_id) AND l.employee_id !~* '^[0-9]{7,}'
          AND NOT EXISTS (SELECT 1 FROM hikvision_students h_chk WHERE h_chk.nis = l.employee_id AND (h_chk.name ILIKE '%admin%' OR h_chk.name = 'NGADMIN'))`
);


fs.writeFileSync('server/routes/hikvision.mjs', content);
console.log("Updated queries!");
