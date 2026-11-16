const fs = require('fs');
const dumpPath = 'C:/Users/DELL/.gemini/antigravity/brain/944f8554-cd76-4199-91b5-cde4212b64a8/.user_uploaded/media_1794388051328_0dc90151.sql';
const sql = fs.readFileSync(dumpPath, 'utf8');

const createMatch = sql.match(/CREATE TABLE [`"']?batches[`"']?\s*\(([\s\S]*?)\)\s*ENGINE/i);
if (createMatch) {
  console.log('=== BATCHES SCHEMA ===\n', createMatch[1].trim());
}

