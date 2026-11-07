import {beforeEach, describe, expect, it, jest} from '@jest/globals';
import {signal, WritableSignal} from '@angular/core';
import {Store} from '@ngrx/store';
import {AppState} from '../../../../../store/app.state';
import {getAllDataSources} from '../../../../../store/dividend-announcement/dividend-announcement.selector';
import {DividendAnnouncementDataSourceRead} from '../../../../../gen/api/notification/dividend-announcement';
import {DividendAnnouncementConfigParams} from '../dividend-announcement-config-store';
import {newConfigValuesValid, NewConfigValuesValidState} from './new-config-values-valid';

const isinKeyedMock: jest.Mock<(signalStore: unknown, globalStore: unknown) => boolean> = jest.fn();
jest.mock('./isin-keyed', (): unknown => ({
  isinKeyed: (signalStore: unknown, globalStore: unknown): boolean => isinKeyedMock(signalStore, globalStore)
}));

type MockedStore = Pick<Store<AppState>, 'selectSignal'>;
type DataSourceStub = Pick<DividendAnnouncementDataSourceRead, 'id'>;

describe('newConfigValuesValid', (): void => {
  let selectSignal: jest.Mock<(selector: unknown) => unknown>;
  let globalStore: Store<AppState>;
  let newConfigValues: WritableSignal<DividendAnnouncementConfigParams>;
  let signalStore: { newConfigValues: WritableSignal<NewConfigValuesValidState['newConfigValues']> };

  beforeEach((): void => {
    isinKeyedMock.mockReset();
    isinKeyedMock.mockReturnValue(false);
    const dataSources: DataSourceStub[] = [
      {id: 1},
      {id: 2}
    ];
    selectSignal = jest.fn((): unknown => signal(dataSources));
    globalStore = {selectSignal: selectSignal as MockedStore['selectSignal']} satisfies MockedStore as Store<AppState>;
    newConfigValues = signal({dataSourceId: 2, externalSecurityId: 'X1', isActive: true});
    signalStore = {newConfigValues};
  });

  it('is valid for a known source with an external security ID', (): void => {
    const result: boolean = newConfigValuesValid(signalStore, globalStore);

    expect(result).toBe(true);
    expect(selectSignal.mock.calls).toEqual([[getAllDataSources]]);
    expect(isinKeyedMock).not.toHaveBeenCalled();
  });

  it('is invalid for a blank external security ID when the source is not ISIN-keyed', (): void => {
    newConfigValues.update((values: DividendAnnouncementConfigParams) => ({...values, externalSecurityId: ' '}));

    const result: boolean = newConfigValuesValid(signalStore, globalStore);

    expect(result).toBe(false);
    expect(isinKeyedMock.mock.calls).toEqual([[signalStore, globalStore]]);
  });

  it('is valid for a blank external security ID when the source is ISIN-keyed', (): void => {
    isinKeyedMock.mockReturnValue(true);
    newConfigValues.update((values: DividendAnnouncementConfigParams) => ({...values, externalSecurityId: ''}));

    expect(newConfigValuesValid(signalStore, globalStore)).toBe(true);
  });

  it('is invalid for an unknown source', (): void => {
    newConfigValues.update((values: DividendAnnouncementConfigParams) => ({...values, dataSourceId: 3}));

    expect(newConfigValuesValid(signalStore, globalStore)).toBe(false);
  });
});
