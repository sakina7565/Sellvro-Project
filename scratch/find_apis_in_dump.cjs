const fs = require('fs');
const dumpPath = 'C:/Users/DELL/.gemini/antigravity/brain/944f8554-cd76-4199-91b5-cde4212b64a8/.user_uploaded/media_1794388051328_0dc90151.sql';
const sql = fs.readFileSync(dumpPath, 'utf8');

// Find all matches for api/
const apiMatches = sql.match(/[\w\/\.:-]+api[\w\/\.:-]+/gi) || [];
console.log('API occurrences in dump:', [...new Set(apiMatches)]);

