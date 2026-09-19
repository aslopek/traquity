import {Component, computed, inject, input, InputSignal, signal, Signal, WritableSignal} from '@angular/core';
import {CommonModule} from '@angular/common';
import {MatTableModule} from '@angular/material/table';
import {MatIconModule} from '@angular/material/icon';
import {DataSourceStore, ReadableDataSourceStore} from "../store/data-source.store";
import {AnyDataSource, DataSourceVariant, MultiUrlDataSource, SingleUrlDataSource} from "../data-source.type";
import {parseDataSource, ParsedDataSource} from "../parse-data-source.util";
import {TqDecimalPipe} from "../../../common";
import {ScriptTokenizerPipe} from "./tokenize-script.pipe";
import {MatButton} from "@angular/material/button";
import {Store} from "@ngrx/store";
import {AppState} from "../../../store/app.state";
import {SecurityActions} from "../../../store/security/security.actions";
import {DividendAnnouncementActions} from "../../../store/dividend-announcement/dividend-announcement.actions";

type UrlPatternRow = {
  timespanInDays?: number
  urlPattern: string
};

const emptyHistoricalSecurityPriceDataSource: MultiUrlDataSource = {
  name: 'New Data Source',
  urlPatterns: [],
  requestHeaders: [],
  jsonPathDate: '',
  dateFormat: {
    format: 'CUSTOM_STRING',
    customPattern: 'yyyy-MM-dd'
  },
  jsonPathValue: '',
  currencyMappings: [],
  marketCloseTimes: []
} as const;

const emptyDividendAnnouncementDataSource: SingleUrlDataSource = {
  name: 'New Data Source',
  urlPattern: '',
  requestHeaders: [],
  jsonPathDate: '',
  dateFormat: {
    format: 'CUSTOM_STRING',
    customPattern: 'yyyy-MM-dd'
  },
  jsonPathValue: '',
  currencyMappings: []
} as const;

@Component({
  selector: "app-data-source-details",
  imports: [
    CommonModule,
    MatTableModule,
    MatIconModule,
    TqDecimalPipe,
    ScriptTokenizerPipe,
    MatButton
  ],
  templateUrl: "./data-source-details.component.html",
  styleUrl: "./data-source-details.component.scss",
})
export class DataSourceDetailsComponent {

  readonly dataSourceVariant: InputSignal<DataSourceVariant> = input.required<DataSourceVariant>();

  protected readonly headerColumns = ['name', 'value'];
  protected readonly currencyColumns = ['key', 'code', 'multiplier'];
  protected readonly marketCloseColumns = ['time', 'timezone'];
  protected readonly urlPatternColumns: Signal<string[]> = computed<string[]>((): string[] => {
    return this.dataSourceVariant() === 'historical-security-price' ? ['timespan', 'pattern'] : ['pattern'];
  });
  private readonly dataSourceStore: ReadableDataSourceStore = inject(DataSourceStore);
  protected readonly selectedDataSourceId: Signal<number | null> = this.dataSourceStore.selectedDataSourceId;
  protected readonly selectedDataSource: Signal<AnyDataSource> = computed<AnyDataSource>(() => {
    const uploaded: ParsedDataSource | null = this.uploadedDataSource();
    if (uploaded != null) {
      return uploaded.dataSource;
    }

    const selectedDataSource: AnyDataSource | null = this.dataSourceStore.selectedDataSource();
    if (selectedDataSource != null) {
      return selectedDataSource;
    }
    return this.dataSourceVariant() === 'historical-security-price'
      ? emptyHistoricalSecurityPriceDataSource
      : emptyDividendAnnouncementDataSource;
  });
  protected readonly urlPatternRows: Signal<UrlPatternRow[]> = computed<UrlPatternRow[]>((): UrlPatternRow[] => {
    const source: AnyDataSource = this.selectedDataSource();
    if (source.urlPatterns != null) {
      return source.urlPatterns;
    }
    if (source.urlPattern != null && source.urlPattern.length > 0) {
      return [{urlPattern: source.urlPattern}];
    }
    return [];
  });
  private readonly uploadedDataSource: WritableSignal<ParsedDataSource | null> = signal<ParsedDataSource | null>(null);
  protected readonly isSaveDisabled: Signal<boolean> = computed<boolean>((): boolean => this.uploadedDataSource() === null);
  private readonly store: Store<AppState> = inject(Store);

  protected onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) {
      return;
    }

    const file: File = input.files[0];
    const reader = new FileReader();

    reader.onload = (e: ProgressEvent<FileReader>): void => {
      const fileContent: string | ArrayBuffer | null | undefined = e.target?.result;
      if (typeof fileContent !== 'string') {
        return;
      }
      const parsed: ParsedDataSource | null = parseDataSource(this.dataSourceVariant(), fileContent);
      if (parsed !== null) {
        this.uploadedDataSource.set(parsed);
      }
    };

    reader.readAsText(file);
    input.value = '';
  }

  protected save(): void {
    const uploaded: ParsedDataSource | null = this.uploadedDataSource();
    if (uploaded == null) {
      return;
    }
    const id: number | undefined = this.selectedDataSourceId() ?? undefined;

    if (uploaded.variant === 'historical-security-price') {
      this.store.dispatch(SecurityActions.setHistoricalSecurityPriceDataSource({
        id,
        dataSource: uploaded.dataSource,
      }));
    } else {
      this.store.dispatch(DividendAnnouncementActions.setDividendAnnouncementDataSource({
        id,
        dataSource: uploaded.dataSource,
      }));
    }
    this.uploadedDataSource.set(null);
  }
}
