const fs = require('fs');

let content = fs.readFileSync('server/auth-server.mjs', 'utf8');

const sendRekapTarget = `        const keyRes = await dbPool.query("SELECT api_key FROM api_keys WHERE service_name = 'whatsapp_fonnte' AND is_active = true");
        if (keyRes.rowCount === 0) {
          send(req, res, 400, { ok: false, error: "API Key WhatsApp belum dikonfigurasi atau tidak aktif. Masuk ke menu Manajemen API Key." });
          return;
        }
        const token = keyRes.rows[0].api_key;`;

const sendRekapReplacement = `        const targetJurusan = body.jurusan || "default";
        const keyRes = await dbPool.query("SELECT api_key, extra_config, service_name FROM api_keys WHERE service_name LIKE 'whatsapp_%' AND is_active = true");
        if (keyRes.rowCount === 0) {
          send(req, res, 400, { ok: false, error: "API Key WhatsApp belum dikonfigurasi atau tidak aktif. Masuk ke menu Manajemen API Key." });
          return;
        }
        
        const executeSend = async (targetPhone, textMessage, targetJurusanOverride = null) => {
            let key = keyRes.rows.find(k => k.extra_config?.jurusan === (targetJurusanOverride || targetJurusan));
            if (!key) key = keyRes.rows.find(k => !k.extra_config?.jurusan || k.extra_config?.jurusan === "default");
            if (!key) key = keyRes.rows[0];
            
            const prov = key.service_name.startsWith('whatsapp_official') ? 'whatsapp_official' : 'whatsapp_fonnte';
            
            if (prov === 'whatsapp_official') {
                const phoneId = key.extra_config?.phone_number_id;
                const payload = {
                    messaging_product: "whatsapp",
                    to: targetPhone,
                    type: "text",
                    text: { body: textMessage }
                };
                const officialRes = await fetch(\`https://graph.facebook.com/v18.0/\${phoneId}/messages\`, {
                    method: "POST",
                    headers: { "Authorization": \`Bearer \${key.api_key}\`, "Content-Type": "application/json" },
                    body: JSON.stringify(payload)
                });
                const resData = await officialRes.json();
                return { ok: officialRes.ok, resData, status: officialRes.ok ? "sent" : "failed" };
            } else {
                const fonnteRes = await fetch("https://api.fonnte.com/send", {
                    method: "POST",
                    headers: { "Authorization": key.api_key, "Content-Type": "application/json" },
                    body: JSON.stringify({ target: targetPhone, message: textMessage, countryCode: "62" })
                });
                const resData = await fonnteRes.json();
                return { ok: fonnteRes.ok && resData.status !== false, resData, status: (fonnteRes.ok && resData.status !== false) ? "sent" : "failed" };
            }
        };`;

if (content.includes(sendRekapTarget)) {
    content = content.replace(sendRekapTarget, sendRekapReplacement);
} else if (content.includes(sendRekapTarget.replace(/\n/g, '\r\n'))) {
    content = content.replace(sendRekapTarget.replace(/\n/g, '\r\n'), sendRekapReplacement.replace(/\n/g, '\r\n'));
} else {
    console.error('sendRekapTarget not found');
    process.exit(1);
}

const call1Target = `          const fonnteRes = await fetch("https://api.fonnte.com/send", {
            method: "POST",
            headers: { "Authorization": token, "Content-Type": "application/json" },
            body: JSON.stringify({ target: destPhone, message: message, countryCode: "62" })
          });
          const resData = await fonnteRes.json();
          const waStatus = (fonnteRes.ok && resData.status !== false) ? "sent" : "failed";`;

const call1Replacement = `          const sendRes = await executeSend(destPhone, message);
          const resData = sendRes.resData;
          const waStatus = sendRes.status;`;

if (content.includes(call1Target)) {
    content = content.replace(call1Target, call1Replacement);
} else if (content.includes(call1Target.replace(/\n/g, '\r\n'))) {
    content = content.replace(call1Target.replace(/\n/g, '\r\n'), call1Replacement.replace(/\n/g, '\r\n'));
} else {
    console.error('call1Target not found');
}


const call2Target = `                  const fonnteRes = await fetch("https://api.fonnte.com/send", {
                    method: "POST",
                    headers: { "Authorization": token, "Content-Type": "application/json" },
                    body: JSON.stringify({ target: destPhone, message: classMsg, countryCode: "62" })
                  });
                  const resData = await fonnteRes.json();
                  const waStatus = (fonnteRes.ok && resData.status !== false) ? "sent" : "failed";`;

const call2Replacement = `                  const sendRes = await executeSend(destPhone, classMsg);
                  const resData = sendRes.resData;
                  const waStatus = sendRes.status;`;

if (content.includes(call2Target)) {
    content = content.replace(call2Target, call2Replacement);
} else if (content.includes(call2Target.replace(/\n/g, '\r\n'))) {
    content = content.replace(call2Target.replace(/\n/g, '\r\n'), call2Replacement.replace(/\n/g, '\r\n'));
} else {
    console.error('call2Target not found');
}

const call3Target = `                    const fonnteRes = await fetch("https://api.fonnte.com/send", {
                      method: "POST",
                      headers: { "Authorization": token, "Content-Type": "application/json" },
                      body: JSON.stringify({ target: destPhone, message: msg, countryCode: "62" })
                    });
                    const resData = await fonnteRes.json();
                    const waStatus = (fonnteRes.ok && resData.status !== false) ? "sent" : "failed";`;

const call3Replacement = `                    const sendRes = await executeSend(destPhone, msg);
                    const resData = sendRes.resData;
                    const waStatus = sendRes.status;`;

if (content.includes(call3Target)) {
    content = content.replace(call3Target, call3Replacement);
} else if (content.includes(call3Target.replace(/\n/g, '\r\n'))) {
    content = content.replace(call3Target.replace(/\n/g, '\r\n'), call3Replacement.replace(/\n/g, '\r\n'));
} else {
    console.error('call3Target not found');
}

fs.writeFileSync('server/auth-server.mjs', content);
console.log('Successfully replaced send-rekap block!');
