import test from 'node:test';
import assert from 'node:assert';
import { parseSlotTime } from './routes/push.mjs';

test('parseSlotTime parses HH.MM - HH.MM format correctly', () => {
  const result = parseSlotTime('07.00 - 08.30');
  assert.ok(result);
  assert.strictEqual(result.startStr, '07:00');
  assert.strictEqual(result.endStr, '08:30');
  assert.strictEqual(result.startMinutes, 420);
  assert.strictEqual(result.endMinutes, 510);
});

test('parseSlotTime parses HH:MM - HH:MM format correctly', () => {
  const result = parseSlotTime('09:40 - 10:20');
  assert.ok(result);
  assert.strictEqual(result.startStr, '09:40');
  assert.strictEqual(result.endStr, '10:20');
  assert.strictEqual(result.startMinutes, 9 * 60 + 40);
  assert.strictEqual(result.endMinutes, 10 * 60 + 20);
});

test('parseSlotTime handles invalid or missing labels gracefully', () => {
  assert.strictEqual(parseSlotTime(null), null);
  assert.strictEqual(parseSlotTime(''), null);
  assert.strictEqual(parseSlotTime('istirahat'), null);
  assert.strictEqual(parseSlotTime('invalid - time'), null);
});
