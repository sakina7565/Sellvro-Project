const fs = require('fs');
const dumpPath = 'C:/Users/DELL/.gemini/antigravity/brain/944f8554-cd76-4199-91b5-cde4212b64a8/.user_uploaded/media_1794388051328_0dc90151.sql';
const sql = fs.readFileSync(dumpPath, 'utf8');

const regex = /INSERT INTO [`"']?products[`"']?\s*\(([^)]+)\)\s*VALUES\s*([\s\S]*?);/gi;
const matches = [...sql.matchAll(regex)];

const stats = {};
for (const m of matches) {
  const rows = m[2].split(/\),\s*\(/);
  for (const row of rows) {
    const clean = row.replace(/^\(/, '').replace(/\)$/, '');
    // let's find status and approved_at
    // columns: id, supplier_id, category_id, name, sku, image, description, video, weight, weight_unit, length, width, height, dimension_unit, brand, in_warehouse, status, fullfill_by, approved_at, rejected_at, created_at, updated_at
    const statusMatch = clean.match(/'(pending|approved|rejected|draft|active|out_of_stock)'/);
    const status = statusMatch ? statusMatch[1] : 'unknown';
    stats[status] = (stats[status] || 0) + 1;
  }
}
console.log('Product status breakdown:', stats);

