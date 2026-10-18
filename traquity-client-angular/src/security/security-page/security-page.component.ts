import {Component, inject, signal, WritableSignal} from '@angular/core';
import {ReadableSecurityPageStore, securityPageStore,} from '../security-page-store/security-page.store';
import {SecurityTableComponent} from '../security-table/security-table.component';
import {HistoricalPriceChartComponent} from '../historical-price/historical-price-chart/historical-price-chart.component';

@Component({
  selector: 'app-security-page',
  imports: [
    SecurityTableComponent,
    HistoricalPriceChartComponent,
  ],
  templateUrl: 'security-page.component.html',
  styleUrls: ['security-page.component.scss'],
})
export class SecurityPageComponent {
  private readonly securityPageStore: ReadableSecurityPageStore =
    inject(securityPageStore);
  protected readonly selectedSecurityId: WritableSignal<number | undefined> =
    signal(undefined);

  constructor() {
    this.securityPageStore.initialize();
  }

  protected selectSecurityId(securityId: number): void {
    this.selectedSecurityId.update(
      (selected: number | undefined): number | undefined =>
        selected === securityId ? undefined : securityId,
    );
  }
}
