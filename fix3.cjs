const fs = require('fs');

let content = fs.readFileSync('server/auth-server.mjs', 'utf8');

const target = `                const fonnteRes = await fetch("https://api.fonnte.com/send", {
                  method: "POST",
                  headers: { "Authorization": token, "Content-Type": "application/json" },
                  body: JSON.stringify({ target: destPhone, message: parentMsg, countryCode: "62" })
                });
                const resData = await fonnteRes.json();
                const waStatus = (fonnteRes.ok && resData.status !== false) ? "sent" : "failed";`;

const replacement = `                const sendRes = await executeSend(destPhone, parentMsg);
                const resData = sendRes.resData;
                const waStatus = sendRes.status;`;

if (content.includes(target)) {
    content = content.replace(target, replacement);
} else if (content.includes(target.replace(/\n/g, '\r\n'))) {
    content = content.replace(target.replace(/\n/g, '\r\n'), replacement.replace(/\n/g, '\r\n'));
} else {
    console.error('Target not found');
    process.exit(1);
}

fs.writeFileSync('server/auth-server.mjs', content);
console.log('Successfully replaced third block!');
