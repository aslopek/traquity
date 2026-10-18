import {Component, inject} from '@angular/core';
import {MatButton} from '@angular/material/button';
import {MatDialog} from '@angular/material/dialog';
import {RestartConfigureDialog} from './restart-configure-dialog/restart-configure-dialog.component';

@Component({
  selector: 'app-restart-configure',
  imports: [
    MatButton
  ],
  templateUrl: './restart-configure.component.html',
  styleUrl: './restart-configure.component.scss',
})
export class RestartConfigureComponent {

  private readonly dialog: MatDialog = inject(MatDialog);

  protected openDialog(): void {
    this.dialog.open(RestartConfigureDialog, {
      width: '30%',
      minWidth: '25em',
      panelClass: 'mat-app-background',
      autoFocus: false,
      disableClose: true,
    });
  }
}
