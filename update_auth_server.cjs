const fs = require('fs');
let content = fs.readFileSync('server/auth-server.mjs', 'utf8');

content = content.replace(
  'import { handleHikvisionRoutes, autoLinkHikvisionStudents } from "./routes/hikvision.mjs";', 
  'import { handleHikvisionRoutes, autoLinkHikvisionStudents, autoLinkHikvisionTeachersAndStaffs } from "./routes/hikvision.mjs";'
);

content = content.replace(
  'autoLinkHikvisionStudents(dbPool).catch(() => {});',
  'autoLinkHikvisionStudents(dbPool).catch(() => {});\n    autoLinkHikvisionTeachersAndStaffs(dbPool).catch(() => {});'
);

fs.writeFileSync('server/auth-server.mjs', content);
console.log("Updated auth-server.mjs!");
