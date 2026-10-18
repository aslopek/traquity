import {Component, inject, Signal} from '@angular/core';
import {MatButtonModule} from '@angular/material/button';
import {MatDialog} from '@angular/material/dialog';
import {MatIconModule} from '@angular/material/icon';
import {SearchFieldComponent} from '../../common/components/search-field/search-field.component';
import {ReadableSecurityPageStore, SearchParams, securityPageStore,} from '../security-page-store/security-page.store';
import {AddSecurityWizardComponent} from '../add-security-wizard/add-security-wizard.component';

@Component({
  selector: 'app-security-controls',
  imports: [
    SearchFieldComponent,
    MatButtonModule,
    MatIconModule,
  ],
  templateUrl: 'security-controls.component.html',
  styleUrls: ['security-controls.component.scss'],
})
export class SecurityControlsComponent {
  private readonly securityPageStore: ReadableSecurityPageStore =
    inject(securityPageStore);
  private readonly dialog: MatDialog = inject(MatDialog);
  protected readonly searchParams: Signal<SearchParams> =
    this.securityPageStore.searchParams;

  protected search(search?: string): void {
    this.securityPageStore.search(search);
  }

  protected openAddDialog(): void {
    this.dialog.open(AddSecurityWizardComponent, {
      width: '99%',
      height: '80%',
      panelClass: 'mat-app-background',
      autoFocus: false,
      disableClose: true,
    });
  }
}
