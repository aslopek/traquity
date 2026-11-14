import {Component, input, InputSignal, OnChanges, SimpleChanges,} from '@angular/core';
import {DividendAnnouncementRead} from '../../../gen/api/notification/dividend-announcement';
import {DividendAnnouncementComponent} from '../dividend-announcement/dividend-announcement.component';
import {workdayColumnOf} from '../pay-date-week';

@Component({
  selector: 'app-dividend-announcements-week',
  imports: [DividendAnnouncementComponent],
  templateUrl: './dividend-announcements-week.component.html',
  styleUrl: './dividend-announcements-week.component.scss',
})
export class DividendAnnouncementsWeekComponent implements OnChanges {
  dividendAnnouncements: InputSignal<DividendAnnouncementRead[]> =
    input.required<DividendAnnouncementRead[]>();
  protected monday: DividendAnnouncementRead[] = [];
  protected tuesday: DividendAnnouncementRead[] = [];
  protected wednesday: DividendAnnouncementRead[] = [];
  protected thursday: DividendAnnouncementRead[] = [];
  protected friday: DividendAnnouncementRead[] = [];

  ngOnChanges(changes: SimpleChanges): void {
    this.monday = [];
    this.tuesday = [];
    this.wednesday = [];
    this.thursday = [];
    this.friday = [];

    const indexedDays: DividendAnnouncementRead[][] = [
      this.monday,
      this.tuesday,
      this.wednesday,
      this.thursday,
      this.friday,
    ];

    for (const dividendAnnouncement of this.dividendAnnouncements()) {
      indexedDays[workdayColumnOf(dividendAnnouncement.payDate)].push(dividendAnnouncement);
    }
  }
}
