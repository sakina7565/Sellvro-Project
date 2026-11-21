const fs = require('fs');
const dumpPath = 'C:/Users/DELL/.gemini/antigravity/brain/944f8554-cd76-4199-91b5-cde4212b64a8/.user_uploaded/media_1794388051328_0dc90151.sql';
const sql = fs.readFileSync(dumpPath, 'utf8');

const regex = /INSERT INTO [`"']?products[`"']?\s*\(([^)]+)\)\s*VALUES\s*([\s\S]*?);/gi;
const matches = [...sql.matchAll(regex)];

const fulfillByCounts = {};
for (const m of matches) {
  const rows = m[2].split(/\),\s*\(/);
  for (const r of rows) {
    const clean = r.replace(/^\(/, '').replace(/\)$/, '');
    const mFulfill = clean.match(/'(wms|client)'/);
    if (mFulfill) {
      fulfillByCounts[mFulfill[1]] = (fulfillByCounts[mFulfill[1]] || 0) + 1;
    }
  }
}
console.log('fulfill_by counts:', fulfillByCounts);

