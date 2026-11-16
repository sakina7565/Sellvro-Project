const fs = require('fs');
const dumpPath = 'C:/Users/DELL/.gemini/antigravity/brain/944f8554-cd76-4199-91b5-cde4212b64a8/.user_uploaded/media_1794388051328_0dc90151.sql';
const sql = fs.readFileSync(dumpPath, 'utf8');

const regex = /INSERT INTO [`"']?fulfillment_requests[`"']?\s*\(([^)]+)\)\s*VALUES\s*([\s\S]*?);/gi;
const matches = [...sql.matchAll(regex)];

console.log('=== SEARCHING FULFILLMENT_REQUESTS FOR SKU SVRO-00139 OR CLIENT 36 ===');
for (const m of matches) {
  const valuesBlock = m[2];
  const rows = valuesBlock.split(/\),\s*\(/);
  console.log(`Total fulfillment_requests records: ${rows.length}`);
  for (const row of rows) {
    if (row.includes('SVRO-00139') || row.includes(', 36,') || row.includes('139') || row.includes('PAK1035')) {
      console.log('MATCH FR:', row);
    }
  }
}

