import {describe, expect, it} from "@jest/globals";
import {wordsOf} from "./words-of-text";

describe("wordsOf", (): void => {

  it("splits a text on its spaces", (): void => {
    expect(wordsOf("Kurswert 1.005,00 EUR")).toEqual(["Kurswert", "1.005,00", "EUR"]);
  });

  it("splits on a run of whitespace as on one space", (): void => {
    expect(wordsOf("Kurswert   1.005,00")).toEqual(["Kurswert", "1.005,00"]);
  });

  it("splits on a tab and on a line break", (): void => {
    expect(wordsOf("Kurswert\t1.005,00\nEUR")).toEqual(["Kurswert", "1.005,00", "EUR"]);
  });

  it("keeps a no-break space inside the word it groups", (): void => {
    expect(wordsOf(`1${"\u00A0"}005,00 EUR`)).toEqual([`1${"\u00A0"}005,00`, "EUR"]);
  });

  it("keeps a narrow no-break space the same way", (): void => {
    expect(wordsOf(`1${"\u202F"}005,00`)).toEqual([`1${"\u202F"}005,00`]);
  });

  it("reports no empty word for a text opening and closing with a space", (): void => {
    expect(wordsOf("  Kurswert  ")).toEqual(["Kurswert"]);
  });

  it("reports nothing for a text of whitespace alone", (): void => {
    expect(wordsOf("   ")).toEqual([]);
  });

  it("reports nothing for the empty text", (): void => {
    expect(wordsOf("")).toEqual([]);
  });
});
