const fs = require('fs');
const dumpPath = 'C:/Users/DELL/.gemini/antigravity/brain/944f8554-cd76-4199-91b5-cde4212b64a8/.user_uploaded/media_1794388051328_0dc90151.sql';
const sql = fs.readFileSync(dumpPath, 'utf8');

const regex = /INSERT INTO [`"']?roles[`"']?\s*\(([^)]+)\)\s*VALUES\s*([\s\S]*?);/gi;
const matches = [...sql.matchAll(regex)];

for (const m of matches) {
  console.log('Roles:');
  const rows = m[2].split(/\),\s*\(/);
  rows.forEach(r => console.log(r.replace(/^\(/, '').replace(/\)$/, '')));
}

const mhrRegex = /INSERT INTO [`"']?model_has_roles[`"']?\s*\(([^)]+)\)\s*VALUES\s*([\s\S]*?);/gi;
const mhrMatches = [...sql.matchAll(mhrRegex)];
for (const m of mhrMatches) {
  console.log('Model Has Roles:');
  const rows = m[2].split(/\),\s*\(/);
  rows.forEach(r => console.log(r.replace(/^\(/, '').replace(/\)$/, '')));
}

