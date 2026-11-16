const fs = require('fs');

const dumpPath = 'C:/Users/DELL/.gemini/antigravity/brain/944f8554-cd76-4199-91b5-cde4212b64a8/.user_uploaded/media_1794388051328_0dc90151.sql';
const sql = fs.readFileSync(dumpPath, 'utf8');

function extractInserts(tableName) {
  const regex = new RegExp(`INSERT INTO [\`"']?${tableName}[\`"']?\\s*\\(([^)]+)\\)\\s*VALUES\\s*([\\s\\S]*?);`, 'gi');
  const matches = [...sql.matchAll(regex)];
  return matches.map(m => ({ columns: m[1], values: m[2] }));
}

console.log('=== USERS IN WMS ===');
const usersInserts = extractInserts('users');
for (const ins of usersInserts) {
  console.log('Columns:', ins.columns);
  console.log('Values:', ins.values.slice(0, 1000));
}

console.log('\n=== PRODUCTS IN WMS ===');
const prodInserts = extractInserts('products');
for (const ins of prodInserts) {
  console.log('Columns:', ins.columns);
  console.log('Values:', ins.values.slice(0, 2000));
}

console.log('\n=== INVENTORIES IN WMS ===');
const invInserts = extractInserts('inventories');
for (const ins of invInserts) {
  console.log('Columns:', ins.columns);
  console.log('Values:', ins.values.slice(0, 2000));
}

console.log('\n=== FULFILLMENT_REQUESTS IN WMS ===');
const frInserts = extractInserts('fulfillment_requests');
for (const ins of frInserts) {
  console.log('Columns:', ins.columns);
  console.log('Values:', ins.values.slice(0, 2000));
}

