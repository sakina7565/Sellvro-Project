const fs = require('fs');
const dumpPath = 'C:/Users/DELL/.gemini/antigravity/brain/944f8554-cd76-4199-91b5-cde4212b64a8/.user_uploaded/media_1794388051328_0dc90151.sql';
const sql = fs.readFileSync(dumpPath, 'utf8');

const regex = /INSERT INTO [`"']?shipments[`"']?\s*\(([^)]+)\)\s*VALUES\s*([\s\S]*?);/gi;
const matches = [...sql.matchAll(regex)];

console.log('=== SHIPMENTS IN WMS ===');
for (const m of matches) {
  console.log('Columns:', m[1]);
  const rows = m[2].split(/\),\s*\(/);
  for (const r of rows) {
    if (r.includes('36') || r.includes('139') || r.includes('SVRO-00139')) {
      console.log('MATCH 36 SHIPMENT:', r);
    }
  }
}

const itemRegex = /INSERT INTO [`"']?shipment_items[`"']?\s*\(([^)]+)\)\s*VALUES\s*([\s\S]*?);/gi;
const itemMatches = [...sql.matchAll(itemRegex)];
console.log('=== SHIPMENT ITEMS IN WMS ===');
for (const m of itemMatches) {
  console.log('Columns:', m[1]);
  const rows = m[2].split(/\),\s*\(/);
  for (const r of rows) {
    if (r.includes('139') || r.includes('SVRO-00139')) {
      console.log('MATCH 139 SHIPMENT ITEM:', r);
    }
  }
}

