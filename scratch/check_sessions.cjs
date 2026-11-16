const fs = require('fs');
const dumpPath = 'C:/Users/DELL/.gemini/antigravity/brain/944f8554-cd76-4199-91b5-cde4212b64a8/.user_uploaded/media_1794388051328_0dc90151.sql';
const sql = fs.readFileSync(dumpPath, 'utf8');

const sIdx = sql.indexOf('INSERT INTO `sessions`');
if (sIdx !== -1) {
  const sEnd = sql.indexOf(';\n', sIdx);
  const sessionSection = sql.slice(sIdx, sEnd + 1);
  console.log('Session section length:', sessionSection.length);
  // find decoded payload URLs
  const urls = sessionSection.match(/https?:\/\/[a-zA-Z0-9.-]+\/[a-zA-Z0-9.\/_-]+/g) || [];
  console.log('Session URLs:', [...new Set(urls)]);
} else {
  console.log('No sessions insert found.');
}

