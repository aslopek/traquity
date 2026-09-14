import {describe, expect, it} from "@jest/globals";
import {parseDate, readingsOfDate} from "./parse-date";

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

  describe("year last", (): void => {

    it("reads a date printed with slashes", (): void => {
      expect(parseDate("14/03/2024")).toBe("2024-03-14");
    });

    it("reads a date printed with hyphens", (): void => {
      expect(parseDate("14-03-2024")).toBe("2024-03-14");
    });

    it("reads the second number as the day where it is above twelve", (): void => {
      expect(parseDate("04/15/2024")).toBe("2024-04-15");
    });

    it("reads the first number as the day where both could be either", (): void => {
      expect(parseDate("03/04/2024")).toBe("2024-04-03");
    });

    it("refuses a date whose separators differ", (): void => {
      expect(parseDate("14.03/2024")).toBeNull();
    });
  });

  describe("year first", (): void => {

    it("reads an ISO date", (): void => {
      expect(parseDate("2024-03-14")).toBe("2024-03-14");
    });

    it("reads a year-first date printed with slashes", (): void => {
      expect(parseDate("2024/03/14")).toBe("2024-03-14");
    });

    it("reads a year-first date printed with dots", (): void => {
      expect(parseDate("2024.03.14")).toBe("2024-03-14");
    });

    it("pads a single-digit day and month", (): void => {
      expect(parseDate("2024-3-4")).toBe("2024-03-04");
    });

    it("drops the time of an ISO timestamp", (): void => {
      expect(parseDate("2026-01-02T00:00:00Z")).toBe("2026-01-02");
    });
  });

  describe("two-digit year", (): void => {

    it("reads a year below the pivot as this century", (): void => {
      expect(parseDate("14.03.24")).toBe("2024-03-14");
    });

    it("reads the pivot itself as this century", (): void => {
      expect(parseDate("14.03.68")).toBe("2068-03-14");
    });

    it("reads the year above the pivot as the last century", (): void => {
      expect(parseDate("14.03.69")).toBe("1969-03-14");
    });

    it("reads the highest year as the last century", (): void => {
      expect(parseDate("14.03.99")).toBe("1999-03-14");
    });

    it("refuses a three-digit year", (): void => {
      expect(parseDate("14.03.202")).toBeNull();
    });
  });

  describe("a month spelled out", (): void => {

    it("reads a German month behind the day", (): void => {
      expect(parseDate("14. März 2024")).toBe("2024-03-14");
    });

    it("reads a German month transliterated", (): void => {
      expect(parseDate("14. Maerz 2024")).toBe("2024-03-14");
    });

    it("reads a month printed in capitals", (): void => {
      expect(parseDate("14. MÄRZ 2024")).toBe("2024-03-14");
    });

    it("reads an English month behind an ordinal day", (): void => {
      expect(parseDate("14th March 2024")).toBe("2024-03-14");
    });

    it("reads an abbreviated month between hyphens", (): void => {
      expect(parseDate("14-Mar-24")).toBe("2024-03-14");
    });

    it("reads the four-letter abbreviation of September", (): void => {
      expect(parseDate("14. Sept 2024")).toBe("2024-09-14");
    });

    it("reads a month in front of the day", (): void => {
      expect(parseDate("March 14, 2024")).toBe("2024-03-14");
    });

    it("reads an abbreviated month in front of the day", (): void => {
      expect(parseDate("Mar-14-24")).toBe("2024-03-14");
    });

    it("refuses a month and a year with no day between them", (): void => {
      expect(parseDate("Mai 2024")).toBeNull();
    });

    it("refuses a word that names no month", (): void => {
      expect(parseDate("14-Mai2-2024")).toBeNull();
    });
  });

  describe("what is not a date", (): void => {

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

    it("refuses a number printed with a decimal point", (): void => {
      expect(parseDate("2.4181")).toBeNull();
    });

    it("refuses a reference number of three groups", (): void => {
      expect(parseDate("143/107/0400")).toBeNull();
    });

    it("refuses eight digits in a row, which are a number more often than a date", (): void => {
      expect(parseDate("20240314")).toBeNull();
    });

    it("refuses plain text", (): void => {
      expect(parseDate("Zahlbarkeitstag")).toBeNull();
    });
  });

  describe("a day of the calendar", (): void => {

    it("refuses a day the month does not have", (): void => {
      expect(parseDate("31.02.2024")).toBeNull();
    });

    it("accepts the leap day of a leap year", (): void => {
      expect(parseDate("29.02.2024")).toBe("2024-02-29");
    });

    it("refuses the leap day of a year that has none", (): void => {
      expect(parseDate("29.02.2025")).toBeNull();
    });

    it("accepts the last day of a thirty-day month", (): void => {
      expect(parseDate("30.04.2024")).toBe("2024-04-30");
    });

    it("refuses a thirty-first of a thirty-day month", (): void => {
      expect(parseDate("31.04.2024")).toBeNull();
    });
  });

  describe("what a page prints around a date", (): void => {

    it("reads a date closing a bracket", (): void => {
      expect(parseDate("24.06.2026)")).toBe("2026-06-24");
    });

    it("reads a date inside brackets", (): void => {
      expect(parseDate("(24.06.2026)")).toBe("2026-06-24");
    });

    it("reads a date closing a sentence", (): void => {
      expect(parseDate("24.06.2026.")).toBe("2026-06-24");
    });

    it("reads a date behind the colon of its label", (): void => {
      expect(parseDate(":24.06.2026")).toBe("2026-06-24");
    });
  });
});

describe("readingsOfDate", (): void => {

  it("reports the one reading of a date whose day is above twelve", (): void => {
    expect(readingsOfDate("14/03/2024")).toEqual(["2024-03-14"]);
  });

  it("reports both readings of a slashed date, the day-first one ahead", (): void => {
    expect(readingsOfDate("03/04/2024")).toEqual(["2024-04-03", "2024-03-04"]);
  });

  it("reports both readings of a hyphenated date", (): void => {
    expect(readingsOfDate("03-04-2024")).toEqual(["2024-04-03", "2024-03-04"]);
  });

  it("reports the day-first reading alone for a date printed with dots, which no locale writes month first", () => {
    expect(readingsOfDate("03.04.2024")).toEqual(["2024-04-03"]);
  });

  it("drops the reading the calendar refuses", (): void => {
    expect(readingsOfDate("04/15/2024")).toEqual(["2024-04-15"]);
  });

  it("reports one reading where both orders name the same day", (): void => {
    expect(readingsOfDate("03/03/2024")).toEqual(["2024-03-03"]);
  });

  it("reports nothing for a word that is no date", (): void => {
    expect(readingsOfDate("Zahlbarkeitstag")).toEqual([]);
  });
});
