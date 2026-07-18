/**
 * tests/auth.test.mjs
 * Unit tests untuk fungsi autentikasi inti
 * Jalankan dengan: npm test
 */

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { hashPassword, verifyPassword, normalizeAdminUser, normalizeTeachers } from '../src/utils/auth.js';

describe('hashPassword', () => {

  test('menghasilkan string hash yang valid', async () => {
    const hash = await hashPassword('test123');
    assert.ok(typeof hash === 'string', 'Hash harus berupa string');
    assert.ok(hash.length > 20, 'Hash harus cukup panjang');
    assert.notStrictEqual(hash, 'test123', 'Hash tidak boleh sama dengan plaintext');
  });

  test('hash mengandung prefix pbkdf2-sha256', async () => {
    const hash = await hashPassword('password');
    assert.ok(hash.startsWith('pbkdf2-sha256:'), 'Harus pakai PBKDF2');
  });

  test('hash berbeda untuk input yang sama (salt unik)', async () => {
    const hash1 = await hashPassword('samepassword');
    const hash2 = await hashPassword('samepassword');
    assert.notStrictEqual(hash1, hash2, 'Setiap hash harus unik karena random salt');
  });

  test('bisa hash password minimal 6 karakter', async () => {
    const hash = await hashPassword('123456');
    assert.ok(hash.startsWith('pbkdf2-sha256:'));
  });

});

describe('verifyPassword', () => {

  test('mengembalikan true untuk password yang benar', async () => {
    const hash = await hashPassword('password123');
    const isValid = await verifyPassword('password123', hash);
    assert.strictEqual(isValid, true);
  });

  test('mengembalikan false untuk password yang salah', async () => {
    const hash = await hashPassword('password123');
    const isValid = await verifyPassword('wrong_password', hash);
    assert.strictEqual(isValid, false);
  });

  test('mengembalikan false untuk hash tidak valid', async () => {
    const isValid = await verifyPassword('test', 'bukan_hash_valid');
    assert.strictEqual(isValid, false);
  });

  test('password default kode guru (misal: G001) dapat diverifikasi', async () => {
    const code = 'G001';
    const hash = await hashPassword(code);
    const isValid = await verifyPassword(code, hash);
    assert.strictEqual(isValid, true, 'Kode guru sebagai password default harus bisa login');
  });

  test('verifyPassword tidak crash untuk input null/undefined', async () => {
    const isValid = await verifyPassword(null, undefined);
    assert.strictEqual(typeof isValid, 'boolean');
  });

});

describe('normalizeAdminUser', () => {

  test('menjaga username yang ada', async () => {
    const admin = { username: 'admin_test', name: 'Admin Test', password: 'hashedOrPlain' };
    const result = await normalizeAdminUser(admin);
    assert.ok(result, 'Hasil tidak boleh null');
    assert.strictEqual(result.username, 'admin_test');
  });

  test('meng-hash password plaintext jika belum di-hash', async () => {
    const admin = { username: 'admin', password: 'plaintextpassword' };
    const result = await normalizeAdminUser(admin);
    assert.ok(result.password.startsWith('pbkdf2-sha256:'), 'Password harus di-hash');
  });

  test('tidak meng-hash ulang jika sudah dalam format hash', async () => {
    const hashed = await hashPassword('mypassword');
    const admin = { username: 'admin', password: hashed };
    const result = await normalizeAdminUser(admin);
    assert.strictEqual(result.password, hashed, 'Hash tidak boleh diubah jika sudah valid');
  });

});

describe('normalizeTeachers', () => {

  test('mengembalikan array untuk input valid', async () => {
    const teachers = [
      { code: 'G001', name: 'Guru A', role: 'guru', password: 'pass1' },
      { code: 'G002', name: 'Guru B', role: 'guru', password: 'pass2' }
    ];
    const result = await normalizeTeachers(teachers);
    assert.ok(Array.isArray(result), 'Harus mengembalikan array');
    assert.strictEqual(result.length, 2);
  });

  test('mengembalikan array kosong untuk input null', async () => {
    const result = await normalizeTeachers(null);
    assert.ok(Array.isArray(result));
    assert.strictEqual(result.length, 0);
  });

  test('mengembalikan array kosong untuk input null/undefined', async () => {
    const result1 = await normalizeTeachers(null);
    const result2 = await normalizeTeachers(undefined);
    assert.ok(Array.isArray(result1));
    assert.ok(Array.isArray(result2));
    assert.strictEqual(result1.length, 0);
    assert.strictEqual(result2.length, 0);
  });

  test('meng-hash password guru yang belum di-hash', async () => {
    const teachers = [{ code: 'G001', name: 'Guru A', password: 'plainpass' }];
    const result = await normalizeTeachers(teachers);
    assert.ok(result[0].password.startsWith('pbkdf2-sha256:'), 'Password guru harus di-hash');
  });

});
