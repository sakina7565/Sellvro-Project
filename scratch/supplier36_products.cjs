const fs = require('fs');
const dumpPath = 'C:/Users/DELL/.gemini/antigravity/brain/944f8554-cd76-4199-91b5-cde4212b64a8/.user_uploaded/media_1794388051328_0dc90151.sql';
const sql = fs.readFileSync(dumpPath, 'utf8');

// Check products of supplier 36
const regex = /INSERT INTO [`"']?products[`"']?\s*\(([^)]+)\)\s*VALUES\s*([\s\S]*?);/gi;
const matches = [...sql.matchAll(regex)];

console.log('=== ALL PRODUCTS OF SUPPLIER 36 ===');
for (const m of matches) {
  const rows = m[2].split(/\),\s*\(/);
  for (const row of rows) {
    // Check if supplier_id is 36
    const clean = row.replace(/^\(/, '').replace(/\)$/, '');
    const parts = clean.split(/,\s*/);
    if (parts[1] === '36') {
      console.log(`Product ID: ${parts[0]}, SKU: ${parts[4]}, Name: ${parts[3]}, in_wh: ${parts[15]}, status: ${parts[16]}, fullfill_by: ${parts[17]}, approved_at: ${parts[18]}`);
    }
  }
}

