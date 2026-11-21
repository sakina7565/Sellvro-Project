const fs = require('fs');
const dumpPath = 'C:/Users/DELL/.gemini/antigravity/brain/944f8554-cd76-4199-91b5-cde4212b64a8/.user_uploaded/media_1794388051328_0dc90151.sql';
const sql = fs.readFileSync(dumpPath, 'utf8');

const regex = /INSERT INTO [`"']?products[`"']?\s*\(([^)]+)\)\s*VALUES\s*([\s\S]*?);/gi;
const matches = [...sql.matchAll(regex)];

let nullApprovedAt = 0;
let notNullApprovedAt = 0;

for (const m of matches) {
  const rows = m[2].split(/\),\s*\(/);
  for (const row of rows) {
    const clean = row.replace(/^\(/, '').replace(/\)$/, '');
    // approved_at is the 19th column (before rejected_at, created_at, updated_at)
    // rejected_at, created_at, updated_at are at the end: NULL, 'YYYY-MM-DD...', 'YYYY-MM-DD...'
    // let's match the tail:
    const tailMatch = clean.match(/,\s*(NULL|'[^']+')\s*,\s*(NULL|'[^']+')\s*,\s*'([^']+)'\s*,\s*'([^']+)'\s*$/);
    if (tailMatch) {
      const approvedAt = tailMatch[1];
      if (approvedAt === 'NULL') nullApprovedAt++;
      else notNullApprovedAt++;
    }
  }
}
console.log(`approved_at NULL: ${nullApprovedAt}, NOT NULL: ${notNullApprovedAt}`);

