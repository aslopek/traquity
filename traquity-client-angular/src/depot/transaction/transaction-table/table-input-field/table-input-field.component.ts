import {Component, EventEmitter, Input, Output,} from '@angular/core';
import {MatInputModule} from '@angular/material/input';

@Component({
  selector: 'app-table-input-field',
  imports: [MatInputModule],
  templateUrl: './table-input-field.component.html',
  styleUrl: './table-input-field.component.scss',
})
export class TableInputFieldComponent {
  @Input()
  value: number | undefined;

  @Output()
  updateValue: EventEmitter<number | undefined> = new EventEmitter<
    number | undefined
  >();

  private previousValue: number | undefined;

  protected emit(event: Event): void {
    const value: string = (event.target as HTMLInputElement).value.replace(
      ',',
      '.',
    );
    let parsedValue: number | undefined = Number(value);

    if (isNaN(parsedValue)) {
      parsedValue = undefined;
    }

    if (parsedValue !== this.previousValue) {
      this.previousValue = parsedValue;
      this.updateValue.emit(parsedValue);
    }
  }
}
