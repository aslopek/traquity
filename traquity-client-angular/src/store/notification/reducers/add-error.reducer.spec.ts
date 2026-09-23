import {beforeEach, describe, expect, it} from '@jest/globals';
import {AddErrorActionArgs} from '../notification.actions';
import {initialState} from '../notification.reducer';
import {NotificationState} from '../notification.state';
import {addError} from './add-error.reducer';

describe('addError', (): void => {
  let state: Readonly<NotificationState>;
  let args: AddErrorActionArgs;

  beforeEach((): void => {
    state = {...initialState};
    args = {message: 'Prices could not be loaded'};
  });

  it('appends the error under the first id', (): void => {
    const result: NotificationState = addError(state, args);

    expect(result.notifications).toEqual([{id: 1, message: args.message}]);
  });

  it('appends the error under an id above every id held', (): void => {
    state = {
      ...initialState,
      notifications: [
        {id: 2, message: 'Older'},
        {id: 4, message: 'Newer'}
      ]
    };

    const result: NotificationState = addError(state, args);

    expect(result.notifications).toEqual([
      {id: 2, message: 'Older'},
      {id: 4, message: 'Newer'},
      {id: 5, message: args.message}
    ]);
  });
});
