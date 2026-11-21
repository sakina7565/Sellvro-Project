const fs = require('fs');
const dumpPath = 'C:/Users/DELL/.gemini/antigravity/brain/944f8554-cd76-4199-91b5-cde4212b64a8/.user_uploaded/media_1794388051328_0dc90151.sql';
const sql = fs.readFileSync(dumpPath, 'utf8');

// Find batch 80 and 81
for (const bId of [80, 81]) {
  const idx = sql.indexOf(`(${bId}, `);
  if (idx !== -1) {
    console.log(`BATCH ${bId}:`, sql.slice(idx, sql.indexOf(')', idx) + 1));
  }
}

// Find master_batch 41 and 42
for (const mbId of [41, 42]) {
  const idx = sql.indexOf(`(${mbId}, `);
  if (idx !== -1) {
    console.log(`MASTER BATCH ${mbId}:`, sql.slice(idx, sql.indexOf(')', idx) + 1));
  }
}

