import {Component, computed, inject, input, InputSignal, Signal} from '@angular/core';
import {Store} from '@ngrx/store';
import {hideAbsoluteValues} from '../../../store/app-config/app-config.selector';
import {TqCurrencyPipe} from '../../pipe/tq-currency.pipe';
import {TqPercentPipe} from '../../pipe/tq-percent.pipe';
import {AppState} from '../../../store/app.state';
import {RelativePerformance} from '../../types/relative-performance';

@Component({
  selector: 'app-performance-label',
  imports: [TqPercentPipe, TqCurrencyPipe],
  templateUrl: './performance-label.component.html',
  styleUrl: './performance-label.component.scss',
})
export class PerformanceLabelComponent {
  readonly performanceAbsolute: InputSignal<number> = input.required<number>();
  readonly performanceRelative: InputSignal<RelativePerformance> = input.required<RelativePerformance>();
  readonly currency: InputSignal<string> = input.required<string>();

  private readonly appConfigStore: Store<AppState> = inject(Store);
  protected readonly hideAbsoluteValues: Signal<boolean> = this.appConfigStore.selectSignal(hideAbsoluteValues);

  protected readonly performanceIsPositive: Signal<boolean> = computed((): boolean => this.performanceAbsolute() >= 0);

  protected readonly performanceAbsoluteStyle: Signal<string> = computed(
    (): string => `padding absolute-performance ${this.performanceIsPositive() ? 'performance-positive' : 'performance-negative'}`,
  );

  protected readonly performanceRelativeStyle: Signal<string> = computed((): string => {
    const base: string = `padding ${this.performanceIsPositive() ? 'performance-positive' : 'performance-negative'}`;
    return this.hideAbsoluteValues() ? `${base} absolute-performance-hidden` : `${base} relative-performance`;
  });
}
