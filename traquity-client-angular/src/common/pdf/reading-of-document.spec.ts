import {beforeEach, describe, expect, it, jest} from "@jest/globals";
import {isinOfDocument} from "./isin-of-document";
import {DocumentToken, tokensOfDocument} from "./tokens-of-document";
import {PdfDocument} from "./pdf-document.type";
import {readingOfDocument} from "./reading-of-document";
import {renderPdfDocument} from "./render-pdf-document";

jest.mock("./render-pdf-document", (): unknown => ({renderPdfDocument: jest.fn()}));
jest.mock("./tokens-of-document", (): unknown => ({tokensOfDocument: jest.fn()}));
jest.mock("./isin-of-document", (): unknown => ({isinOfDocument: jest.fn()}));

type RenderPdfDocument = (document: PdfDocument, options?: unknown) => string;
type TokensOfDocument = (document: PdfDocument) => DocumentToken[];
type IsinOfDocument = (document: PdfDocument) => string | undefined;

const TEXT: string = "Kurswert  |  1.700,00 EUR";
const TOKENS: DocumentToken[] = [{id: 1, kind: "number", text: "1.700,00", value: "1700.00", label: "Kurswert"}];
const ISIN: string = "DE000MUSTR14";

describe("readingOfDocument", (): void => {

  let renderPdfDocumentMock: jest.Mock<RenderPdfDocument>;
  let tokensOfDocumentMock: jest.Mock<TokensOfDocument>;
  let isinOfDocumentMock: jest.Mock<IsinOfDocument>;
  let document: PdfDocument;

  beforeEach((): void => {
    renderPdfDocumentMock = renderPdfDocument as unknown as jest.Mock<RenderPdfDocument>;
    renderPdfDocumentMock.mockReset();
    renderPdfDocumentMock.mockReturnValue(TEXT);
    tokensOfDocumentMock = tokensOfDocument as unknown as jest.Mock<TokensOfDocument>;
    tokensOfDocumentMock.mockReset();
    tokensOfDocumentMock.mockReturnValue(TOKENS);
    isinOfDocumentMock = isinOfDocument as unknown as jest.Mock<IsinOfDocument>;
    isinOfDocumentMock.mockReset();
    isinOfDocumentMock.mockReturnValue(ISIN);

    document = {pages: []};
  });

  it("states the text, the tokens and the security together", (): void => {
    expect(readingOfDocument(document)).toEqual({text: TEXT, tokens: TOKENS, isin: ISIN});
  });

  it("renders the document as text", (): void => {
    readingOfDocument(document);

    expect(renderPdfDocumentMock).toHaveBeenCalledWith(document);
    expect(renderPdfDocumentMock).toHaveBeenCalledTimes(1);
  });

  it("reads all three off the one document it was given", (): void => {
    readingOfDocument(document);

    expect(tokensOfDocumentMock).toHaveBeenCalledWith(document);
    expect(tokensOfDocumentMock).toHaveBeenCalledTimes(1);
    expect(isinOfDocumentMock).toHaveBeenCalledWith(document);
    expect(isinOfDocumentMock).toHaveBeenCalledTimes(1);
  });

  it("states no security where the page names none", (): void => {
    isinOfDocumentMock.mockReturnValue(undefined);

    expect(readingOfDocument(document).isin).toBeUndefined();
  });
});
