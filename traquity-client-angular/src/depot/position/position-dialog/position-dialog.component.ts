import {Component, inject} from '@angular/core';
import {MAT_DIALOG_DATA, MatDialogRef} from '@angular/material/dialog';
import {MatTabsModule} from '@angular/material/tabs';
import {SecurityLogoComponent} from '../../../common/components/security-logo/security-logo.component';
import {TitleToolbarComponent} from '../../../common/components/title-toolbar/title-toolbar.component';
import {SecurityNamePipe} from '../../../common/pipe/security-name.pipe';
import {PerformanceBreakdownComponent} from '../../performance-breakdown/performance-breakdown.component';
import {LotViewComponent} from '../lot-view/lot-view.component';
import {SellSimulationComponent} from '../sell-simulation/sell-simulation.component';
import {PositionDialogStore} from './store/position-dialog.store';

export type PositionDialogData = {
  depotIds: number[];
  securityIds: number[];
  displayName: string;
};

@Component({
  selector: 'app-position-dialog',
  imports: [
    TitleToolbarComponent, MatTabsModule, LotViewComponent, SellSimulationComponent, PerformanceBreakdownComponent,
    SecurityNamePipe, SecurityLogoComponent
  ],
  providers: [PositionDialogStore],
  templateUrl: './position-dialog.component.html',
  styleUrl: './position-dialog.component.scss',
})
export class PositionDialogComponent {
  protected readonly dialogData: PositionDialogData = inject(MAT_DIALOG_DATA);
  private readonly dialogRef: MatDialogRef<PositionDialogComponent> = inject(MatDialogRef);

  protected close(): void {
    this.dialogRef.close();
  }
}
