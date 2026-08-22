import {beforeEach, describe, expect, it, jest} from '@jest/globals';
import {firstValueFrom, Subscription} from 'rxjs';
import {BridgeHost} from './bridge-host.token';
import {StartupBridgeService} from './startup-bridge.service';
import {
  AppliedConfiguration,
  BackendStartOutcome,
  ConfigurationChanges,
  ConfigureState,
  ElectronAiState,
  JavaDownloadOutcome,
  JavaDownloadProgress,
  JavaPickResult,
  JavaVerification,
  PickedDatabase,
  StartupState,
  TraQuityBridge
} from './startup-bridge.type';

type GetStartupState = () => Promise<StartupState>;
type GetAiState = () => Promise<ElectronAiState>;
type ConfirmAiNotice = () => Promise<void>;
type StartBackend = (password: string) => Promise<BackendStartOutcome>;
type VerifyPassword = (password: string) => Promise<boolean>;
type GetConfigureState = () => Promise<ConfigureState>;
type PickExistingDatabase = (currentSelection: string | null) => Promise<string | null>;
type PickNewDatabase = (currentSelection: string | null) => Promise<PickedDatabase | null>;
type ForgetPassword = (databasePath: string) => Promise<void>;
type ApplyConfiguration = (changes: ConfigurationChanges) => Promise<AppliedConfiguration>;
type VerifyJava = (setting: string | null) => Promise<JavaVerification>;
type PickJava = (currentSetting: string | null) => Promise<JavaPickResult | null>;
type DownloadJava = () => Promise<JavaDownloadOutcome>;
type OnJavaDownloadProgress = (listener: (progress: JavaDownloadProgress) => void) => () => void;

describe('StartupBridgeService', (): void => {
  const databasePath: string = 'C:\\Users\\x\\traquity';
  const javaPath: string = 'C:\\jdk\\bin\\java.exe';
  const changes: ConfigurationChanges = {databasePath, javaPath: null, javaSignature: null};

  let startupState: StartupState;
  let startOutcome: BackendStartOutcome;
  let configureState: ConfigureState;
  let pickedDatabase: PickedDatabase;
  let appliedConfiguration: AppliedConfiguration;
  let javaVerification: JavaVerification;
  let javaPickResult: JavaPickResult;
  let javaDownloadOutcome: JavaDownloadOutcome;
  let getStartupState: jest.Mock<GetStartupState>;
  let startBackend: jest.Mock<StartBackend>;
  let verifyPassword: jest.Mock<VerifyPassword>;
  let getConfigureState: jest.Mock<GetConfigureState>;
  let pickExistingDatabase: jest.Mock<PickExistingDatabase>;
  let pickNewDatabase: jest.Mock<PickNewDatabase>;
  let forgetPassword: jest.Mock<ForgetPassword>;
  let applyConfiguration: jest.Mock<ApplyConfiguration>;
  let verifyJava: jest.Mock<VerifyJava>;
  let pickJava: jest.Mock<PickJava>;
  let downloadJava: jest.Mock<DownloadJava>;
  let getAiState: jest.Mock<GetAiState>;
  let confirmAiNotice: jest.Mock<ConfirmAiNotice>;
  let onJavaDownloadProgress: jest.Mock<OnJavaDownloadProgress>;
  let unsubscribeJavaDownloadProgress: jest.Mock<() => void>;
  let restartAndConfigure: jest.Mock<() => void>;
  let quit: jest.Mock<() => void>;
  let service: StartupBridgeService;

  beforeEach((): void => {
    startupState = {authState: 'scrypt', databasePath, mode: 'unlock'};
    startOutcome = {reachable: true, startedFrom: 'pending'};
    configureState = {
      configFileState: 'read',
      knownDatabases: [
        {
          path: databasePath,
          authState: 'scrypt'
        }
      ],
      logPath: 'C:\\apps\\traquity\\traquity.log',
      java: {path: null, signature: null}
    };
    pickedDatabase = {basePath: 'D:\\backup\\traquity-test', fileExists: false};
    appliedConfiguration = {databasePath, authState: 'passwordless'};
    javaVerification = {status: 'ok', javaPath, versionOutput: 'openjdk 25'};
    javaPickResult = {setting: javaPath, verification: javaVerification};
    javaDownloadOutcome = {status: 'completed', javaPath, signature: 'c2ln', verification: javaVerification};

    getStartupState = jest.fn<GetStartupState>(() => Promise.resolve(startupState));
    startBackend = jest.fn<StartBackend>(() => Promise.resolve(startOutcome));
    verifyPassword = jest.fn<VerifyPassword>(() => Promise.resolve(true));
    getConfigureState = jest.fn<GetConfigureState>(() => Promise.resolve(configureState));
    pickExistingDatabase = jest.fn<PickExistingDatabase>(() => Promise.resolve(pickedDatabase.basePath));
    pickNewDatabase = jest.fn<PickNewDatabase>(() => Promise.resolve(pickedDatabase));
    forgetPassword = jest.fn<ForgetPassword>(() => Promise.resolve());
    applyConfiguration = jest.fn<ApplyConfiguration>(() => Promise.resolve(appliedConfiguration));
    verifyJava = jest.fn<VerifyJava>(() => Promise.resolve(javaVerification));
    pickJava = jest.fn<PickJava>(() => Promise.resolve(javaPickResult));
    downloadJava = jest.fn<DownloadJava>(() => Promise.resolve(javaDownloadOutcome));
    getAiState = jest.fn<GetAiState>(() => Promise.resolve({isConfirmed: false, catalogue: [], models: {}}));
    confirmAiNotice = jest.fn<ConfirmAiNotice>(() => Promise.resolve());
    unsubscribeJavaDownloadProgress = jest.fn<() => void>();
    onJavaDownloadProgress = jest.fn<OnJavaDownloadProgress>(() => unsubscribeJavaDownloadProgress);
    restartAndConfigure = jest.fn<() => void>();
    quit = jest.fn<() => void>();

    const traquity: TraQuityBridge = {
      getStartupState,
      startBackend,
      verifyPassword,
      getConfigureState,
      pickExistingDatabase,
      pickNewDatabase,
      forgetPassword,
      applyConfiguration,
      verifyJava,
      pickJava,
      downloadJava,
      getAiState,
      confirmAiNotice,
      onJavaDownloadProgress,
      restartAndConfigure,
      quit
    };
    const bridgeHost: BridgeHost = {traquity};
    service = new StartupBridgeService(bridgeHost);
  });

  it('reports the bridge as available', (): void => {
    expect(service.available).toBe(true);
  });

  it('reports the bridge as unavailable when no bridge is present', (): void => {
    service = new StartupBridgeService({});

    expect(service.available).toBe(false);
  });

  it('does not call the bridge before subscription', (): void => {
    service.getStartupState();

    expect(getStartupState).not.toHaveBeenCalled();
  });

  it('resolves the startup state through the bridge', async (): Promise<void> => {
    await expect(firstValueFrom(service.getStartupState())).resolves.toBe(startupState);
  });

  it('starts the backend through the bridge with the given password', async (): Promise<void> => {
    const outcome: BackendStartOutcome = await firstValueFrom(service.startBackend('hunter2'));

    expect(startBackend).toHaveBeenCalledTimes(1);
    expect(startBackend).toHaveBeenCalledWith('hunter2');
    expect(outcome).toBe(startOutcome);
  });

  it('does not call the bridge before subscription for verifyPassword', (): void => {
    service.verifyPassword('hunter2');

    expect(verifyPassword).not.toHaveBeenCalled();
  });

  it('verifies the password through the bridge and passes a match through', async (): Promise<void> => {
    const matches: boolean = await firstValueFrom(service.verifyPassword('hunter2'));

    expect(verifyPassword).toHaveBeenCalledTimes(1);
    expect(verifyPassword).toHaveBeenCalledWith('hunter2');
    expect(matches).toBe(true);
  });

  it('passes a non-match through', async (): Promise<void> => {
    verifyPassword.mockReturnValue(Promise.resolve(false));

    const matches: boolean = await firstValueFrom(service.verifyPassword('wrong'));

    expect(verifyPassword).toHaveBeenCalledTimes(1);
    expect(verifyPassword).toHaveBeenCalledWith('wrong');
    expect(matches).toBe(false);
  });

  it('does not call the bridge before subscription for getConfigureState', (): void => {
    service.getConfigureState();

    expect(getConfigureState).not.toHaveBeenCalled();
  });

  it('resolves the configure state through the bridge', async (): Promise<void> => {
    await expect(firstValueFrom(service.getConfigureState())).resolves.toBe(configureState);
    expect(getConfigureState).toHaveBeenCalledTimes(1);
    expect(getConfigureState).toHaveBeenCalledWith();
  });

  it('does not call the bridge before subscription for pickExistingDatabase', (): void => {
    service.pickExistingDatabase(databasePath);

    expect(pickExistingDatabase).not.toHaveBeenCalled();
  });

  it('picks an existing database through the bridge with the current selection', async (): Promise<void> => {
    const picked: string | null = await firstValueFrom(service.pickExistingDatabase(databasePath));

    expect(pickExistingDatabase).toHaveBeenCalledTimes(1);
    expect(pickExistingDatabase).toHaveBeenCalledWith(databasePath);
    expect(picked).toBe(pickedDatabase.basePath);
  });

  it('passes a cancelled open dialog through', async (): Promise<void> => {
    pickExistingDatabase.mockReturnValue(Promise.resolve(null));

    await expect(firstValueFrom(service.pickExistingDatabase(null))).resolves.toBeNull();
    expect(pickExistingDatabase).toHaveBeenCalledTimes(1);
    expect(pickExistingDatabase).toHaveBeenCalledWith(null);
  });

  it('does not call the bridge before subscription for pickNewDatabase', (): void => {
    service.pickNewDatabase(databasePath);

    expect(pickNewDatabase).not.toHaveBeenCalled();
  });

  it('picks a new database through the bridge with the current selection', async (): Promise<void> => {
    const picked: PickedDatabase | null = await firstValueFrom(service.pickNewDatabase(databasePath));

    expect(pickNewDatabase).toHaveBeenCalledTimes(1);
    expect(pickNewDatabase).toHaveBeenCalledWith(databasePath);
    expect(picked).toBe(pickedDatabase);
  });

  it('passes a cancelled save dialog through', async (): Promise<void> => {
    pickNewDatabase.mockReturnValue(Promise.resolve(null));

    await expect(firstValueFrom(service.pickNewDatabase(null))).resolves.toBeNull();
    expect(pickNewDatabase).toHaveBeenCalledTimes(1);
    expect(pickNewDatabase).toHaveBeenCalledWith(null);
  });

  it('does not call the bridge before subscription for forgetPassword', (): void => {
    service.forgetPassword(databasePath);

    expect(forgetPassword).not.toHaveBeenCalled();
  });

  it('forgets a password through the bridge for the given database', async (): Promise<void> => {
    await firstValueFrom(service.forgetPassword(databasePath));

    expect(forgetPassword).toHaveBeenCalledTimes(1);
    expect(forgetPassword).toHaveBeenCalledWith(databasePath);
  });

  it('does not call the bridge before subscription for applyConfiguration', (): void => {
    service.applyConfiguration(changes);

    expect(applyConfiguration).not.toHaveBeenCalled();
  });

  it('applies the configuration through the bridge and emits what was applied', async (): Promise<void> => {
    const applied: AppliedConfiguration = await firstValueFrom(service.applyConfiguration(changes));

    expect(applyConfiguration).toHaveBeenCalledTimes(1);
    expect(applyConfiguration).toHaveBeenCalledWith(changes);
    expect(applied).toBe(appliedConfiguration);
  });

  it('does not call the bridge before subscription for verifyJava', (): void => {
    service.verifyJava(javaPath);

    expect(verifyJava).not.toHaveBeenCalled();
  });

  it('verifies a java setting through the bridge', async (): Promise<void> => {
    const verification: JavaVerification = await firstValueFrom(service.verifyJava(javaPath));

    expect(verifyJava).toHaveBeenCalledTimes(1);
    expect(verifyJava).toHaveBeenCalledWith(javaPath);
    expect(verification).toBe(javaVerification);
  });

  it('verifies the PATH candidate for a null setting', async (): Promise<void> => {
    await firstValueFrom(service.verifyJava(null));

    expect(verifyJava).toHaveBeenCalledTimes(1);
    expect(verifyJava).toHaveBeenCalledWith(null);
  });

  it('does not call the bridge before subscription for pickJava', (): void => {
    service.pickJava(null);

    expect(pickJava).not.toHaveBeenCalled();
  });

  it('picks java through the bridge with the current setting', async (): Promise<void> => {
    const picked: JavaPickResult | null = await firstValueFrom(service.pickJava(javaPath));

    expect(pickJava).toHaveBeenCalledTimes(1);
    expect(pickJava).toHaveBeenCalledWith(javaPath);
    expect(picked).toBe(javaPickResult);
  });

  it('passes a cancelled java picker through', async (): Promise<void> => {
    pickJava.mockReturnValue(Promise.resolve(null));

    await expect(firstValueFrom(service.pickJava(null))).resolves.toBeNull();
  });

  it('does not call the bridge before subscription for downloadJava', (): void => {
    service.downloadJava();

    expect(downloadJava).not.toHaveBeenCalled();
  });

  it('downloads java through the bridge', async (): Promise<void> => {
    const result: JavaDownloadOutcome = await firstValueFrom(service.downloadJava());

    expect(downloadJava).toHaveBeenCalledTimes(1);
    expect(downloadJava).toHaveBeenCalledWith();
    expect(result).toBe(javaDownloadOutcome);
  });

  it('registers no download progress listener before subscription', (): void => {
    const observable = service.javaDownloadProgress$;
    void observable;

    expect(onJavaDownloadProgress).not.toHaveBeenCalled();
  });

  it('emits progress events pushed by the bridge', (): void => {
    let received: JavaDownloadProgress | undefined;
    const progress: JavaDownloadProgress = {phase: 'downloading', receivedBytes: 1, totalBytes: 2, bytesPerSecond: 1, secondsRemaining: 1};

    service.javaDownloadProgress$.subscribe((value) => {
      received = value;
    });
    const listener = onJavaDownloadProgress.mock.calls[0]?.[0];
    listener(progress);

    expect(received).toBe(progress);
  });

  it('unsubscribes from the bridge on unsubscribe', (): void => {
    const subscription: Subscription = service.javaDownloadProgress$.subscribe();
    subscription.unsubscribe();

    expect(unsubscribeJavaDownloadProgress).toHaveBeenCalledTimes(1);
    expect(unsubscribeJavaDownloadProgress).toHaveBeenCalledWith();
  });

  it('registers a separate listener per subscription', (): void => {
    service.javaDownloadProgress$.subscribe();
    service.javaDownloadProgress$.subscribe();

    expect(onJavaDownloadProgress.mock.calls).toEqual([
      [expect.any(Function)],
      [expect.any(Function)]
    ]);
    expect(onJavaDownloadProgress.mock.calls[0][0]).not.toBe(onJavaDownloadProgress.mock.calls[1][0]);
  });

  it('reaches the bridge eagerly for restartAndConfigure, with no subscription involved', (): void => {
    service.restartAndConfigure();

    expect(restartAndConfigure).toHaveBeenCalledTimes(1);
    expect(restartAndConfigure).toHaveBeenCalledWith();
  });

  it('reaches the bridge eagerly for quit, with no subscription involved', (): void => {
    service.quit();

    expect(quit).toHaveBeenCalledTimes(1);
    expect(quit).toHaveBeenCalledWith();
  });

  describe('without a bridge', (): void => {
    beforeEach((): void => {
      service = new StartupBridgeService({});
    });

    it.each([
      ['getConfigureState', (): unknown => firstValueFrom(service.getConfigureState())],
      ['pickExistingDatabase', (): unknown => firstValueFrom(service.pickExistingDatabase(null))],
      ['pickNewDatabase', (): unknown => firstValueFrom(service.pickNewDatabase(null))],
      ['forgetPassword', (): unknown => firstValueFrom(service.forgetPassword(databasePath))],
      ['applyConfiguration', (): unknown => firstValueFrom(service.applyConfiguration(changes))],
      ['verifyJava', (): unknown => firstValueFrom(service.verifyJava(null))],
      ['pickJava', (): unknown => firstValueFrom(service.pickJava(null))],
      ['downloadJava', (): unknown => firstValueFrom(service.downloadJava())],
      ['javaDownloadProgress$', (): unknown => firstValueFrom(service.javaDownloadProgress$)]
    ])('rejects %s', async (_name: string, call: () => unknown): Promise<void> => {
      await expect(call()).rejects.toThrow('The traquity bridge is not available');
    });
  });
});
