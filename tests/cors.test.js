import test from "node:test";
import assert from "node:assert/strict";

import { buildAllowedOrigins, isAllowedOrigin, resolveCorsOrigin } from "../server/cors.mjs";

test("buildAllowedOrigins includes local dev defaults", () => {
  const allowed = buildAllowedOrigins({ env: {}, frontendPort: 6677 });

  assert.equal(allowed.has("http://localhost:6677"), true);
  assert.equal(allowed.has("http://127.0.0.1:6677"), true);
  assert.equal(allowed.has("http://[::1]:6677"), true);
});

test("buildAllowedOrigins keeps explicit env origins", () => {
  const allowed = buildAllowedOrigins({
    env: {
      AUTH_ALLOWED_ORIGINS: "http://10.0.0.5:6677, http://example.test:6677",
    },
    frontendPort: 6677,
  });

  assert.equal(allowed.has("http://10.0.0.5:6677"), true);
  assert.equal(allowed.has("http://example.test:6677"), true);
});

test("isAllowedOrigin accepts localhost and private LAN IPs", () => {
  const allowed = buildAllowedOrigins({ env: {}, frontendPort: 6677 });

  assert.equal(isAllowedOrigin("http://localhost:6677", allowed), true);
  assert.equal(isAllowedOrigin("http://192.168.1.20:6677", allowed), true);
  assert.equal(isAllowedOrigin("http://10.1.2.3:6677", allowed), true);
});

test("isAllowedOrigin rejects untrusted public origins unless explicitly allowed", () => {
  const allowed = buildAllowedOrigins({ env: {}, frontendPort: 6677 });

  assert.equal(isAllowedOrigin("http://evil.example:6677", allowed), false);
  assert.equal(resolveCorsOrigin("http://evil.example:6677", allowed), "", "untrusted origins should be blocked");
});

