import {Component, input, InputSignal, OnChanges, SimpleChanges,} from "@angular/core";
import {DividendAnnouncementRead} from "../../../gen/api/notification/dividend-announcement";
import {DividendAnnouncementComponent} from "../dividend-announcement/dividend-announcement.component";

@Component({
  selector: "app-dividend-announcements-week",
  imports: [DividendAnnouncementComponent],
  templateUrl: "./dividend-announcements-week.component.html",
  styleUrl: "./dividend-announcements-week.component.scss",
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

    let day: number;
    for (const dividendAnnouncement of this.dividendAnnouncements()) {
      day = (new Date(dividendAnnouncement.payDate).getDay() + 6) % 7;
      day = Math.min(day, indexedDays.length - 1); // day must not be larger than the largest index
      indexedDays[day].push(dividendAnnouncement);
    }
  }
}
