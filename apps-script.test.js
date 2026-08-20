const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const vm = require('vm');

const code = fs.readFileSync('./apps-script.gs', 'utf8');

test('iso_ function testing', async (t) => {
  // Create mock objects for Google Apps Script environment
  global.Utilities = {
    formatDate: (date, timeZone, format) => {
      // Simple mock of formatDate just for 'yyyy-MM-dd'
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    }
  };
  global.Session = {
    getScriptTimeZone: () => 'GMT'
  };

  // Compile and run the GS file in the current context
  vm.runInThisContext(code);

  await t.test('formats Date object to yyyy-MM-dd', () => {
    const d = new Date(2023, 9, 25); // Oct 25, 2023
    assert.strictEqual(iso_(d), '2023-10-25');
  });

  await t.test('trims regular strings', () => {
    assert.strictEqual(iso_('  hello  '), 'hello');
    assert.strictEqual(iso_(' 2023-01-01 '), '2023-01-01');
  });

  await t.test('handles null, undefined, and empty string', () => {
    assert.strictEqual(iso_(null), '');
    assert.strictEqual(iso_(undefined), '');
    assert.strictEqual(iso_(''), '');
  });

  await t.test('handles other falsy or truthy non-Date values', () => {
    assert.strictEqual(iso_(0), ''); // 0 || '' is ''
    assert.strictEqual(iso_(false), ''); // false || '' is ''
    assert.strictEqual(iso_(123), '123'); // 123 || '' is 123, String(123) is '123'
    assert.strictEqual(iso_(true), 'true'); // true || '' is true, String(true) is 'true'
  });
});
