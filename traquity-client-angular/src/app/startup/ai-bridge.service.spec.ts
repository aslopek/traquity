import {beforeEach, describe, expect, it, jest} from '@jest/globals';
import {firstValueFrom} from 'rxjs';
import {AiBridgeService} from './ai-bridge.service';
import {BridgeHost} from './bridge-host.token';
import {ElectronAiState, TraQuityBridge} from './startup-bridge.type';

type GetAiState = () => Promise<ElectronAiState>;
type ConfirmAiNotice = () => Promise<void>;

describe('AiBridgeService', (): void => {
  let aiState: ElectronAiState;
  let getAiState: jest.Mock<GetAiState>;
  let confirmAiNotice: jest.Mock<ConfirmAiNotice>;
  let service: AiBridgeService;

  beforeEach((): void => {
    aiState = {
      isConfirmed: true,
      catalogue: [{key: 'model-a', description: 'Model A', sizeBytes: 3013027808, license: 'Apache-2.0'}],
      models: {}
    };

    getAiState = jest.fn<GetAiState>(() => Promise.resolve(aiState));
    confirmAiNotice = jest.fn<ConfirmAiNotice>(() => Promise.resolve());

    const traquity: Pick<TraQuityBridge, 'getAiState' | 'confirmAiNotice'> = {getAiState, confirmAiNotice};
    const bridgeHost: BridgeHost = {traquity: traquity as TraQuityBridge};
    service = new AiBridgeService(bridgeHost);
  });

  it('reports the bridge as available', (): void => {
    expect(service.available).toBe(true);
  });

  it('does not call the bridge before subscription for getState', (): void => {
    service.getState();

    expect(getAiState).not.toHaveBeenCalled();
  });

  it('resolves the AI state through the bridge', async (): Promise<void> => {
    await expect(firstValueFrom(service.getState())).resolves.toBe(aiState);
    expect(getAiState).toHaveBeenCalledTimes(1);
    expect(getAiState).toHaveBeenCalledWith();
  });

  it('does not call the bridge before subscription for confirmNotice', (): void => {
    service.confirmNotice();

    expect(confirmAiNotice).not.toHaveBeenCalled();
  });

  it('confirms the notice through the bridge with no arguments', async (): Promise<void> => {
    await firstValueFrom(service.confirmNotice());

    expect(confirmAiNotice).toHaveBeenCalledTimes(1);
    expect(confirmAiNotice).toHaveBeenCalledWith();
  });

  describe('without a bridge', (): void => {
    beforeEach((): void => {
      service = new AiBridgeService({});
    });

    it('reports the bridge as unavailable', (): void => {
      expect(service.available).toBe(false);
    });

    it.each([
      ['getState', (): unknown => firstValueFrom(service.getState())],
      ['confirmNotice', (): unknown => firstValueFrom(service.confirmNotice())]
    ])('rejects %s', async (_name: string, call: () => unknown): Promise<void> => {
      await expect(call()).rejects.toThrow('The traquity bridge is not available');
    });
  });
});
