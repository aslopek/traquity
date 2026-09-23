import {beforeEach, describe, expect, it, jest} from "@jest/globals";
import {Injector, runInInjectionContext, Signal, signal} from "@angular/core";
import {Action, MemoizedSelector, Store} from "@ngrx/store";
import {AppState} from "../../store/app.state";
import {NotificationActions} from "../../store/notification/notification.actions";
import {notifications as notificationsSelector} from "../../store/notification/notification.selector";
import {Notification} from "../../store/notification/notification.state";
import {SnackbarComponent} from "./snackbar.component";

/** The part of `Store` the component under test reaches for. */
type StoreMock = {
  dispatch: jest.Mock<(action: Action) => void>
  selectSignal: (selector: MemoizedSelector<AppState, Notification[]>) => Signal<Notification[]>
};

describe("SnackbarComponent", (): void => {
  let held: Notification[];
  let dispatch: jest.Mock<(action: unknown) => void>;
  let component: SnackbarComponent;

  beforeEach((): void => {
    held = [{id: 1, message: "Prices could not be loaded"}];
    dispatch = jest.fn<(action: unknown) => void>();
    const store: Store<AppState> = {
      dispatch,
      selectSignal: (selector: MemoizedSelector<AppState, Notification[]>): Signal<Notification[]> =>
        selector === notificationsSelector ? signal(held) : signal([])
    } satisfies StoreMock as unknown as Store<AppState>;
    const injector: Injector = Injector.create({
      providers: [
        {provide: Store, useValue: store}
      ]
    });

    component = runInInjectionContext(injector, (): SnackbarComponent => new SnackbarComponent());
  });

  it("shows the notifications held in the store", (): void => {
    expect(component["notifications"]()).toBe(held);
  });

  it("removes the notification the dismissed id belongs to", (): void => {
    component["dismiss"](held[0].id);

    expect(dispatch).toHaveBeenCalledTimes(1);
    expect(dispatch).toHaveBeenCalledWith(NotificationActions.removeNotification({id: held[0].id}));
  });
});
