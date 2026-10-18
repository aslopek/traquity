import {Component, Signal} from '@angular/core';
import {MatIconModule} from '@angular/material/icon';
import {MatTooltipModule} from '@angular/material/tooltip';
import {firstValueFrom} from 'rxjs';
import {TqIconComponent} from '../../common/components/tq-icon/tq-icon.component';
import {DepotLogoApi, DepotRead} from '../../gen/api/depot';
import {Store} from '@ngrx/store';
import {AppState} from '../../store/app.state';
import {selectedDepots} from '../../store/depot/depot.selector';
import {DepotLogoUrlPipe} from '../../common/pipe/depot-logo-url.pipe';
import {DepotSelectComponent} from '../depot-select/depot-select.component';

@Component({
  selector: 'app-depot-controls',
  imports: [
    DepotSelectComponent,
    MatIconModule,
    MatTooltipModule,
    TqIconComponent,
    DepotLogoUrlPipe,
  ],
  templateUrl: 'depot-controls.component.html',
  styleUrls: ['depot-controls.component.scss'],
})
export class DepotControlsComponent {
  protected readonly selectedDepots: Signal<DepotRead[]>;

  constructor(
    private readonly depotLogoApi: DepotLogoApi,
    private readonly store: Store<AppState>,
  ) {
    this.selectedDepots = this.store.selectSignal(selectedDepots);
  }

  protected async updateLogo(event: Event): Promise<void> {
    const files: FileList | null = (event.target as HTMLInputElement).files;
    const depots: DepotRead[] = this.selectedDepots();
    if (files != null && depots.length > 0) {
      await firstValueFrom(this.depotLogoApi.setLogo(depots[0].id, files[0]));
    }
  }
}
