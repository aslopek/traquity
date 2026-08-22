/**
 * Formats an error for a failed-download message, agnostic of what was being downloaded or how it is verified.
 */

/** @type {number} how far a `cause` chain is followed - it is built by whoever threw, and may well be cyclic */
const MAX_CAUSE_DEPTH = 4;

/**
 * An error's message, followed by the message of each `cause` it carries, down to `MAX_CAUSE_DEPTH`. The chain is
 * what makes the message diagnostic at all where a `fetch` rejects: it rejects with a `TypeError` whose message is
 * the constant `fetch failed` for a refused connection, an unresolvable host and a rejected certificate alike, and
 * names which of them it was in `cause` only.
 *
 * @param {unknown} error
 * @returns {string}
 */
function messageOf(error) {
  /** @type {string[]} */
  const messages = [];
  /** @type {unknown} */
  let current = error;

  for (let depth = 0; depth <= MAX_CAUSE_DEPTH; depth++) {
    messages.push(current instanceof Error ? current.message : String(current));
    if (!(current instanceof Error) || current.cause == null) {
      break;
    }
    current = current.cause;
  }

  return messages.join(': ');
}

module.exports = {messageOf};
