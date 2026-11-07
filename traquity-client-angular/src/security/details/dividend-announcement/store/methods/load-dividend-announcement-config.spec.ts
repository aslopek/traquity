import {beforeEach, describe, expect, it, jest} from '@jest/globals';
import {of} from 'rxjs';
import {signal} from '@angular/core';
import {patchState} from '@ngrx/signals';
import {Store} from '@ngrx/store';
import {AppState} from '../../../../../store/app.state';
import {getAllDataSources} from '../../../../../store/dividend-announcement/dividend-announcement.selector';
import {WritableSignalStore} from '../../../../../common/types/signal-store.type';
import {
  DividendAnnouncementConfigApi,
  DividendAnnouncementConfigRead,
  DividendAnnouncementDataSourceRead
} from '../../../../../gen/api/notification/dividend-announcement';
import {DividendAnnouncementConfigState} from '../dividend-announcement-config-store';
import {loadDividendAnnouncementConfig} from './load-dividend-announcement-config';

jest.mock('@ngrx/signals', (): unknown => ({patchState: jest.fn()}));

const isIsinKeyedMock: jest.Mock<(dataSource: unknown) => boolean> = jest.fn();
jest.mock('../../../../../settings/data-source/is-isin-keyed', (): unknown => ({
  isIsinKeyed: (dataSource: unknown): boolean => isIsinKeyedMock(dataSource)
}));

type PatchState = (store: unknown, update: Partial<DividendAnnouncementConfigState>) => void;
type MockedStore = Pick<Store<AppState>, 'selectSignal'>;
type DataSourceStub = Pick<DividendAnnouncementDataSourceRead, 'id'>;
type ConfigStore = WritableSignalStore<DividendAnnouncementConfigState>;

describe('loadDividendAnnouncementConfig', (): void => {
  let patchStateMock: jest.Mock<PatchState>;
  let selectSignal: jest.Mock<(selector: unknown) => unknown>;
  let globalStore: Store<AppState>;
  let api: DividendAnnouncementConfigApi;
  let signalStore: ConfigStore;
  let dataSources: DataSourceStub[];
  let config: DividendAnnouncementConfigRead;

  const load: () => void = (): void => {
    api = {getDividendAnnouncementConfig: jest.fn(() => of(config))} as unknown as DividendAnnouncementConfigApi;
    loadDividendAnnouncementConfig(signalStore, globalStore, api, config.securityId);
  };

  beforeEach((): void => {
    patchStateMock = patchState as unknown as jest.Mock<PatchState>;
    patchStateMock.mockReset();
    isIsinKeyedMock.mockReset();
    isIsinKeyedMock.mockReturnValue(false);
    signalStore = {} as ConfigStore;
    dataSources = [
      {id: 1},
      {id: 2}
    ];
    selectSignal = jest.fn((): unknown => signal(dataSources));
    globalStore = {selectSignal: selectSignal as MockedStore['selectSignal']} satisfies MockedStore as Store<AppState>;
    config = {dataSourceId: 2, externalSecurityId: 'X1', isActive: true, version: 3, securityId: 7};
  });

  it('keeps the external security ID of a config whose source is not ISIN-keyed', (): void => {
    load();

    expect(selectSignal.mock.calls).toEqual([[getAllDataSources]]);
    expect(isIsinKeyedMock.mock.calls).toEqual([[dataSources[1]]]);
    expect(patchStateMock.mock.calls).toEqual([
      [signalStore, {securityId: config.securityId, isDirty: false, existingConfig: config, newConfigValues: config}]
    ]);
  });

  it('empties the external security ID of a config whose source is ISIN-keyed', (): void => {
    isIsinKeyedMock.mockReturnValue(true);

    load();

    expect(patchStateMock.mock.calls).toEqual([[signalStore, {
      securityId: config.securityId,
      isDirty: false,
      existingConfig: config,
      newConfigValues: {...config, externalSecurityId: ''}
    }]]);
  });
});
