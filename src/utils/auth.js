

const PBKDF2_PREFIX = "pbkdf2-sha256:";
const LEGACY_SHA256_PREFIX = "sha256:";
const PBKDF2_ITERATIONS = 120000;
const textEncoder = new TextEncoder();

const toHex = (buffer) => Array.from(new Uint8Array(buffer), (byte) => byte.toString(16).padStart(2, "0")).join("");
const fromHex = (hex) => {
  const clean = String(hex || "").replace(/[^0-9a-f]/gi, "");
  const bytes = new Uint8Array(clean.length / 2);
  for (let i = 0; i < bytes.length; i += 1) {
    bytes[i] = Number.parseInt(clean.slice(i * 2, i * 2 + 2), 16);
  }
  return bytes;
};

const getCrypto = () => {
  if (typeof globalThis !== "undefined" && globalThis.crypto) return globalThis.crypto;
  if (typeof window !== "undefined" && window.crypto) return window.crypto;
  if (typeof globalThis !== "undefined" && globalThis.process && globalThis.process.versions && globalThis.process.versions.node) {
    try {
      const req = new Function("return require")();
      const crypto = req("crypto");
      return crypto.webcrypto || crypto;
    } catch (e) {
      // ignore require failure in non-node envs
    }
  }
  return null;
};

const createSalt = () => {
  const salt = new Uint8Array(16);
  const cryptoObj = getCrypto();
  if (cryptoObj && typeof cryptoObj.getRandomValues === "function") {
    cryptoObj.getRandomValues(salt);
  } else {
    for (let i = 0; i < salt.length; i++) {
      salt[i] = Math.floor(Math.random() * 256);
    }
  }
  return toHex(salt);
};

export const isHashedPassword = (value) => typeof value === "string" && value.startsWith(LEGACY_SHA256_PREFIX) && value.length > LEGACY_SHA256_PREFIX.length;
const isPbkdf2Password = (value) => typeof value === "string" && value.startsWith(PBKDF2_PREFIX);
const isAnyPasswordHash = (value) => isHashedPassword(value) || isPbkdf2Password(value);

export const hashPassword = async (value) => {
  const plain = String(value ?? "");
  const cryptoObj = getCrypto();
  if (!cryptoObj || !cryptoObj.subtle) {
    console.warn("crypto.subtle not available. Using plaintext fallback.");
    return plain;
  }
  const saltHex = createSalt();
  const saltBytes = fromHex(saltHex);
  const key = await cryptoObj.subtle.importKey("raw", textEncoder.encode(plain), "PBKDF2", false, ["deriveBits"]);
  const derivedBits = await cryptoObj.subtle.deriveBits(
    { name: "PBKDF2", salt: saltBytes, iterations: PBKDF2_ITERATIONS, hash: "SHA-256" },
    key,
    256
  );
  return `${PBKDF2_PREFIX}${PBKDF2_ITERATIONS}:${saltHex}:${toHex(derivedBits)}`;
};

const verifyLegacyPassword = async (plain, stored) => {
  const cryptoObj = getCrypto();
  if (!cryptoObj || !cryptoObj.subtle) return false;
  const digest = await cryptoObj.subtle.digest("SHA-256", textEncoder.encode(String(plain ?? "")));
  return `${LEGACY_SHA256_PREFIX}${toHex(digest)}` === stored;
};

const verifyPbkdf2Password = async (plain, stored) => {
  const cryptoObj = getCrypto();
  if (!cryptoObj || !cryptoObj.subtle) return false;
  const [, iterationsRaw, saltHex, hashHex] = String(stored || "").split(":");
  const iterations = Number.parseInt(iterationsRaw, 10);
  if (!iterations || !saltHex || !hashHex) return false;
  const key = await cryptoObj.subtle.importKey("raw", textEncoder.encode(String(plain ?? "")), "PBKDF2", false, ["deriveBits"]);
  const derivedBits = await cryptoObj.subtle.deriveBits(
    { name: "PBKDF2", salt: fromHex(saltHex), iterations, hash: "SHA-256" },
    key,
    256
  );
  return toHex(derivedBits) === hashHex;
};

export const verifyPassword = async (plain, stored) => {
  const safeStored = String(stored ?? "");
  const cryptoObj = getCrypto();
  try {
    if (isPbkdf2Password(safeStored)) {
      if (!cryptoObj || !cryptoObj.subtle) {
        console.warn("crypto.subtle not available for PBKDF2 verification.");
        return false;
      }
      return await verifyPbkdf2Password(plain, safeStored);
    }
    if (isHashedPassword(safeStored)) {
      if (!cryptoObj || !cryptoObj.subtle) {
        console.warn("crypto.subtle not available for SHA-256 verification.");
        return false;
      }
      return await verifyLegacyPassword(plain, safeStored);
    }
  } catch (error) {
    console.error("Password verification failed:", error);
    return false;
  }
  return String(plain ?? "") === safeStored;
};

export const normalizeAdminUser = async (adminUser) => {
  const next = { ...adminUser };
  if (next.password && !isAnyPasswordHash(next.password)) next.password = await hashPassword(next.password);
  return next;
};

export const normalizeTeachers = async (teachers) => {
  const next = [];
  for (const teacher of teachers || []) {
    const item = { ...teacher };
    if (item.password && !isAnyPasswordHash(item.password)) item.password = await hashPassword(item.password);
    next.push(item);
  }
  return next;
};
