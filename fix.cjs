const fs = require('fs');

let content = fs.readFileSync('server/auth-server.mjs', 'utf8');

const target = `        let responseData = {};
        let status = "sent";
        try {
          const fonnteRes = await fetch("https://api.fonnte.com/send", {
            method: "POST",
            headers: { "Authorization": token, "Content-Type": "application/json" },
            body: JSON.stringify({ target: phone, message: body.message, countryCode: "62" })
          });
          responseData = await fonnteRes.json();
          if (!fonnteRes.ok || responseData.status === false) status = "failed";
        } catch (e) {
          status = "failed";
          responseData = { error: e.message };
        }`;

const replacement = `        let responseData = {};
        let status = "sent";
        try {
          if (provider === 'whatsapp_official') {
            const phoneId = targetKey.extra_config?.phone_number_id;
            if (!phoneId) throw new Error("Phone Number ID tidak disetting untuk WhatsApp Official.");
            
            const payload = body.template_name ? {
              messaging_product: "whatsapp",
              to: phone,
              type: "template",
              template: {
                name: body.template_name,
                language: { code: "id" }
              }
            } : {
              messaging_product: "whatsapp",
              to: phone,
              type: "text",
              text: { body: body.message }
            };

            const officialRes = await fetch(\`https://graph.facebook.com/v18.0/\${phoneId}/messages\`, {
              method: "POST",
              headers: { 
                "Authorization": \`Bearer \${token}\`, 
                "Content-Type": "application/json" 
              },
              body: JSON.stringify(payload)
            });
            responseData = await officialRes.json();
            if (!officialRes.ok) status = "failed";
          } else {
            const fonnteRes = await fetch("https://api.fonnte.com/send", {
              method: "POST",
              headers: { "Authorization": token, "Content-Type": "application/json" },
              body: JSON.stringify({ target: phone, message: body.message, countryCode: "62" })
            });
            responseData = await fonnteRes.json();
            if (!fonnteRes.ok || responseData.status === false) status = "failed";
          }
        } catch (e) {
          status = "failed";
          responseData = { error: e.message };
        }`;

if (content.includes(target)) {
    content = content.replace(target, replacement);
} else if (content.includes(target.replace(/\n/g, '\r\n'))) {
    content = content.replace(target.replace(/\n/g, '\r\n'), replacement.replace(/\n/g, '\r\n'));
} else {
    console.error('Target not found');
    process.exit(1);
}

fs.writeFileSync('server/auth-server.mjs', content);
console.log('Successfully replaced fetch block!');
