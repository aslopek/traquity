import {beforeEach, describe, expect, it, jest} from '@jest/globals';
import {Injector, runInInjectionContext, signal} from '@angular/core';
import {Store} from '@ngrx/store';
import {SecurityNamePipe} from '../../../../common/pipe/security-name.pipe';
import {securityIdsMatchingName} from '../../../../store/security/security.selector';
import {BenchmarkSecuritySelectComponent} from './benchmark-security-select.component';

jest.mock('../../../../store/security/security.selector', (): unknown => ({
  securityIdsMatchingName: jest.fn((text: string): string => text),
}));

describe('BenchmarkSecuritySelectComponent', (): void => {
  let component: BenchmarkSecuritySelectComponent;
  let selectSignal: jest.Mock<(selector: unknown) => unknown>;
  let matchingByText: Map<string, number[]>;
  let transform: jest.Mock<(securityId: number) => string>;
  let emitted: jest.Mock<(securityId: number | null) => void>;

  beforeEach((): void => {
    matchingByText = new Map<string, number[]>([
      ['', [3, 5]],
      ['sec', [3, 5]],
      ['secu', [3]]
    ]);
    jest.mocked(securityIdsMatchingName).mockClear();
    selectSignal = jest.fn<(selector: unknown) => unknown>((selector: unknown): unknown =>
      signal<number[]>(matchingByText.get(selector as string) ?? []));
    transform = jest.fn<(securityId: number) => string>((securityId: number): string => `Security ${securityId}`);
    emitted = jest.fn<(securityId: number | null) => void>();
    component = createComponent();
    component.securityId.subscribe(emitted);
  });

  it('emits nothing when the text changes without a pick', (): void => {
    const text: string = 'sec';

    component['filterSecurities'](text);
    component['filterSecurities'](text + 'u');

    expect(emitted).not.toHaveBeenCalled();
    expect(component['securityText']()).toBe(text + 'u');
    expect(component['securityOptions']()).toEqual(matchingByText.get(text + 'u'));
    expect(jest.mocked(securityIdsMatchingName)).toHaveBeenLastCalledWith(text + 'u');
  });

  it('emits the picked id and shows the security name', (): void => {
    const securityId: number = 5;

    component['selectSecurity'](securityId);

    expect(emitted.mock.calls).toEqual([[securityId]]);
    expect(transform.mock.calls).toEqual([[securityId]]);
    expect(component['securityText']()).toBe(transform.mock.results[0].value);
  });

  it('emits null once when the text changes after a pick', (): void => {
    const securityId: number = 5;

    component['selectSecurity'](securityId);
    component['filterSecurities']('x');
    component['filterSecurities']('xy');

    expect(emitted.mock.calls).toEqual([
      [securityId],
      [null]
    ]);
  });

  it('emits null again when the text changes after a second pick', (): void => {
    const first: number = 5;
    const second: number = 3;

    component['selectSecurity'](first);
    component['filterSecurities']('x');
    component['selectSecurity'](second);
    component['filterSecurities']('y');

    expect(emitted.mock.calls).toEqual([
      [first],
      [null],
      [second],
      [null]
    ]);
  });

  it('has securities when the store knows some', (): void => {
    expect(component['hasSecurities']()).toBe(true);
  });

  it('has no securities when the store knows none', (): void => {
    matchingByText.set('', []);
    component = createComponent();

    expect(component['hasSecurities']()).toBe(false);
  });

  function createComponent(): BenchmarkSecuritySelectComponent {
    const injector: Injector = Injector.create({
      providers: [
        {provide: Store, useValue: {selectSignal}},
        {provide: SecurityNamePipe, useValue: {transform}},
      ],
    });
    return runInInjectionContext(injector, (): BenchmarkSecuritySelectComponent => new BenchmarkSecuritySelectComponent());
  }
});
