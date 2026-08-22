import {beforeEach, describe, expect, it, jest} from '@jest/globals';
import {firstValueFrom, Subscription} from 'rxjs';
import {AiBridgeService} from './ai-bridge.service';
import {BridgeHost} from './bridge-host.token';
import {AiDownloadOutcome, AiDownloadProgress, ElectronAiState, TraQuityBridge} from './startup-bridge.type';

type GetAiState = () => Promise<ElectronAiState>;
type ConfirmAiNotice = () => Promise<void>;
type DownloadModel = (key: string) => Promise<AiDownloadOutcome>;
type OnAiDownloadProgress = (listener: (progress: AiDownloadProgress) => void) => () => void;

describe('AiBridgeService', (): void => {
  let aiState: ElectronAiState;
  let downloadOutcome: AiDownloadOutcome;
  let getAiState: jest.Mock<GetAiState>;
  let confirmAiNotice: jest.Mock<ConfirmAiNotice>;
  let downloadModel: jest.Mock<DownloadModel>;
  let onAiDownloadProgress: jest.Mock<OnAiDownloadProgress>;
  let unsubscribeAiDownloadProgress: jest.Mock<() => void>;
  let service: AiBridgeService;

  beforeEach((): void => {
    aiState = {
      isConfirmed: true,
      catalogue: [{key: 'model-a', description: 'Model A', sizeBytes: 3013027808, license: 'Apache-2.0'}],
      models: {}
    };
    downloadOutcome = {status: 'completed'};

    getAiState = jest.fn<GetAiState>(() => Promise.resolve(aiState));
    confirmAiNotice = jest.fn<ConfirmAiNotice>(() => Promise.resolve());
    downloadModel = jest.fn<DownloadModel>(() => Promise.resolve(downloadOutcome));
    unsubscribeAiDownloadProgress = jest.fn<() => void>();
    onAiDownloadProgress = jest.fn<OnAiDownloadProgress>(() => unsubscribeAiDownloadProgress);

    const traquity: Pick<TraQuityBridge, 'getAiState' | 'confirmAiNotice' | 'downloadModel' | 'onAiDownloadProgress'> = {
      getAiState,
      confirmAiNotice,
      downloadModel,
      onAiDownloadProgress
    };
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

  it('does not call the bridge before subscription for downloadModel', (): void => {
    service.downloadModel('model-a');

    expect(downloadModel).not.toHaveBeenCalled();
  });

  it('downloads a model through the bridge with the given key', async (): Promise<void> => {
    const outcome: AiDownloadOutcome = await firstValueFrom(service.downloadModel('model-a'));

    expect(downloadModel).toHaveBeenCalledTimes(1);
    expect(downloadModel).toHaveBeenCalledWith('model-a');
    expect(outcome).toBe(downloadOutcome);
  });

  it('registers no download progress listener before subscription', (): void => {
    const observable = service.downloadProgress$;
    void observable;

    expect(onAiDownloadProgress).not.toHaveBeenCalled();
  });

  it('emits progress events pushed by the bridge', (): void => {
    let received: AiDownloadProgress | undefined;
    const progress: AiDownloadProgress = {phase: 'downloading', receivedBytes: 1, totalBytes: 2, bytesPerSecond: 1, secondsRemaining: 1};

    service.downloadProgress$.subscribe((value) => {
      received = value;
    });
    const listener = onAiDownloadProgress.mock.calls[0]?.[0];
    listener(progress);

    expect(received).toBe(progress);
  });

  it('unsubscribes from the bridge on unsubscribe', (): void => {
    const subscription: Subscription = service.downloadProgress$.subscribe();
    subscription.unsubscribe();

    expect(unsubscribeAiDownloadProgress).toHaveBeenCalledTimes(1);
    expect(unsubscribeAiDownloadProgress).toHaveBeenCalledWith();
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
      ['confirmNotice', (): unknown => firstValueFrom(service.confirmNotice())],
      ['downloadModel', (): unknown => firstValueFrom(service.downloadModel('model-a'))],
      ['downloadProgress$', (): unknown => firstValueFrom(service.downloadProgress$)]
    ])('rejects %s', async (_name: string, call: () => unknown): Promise<void> => {
      await expect(call()).rejects.toThrow('The traquity bridge is not available');
    });
  });
});
