import {Component, computed, DestroyRef, input, InputSignal, Signal, signal, WritableSignal,} from "@angular/core";
import {SecurityCreate} from "../../../gen/api/security";
import {HistoricalSecurityPriceConfigCreate} from "../../../gen/api/historical-security-price";
import {DividendAnnouncementConfigCreate, DividendAnnouncementDataSourceRead,} from "../../../gen/api/notification/dividend-announcement";
import {MatIcon} from "@angular/material/icon";
import {MatChipRow, MatChipSet} from "@angular/material/chips";
import {Store} from "@ngrx/store";
import {AppState} from "../../../store/app.state";
import {getAllDataSources} from "../../../store/dividend-announcement/dividend-announcement.selector";
import {takeUntilDestroyed} from "@angular/core/rxjs-interop";
import {DataSourceWithId} from "../../../settings/data-source/data-source.type";
import {getHistoricalSecurityPriceDataSources} from "../../../store/security/security.selector";
import {SecurityTypeDisplayNamePipe} from "../../../common/pipe/security-type-display-name.pipe";

@Component({
  selector: "app-summary",
  imports: [
    MatIcon,
    MatChipSet,
    MatChipRow,
    SecurityTypeDisplayNamePipe,
  ],
  templateUrl: "./summary.component.html",
  styleUrl: "./summary.component.scss",
})
export class SummaryComponent {

  readonly masterData: InputSignal<SecurityCreate | null> = input.required<SecurityCreate | null>();
  readonly historicalSecurityPriceConfig: InputSignal<HistoricalSecurityPriceConfigCreate | undefined>
    = input<HistoricalSecurityPriceConfigCreate>();
  readonly dividendAnnouncementConfig: InputSignal<DividendAnnouncementConfigCreate | undefined> = input<DividendAnnouncementConfigCreate>();
  protected readonly historicalSecurityPriceDataSource: Signal<DataSourceWithId | null>;
  protected readonly dividendAnnouncementDataSources: WritableSignal<{ [id: number]: DividendAnnouncementDataSourceRead; }>;

  constructor(store: Store<AppState>, destroyRef: DestroyRef) {
    this.dividendAnnouncementDataSources = signal({});

    store
      .select(getAllDataSources)
      .pipe(takeUntilDestroyed(destroyRef))
      .subscribe((dataSources: DividendAnnouncementDataSourceRead[]) => {
        const mappedDataSources: {
          [id: number]: DividendAnnouncementDataSourceRead;
        } = {};
        for (const dataSource of dataSources) {
          mappedDataSources[dataSource.id] = dataSource;
        }
        this.dividendAnnouncementDataSources.set(mappedDataSources);
      });

    const historicalSecurityPriceDataSources: Signal<DataSourceWithId[]> = store.selectSignal(getHistoricalSecurityPriceDataSources);
    this.historicalSecurityPriceDataSource = computed<DataSourceWithId | null>((): DataSourceWithId | null => {
      const datSourceId: number | undefined = this.historicalSecurityPriceConfig()?.dataSourceId;
      if (datSourceId !== undefined) {
        for (const dataSource of historicalSecurityPriceDataSources()) {
          if (dataSource.id === datSourceId) {
            return dataSource;
          }
        }
      }
      return null;
    });
  }
}
