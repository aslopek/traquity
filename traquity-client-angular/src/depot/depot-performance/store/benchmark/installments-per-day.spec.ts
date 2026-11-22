import {beforeEach, describe, expect, it, jest} from '@jest/globals';
import {addMonths, format, getMonth, getYear, parseISO, setDate, startOfMonth} from 'date-fns';
import {installmentsPerDay} from './installments-per-day';
import {IntervalBasedBenchmark} from './benchmark.type';
import {RebasedDepotValue} from '../computed/rebased-depot-value.type';
import {rebasedDepotValueFactory} from '../../../../testing/rebased-depot-value.factory';
import {getCashFlows} from './get-cash-flows';

jest.mock('./get-cash-flows', (): unknown => ({getCashFlows: jest.fn()}));
jest.mock('date-fns', (): unknown => ({
  addMonths: jest.fn(),
  format: jest.fn(),
  getMonth: jest.fn(),
  getYear: jest.fn(),
  parseISO: jest.fn(),
  setDate: jest.fn(),
  startOfMonth: jest.fn()
}));

type SavingsPlan = Pick<IntervalBasedBenchmark, 'depositDay' | 'investmentPerInterval'>;
type AddMonths = (date: Date, amount: number) => Date;
type Format = (date: Date, formatString: string) => string;
type GetMonth = (date: Date) => number;
type GetYear = (date: Date) => number;
type ParseISO = (date: string) => Date;
type SetDate = (date: Date, dayOfMonth: number) => Date;
type StartOfMonth = (date: Date) => Date;

describe('installmentsPerDay', (): void => {
  let savingsPlan: SavingsPlan;
  let depotValues: RebasedDepotValue[];
  let addMonthsMock: jest.Mock<AddMonths>;
  let formatMock: jest.Mock<Format>;
  let getMonthMock: jest.Mock<GetMonth>;
  let getYearMock: jest.Mock<GetYear>;
  let parseISOMock: jest.Mock<ParseISO>;
  let setDateMock: jest.Mock<SetDate>;
  let startOfMonthMock: jest.Mock<StartOfMonth>;

  function depotValuesOn(dates: string[]): RebasedDepotValue[] {
    return dates.map((date: string): RebasedDepotValue => rebasedDepotValueFactory({date}));
  }

  beforeEach((): void => {
    addMonthsMock = addMonths as unknown as jest.Mock<AddMonths>;
    addMonthsMock.mockReset();
    addMonthsMock.mockImplementation((date: Date, amount: number): Date =>
      new Date(date.getFullYear(), date.getMonth() + amount, date.getDate()));

    formatMock = format as unknown as jest.Mock<Format>;
    formatMock.mockReset();
    formatMock.mockImplementation((date: Date): string =>
      `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`);

    getMonthMock = getMonth as unknown as jest.Mock<GetMonth>;
    getMonthMock.mockReset();
    getMonthMock.mockImplementation((date: Date): number => date.getMonth());

    getYearMock = getYear as unknown as jest.Mock<GetYear>;
    getYearMock.mockReset();
    getYearMock.mockImplementation((date: Date): number => date.getFullYear());

    parseISOMock = parseISO as unknown as jest.Mock<ParseISO>;
    parseISOMock.mockReset();
    parseISOMock.mockImplementation((date: string): Date => new Date(`${date}T00:00`));

    setDateMock = setDate as unknown as jest.Mock<SetDate>;
    setDateMock.mockReset();
    setDateMock.mockImplementation((date: Date, dayOfMonth: number): Date => new Date(date.getFullYear(), date.getMonth(), dayOfMonth));

    startOfMonthMock = startOfMonth as unknown as jest.Mock<StartOfMonth>;
    startOfMonthMock.mockReset();
    startOfMonthMock.mockImplementation((date: Date): Date => new Date(date.getFullYear(), date.getMonth(), 1));

    savingsPlan = {
      depositDay: 15,
      investmentPerInterval: 100
    };
    depotValues = depotValuesOn(['2026-01-20', '2026-01-21', '2026-02-15', '2026-02-16']);

    jest.mocked(getCashFlows).mockReset();
  });

  it('invests each month on or after its deposit day', (): void => {
    expect(installmentsPerDay(savingsPlan, depotValues)).toEqual([100, 0, 100, 0]);
    expect(getCashFlows).not.toHaveBeenCalled();

    // the last and the first day give the months to invest
    expect(parseISOMock.mock.calls).toEqual([['2026-02-16'], ['2026-01-20']]);
    expect(startOfMonthMock.mock.calls).toEqual([[new Date(2026, 1, 16)], [new Date(2026, 0, 20)]]);
    // per month: its deposit day, the key it is invested under, the next month
    expect(setDateMock.mock.calls).toEqual([[new Date(2026, 0, 1), 15], [new Date(2026, 1, 1), 15]]);
    expect(formatMock.mock.calls).toEqual([[new Date(2026, 0, 15), 'yyyy-MM-dd'], [new Date(2026, 1, 15), 'yyyy-MM-dd']]);
    expect(getYearMock.mock.calls).toEqual([[new Date(2026, 0, 1)], [new Date(2026, 1, 1)]]);
    expect(getMonthMock.mock.calls).toEqual([[new Date(2026, 0, 1)], [new Date(2026, 1, 1)]]);
    expect(addMonthsMock.mock.calls).toEqual([[new Date(2026, 0, 1), 1], [new Date(2026, 1, 1), 1]]);
  });

  it('invests a deposit day without a depot value on the next day', (): void => {
    depotValues = depotValuesOn(['2026-01-13', '2026-01-14', '2026-01-16', '2026-01-17']);

    expect(installmentsPerDay(savingsPlan, depotValues)).toEqual([0, 0, 100, 0]);
  });

  it('invests a month whose days all lie before its deposit day on the next day', (): void => {
    depotValues = depotValuesOn(['2026-01-13', '2026-01-14', '2026-02-10', '2026-02-14', '2026-02-15']);

    expect(installmentsPerDay(savingsPlan, depotValues)).toEqual([0, 0, 100, 0, 100]);
  });

  it('adds up two installments landing on the same day', (): void => {
    depotValues = depotValuesOn(['2026-01-13', '2026-01-14', '2026-02-16']);

    expect(installmentsPerDay(savingsPlan, depotValues)).toEqual([0, 0, 200]);
  });

  it('does not invest a month whose deposit day lies after the last day', (): void => {
    depotValues = depotValuesOn(['2026-01-20', '2026-01-21', '2026-02-10']);

    expect(installmentsPerDay(savingsPlan, depotValues)).toEqual([100, 0, 0]);
  });

  it('invests nothing without depot values', (): void => {
    expect(installmentsPerDay(savingsPlan, [])).toEqual([]);
    expect(parseISOMock).not.toHaveBeenCalled();
  });

  describe('reinvesting the cash flows', (): void => {
    beforeEach((): void => {
      savingsPlan = {
        depositDay: 15,
        investmentPerInterval: 'reinvestCashFlow'
      };
      depotValues = depotValuesOn(['2026-01-15', '2026-01-20', '2026-01-21', '2026-02-15']);

      jest.mocked(getCashFlows).mockReturnValue([
        {date: '2026-01-15', cashFlow: 0},
        {date: '2026-01-20', cashFlow: 30},
        {date: '2026-01-21', cashFlow: 20},
        {date: '2026-02-15', cashFlow: 70}
      ]);
    });

    it('invests a month\'s total cash flow on its deposit day, cash flow after that day included', (): void => {
      // January: 30 + 20, February: 70
      expect(installmentsPerDay(savingsPlan, depotValues)).toEqual([50, 0, 0, 70]);
      expect(jest.mocked(getCashFlows).mock.calls).toEqual([[depotValues]]);
    });

    it('invests nothing for a month without an increase of the invested capital', (): void => {
      jest.mocked(getCashFlows).mockReturnValue([
        {date: '2026-01-15', cashFlow: 0},
        {date: '2026-01-20', cashFlow: 30},
        {date: '2026-01-21', cashFlow: 20}
      ]);

      expect(installmentsPerDay(savingsPlan, depotValues)).toEqual([50, 0, 0, 0]);
    });

    it('invests a late month\'s own cash flow on the day it lands', (): void => {
      savingsPlan = {...savingsPlan, depositDay: 22};

      // January's 30 + 20 lands on 2026-02-15; February's deposit day lies after the last day, so its 70 is not invested
      expect(installmentsPerDay(savingsPlan, depotValues)).toEqual([0, 0, 0, 50]);
    });
  });
});
