import {RebasedDepotValue} from '../computed/rebased-depot-value.type';

type CashFlowBasedBenchmark = {
  mode: 'cashFlowBased'
  initialInvestment?: number
};

export type IntervalBasedBenchmark = {
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

export type SecurityCashFlowBasedBenchmark = CashFlowBasedBenchmark & {
  type: 'security'
  securityId: number
};

export type SecurityIntervalBasedBenchmark = IntervalBasedBenchmark & {
  type: 'security'
  securityId: number
};

export type SecurityLuckyInvestorBenchmark = {
  type: 'security'
  mode: 'luckyInvestor'
  securityId: number
  initialInvestment?: number
};

export type SecurityBenchmark = SecurityCashFlowBasedBenchmark | SecurityIntervalBasedBenchmark | SecurityLuckyInvestorBenchmark;

export type Benchmark = FixedInterestBenchmark | SecurityBenchmark;

/** The `<type>.<mode>` name of each benchmark variant in `B`. */
type ModeOf<B extends Benchmark> = B extends Benchmark ? `${B['type']}.${B['mode']}` : never;

export type FixedInterestBenchmarkMode = ModeOf<FixedInterestBenchmark>;

export type SecurityBenchmarkMode = ModeOf<SecurityBenchmark>;

export type BenchmarkMode = FixedInterestBenchmarkMode | SecurityBenchmarkMode;

export type BenchmarkResult = {
  name: string
  values: number[]
};

export type BenchmarkFunction<T extends Benchmark> = (benchmark: T, depotValues: RebasedDepotValue[]) => BenchmarkResult | [BenchmarkResult, BenchmarkResult];
