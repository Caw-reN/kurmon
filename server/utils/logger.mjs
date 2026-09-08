/**
 * server/utils/logger.mjs
 * Centralized Logging & Sensitive Data Masking Utility for School System
 */

const SENSITIVE_KEYS = new Set([
  'password', 'pass', 'passwd', 'token', 'authtoken', 'bearer',
  'secret', 'apikey', 'key', 'encryptionkey', 'pin', 'otp',
  'privatekey', 'clientsecret', 'access_token', 'refresh_token',
  'pgpassword', 'db_password'
]);

/**
 * Mask string nomor telepon (contoh: 081234567890 -> 0812****7890)
 */
export function maskPhoneNumber(phone) {
  if (!phone || typeof phone !== 'string') return phone;
  const clean = phone.trim();
  if (clean.length < 8) return '****';
  const start = clean.slice(0, 4);
  const end = clean.slice(-4);
  return `${start}****${end}`;
}

/**
 * Mask NIK / nomor identitas panjang (contoh: 3201012345670001 -> 3201********0001)
 */
export function maskIdentityNumber(idNum) {
  if (!idNum || typeof idNum !== 'string') return idNum;
  const clean = idNum.trim();
  if (clean.length === 16) {
    return `${clean.slice(0, 4)}********${clean.slice(-4)}`;
  }
  if (clean.length >= 8) {
    return `${clean.slice(0, 3)}****${clean.slice(-2)}`;
  }
  return '****';
}

/**
 * Rekursif menyensor data sensitif pada objek, array, atau string
 */
export function maskSensitiveData(data, depth = 0) {
  if (depth > 6) return '[MAX_DEPTH]';
  if (data === null || data === undefined) return data;

  if (typeof data === 'string') {
    // Sensor password jika string terlihat seperti format kunci/token panjang
    if (/^[0-9a-f]{64}$/i.test(data) || /^[A-Za-z0-9+/=]{80,}$/.test(data)) {
      return '[REDACTED_HASH/TOKEN]';
    }
    // Sensor URL yang menyertakan password postgres://user:pass@host
    if (data.includes('://') && data.includes('@')) {
      return data.replace(/(:\/\/[^:]+:)([^@]+)(@)/, '$1[PROTECTED]$3');
    }
    return data;
  }

  if (Array.isArray(data)) {
    return data.map(item => maskSensitiveData(item, depth + 1));
  }

  if (typeof data === 'object') {
    // Jika instance Error
    if (data instanceof Error) {
      const maskedErr = {
        name: data.name,
        message: maskSensitiveData(data.message, depth + 1),
        stack: maskSensitiveData(data.stack, depth + 1),
      };
      if (data.code) maskedErr.code = data.code;
      return maskedErr;
    }

    const result = {};
    for (const [key, val] of Object.entries(data)) {
      const lowerKey = key.toLowerCase().replace(/[-_]/g, '');

      if (SENSITIVE_KEYS.has(lowerKey)) {
        result[key] = '[PROTECTED]';
      } else if (lowerKey.includes('phone') || lowerKey.includes('telepon') || lowerKey.includes('wa') || lowerKey.includes('whatsapp') || lowerKey.includes('nohp')) {
        result[key] = typeof val === 'string' ? maskPhoneNumber(val) : maskSensitiveData(val, depth + 1);
      } else if (lowerKey === 'nik' || lowerKey === 'no_identitas') {
        result[key] = typeof val === 'string' ? maskIdentityNumber(val) : maskSensitiveData(val, depth + 1);
      } else {
        result[key] = maskSensitiveData(val, depth + 1);
      }
    }
    return result;
  }

  return data;
}

/**
 * Safe logging functions
 */
export const safeLog = (...args) => {
  const masked = args.map(arg => maskSensitiveData(arg));
  console.log(...masked);
};

export const safeWarn = (...args) => {
  const masked = args.map(arg => maskSensitiveData(arg));
  console.warn(...masked);
};

export const safeError = (...args) => {
  const masked = args.map(arg => maskSensitiveData(arg));
  console.error(...masked);
};
