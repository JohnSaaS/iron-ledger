const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const vm = require('vm');

const code = fs.readFileSync('apps-script.gs', 'utf8');

test('doGet catch block - error handling', (t) => {
  const context = {
    ContentService: {
      createTextOutput: (str) => ({
        setMimeType: (type) => ({ content: str, mimeType: type })
      }),
      MimeType: { JSON: 'application/json' }
    },
    // Override sheet_ function by injecting a throw directly,
    // but wait, sheet_ is defined in the code so we need to overwrite it after evaluation
    // Actually, if we just mock SpreadsheetApp to throw, it might be easier.
    SpreadsheetApp: {
      getActiveSpreadsheet: () => {
        throw new Error('SpreadsheetApp is not available');
      }
    }
  };
  vm.createContext(context);
  vm.runInContext(code, context);

  const result = context.doGet();
  const parsed = JSON.parse(result.content);
  assert.strictEqual(parsed.ok, false);
  assert.strictEqual(parsed.error, 'Error: SpreadsheetApp is not available');
});

test('doPost catch block - error handling', (t) => {
  const context = {
    ContentService: {
      createTextOutput: (str) => ({
        setMimeType: (type) => ({ content: str, mimeType: type })
      }),
      MimeType: { JSON: 'application/json' }
    }
  };
  vm.createContext(context);
  vm.runInContext(code, context);

  // Force JSON.parse to throw an error by passing invalid JSON
  const e = { postData: { contents: 'invalid json' } };
  const result = context.doPost(e);
  const parsed = JSON.parse(result.content);
  assert.strictEqual(parsed.ok, false);
  assert.match(parsed.error, /SyntaxError/);
});
