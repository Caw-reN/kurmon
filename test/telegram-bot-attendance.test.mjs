import test from 'node:test';
import assert from 'node:assert/strict';
import { escapeHtml, formatMessageToHtml } from '../server/telegram-bot.mjs';

test('Telegram formatting and escaping functions properly', () => {
  assert.equal(escapeHtml('Hello <World> & "Friends"'), 'Hello &lt;World&gt; &amp; "Friends"');
  
  const formatted = formatMessageToHtml('Status: *Hadir* pada `07:15`');
  assert.match(formatted, /<b>Hadir<\/b>/);
  assert.match(formatted, /<code>07:15<\/code>/);
});

test('Class matching helper logic handles arabic to roman conversion', () => {
  function normalizeClassInput(str) {
    let s = String(str || '').trim().toUpperCase();
    s = s.replace(/^10(\s+|$)/, 'X $1')
         .replace(/^11(\s+|$)/, 'XI $1')
         .replace(/^12(\s+|$)/, 'XII $1')
         .replace(/\s+/g, ' ');
    return s.trim();
  }

  assert.equal(normalizeClassInput('10 tkj 1'), 'X TKJ 1');
  assert.equal(normalizeClassInput('11 rpl 2'), 'XI RPL 2');
  assert.equal(normalizeClassInput('12 ak'), 'XII AK');
  assert.equal(normalizeClassInput('x tkj 1'), 'X TKJ 1');
  assert.equal(normalizeClassInput('  xi   tkj  1 '), 'XI TKJ 1');
});
