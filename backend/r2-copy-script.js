// Temporary script to copy R2 objects from tinhoc-files to vantrangedu-files
// Run via: node r2-copy-script.js

const ACCOUNT_ID = '5b62d10947844251d23e0eac532531dd';
const SOURCE_BUCKET = 'tinhoc-files';
const DEST_BUCKET = 'vantrangedu-files';

// You need to set these env vars before running:
// R2_ACCESS_KEY_ID and R2_SECRET_ACCESS_KEY
// Or use Cloudflare API token

async function main() {
  const API_TOKEN = process.env.CF_API_TOKEN || process.env.CLOUDFLARE_API_TOKEN;

  if (!API_TOKEN) {
    console.error('Please set CF_API_TOKEN or CLOUDFLARE_API_TOKEN environment variable');
    console.log('You can create one at: https://dash.cloudflare.com/profile/api-tokens');
    console.log('Required permissions: Workers R2 Storage:Edit');
    process.exit(1);
  }

  const headers = {
    'Authorization': `Bearer ${API_TOKEN}`,
    'Content-Type': 'application/json'
  };

  // List objects in source bucket
  console.log(`Listing objects in ${SOURCE_BUCKET}...`);
  let cursor = '';
  let allObjects = [];

  do {
    const url = `https://api.cloudflare.com/client/v4/accounts/${ACCOUNT_ID}/r2/buckets/${SOURCE_BUCKET}/objects?per_page=1000${cursor ? `&cursor=${cursor}` : ''}`;
    const res = await fetch(url, { headers });
    const data = await res.json();

    if (!data.success) {
      console.error('Failed to list objects:', JSON.stringify(data.errors));
      process.exit(1);
    }

    allObjects = allObjects.concat(data.result.objects || []);
    cursor = data.result.truncated ? data.result.cursor : '';
    console.log(`  Found ${allObjects.length} objects so far...`);
  } while (cursor);

  console.log(`\nTotal objects to copy: ${allObjects.length}`);

  if (allObjects.length === 0) {
    console.log('No objects found in source bucket.');
    return;
  }

  // Print object list
  console.log('\nObjects:');
  allObjects.forEach(obj => {
    console.log(`  ${obj.key} (${(obj.size / 1024).toFixed(1)} KB)`);
  });

  // Copy each object
  let copied = 0;
  let failed = 0;

  for (const obj of allObjects) {
    try {
      // Get object from source
      const getUrl = `https://api.cloudflare.com/client/v4/accounts/${ACCOUNT_ID}/r2/buckets/${SOURCE_BUCKET}/objects/${encodeURIComponent(obj.key)}`;
      const getRes = await fetch(getUrl, {
        headers: { 'Authorization': `Bearer ${API_TOKEN}` }
      });

      if (!getRes.ok) {
        console.error(`  FAIL GET ${obj.key}: ${getRes.status}`);
        failed++;
        continue;
      }

      const blob = await getRes.blob();

      // Put object to destination
      const putUrl = `https://api.cloudflare.com/client/v4/accounts/${ACCOUNT_ID}/r2/buckets/${DEST_BUCKET}/objects/${encodeURIComponent(obj.key)}`;
      const putRes = await fetch(putUrl, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${API_TOKEN}`,
          'Content-Type': obj.httpMetadata?.contentType || 'application/octet-stream'
        },
        body: blob
      });

      if (putRes.ok) {
        copied++;
        console.log(`  OK [${copied}/${allObjects.length}] ${obj.key}`);
      } else {
        const err = await putRes.text();
        console.error(`  FAIL PUT ${obj.key}: ${putRes.status} ${err}`);
        failed++;
      }
    } catch (e) {
      console.error(`  ERROR ${obj.key}: ${e.message}`);
      failed++;
    }
  }

  console.log(`\nDone! Copied: ${copied}, Failed: ${failed}, Total: ${allObjects.length}`);
}

main().catch(console.error);
