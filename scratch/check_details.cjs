const fs = require('fs');
const dumpPath = 'C:/Users/DELL/.gemini/antigravity/brain/944f8554-cd76-4199-91b5-cde4212b64a8/.user_uploaded/media_1794388051328_0dc90151.sql';
const sql = fs.readFileSync(dumpPath, 'utf8');

// 1. Check categories table
const catRegex = /INSERT INTO [`"']?categories[`"']?\s*\(([^)]+)\)\s*VALUES\s*([\s\S]*?);/gi;
const catMatches = [...sql.matchAll(catRegex)];
console.log('=== CATEGORIES ===');
for (const m of catMatches) {
  const rows = m[2].split(/\),\s*\(/);
  rows.forEach(r => console.log(r.replace(/^\(/, '').replace(/\)$/, '')));
}

// 2. Check client_agreements table
const agrRegex = /INSERT INTO [`"']?client_agreements[`"']?\s*\(([^)]+)\)\s*VALUES\s*([\s\S]*?);/gi;
const agrMatches = [...sql.matchAll(agrRegex)];
console.log('=== CLIENT AGREEMENTS ===');
for (const m of agrMatches) {
  const rows = m[2].split(/\),\s*\(/);
  rows.forEach(r => {
    if (r.includes('36') || r.includes('WMS-PAK1035')) console.log(r);
  });
}

// 3. Check client_payments table
const payRegex = /INSERT INTO [`"']?client_payments[`"']?\s*\(([^)]+)\)\s*VALUES\s*([\s\S]*?);/gi;
const payMatches = [...sql.matchAll(payRegex)];
console.log('=== CLIENT PAYMENTS ===');
for (const m of payMatches) {
  const rows = m[2].split(/\),\s*\(/);
  rows.forEach(r => {
    if (r.includes('36')) console.log(r);
  });
}

