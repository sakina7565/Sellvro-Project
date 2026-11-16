const fs = require('fs');
const dumpPath = 'C:/Users/DELL/.gemini/antigravity/brain/944f8554-cd76-4199-91b5-cde4212b64a8/.user_uploaded/media_1794388051328_0dc90151.sql';
const sql = fs.readFileSync(dumpPath, 'utf8');

const idx = sql.indexOf('product-by-sku');
if (idx !== -1) {
  console.log(sql.slice(Math.max(0, idx - 200), idx + 300));
}

