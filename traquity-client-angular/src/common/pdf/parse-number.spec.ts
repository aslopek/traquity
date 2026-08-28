import {describe, expect, it} from "@jest/globals";
import {parseNumber, ParsedNumber} from "./parse-number";

describe("parseNumber", (): void => {

  it("reads a plain integer", (): void => {
    expect(parseNumber("42")).toEqual({value: 42, sign: null, digits: 0});
  });

  describe("notation", (): void => {

    it("reads a German amount, the last separator being the decimal point", (): void => {
      expect(parseNumber("1.005,00")).toEqual({value: 1005, sign: null, digits: 2});
    });

    it("reads an English amount to the same value", (): void => {
      expect(parseNumber("1,005.00")).toEqual({value: 1005, sign: null, digits: 2});
    });

    it("keeps every printed decimal of an exchange rate", (): void => {
      expect(parseNumber("2.4181")).toEqual({value: 2.4181, sign: null, digits: 4});
    });

    it("drops several thousands groups", (): void => {
      expect(parseNumber("38.290,00")).toEqual({value: 38290, sign: null, digits: 2});
    });

    it("reads a lone separator with three digits behind it as a thousands group", (): void => {
      expect(parseNumber("1.005")).toEqual({value: 1005, sign: null, digits: 0});
    });

    it("reads three digits behind a zero as a fraction, since no grouping is possible there", (): void => {
      expect(parseNumber("0,132")).toEqual({value: 0.132, sign: null, digits: 3});
    });

    it("reads two digits behind a separator as a fraction", (): void => {
      expect(parseNumber("0,75")).toEqual({value: 0.75, sign: null, digits: 2});
    });
  });

  describe("booking direction", (): void => {

    it("reports a trailing minus apart from the magnitude", (): void => {
      expect(parseNumber("2.163,00-")).toEqual({value: 2163, sign: "-", digits: 2});
    });

    it("reports a trailing plus the same way", (): void => {
      expect(parseNumber("10,58+")).toEqual({value: 10.58, sign: "+", digits: 2});
    });

    it("reports a leading minus", (): void => {
      expect(parseNumber("-216,05")).toEqual({value: 216.05, sign: "-", digits: 2});
    });

    it("keeps the trailing sign where a number carries one at each end", (): void => {
      expect(parseNumber("-216,05+")).toEqual({value: 216.05, sign: "+", digits: 2});
    });
  });

  describe("what is not a number", (): void => {

    it("refuses a word", (): void => {
      expect(parseNumber("Kurswert")).toBeNull();
    });

    it("refuses an amount with its currency attached", (): void => {
      expect(parseNumber("1.005,00EUR")).toBeNull();
    });

    it("refuses a date, which reads as a number with two separators otherwise", (): void => {
      expect(parseNumber("14.03.2024")).toBeNull();
    });

    it("refuses the empty string", (): void => {
      expect(parseNumber("")).toBeNull();
    });

    it("refuses a lone separator", (): void => {
      expect(parseNumber(",")).toBeNull();
    });
  });

  it("ignores surrounding whitespace", (): void => {
    const parsed: ParsedNumber | null = parseNumber("  11,00  ");
    expect(parsed).toEqual({value: 11, sign: null, digits: 2});
  });
});
