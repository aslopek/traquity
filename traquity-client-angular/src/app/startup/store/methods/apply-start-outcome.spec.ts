import {beforeEach, describe, expect, it, jest} from '@jest/globals';
import {Router} from '@angular/router';
import {getState, signalState, SignalState} from '@ngrx/signals';
import {Action, Store} from '@ngrx/store';
import {AuthState, BackendStartOutcome} from '../../../../bridge/startup-bridge.type';
import {AppActions} from '../../../../store/app.actions';
import {AppState} from '../../../../store/app.state';
import {phaseAfterFailedStart, startupRouteFor} from '../routing/startup-route';
import {initialState, StartupPhase, StartupStoreState} from '../startup.store';
import {applyStartOutcome} from './apply-start-outcome';

jest.mock('../routing/startup-route', () => ({
  phaseAfterFailedStart: jest.fn(),
  startupRouteFor: jest.fn()
}));

type PhaseAfterFailedStart = (startedFrom: AuthState) => StartupPhase;
type StartupRouteFor = (phase: StartupPhase) => string | null;

describe('applyStartOutcome', (): void => {
  let store: SignalState<StartupStoreState>;
  let navigate: jest.Mock<Router['navigate']>;
  let router: Pick<Router, 'navigate'>;
  let dispatch: jest.Mock<(action: Action) => void>;
  let globalStore: Store<AppState>;
  let outcome: BackendStartOutcome;
  let phaseAfterFailedStartMock: jest.Mock<PhaseAfterFailedStart>;
  let startupRouteForMock: jest.Mock<StartupRouteFor>;

  beforeEach((): void => {
    store = signalState<StartupStoreState>({...initialState});
    navigate = jest.fn<Router['navigate']>();
    router = {navigate};
    dispatch = jest.fn<(action: Action) => void>();

    globalStore = {
      dispatch: dispatch as unknown as Store<AppState>['dispatch']
    } as Store<AppState>;

    outcome = {
      reachable: true,
      startedFrom: 'pending'
    };

    phaseAfterFailedStartMock = phaseAfterFailedStart as jest.Mock<PhaseAfterFailedStart>;
    phaseAfterFailedStartMock.mockReset();
    phaseAfterFailedStartMock.mockReturnValue('unlock');
    startupRouteForMock = startupRouteFor as jest.Mock<StartupRouteFor>;
    startupRouteForMock.mockReset();
    startupRouteForMock.mockReturnValue('/unlock');
  });

  it('initializes the global store when the outcome is reachable', (): void => {
    applyStartOutcome(store, router, globalStore, outcome);

    expect(dispatch).toHaveBeenCalledTimes(1);
    expect(dispatch).toHaveBeenCalledWith(AppActions.initialize());
  });

  it('keeps the phase and navigates nowhere when the outcome is reachable', (): void => {
    applyStartOutcome(store, router, globalStore, outcome);

    expect(getState(store)).toEqual(initialState);
    expect(phaseAfterFailedStartMock).not.toHaveBeenCalled();
    expect(navigate).not.toHaveBeenCalled();
  });

  describe('when the outcome is unreachable', (): void => {
    beforeEach((): void => {
      outcome = {
        reachable: false,
        startedFrom: 'scrypt'
      };
    });

    it('enters the phase derived from the state the start was made with, and marks the start as failed', (): void => {
      applyStartOutcome(store, router, globalStore, outcome);

      expect(dispatch).not.toHaveBeenCalled();
      expect(phaseAfterFailedStartMock).toHaveBeenCalledTimes(1);
      expect(phaseAfterFailedStartMock).toHaveBeenCalledWith('scrypt');
      expect(getState(store)).toEqual({...initialState, phase: 'unlock', startFailed: true}); // unlock is from parent beforeEach()
    });

    it('navigates to the route of that phase', (): void => {
      applyStartOutcome(store, router, globalStore, outcome);

      expect(dispatch).not.toHaveBeenCalled();
      expect(startupRouteForMock).toHaveBeenCalledTimes(1);
      expect(startupRouteForMock).toHaveBeenCalledWith('unlock'); // unlock is from parent beforeEach()
      expect(navigate).toHaveBeenCalledTimes(1);
      expect(navigate).toHaveBeenCalledWith(['/unlock']);
    });

    it('navigates nowhere for a phase that has no route', (): void => {
      startupRouteForMock.mockReturnValue(null);

      applyStartOutcome(store, router, globalStore, outcome);

      expect(dispatch).not.toHaveBeenCalled();
      expect(getState(store)).toEqual({
        ...initialState,
        phase: 'unlock', // unlock is from parent beforeEach()
        startFailed: true});
      expect(navigate).not.toHaveBeenCalled();
    });
  });
});
