import {Component, DestroyRef, effect, inject, input, InputSignal, output, OutputEmitterRef, signal, Signal, WritableSignal,} from "@angular/core";
import {Store} from "@ngrx/store";
import {AppState} from "../../../store/app.state";
import {getAllDataSources} from "../../../store/dividend-announcement/dividend-announcement.selector";
import {DividendAnnouncementDataSourceRead} from "../../../gen/api/notification/dividend-announcement";
import {
  DividendAnnouncementConfigParams,
  readableDividendAnnouncementConfigStore,
  ReadableDividendAnnouncementConfigStore,
} from "./store/dividend-announcement-config-store";
import {takeUntilDestroyed, toObservable} from "@angular/core/rxjs-interop";
import {disabled, FieldTree, form, FormField, SchemaPathTree,} from "@angular/forms/signals";
import {MatFormField, MatInput, MatLabel} from "@angular/material/input";
import {MatOption, MatSelect} from "@angular/material/select";
import {MatSlideToggle} from "@angular/material/slide-toggle";
import {MatIcon} from "@angular/material/icon";
import {skip, tap} from "rxjs";

export type DividendAnnouncementConfigChangedEvent =
  DividendAnnouncementConfigParams & {
  version: number | null;
};

@Component({
  selector: "app-dividend-announcement-config",
  imports: [
    MatFormField,
    MatLabel,
    MatSelect,
    FormField,
    MatOption,
    MatInput,
    MatSlideToggle,
    MatIcon,
  ],
  providers: [readableDividendAnnouncementConfigStore],
  templateUrl: "./dividend-announcement-config.component.html",
  styleUrl: "./dividend-announcement-config.component.scss",
})
export class DividendAnnouncementConfigComponent {
  readonly securityId: InputSignal<number | undefined> = input<number>();
  readonly configChanged: OutputEmitterRef<DividendAnnouncementConfigChangedEvent | null> =
    output<DividendAnnouncementConfigChangedEvent>();
  protected readonly dataSources: Signal<DividendAnnouncementDataSourceRead[]>;
  protected readonly dividendAnnouncementConfigStore: ReadableDividendAnnouncementConfigStore =
    inject(readableDividendAnnouncementConfigStore);
  protected readonly formModel: WritableSignal<DividendAnnouncementConfigParams>;
  protected readonly dividendAnnouncementConfigForm: FieldTree<DividendAnnouncementConfigParams>;

  constructor(store: Store<AppState>, destroyRef: DestroyRef) {
    this.dataSources = store.selectSignal(getAllDataSources);

    toObservable(this.securityId)
      .pipe(takeUntilDestroyed(destroyRef))
      .subscribe((securityId: number | undefined): void => {
        if (securityId !== undefined) {
          this.dividendAnnouncementConfigStore.loadDividendAnnouncementConfig(
            securityId,
          );
        }
      });

    this.formModel = signal<DividendAnnouncementConfigParams>({
      ...this.dividendAnnouncementConfigStore.newConfigValues(),
    });

    toObservable(this.dividendAnnouncementConfigStore.newConfigValues)
      .pipe(
        tap((newConfigValues: DividendAnnouncementConfigParams): void =>
          this.formModel.set(newConfigValues),
        ),
        skip(2),
        takeUntilDestroyed(destroyRef),
      )
      .subscribe((newConfigValues: DividendAnnouncementConfigParams): void => {
        if (this.dividendAnnouncementConfigStore.newConfigValuesValid()) {
          this.configChanged.emit({
            ...newConfigValues,
            version:
              this.dividendAnnouncementConfigStore.existingConfig()?.version ??
              null,
          });
        } else {
          this.configChanged.emit(null);
        }
      });

    this.dividendAnnouncementConfigForm = form(
      this.formModel,
      (path: SchemaPathTree<DividendAnnouncementConfigParams>) => {
        disabled(path.dataSourceId, () => this.dataSources().length <= 1);
      },
    );

    effect(() => {
      this.dividendAnnouncementConfigStore.setNewConfigValues(this.formModel());
    });
  }
}
