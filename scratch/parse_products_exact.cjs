const fs = require('fs');
const dumpPath = 'C:/Users/DELL/.gemini/antigravity/brain/944f8554-cd76-4199-91b5-cde4212b64a8/.user_uploaded/media_1794388051328_0dc90151.sql';
const sql = fs.readFileSync(dumpPath, 'utf8');

// Parse raw row 137, 139, 140
for (const id of [137, 139, 140]) {
  const idx = sql.indexOf(`(${id}, 36,`);
  if (idx !== -1) {
    const end = sql.indexOf(')', idx);
    console.log(`\n=== PRODUCT ${id} ===\n`, sql.slice(idx, end + 1));
  }
}

