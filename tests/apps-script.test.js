const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const vm = require('vm');

const code = fs.readFileSync('./apps-script.gs', 'utf8');

test('sheet_() tests', async (t) => {
  await t.test('returns existing sheet if it exists', () => {
    const mockSheet = {};
    const mockSpreadsheet = {
      getSheetByName: (name) => {
        assert.strictEqual(name, 'APP LOG');
        return mockSheet;
      }
    };
    const mockSpreadsheetApp = {
      getActiveSpreadsheet: () => mockSpreadsheet
    };

    const sandbox = {
      SpreadsheetApp: mockSpreadsheetApp,
    };
    vm.createContext(sandbox);
    vm.runInContext(code, sandbox);

    const result = sandbox.sheet_();
    assert.strictEqual(result, mockSheet);
  });

  await t.test('creates and initializes sheet if it does not exist', () => {
    let rangeFormatSet = false;
    let rowAppended = false;
    let frozenRowsSet = false;

    const mockRange = {
      setNumberFormat: (format) => {
        assert.strictEqual(format, '@');
        rangeFormatSet = true;
      }
    };

    const mockSheet = {
      appendRow: (row) => {
        assert.deepEqual(row, ['Date', 'Exercise', 'Weight', 'Sets', 'Updated']);
        rowAppended = true;
      },
      getRange: (range) => {
        assert.strictEqual(range, 'A:A');
        return mockRange;
      },
      setFrozenRows: (rows) => {
        assert.strictEqual(rows, 1);
        frozenRowsSet = true;
      }
    };

    const mockSpreadsheet = {
      getSheetByName: (name) => {
        assert.strictEqual(name, 'APP LOG');
        return null;
      },
      insertSheet: (name) => {
        assert.strictEqual(name, 'APP LOG');
        return mockSheet;
      }
    };

    const mockSpreadsheetApp = {
      getActiveSpreadsheet: () => mockSpreadsheet
    };

    const sandbox = {
      SpreadsheetApp: mockSpreadsheetApp,
    };
    vm.createContext(sandbox);
    vm.runInContext(code, sandbox);

    const result = sandbox.sheet_();

    assert.strictEqual(result, mockSheet);
    assert.ok(rowAppended, 'Row should be appended');
    assert.ok(rangeFormatSet, 'Number format should be set');
    assert.ok(frozenRowsSet, 'Frozen rows should be set');
  });
});
