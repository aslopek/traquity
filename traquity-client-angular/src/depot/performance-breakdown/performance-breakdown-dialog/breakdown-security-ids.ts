import {PerformanceBreakdownDialogPosition} from './performance-breakdown-dialog.component';

export function breakdownSecurityIds(depotPositions: PerformanceBreakdownDialogPosition[]): number[] | undefined {
  return depotPositions.length === 0 ? undefined : depotPositions.flatMap((position: PerformanceBreakdownDialogPosition): number[] =>
    position.securityIds);
}
