import { expect, test, type Locator } from '@playwright/test';

const frontCccdPath = process.env.LIVE_FRONT_CCCD_PATH || 'C:/Users/ADMIN/Downloads/NGUYỄN NHẤT DƯƠNG_cccd_front.jpg';

async function measureForegroundFill(locator: Locator) {
  return locator.evaluate(async (image: HTMLImageElement) => {
    const waitForImage = async () => {
      if (image.complete && image.naturalWidth > 0) return;
      await new Promise<void>((resolve, reject) => {
        image.addEventListener('load', () => resolve(), { once: true });
        image.addEventListener('error', () => reject(new Error('Khong the tai preview image')), { once: true });
      });
    };

    await waitForImage();

    const canvas = document.createElement('canvas');
    canvas.width = image.naturalWidth;
    canvas.height = image.naturalHeight;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) throw new Error('Khong the doc du lieu image');

    ctx.drawImage(image, 0, 0);
    const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const width = canvas.width;
    const height = canvas.height;
    const radius = Math.max(2, Math.round(Math.min(width, height) * 0.018));

    const sampleCorner = (cx: number, cy: number) => {
      let totalR = 0;
      let totalG = 0;
      let totalB = 0;
      let count = 0;
      for (let y = Math.max(0, cy - radius); y <= Math.min(height - 1, cy + radius); y += 1) {
        for (let x = Math.max(0, cx - radius); x <= Math.min(width - 1, cx + radius); x += 1) {
          const index = (y * width + x) * 4;
          totalR += data[index];
          totalG += data[index + 1];
          totalB += data[index + 2];
          count += 1;
        }
      }
      return { r: totalR / Math.max(count, 1), g: totalG / Math.max(count, 1), b: totalB / Math.max(count, 1) };
    };

    const seeds = [
      sampleCorner(2, 2),
      sampleCorner(width - 3, 2),
      sampleCorner(2, height - 3),
      sampleCorner(width - 3, height - 3),
    ];
    const visited = new Uint8Array(width * height);
    const queue = new Int32Array(width * height);
    let head = 0;
    let tail = 0;

    const minDelta = (r: number, g: number, b: number) => {
      let best = Number.POSITIVE_INFINITY;
      for (const seed of seeds) {
        const delta = Math.abs(r - seed.r) + Math.abs(g - seed.g) + Math.abs(b - seed.b);
        if (delta < best) best = delta;
      }
      return best;
    };

    const push = (x: number, y: number) => {
      if (x < 0 || x >= width || y < 0 || y >= height) return;
      const index = y * width + x;
      if (visited[index]) return;
      visited[index] = 1;
      queue[tail++] = index;
    };

    push(0, 0);
    push(width - 1, 0);
    push(0, height - 1);
    push(width - 1, height - 1);

    while (head < tail) {
      const current = queue[head++];
      const y = Math.floor(current / width);
      const x = current - y * width;
      const pixelIndex = current * 4;
      const r = data[pixelIndex];
      const g = data[pixelIndex + 1];
      const b = data[pixelIndex + 2];
      if (minDelta(r, g, b) > 42) {
        visited[current] = 0;
        continue;
      }
      push(x - 1, y);
      push(x + 1, y);
      push(x, y - 1);
      push(x, y + 1);
    }

    let minX = width;
    let minY = height;
    let maxX = -1;
    let maxY = -1;
    for (let y = 0; y < height; y += 1) {
      for (let x = 0; x < width; x += 1) {
        if (visited[y * width + x]) continue;
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }

    return {
      filledWidthRatio: (maxX - minX + 1) / Math.max(width, 1),
      filledHeightRatio: (maxY - minY + 1) / Math.max(height, 1),
      minX,
      minY,
      maxX,
      maxY,
      width,
      height,
    };
  });
}

test('live editor crop: restored CCCD should nearly fill preview', async ({ page }) => {
  test.setTimeout(300_000);

  await page.goto('/register', { waitUntil: 'networkidle' });
  const uploadCard = page.locator('.upload-card').nth(0);
  await uploadCard.locator('input[type="file"]').setInputFiles(frontCccdPath);

  const restoredPreview = page.locator('.document-smart-preview-image').nth(1);
  await expect(restoredPreview).toBeVisible({ timeout: 180_000 });

  const metrics = await measureForegroundFill(restoredPreview);
  console.log('editor-crop-metrics', JSON.stringify(metrics));
  expect(metrics.filledWidthRatio).toBeGreaterThan(0.94);
  expect(metrics.filledHeightRatio).toBeGreaterThan(0.92);
});
