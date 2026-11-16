const fs = require('fs');
const dumpPath = 'C:/Users/DELL/.gemini/antigravity/brain/944f8554-cd76-4199-91b5-cde4212b64a8/.user_uploaded/media_1794388051328_0dc90151.sql';
const sql = fs.readFileSync(dumpPath, 'utf8');

const itemRegex = /INSERT INTO [`"']?shipment_items[`"']?\s*\(([^)]+)\)\s*VALUES\s*([\s\S]*?);/gi;
const itemMatches = [...sql.matchAll(itemRegex)];
for (const m of itemMatches) {
  const rows = m[2].split(/\),\s*\(/);
  for (const r of rows) {
    // product_id is the 3rd column: id, shipment_id, product_id...
    const parts = r.replace(/^\(/, '').replace(/\)$/, '').split(/,\s*/);
    if (parts[2] === '139') {
      console.log('Shipment Item for Product 139:', r);
    }
  }
}

