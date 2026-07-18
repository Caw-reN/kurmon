import test from "node:test";
import assert from "node:assert/strict";

import { hashPassword, normalizeAdminUser, normalizeTeachers, verifyPassword } from "../src/utils/auth.js";

test("verifyPassword accepts hashed passwords and rejects wrong values", async () => {
  const hash = await hashPassword("secret123");
  assert.equal(await verifyPassword("secret123", hash), true);
  assert.equal(await verifyPassword("wrong", hash), false);
});

test("normalizeAdminUser upgrades legacy plain password", async () => {
  const next = await normalizeAdminUser({ username: "admin", password: "admin123", name: "Admin" });
  assert.match(next.password, /^pbkdf2-sha256:/);
});

test("normalizeTeachers preserves already hashed passwords", async () => {
  const hash = await hashPassword("123");
  const teachers = await normalizeTeachers([{ code: "G01", name: "Guru", password: hash }]);
  assert.equal(teachers[0].password, hash);
});
