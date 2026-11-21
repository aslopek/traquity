import {beforeEach, describe, expect, it, jest} from '@jest/globals';
import {signal, Signal} from '@angular/core';
import {Action, Store} from '@ngrx/store';
import {format} from 'date-fns';
import {Observable, of, throwError} from 'rxjs';
import {DataRange, fromDateRange} from '../../../common/types/data-range';
import {ConfigApi} from '../../../gen/api/configuration';
import {HistoricalSecurityPrice, HistoricalSecurityPriceApi} from '../../../gen/api/historical-security-price';
import {AppState} from '../../../store/app.state';
import {selectedDepotCurrency} from '../../../store/depot/depot.selector';
import {NotificationActions} from '../../../store/notification/notification.actions';
import {HistoricalPriceChartComponent} from './historical-price-chart.component';

jest.mock('date-fns', (): unknown => ({format: jest.fn()}));
jest.mock('../../../common/types/data-range', (): unknown => ({fromDateRange: jest.fn()}));

type Format = (date: Date, formatString: string) => string;

type FromDateRange = (dataRange: DataRange) => Date;

type GetHistoricalSecurityPrices =
  (securityId: number, startDate?: string, currency?: string) => Observable<HistoricalSecurityPrice[]>;

type HistoricalSecurityPriceApiMock = {
  getHistoricalSecurityPrices: jest.Mock<GetHistoricalSecurityPrices>
};

type StoreMock = {
  dispatch: jest.Mock<(action: Action) => void>
  selectSignal: jest.Mock<(selector: unknown) => Signal<string>>
};

describe('HistoricalPriceChartComponent', (): void => {
  const securityId: number = 7;
  let formatMock: jest.Mock<Format>;
  let fromDateRangeMock: jest.Mock<FromDateRange>;
  let prices: HistoricalSecurityPrice[];
  let getHistoricalSecurityPrices: jest.Mock<GetHistoricalSecurityPrices>;
  let dispatch: jest.Mock<(action: Action) => void>;
  let selectSignal: jest.Mock<(selector: unknown) => Signal<string>>;
  let component: HistoricalPriceChartComponent;

  beforeEach((): void => {
    fromDateRangeMock = fromDateRange as unknown as jest.Mock<FromDateRange>;
    fromDateRangeMock.mockReset();
    fromDateRangeMock.mockReturnValue(new Date(2022, 10, 22));
    formatMock = format as unknown as jest.Mock<Format>;
    formatMock.mockReset();
    formatMock.mockReturnValue('2022-11-22');

    prices = [
      {securityId, price: 12.5, currency: 'CHF', date: '2023-12-01'}
    ];
    getHistoricalSecurityPrices = jest.fn<GetHistoricalSecurityPrices>((): Observable<HistoricalSecurityPrice[]> => of(prices));
    dispatch = jest.fn<(action: Action) => void>();
    selectSignal = jest.fn((): Signal<string> => signal('CHF'));

    component = new HistoricalPriceChartComponent(
      {
        getHistoricalSecurityPrices
      } satisfies HistoricalSecurityPriceApiMock as unknown as HistoricalSecurityPriceApi,
      {} as ConfigApi,
      {
        dispatch,
        selectSignal
      } satisfies StoreMock as unknown as Store<AppState>,
    );
    component.selectedSecurityId = securityId;
  });

  it('holds the arrived prices under the selected range', async (): Promise<void> => {
    await component['changeDataRange']('max');

    expect(fromDateRangeMock).toHaveBeenCalledTimes(1);
    expect(fromDateRangeMock).toHaveBeenCalledWith('max');
    expect(formatMock).toHaveBeenCalledTimes(1);
    expect(formatMock).toHaveBeenCalledWith(new Date(2022, 10, 22), 'yyyy-MM-dd');
    expect(getHistoricalSecurityPrices).toHaveBeenCalledTimes(1);
    expect(getHistoricalSecurityPrices).toHaveBeenCalledWith(securityId, '2022-11-22', 'CHF');
    expect(component['prices']()).toBe(prices);
    expect(component['dataRange']()).toBe('max');
    expect(dispatch).not.toHaveBeenCalled();
  });

  it('starts in the currency of the selected depots', (): void => {
    component.securityId = securityId;

    expect(selectSignal.mock.calls).toEqual([[selectedDepotCurrency]]);
    expect(getHistoricalSecurityPrices).toHaveBeenCalledTimes(1);
    expect(getHistoricalSecurityPrices).toHaveBeenCalledWith(securityId, '2022-11-22', 'CHF');
  });

  it('requests the prices in the currency that was picked', async (): Promise<void> => {
    await component['changeCurrency']('USD');

    expect(getHistoricalSecurityPrices).toHaveBeenCalledTimes(1);
    expect(getHistoricalSecurityPrices).toHaveBeenCalledWith(securityId, '2022-11-22', 'USD');
    expect(component['selectedCurrency']()).toBe('USD');
  });

  it('keeps the picked currency for another security', (): void => {
    component['selectedCurrency'].set('USD');

    component.securityId = 8;

    expect(getHistoricalSecurityPrices).toHaveBeenCalledTimes(1);
    expect(getHistoricalSecurityPrices).toHaveBeenCalledWith(8, '2022-11-22', 'USD');
  });

  it('keeps its currency and requests nothing when no currency is picked', async (): Promise<void> => {
    await component['changeCurrency'](undefined);

    expect(getHistoricalSecurityPrices).not.toHaveBeenCalled();
    expect(component['selectedCurrency']()).toBe('CHF');
  });

  describe('when the request fails', (): void => {
    beforeEach((): void => {
      getHistoricalSecurityPrices.mockReturnValue(throwError((): Error => new Error('request failed')));
    });

    it('pushes an error notification', async (): Promise<void> => {
      await component['changeDataRange']('max');

      expect(dispatch).toHaveBeenCalledTimes(1);
      expect(dispatch).toHaveBeenCalledWith(
        NotificationActions.addError({message: 'The historical prices could not be loaded.'}));
    });

    it('selects the range that was showing before', async (): Promise<void> => {
      await component['changeDataRange']('max');

      expect(component['dataRange']()).toBe('1y');
    });

    it('selects the currency that was showing before', async (): Promise<void> => {
      await component['changeCurrency']('USD');

      expect(component['selectedCurrency']()).toBe('CHF');
    });
  });
});
