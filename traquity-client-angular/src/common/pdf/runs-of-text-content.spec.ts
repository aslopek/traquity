import {beforeEach, describe, expect, it} from "@jest/globals";
import {PdfRun} from "./pdf-document.type";
import {PdfTextItem, runsOfTextContent} from "./runs-of-text-content";

const PAGE_HEIGHT: number = 842;

function itemFactory(overrides: Partial<PdfTextItem> = {}): PdfTextItem {
  return {
    str: "Kurswert",
    transform: [10, 0, 0, 10, 70.8, 412.5],
    width: 44.2,
    height: 10,
    fontName: "g_d0_f1",
    ...overrides,
  };
}

describe("runsOfTextContent", (): void => {

  let items: PdfTextItem[];

  beforeEach((): void => {
    items = [itemFactory()];
  });

  it("flips the y axis against the page height, so a smaller y is higher", (): void => {
    expect(runsOfTextContent(items, PAGE_HEIGHT)).toEqual([{
      text: items[0].str,
      x: items[0].transform[4],
      y: PAGE_HEIGHT - items[0].transform[5],
      width: items[0].width,
      height: items[0].height,
      fontName: items[0].fontName,
    }] satisfies PdfRun[]);
  });

  it("drops an item holding only whitespace", (): void => {
    items = [itemFactory({str: "   "})];
    expect(runsOfTextContent(items, PAGE_HEIGHT)).toEqual([]);
  });

  it("falls back to the transform's vertical scale where the font reports no height", (): void => {
    items = [itemFactory({height: 0, transform: [10, 0, 0, 12.5, 70.8, 412.5]})];
    expect(runsOfTextContent(items, PAGE_HEIGHT)[0].height).toBe(12.5);
  });

  it("falls back to a fixed height where neither the font nor the transform states one", (): void => {
    items = [itemFactory({height: 0, transform: [10, 0, 0, 0, 70.8, 412.5]})];
    expect(runsOfTextContent(items, PAGE_HEIGHT)[0].height).toBe(8);
  });

  describe("reading order", (): void => {

    beforeEach((): void => {
      items = [
        itemFactory({str: "lower", transform: [10, 0, 0, 10, 70.8, 400]}),
        itemFactory({str: "higher", transform: [10, 0, 0, 10, 70.8, 500]}),
      ];
    });

    it("sorts down the page", (): void => {
      expect(runsOfTextContent(items, PAGE_HEIGHT).map((run: PdfRun): string => run.text))
        .toEqual(["higher", "lower"]);
    });

    it("sorts left to right within one baseline", (): void => {
      items = [
        itemFactory({str: "right", transform: [10, 0, 0, 10, 300, 400]}),
        itemFactory({str: "left", transform: [10, 0, 0, 10, 70.8, 400]}),
      ];
      expect(runsOfTextContent(items, PAGE_HEIGHT).map((run: PdfRun): string => run.text))
        .toEqual(["left", "right"]);
    });
  });
});
