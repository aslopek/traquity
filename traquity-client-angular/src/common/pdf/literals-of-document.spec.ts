import {beforeEach, describe, expect, it} from "@jest/globals";
import {DocumentLiterals, literalsOfDocument} from "./literals-of-document";
import {PdfCell, PdfDocument, PdfToken} from "./pdf-document.type";

function tokenFactory(overrides: Partial<PdfToken> = {}): PdfToken {
  return {
    text: "1.700,00",
    label: "Kurswert",
    last: true,
    magnitude: 1700,
    digits: 2,
    ...overrides
  };
}

/** A token carrying no amount, which is what a date or a time is. */
function valueTokenFactory(overrides: Partial<PdfToken> = {}): PdfToken {
  const {magnitude, digits, ...token} = tokenFactory(overrides);
  return token;
}

function dateTokenFactory(overrides: Partial<PdfToken> = {}): PdfToken {
  return valueTokenFactory({text: "02.01.2025", date: "2025-01-02", ...overrides});
}

function cellFactory(tokens: PdfToken[]): PdfCell {
  return {text: tokens.map((token: PdfToken): string => token.text).join(" "), x: 70, width: 120, height: 10, tokens};
}

function documentFactory(cells: PdfCell[][]): PdfDocument {
  return {
    pages: [{
      number: 1,
      width: 600,
      height: 800,
      empty: false,
      rows: cells.map((row: PdfCell[], index: number) => ({y: index * 12, cells: row}))
    }]
  };
}

describe("literalsOfDocument", (): void => {

  let document: PdfDocument;

  beforeEach((): void => {
    document = documentFactory([[cellFactory([tokenFactory()])]]);
  });

  it("states an amount to the decimals the page printed", (): void => {
    expect(literalsOfDocument(document)).toEqual({dates: [], times: [], numbers: ["1700.00"]} satisfies DocumentLiterals);
  });

  it("states a date in the notation an answer uses", (): void => {
    document = documentFactory([[cellFactory([dateTokenFactory()])]]);

    expect(literalsOfDocument(document))
      .toEqual({dates: ["2025-01-02"], times: [], numbers: []} satisfies DocumentLiterals);
  });

  it("states a time as the token carries it", (): void => {
    document = documentFactory([[cellFactory([valueTokenFactory({text: "4:30", time: "16:30:00"})])]]);

    expect(literalsOfDocument(document))
      .toEqual({dates: [], times: ["16:30:00"], numbers: []} satisfies DocumentLiterals);
  });

  it("states both readings of an amount whose notation is ambiguous", (): void => {
    document = documentFactory([[cellFactory([tokenFactory({text: "1.005", magnitude: 1005, digits: 0})])]]);

    expect(literalsOfDocument(document).numbers).toEqual(["1005", "1.005"]);
  });

  it("states both readings of a date whose notation is ambiguous", (): void => {
    document = documentFactory([[cellFactory([dateTokenFactory({text: "03/04/2024", date: "2024-04-03"})])]]);

    expect(literalsOfDocument(document).dates).toEqual(["2024-04-03", "2024-03-04"]);
  });

  it("states a value once, however many times the document prints it", (): void => {
    document = documentFactory([
      [cellFactory([tokenFactory()])],
      [cellFactory([tokenFactory({label: "Ausmachender Betrag"})])]
    ]);

    expect(literalsOfDocument(document).numbers).toEqual(["1700.00"]);
  });

  it("states the values of every row of every cell, in the order the page prints them", (): void => {
    document = documentFactory([
      [cellFactory([dateTokenFactory()])],
      [cellFactory([tokenFactory({text: "10", magnitude: 10, digits: 0})]), cellFactory([tokenFactory()])]
    ]);

    expect(literalsOfDocument(document)).toEqual({
      dates: ["2025-01-02"],
      times: [],
      numbers: ["10", "1700.00"]
    } satisfies DocumentLiterals);
  });

  it("states nothing for a page whose words carry no value", (): void => {
    document = documentFactory([[cellFactory([])]]);

    expect(literalsOfDocument(document)).toEqual({dates: [], times: [], numbers: []} satisfies DocumentLiterals);
  });

  it("states nothing for a document of no pages", (): void => {
    document = {pages: []};

    expect(literalsOfDocument(document)).toEqual({dates: [], times: [], numbers: []} satisfies DocumentLiterals);
  });
});
