import {describe, expect, it} from "@jest/globals";
import {isPdf} from "./imported-file";

describe("isPdf", (): void => {
  it("accepts a file stating the PDF mime type", (): void => {
    expect(isPdf({name: "statement", type: "application/pdf"})).toBe(true);
  });

  it("accepts a .pdf name whose type is empty, as a chooser leaves it", (): void => {
    expect(isPdf({name: "Statement.PDF", type: ""})).toBe(true);
  });

  it("refuses a file naming neither", (): void => {
    expect(isPdf({name: "statement.csv", type: "text/csv"})).toBe(false);
  });
});
