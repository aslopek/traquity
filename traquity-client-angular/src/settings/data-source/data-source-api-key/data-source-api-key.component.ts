import {Component, computed, effect, inject, Signal, signal, WritableSignal} from "@angular/core";
import {MatFormFieldModule} from "@angular/material/form-field";
import {MatInputModule} from "@angular/material/input";
import {MatButtonModule} from "@angular/material/button";
import {Store} from "@ngrx/store";
import {DataSourceStore, ReadableDataSourceStore} from "../store/data-source.store";
import {DataSourceWithId, MultiUrlDataSource, SingleUrlDataSource} from "../data-source.type";
import {AppState} from "../../../store/app.state";
import {SecurityActions} from "../../../store/security/security.actions";
import {DividendAnnouncementActions} from "../../../store/dividend-announcement/dividend-announcement.actions";
import {findMaskedValue, maskedValueCarriers, withMaskedValue} from "./mask-value.util";

function isMultiUrlDataSource(dataSource: DataSourceWithId): dataSource is DataSourceWithId & MultiUrlDataSource {
  return dataSource.urlPatterns != null;
}

function isSingleUrlDataSource(dataSource: DataSourceWithId): dataSource is DataSourceWithId & SingleUrlDataSource {
  return dataSource.urlPattern != null;
}

@Component({
  selector: "app-data-source-api-key",
  imports: [
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule
  ],
  templateUrl: "./data-source-api-key.component.html",
  styleUrl: "./data-source-api-key.component.scss",
})
export class DataSourceApiKeyComponent {

  private readonly dataSourceStore: ReadableDataSourceStore = inject(DataSourceStore);
  private readonly store: Store<AppState> = inject(Store);

  protected readonly selectedDataSource: Signal<DataSourceWithId | null> = this.dataSourceStore.selectedDataSource;
  protected readonly apiKey: WritableSignal<string> = signal<string>('');
  protected readonly canSave: Signal<boolean> = computed<boolean>((): boolean => this.apiKey().trim().length > 0);

  constructor() {
    effect((): void => {
      this.resetForm();
    });
  }

  protected onApiKeyInput(event: Event): void {
    this.apiKey.set((event.target as HTMLInputElement).value);
  }

  protected save(): void {
    const dataSource: DataSourceWithId | null = this.selectedDataSource();
    if (dataSource === null || !this.canSave()) {
      return;
    }
    const newApiKey: string = this.apiKey().trim();

    if (isMultiUrlDataSource(dataSource)) {
      const {id, version, ...rest} = dataSource;
      this.store.dispatch(SecurityActions.setHistoricalSecurityPriceDataSource({
        id,
        dataSource: withMaskedValue(rest, newApiKey)
      }));
      return;
    }

    if (isSingleUrlDataSource(dataSource)) {
      const {id, version, ...rest} = dataSource;
      this.store.dispatch(DividendAnnouncementActions.setDividendAnnouncementDataSource({
        id,
        dataSource: withMaskedValue(rest, newApiKey)
      }));
    }
  }

  protected cancel(): void {
    this.resetForm();
  }

  private resetForm(): void {
    const dataSource: DataSourceWithId | null = this.selectedDataSource();
    this.apiKey.set(dataSource === null ? '' : findMaskedValue(maskedValueCarriers(dataSource)) ?? '');
  }
}
