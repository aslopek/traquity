import {Component, computed, effect, input, InputSignal, output, OutputEmitterRef, Signal, signal, WritableSignal,} from "@angular/core";
import {FormsModule} from "@angular/forms";
import {MatIcon} from "@angular/material/icon";
import {MatInputModule} from "@angular/material/input";
import {MatSelectModule} from "@angular/material/select";
import {MatSlideToggleModule} from "@angular/material/slide-toggle";
import {HistoricalSecurityPriceConfigCreate, HistoricalSecurityPriceConfigRead} from "../../../gen/api/historical-security-price";
import {disabled, FieldTree, form, FormField, min, minLength, required, SchemaPathTree,} from "@angular/forms/signals";
import {Store} from "@ngrx/store";
import {AppState} from "../../../store/app.state";
import {SecurityActions} from "../../../store/security/security.actions";
import {HistoricalSecurityPriceConfigs} from "../../../store/security/security.state";
import {getHistoricalSecurityPriceConfigs, getHistoricalSecurityPriceDataSources} from "../../../store/security/security.selector";
import {DataSourceWithId} from "../../../settings/data-source/data-source.type";

type FormModel = {
  isActive: boolean
  externalSecurityId: string
  dataSourceId: number
};

export type Input =
  | Pick<HistoricalSecurityPriceConfigRead, "isActive" | "externalSecurityId">
  | undefined;
export type Output = HistoricalSecurityPriceConfigCreate;

@Component({
  selector: "app-historical-price-config",
  imports: [
    MatInputModule,
    FormsModule,
    MatSelectModule,
    MatSlideToggleModule,
    MatIcon,
    FormField,
  ],
  templateUrl: "historical-price-config.component.html",
  styleUrls: ["historical-price-config.component.scss"],
})
export class HistoricalPriceConfigComponent {
  readonly securityId: InputSignal<number | undefined> = input<
    number | undefined
  >();
  readonly configChanged: OutputEmitterRef<Output | null> =
    output<Output | null>();

  protected readonly form: FieldTree<FormModel>;
  private readonly formModel: WritableSignal<FormModel>;
  private readonly allConfigs: Signal<HistoricalSecurityPriceConfigs>;
  private readonly selectedConfig: Signal<HistoricalSecurityPriceConfigRead | null>;
  protected readonly dataSources: Signal<DataSourceWithId[]>;

  constructor(store: Store<AppState>) {
    this.allConfigs = store.selectSignal(getHistoricalSecurityPriceConfigs);
    this.selectedConfig = computed((): HistoricalSecurityPriceConfigRead | null => {
      const id: number | undefined = this.securityId();
      if (id === undefined) {
        return null;
      }

      return this.allConfigs()[id] ?? null;
    });

    this.allConfigs = store.selectSignal(getHistoricalSecurityPriceConfigs);
    this.dataSources = store.selectSignal(getHistoricalSecurityPriceDataSources);
    const availableDataSources: DataSourceWithId[] = this.dataSources();
    const dataSourceId: number = availableDataSources.length > 0 ? availableDataSources[0].id : 0;
    this.formModel = signal<FormModel>({
      isActive: false,
      externalSecurityId: "",
      dataSourceId
    });

    this.form = form(this.formModel, (schemaPath: SchemaPathTree<FormModel>): void => {
      required(schemaPath.externalSecurityId);
      minLength(schemaPath.externalSecurityId, 1);
      disabled(schemaPath.externalSecurityId, {when: (): boolean => !this.formModel().isActive});
      disabled(schemaPath.dataSourceId, {when: (): boolean => !this.formModel().isActive});
      required(schemaPath.dataSourceId);
      min(schemaPath.dataSourceId, 1);
    });

    // effect for dispatching action to load config on changing securityId
    effect((): void => {
      const id: number | undefined = this.securityId();
      if (id !== undefined) {
        store.dispatch(
          SecurityActions.loadHistoricalSecurityPriceConfig({securityId: id}),
        );
      }
    });

    // effect for updating form on changing selectedConfig
    effect((): void => {
      const config: HistoricalSecurityPriceConfigRead | null = this.selectedConfig();
      const isActive: boolean = config?.isActive ?? false;
      const externalSecurityId: string = config?.externalSecurityId ?? "";
      const availableDataSources: DataSourceWithId[] = this.dataSources();
      const dataSourceId: number = config?.dataSourceId ?? (availableDataSources.length > 0 ? availableDataSources[0].id : 0);
      this.formModel.set({
        isActive,
        externalSecurityId,
        dataSourceId
      });
    });

    // effect for emitting changes
    effect((): void => {
      const formData: FormModel = {
        isActive: this.form.isActive().value(),
        externalSecurityId: this.form.externalSecurityId().value(),
        dataSourceId: this.form.dataSourceId().value()
      };

      let valid: boolean = true;
      for (const [, field] of this.form) {
        valid = valid && field().valid();
      }

      if (valid) {
        this.configChanged.emit(formData);
      } else {
        this.configChanged.emit(null);
      }
    });
  }
}
