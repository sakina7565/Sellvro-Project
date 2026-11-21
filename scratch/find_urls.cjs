const fs = require('fs');
const dumpPath = 'C:/Users/DELL/.gemini/antigravity/brain/944f8554-cd76-4199-91b5-cde4212b64a8/.user_uploaded/media_1794388051328_0dc90151.sql';
const sql = fs.readFileSync(dumpPath, 'utf8');

// Search for any URLs in the dump
const urlMatches = sql.match(/(https?:\/\/[^\s"',;]+|\/supplier\/[^\s"',;]+|\/admin\/[^\s"',;]+)/g) || [];
const uniqueUrls = [...new Set(urlMatches)];
console.log('URLs in SQL dump:', uniqueUrls.slice(0, 50));

