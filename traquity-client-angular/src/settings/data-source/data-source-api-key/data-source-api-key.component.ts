import {Component, computed, effect, inject, Signal, signal, WritableSignal} from "@angular/core";
import {MatFormFieldModule} from "@angular/material/form-field";
import {MatInputModule} from "@angular/material/input";
import {MatButtonModule} from "@angular/material/button";
import {Store} from "@ngrx/store";
import {DataSourceStore, ReadableDataSourceStore} from "../store/data-source.store";
import {DataSourceWithId, MultiUrlDataSource, UrlPattern} from "../data-source.type";
import {AppState} from "../../../store/app.state";
import {SecurityActions} from "../../../store/security/security.actions";
import {extractMaskedValue, findMaskedValue, replaceMaskedValue} from "./mask-value.util";

function isMultiUrlDataSource(dataSource: DataSourceWithId): dataSource is DataSourceWithId & MultiUrlDataSource {
  return dataSource.urlPatterns != null;
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
    if (dataSource === null || !isMultiUrlDataSource(dataSource) || !this.canSave()) {
      return;
    }

    const {id, version, ...rest} = dataSource;
    const newApiKey: string = this.apiKey().trim();
    const updated: MultiUrlDataSource = {
      ...rest,
      urlPatterns: rest.urlPatterns.map((pattern: UrlPattern): UrlPattern => {
        if (extractMaskedValue(pattern.urlPattern) === null) {
          return pattern;
        }
        return {...pattern, urlPattern: replaceMaskedValue(pattern.urlPattern, newApiKey)};
      })
    };

    this.store.dispatch(SecurityActions.setHistoricalSecurityPriceDataSource({id, dataSource: updated}));
  }

  protected cancel(): void {
    this.resetForm();
  }

  private resetForm(): void {
    const dataSource: DataSourceWithId | null = this.selectedDataSource();
    const urlPatterns: UrlPattern[] = dataSource !== null && isMultiUrlDataSource(dataSource) ? dataSource.urlPatterns : [];
    this.apiKey.set(findMaskedValue(urlPatterns) ?? '');
  }
}
