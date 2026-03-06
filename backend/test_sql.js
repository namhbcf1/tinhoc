const process = require('process');
const fs = require('fs');
let Database;
try {
    Database = require('better-sqlite3');
} catch (e) {
    const { execSync } = require('child_process');
    console.log('Installing better-sqlite3...');
    execSync('npm install better-sqlite3', { stdio: 'inherit' });
    Database = require('better-sqlite3');
}

const db = new Database('test.db');
db.pragma('defer_foreign_keys = ON');

const sql = fs.readFileSync('vantrangedu_export_full_fixed.sql', 'utf8');

try {
    db.exec(sql);
    console.log('Success!');
} catch (err) {
    console.error('Error executing SQL:');
    console.error(err.message);
}
