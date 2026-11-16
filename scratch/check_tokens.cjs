const fs = require('fs');
const dumpPath = 'C:/Users/DELL/.gemini/antigravity/brain/944f8554-cd76-4199-91b5-cde4212b64a8/.user_uploaded/media_1794388051328_0dc90151.sql';
const sql = fs.readFileSync(dumpPath, 'utf8');

console.log('Has personal_access_tokens?', sql.includes('personal_access_tokens'));
console.log('Has api_tokens?', sql.includes('api_tokens'));
console.log('Has oauth?', sql.includes('oauth'));

