import {Timespan} from "../../../../common/types/timespan";
import {Dividends, DividendsByYear} from "../../../../gen/api/depot-dividend";

export type MonthlyAggregatedDividends = {
  year: number
  aggregated: [number, number, number, number, number, number, number, number, number, number, number, number];
};

export type QuarterlyAggregatedDividends = {
  year: number
  aggregated: [number, number, number, number]
};

export type YearlyAggregatedDividends = {
  year: number
  aggregated: [number]
};

export type AggregatedDividends = {
  years: number[]
} & ({
  timespan: 'month'
  slices: MonthlyAggregatedDividends[]
} | {
  timespan: 'quarter'
  slices: QuarterlyAggregatedDividends[]
} | {
  timespan: 'year'
  slices: YearlyAggregatedDividends[]
})

export function getAggregatedDividends(dividends: Dividends | null, aggregationTimespan: Timespan, useGrossValues: boolean): AggregatedDividends {
  if (dividends == null) {
    return {
      years: [],
      timespan: aggregationTimespan,
      slices: []
    };
  }

  if (aggregationTimespan === 'month') {
    const years: number[] = getYears(dividends, 5);
    return {
      years,
      timespan: 'month',
      slices: aggregateByMonth(dividends, useGrossValues, years)
    };
  } else if (aggregationTimespan === 'quarter') {
    const years: number[] = getYears(dividends, 5);
    return {
      years,
      timespan: 'quarter',
      slices: aggregateByQuarter(dividends, useGrossValues, years)
    };
  } else {
    return {
      years: getYears(dividends),
      timespan: 'year',
      slices: aggregateByYear(dividends, useGrossValues)
    };
  }
}

function aggregateByMonth(dividends: Dividends, useGrossValues: boolean, years: number[]): MonthlyAggregatedDividends[] {
  const result: MonthlyAggregatedDividends[] = [];
  const yearIndices: { [year: number]: number } = {};
  for (let i = 0; i < years.length; i++) {
    yearIndices[years[i]] = i;
    result.push({
      year: years[i],
      aggregated: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
    } satisfies MonthlyAggregatedDividends);
  }

  let summand: number;
  let yearIndex: number | undefined;
  let monthIndex: number;
  for (const month of dividends.byMonth) {
    yearIndex = yearIndices[month.year];
    if (yearIndex === undefined) {
      continue;
    }

    summand = useGrossValues ? month.sumGross : month.sumNet;
    monthIndex = month.month - 1;
    result[yearIndex].aggregated[monthIndex] += summand;
  }

  return result;
}

function aggregateByQuarter(dividends: Dividends, useGrossValues: boolean, years: number[]): QuarterlyAggregatedDividends[] {
  const result: QuarterlyAggregatedDividends[] = [];
  const yearIndices: { [year: number]: number } = {};
  for (let i = 0; i < years.length; i++) {
    yearIndices[years[i]] = i;
    result.push({
      year: years[i],
      aggregated: [0, 0, 0, 0]
    } satisfies QuarterlyAggregatedDividends);
  }

  let summand: number;
  let yearIndex: number;
  let quarterIndex: number;
  for (const quarter of dividends.byQuarter) {
    yearIndex = yearIndices[quarter.year];
    if (yearIndex === undefined) {
      continue;
    }

    summand = useGrossValues ? quarter.sumGross : quarter.sumNet;
    quarterIndex = quarter.quarter - 1;
    result[yearIndex].aggregated[quarterIndex] += summand;
  }

  return result;
}

function aggregateByYear(dividends: Dividends, useGrossValues: boolean): YearlyAggregatedDividends[] {
  const result: YearlyAggregatedDividends[] = [];

  for (const year of dividends.byYear) {
    result.push({
      year: year.year,
      aggregated: [useGrossValues ? year.sumGross : year.sumNet]
    } satisfies YearlyAggregatedDividends);
  }

  return result;
}

function getYears(dividends: Dividends, maxNumberOfYears?: number): number[] {
  const allYears: number[] = dividends.byYear.map((year: DividendsByYear): number => year.year).sort();
  if (maxNumberOfYears === undefined) {
    return allYears;
  }
  return allYears.slice(-maxNumberOfYears);
}
