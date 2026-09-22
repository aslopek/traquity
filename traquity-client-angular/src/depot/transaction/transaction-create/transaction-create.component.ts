import {Component, computed, effect, EffectRef, inject, Signal, signal, WritableSignal} from "@angular/core";
import {MatProgressBarModule} from "@angular/material/progress-bar";
import {MatAutocompleteModule, MatAutocompleteSelectedEvent} from "@angular/material/autocomplete";
import {MatButtonModule} from "@angular/material/button";
import {MatSlideToggleModule} from "@angular/material/slide-toggle";
import {MatDatepickerModule} from "@angular/material/datepicker";
import {MatDialogRef} from "@angular/material/dialog";
import {MatIconModule} from "@angular/material/icon";
import {MatInputModule} from "@angular/material/input";
import {MatSelectModule} from "@angular/material/select";
import {FieldTree, form, FormField, pattern, required, SchemaPathTree} from "@angular/forms/signals";
import {Store} from "@ngrx/store";
import {firstValueFrom} from "rxjs";
import {
  SecurityNamePipe,
  TqCurrencyPipe,
  TitleToolbarComponent,
  TransactionTypeDisplayIconPipe,
  TransactionTypeDisplayNamePipe,
} from "../../../common";
import {TqNetValuePipe} from "../../../common/pipe/tq-net-value.pipe";
import {TransactionApi, TransactionCreate, TransactionType} from "../../../gen/api/depot-transaction";
import {AppState} from "../../../store/app.state";
import {DepotActions} from "../../../store/depot/depot.actions";
import {selectedDepotCurrency, selectedDepotIds} from "../../../store/depot/depot.selector";
import {ReadableTransactionPageStore, transactionPageStore} from "../transaction-store/transaction-page.store";
import {AiBridgeService} from "../../../bridge/ai-bridge.service";
import {FileDropDirective} from "../../../common/file-drop/file-drop.directive";
import {getActiveModel} from "../../../store/ai/ai.selector";
import {ActiveModel} from "../../../store/ai/selectors/get-active-model.selector";
import {securitiesByIsin, securityIdsMatchingName} from "../../../store/security/security.selector";
import {SecuritiesByIsin} from "../../../store/security/selectors/get-securities-by-isin.selector";
import {ReadableTransactionImportStore, TransactionImportStore} from "./store/transaction-import.store";
import {TransactionPrefill} from "./store/transaction-import.type";

type TransactionFormModel = {
  transactionType: TransactionType | null;
  isSpecialDividend: boolean;
  securityId: number | null;
  date: Date;
  time: string;
  securityCountOriginal: string;
  securityCountSplitAdjusted: string;
  grossValue: string;
  tax: string;
  fee: string;
};

type NetValueInput = {
  transactionType: TransactionType;
  grossValue: string;
  tax: string;
  fee: string;
};

const countRegex: RegExp = /^\d+([.,]\d+)?$/;
const monetaryRegex: RegExp = /^(0[.,]\d{0,2}|[1-9]\d*([.,]\d+)?)$/;
const timeRegex: RegExp = /^([0-1][0-9]|2[0-3]):[0-5][0-9]$/;

@Component({
  selector: "app-transaction-create",
  imports: [
    TitleToolbarComponent,
    MatInputModule,
    MatDatepickerModule,
    MatAutocompleteModule,
    MatButtonModule,
    TransactionTypeDisplayNamePipe,
    MatSelectModule,
    MatIconModule,
    TransactionTypeDisplayIconPipe,
    MatSlideToggleModule,
    TqNetValuePipe,
    TqCurrencyPipe,
    FormField,
    FileDropDirective,
    MatProgressBarModule,
    SecurityNamePipe,
  ],
  providers: [TransactionImportStore, SecurityNamePipe],
  templateUrl: "./transaction-create.component.html",
  styleUrl: "./transaction-create.component.scss",
})
export class TransactionCreateComponent {
  protected readonly TransactionType = TransactionType;
  protected readonly allTransactionTypes: TransactionType[] = Object.values(TransactionType)
    .filter((value: string): boolean => value !== TransactionType.SPECIAL_DIVIDEND);

  private readonly store: Store<AppState> = inject(Store);
  private readonly transactionApi: TransactionApi = inject(TransactionApi);
  private readonly dialogRef: MatDialogRef<TransactionCreateComponent> = inject(MatDialogRef);
  private readonly transactionPageStore: ReadableTransactionPageStore = inject(transactionPageStore);
  protected readonly importStore: ReadableTransactionImportStore = inject(TransactionImportStore);

  protected readonly bridgeAvailable: boolean = inject(AiBridgeService).available;

  private readonly activeModel: Signal<ActiveModel | null> = this.store.selectSignal(getActiveModel);
  private readonly knownSecurities: Signal<SecuritiesByIsin> = this.store.selectSignal(securitiesByIsin);
  private readonly securityNamePipe: SecurityNamePipe = inject(SecurityNamePipe);

  protected readonly depotId: Signal<number> = computed((): number => this.store.selectSignal(selectedDepotIds)()[0]);
  protected readonly depotCurrency: Signal<string> = this.store.selectSignal(selectedDepotCurrency);

  /** User-typed content of the security field. The form model references the security ID instead. */
  protected readonly securityText: WritableSignal<string> = signal<string>("");

  protected readonly securityOptions: Signal<number[]> = computed((): number[] =>
    this.store.selectSignal(securityIdsMatchingName(this.securityText()))());

  private readonly formModel: WritableSignal<TransactionFormModel> = signal<TransactionFormModel>({
    transactionType: null,
    isSpecialDividend: false,
    securityId: null,
    date: new Date(),
    time: "",
    securityCountOriginal: "",
    securityCountSplitAdjusted: "",
    grossValue: "",
    tax: "",
    fee: "",
  });

  protected readonly form: FieldTree<TransactionFormModel> = form(
    this.formModel,
    (schemaPath: SchemaPathTree<TransactionFormModel>): void => {
      required(schemaPath.transactionType);

      required(schemaPath.securityId);

      required(schemaPath.date);

      pattern(schemaPath.time, timeRegex);

      required(schemaPath.securityCountOriginal);
      pattern(schemaPath.securityCountOriginal, countRegex);

      pattern(schemaPath.securityCountSplitAdjusted, countRegex);

      required(schemaPath.grossValue);
      pattern(schemaPath.grossValue, monetaryRegex);

      pattern(schemaPath.tax, monetaryRegex);
      pattern(schemaPath.fee, monetaryRegex);
    },
  );

  protected readonly formValid: Signal<boolean> = computed((): boolean => {
    let valid: boolean = true;
    for (const [, field] of this.form) {
      valid = valid && field().valid();
    }
    return valid;
  });

  protected readonly showTimeField: Signal<boolean> = computed((): boolean => {
    const transactionType: TransactionType | null = this.form.transactionType().value();
    return transactionType === TransactionType.BUY || transactionType === TransactionType.SELL;
  });

  protected readonly netValueInput: Signal<NetValueInput> = computed((): NetValueInput => {
    const values: TransactionFormModel = this.formModel();
    return {
      transactionType: values.transactionType ?? TransactionType.BUY,
      grossValue: values.grossValue,
      tax: values.tax,
      fee: values.fee,
    };
  });

  private readonly applyPrefill: EffectRef = effect((): void => {
    const prefill: TransactionPrefill | null = this.importStore.prefill();
    if (prefill == null) {
      return;
    }
    this.formModel.update((values: TransactionFormModel): TransactionFormModel => ({
      ...values,
      transactionType: prefill.transactionType,
      isSpecialDividend: prefill.isSpecialDividend,
      securityId: prefill.securityId,
      date: prefill.date ?? values.date,
      time: prefill.time,
      securityCountOriginal: prefill.securityCountOriginal,
      securityCountSplitAdjusted: "",
      grossValue: prefill.grossValue,
      tax: prefill.tax,
      fee: prefill.fee,
    }));
    this.securityText.set(this.displaySecurityName(prefill.securityId));
    this.importStore.clearPrefill();
  });

  protected readonly displaySecurityName: (securityId: number | null) => string = (securityId: number | null): string =>
    securityId == null ? "" : this.securityNamePipe.transform(securityId);

  protected filterSecurities(event: Event): void {
    this.securityText.set((event.target as HTMLInputElement).value);
    this.formModel.update((values: TransactionFormModel): TransactionFormModel => ({...values, securityId: null}));
  }

  protected selectSecurity(event: MatAutocompleteSelectedEvent): void {
    const securityId: number = event.option.value as number;
    this.formModel.update((values: TransactionFormModel): TransactionFormModel => ({...values, securityId}));
    this.securityText.set(this.displaySecurityName(securityId));
  }

  protected importFile(files: File[]): void {
    const file: File | undefined = files[0];
    if (file == null) {
      return;
    }
    this.importStore.importPdf({
      file,
      currency: this.depotCurrency(),
      modelKey: this.activeModel()?.key ?? null,
      securitiesByIsin: this.knownSecurities(),
    });
  }

  protected selectPdf(event: Event): void {
    const input: HTMLInputElement = event.target as HTMLInputElement;
    this.importFile(Array.from(input.files ?? []));
    input.value = "";
  }

  protected close(): void {
    this.dialogRef.close();
  }

  protected async createTransaction(): Promise<void> {
    if (!this.formValid()) {
      return;
    }

    const values: TransactionFormModel = this.formModel();
    let transactionType: TransactionType = values.transactionType!;
    if (transactionType === TransactionType.DIVIDEND && values.isSpecialDividend) {
      transactionType = TransactionType.SPECIAL_DIVIDEND;
    }

    const year: number = values.date.getFullYear();
    const month: number = values.date.getMonth() + 1;
    const day: number = values.date.getDate();
    const dateString: string = `${year}-${month < 10 ? "0" : ""}${month}-${day < 10 ? "0" : ""}${day}`;

    let time: string | undefined = undefined;
    const buyOrSell: TransactionType[] = [TransactionType.BUY, TransactionType.SELL];
    if (values.time.trim() !== "" && buyOrSell.includes(transactionType)) {
      time = `${values.time}:00`;
    }

    const securityCountOriginal: number = this.getRequiredNumber(values.securityCountOriginal);
    const securityCountSplitAdjusted: number | undefined = this.getOptionalNumber(values.securityCountSplitAdjusted);
    const grossValue: number = this.getRequiredNumber(values.grossValue);
    const tax: number | undefined = this.getOptionalNumber(values.tax);
    const fee: number | undefined = this.getOptionalNumber(values.fee);

    const payload: TransactionCreate = {
      transactionType,
      securityId: values.securityId!,
      date: dateString,
      time,
      securityCountOriginal,
      securityCountSplitAdjusted,
      grossValue,
      tax,
      fee,
    };

    await firstValueFrom(this.transactionApi.createTransaction(this.depotId(), payload));
    this.store.dispatch(DepotActions.reloadDepots());
    this.transactionPageStore.reloadFirstPage();
    this.dialogRef.close(true);
  }

  private getOptionalNumber(value: string): number | undefined {
    const trimmedValue: string = value.trim();
    if (trimmedValue.length > 0) {
      return this.getRequiredNumber(trimmedValue);
    }
    return undefined;
  }

  private getRequiredNumber(value: string): number {
    return parseFloat(value.trim().replace(",", "."));
  }
}
