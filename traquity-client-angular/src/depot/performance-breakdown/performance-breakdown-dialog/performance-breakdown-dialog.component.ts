import {Component, computed, inject, Signal} from '@angular/core';
import {MAT_DIALOG_DATA, MatDialogRef} from '@angular/material/dialog';
import {MatTooltipModule} from '@angular/material/tooltip';
import {SecurityLogoComponent} from '../../../common/components/security-logo/security-logo.component';
import {TitleToolbarComponent} from '../../../common/components/title-toolbar/title-toolbar.component';
import {DepotPosition} from '../../../gen/api/depot-position';
import {PerformanceBreakdownComponent} from '../performance-breakdown.component';
import {breakdownSecurityIds} from './breakdown-security-ids';

export type PerformanceBreakdownDialogPosition = Pick<DepotPosition, 'securityIds' | 'displayName'>;

export type PerformanceBreakdownDialogData = {
  title: string
  depotIds: number[]
  depotPositions: PerformanceBreakdownDialogPosition[]
};

@Component({
  selector: 'app-performance-breakdown-dialog',
  imports: [TitleToolbarComponent, SecurityLogoComponent, MatTooltipModule, PerformanceBreakdownComponent],
  templateUrl: './performance-breakdown-dialog.component.html',
  styleUrl: './performance-breakdown-dialog.component.scss',
})
export class PerformanceBreakdownDialogComponent {
  protected readonly dialogData: PerformanceBreakdownDialogData = inject(MAT_DIALOG_DATA);
  private readonly dialogRef: MatDialogRef<PerformanceBreakdownDialogComponent> = inject(MatDialogRef);

  protected readonly securityIds: Signal<number[] | undefined> = computed(
    (): number[] | undefined => breakdownSecurityIds(this.dialogData.depotPositions)
  );

  protected close(): void {
    this.dialogRef.close();
  }
}
