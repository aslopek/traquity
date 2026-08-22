import {createActionGroup, emptyProps, props} from '@ngrx/store';
import {ElectronAiState} from "../../app/startup/startup-bridge.type";

export type LoadAiStateDoneActionArgs = {
  electronAiState: ElectronAiState
};

export const AiActions = createActionGroup({
  source: 'Ai',
  events: {
    'Load Ai State Done': props<LoadAiStateDoneActionArgs>(),
    'Confirm Ai Notice': emptyProps()
  }
});
