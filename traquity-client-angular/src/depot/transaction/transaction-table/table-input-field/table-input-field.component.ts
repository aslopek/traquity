import {Component, input, InputSignal, linkedSignal, output, OutputEmitterRef, WritableSignal} from '@angular/core';
import {MatInputModule} from '@angular/material/input';

@Component({
  selector: 'app-table-input-field',
  imports: [MatInputModule],
  templateUrl: './table-input-field.component.html',
  styleUrl: './table-input-field.component.scss',
})
export class TableInputFieldComponent {

  readonly value: InputSignal<number | undefined> = input<number | undefined>(undefined);
  readonly invalid: InputSignal<boolean> = input<boolean>(false);

  /** Emits the typed number, or `undefined` when the field is empty or holds no number. */
  readonly updateValue: OutputEmitterRef<number | undefined> = output<number | undefined>();

  private readonly previousValue: WritableSignal<number | undefined> = linkedSignal((): number | undefined => this.value());

  protected emit(text: string): void {
    const value: string = text.trim().replace(',', '.');
    let parsedValue: number | undefined = value === '' ? undefined : Number(value);

    if (parsedValue !== undefined && isNaN(parsedValue)) {
      parsedValue = undefined;
    }

    if (parsedValue !== this.previousValue()) {
      this.previousValue.set(parsedValue);
      this.updateValue.emit(parsedValue);
    }
  }
}
