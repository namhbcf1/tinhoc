/**
 * Remove Vietnamese diacritics from text
 * "Đức Minh" → "duc minh"
 */
export function removeDiacritics(str: string): string {
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D');
}

/**
 * Normalize text for search comparison
 * "Nguyễn Văn Đức" → "nguyen van duc"
 */
export function normalizeSearchText(str: string): string {
  if (!str) return '';
  return removeDiacritics(str)
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}
