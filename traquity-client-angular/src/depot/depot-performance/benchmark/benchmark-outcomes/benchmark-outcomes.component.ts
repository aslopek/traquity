import {Component, input, InputSignal, Signal} from '@angular/core';
import {Store} from '@ngrx/store';
import {AppState} from '../../../../store/app.state';
import {selectedDepotCurrency} from '../../../../store/depot/depot.selector';
import {hideAbsoluteValues} from '../../../../store/app-config/app-config.selector';
import {ObfuscatedValueComponent} from '../../../../common/components/obfuscated-value/obfuscated-value.component';
import {TqCurrencyPipe} from '../../../../common/pipe/tq-currency.pipe';
import {TqDatePipe} from '../../../../common/pipe/tq-date.pipe';
import {TqPercentPipe} from '../../../../common/pipe/tq-percent.pipe';
import {BenchmarkOutcome} from '../../store/computed/benchmark-outcomes';

@Component({
  selector: 'app-benchmark-outcomes',
  imports: [
    ObfuscatedValueComponent,
    TqCurrencyPipe,
    TqDatePipe,
    TqPercentPipe
  ],
  templateUrl: './benchmark-outcomes.component.html',
  styleUrl: './benchmark-outcomes.component.scss'
})
export class BenchmarkOutcomesComponent {

  /** The outcomes to show, one row each. */
  readonly outcomes: InputSignal<BenchmarkOutcome[]> = input.required<BenchmarkOutcome[]>();

  protected readonly currency: Signal<string>;
  protected readonly hideAbsoluteValues: Signal<boolean>;

  constructor(store: Store<AppState>) {
    this.currency = store.selectSignal(selectedDepotCurrency);
    this.hideAbsoluteValues = store.selectSignal(hideAbsoluteValues);
  }
}
