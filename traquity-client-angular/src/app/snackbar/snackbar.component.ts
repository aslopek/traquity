import {Component, inject, Signal} from "@angular/core";
import {MatButtonModule} from "@angular/material/button";
import {MatIconModule} from "@angular/material/icon";
import {MatTooltipModule} from "@angular/material/tooltip";
import {Store} from "@ngrx/store";
import {AppState} from "../../store/app.state";
import {NotificationActions} from "../../store/notification/notification.actions";
import {notifications as notificationsSelector} from "../../store/notification/notification.selector";
import {Notification} from "../../store/notification/notification.state";

@Component({
  selector: "app-snackbar",
  imports: [
    MatButtonModule,
    MatIconModule,
    MatTooltipModule,
  ],
  templateUrl: "snackbar.component.html",
  styleUrls: ["snackbar.component.scss"],
})
export class SnackbarComponent {

  private readonly store: Store<AppState> = inject(Store);
  protected readonly notifications: Signal<Notification[]> = this.store.selectSignal(notificationsSelector);

  protected dismiss(id: number): void {
    this.store.dispatch(NotificationActions.removeNotification({id}));
  }
}
