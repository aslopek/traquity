import {describe, expect, it} from "@jest/globals";
import {signal, Signal} from "@angular/core";
import {SecurityType} from "../../../../../gen/api/security";
import {NewSecurityRow} from "./new-security-rows";
import {newSecurities} from "./new-securities";

describe("newSecurities", (): void => {
  it("names a security by the typed name, carrying no symbol, no wkn and no sector", (): void => {
    const rows: Signal<NewSecurityRow[]> = signal<NewSecurityRow[]>([
      {isin: "US0378331005", typedName: "Apple Inc."}
    ]);

    expect(newSecurities(rows)()).toEqual([
      {
        isin: "US0378331005",
        name: "Apple Inc.",
        symbols: [],
        securityType: SecurityType.STOCK
      }
    ]);
  });

  it("falls back to the ISIN for an empty typed name", (): void => {
    const rows: Signal<NewSecurityRow[]> = signal<NewSecurityRow[]>([{isin: "US0378331005", typedName: ""}]);

    expect(newSecurities(rows)()[0].name).toBe("US0378331005");
  });

  it("falls back to the ISIN for a blank typed name", (): void => {
    const rows: Signal<NewSecurityRow[]> = signal<NewSecurityRow[]>([{isin: "US0378331005", typedName: "   "}]);

    expect(newSecurities(rows)()[0].name).toBe("US0378331005");
  });
});
