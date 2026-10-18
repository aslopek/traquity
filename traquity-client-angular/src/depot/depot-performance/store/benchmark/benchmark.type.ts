import {RebasedDepotValue} from '../computed/rebased-depot-value.type';

type CashFlowBasedBenchmark = {
  mode: 'cashFlowBased'
  initialInvestment?: number
};

type IntervalBasedBenchmark = {
  mode: 'intervalBased'
  initialInvestment?: number
  depositInterval: 'monthly'
  // 1 - 28
  depositDay: number;
  investmentPerInterval: number | 'reinvestCashFlow'
};

export type FixedInterestBenchmark = (CashFlowBasedBenchmark | IntervalBasedBenchmark) & {
  type: 'fixedInterest'
  interestPerYear: number
  daysPerYear: 360 | 365
  yieldInterval: 'monthly' | 'quarterly' | 'annually'
};

export type Benchmark = FixedInterestBenchmark;

export type BenchmarkResult = {
  name: string
  values: number[]
};

export type BenchmarkFunction<T extends Benchmark> = (benchmark: T, depotValues: RebasedDepotValue[]) => BenchmarkResult | [BenchmarkResult, BenchmarkResult];
