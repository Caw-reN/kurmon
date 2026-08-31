const fs = require('fs');
const content = fs.readFileSync('server/auth-server.mjs', 'utf8');
if (content.includes('pg.types.setTypeParser')) {
  console.log("Custom type parser found!");
} else {
  console.log("No custom type parser.");
}
