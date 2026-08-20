/**
 * Iron Ledger - Sheet backend
 * Paste into your tracker: Extensions > Apps Script, replace everything, Save.
 * Then Deploy > New deployment > Web app
 *   Execute as: Me
 *   Who has access: Anyone
 * Copy the /exec URL it gives you and paste it into the app once.
 */

var SHEET_NAME = 'APP LOG';

function sheet_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName(SHEET_NAME);
  if (!sh) {
    sh = ss.insertSheet(SHEET_NAME);
    sh.appendRow(['Date', 'Exercise', 'Weight', 'Sets', 'Updated']);
    sh.getRange('A:A').setNumberFormat('@');   // keep dates as plain text
    sh.setFrozenRows(1);
  }
  return sh;
}

function iso_(v) {
  if (v instanceof Date) {
    return Utilities.formatDate(v, Session.getScriptTimeZone(), 'yyyy-MM-dd');
  }
  return String(v || '').trim();
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

function doGet() {
  try {
    var vals = sheet_().getDataRange().getValues();
    var log = {};
    for (var i = 1; i < vals.length; i++) {
      var d = iso_(vals[i][0]);
      var ex = String(vals[i][1] || '').trim();
      if (!d || !ex) continue;
      if (!log[d]) log[d] = {};
      var setsRaw = String(vals[i][3] || '').trim();
      log[d][ex] = {
        w: String(vals[i][2] == null ? '' : vals[i][2]).trim(),
        s: setsRaw ? setsRaw.split(',').map(function (x) { return Number(x) ? 1 : 0; }) : []
      };
    }
    return json_({ ok: true, log: log });
  } catch (err) {
    return json_({ ok: false, error: String(err) });
  }
}

function doPost(e) {
  try {
    var body = JSON.parse(e.postData.contents);
    var sh = sheet_();
    var vals = sh.getDataRange().getValues();
    var date = String(body.date || '').trim();
    var ex = String(body.exercise || '').trim();
    if (!date || !ex) return json_({ ok: false, error: 'missing date or exercise' });

    var row = -1;
    for (var i = 1; i < vals.length; i++) {
      if (iso_(vals[i][0]) === date && String(vals[i][1] || '').trim() === ex) { row = i + 1; break; }
    }
    var rec = [date, ex, String(body.weight || ''), (body.sets || []).join(','), new Date()];
    if (row > 0) sh.getRange(row, 1, 1, 5).setValues([rec]);
    else sh.appendRow(rec);
    return json_({ ok: true });
  } catch (err) {
    return json_({ ok: false, error: String(err) });
  }
}

// --- TESTS ---
function test_doPost() {
  var testsPassed = 0;
  var testsFailed = 0;

  function assert(condition, message) {
    if (condition) {
      testsPassed++;
      // console.log('PASS: ' + message);
    } else {
      testsFailed++;
      console.error('FAIL: ' + message);
    }
  }

  // Mock setup for the internal sheet_() function
  var mockSheet = {
    _data: [
      ['Date', 'Exercise', 'Weight', 'Sets', 'Updated'],
      ['2023-10-25', 'Squat', '100', '1,1', new Date('2023-10-25T10:00:00Z')]
    ],
    _appended: [],
    _setValues: [],

    getDataRange: function() {
      return {
        getValues: function() { return mockSheet._data; }
      };
    },
    getRange: function(row, col, numRows, numCols) {
      return {
        setValues: function(vals) {
          mockSheet._setValues.push({row: row, vals: vals});
          mockSheet._data[row - 1] = vals[0]; // Update data array (1-indexed row)
        },
        setNumberFormat: function() {}
      };
    },
    appendRow: function(row) {
      mockSheet._appended.push(row);
      mockSheet._data.push(row);
    },
    setFrozenRows: function() {}
  };

  // Helper to create a mock event object
  function createMockEvent(payload) {
    return {
      postData: {
        contents: JSON.stringify(payload)
      }
    };
  }

  // Save references to original internal functions
  var original_sheet_ = sheet_;
  var original_json_ = json_;

  try {
    // Override internal functions for testing
    sheet_ = function() {
      return mockSheet;
    };
    json_ = function(obj) {
      return obj; // Return the raw object directly for easier assertions
    };

    // Test 1: Missing date
    var out1 = doPost(createMockEvent({ exercise: 'Squat', weight: '100', sets: [1] }));
    assert(out1.ok === false && out1.error === 'missing date or exercise', 'Test 1: Missing date should fail');

    // Test 2: Missing exercise
    var out2 = doPost(createMockEvent({ date: '2023-10-26', weight: '100', sets: [1] }));
    assert(out2.ok === false && out2.error === 'missing date or exercise', 'Test 2: Missing exercise should fail');

    // Test 3: Add new record
    var initialAppended = mockSheet._appended.length;
    var out3 = doPost(createMockEvent({ date: '2023-10-26', exercise: 'Deadlift', weight: '150', sets: [1, 1, 0] }));
    assert(out3.ok === true, 'Test 3: Adding new record should succeed');
    assert(mockSheet._appended.length === initialAppended + 1, 'Test 3: Should call appendRow');
    var newRow = mockSheet._appended[mockSheet._appended.length - 1];
    assert(newRow[0] === '2023-10-26' && newRow[1] === 'Deadlift' && newRow[2] === '150' && newRow[3] === '1,1,0', 'Test 3: Appended data is correct');

    // Test 4: Update existing record
    var initialSetValues = mockSheet._setValues.length;
    var out4 = doPost(createMockEvent({ date: '2023-10-25', exercise: 'Squat', weight: '110', sets: [1, 1, 1] }));
    assert(out4.ok === true, 'Test 4: Updating existing record should succeed');
    assert(mockSheet._setValues.length === initialSetValues + 1, 'Test 4: Should call setValues');
    var updatedData = mockSheet._setValues[mockSheet._setValues.length - 1];
    assert(updatedData.row === 2, 'Test 4: Should update row 2');
    assert(updatedData.vals[0][0] === '2023-10-25' && updatedData.vals[0][1] === 'Squat' && updatedData.vals[0][2] === '110' && updatedData.vals[0][3] === '1,1,1', 'Test 4: Updated data is correct');

    // Test 5: Invalid JSON payload
    var out5 = doPost({ postData: { contents: '{ invalid json' } });
    assert(out5.ok === false && out5.error.indexOf('SyntaxError') !== -1, 'Test 5: Should catch JSON parse error');

  } finally {
    // Restore original internal functions
    sheet_ = original_sheet_;
    json_ = original_json_;
  }

  if (testsFailed > 0) {
    throw new Error(testsFailed + ' tests failed out of ' + (testsPassed + testsFailed));
  } else {
    console.log('All ' + testsPassed + ' doPost() tests passed.');
  }
}
