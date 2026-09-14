import {beforeEach, describe, expect, it} from "@jest/globals";
import {classifyCells} from "./classify-cells";
import {PdfCell, PdfCellBox} from "./pdf-document.type";

function cellFactory(overrides: Partial<PdfCellBox> = {}): PdfCellBox {
  return {
    text: "Kurswert 1.005,00",
    x: 70.8,
    width: 120,
    height: 10,
    ...overrides
  };
}

describe("classifyCells", (): void => {
  let cells: PdfCellBox[];
  let currency: string;

  beforeEach((): void => {
    cells = [cellFactory()];
    currency = "EUR";
  });

  it("reads a number and the words in front of it as its label", (): void => {
    expect(classifyCells(cells, currency)).toEqual([{
      ...cells[0],
      tokens: [{text: "1.005,00", label: "Kurswert", magnitude: 1005, digits: 2, last: true}],
    }] satisfies PdfCell[]);
  });

  it("reports no label for a token opening its cell", (): void => {
    cells = [cellFactory({text: "1.005,00"})];
    expect(classifyCells(cells, currency)).toEqual([{
      ...cells[0],
      tokens: [{text: "1.005,00", label: null, magnitude: 1005, digits: 2, last: true}]
    }] satisfies PdfCell[]);
  });

  it("keeps an amount whose thousands a no-break space groups as one word", (): void => {
    cells = [cellFactory({text: `Kurswert 1${"\u00A0"}005,00`})];
    expect(classifyCells(cells, currency)).toEqual([{
      ...cells[0],
      tokens: [{text: `1${"\u00A0"}005,00`, label: "Kurswert", magnitude: 1005, digits: 2, last: true}]
    }] satisfies PdfCell[]);
  });

  it("produces no token for a cell of plain text", (): void => {
    cells = [cellFactory({text: "Ausmachender Betrag"})];
    expect(classifyCells(cells, currency)).toEqual([
      {...cells[0], tokens: []}
    ] satisfies PdfCell[]);
  });

  it("marks a token that does not close its cell", (): void => {
    cells = [cellFactory({text: "Kurs 44,40 pro Stueck"})];
    expect(classifyCells(cells, currency)).toEqual([{
      ...cells[0],
      tokens: [{text: "44,40", label: "Kurs", magnitude: 44.4, digits: 2, last: false}]
    }] satisfies PdfCell[]);
  });

  it("reports the booking direction printed behind an amount", (): void => {
    cells = [cellFactory({text: "Provision 10,00-"})];
    expect(classifyCells(cells, currency)).toEqual([{
      ...cells[0],
      tokens: [
        {text: "10,00-", label: "Provision", magnitude: 10, digits: 2, sign: "-", last: true}
      ]
    }] satisfies PdfCell[]);
  });

  it("reports the booking direction printed in front of an amount", (): void => {
    cells = [cellFactory({text: "Abgeltungssteuer -264,60"})];
    expect(classifyCells(cells, currency)).toEqual([{
      ...cells[0],
      tokens: [
        {text: "-264,60", label: "Abgeltungssteuer", magnitude: 264.6, digits: 2, sign: "-", last: true}
      ]
    }] satisfies PdfCell[]);
  });

  it("reports a booking direction printed as a word of its own", (): void => {
    cells = [cellFactory({text: "Abgeltungssteuer - 264,60"})];
    expect(classifyCells(cells, currency)).toEqual([{
      ...cells[0],
      tokens: [
        {text: "264,60", label: "Abgeltungssteuer", magnitude: 264.6, digits: 2, sign: "-", last: true}
      ]
    }] satisfies PdfCell[]);
  });

  it("keeps the currency and the sign in front of an amount out of its label", (): void => {
    cells = [cellFactory({text: "Ausmachender Betrag EUR - 264,60"})];
    expect(classifyCells(cells, currency)).toEqual([{
      ...cells[0],
      tokens: [
        {text: "264,60", label: "Ausmachender Betrag", magnitude: 264.6, digits: 2, sign: "-", currency: "EUR", last: true}
      ]
    }] satisfies PdfCell[]);
  });

  it("reports a booking direction printed as a word of its own behind an amount", (): void => {
    cells = [cellFactory({text: "US-Quellensteuer 0,58 -"})];
    expect(classifyCells(cells, currency)).toEqual([{
      ...cells[0],
      tokens: [{text: "0,58", label: "US-Quellensteuer", magnitude: 0.58, digits: 2, sign: "-", last: true}],
    }] satisfies PdfCell[]);
  });

  it("reads a sign standing between two numbers as neither one's direction", (): void => {
    cells = [cellFactory({text: "Telefon 04106 - 708"})];
    expect(classifyCells(cells, currency)).toEqual([{
      ...cells[0],
      tokens: [
        {text: "04106", label: "Telefon", magnitude: 4106, digits: 0, last: false},
        {text: "708", label: "Telefon 04106 -", magnitude: 708, digits: 0, last: true}
      ]
    }] satisfies PdfCell[]);
  });

  it("reads a date", (): void => {
    cells = [cellFactory({text: "Zahlbarkeitstag 02.01.2025"})];
    expect(classifyCells(cells, currency)).toEqual([{
      ...cells[0],
      tokens: [{text: "02.01.2025", label: "Zahlbarkeitstag", date: "2025-01-02", last: true}]
    }] satisfies PdfCell[]);
  });

  it("reads a date printed across three words", (): void => {
    cells = [cellFactory({text: "Zahlbarkeitstag 2. Januar 2025"})];
    expect(classifyCells(cells, currency)).toEqual([{
      ...cells[0],
      tokens: [{text: "2. Januar 2025", label: "Zahlbarkeitstag", date: "2025-01-02", last: true}]
    }] satisfies PdfCell[]);
  });

  it("reads the day of a spelled-out date as no number of its own", (): void => {
    cells = [cellFactory({text: "January 2, 2025 Valuta"})];
    expect(classifyCells(cells, currency)).toEqual([{
      ...cells[0],
      tokens: [{text: "January 2, 2025", label: null, date: "2025-01-02", last: false}]
    }] satisfies PdfCell[]);
  });

  it("reads a number behind a date as a token of its own", (): void => {
    cells = [cellFactory({text: "Valuta 02.01.2025 42"})];
    expect(classifyCells(cells, currency)).toEqual([{
      ...cells[0],
      tokens: [
        {text: "02.01.2025", label: "Valuta", date: "2025-01-02", last: false},
        {text: "42", label: "Valuta 02.01.2025", magnitude: 42, digits: 0, last: true}
      ]
    }] satisfies PdfCell[]);
  });

  it("reads a time", (): void => {
    cells = [cellFactory({text: "Handelszeit 14:05:00"})];
    expect(classifyCells(cells, currency)).toEqual([{
      ...cells[0],
      tokens: [{text: "14:05:00", label: "Handelszeit", time: "14:05:00", last: true}]
    }] satisfies PdfCell[]);
  });

  it("reads a time printed without seconds", (): void => {
    cells = [cellFactory({text: "Handelszeit 20:56 Uhr"})];
    expect(classifyCells(cells, currency)).toEqual([{
      ...cells[0],
      tokens: [{text: "20:56", label: "Handelszeit", time: "20:56:00", last: false}]
    }] satisfies PdfCell[]);
  });

  it("reads an execution time printed to the hundredth of a second", (): void => {
    cells = [cellFactory({text: "17:28:43:27"})];
    expect(classifyCells(cells, currency)).toEqual([{
      ...cells[0],
      tokens: [{text: "17:28:43:27", label: null, time: "17:28:43", last: true}]
    }] satisfies PdfCell[]);
  });

  it("takes in the meridiem printed behind a time as a word of its own", (): void => {
    cells = [cellFactory({text: "Handelszeit 4:30 PM"})];
    expect(classifyCells(cells, currency)).toEqual([{
      ...cells[0],
      tokens: [{text: "4:30", label: "Handelszeit", time: "16:30:00", last: true}]
    }] satisfies PdfCell[]);
  });

  it("takes in a meridiem printed a wide gap behind the time, in the next cell", (): void => {
    cells = [
      cellFactory({text: "Handelszeit 4:30"}),
      cellFactory({text: "PM", x: 400})
    ];
    expect(classifyCells(cells, currency)).toEqual([
      {...cells[0], tokens: [{text: "4:30", label: "Handelszeit", time: "16:30:00", last: true}]},
      {...cells[1], tokens: []}
    ] satisfies PdfCell[]);
  });

  it("reads the German word in front of a date as no meridiem of the time before it", (): void => {
    cells = [cellFactory({text: "Handelszeit 12:30 am 05.02.2021"})];
    expect(classifyCells(cells, currency)).toEqual([{
      ...cells[0],
      tokens: [
        {text: "12:30", label: "Handelszeit", time: "12:30:00", last: false},
        {text: "05.02.2021", label: "Handelszeit 12:30 am", date: "2021-02-05", last: true}
      ],
    }] satisfies PdfCell[]);
  });

  it("produces a token per number in a cell", (): void => {
    cells = [cellFactory({text: "Stueck 42 zu 23,95"})];
    expect(classifyCells(cells, currency)).toEqual([{
      ...cells[0],
      tokens: [
        {text: "42", label: "Stueck", magnitude: 42, digits: 0, last: false},
        {text: "23,95", label: "Stueck 42 zu", magnitude: 23.95, digits: 2, last: true}
      ],
    }] satisfies PdfCell[]);
  });

  describe("currency", (): void => {
    it("is taken from the word behind the amount in the same cell", (): void => {
      cells = [cellFactory({text: "Kurswert 1.005,00 EUR"})];
      expect(classifyCells(cells, currency)).toEqual([{
        ...cells[0],
        tokens: [{text: "1.005,00", label: "Kurswert", magnitude: 1005, digits: 2, currency: "EUR", last: false}]
      }] satisfies PdfCell[]);
    });

    it("is taken from the next cell where the amount closes its own", (): void => {
      cells = [
        cellFactory({text: "Provision 10,00-"}),
        cellFactory({text: "EUR", x: 400})
      ];
      expect(classifyCells(cells, currency)).toEqual([
        {
          ...cells[0],
          tokens: [{
            text: "10,00-", label: "Provision", magnitude: 10, digits: 2, sign: "-", currency: "EUR", last: true
          }],
        },
        {...cells[1], tokens: []},
      ] satisfies PdfCell[]);
    });

    it("is taken from the word in front of the amount in the same cell", (): void => {
      cells = [
        cellFactory({text: "Dividende EUR 2,87 p.STK"})
      ];
      expect(classifyCells(cells, currency)).toEqual([{
        ...cells[0],
        tokens: [{text: "2,87", label: "Dividende", magnitude: 2.87, digits: 2, currency: "EUR", last: false}]
      }] satisfies PdfCell[]);
    });

    it("is taken from the previous cell where the amount opens its own", (): void => {
      cells = [
        cellFactory({text: "Veraeusserungsergebnis"}),
        cellFactory({text: "EUR", x: 300}),
        cellFactory({text: "-264,60", x: 400}),
      ];
      expect(classifyCells(cells, currency)).toEqual([
        {...cells[0], tokens: []},
        {...cells[1], tokens: []},
        {
          ...cells[2],
          tokens: [{
            text: "-264,60", label: null, magnitude: 264.6, digits: 2, sign: "-", currency: "EUR", last: true
          }],
        },
      ] satisfies PdfCell[]);
    });

    it("is taken from behind a sign printed as a word of its own", (): void => {
      cells = [cellFactory({text: "17,36 - EUR"})];
      expect(classifyCells(cells, currency)).toEqual([{
        ...cells[0],
        tokens: [{
          text: "17,36", label: null, magnitude: 17.36, digits: 2, sign: "-", currency: "EUR", last: false
        }],
      }] satisfies PdfCell[]);
    });

    it("is kept out of the label where the code stands on either side of the amount", (): void => {
      cells = [cellFactory({text: "Zwischensumme EUR 550,00 EUR"})];
      expect(classifyCells(cells, currency)).toEqual([{
        ...cells[0],
        tokens: [{text: "550,00", label: "Zwischensumme", magnitude: 550, digits: 2, currency: "EUR", last: false}]
      }] satisfies PdfCell[]);
    });

    it("is not taken from a word that is not a three-letter code", (): void => {
      cells = [cellFactory({text: "Kurswert 1.005,00 Euro"})];
      expect(classifyCells(cells, currency)).toEqual([{
        ...cells[0],
        tokens: [{text: "1.005,00", label: "Kurswert", magnitude: 1005, digits: 2, last: false}]
      }] satisfies PdfCell[]);
    });

    it("is not taken from the unit in front of a quantity", (): void => {
      cells = [cellFactory({text: "STK 3"})];
      expect(classifyCells(cells, currency)).toEqual([{
        ...cells[0],
        tokens: [{text: "3", label: "STK", magnitude: 3, digits: 0, last: true}],
      }] satisfies PdfCell[]);
    });

    it("is not taken from the code behind a venue", (): void => {
      cells = [cellFactory({text: "Lagerstelle 2679 MIC"})];
      expect(classifyCells(cells, currency)).toEqual([{
        ...cells[0],
        tokens: [{text: "2679", label: "Lagerstelle", magnitude: 2679, digits: 0, last: false}],
      }] satisfies PdfCell[]);
    });

    it("is not attached to a date", (): void => {
      cells = [cellFactory({text: "Valuta 02.01.2025 EUR"})];
      expect(classifyCells(cells, currency)).toEqual([{
        ...cells[0],
        tokens: [{text: "02.01.2025", label: "Valuta", date: "2025-01-02", last: false}],
      }] satisfies PdfCell[]);
    });

    it("is not attached to a date it stands in front of", (): void => {
      cells = [cellFactory({text: "Valuta EUR 02.01.2025"})];
      expect(classifyCells(cells, currency)).toEqual([{
        ...cells[0],
        tokens: [{text: "02.01.2025", label: "Valuta EUR", date: "2025-01-02", last: true}],
      }] satisfies PdfCell[]);
    });

    describe("amounts read in a foreign currency", (): void => {

      beforeEach((): void => {
        currency = "USD";
      });

      it("is taken from the code the amounts are read in", (): void => {
        cells = [cellFactory({text: "Dividende 2,87 USD"})];
        expect(classifyCells(cells, currency)).toEqual([{
          ...cells[0],
          tokens: [{text: "2,87", label: "Dividende", magnitude: 2.87, digits: 2, currency: "USD", last: false}]
        }] satisfies PdfCell[]);
      });

      it("is not taken from a code other than the one the amounts are read in", (): void => {
        cells = [cellFactory({text: "Dividende 2,87 EUR"})];
        expect(classifyCells(cells, currency)).toEqual([{
          ...cells[0],
          tokens: [{text: "2,87", label: "Dividende", magnitude: 2.87, digits: 2, last: false}]
        }] satisfies PdfCell[]);
      });

      it("is not kept out of the label where a code other than that one stands in front of the amount", (): void => {
        cells = [cellFactory({text: "Dividende EUR 2,87"})];
        expect(classifyCells(cells, currency)).toEqual([{
          ...cells[0],
          tokens: [{text: "2,87", label: "Dividende EUR", magnitude: 2.87, digits: 2, last: true}]
        }] satisfies PdfCell[]);
      });
    });
  });
});
