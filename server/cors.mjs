import { isIP } from "node:net";

const splitOriginList = (value) =>
  String(value || "")
    .split(/[\s,]+/)
    .map((item) => item.trim())
    .filter(Boolean);

const isPrivateIpv4 = (hostname) => {
  const octets = hostname.split(".").map((part) => Number(part));
  if (octets.length !== 4 || octets.some((part) => !Number.isInteger(part) || part < 0 || part > 255)) {
    return false;
  }

  const [first, second] = octets;
  return (
    first === 10 ||
    first === 127 ||
    (first === 169 && second === 254) ||
    (first === 172 && second >= 16 && second <= 31) ||
    (first === 192 && second === 168)
  );
};

const isPrivateIpv6 = (hostname) => {
  const normalized = hostname.toLowerCase();
  return (
    normalized === "::1" ||
    normalized.startsWith("fc") ||
    normalized.startsWith("fd") ||
    normalized.startsWith("fe80:")
  );
};

const isLocalHostname = (hostname) => hostname === "localhost" || hostname.endsWith(".localhost");

export const buildAllowedOrigins = ({ env = process.env, frontendPort = 6677 } = {}) => {
  const allowedOrigins = new Set([
    `http://localhost:${frontendPort}`,
    `http://127.0.0.1:${frontendPort}`,
    `http://[::1]:${frontendPort}`,
    ...splitOriginList(env.AUTH_ALLOWED_ORIGINS),
    ...splitOriginList(env.AUTH_ALLOWED_ORIGIN),
  ]);

  return allowedOrigins;
};

export const isAllowedOrigin = (origin, allowedOrigins = buildAllowedOrigins()) => {
  if (!origin) return false;

  let url;
  try {
    url = new URL(origin);
  } catch {
    return false;
  }

  if (!["http:", "https:"].includes(url.protocol)) return false;
  if (allowedOrigins.has("*")) return true;
  if (allowedOrigins.has(origin)) return true;

  const hostname = url.hostname;
  if (isLocalHostname(hostname)) return true;

  const ipVersion = isIP(hostname);
  if (ipVersion === 4) return isPrivateIpv4(hostname);
  if (ipVersion === 6) return isPrivateIpv6(hostname);

  return false;
};

export const resolveCorsOrigin = (origin, allowedOrigins = buildAllowedOrigins()) =>
  isAllowedOrigin(origin, allowedOrigins) ? origin : "";
