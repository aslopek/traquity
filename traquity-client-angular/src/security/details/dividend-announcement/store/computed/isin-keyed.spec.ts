import {beforeEach, describe, expect, it, jest} from '@jest/globals';
import {signal, Signal, WritableSignal} from '@angular/core';
import {Store} from '@ngrx/store';
import {AppState} from '../../../../../store/app.state';
import {getAllDataSources} from '../../../../../store/dividend-announcement/dividend-announcement.selector';
import {DividendAnnouncementDataSourceRead} from '../../../../../gen/api/notification/dividend-announcement';
import {DividendAnnouncementConfigState} from '../dividend-announcement-config-store';
import {isinKeyed, IsinKeyedState} from './isin-keyed';

const isIsinKeyedMock: jest.Mock<(dataSource: unknown) => boolean> = jest.fn();
jest.mock('../../../../../settings/data-source/is-isin-keyed', (): unknown => ({
  isIsinKeyed: (dataSource: unknown): boolean => isIsinKeyedMock(dataSource)
}));

type MockedStore = Pick<Store<AppState>, 'selectSignal'>;
type DataSourceStub = Pick<DividendAnnouncementDataSourceRead, 'id'>;

describe('isinKeyed', (): void => {
  let dataSources: DataSourceStub[];
  let selectSignal: jest.Mock<(selector: unknown) => unknown>;
  let globalStore: Store<AppState>;
  let newConfigValues: WritableSignal<DividendAnnouncementConfigState['newConfigValues']>;
  let signalStore: { newConfigValues: Signal<IsinKeyedState['newConfigValues']> };

  beforeEach((): void => {
    isIsinKeyedMock.mockReset();
    isIsinKeyedMock.mockReturnValue(true);
    dataSources = [
      {id: 1},
      {id: 2}
    ];
    selectSignal = jest.fn((): unknown => signal(dataSources));
    globalStore = {selectSignal: selectSignal as MockedStore['selectSignal']} satisfies MockedStore as Store<AppState>;
    newConfigValues = signal({dataSourceId: 1, externalSecurityId: '', isActive: true});
    signalStore = {newConfigValues};
  });

  it('hands the selected data source to the ISIN check and returns its result', (): void => {
    const result: boolean = isinKeyed(signalStore, globalStore);

    expect(result).toBe(true);
    expect(isIsinKeyedMock.mock.calls).toEqual([[dataSources[0]]]);
    expect(selectSignal.mock.calls).toEqual([[getAllDataSources]]);
  });

  it('hands over the source matching the selected ID', (): void => {
    newConfigValues.set({dataSourceId: 2, externalSecurityId: '', isActive: true});

    isinKeyed(signalStore, globalStore);

    expect(isIsinKeyedMock.mock.calls).toEqual([[dataSources[1]]]);
  });

  it('hands over nothing for an unknown source', (): void => {
    newConfigValues.set({dataSourceId: 3, externalSecurityId: '', isActive: true});

    isinKeyed(signalStore, globalStore);

    expect(isIsinKeyedMock.mock.calls).toEqual([[undefined]]);
  });
});
