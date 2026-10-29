import test from 'node:test';
import assert from 'node:assert/strict';
import { getHolidayInfoForDate } from '../src/utils/adminHelpers.js';

test('getHolidayInfoForDate returns correct holiday info and reason sentences', async (t) => {
  const categories = [
    { id: 'cat-1', name: 'Libur Nasional' },
    { id: 'cat-2', name: 'Ujian' }
  ];

  const calendar = [
    {
      id: 'evt-1',
      title: 'Ujian TKA',
      dateStart: '2026-10-26',
      dateEnd: '2026-10-29',
      isHoliday: true,
      categoryId: 'cat-2',
      applicableClasses: 'Semua', // Diset Semua di form dasar, tapi memiliki rotasi harian
      dailyClassSchedule: {
        '2026-10-29': ['XI TKJ 1'] // Hanya tanggal 29 yang libur untuk XI TKJ 1
      },
      attendanceRemark: 'Diliburkan karena Lab digunakan Ujian TKA (Belajar Mandiri di Rumah)'
    }
  ];

  await t.test('2026-10-29 is HOLIDAY for XI TKJ 1', () => {
    const res = getHolidayInfoForDate(calendar, categories, '2026-10-29', 'XI TKJ 1');
    assert.ok(res !== null);
    assert.equal(res.isHoliday, true);
    assert.equal(res.reason, 'Diliburkan karena Lab digunakan Ujian TKA (Belajar Mandiri di Rumah)');
  });

  await t.test('2026-10-28 MUST NOT be a holiday for XI TKJ 1 (must be null)', () => {
    const res = getHolidayInfoForDate(calendar, categories, '2026-10-28', 'XI TKJ 1');
    assert.equal(res, null, '2026-10-28 should be null because dailyClassSchedule does not include it');
  });

  await t.test('2026-10-27 MUST NOT be a holiday for XI TKJ 1 (must be null)', () => {
    const res = getHolidayInfoForDate(calendar, categories, '2026-10-27', 'XI TKJ 1');
    assert.equal(res, null, '2026-10-27 should be null because dailyClassSchedule does not include it');
  });

  await t.test('2026-10-26 MUST NOT be a holiday for XI TKJ 1 (must be null)', () => {
    const res = getHolidayInfoForDate(calendar, categories, '2026-10-26', 'XI TKJ 1');
    assert.equal(res, null, '2026-10-26 should be null because dailyClassSchedule does not include it');
  });
});
