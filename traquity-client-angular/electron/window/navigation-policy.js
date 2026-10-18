/**
 * The two decisions made about a URL a renderer hands to the main process: whether the operating system may be asked
 * to open it, and whether the window may navigate to it.
 *
 * Both are default-deny, and both exist because the URLs in question are not this app's own strings. A renderer
 * displays what a database, an HTTP response or a user typed, so a link's target is data - and a URL handed to the
 * shell is opened by whatever the OS has registered for its scheme, which for `file:` is 'run this'. A navigation is
 * the same problem one level up: a window that leaves its own document keeps the preload's bridge, so the page it
 * lands on inherits every IPC channel this app exposes.
 *
 * Anything unparsable is refused rather than guessed at, which is what makes these two total functions over strings.
 */

/**
 * The schemes the OS may be asked to open. Deliberately short: a browser is the only intended target, and every
 * scheme beyond these two - `file:`, `javascript:`, `smb:`, and the OS-specific handlers that come and go - is a way
 * to reach something other than a browser.
 *
 * @type {string[]}
 */
const OPENABLE_PROTOCOLS = ['https:', 'http:'];

/**
 * @param {string} candidate
 * @returns {URL | null}
 */
function parsed(candidate) {
  try {
    return new URL(candidate);
  } catch {
    return null;
  }
}

/**
 * Whether this URL may be handed to the OS to open.
 *
 * @param {string} candidate
 * @returns {boolean}
 */
function isOpenableExternally(candidate) {
  const url = parsed(candidate);
  return url != null && OPENABLE_PROTOCOLS.includes(url.protocol);
}

/**
 * Whether a navigation target is still the document it was given, query string and fragment aside - which is what an
 * in-app router changes and what a reload preserves.
 *
 * @param {string} candidate
 * @param {string} documentUrl
 * @returns {boolean}
 */
function isSameDocument(candidate, documentUrl) {
  const target = parsed(candidate);
  const own = parsed(documentUrl);
  if (target == null || own == null) {
    return false;
  }
  target.search = '';
  target.hash = '';
  own.search = '';
  own.hash = '';
  return target.href === own.href;
}

module.exports = {isOpenableExternally, isSameDocument, OPENABLE_PROTOCOLS};
