import {AsyncPipe} from '@angular/common';
import {Component, inject} from '@angular/core';
import {MatBadge} from '@angular/material/badge';
import {MatIconButton} from '@angular/material/button';
import {MatIcon} from '@angular/material/icon';
import {MatMenu, MatMenuTrigger} from '@angular/material/menu';
import {LetDirective} from '@ngrx/component';
import {select, Store} from '@ngrx/store';
import {Observable} from 'rxjs';
import {DividendAnnouncementRead} from '../../../gen/api/notification/dividend-announcement';
import {getNewDividendAnnouncements} from '../../../store/dividend-announcement/dividend-announcement.selector';
import {DividendAnnouncementNotificationComponent} from './dividend-announcement-notification/dividend-announcement-notification.component';
import {AppState} from '../../../store/app.state';

@Component({
  selector: 'app-notifications',
  imports: [
    MatIconButton,
    MatIcon,
    MatBadge,
    AsyncPipe,
    LetDirective,
    MatMenu,
    MatMenuTrigger,
    DividendAnnouncementNotificationComponent,
  ],
  templateUrl: './notifications.component.html',
  styleUrl: './notifications.component.scss',
})
export class NotificationsComponent {
  private readonly dividendAnnouncementStore: Store<AppState> = inject(Store);
  protected dividendAnnouncements$: Observable<DividendAnnouncementRead[]> =
    this.dividendAnnouncementStore.pipe(select(getNewDividendAnnouncements));
}
