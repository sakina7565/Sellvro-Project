const fs = require('fs');
const dumpPath = 'C:/Users/DELL/.gemini/antigravity/brain/944f8554-cd76-4199-91b5-cde4212b64a8/.user_uploaded/media_1794388051328_0dc90151.sql';
const sql = fs.readFileSync(dumpPath, 'utf8');

const regex = /INSERT INTO [`"']?users[`"']?\s*\(([^)]+)\)\s*VALUES\s*([\s\S]*?);/gi;
const matches = [...sql.matchAll(regex)];

for (const m of matches) {
  const lines = m[2].split(/\),\s*\(/);
  console.log(`Found ${lines.length} users:`);
  for (const line of lines) {
    const clean = line.replace(/^\(/, '').replace(/\)$/, '');
    const parts = clean.split(/,\s*/);
    console.log(`ID: ${parts[0]}, Name: ${parts[1]}, Code: ${parts[2]}, Email: ${parts[3]}, Status: ${parts[12]}`);
  }
}

