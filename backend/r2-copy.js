// Copy R2 objects from tinhoc-files to vantrangedu-files using wrangler CLI
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const TEMP = process.env.TEMP || '/tmp';
const keysFile = path.join(TEMP, 'r2_keys_list.txt');
const tempDir = path.join(TEMP, 'r2_copy_temp');

const SOURCE = 'tinhoc-files';
const DEST = 'vantrangedu-files';

if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });

const keys = fs.readFileSync(keysFile, 'utf8').trim().split('\n').filter(Boolean);
console.log(`Total files to copy: ${keys.length}`);

let copied = 0, skipped = 0, failed = 0;

for (let i = 0; i < keys.length; i++) {
  const key = keys[i].trim();
  if (!key) continue;

  const safeName = key.replace(/[\/\\:]/g, '_');
  const tempFile = path.join(tempDir, safeName);

  process.stdout.write(`[${i + 1}/${keys.length}] ${key} ... `);

  try {
    // Download from source
    execSync(`npx wrangler r2 object get "${SOURCE}/${key}" --file="${tempFile}" --remote`, {
      cwd: 'C:/Users/ADMIN/Desktop/thongtin/backend',
      stdio: 'pipe',
      timeout: 30000
    });

    if (fs.existsSync(tempFile)) {
      // Upload to destination
      try {
        execSync(`npx wrangler r2 object put "${DEST}/${key}" --file="${tempFile}" --remote`, {
          cwd: 'C:/Users/ADMIN/Desktop/thongtin/backend',
          stdio: 'pipe',
          timeout: 30000
        });
        console.log('OK');
        copied++;
      } catch (e) {
        console.log('FAIL (upload)');
        failed++;
      }
      try { fs.unlinkSync(tempFile); } catch {}
    }
  } catch (e) {
    if (e.stderr && e.stderr.toString().includes('does not exist')) {
      console.log('SKIP (not found in source)');
      skipped++;
    } else {
      console.log('FAIL (download): ' + (e.message || '').substring(0, 80));
      failed++;
    }
  }
}

console.log(`\nDone! Copied: ${copied}, Skipped: ${skipped}, Failed: ${failed}`);

// Cleanup
try { fs.rmdirSync(tempDir, { recursive: true }); } catch {}
