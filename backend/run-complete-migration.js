#!/usr/bin/env node

/**
 * COMPREHENSIVE DATABASE MIGRATION SCRIPT
 * This script applies all missing migrations to the Cloudflare D1 database
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const DATABASE_ID = '0f9e932f-c9f2-4d27-b3e2-21f74c4eb674';
const DATABASE_NAME = 'vantrangedu_db';

console.log('🔧 Starting comprehensive database migration...\n');

// Read the complete migration SQL
const migrationPath = path.join(__dirname, 'migrations', 'complete_migration.sql');
const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

console.log('📄 Migration SQL loaded from:', migrationPath);
console.log('📊 Database ID:', DATABASE_ID);
console.log('📊 Database Name:', DATABASE_NAME);
console.log('\n⏳ Applying migration to Cloudflare D1...\n');

try {
    // Execute migration using wrangler d1 execute
    const command = `npx wrangler d1 execute ${DATABASE_NAME} --remote --file="${migrationPath}"`;

    console.log('Running command:', command);
    console.log('');

    const output = execSync(command, {
        cwd: __dirname,
        encoding: 'utf8',
        stdio: 'inherit'
    });

    console.log('\n✅ Migration completed successfully!');
    console.log('\n📋 Summary:');
    console.log('   - conversations table created');
    console.log('   - messages table created');
    console.log('   - attendance table created');
    console.log('   - exam_schedules table created');
    console.log('   - notifications table created');
    console.log('   - teachers table created');
    console.log('   - class_schedules table created');
    console.log('   - class_teachers table created');
    console.log('   - activity_logs table created');
    console.log('   - password_reset_tokens table created');
    console.log('\n🎉 All tables and indexes have been created!');

} catch (error) {
    console.error('\n❌ Migration failed:', error.message);
    console.error('\nPlease check:');
    console.error('1. You are logged in to Cloudflare (npx wrangler login)');
    console.error('2. The database ID is correct');
    console.error('3. You have permissions to modify the database');
    process.exit(1);
}
