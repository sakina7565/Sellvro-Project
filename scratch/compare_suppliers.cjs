const fs = require('fs');
const dumpPath = 'C:/Users/DELL/.gemini/antigravity/brain/944f8554-cd76-4199-91b5-cde4212b64a8/.user_uploaded/media_1794388051328_0dc90151.sql';
const sql = fs.readFileSync(dumpPath, 'utf8');

// Get all products for suppliers 34, 35, 36
const regex = /\((\d+),\s*(\d+),\s*(\d+|NULL),\s*'([^']+)',\s*'([^']+)',\s*'(\[[^\]]*\]|[^']*)',\s*(NULL|'[^']*'),\s*(NULL|'[^']*'),\s*([0-9.]+),\s*'([^']*)',\s*([0-9.]+|NULL),\s*([0-9.]+|NULL),\s*([0-9.]+|NULL),\s*'([^']*)',\s*(NULL|'[^']*'),\s*(\d+),\s*'([^']+)',\s*'([^']+)',\s*(NULL|'[^']*'),\s*(NULL|'[^']*'),\s*'([^']+)',\s*'([^']+)'\)/g;

let m;
while ((m = regex.exec(sql)) !== null) {
  const [
    _, id, supplier_id, category_id, name, sku, image, description, video,
    weight, weight_unit, length, width, height, dimension_unit, brand,
    in_warehouse, status, fullfill_by, approved_at, rejected_at, created_at, updated_at
  ] = m;
  if (['35', '36'].includes(supplier_id)) {
    console.log(`\n--- Product ${id} (${name}) ---`);
    console.log({ id, supplier_id, category_id, sku, brand, in_warehouse, status, fullfill_by, approved_at });
  }
}

