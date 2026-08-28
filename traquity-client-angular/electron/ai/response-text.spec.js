const {describe, expect, it} = require('@jest/globals');
const {textOfResponse} = require('./response-text.js');

/** @import {ResponsePart} from './response-text.js' */

/**
 * @param {string} text
 * @param {'thought' | 'comment'} [segmentType]
 * @returns {ResponsePart}
 */
function segment(text, segmentType = 'thought') {
  return {type: 'segment', segmentType, text, ended: true};
}

describe('textOfResponse', () => {
  it('takes the text of a plain response', () => {
    expect(textOfResponse(['{"answer":"yes"}'])).toBe('{"answer":"yes"}');
  });

  it('takes the text of a response a wrapper put in a segment, which is where a grammar-bound answer lands', () => {
    expect(textOfResponse([segment('{"answer":"yes"}')])).toBe('{"answer":"yes"}');
  });

  it('joins the parts in the order they were generated', () => {
    expect(textOfResponse([segment('{"answer":'), '"yes"}'])).toBe('{"answer":"yes"}');
  });

  it('takes a comment segment too, since a grammar leaves no token that is not the answer', () => {
    expect(textOfResponse([segment('{"a":1}', 'comment')])).toBe('{"a":1}');
  });

  it('leaves a function call out', () => {
    /** @type {ResponsePart} */
    const functionCall = {type: 'functionCall', name: 'lookUp', params: {}, result: {}};

    expect(textOfResponse(['{"a":', functionCall, '1}'])).toBe('{"a":1}');
  });

  it('answers with nothing where the model generated nothing', () => {
    expect(textOfResponse([])).toBe('');
  });
});
