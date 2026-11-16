const fs = require('fs');
const dumpPath = 'C:/Users/DELL/.gemini/antigravity/brain/944f8554-cd76-4199-91b5-cde4212b64a8/.user_uploaded/media_1794388051328_0dc90151.sql';
const sql = fs.readFileSync(dumpPath, 'utf8');

// Get all product_ids from inventories
const invRegex = /INSERT INTO [`"']?inventories[`"']?\s*\(([^)]+)\)\s*VALUES\s*([\s\S]*?);/gi;
const invMatches = [...sql.matchAll(invRegex)];
const invProductIds = [];
for (const m of invMatches) {
  const rows = m[2].split(/\),\s*\(/);
  for (const r of rows) {
    const parts = r.replace(/^\(/, '').replace(/\)$/, '').split(/,\s*/);
    invProductIds.push({ invId: parts[0], clientId: parts[1], productId: parts[2], sku: parts[4], title: parts[5] });
  }
}

// Get all product_ids from shipment_items
const itemRegex = /INSERT INTO [`"']?shipment_items[`"']?\s*\(([^)]+)\)\s*VALUES\s*([\s\S]*?);/gi;
const itemMatches = [...sql.matchAll(itemRegex)];
const shipmentProductIds = new Set();
for (const m of itemMatches) {
  const rows = m[2].split(/\),\s*\(/);
  for (const r of rows) {
    const parts = r.replace(/^\(/, '').replace(/\)$/, '').split(/,\s*/);
    shipmentProductIds.add(parts[2]);
  }
}

const withoutShipment = invProductIds.filter(p => !shipmentProductIds.has(p.productId));
console.log(`Total inventory records: ${invProductIds.length}`);
console.log(`Inventory records WITHOUT shipment: ${withoutShipment.length}`);
withoutShipment.forEach(p => console.log('Without shipment:', p));

