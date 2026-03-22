export function createPngUpload(name = 'upload.png') {
  return {
    name,
    mimeType: 'image/png',
    buffer: Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Wn1G1sAAAAASUVORK5CYII=',
      'base64',
    ),
  };
}

