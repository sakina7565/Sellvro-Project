const fs = require('fs');
const dumpPath = 'C:/Users/DELL/.gemini/antigravity/brain/944f8554-cd76-4199-91b5-cde4212b64a8/.user_uploaded/media_1794388051328_0dc90151.sql';
const sql = fs.readFileSync(dumpPath, 'utf8');

// Find row 148 and 149
const idx148 = sql.indexOf("(148, '4-CBF-WMS-PAK1035-041126'");
if (idx148 !== -1) {
  const end148 = sql.indexOf(');', idx148);
  console.log('Row 148 & 149:\n', sql.slice(idx148, end148 + 2));
}

// Also find the table name for row 148
const tableStart = sql.lastIndexOf('INSERT INTO', idx148);
console.log('Table statement:', sql.slice(tableStart, sql.indexOf('VALUES', tableStart)));

