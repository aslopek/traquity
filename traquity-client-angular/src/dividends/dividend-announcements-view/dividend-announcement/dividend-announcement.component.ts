import {Component, input, InputSignal,} from "@angular/core";
import {TqIconComponent} from "../../../common/components/tq-icon/tq-icon.component";
import {SecurityLogoUrlPipe} from "../../../common/pipe/security-logo-url.pipe";
import {SecurityNamePipe} from "../../../common/pipe/security-name.pipe";
import {TqCurrencyPipe} from "../../../common/pipe/tq-currency.pipe";
import {TqDatePipe} from "../../../common/pipe/tq-date.pipe";
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
