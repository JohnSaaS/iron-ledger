const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');

// Load the apps script code
const code = fs.readFileSync('apps-script.gs', 'utf8');

// We need to run it in a context or use eval.
// Let's use new Function or eval in the global scope.
eval(code);

// Mocking Google Apps Script globals
global.ContentService = {
  createTextOutput: function(text) {
    return {
      setMimeType: function(mimeType) {
        return { text: text, mimeType: mimeType };
      }
    };
  },
  MimeType: { JSON: 'JSON' }
};

global.SpreadsheetApp = {
  getActiveSpreadsheet: function() {
    return {
      getSheetByName: function(name) {
        return {
          getDataRange: function() {
            return {
              getValues: function() {
                return [['Date', 'Exercise', 'Weight', 'Sets', 'Updated']];
              }
            };
          }
        };
      }
    };
  }
};

global.Session = {
  getScriptTimeZone: function() {
    return 'UTC';
  }
};

global.Utilities = {
  formatDate: function(date, tz, format) {
    return date.toISOString().split('T')[0];
  }
};

test('doPost handles empty body', () => {
  const e = { postData: { contents: '{}' } };
  const result = doPost(e);
  const parsedResult = JSON.parse(result.text);
  assert.strictEqual(parsedResult.ok, false);
  assert.strictEqual(parsedResult.error, 'missing date or exercise');
});

test('doPost handles missing exercise', () => {
  const e = { postData: { contents: JSON.stringify({ date: '2023-01-01' }) } };
  const result = doPost(e);
  const parsedResult = JSON.parse(result.text);
  assert.strictEqual(parsedResult.ok, false);
  assert.strictEqual(parsedResult.error, 'missing date or exercise');
});

test('doPost handles missing date', () => {
  const e = { postData: { contents: JSON.stringify({ exercise: 'Squat' }) } };
  const result = doPost(e);
  const parsedResult = JSON.parse(result.text);
  assert.strictEqual(parsedResult.ok, false);
  assert.strictEqual(parsedResult.error, 'missing date or exercise');
});

test('doPost handles malformed JSON', () => {
  const e = { postData: { contents: '{bad json}' } };
  const result = doPost(e);
  const parsedResult = JSON.parse(result.text);
  assert.strictEqual(parsedResult.ok, false);
  assert.ok(parsedResult.error.includes('SyntaxError'));
});

test('doPost handles happy path new entry', () => {
  // Mock appendRow
  let appendedRow = null;
  global.SpreadsheetApp.getActiveSpreadsheet = function() {
    return {
      getSheetByName: function(name) {
        return {
          getDataRange: function() {
            return {
              getValues: function() {
                return [['Date', 'Exercise', 'Weight', 'Sets', 'Updated']];
              }
            };
          },
          appendRow: function(row) {
            appendedRow = row;
          }
        };
      }
    };
  };

  const e = { postData: { contents: JSON.stringify({ date: '2023-01-01', exercise: 'Squat', weight: '100', sets: [1, 1, 1] }) } };
  const result = doPost(e);
  const parsedResult = JSON.parse(result.text);

  assert.strictEqual(parsedResult.ok, true);
  assert.ok(appendedRow);
  assert.strictEqual(appendedRow[0], '2023-01-01');
  assert.strictEqual(appendedRow[1], 'Squat');
  assert.strictEqual(appendedRow[2], '100');
  assert.strictEqual(appendedRow[3], '1,1,1');
  assert.ok(appendedRow[4] instanceof Date);
});

test('doPost handles happy path update entry', () => {
  // Mock setValues
  let updatedValues = null;
  let updatedRange = null;
  global.SpreadsheetApp.getActiveSpreadsheet = function() {
    return {
      getSheetByName: function(name) {
        return {
          getDataRange: function() {
            return {
              getValues: function() {
                return [
                  ['Date', 'Exercise', 'Weight', 'Sets', 'Updated'],
                  ['2023-01-01', 'Squat', '100', '1,1', new Date()]
                ];
              }
            };
          },
          getRange: function(row, col, numRows, numCols) {
            updatedRange = { row, col, numRows, numCols };
            return {
              setValues: function(values) {
                updatedValues = values;
              }
            };
          }
        };
      }
    };
  };

  const e = { postData: { contents: JSON.stringify({ date: '2023-01-01', exercise: 'Squat', weight: '100', sets: [1, 1, 1] }) } };
  const result = doPost(e);
  const parsedResult = JSON.parse(result.text);

  assert.strictEqual(parsedResult.ok, true);

  // Verify it updated the correct row (row 2 because it's 1-indexed and header is row 1)
  assert.deepStrictEqual(updatedRange, { row: 2, col: 1, numRows: 1, numCols: 5 });

  assert.ok(updatedValues);
  assert.strictEqual(updatedValues[0][0], '2023-01-01');
  assert.strictEqual(updatedValues[0][1], 'Squat');
  assert.strictEqual(updatedValues[0][2], '100');
  assert.strictEqual(updatedValues[0][3], '1,1,1');
  assert.ok(updatedValues[0][4] instanceof Date);
});
