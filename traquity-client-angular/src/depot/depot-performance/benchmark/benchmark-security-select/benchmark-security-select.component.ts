import {Component, computed, inject, output, OutputEmitterRef, Signal, signal, WritableSignal} from '@angular/core';
import {MatAutocompleteModule} from '@angular/material/autocomplete';
import {MatInputModule} from '@angular/material/input';
import {Store} from '@ngrx/store';
import {SecurityLogoComponent} from '../../../../common/components/security-logo/security-logo.component';
import {SecurityNamePipe} from '../../../../common/pipe/security-name.pipe';
import {AppState} from '../../../../store/app.state';
import {securitiesById, securityIdsMatchingName} from '../../../../store/security/security.selector';
import {TqDatePipe} from '../../../../common/pipe/tq-date.pipe';
import {DepotPerformanceStore, ReadableDepotPerformanceStore} from '../../store/depot-performance.store';
import {BenchmarkSecurityOption, benchmarkSecurityOptions} from './benchmark-security-option';

@Component({
  selector: 'app-benchmark-security-select',
  imports: [
    MatAutocompleteModule,
    MatInputModule,
    SecurityLogoComponent,
    SecurityNamePipe,
    TqDatePipe,
  ],
  providers: [SecurityNamePipe],
  templateUrl: './benchmark-security-select.component.html',
  styleUrl: './benchmark-security-select.component.scss',
})
export class BenchmarkSecuritySelectComponent {

  /** Emits the picked security ID, and `null` whenever the text changes after a pick. */
  readonly securityId: OutputEmitterRef<number | null> = output<number | null>();

  private readonly store: Store<AppState> = inject(Store);
  private readonly securityNamePipe: SecurityNamePipe = inject(SecurityNamePipe);
  private readonly depotPerformanceStore: ReadableDepotPerformanceStore = inject(DepotPerformanceStore);

  private securityPicked: boolean = false;

  protected readonly securityText: WritableSignal<string> = signal<string>('');

  protected readonly securityOptions: Signal<BenchmarkSecurityOption[]> = computed((): BenchmarkSecurityOption[] =>
    benchmarkSecurityOptions(
      this.store.selectSignal(securityIdsMatchingName(this.securityText()))(),
      this.store.selectSignal(securitiesById)(),
      this.depotPerformanceStore.depotValues()[0]?.date ?? null
    ));

  protected readonly hasSecurities: Signal<boolean> = computed((): boolean =>
    this.store.selectSignal(securityIdsMatchingName(''))().length > 0);

  protected readonly securityNameOf: (securityId: number | null) => string = (securityId: number | null): string =>
    securityId === null ? '' : this.securityNamePipe.transform(securityId);

  protected filterSecurities(text: string): void {
    this.securityText.set(text);
    if (this.securityPicked) {
      this.securityPicked = false;
      this.securityId.emit(null);
    }
  }

  protected selectSecurity(securityId: number): void {
    this.securityText.set(this.securityNamePipe.transform(securityId));
    this.securityPicked = true;
    this.securityId.emit(securityId);
  }
}
