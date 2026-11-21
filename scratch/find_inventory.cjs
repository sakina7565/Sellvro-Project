const fs = require('fs');
const dumpPath = 'C:/Users/DELL/.gemini/antigravity/brain/944f8554-cd76-4199-91b5-cde4212b64a8/.user_uploaded/media_1794388051328_0dc90151.sql';
const sql = fs.readFileSync(dumpPath, 'utf8');

const regex = /INSERT INTO [`"']?inventories[`"']?\s*\(([^)]+)\)\s*VALUES\s*([\s\S]*?);/gi;
const matches = [...sql.matchAll(regex)];

console.log('=== SEARCHING INVENTORIES FOR PRODUCT 139 OR SVRO-00139 OR CLIENT 36 ===');
for (const m of matches) {
  const valuesBlock = m[2];
  const rows = valuesBlock.split(/\),\s*\(/);
  console.log(`Total inventory records: ${rows.length}`);
  for (const row of rows) {
    if (row.includes('139') || row.includes('SVRO-00139') || row.includes(', 36,') || row.startsWith('36,') || row.startsWith('(36,')) {
      console.log('MATCH INVENTORY:', row);
    }
  }
}

