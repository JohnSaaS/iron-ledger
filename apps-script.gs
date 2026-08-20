/**
 * Iron Ledger - Sheet backend
 * Paste into your tracker: Extensions > Apps Script, replace everything, Save.
 * Then Deploy > New deployment > Web app
 *   Execute as: Me
 *   Who has access: Anyone
 * Copy the /exec URL it gives you and paste it into the app once.
 */

var SHEET_NAME = 'APP LOG';
// 1. Change this to a random secret (e.g. "my-super-secret-123")
// 2. You will need to enter this in the app along with your URL.
var SECRET_TOKEN = 'CHANGE_ME';

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

function doGet(e) {
  try {
    if (SECRET_TOKEN === 'CHANGE_ME') return json_({ ok: false, error: 'SECRET_TOKEN not configured in Apps Script' });
    if (!e || !e.parameter || e.parameter.token !== SECRET_TOKEN) return json_({ ok: false, error: 'invalid token' });

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
    if (SECRET_TOKEN === 'CHANGE_ME') return json_({ ok: false, error: 'SECRET_TOKEN not configured in Apps Script' });

    var body = JSON.parse(e.postData.contents);
    if (body.token !== SECRET_TOKEN) return json_({ ok: false, error: 'invalid token' });

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
