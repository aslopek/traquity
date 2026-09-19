import {Component, input, InputSignal,} from "@angular/core";
import {TqCurrencyPipe, TqDatePipe, SecurityNamePipe} from "../../../common";
import {TqIconComponent} from "../../../common/components/tq-icon/tq-icon.component";
import {SecurityLogoUrlPipe} from "../../../common/pipe/security-logo-url.pipe";
import {DividendAnnouncementRead} from "../../../gen/api/notification/dividend-announcement";

@Component({
  selector: "app-dividend-announcement",
  imports: [
    TqCurrencyPipe,
    TqDatePipe,
    TqIconComponent,
    SecurityLogoUrlPipe,
    SecurityNamePipe,
  ],
  templateUrl: "./dividend-announcement.component.html",
  styleUrl: "./dividend-announcement.component.scss",
})
export class DividendAnnouncementComponent {
  dividendAnnouncement: InputSignal<DividendAnnouncementRead> =
    input.required<DividendAnnouncementRead>();
}
