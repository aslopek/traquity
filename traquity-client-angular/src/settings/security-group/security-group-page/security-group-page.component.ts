import {Component, inject} from '@angular/core';
import {ReadableSecurityGroupStore, SecurityGroupStore} from '../store/security-group.store';
import {SecurityGroupCardComponent} from '../security-group-card/security-group-card.component';
import {SecurityGroupDetailsComponent} from '../security-group-details/security-group-details.component';
import {MatDialog} from '@angular/material/dialog';
import {DeleteSecurityGroupDialog} from '../delete-security-group-dialog/delete-security-group-dialog.component';
import {SecurityGroupRead} from '../../../gen/api/configuration-security-group';

@Component({
  selector: 'app-security-group-page',
  imports: [
    SecurityGroupCardComponent,
    SecurityGroupDetailsComponent
  ],
  providers: [
    SecurityGroupStore
  ],
  templateUrl: './security-group-page.component.html',
  styleUrl: './security-group-page.component.scss',
})
export class SecurityGroupPageComponent {

  protected readonly securityGroupStore: ReadableSecurityGroupStore = inject(SecurityGroupStore);
  private readonly dialog: MatDialog = inject(MatDialog);

  protected delete(id: number): void {
    const securityGroup: SecurityGroupRead | undefined = this.securityGroupStore.securityGroups()
      .find((group: SecurityGroupRead): boolean => group.id === id);
    if (securityGroup === undefined) {
      return;
    }

    this.dialog.open(DeleteSecurityGroupDialog, {
      height: '10%',
      width: '25%',
      minHeight: '10em',
      minWidth: '20em',
      panelClass: 'mat-app-background',
      autoFocus: false,
      disableClose: true,
      data: {
        securityGroup: securityGroup satisfies SecurityGroupRead,
        securityGroupStore: this.securityGroupStore
      }
    });
  }
}
