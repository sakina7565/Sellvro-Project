const fs = require('fs');
const dumpPath = 'C:/Users/DELL/.gemini/antigravity/brain/944f8554-cd76-4199-91b5-cde4212b64a8/.user_uploaded/media_1794388051328_0dc90151.sql';
const sql = fs.readFileSync(dumpPath, 'utf8');

function getSchema(table) {
  const m = sql.match(new RegExp(`CREATE TABLE [\`"']?${table}[\`"']?\\s*\\(([\\s\\S]*?)\\)\\s*ENGINE`, 'i'));
  return m ? m[1].trim() : null;
}

console.log('=== BATCHES ===\n', getSchema('batches'));
console.log('\n=== MASTER BATCHES ===\n', getSchema('master_batches'));
console.log('\n=== FULFILLMENT REQUESTS ===\n', getSchema('fulfillment_requests'));

