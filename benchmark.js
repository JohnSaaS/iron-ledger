const Session = {
  getScriptTimeZone: () => {
    // Artificial delay to simulate Apps Script API call latency
    // Real Apps Script calls can take 10-100ms
    let start = Date.now();
    while (Date.now() - start < 1) {}
    return 'America/New_York';
  }
};
const Utilities = {
  formatDate: (d, tz, format) => '2023-01-01'
};

function iso_baseline(v) {
  if (v instanceof Date) {
    return Utilities.formatDate(v, Session.getScriptTimeZone(), 'yyyy-MM-dd');
  }
  return String(v || '').trim();
}

let _tz = null;
function iso_optimized(v) {
  if (v instanceof Date) {
    if (!_tz) _tz = Session.getScriptTimeZone();
    return Utilities.formatDate(v, _tz, 'yyyy-MM-dd');
  }
  return String(v || '').trim();
}

const dates = [];
for (let i = 0; i < 1000; i++) {
  dates.push(new Date());
}

console.log('Running baseline...');
let start = Date.now();
for (const d of dates) {
  iso_baseline(d);
}
console.log(`Baseline: ${Date.now() - start}ms`);

console.log('Running optimized...');
start = Date.now();
for (const d of dates) {
  iso_optimized(d);
}
console.log(`Optimized: ${Date.now() - start}ms`);
