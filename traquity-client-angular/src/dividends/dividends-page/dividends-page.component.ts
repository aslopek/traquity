import {Component} from '@angular/core';
import {DividendAnnouncementsViewComponent} from '../dividend-announcements-view/dividend-announcements-view.component';

@Component({
  selector: 'app-dividends-page',
  imports: [DividendAnnouncementsViewComponent],
  templateUrl: './dividends-page.component.html',
  styleUrl: './dividends-page.component.scss',
})
export class DividendsPageComponent {
}
