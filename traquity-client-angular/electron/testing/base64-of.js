const {AsymmetricMatcher} = require('expect');

const BASE64_PATTERN = /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/;

/**
 * A base64 string decoding to exactly `byteLength` bytes - narrower than `expect.any(String)`. Extending Jest's own
 * `AsymmetricMatcher` (rather than a duck-typed `{asymmetricMatch, toString}` object) is what tags the instance with
 * the `$$typeof` symbol `pretty-format` keys its diff rendering off of: without it, a failing match prints the raw
 * object (`Object {'asymmetricMatch': [Function], ...}`) instead of calling `toString()` for a readable
 * `Base64Of(16)`.
 *
 * @extends {AsymmetricMatcher<number>}
 */
class Base64Of extends AsymmetricMatcher {

  /**
   * @param {number} byteLength
   */
  constructor(byteLength) {
    super(byteLength);
  }

  /**
   * @param {unknown} other
   * @returns {boolean}
   */
  asymmetricMatch(other) {
    return typeof other === 'string' && BASE64_PATTERN.test(other) && Buffer.from(other, 'base64').length === this.sample;
  }

  /**
   * @returns {string}
   */
  toString() {
    return `Base64Of(${this.sample})`;
  }

  /**
   * `toString()` alone only labels a *passing* match (Jest calls it for `expect.any(...)`-style printing); a
   * *failing* diff goes through `pretty-format`'s asymmetric-matcher plugin instead, which requires this method
   * specifically - `toString()` is not enough despite the base class declaring it optional.
   *
   * @override
   * @returns {string}
   */
  toAsymmetricMatcher() {
    return this.toString();
  }
}

/**
 * @param {number} byteLength
 * @returns {Base64Of}
 */
function base64Of(byteLength) {
  return new Base64Of(byteLength);
}

module.exports = {base64Of};
