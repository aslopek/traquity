import {Component, inject} from "@angular/core";
import {TitleToolbarComponent} from "../../../common/components/title-toolbar/title-toolbar.component";
import {SecurityGroupRead} from "../../../gen/api/configuration-security-group";
import {MAT_DIALOG_DATA, MatDialogRef} from "@angular/material/dialog";
import {MatButton} from "@angular/material/button";
import {WarnIconComponent} from "../../../common/components/warn-icon/warn-icon.component";
import {ReadableSecurityGroupStore} from "../store/security-group.store";

@Component({
  selector: "app-delete-security-group-dialog",
  imports: [
    MatButton,
    WarnIconComponent,
    TitleToolbarComponent
  ],
  templateUrl: "./delete-security-group-dialog.component.html",
  styleUrl: "./delete-security-group-dialog.component.scss",
})
export class DeleteSecurityGroupDialog {

  private readonly dialogData = inject(MAT_DIALOG_DATA);
  protected readonly securityGroup: SecurityGroupRead = this.dialogData.securityGroup;
  private readonly securityGroupStore: ReadableSecurityGroupStore = this.dialogData.securityGroupStore;
  private readonly dialogRef: MatDialogRef<DeleteSecurityGroupDialog>
    = inject(MatDialogRef<DeleteSecurityGroupDialog>);

  protected cancel(): void {
    this.dialogRef.close();
  }

  protected delete(): void {
    this.securityGroupStore.deleteSecurityGroup(this.securityGroup.id);
    this.dialogRef.close();
  }
}
