/**
 * The given text with every character that could open a tag or close an attribute replaced by its entity, for
 * interpolation into a markup string that no template engine escapes.
 */
export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
