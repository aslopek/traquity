import {describe, expect, it} from "@jest/globals";
import {parseTime} from "./parse-time";

describe("parseTime", (): void => {

  it("reads a time printed with seconds", (): void => {
    expect(parseTime("14:05:00")).toBe("14:05:00");
  });

  it("reads a time printed without seconds on the full minute", (): void => {
    expect(parseTime("20:56")).toBe("20:56:00");
  });

  it("pads a single-digit hour", (): void => {
    expect(parseTime("9:05")).toBe("09:05:00");
  });

  it("ignores surrounding whitespace", (): void => {
    expect(parseTime("  11:48:44  ")).toBe("11:48:44");
  });

  describe("precision below a second", (): void => {

    it("drops the hundredths printed behind a fourth colon", (): void => {
      expect(parseTime("17:28:43:27")).toBe("17:28:43");
    });

    it("drops milliseconds printed behind a decimal point", (): void => {
      expect(parseTime("17:28:43.275")).toBe("17:28:43");
    });

    it("drops milliseconds printed behind a comma", (): void => {
      expect(parseTime("17:28:43,275")).toBe("17:28:43");
    });
  });

  describe("the 12-hour clock", (): void => {

    it("reads an afternoon time on the 24-hour clock", (): void => {
      expect(parseTime("4:30 PM")).toBe("16:30:00");
    });

    it("reads a morning time on the 24-hour clock", (): void => {
      expect(parseTime("4:30 AM")).toBe("04:30:00");
    });

    it("reads noon as the twelfth hour", (): void => {
      expect(parseTime("12:00 PM")).toBe("12:00:00");
    });

    it("reads midnight as the zeroth hour", (): void => {
      expect(parseTime("12:00 AM")).toBe("00:00:00");
    });

    it("reads a meridiem written in lower case and with dots", (): void => {
      expect(parseTime("4:30 p.m.")).toBe("16:30:00");
    });

    it("reads a meridiem printed against the digits", (): void => {
      expect(parseTime("4:30PM")).toBe("16:30:00");
    });

    it("refuses an hour the 12-hour clock does not have", (): void => {
      expect(parseTime("13:30 PM")).toBeNull();
    });

    it("refuses a zeroth hour, which that clock prints as twelve", (): void => {
      expect(parseTime("0:30 AM")).toBeNull();
    });
  });

  describe("what is not a time", (): void => {

    it("refuses an hour above twenty-three", (): void => {
      expect(parseTime("25:00")).toBeNull();
    });

    it("refuses a minute above fifty-nine", (): void => {
      expect(parseTime("12:60")).toBeNull();
    });

    it("refuses a second above fifty-nine", (): void => {
      expect(parseTime("12:30:60")).toBeNull();
    });

    it("refuses a single-digit minute", (): void => {
      expect(parseTime("12:5")).toBeNull();
    });

    it("refuses a date", (): void => {
      expect(parseTime("02.01.2025")).toBeNull();
    });

    it("refuses an amount", (): void => {
      expect(parseTime("1.005,00")).toBeNull();
    });
  });

  describe("what a page prints around a time", (): void => {

    it("reads a time set in brackets", (): void => {
      expect(parseTime("(14:05)")).toBe("14:05:00");
    });

    it("reads a time closing a sentence", (): void => {
      expect(parseTime("14:05.")).toBe("14:05:00");
    });

    it("reads a time behind the colon of its label", (): void => {
      expect(parseTime(":14:05")).toBe("14:05:00");
    });
  });
});
