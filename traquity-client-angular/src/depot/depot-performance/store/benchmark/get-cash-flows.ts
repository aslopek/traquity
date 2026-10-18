import {RebasedDepotValue} from '../computed/rebased-depot-value.type';

export type CashFlow = {
  date: string
  cashFlow: number
};

export function getCashFlows(depotValues: RebasedDepotValue[]): CashFlow[] {
  const cashFlows: CashFlow[] = [];
  if (depotValues.length === 0) {
    return cashFlows;
  }

  cashFlows.push({
    date: depotValues[0].date,
    cashFlow: 0
  });

  let delta: number;
  for (let i = 1; i < depotValues.length; i++) {
    delta = depotValues[i].investedCapital - depotValues[i - 1].investedCapital;
    if (delta > 0) {
      cashFlows.push({
        date: depotValues[i].date,
        cashFlow: delta
      });
    }
  }
  return cashFlows;
}