const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../server/auth-server.mjs');
let content = fs.readFileSync(filePath, 'utf8');

// 1. Fix gzip compression to be async
const sendTarget = `const send = (req, res, statusCode, payload) => {
  const headers = getHeaders(req);
  const jsonStr = JSON.stringify(payload);
  const acceptEncoding = req.headers["accept-encoding"] || "";

  if (acceptEncoding.includes("gzip")) {
    try {
      const compressed = zlib.gzipSync(Buffer.from(jsonStr));
      headers["Content-Encoding"] = "gzip";
      res.writeHead(statusCode, headers);
      res.end(compressed);
      return;
    } catch (err) {
      console.warn("Gzip compression failed:", err);
    }
  }

  res.writeHead(statusCode, headers);
  res.end(jsonStr);
};`;

const sendReplace = `const send = (req, res, statusCode, payload) => {
  const headers = getHeaders(req);
  const jsonStr = JSON.stringify(payload);
  const acceptEncoding = req.headers["accept-encoding"] || "";

  if (acceptEncoding.includes("gzip")) {
    zlib.gzip(Buffer.from(jsonStr), (err, compressed) => {
      if (err) {
        console.warn("Gzip compression failed:", err);
        res.writeHead(statusCode, headers);
        res.end(jsonStr);
      } else {
        headers["Content-Encoding"] = "gzip";
        res.writeHead(statusCode, headers);
        res.end(compressed);
      }
    });
    return;
  }

  res.writeHead(statusCode, headers);
  res.end(jsonStr);
};`;

if(content.includes('zlib.gzipSync(Buffer.from(jsonStr))')) {
    content = content.replace(sendTarget, sendReplace);
}

// 2. Fix Database Query
const queryTarget = `WHERE l.person_type IN ('guru', 'karyawan') OR d.device_type IN ('guru', 'karyawan')
      ORDER BY l.timestamp ASC`;
const queryReplace = `WHERE l.timestamp >= CURRENT_DATE - INTERVAL '7 days' AND (l.person_type IN ('guru', 'karyawan') OR d.device_type IN ('guru', 'karyawan'))
      ORDER BY l.timestamp ASC`;

if(content.includes(queryTarget)) {
    content = content.replace(queryTarget, queryReplace);
}

// 3. Fix Security Headers
const headerTarget = `"Permissions-Policy": "camera=(), microphone=(), geolocation=(self)",`;
const headerReplace = `"Permissions-Policy": "camera=(), microphone=(), geolocation=(self)",
    "Strict-Transport-Security": "max-age=31536000; includeSubDomains",
    "Content-Security-Policy": "default-src 'self' 'unsafe-inline' 'unsafe-eval' data: blob: https:;",`;

if(content.includes(headerTarget) && !content.includes('Strict-Transport-Security')) {
    content = content.replace(headerTarget, headerReplace);
}

fs.writeFileSync(filePath, content, 'utf8');
console.log('Successfully patched auth-server.mjs');
