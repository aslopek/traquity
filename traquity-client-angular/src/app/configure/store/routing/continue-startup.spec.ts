import {beforeEach, describe, expect, it, jest} from '@jest/globals';
import {AuthState} from '../../../../bridge/startup-bridge.type';
import {DatabaseSelection} from '../../../startup/store/methods/select-database';
import {ContinuableStartupStore, continueStartup} from './continue-startup';
import {nextStartupStep, SelectionOrigin, StartupStep} from './next-startup-step';

jest.mock('./next-startup-step', () => ({
  nextStartupStep: jest.fn()
}));

type NextStartupStep = (origin: SelectionOrigin, authState: AuthState, definedPassword?: string) => StartupStep;

describe('continueStartup', (): void => {
  const databasePath: string = 'C:\\Users\\x\\traquity';

  let enterUnlock: jest.Mock<() => void>;
  let selectDatabase: jest.Mock<(selection: DatabaseSelection) => void>;
  let startBackend: jest.Mock<(password: string) => void>;
  let startupStore: ContinuableStartupStore;
  let nextStartupStepMock: jest.Mock<NextStartupStep>;

  beforeEach((): void => {
    enterUnlock = jest.fn<() => void>();
    selectDatabase = jest.fn<(selection: DatabaseSelection) => void>();
    startBackend = jest.fn<(password: string) => void>();
    startupStore = {enterUnlock, selectDatabase, startBackend};

    nextStartupStepMock = nextStartupStep as jest.Mock<NextStartupStep>;
    nextStartupStepMock.mockReset();
    nextStartupStepMock.mockReturnValue({action: 'unlock'});
  });

  it('adopts the selection and enters the unlock screen on an unlock step', (): void => {
    continueStartup(startupStore, {databasePath, authState: 'pending'}, 'picked');

    expect(selectDatabase).toHaveBeenCalledTimes(1);
    expect(selectDatabase).toHaveBeenCalledWith({databasePath, authState: 'pending'});
    expect(enterUnlock).toHaveBeenCalledTimes(1);
    expect(enterUnlock).toHaveBeenCalledWith();
    expect(startBackend).not.toHaveBeenCalled();
  });

  it('asks for the step with the origin, the auth state and the password defined here', (): void => {
    continueStartup(startupStore, {databasePath, authState: 'pending'}, 'created', 'hunter2');

    expect(nextStartupStepMock).toHaveBeenCalledTimes(1);
    expect(nextStartupStepMock).toHaveBeenCalledWith('created', 'pending', 'hunter2');
  });

  it('starts the backend with the password of a start step', (): void => {
    nextStartupStepMock.mockReturnValue({action: 'start', password: 'hunter2'});

    continueStartup(startupStore, {databasePath, authState: 'pending'}, 'created', 'hunter2');

    expect(startBackend).toHaveBeenCalledTimes(1);
    expect(startBackend).toHaveBeenCalledWith('hunter2');
    expect(enterUnlock).not.toHaveBeenCalled();
  });

  it('adopts the selection before handing over to the unlock screen', (): void => {
    continueStartup(startupStore, {databasePath, authState: 'scrypt'}, 'known', '');

    expect(selectDatabase).toHaveBeenCalledTimes(1);
    expect(selectDatabase).toHaveBeenCalledWith({databasePath, authState: 'scrypt'});
    expect(selectDatabase.mock.invocationCallOrder[0]).toBeLessThan(enterUnlock.mock.invocationCallOrder[0]);
  });
});
