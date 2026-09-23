import {beforeEach, describe, expect, it} from '@jest/globals';
import {setHistoricalSecurityPriceDataSource} from './add-historical-security-price-data-source.reducer';
import {SecurityState} from '../security.state';
import {SetHistoricalSecurityPriceDataSourceDoneActionArgs} from '../security.actions';
import {DataSourceWithId} from '../../../settings/data-source/data-source.type';
import {HistoricalSecurityPriceDataSourceRead} from '../../../gen/api/historical-security-price';
import {dataSourceWithIdFactory} from '../../../testing/data-source-with-id.factory';
import {historicalSecurityPriceDataSourceReadFactory} from '../../../testing/historical-security-price-data-source-read.factory';

describe('setHistoricalSecurityPriceDataSource', (): void => {
  let state: Readonly<SecurityState>;
  let existingDataSource: DataSourceWithId;
  let newDataSource: HistoricalSecurityPriceDataSourceRead;
  let args: SetHistoricalSecurityPriceDataSourceDoneActionArgs;

  beforeEach((): void => {
    existingDataSource = dataSourceWithIdFactory({
      id: 1,
      name: 'Existing Source'
    });
    newDataSource = historicalSecurityPriceDataSourceReadFactory({
      id: 2,
      name: 'New Source'
    });
    state = {
      securities: {},
      historicalSecurityPriceConfigs: {},
      historicalSecurityPriceDataSources: [existingDataSource]
    };
    args = {
      dataSource: newDataSource
    };
  });

  it('appends the data source when no data source with the given id exists', (): void => {
    const result: SecurityState = setHistoricalSecurityPriceDataSource(state, args);
    expect(result.historicalSecurityPriceDataSources).toEqual([
      existingDataSource,
      newDataSource
    ]);
  });

  it('replaces the data source at its position when a data source with the given id already exists', (): void => {
    args = {
      dataSource: {
        ...newDataSource,
        id: existingDataSource.id
      }
    };
    const result: SecurityState = setHistoricalSecurityPriceDataSource(state, args);
    expect(result.historicalSecurityPriceDataSources).toEqual([
      {
        ...newDataSource,
        id: existingDataSource.id
      }
    ]);
  });

  it('returns the state unchanged when no data source is provided', (): void => {
    args = {dataSource: undefined};
    const result: SecurityState = setHistoricalSecurityPriceDataSource(state, args);
    expect(result).toBe(state);
  });
});
