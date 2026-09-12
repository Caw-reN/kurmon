import crypto from 'node:crypto';
import { Agent as UndiciAgent } from 'undici';

// FIX K-01 + B-02: native Node.js fetch() menggunakan undici di bawahnya dan TIDAK
// mendukung opsi `agent` dari https.Agent. Gunakan undici.Agent sebagai `dispatcher`
// agar rejectUnauthorized:false benar-benar efektif hanya untuk koneksi Hikvision IoT.
export const hikDispatcher = new UndiciAgent({ connect: { rejectUnauthorized: false } });

function md5(str) {
  return crypto.createHash('md5').update(str).digest('hex');
}

export function decryptPassword(encryptedBase64, ivBase64) {
  if (!ivBase64) return encryptedBase64;

  // FIX K-02: Hapus hardcoded fallback keys dari source code.
  // Hanya gunakan APP_KEY dari environment variable.
  // Tambah fallback kosong agar tidak crash jika APP_KEY belum diset,
  // tapi log peringatan yang jelas.
  const candidateKeys = [
    process.env.APP_KEY,
  ].filter(Boolean);

  if (candidateKeys.length === 0) {
    console.error('[Hikvision] APP_KEY tidak diset di .env — tidak bisa dekripsi password perangkat.');
    return encryptedBase64;
  }

  for (const appKey of candidateKeys) {
    try {
      const key = crypto.createHash('sha256').update(appKey).digest();
      const iv = Buffer.from(ivBase64, 'base64');
      const encrypted = Buffer.from(encryptedBase64, 'base64');
      
      const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
      let decrypted = decipher.update(encrypted);
      decrypted = Buffer.concat([decrypted, decipher.final()]);
      const result = decrypted.toString('utf8');
      if (result) return result;
    } catch {
      // Coba kunci berikutnya
    }
  }
  
  console.error("Gagal mendeskripsi password perangkat: Semua candidate keys gagal.");
  return encryptedBase64;
}

export function encryptPassword(plainText) {
  // FIX B-03: Throw jika APP_KEY kosong — jangan enkripsi dengan key 'MISSING_KEY'
  // yang diketahui publik. Startup guard di auth-server.mjs seharusnya sudah mencegah
  // ini, tapi defence-in-depth: lebih baik fail-hard daripada enkripsi palsu.
  const appKey = process.env.APP_KEY;
  if (!appKey) {
    throw new Error('[Hikvision] APP_KEY tidak diset di .env — tidak bisa enkripsi password perangkat.');
  }
  const key = crypto.createHash('sha256').update(appKey).digest();
  const iv = crypto.randomBytes(16);

  const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
  let encrypted = cipher.update(plainText, 'utf8');
  encrypted = Buffer.concat([encrypted, cipher.final()]);

  return {
    encrypted: encrypted.toString('base64'),
    iv: iv.toString('base64')
  };
}

export class HikvisionAPI {
  constructor(ip, username, password) {
    this.baseUrl = `http://${ip}`;
    this.username = username;
    this.password = password;
    this.nc = 0;
  }

  parseDigest(header) {
    const parts = header.substring(7).split(/,\s*/);
    const result = {};
    for (const part of parts) {
      const eqPos = part.indexOf('=');
      const key = part.substring(0, eqPos);
      let val = part.substring(eqPos + 1);
      if (val.startsWith('"') && val.endsWith('"')) {
        val = val.substring(1, val.length - 1);
      }
      result[key] = val;
    }
    return result;
  }

  async request(path, options = {}) {
    const url = `${this.baseUrl}${path}`;
    const method = options.method || 'GET';
    const controller = new AbortController();
    // Timeout pendek (5s) agar mesin offline tidak memblokir cron polling
    const timeout = setTimeout(() => controller.abort(), 5000);

    let res;
    try {
      // FIX K-01 + B-02: Gunakan undici dispatcher agar TLS bypass benar-benar efektif
      // hanya untuk koneksi ke mesin Hikvision IoT dengan sertifikat self-signed/expired.
      res = await fetch(url, { ...options, signal: controller.signal, dispatcher: hikDispatcher });
    } finally {
      clearTimeout(timeout);
    }

    if (res.status === 401 && res.headers.has('www-authenticate')) {
      const authHeader = res.headers.get('www-authenticate');
      if (authHeader.startsWith('Digest')) {
        const digestInfo = this.parseDigest(authHeader);
        this.nc++;
        const ncStr = this.nc.toString(16).padStart(8, '0');
        const cnonce = crypto.randomBytes(8).toString('hex');
        const uri = path;

        const ha1 = md5(`${this.username}:${digestInfo.realm}:${this.password}`);
        const ha2 = md5(`${method}:${uri}`);
        const response = md5(`${ha1}:${digestInfo.nonce}:${ncStr}:${cnonce}:${digestInfo.qop}:${ha2}`);

        const authParams = [
          `username="${this.username}"`,
          `realm="${digestInfo.realm}"`,
          `nonce="${digestInfo.nonce}"`,
          `uri="${uri}"`,
          `qop=${digestInfo.qop}`,
          `nc=${ncStr}`,
          `cnonce="${cnonce}"`,
          `response="${response}"`,
          `opaque="${digestInfo.opaque}"`
        ];

        const newHeaders = new Headers(options.headers || {});
        newHeaders.set('Authorization', `Digest ${authParams.join(', ')}`);

        const controller2 = new AbortController();
        // Sedikit lebih lama untuk Digest auth karena ada overhead kriptografi
        const timeout2 = setTimeout(() => controller2.abort(), 7000);
        try {
          // FIX K-01 + B-02: Gunakan undici dispatcher pada retry Digest auth juga
          res = await fetch(url, { ...options, headers: newHeaders, signal: controller2.signal, dispatcher: hikDispatcher });
        } finally {
          clearTimeout(timeout2);
        }
      }
    }
    return res;
  }

  async searchEvents(startTime, endTime) {
    let allLogs = [];
    let position = 0;

    const formatDate = (date) => {
      if (typeof date === 'string') return date;
      const d = date instanceof Date ? date : new Date();
      // Format as ISO in Asia/Jakarta (+07:00)
      const tzOffset = 7 * 60 * 60 * 1000;
      const localTime = new Date(d.getTime() + tzOffset);
      return localTime.toISOString().replace(/\.\d{3}Z$/, '+07:00');
    };

    const startStr = startTime ? formatDate(startTime) : formatDate(new Date(Date.now() - 3 * 24 * 60 * 60 * 1000));
    const endStr = endTime ? formatDate(endTime) : formatDate(new Date());

    while(true) {
      const payload = {
        AcsEventCond: {
          searchID: "1",
          searchResultPosition: position,
          maxResults: 30,
          major: 5,
          minor: 0,
          startTime: startStr,
          endTime: endStr
        }
      };
      const res = await this.request('/ISAPI/AccessControl/AcsEvent?format=json', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      
      if (!res.ok) break;
      
      try {
          const data = await res.json();
          const logs = data.AcsEvent?.InfoList || [];
          if (logs.length === 0) break;
          allLogs = allLogs.concat(logs);
          position += logs.length;
          if (logs.length < 30) break;
      } catch(e) {
          break;
      }
    }
    return allLogs;
  }

  async getUsers() {
    let allUsers = [];
    let position = 0;

    while(true) {
      const payload = {
        UserInfoSearchCond: {
          searchID: "1",
          searchResultPosition: position,
          maxResults: 30
        }
      };
      const res = await this.request('/ISAPI/AccessControl/UserInfo/Search?format=json', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      
      if (!res.ok) break;

      try {
          const data = await res.json();
          const users = data.UserInfoSearch?.UserInfo || [];
          if (users.length === 0) break;
          allUsers = allUsers.concat(users);
          position += users.length;
          if (users.length < 30) break;
      } catch(e) {
          break;
      }
    }
    return allUsers;
  }

  async createUser(nis, name) {
    const payload = {
      UserInfo: {
        employeeNo: String(nis),
        name: String(name),
        userType: "normal",
        Valid: {
          enable: true,
          beginTime: "2020-01-01T00:00:00",
          endTime: "2035-12-31T23:59:59"
        }
      }
    };
    const res = await this.request('/ISAPI/AccessControl/UserInfo/Record?format=json', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (res.ok) {
      try {
        const data = await res.json();
        return data.statusCode === 1 || data.subStatusCode === "ok";
      } catch(e) {
        return false;
      }
    }
    return false;
  }

  /**
   * Modify existing user on Hikvision device.
   * Used to push class_name updates (stored as userDepartment) to physical device.
   */
  async modifyUser(employeeNo, updates = {}) {
    const userInfo = { employeeNo: String(employeeNo) };
    if (updates.name)       userInfo.name = String(updates.name);
    if (updates.department) userInfo.userDepartment = String(updates.department);
    const payload = { UserInfo: userInfo };
    const res = await this.request('/ISAPI/AccessControl/UserInfo/Modify?format=json', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (res.ok) {
      try {
        const data = await res.json();
        return data.statusCode === 1 || data.subStatusCode === 'ok';
      } catch (e) { return false; }
    }
    return false;
  }
}

