import {beforeEach, describe, expect, it, jest} from "@jest/globals";
import {isinOfDocument} from "./isin-of-document";
import {DocumentLiterals, literalsOfDocument} from "./literals-of-document";
import {PdfDocument} from "./pdf-document.type";
import {readingOfDocument} from "./reading-of-document";
import {renderPdfDocument} from "./render-pdf-document";

jest.mock("./render-pdf-document", (): unknown => ({renderPdfDocument: jest.fn()}));
jest.mock("./literals-of-document", (): unknown => ({literalsOfDocument: jest.fn()}));
jest.mock("./isin-of-document", (): unknown => ({isinOfDocument: jest.fn()}));

type RenderPdfDocument = (document: PdfDocument, options?: unknown) => string;
type LiteralsOfDocument = (document: PdfDocument) => DocumentLiterals;
type IsinOfDocument = (document: PdfDocument) => string | undefined;

const TEXT: string = "Kurswert  |  1.700,00 EUR";
const LITERALS: DocumentLiterals = {dates: [], times: [], numbers: ["1700.00"]};
const ISIN: string = "DE000MUSTR14";

describe("readingOfDocument", (): void => {

  let renderPdfDocumentMock: jest.Mock<RenderPdfDocument>;
  let literalsOfDocumentMock: jest.Mock<LiteralsOfDocument>;
  let isinOfDocumentMock: jest.Mock<IsinOfDocument>;
  let document: PdfDocument;

  beforeEach((): void => {
    renderPdfDocumentMock = renderPdfDocument as unknown as jest.Mock<RenderPdfDocument>;
    renderPdfDocumentMock.mockReset();
    renderPdfDocumentMock.mockReturnValue(TEXT);
    literalsOfDocumentMock = literalsOfDocument as unknown as jest.Mock<LiteralsOfDocument>;
    literalsOfDocumentMock.mockReset();
    literalsOfDocumentMock.mockReturnValue(LITERALS);
    isinOfDocumentMock = isinOfDocument as unknown as jest.Mock<IsinOfDocument>;
    isinOfDocumentMock.mockReset();
    isinOfDocumentMock.mockReturnValue(ISIN);

    document = {pages: []};
  });

  it("states the text, the literals and the security together", (): void => {
    expect(readingOfDocument(document)).toEqual({text: TEXT, literals: LITERALS, isin: ISIN});
  });

  it("renders the text with the values read off the page appended", (): void => {
    readingOfDocument(document);

    expect(renderPdfDocumentMock).toHaveBeenCalledWith(document, {table: true});
    expect(renderPdfDocumentMock).toHaveBeenCalledTimes(1);
  });

  it("reads all three off the one document it was given", (): void => {
    readingOfDocument(document);

    expect(literalsOfDocumentMock).toHaveBeenCalledWith(document);
    expect(literalsOfDocumentMock).toHaveBeenCalledTimes(1);
    expect(isinOfDocumentMock).toHaveBeenCalledWith(document);
    expect(isinOfDocumentMock).toHaveBeenCalledTimes(1);
  });

  it("states no security where the page names none", (): void => {
    isinOfDocumentMock.mockReturnValue(undefined);

    expect(readingOfDocument(document).isin).toBeUndefined();
  });
});
