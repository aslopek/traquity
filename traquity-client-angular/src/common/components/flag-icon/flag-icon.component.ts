import {Component, computed, input, InputSignal, Signal,} from '@angular/core';
import {CountryPipe} from '../../pipe/country.pipe';

@Component({
  selector: 'app-flag-icon',
  imports: [CountryPipe],
  templateUrl: './flag-icon.component.html',
  styleUrl: './flag-icon.component.scss',
})
export class FlagIconComponent {
  readonly countryCode: InputSignal<string> = input.required<string>();
  protected readonly derivedCountryCode: Signal<string> = computed(
    (): string => {
      return this.countryCode().substring(0, 2).toUpperCase();
    },
  );
}
