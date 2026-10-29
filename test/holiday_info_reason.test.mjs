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
      dateStart: '2026-11-02',
      dateEnd: '2026-11-04',
      isHoliday: true,
      categoryId: 'cat-2',
      applicableClasses: 'Semua',
      dailyClassSchedule: {
        '2026-11-02': ['XI TKJ 3', 'XI RPL 1'],
        '2026-11-03': ['XI TKJ 2', 'XI RPL 2']
      },
      attendanceRemark: 'Diliburkan karena Lab digunakan Ujian TKA (Belajar Mandiri di Rumah)'
    },
    {
      id: 'evt-2',
      title: 'Hari Guru Nasional',
      dateStart: '2026-11-25',
      dateEnd: '2026-11-25',
      isHoliday: true,
      categoryId: 'cat-1',
      applicableClasses: 'Semua',
      attendanceRemark: '' // Kosong, harus di-fallback ke kalimat otomatis
    },
    {
      id: 'evt-3',
      title: 'Libur Semester Ganjil',
      dateStart: '2026-12-20',
      dateEnd: '2026-12-31',
      isHoliday: true,
      categoryId: 'cat-1',
      applicableClasses: 'Semua',
      attendanceRemark: '-' // Dash, harus di-fallback ke kalimat otomatis
    }
  ];

  await t.test('matches dailyClassSchedule for specific class on specific date with explicit remark', () => {
    // 2026-11-02: XI TKJ 3 is exempted
    const res1 = getHolidayInfoForDate(calendar, categories, '2026-11-02', 'XI TKJ 3');
    assert.ok(res1 !== null);
    assert.equal(res1.isHoliday, true);
    assert.equal(res1.reason, 'Diliburkan karena Lab digunakan Ujian TKA (Belajar Mandiri di Rumah)');

    // 2026-11-02: XI TKJ 2 is NOT exempted
    const res2 = getHolidayInfoForDate(calendar, categories, '2026-11-02', 'XI TKJ 2');
    assert.equal(res2, null);

    // 2026-11-03: XI TKJ 2 IS exempted
    const res3 = getHolidayInfoForDate(calendar, categories, '2026-11-03', 'XI TKJ 2');
    assert.ok(res3 !== null);
    assert.equal(res3.isHoliday, true);
    assert.equal(res3.reason, 'Diliburkan karena Lab digunakan Ujian TKA (Belajar Mandiri di Rumah)');
  });

  await t.test('automatically generates explanatory reason when attendanceRemark is empty', () => {
    const res = getHolidayInfoForDate(calendar, categories, '2026-11-25', 'X TKJ 1');
    assert.ok(res !== null);
    assert.equal(res.isHoliday, true);
    assert.equal(res.reason, 'Diliburkan karena Hari Guru Nasional');
  });

  await t.test('automatically handles title containing libur without duplicate prefix when attendanceRemark is dash', () => {
    const res = getHolidayInfoForDate(calendar, categories, '2026-12-22', 'XII RPL 1');
    assert.ok(res !== null);
    assert.equal(res.isHoliday, true);
    assert.equal(res.reason, 'Libur Semester Ganjil');
  });

  await t.test('returns null for non-holiday date', () => {
    const res = getHolidayInfoForDate(calendar, categories, '2026-11-10', 'XI TKJ 1');
    assert.equal(res, null);
  });
});
