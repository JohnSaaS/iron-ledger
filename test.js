const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');

// Extract the logic from index.html
const html = fs.readFileSync('index.html', 'utf8');
const lines = html.split('\n');
const recLine = lines.find(l => l.includes('function rec('));

if (!recLine) throw new Error('Could not find rec() function in index.html');

test('rec() helper function', async (t) => {
  let LOG;
  let rec;

  t.beforeEach(() => {
    LOG = {};
    // Create a function string that uses our isolated LOG object
    const createRec = new Function('LOG', `
      return ${recLine.trim()};
    `);
    rec = createRec(LOG);
  });

  await t.test('creates new entry for new date and exercise', () => {
    const r = rec('2023-10-10', 'Squat');
    assert.deepStrictEqual(r, {w: '', s: []});
    assert.deepStrictEqual(LOG, {'2023-10-10': {'Squat': {w: '', s: []}}});
  });

  await t.test('returns exact reference for existing entry', () => {
    const r1 = rec('2023-10-11', 'Bench');
    const r2 = rec('2023-10-11', 'Bench');
    assert.strictEqual(r1, r2);
  });

  await t.test('adds new exercise to existing date without modifying others', () => {
    rec('2023-10-12', 'Deadlift');
    const r = rec('2023-10-12', 'Press');
    assert.deepStrictEqual(r, {w: '', s: []});
    assert.deepStrictEqual(Object.keys(LOG['2023-10-12']), ['Deadlift', 'Press']);
  });

  await t.test('mutating returned object modifies LOG', () => {
    const r = rec('2023-10-13', 'Row');
    r.w = '135';
    r.s = [1, 1, 0];
    assert.deepStrictEqual(LOG['2023-10-13']['Row'], {w: '135', s: [1, 1, 0]});
  });
});
