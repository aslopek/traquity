import {describe, expect, it} from "@jest/globals";
import {parseNumber, ParsedNumber, readingsOfNumber} from "./parse-number";

describe("parseNumber", (): void => {

  it("reads a plain integer", (): void => {
    expect(parseNumber("42")).toEqual({magnitude: 42, sign: null, digits: 0});
  });

  describe("notation", (): void => {

    it("reads a German amount, the last separator being the decimal point", (): void => {
      expect(parseNumber("1.005,00")).toEqual({magnitude: 1005, sign: null, digits: 2});
    });

    it("reads an English amount to the same value", (): void => {
      expect(parseNumber("1,005.00")).toEqual({magnitude: 1005, sign: null, digits: 2});
    });

    it("keeps every printed decimal of an exchange rate", (): void => {
      expect(parseNumber("2.4181")).toEqual({magnitude: 2.4181, sign: null, digits: 4});
    });

    it("drops several thousands groups", (): void => {
      expect(parseNumber("38.290,00")).toEqual({magnitude: 38290, sign: null, digits: 2});
    });

    it("reads a lone separator with three digits behind it as a thousands group", (): void => {
      expect(parseNumber("1.005")).toEqual({magnitude: 1005, sign: null, digits: 0});
    });

    it("reads three digits behind a zero as a fraction, since no grouping is possible there", (): void => {
      expect(parseNumber("0,132")).toEqual({magnitude: 0.132, sign: null, digits: 3});
    });

    it("reads two digits behind a separator as a fraction", (): void => {
      expect(parseNumber("0,75")).toEqual({magnitude: 0.75, sign: null, digits: 2});
    });

    it("reads the Swiss apostrophe as a group and never as a decimal point", (): void => {
      expect(parseNumber("1'005.00")).toEqual({magnitude: 1005, sign: null, digits: 2});
    });

    it("reads the typographic apostrophe the same way", (): void => {
      expect(parseNumber("1’005.00")).toEqual({magnitude: 1005, sign: null, digits: 2});
    });

    it("reads a no-break space as a group", (): void => {
      expect(parseNumber(`1${"\u00A0"}005,00`)).toEqual({magnitude: 1005, sign: null, digits: 2});
    });

    it("reads a narrow no-break space as a group", (): void => {
      expect(parseNumber(`1${"\u202F"}005,00`)).toEqual({magnitude: 1005, sign: null, digits: 2});
    });

    it("reports as many decimals as a number can carry, so a longer fraction stays renderable", (): void => {
      expect(parseNumber(`0.${"1".repeat(30)}`)?.digits).toBe(20);
    });
  });

  describe("booking direction", (): void => {

    it("reports a trailing minus apart from the magnitude", (): void => {
      expect(parseNumber("2.163,00-")).toEqual({magnitude: 2163, sign: "-", digits: 2});
    });

    it("reports a trailing plus the same way", (): void => {
      expect(parseNumber("10,58+")).toEqual({magnitude: 10.58, sign: "+", digits: 2});
    });

    it("reports a leading minus", (): void => {
      expect(parseNumber("-216,05")).toEqual({magnitude: 216.05, sign: "-", digits: 2});
    });

    it("keeps the trailing sign where a number carries one at each end", (): void => {
      expect(parseNumber("-216,05+")).toEqual({magnitude: 216.05, sign: "+", digits: 2});
    });

    it("reads brackets as the minus the accounting notation states with them", (): void => {
      expect(parseNumber("(216,05)")).toEqual({magnitude: 216.05, sign: "-", digits: 2});
    });

    it("refuses a bracket that closes nothing, which is a fragment of something else", (): void => {
      expect(parseNumber("(216,05")).toEqual({magnitude: 216.05, sign: null, digits: 2});
    });
  });

  describe("what a page prints against an amount", (): void => {

    it("reads an amount behind a currency symbol", (): void => {
      expect(parseNumber("€1.005,00")).toEqual({magnitude: 1005, sign: null, digits: 2});
    });

    it("reads an amount in front of a currency symbol", (): void => {
      expect(parseNumber("1,005.00$")).toEqual({magnitude: 1005, sign: null, digits: 2});
    });

    it("reads an amount behind the colon of its label", (): void => {
      expect(parseNumber(":1.005,00")).toEqual({magnitude: 1005, sign: null, digits: 2});
    });

    it("reads an amount closing a sentence", (): void => {
      expect(parseNumber("11,00.")).toEqual({magnitude: 11, sign: null, digits: 2});
    });

    it("reads the figure of a rate, the percent sign being no part of it", (): void => {
      expect(parseNumber("24,45%")).toEqual({magnitude: 24.45, sign: null, digits: 2});
    });
  });

  describe("what is not a number", (): void => {

    it("refuses a word", (): void => {
      expect(parseNumber("Kurswert")).toBeNull();
    });

    it("refuses an amount with its currency attached", (): void => {
      expect(parseNumber("1.005,00EUR")).toBeNull();
    });

    it("refuses an identifier opening with letters", (): void => {
      expect(parseNumber("ABC123")).toBeNull();
    });

    it("refuses a date, which reads as a number with two separators otherwise", (): void => {
      expect(parseNumber("14.03.2024")).toBeNull();
    });

    it("refuses a reference number of three groups", (): void => {
      expect(parseNumber("883.04050812.0001257")).toBeNull();
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
    expect(parsed).toEqual({magnitude: 11, sign: null, digits: 2});
  });
});

describe("readingsOfNumber", (): void => {

  it("reports the one reading of an unambiguous amount", (): void => {
    expect(readingsOfNumber("1.005,00")).toEqual([{magnitude: 1005, sign: null, digits: 2}]);
  });

  it("reports both readings of a lone separator with three digits behind it, the grouped one first", (): void => {
    expect(readingsOfNumber("1.005")).toEqual([
      {magnitude: 1005, sign: null, digits: 0},
      {magnitude: 1.005, sign: null, digits: 3}
    ]);
  });

  it("reports the fraction alone behind a zero, where no grouping is possible", (): void => {
    expect(readingsOfNumber("0,132")).toEqual([{magnitude: 0.132, sign: null, digits: 3}]);
  });

  it("reports the grouped reading alone where a second separator settles the notation", (): void => {
    expect(readingsOfNumber("1.005.000")).toEqual([{magnitude: 1005000, sign: null, digits: 0}]);
  });

  it("carries the booking direction into every reading", (): void => {
    expect(readingsOfNumber("1.005-")).toEqual([
      {magnitude: 1005, sign: "-", digits: 0},
      {magnitude: 1.005, sign: "-", digits: 3}
    ]);
  });

  it("reports nothing for a word that is no number", (): void => {
    expect(readingsOfNumber("Kurswert")).toEqual([]);
  });
});
