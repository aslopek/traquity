import {Component, Signal} from '@angular/core';
import {DepotPerformanceStore} from './store/depot-performance.store';
import {DataRangeSelectionComponent} from './data-range-selection/data-range-selection.component';
import {DepotPerformanceKpisComponent} from './depot-performance-kpis/depot-performance-kpis.component';
import {DepotPerformanceChartComponent} from './depot-performance-chart/depot-performance-chart.component';
import {TransactionOverviewComponent} from './transaction-overview/transaction-overview.component';
import {Store} from '@ngrx/store';
import {AppState} from '../../store/app.state';
import {hideAbsoluteValues} from '../../store/app-config/app-config.selector';
import {BenchmarkComponent} from './benchmark/benchmark.component';

@Component({
  selector: 'app-depot-performance',
  imports: [
    DataRangeSelectionComponent,
    DepotPerformanceKpisComponent,
    DepotPerformanceChartComponent,
    TransactionOverviewComponent,
    BenchmarkComponent
  ],
  providers: [
    DepotPerformanceStore
  ],
  templateUrl: './depot-performance.component.html',
  styleUrl: './depot-performance.component.scss',
})
export class DepotPerformanceComponent {

  protected readonly hideAbsoluteValues: Signal<boolean>;

  constructor(store: Store<AppState>) {
    this.hideAbsoluteValues = store.selectSignal(hideAbsoluteValues);
  }
}
