import {describe, expect, it} from "@jest/globals";
import {depotPositionFactory} from "../../../testing/depot-position.factory";
import {breakdownSecurityIds} from "./breakdown-security-ids";
import {PerformanceBreakdownDialogPosition} from "./performance-breakdown-dialog.component";

describe("breakdownSecurityIds", () => {
  it("returns the ids of the positions' securities, in position order", () => {
    const apple: PerformanceBreakdownDialogPosition = depotPositionFactory({securityIds: [1], displayName: "Apple Inc."});
    const microsoft: PerformanceBreakdownDialogPosition = depotPositionFactory({securityIds: [2], displayName: "Microsoft Corp."});

    expect(breakdownSecurityIds([apple, microsoft])).toEqual([apple.securityIds[0], microsoft.securityIds[0]]);
  });

  it("flattens a position carrying a security group into all of its member ids", () => {
    const group: PerformanceBreakdownDialogPosition = depotPositionFactory({securityIds: [3, 4], displayName: "Tech ETF"});

    expect(breakdownSecurityIds([group])).toEqual(group.securityIds);
  });

  it("returns undefined for an empty list", () => {
    expect(breakdownSecurityIds([])).toBeUndefined();
  });
});
