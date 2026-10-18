import {Component, inject} from '@angular/core';
import {MatButtonModule} from '@angular/material/button';
import {MatDialog} from '@angular/material/dialog';
import {MatIconModule} from '@angular/material/icon';
import {MatTooltipModule} from '@angular/material/tooltip';
import {InfoComponent} from '../info.component';

@Component({
  selector: 'app-about-button',
  imports: [MatButtonModule, MatIconModule, MatTooltipModule],
  templateUrl: './about-button.component.html',
  styleUrl: './about-button.component.scss',
})
export class AboutButtonComponent {

  private readonly dialog: MatDialog = inject(MatDialog);

  protected openAboutDialog(): void {
    this.dialog.open(InfoComponent, {
      width: '40%',
      height: '70%',
      panelClass: 'mat-app-background',
      autoFocus: false,
      disableClose: true,
    });
  }
}
