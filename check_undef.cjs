const fs = require('fs');

try {
  const data = JSON.parse(fs.readFileSync('audit-post-fix.json', 'utf8'));
  const missing = {};
  let totalErrors = 0;

  for (const file of data) {
    for (const msg of file.messages) {
      if (msg.ruleId === 'no-undef' || msg.ruleId === 'react/jsx-no-undef') {
        if (!missing[file.filePath]) missing[file.filePath] = [];
        missing[file.filePath].push(`Line ${msg.line}: ${msg.message}`);
        totalErrors++;
      }
    }
  }

  if (totalErrors === 0) {
    console.log("No undefined variables found! 🎉");
  } else {
    console.log(`Found ${totalErrors} undefined variable errors:\n`);
    for (const [file, msgs] of Object.entries(missing)) {
      const fileName = file.split(/\\|\//).pop();
      console.log(`--- ${fileName} ---`);
      for (const msg of msgs) {
        console.log(`  ${msg}`);
      }
      console.log('');
    }
  }
} catch (e) {
  console.log("Waiting for audit-post-fix.json...");
}
