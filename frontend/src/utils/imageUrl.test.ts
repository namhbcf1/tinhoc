// @ts-nocheck
import { applyImageFallback, buildInitialsAvatarDataUrl, resolveImageUrl } from './imageUrl';

describe('resolveImageUrl', () => {
  it('keeps absolute URL unchanged', () => {
    expect(resolveImageUrl('https://example.com/a.jpg')).toBe('https://example.com/a.jpg');
  });

  it('normalizes students image route with unencoded key', () => {
    expect(resolveImageUrl('/students/image/student-images/avatar.jpg'))
      .toBe('/api/students/image/student-images%2Favatar.jpg');
  });

  it('normalizes students image route without leading slash', () => {
    expect(resolveImageUrl('students/image/student-images%2Favatar.jpg'))
      .toBe('/api/students/image/student-images%2Favatar.jpg');
  });

  it('maps legacy R2 key to students image endpoint', () => {
    expect(resolveImageUrl('student-images/avatar.jpg'))
      .toBe('/api/students/image/student-images%2Favatar.jpg');
  });

  it('falls back UUID to students image endpoint when account hash is missing', () => {
    const id = '11111111-2222-3333-4444-555555555555';
    expect(resolveImageUrl(id)).toBe(`/api/students/image/${id}`);
  });
});

describe('image fallback helpers', () => {
  it('creates an SVG data URL for initials avatar', () => {
    const dataUrl = buildInitialsAvatarDataUrl('Nguyen Thanh Nam');
    expect(dataUrl.startsWith('data:image/svg+xml')).toBe(true);
  });

  it('applies fallback image only once', () => {
    const image = document.createElement('img');
    const event = { currentTarget: image } as { currentTarget: HTMLImageElement };

    applyImageFallback(event, 'Hoc Vien');
    const firstSrc = image.src;
    expect(firstSrc.startsWith('data:image/svg+xml')).toBe(true);
    expect(image.dataset.fallbackApplied).toBe('1');

    image.src = 'https://example.com/keep-me.jpg';
    applyImageFallback(event, 'Hoc Vien');
    expect(image.src).toBe('https://example.com/keep-me.jpg');
  });
});
