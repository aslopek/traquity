import {beforeEach, describe, expect, it, jest} from '@jest/globals';
import {Injector, runInInjectionContext, signal, WritableSignal} from '@angular/core';
import {TableInputFieldComponent} from './table-input-field.component';

describe('TableInputFieldComponent', (): void => {
  let component: TableInputFieldComponent;
  let bound: WritableSignal<number | undefined>;
  let emitted: jest.Mock<(value: number | undefined) => void>;

  beforeEach((): void => {
    component = runInInjectionContext(Injector.create({providers: []}), (): TableInputFieldComponent => new TableInputFieldComponent());
    bound = signal<number | undefined>(undefined);
    Object.assign(component, {value: bound});
    emitted = jest.fn<(value: number | undefined) => void>();
    component.updateValue.subscribe(emitted);
  });

  it('emits the typed number, with either decimal separator', (): void => {
    type('20');
    type('19,5');
    type('22.1')

    expect(emitted.mock.calls).toEqual([
      [20],
      [19.5],
      [22.1]
    ]);
  });

  it('emits undefined once the field is cleared',(): void => {
    type('20');
    type('');

    expect(emitted.mock.calls).toEqual([
      [20],
      [undefined]
    ]);
  });

  it('emits nothing when the typed number equals the value set on the input', (): void => {
    const current: number = 20;
    bound.set(current);

    type(String(current));

    expect(emitted).not.toHaveBeenCalled();
  });

  function type(value: string): void {
    component['emit'](value);
  }
});
