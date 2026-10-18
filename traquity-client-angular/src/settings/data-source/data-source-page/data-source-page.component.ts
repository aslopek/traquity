import {Component, effect, inject, input, InputSignal, Signal} from '@angular/core';
import {DataSourceVariant, DataSourceWithId} from '../data-source.type';
import {DataSourceStore, ReadableDataSourceStore} from '../store/data-source.store';
import {DataSourceCardComponent} from '../data-source-card/data-source-card.component';
import {DataSourceDetailsComponent} from '../data-source-details/data-source-details.component';
import {DataSourceApiKeyComponent} from '../data-source-api-key/data-source-api-key.component';
import {MatDialog} from '@angular/material/dialog';
import {DeleteDataSourceDialog} from '../delete-data-source-dialog/delete-data-source-dialog.component';
import {Action, Store} from '@ngrx/store';
import {AppState} from '../../../store/app.state';
import {getHistoricalSecurityPriceDataSource} from '../../../store/security/security.selector';
import {SecurityActions} from '../../../store/security/security.actions';
import {getDividendAnnouncementDataSource} from '../../../store/dividend-announcement/dividend-announcement.selector';
import {DividendAnnouncementActions} from '../../../store/dividend-announcement/dividend-announcement.actions';

@Component({
  selector: 'app-data-source-page',
  imports: [
    DataSourceCardComponent,
    DataSourceDetailsComponent,
    DataSourceApiKeyComponent
  ],
  providers: [
    DataSourceStore
  ],
  templateUrl: './data-source-page.component.html',
  styleUrl: './data-source-page.component.scss',
})
export class DataSourcePageComponent {

  readonly dataSourceVariant: InputSignal<DataSourceVariant> = input.required<DataSourceVariant>();
  readonly dataSources: InputSignal<DataSourceWithId[]> = input.required<DataSourceWithId[]>();
  private dataSourceStore: ReadableDataSourceStore = inject(DataSourceStore);
  private globalStore: Store<AppState> = inject(Store);
  private readonly dialog: MatDialog = inject(MatDialog);

  protected readonly showApiKeyOnly: Signal<boolean> = this.dataSourceStore.selectedDataSourceIsPreconfigured;

  constructor() {
    effect((): void => {
      this.dataSourceStore.setDataSources(this.dataSources());
    });
  }

  protected delete(id: number): void {
    const variant: DataSourceVariant = this.dataSourceVariant();
    const dataSource: DataSourceWithId | null = variant === 'historical-security-price'
      ? this.globalStore.selectSignal(getHistoricalSecurityPriceDataSource(id))()
      : this.globalStore.selectSignal(getDividendAnnouncementDataSource(id))();
    if (dataSource === null) {
      return;
    }

    const deleteAction: Action = variant === 'historical-security-price'
      ? SecurityActions.deleteHistoricalSecurityPriceDataSource({id})
      : DividendAnnouncementActions.deleteDividendAnnouncementDataSource({id});

    this.dialog.open(DeleteDataSourceDialog, {
      height: '10%',
      width: '25%',
      minHeight: '10em',
      minWidth: '20em',
      panelClass: 'mat-app-background',
      autoFocus: false,
      disableClose: true,
      data: {
        dataSource: dataSource satisfies DataSourceWithId,
        deleteAction: deleteAction satisfies Action
      }
    });
  }
}
