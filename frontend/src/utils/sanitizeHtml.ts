import DOMPurify from 'dompurify';

/**
 * Sanitizer dùng chung cho nội dung HTML do người dùng/admin nhập (bài viết, mô tả…).
 *
 * Vì sao thay bản cũ: `PostDetailPage.tsx` từng tự "làm sạch" bằng regex (xoá <script>,
 * <iframe>, và `on\w+="..."` CHỈ khi có dấu ngoặc kép) — bypass được bằng
 * `<img src=x onerror=alert(1)>`, `<svg onload=...>`, `href="javascript:"`. Vì JWT nằm
 * trong localStorage, XSS = chiếm phiên admin. Nay dùng DOMPurify (chuẩn), đồng bộ với
 * policy đang dùng ở repo vantrangexam (`src/utils/html.ts`).
 */

const FORBIDDEN_TAGS = [
  'script',
  'style',
  'iframe',
  'object',
  'embed',
  'form',
  'input',
  'button',
  'textarea',
  'select',
  'option',
  'link',
  'meta',
];

// Chỉ cho phép scheme an toàn: http(s), mailto, tel, đường dẫn gốc (/) và anchor (#).
const SAFE_URL_PATTERN = /^(https?:|mailto:|tel:|\/|#)/i;

let hooksInstalled = false;

function installHooks(): void {
  if (hooksInstalled || typeof window === 'undefined') {
    return;
  }

  DOMPurify.addHook('afterSanitizeAttributes', (node) => {
    if (!(node instanceof Element)) {
      return;
    }

    for (const attr of ['href', 'src']) {
      const value = node.getAttribute(attr);
      if (value && !SAFE_URL_PATTERN.test(value.trim())) {
        node.removeAttribute(attr);
      }
    }

    if (node.getAttribute('target') === '_blank') {
      node.setAttribute('rel', 'noopener noreferrer');
    }
  });

  hooksInstalled = true;
}

function canUseDom(): boolean {
  return typeof window !== 'undefined' && typeof window.document !== 'undefined';
}

export function sanitizeRichHtml(html?: string | null): string {
  if (!html) {
    return '';
  }

  // Môi trường không có DOM: fallback tối thiểu, chỉ cắt <script>.
  if (!canUseDom()) {
    return html.replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, '');
  }

  installHooks();

  return DOMPurify.sanitize(html, {
    FORBID_TAGS: FORBIDDEN_TAGS,
    FORBID_ATTR: ['style'],
    ADD_ATTR: ['target', 'rel'],
    ALLOW_DATA_ATTR: false,
    KEEP_CONTENT: true,
    USE_PROFILES: { html: true },
  });
}

/** Chuyển HTML thành plain text (luôn sanitize trước). */
export function richHtmlToPlainText(html?: string | null): string {
  const sanitized = sanitizeRichHtml(html);
  if (!sanitized) {
    return '';
  }

  if (!canUseDom() || typeof DOMParser === 'undefined') {
    return sanitized.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  }

  const parser = new DOMParser();
  const doc = parser.parseFromString(`<div>${sanitized}</div>`, 'text/html');
  return doc.body.textContent?.replace(/\s+/g, ' ').trim() || '';
}
