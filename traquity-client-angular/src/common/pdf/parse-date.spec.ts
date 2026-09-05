import {describe, expect, it} from "@jest/globals";
import {parseDate} from "./parse-date";

describe("parseDate", (): void => {

  it("reads a German date as an ISO one", (): void => {
    expect(parseDate("14.03.2024")).toBe("2024-03-14");
  });

  it("pads a single-digit day and month", (): void => {
    expect(parseDate("2.1.2025")).toBe("2025-01-02");
  });

  it("ignores surrounding whitespace", (): void => {
    expect(parseDate("  15.05.2025  ")).toBe("2025-05-15");
  });

  describe("what is not a date", (): void => {

    it("refuses a two-digit year", (): void => {
      expect(parseDate("14.03.24")).toBeNull();
    });

    it("refuses an ISO date, which this notation does not cover", (): void => {
      expect(parseDate("2024-03-14")).toBeNull();
    });

    it("refuses a month above twelve", (): void => {
      expect(parseDate("14.13.2024")).toBeNull();
    });

    it("refuses a day above thirty-one", (): void => {
      expect(parseDate("32.03.2024")).toBeNull();
    });

    it("refuses a zero day", (): void => {
      expect(parseDate("0.03.2024")).toBeNull();
    });

    it("refuses an amount", (): void => {
      expect(parseDate("1.005,00")).toBeNull();
    });
  });

  it("accepts a day the calendar does not have, since the document printed it", (): void => {
    expect(parseDate("31.02.2024")).toBe("2024-02-31");
  });
});
