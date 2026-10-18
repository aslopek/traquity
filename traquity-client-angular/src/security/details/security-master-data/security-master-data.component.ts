import {Component, DestroyRef, effect, inject, input, InputSignal, output, OutputEmitterRef, signal, WritableSignal,} from '@angular/core';
import {takeUntilDestroyed, toObservable} from '@angular/core/rxjs-interop';
import {getSecurity} from '../../../store/security/security.selector';
import {Store} from '@ngrx/store';
import {AppState} from '../../../store/app.state';
import {SecurityCreate, SecurityRead, SecurityType,} from '../../../gen/api/security';
import {FieldTree, form, FormField, maxLength, minLength, pattern, required, SchemaPathTree,} from '@angular/forms/signals';
import {MatFormField, MatInput, MatLabel} from '@angular/material/input';
import {MatChipGrid, MatChipInput, MatChipInputEvent, MatChipRemove, MatChipRow,} from '@angular/material/chips';
import {MatIcon} from '@angular/material/icon';
import {MatOption, MatSelect} from '@angular/material/select';
import {MatButton} from '@angular/material/button';
import {FilePreviewPipe} from '../../../common/pipe/file-preview.pipe';
import {SecurityLogoUrlPipe} from '../../../common/pipe/security-logo-url.pipe';
import {SecurityTypeDisplayNamePipe} from '../../../common/pipe/security-type-display-name.pipe';

type FormModel = {
  isin: string;
  symbols: string[];
  name: string;
  wkn: string;
  sector: string;
  securityType: SecurityType;
};

@Component({
  selector: 'app-security-master-data',
  imports: [
    MatFormField,
    MatLabel,
    MatInput,
    MatChipGrid,
    MatChipRow,
    MatChipRemove,
    MatIcon,
    MatChipInput,
    MatSelect,
    MatOption,
    MatButton,
    FormField,
    FilePreviewPipe,
    SecurityLogoUrlPipe,
    SecurityTypeDisplayNamePipe,
  ],
  templateUrl: './security-master-data.component.html',
  styleUrl: './security-master-data.component.scss',
})
export class SecurityMasterDataComponent {
  readonly securityId: InputSignal<number | undefined> = input<number>();
  readonly masterDataChanged: OutputEmitterRef<SecurityCreate | null> =
    output<SecurityCreate>();
  readonly logoChanged: OutputEmitterRef<File> = output<File>();

  protected readonly logo: WritableSignal<File | undefined> = signal<File | undefined>(undefined);
  protected readonly hasExistingLogo: WritableSignal<boolean> = signal<boolean>(false);
  protected readonly securityTypes = [
    SecurityType.STOCK,
    SecurityType.ETF,
    SecurityType.OTHER,
  ] as const;
  protected readonly form: FieldTree<FormModel>;
  private readonly formModel: WritableSignal<FormModel>;
  private readonly store: Store<AppState> = inject(Store);

  constructor(destroyRef: DestroyRef) {
    this.formModel = signal<FormModel>({
      isin: '',
      symbols: [],
      name: '',
      wkn: '',
      sector: '',
      securityType: SecurityType.STOCK,
    });
    this.form = form(
      this.formModel,
      (schemaPath: SchemaPathTree<FormModel>): void => {
        required(schemaPath.isin);
        pattern(schemaPath.isin, /^[A-Z]{2}[A-Z0-9]{10}$/);

        required(schemaPath.name);
        minLength(schemaPath.name, 1);
        maxLength(schemaPath.name, 255);

        pattern(schemaPath.wkn, /^[A-Z0-9]{6}$/);

        minLength(schemaPath.sector, 1);
        maxLength(schemaPath.sector, 255);

        required(schemaPath.securityType);
      },
    );

    toObservable(this.securityId)
      .pipe(takeUntilDestroyed(destroyRef))
      .subscribe((value: number | undefined): void => {
        if (value === undefined) {
          return;
        }

        const security: SecurityRead | null = this.store.selectSignal(
          getSecurity(value),
        )();
        if (security == null) {
          return;
        }

        this.form.isin().value.set(security.isin);
        this.form.symbols().value.set(security.symbols);
        this.form.name().value.set(security.name);
        this.form.wkn().value.set(security.wkn ?? '');
        this.form.sector().value.set(security.sector ?? '');
        this.form.securityType().value.set(security.securityType);
        this.hasExistingLogo.set(security._links.logo != null);
      });

    effect((): void => {
      const formData: SecurityCreate = {
        isin: this.form.isin().value(),
        symbols: this.form.symbols().value(),
        name: this.form.name().value(),
        wkn: this.form.wkn().value(),
        sector: this.form.sector().value(),
        securityType: this.form.securityType().value(),
      };

      let valid: boolean = true;
      for (const [, field] of this.form) {
        valid = valid && field().valid();
      }

      if (valid) {
        this.masterDataChanged.emit(formData);
      } else {
        this.masterDataChanged.emit(null);
      }
    });
  }

  protected addSymbol(event: MatChipInputEvent): void {
    const newSymbol: string = event.value;
    const existingSymbol: string | undefined = this.form
      .symbols()
      .value()
      .find((value: string) => value === newSymbol);

    if (existingSymbol === undefined) {
      this.form
        .symbols()
        .value.set([...this.form.symbols().value(), newSymbol]);
    }
    event.chipInput.clear();
  }

  protected removeSymbol(symbol: string): void {
    const symbols: string[] = this.form
      .symbols()
      .value()
      .filter((value: string) => value !== symbol);
    this.form.symbols().value.set(symbols);
  }

  protected selectFile(event: Event): void {
    const files: FileList | null = (event.target as HTMLInputElement).files;
    if (files != null) {
      this.logo.set(files[0]);
      this.logoChanged.emit(files[0]);
    }
  }
}
