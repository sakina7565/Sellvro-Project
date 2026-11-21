const fs = require('fs');
const dumpPath = 'C:/Users/DELL/.gemini/antigravity/brain/944f8554-cd76-4199-91b5-cde4212b64a8/.user_uploaded/media_1794388051328_0dc90151.sql';
const sql = fs.readFileSync(dumpPath, 'utf8');

const uIdx = sql.indexOf('INSERT INTO `users`');
const uEnd = sql.indexOf(';\n', uIdx);
const usersSection = sql.slice(uIdx, uEnd + 1);

const rows = usersSection.split(/\),\s*\(/);
for (const r of rows) {
  if (r.includes('sakinamemon') || r.includes('WMS-PAK1035')) {
    console.log('Sakina Memon user row:');
    console.log(r);
  }
}

