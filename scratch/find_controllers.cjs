const fs = require('fs');
const dumpPath = 'C:/Users/DELL/.gemini/antigravity/brain/944f8554-cd76-4199-91b5-cde4212b64a8/.user_uploaded/media_1794388051328_0dc90151.sql';
const sql = fs.readFileSync(dumpPath, 'utf8');

// Search for Controller names in migrations, logs, or sessions
const matches = sql.match(/[A-Za-z0-9_]+Controller/g) || [];
console.log('Controllers found in dump:', [...new Set(matches)]);

// Search for 'supplier.' or 'supplier/' routes or text
const supplierMatches = sql.match(/supplier[._\/][a-zA-Z0-9_-]+/g) || [];
console.log('Supplier routes/keys found:', [...new Set(supplierMatches)]);

