// ========================================
// MIGRATION SCRIPT - Tạo bảng payments và certificates
// ========================================
// Chạy: node migrate-database.js

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Đọc schema.sql
const schemaPath = join(__dirname, 'schema.sql');
const schema = readFileSync(schemaPath, 'utf-8');

// Tách các câu lệnh CREATE TABLE
const statements = schema
  .split(';')
  .map(s => s.trim())
  .filter(s => s.length > 0 && s.startsWith('CREATE'));

console.log('📋 Tìm thấy các bảng cần tạo:');
statements.forEach((stmt, idx) => {
  const match = stmt.match(/CREATE TABLE.*?(\w+)/i);
  if (match) {
    console.log(`  ${idx + 1}. ${match[1]}`);
  }
});

console.log('\n📝 SQL Migration Script:\n');
console.log('='.repeat(60));
console.log('Chạy lệnh sau trên Cloudflare D1:');
console.log('='.repeat(60));
console.log('\nwrangler d1 execute vantrangedu_db --remote --file=schema.sql\n');
console.log('Hoặc copy các câu lệnh CREATE TABLE bên dưới:\n');
console.log('-'.repeat(60));

// In ra các câu lệnh CREATE TABLE cho payments và certificates
const paymentsTable = statements.find(s => s.includes('CREATE TABLE') && s.includes('payments'));
const certificatesTable = statements.find(s => s.includes('CREATE TABLE') && s.includes('certificates'));

if (paymentsTable) {
  console.log('\n-- Bảng PAYMENTS');
  console.log(paymentsTable + ';');
}

if (certificatesTable) {
  console.log('\n-- Bảng CERTIFICATES');
  console.log(certificatesTable + ';');
}

// Indexes
const indexes = schema
  .split(';')
  .map(s => s.trim())
  .filter(s => s.startsWith('CREATE INDEX') && (s.includes('payments') || s.includes('certificates')));

if (indexes.length > 0) {
  console.log('\n-- Indexes');
  indexes.forEach(idx => console.log(idx + ';'));
}

console.log('\n' + '='.repeat(60));
