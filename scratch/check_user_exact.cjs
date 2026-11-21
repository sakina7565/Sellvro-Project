const fs = require('fs');
const dumpPath = 'C:/Users/DELL/.gemini/antigravity/brain/944f8554-cd76-4199-91b5-cde4212b64a8/.user_uploaded/media_1794388051328_0dc90151.sql';
const sql = fs.readFileSync(dumpPath, 'utf8');

// Find user 36 exact insert
const idx = sql.indexOf('(36, ');
if (idx !== -1) {
  const end = sql.indexOf(')', idx);
  console.log('USER 36:', sql.slice(idx, end + 1));
}

// Find user 8, user 5 for comparison
for (const id of [1, 5, 8, 35, 36]) {
  const i = sql.indexOf(`(${id}, `);
  if (i !== -1) {
    const e = sql.indexOf(')', i);
    console.log(`USER ${id}:`, sql.slice(i, e + 1));
  }
}

