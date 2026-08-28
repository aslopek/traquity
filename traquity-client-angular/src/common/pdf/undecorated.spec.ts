import {describe, expect, it} from "@jest/globals";
import {undecorated} from "./undecorated";

describe("undecorated", (): void => {

  it("keeps a word that carries no decoration", (): void => {
    expect(undecorated("1.005,00")).toBe("1.005,00");
  });

  it("drops the bracket a value is set in", (): void => {
    expect(undecorated("(24.06.2026)")).toBe("24.06.2026");
  });

  it("drops a bracket that closes nothing", (): void => {
    expect(undecorated("24.06.2026)")).toBe("24.06.2026");
  });

  it("drops the colon behind a label", (): void => {
    expect(undecorated(":1.005,00")).toBe("1.005,00");
  });

  it("drops the full stop ending a sentence", (): void => {
    expect(undecorated("14:05.")).toBe("14:05");
  });

  it("drops the percent sign of a rate", (): void => {
    expect(undecorated("24,45%")).toBe("24,45");
  });

  it("keeps every separator between the first character and the last", (): void => {
    expect(undecorated("(1'005.00)")).toBe("1'005.00");
  });

  it("keeps a letter, which is no decoration but part of a word", (): void => {
    expect(undecorated("1.005,00EUR")).toBe("1.005,00EUR");
  });

  it("drops the booking sign along with the rest where it is not asked to be kept", (): void => {
    expect(undecorated("-264,60")).toBe("264,60");
  });

  it("keeps a leading booking sign where it is asked to", (): void => {
    expect(undecorated("-264,60", {keepSign: true})).toBe("-264,60");
  });

  it("keeps a trailing booking sign where it is asked to", (): void => {
    expect(undecorated("(264,60-)", {keepSign: true})).toBe("264,60-");
  });

  it("reports nothing for a word that is decoration throughout", (): void => {
    expect(undecorated(",")).toBe("");
  });
});
