import {computed, Signal} from "@angular/core";
import {SecurityCreate, SecurityType} from "../../../../../gen/api/security";
import {NewSecurityRow} from "./new-security-rows";

export function newSecurities(newSecurityRowsSignal: Signal<NewSecurityRow[]>): Signal<SecurityCreate[]> {
  return computed((): SecurityCreate[] => newSecurityRowsSignal().map((row: NewSecurityRow): SecurityCreate => {
    const typed: string = row.typedName.trim();
    return {
      isin: row.isin,
      name: typed.length > 0 ? typed : row.isin,
      symbols: [],
      securityType: SecurityType.STOCK
    };
  }));
}
