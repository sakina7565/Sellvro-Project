const fs = require('fs');
const dumpPath = 'C:/Users/DELL/.gemini/antigravity/brain/944f8554-cd76-4199-91b5-cde4212b64a8/.user_uploaded/media_1794388051328_0dc90151.sql';
const sql = fs.readFileSync(dumpPath, 'utf8');

const regex = /INSERT INTO [`"']?inventory_logs[`"']?\s*\(([^)]+)\)\s*VALUES\s*([\s\S]*?);/gi;
const matches = [...sql.matchAll(regex)];

for (const m of matches) {
  console.log('Inventory logs columns:', m[1]);
  const rows = m[2].split(/\),\s*\(/);
  console.log(`Total logs: ${rows.length}`);
  for (const r of rows) {
    if (r.includes('139') || r.includes('SVRO-00139') || r.includes('Mouse')) {
      console.log('Log for 139:', r);
    }
  }
}

