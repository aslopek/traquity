import {Component, DestroyRef, inject, Input, OnChanges, SimpleChanges,} from '@angular/core';
import {takeUntilDestroyed} from '@angular/core/rxjs-interop';
import {Store} from '@ngrx/store';
import {Observable} from 'rxjs';
import {hideAbsoluteValues} from '../../../store/app-config/app-config.selector';
import {TqCurrencyPipe} from '../../pipe/tq-currency.pipe';
import {TqPercentPipe} from '../../pipe/tq-percent.pipe';
import {AppState} from '../../../store/app.state';

@Component({
  selector: 'app-performance-label',
  imports: [TqPercentPipe, TqCurrencyPipe],
  templateUrl: './performance-label.component.html',
  styleUrl: './performance-label.component.scss',
})
export class PerformanceLabelComponent implements OnChanges {
  protected _performanceAbsolute: number = 0;
  protected _performanceRelative: number | 'infinity' = 0;
  protected _currency: string = 'EUR';
  protected performanceIsPositive: boolean = true;
  protected performanceAbsoluteStyle: string =
    'absolute-performance performance-positive';
  protected performanceRelativeStyle: string =
    'relative-performance performance-positive';

  private readonly appConfigStore: Store<AppState> = inject(Store);
  private readonly hideAbsoluteValues$: Observable<boolean> =
    this.appConfigStore.select(hideAbsoluteValues);
  protected hideAbsoluteValues: boolean = true;

  constructor(destroyRef: DestroyRef) {
    this.hideAbsoluteValues$
      .pipe(takeUntilDestroyed(destroyRef))
      .subscribe((hideAbsoluteValues) => {
        this.hideAbsoluteValues = hideAbsoluteValues;
      });
  }

  @Input({ required: true })
  set performanceAbsolute(performanceAbsolute: number) {
    this._performanceAbsolute = performanceAbsolute;
  }

  get performanceAbsolute(): number {
    return this._performanceAbsolute;
  }

  @Input({ required: true })
  set performanceRelative(performanceRelative: number | 'infinity') {
    this._performanceRelative = performanceRelative;
  }

  get performanceRelative(): number | 'infinity' {
    return this._performanceRelative;
  }

  @Input({ required: true })
  set currency(currency: string) {
    this._currency = currency;
  }

  get currency(): string {
    return this._currency;
  }

  ngOnChanges(changes: SimpleChanges): void {
    this.performanceIsPositive = this.performanceAbsolute >= 0;

    if (this.performanceIsPositive) {
      this.performanceAbsoluteStyle =
        'padding absolute-performance performance-positive';
      this.performanceRelativeStyle = 'padding performance-positive';
    } else {
      this.performanceAbsoluteStyle =
        'padding absolute-performance performance-negative';
      this.performanceRelativeStyle = 'padding performance-negative';
    }

    if (this.hideAbsoluteValues) {
      this.performanceRelativeStyle = `${this.performanceRelativeStyle} absolute-performance-hidden`;
    } else {
      this.performanceRelativeStyle = `${this.performanceRelativeStyle} relative-performance`;
    }
  }
}
