import {beforeEach, describe, expect, it, jest} from "@jest/globals";
import {getDocument} from "pdfjs-dist";
import {extractPdf, PdfExtractionBounds, PdfExtractionResult} from "./extract-pdf";
import {PdfDocument} from "./pdf-document.type";
import {PdfTextItem} from "./runs-of-text-content";

jest.mock("pdfjs-dist", (): unknown => ({getDocument: jest.fn()}));

type PageStub = {
  getViewport: (options: { scale: number }) => { width: number, height: number }
  getTextContent: () => Promise<{ items: PdfTextItem[] }>
};

type LoadingTaskStub = {
  promise: Promise<{ numPages: number, getPage: (pageNumber: number) => Promise<PageStub> }>
  destroy: () => Promise<void>
};

type GetDocumentStub = (options: unknown) => LoadingTaskStub;

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

function bytesOf(content: string): ArrayBuffer {
  return new TextEncoder().encode(content).buffer as ArrayBuffer;
}

describe("extractPdf", (): void => {

  let getDocumentMock: jest.Mock<GetDocumentStub>;
  let destroy: jest.Mock<() => Promise<void>>;
  let bytes: ArrayBuffer;
  let bounds: PdfExtractionBounds;
  let itemsByPage: PdfTextItem[][];

  /** Installs a document over `itemsByPage`, one page per entry, so a test states its pages and nothing else. */
  function stubDocument(): void {
    getDocumentMock.mockReturnValue({
      destroy,
      promise: Promise.resolve({
        numPages: itemsByPage.length,
        getPage: (pageNumber: number): Promise<PageStub> => Promise.resolve({
          getViewport: (): { width: number, height: number } => ({width: 595, height: PAGE_HEIGHT}),
          getTextContent: (): Promise<{ items: PdfTextItem[] }> => Promise.resolve({items: itemsByPage[pageNumber - 1]}),
        }),
      }),
    });
  }

  beforeEach((): void => {
    destroy = jest.fn<() => Promise<void>>(async (): Promise<void> => undefined);
    getDocumentMock = getDocument as unknown as jest.Mock<GetDocumentStub>;
    getDocumentMock.mockReset();

    bytes = bytesOf("%PDF-1.7 ...");
    bounds = {maximumPages: 50, maximumRuns: 1000, milliseconds: 30_000, now: (): number => 0};
    itemsByPage = [[itemFactory(), itemFactory({str: "1.005,00", transform: [10, 0, 0, 10, 300, 412.5]})]];
    stubDocument();
  });

  it("produces one page carrying the row the items stood on", async (): Promise<void> => {
    const result: PdfExtractionResult = await extractPdf(bytes, bounds);

    expect(result).toEqual({
      status: "extracted",
      document: {
        pages: [{
          number: 1,
          width: 595,
          height: PAGE_HEIGHT,
          empty: false,
          rows: [{
            y: PAGE_HEIGHT - 412.5,
            cells: [
              {text: "Kurswert", x: 70.8, width: 44.2, height: 10, tokens: []},
              {
                text: "1.005,00",
                x: 300,
                width: 44.2,
                height: 10,
                tokens: [{text: "1.005,00", label: null, number: 1005, digits: 2, last: true}],
              },
            ],
          }],
        }],
      } satisfies PdfDocument,
    });
  });

  it("passes the bytes to pdf.js", async (): Promise<void> => {
    await extractPdf(bytes, bounds);

    expect(getDocumentMock).toHaveBeenCalledWith({
      data: new Uint8Array(bytes),
      useSystemFonts: true,
    });
    expect(getDocumentMock).toHaveBeenCalledTimes(1);
  });

  it("releases the loading task", async (): Promise<void> => {
    await extractPdf(bytes, bounds);

    expect(destroy).toHaveBeenCalledWith();
    expect(destroy).toHaveBeenCalledTimes(1);
  });

  it("reads every page of a document", async (): Promise<void> => {
    itemsByPage = [[itemFactory()], [itemFactory({str: "Seite 2"})]];
    stubDocument();

    const result: PdfExtractionResult = await extractPdf(bytes, bounds);

    expect(result.status === "extracted" && result.document.pages.map((page): number => page.number)).toEqual([1, 2]);
  });

  it("reports a page whose text layer holds no runs as empty", async (): Promise<void> => {
    itemsByPage = [[itemFactory()], []];
    stubDocument();

    const result: PdfExtractionResult = await extractPdf(bytes, bounds);

    expect(result.status === "extracted" && result.document.pages.map((page): boolean => page.empty))
      .toEqual([false, true]);
  });

  describe("refusals", (): void => {

    it("refuses bytes carrying no PDF header, without reaching pdf.js", async (): Promise<void> => {
      bytes = bytesOf("date;amount\n2025-01-02;11.00");

      const result: PdfExtractionResult = await extractPdf(bytes, bounds);

      expect(result).toEqual({status: "failed", failure: {reason: "notAPdf"}});
      expect(getDocumentMock).not.toHaveBeenCalled();
    });

    it("refuses a document pdf.js cannot open, naming what it said", async (): Promise<void> => {
      getDocumentMock.mockReturnValue({destroy, promise: Promise.reject(new Error("Invalid PDF structure."))});

      const result: PdfExtractionResult = await extractPdf(bytes, bounds);

      expect(result).toEqual({status: "failed", failure: {reason: "unreadable", message: "Invalid PDF structure."}});
    });

    it("releases the loading task of a document it could not open", async (): Promise<void> => {
      getDocumentMock.mockReturnValue({destroy, promise: Promise.reject(new Error("Invalid PDF structure."))});

      await extractPdf(bytes, bounds);

      expect(destroy).toHaveBeenCalledWith();
      expect(destroy).toHaveBeenCalledTimes(1);
    });

    it("refuses a document whose every page is empty", async (): Promise<void> => {
      itemsByPage = [[], []];
      stubDocument();

      const result: PdfExtractionResult = await extractPdf(bytes, bounds);

      expect(result).toEqual({status: "failed", failure: {reason: "noTextLayer"}});
    });

    it("refuses more pages than the bound allows, before reading any of them", async (): Promise<void> => {
      bounds = {...bounds, maximumPages: 1};
      itemsByPage = [[itemFactory()], [itemFactory()]];
      stubDocument();

      const result: PdfExtractionResult = await extractPdf(bytes, bounds);

      expect(result).toEqual({status: "failed", failure: {reason: "tooManyPages", pages: 2, maximum: 1}});
    });

    it("refuses more runs than the bound allows, counted across the document", async (): Promise<void> => {
      bounds = {...bounds, maximumRuns: 3};
      itemsByPage = [[itemFactory(), itemFactory()], [itemFactory(), itemFactory()]];
      stubDocument();

      const result: PdfExtractionResult = await extractPdf(bytes, bounds);

      expect(result).toEqual({status: "failed", failure: {reason: "tooManyRuns", maximum: 3}});
    });

    it("refuses a document that outlives its time budget", async (): Promise<void> => {
      const elapsing: number[] = [0, 31_000];
      bounds = {...bounds, now: (): number => elapsing.shift() ?? 31_000};

      const result: PdfExtractionResult = await extractPdf(bytes, bounds);

      expect(result).toEqual({status: "failed", failure: {reason: "outOfTime", milliseconds: 30_000}});
    });
  });
});
