const fs = require('fs');
const dumpPath = 'C:/Users/DELL/.gemini/antigravity/brain/944f8554-cd76-4199-91b5-cde4212b64a8/.user_uploaded/media_1794388051328_0dc90151.sql';
const sql = fs.readFileSync(dumpPath, 'utf8');

const regex = /INSERT INTO [`"']?products[`"']?\s*\(([^)]+)\)\s*VALUES\s*([\s\S]*?);/gi;
const matches = [...sql.matchAll(regex)];

console.log('=== SEARCHING PRODUCTS FOR SUPPLIER 36 OR SVRO-00139 OR MOUSE ===');
for (const m of matches) {
  const valuesBlock = m[2];
  // split rows
  const rows = valuesBlock.split(/\),\s*\(/);
  console.log(`Total products in block: ${rows.length}`);
  for (const row of rows) {
    if (row.includes('139') || row.includes('36') || row.toLowerCase().includes('mouse') || row.toLowerCase().includes('sakina')) {
      console.log('MATCH:', row.slice(0, 300));
    }
  }
}

