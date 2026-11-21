import {Component, inject, OnInit} from '@angular/core';
import {RouterOutlet} from '@angular/router';
import {ReadableStartupStore, StartupStore} from './startup/store/startup.store';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  templateUrl: 'app.component.html',
  styleUrls: ['app.component.scss']
})
export class AppComponent implements OnInit {

  private readonly startupStore: ReadableStartupStore = inject(StartupStore);

  ngOnInit(): void {
    if (this.startupStore.mode() === 'boot') {
      this.startupStore.startBackend('');
    } else if (this.startupStore.mode() == null) {
      // without a bridge the backend is started outside the app and needs to start the polling itself
      this.startupStore.waitForBackend();
    }
  }
}
