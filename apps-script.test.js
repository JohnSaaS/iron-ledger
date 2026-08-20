const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const vm = require('vm');

const code = fs.readFileSync('./apps-script.gs', 'utf8');

test('doGet() tests', async (t) => {
  // Helper to run code in a sandbox with provided mocks
  const runTest = (mocks) => {
    // Provide host's Date to the sandbox so instanceof Date works for host Date objects
    const sandbox = { ...mocks, Date };
    vm.createContext(sandbox);
    vm.runInContext(code, sandbox);
    return sandbox;
  };

  await t.test('Happy path: parses sheet data correctly', () => {
    // 1. Arrange: setup mock data
    const mockData = [
      ['Date', 'Exercise', 'Weight', 'Sets', 'Updated'], // Header (index 0)
      [new Date('2023-01-01T12:00:00Z'), 'Bench Press', 135, '1,1,1', new Date()],
      ['2023-01-02', 'Squat', 225, '1,0,1', new Date()],
      ['2023-01-02', '  Deadlift  ', null, '', new Date()], // test trimming, null weight, empty sets
      ['', 'Missing Date', 100, '1', new Date()], // should be skipped
      ['2023-01-03', '', 100, '1', new Date()] // should be skipped
    ];

    const mockSheet = {
      getDataRange: () => ({
        getValues: () => mockData
      })
    };

    const mocks = {
      SpreadsheetApp: {
        getActiveSpreadsheet: () => ({
          getSheetByName: () => mockSheet
        })
      },
      ContentService: {
        createTextOutput: (str) => ({
          setMimeType: (mime) => ({ content: str, mimeType: mime })
        }),
        MimeType: { JSON: 'application/json' }
      },
      Session: {
        getScriptTimeZone: () => 'UTC'
      },
      Utilities: {
        formatDate: (date, tz, format) => {
          return date.toISOString().split('T')[0];
        }
      }
    };

    // 2. Act
    const sandbox = runTest(mocks);
    const result = sandbox.doGet();

    // 3. Assert
    assert.strictEqual(result.mimeType, 'application/json');
    const response = JSON.parse(result.content);
    assert.strictEqual(response.ok, true);

    const log = response.log;
    assert.deepStrictEqual(log['2023-01-01']['Bench Press'], {
      w: '135',
      s: [1, 1, 1]
    });

    assert.deepStrictEqual(log['2023-01-02']['Squat'], {
      w: '225',
      s: [1, 0, 1]
    });

    assert.deepStrictEqual(log['2023-01-02']['Deadlift'], {
      w: '',
      s: []
    });

    assert.strictEqual(log[''], undefined);
    assert.strictEqual(log['2023-01-03'], undefined);
  });

  await t.test('Edge case: empty sheet (only headers)', () => {
    const mockData = [
      ['Date', 'Exercise', 'Weight', 'Sets', 'Updated']
    ];

    const mocks = {
      SpreadsheetApp: {
        getActiveSpreadsheet: () => ({
          getSheetByName: () => ({
            getDataRange: () => ({ getValues: () => mockData })
          })
        })
      },
      ContentService: {
        createTextOutput: (str) => ({
          setMimeType: (mime) => ({ content: str, mimeType: mime })
        }),
        MimeType: { JSON: 'application/json' }
      }
    };

    const sandbox = runTest(mocks);
    const result = sandbox.doGet();

    const response = JSON.parse(result.content);
    assert.strictEqual(response.ok, true);
    assert.deepStrictEqual(response.log, {});
  });

  await t.test('Error condition: returns error object', () => {
    const mocks = {
      SpreadsheetApp: {
        getActiveSpreadsheet: () => {
          throw new Error('Sheet not found');
        }
      },
      ContentService: {
        createTextOutput: (str) => ({
          setMimeType: (mime) => ({ content: str, mimeType: mime })
        }),
        MimeType: { JSON: 'application/json' }
      }
    };

    const sandbox = runTest(mocks);
    const result = sandbox.doGet();

    const response = JSON.parse(result.content);
    assert.strictEqual(response.ok, false);
    assert.strictEqual(response.error, 'Error: Sheet not found');
  });
});