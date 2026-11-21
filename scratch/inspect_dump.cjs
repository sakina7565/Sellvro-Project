const fs = require('fs');

const dumpPath = 'C:/Users/DELL/.gemini/antigravity/brain/944f8554-cd76-4199-91b5-cde4212b64a8/.user_uploaded/media_1794388051328_0dc90151.sql';
const sql = fs.readFileSync(dumpPath, 'utf8');

// 1. Tables
const createTableMatches = [...sql.matchAll(/CREATE TABLE [`"']?([a-zA-Z0-9_]+)[`"']?\s*\(([\s\S]*?)\)\s*ENGINE/gi)];
console.log('=== TABLES IN DUMP (' + createTableMatches.length + ') ===');
for (const match of createTableMatches) {
  console.log('-', match[1]);
}

// 2. Search for products table definition
const productsTable = createTableMatches.find(m => m[1] === 'products');
if (productsTable) {
  console.log('\n=== PRODUCTS TABLE SCHEMA ===');
  console.log(productsTable[2].trim());
}

// 3. Search for inventories table definition
const inventoriesTable = createTableMatches.find(m => m[1] === 'inventories');
if (inventoriesTable) {
  console.log('\n=== INVENTORIES TABLE SCHEMA ===');
  console.log(inventoriesTable[2].trim());
}

// 4. Search for users table definition
const usersTable = createTableMatches.find(m => m[1] === 'users');
if (usersTable) {
  console.log('\n=== USERS TABLE SCHEMA ===');
  console.log(usersTable[2].trim());
}

// 5. Search for fulfillment_requests table definition
const frTable = createTableMatches.find(m => m[1] === 'fulfillment_requests');
if (frTable) {
  console.log('\n=== FULFILLMENT_REQUESTS TABLE SCHEMA ===');
  console.log(frTable[2].trim());
}

