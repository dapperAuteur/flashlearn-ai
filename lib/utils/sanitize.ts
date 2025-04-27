// lib/utils/sanitize.ts
import DOMPurify from 'dompurify';
import { JSDOM } from 'jsdom';

// Create window object for DOMPurify
const window = new JSDOM('').window;
const purify = DOMPurify(window);

/**
 * Sanitize HTML content to prevent XSS attacks
 */
export function sanitizeHtml(html: string): string {
  return purify.sanitize(html, {
    ALLOWED_TAGS: [
      'b', 'i', 'u', 'p', 'br', 'ul', 'ol', 'li', 
      'strong', 'em', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
      'a', 'span', 'div', 'code', 'pre'
    ],
    ALLOWED_ATTR: ['href', 'class', 'style'],
    FORBID_TAGS: ['script', 'iframe', 'form', 'input'],
    FORBID_ATTR: ['onerror', 'onload', 'onclick']
  });
}