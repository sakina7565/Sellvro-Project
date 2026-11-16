const fs = require('fs');
const dumpPath = 'C:/Users/DELL/.gemini/antigravity/brain/944f8554-cd76-4199-91b5-cde4212b64a8/.user_uploaded/media_1794388051328_0dc90151.sql';
const sql = fs.readFileSync(dumpPath, 'utf8');

const terms = ['ORD-KE2KFG2JZL', 'ORD-XAUQLFU5U7', 'CBF-WMS-PAK1035', 'KE2KFG2JZL', 'XAUQLFU5U7', 'SLV-KE2KFG2JZL'];

for (const t of terms) {
  const idx = sql.indexOf(t);
  console.log(`Term "${t}": found at index ${idx}`);
  if (idx !== -1) {
    console.log('Snippet:', sql.slice(Math.max(0, idx - 100), idx + 200));
  }
}

