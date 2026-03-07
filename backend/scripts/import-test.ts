// Script to import test from JSON file
// Usage: node import-test.ts <json-file-path> <admin-id>

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename: string = fileURLToPath(import.meta.url);
const __dirname: string = dirname(__filename);

const jsonFilePath: string = process.argv[2] || join(__dirname, '../seed/vstep-b2-test-1.json');
const adminId: number = parseInt(process.argv[3]) || 1;

try {
  const jsonData: any = JSON.parse(readFileSync(jsonFilePath, 'utf-8'));

  console.log('Test data to import:');
  console.log(JSON.stringify(jsonData, null, 2));

  console.log('\n---');
  console.log('To import this test, use the API endpoint:');
  console.log('POST /exam-platform/admin/import-test');
  console.log('With body:', JSON.stringify(jsonData, null, 2));
  console.log('\nOr use curl:');
  console.log(`curl -X POST https://your-api-url/exam-platform/admin/import-test \\`);
  console.log(`  -H "Content-Type: application/json" \\`);
  console.log(`  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \\`);
  console.log(`  -d '${JSON.stringify(jsonData)}'`);
} catch (error: any) {
  console.error('Error reading JSON file:', error.message);
  process.exit(1);
}
