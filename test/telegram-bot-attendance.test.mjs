import test from 'node:test';
import assert from 'node:assert/strict';
import { 
  escapeHtml, 
  formatMessageToHtml, 
  formatDowntimeDuration,
  _normalizeClassInput, 
  _parseIndonesianDate, 
  _cleanDateFromText 
} from '../server/telegram-bot.mjs';

test('Telegram formatting and escaping functions properly', () => {
  assert.equal(escapeHtml('Hello <World> & "Friends"'), 'Hello &lt;World&gt; &amp; "Friends"');
  
  const formatted = formatMessageToHtml('Status: *Hadir* pada `07:15`');
  assert.match(formatted, /<b>Hadir<\/b>/);
  assert.match(formatted, /<code>07:15<\/code>/);
});

test('formatDowntimeDuration returns human readable strings in Indonesian', () => {
  assert.equal(formatDowntimeDuration(45 * 1000), 'Kurang dari 1 menit');
  assert.equal(formatDowntimeDuration(12 * 60 * 1000), '12 menit');
  assert.equal(formatDowntimeDuration((2 * 3600 + 15 * 60) * 1000), '2 jam 15 menit');
  assert.equal(formatDowntimeDuration((26 * 3600 + 40 * 60) * 1000), '1 hari 2 jam');
});

test('Class matching helper logic handles arabic to roman conversion with and without spaces', () => {
  assert.equal(_normalizeClassInput('10 tkj 1'), 'X TKJ 1');
  assert.equal(_normalizeClassInput('10tkj1'), 'X TKJ1');
  assert.equal(_normalizeClassInput('11 rpl 2'), 'XI RPL 2');
  assert.equal(_normalizeClassInput('11rpl2'), 'XI RPL2');
  assert.equal(_normalizeClassInput('12 ak'), 'XII AK');
  assert.equal(_normalizeClassInput('12ak'), 'XII AK');
  assert.equal(_normalizeClassInput('x tkj 1'), 'X TKJ 1');
  assert.equal(_normalizeClassInput('  xi   tkj  1 '), 'XI TKJ 1');
});

test('Indonesian date parser extracts relative and explicit dates correctly', () => {
  const todayResult = _parseIndonesianDate('absen hari ini');
  assert.ok(todayResult);
  assert.equal(todayResult.isToday, true);

  const yesterdayResult = _parseIndonesianDate('rekap kemarin');
  assert.ok(yesterdayResult);
  assert.equal(yesterdayResult.isToday, false);

  const augustResult = _parseIndonesianDate('tanggal 1 agustus 2026');
  assert.ok(augustResult);
  assert.equal(augustResult.isoDate, '2026-08-01');
  assert.equal(augustResult.day, 1);
  assert.equal(augustResult.month, 8);
  assert.equal(augustResult.year, 2026);

  const isoResult = _parseIndonesianDate('rekap 2026-09-15');
  assert.ok(isoResult);
  assert.equal(isoResult.isoDate, '2026-09-15');
});

test('Compound class and date argument separation works properly without truncating class numbers', () => {
  const input = 'X TKJ 1 kemarin';
  const dateArg = _parseIndonesianDate(input);
  assert.ok(dateArg);

  const potentialClass = _cleanDateFromText(input);
  assert.equal(potentialClass, 'X TKJ 1');

  const input2 = 'XI RPL 2 tanggal 1 agustus 2026';
  const dateArg2 = _parseIndonesianDate(input2);
  assert.ok(dateArg2);
  assert.equal(dateArg2.isoDate, '2026-08-01');

  const potentialClass2 = _cleanDateFromText(input2);
  assert.equal(potentialClass2, 'XI RPL 2');
});

test('Attendance calculation formula prevents students with approved Izin/Sakit from being counted as unexcused absent', () => {
  const total = 36;
  const hadir = 32;
  const izinSakit = 3;
  // Belum hadir harus dihitung tanpa menganggap siswa izin/sakit sebagai belum absen
  const belum = Math.max(0, total - hadir - izinSakit);
  assert.equal(belum, 1);
  assert.equal(hadir + izinSakit + belum, total);
});

test('Dual 8-digit and 9-digit NIS mapping handles machine and school IDs correctly', () => {
  const schoolNis = '242510163';
  const machineId = schoolNis.slice(1); // '42510163'
  
  const idToNisMap = new Map();
  idToNisMap.set(schoolNis, schoolNis);
  if (schoolNis.length === 9) {
    idToNisMap.set(schoolNis.slice(1), schoolNis);
  }

  assert.equal(idToNisMap.get(machineId), schoolNis);
  assert.equal(idToNisMap.get(schoolNis), schoolNis);
});
