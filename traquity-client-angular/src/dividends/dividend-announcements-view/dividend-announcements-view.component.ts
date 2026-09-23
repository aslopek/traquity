import {Component, DestroyRef, inject,} from "@angular/core";
import {MatIcon} from "@angular/material/icon";
import {takeUntilDestroyed} from "@angular/core/rxjs-interop";
import {MatAccordion, MatExpansionPanel, MatExpansionPanelHeader, MatExpansionPanelTitle,} from "@angular/material/expansion";
import {LetDirective} from "@ngrx/component";
import {select, Store} from "@ngrx/store";
import {Observable} from "rxjs";
import {TqDatePipe} from "../../common/pipe/tq-date.pipe";
import {DividendAnnouncementRead} from "../../gen/api/notification/dividend-announcement";
import {getAllDividendAnnouncements} from "../../store/dividend-announcement/dividend-announcement.selector";
import {DividendAnnouncementsWeekComponent} from "./dividend-announcements-week/dividend-announcements-week.component";
import {AppState} from "../../store/app.state";

@Component({
  selector: "app-dividend-announcements-view",
  imports: [
    DividendAnnouncementsWeekComponent,
    MatAccordion,
    MatExpansionPanel,
    MatExpansionPanelHeader,
    MatExpansionPanelTitle,
    TqDatePipe,
    LetDirective,
    MatIcon,
  ],
  templateUrl: "./dividend-announcements-view.component.html",
  styleUrl: "./dividend-announcements-view.component.scss",
})
export class DividendAnnouncementsViewComponent {
  private readonly store: Store<AppState> = inject(Store);
  protected dividendAnnouncements$: Observable<DividendAnnouncementRead[]> =
    this.store.pipe(select(getAllDividendAnnouncements));
  protected dividendAnnouncementsByWeek: {
    [date: string]: DividendAnnouncementRead[];
  } = {};
  protected weeks: string[] = [];

  constructor(destroyRef: DestroyRef) {
    this.dividendAnnouncements$
      .pipe(takeUntilDestroyed(destroyRef))
      .subscribe((dividendAnnouncements) => {
        dividendAnnouncements.sort(
          (a, b) =>
            new Date(a.payDate).getTime() - new Date(b.payDate).getTime(),
        );
        const grouped: { [s: string]: DividendAnnouncementRead[] } = {};
        let date: Date;
        let firstDayOfWeek: Date;
        let timeZoneOffset: number;
        let key: string;

        for (const dividendAnnouncement of dividendAnnouncements) {
          date = new Date(dividendAnnouncement.payDate);
          firstDayOfWeek = this.getFirstDayOfWeek(date);
          timeZoneOffset = firstDayOfWeek.getTimezoneOffset() * 60000;
          firstDayOfWeek = new Date(firstDayOfWeek.getTime() - timeZoneOffset);

          key = firstDayOfWeek.toISOString().split("T")[0];
          if (!grouped[key]) {
            grouped[key] = [];
          }

          grouped[key].push(dividendAnnouncement);
        }
        this.dividendAnnouncementsByWeek = grouped;
        this.weeks = Object.keys(grouped).sort();
      });
  }

  private getFirstDayOfWeek(date: Date): Date {
    const firstDayOfWeek: Date = new Date(date.getTime());
    firstDayOfWeek.setHours(0, 0, 0, 0);
    const day: number = firstDayOfWeek.getDay();
    const diff: number = (day <= 0 ? -6 : 1) - day;
    firstDayOfWeek.setDate(firstDayOfWeek.getDate() + diff);
    return firstDayOfWeek;
  }
}
