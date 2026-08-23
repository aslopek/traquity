import {Component, inject} from "@angular/core";
import {MatButton} from "@angular/material/button";
import {MatDialogRef} from "@angular/material/dialog";
import {TitleToolbarComponent} from "../../../common";
import {StartupBridgeService} from "../../../bridge/startup-bridge.service";

@Component({
  selector: "app-restart-configure-dialog",
  imports: [
    MatButton,
    TitleToolbarComponent
  ],
  templateUrl: "./restart-configure-dialog.component.html",
  styleUrl: "./restart-configure-dialog.component.scss",
})
export class RestartConfigureDialog {

  private readonly bridge: StartupBridgeService = inject(StartupBridgeService);
  private readonly dialogRef: MatDialogRef<RestartConfigureDialog> = inject(MatDialogRef<RestartConfigureDialog>);

  protected confirm(): void {
    this.bridge.restartAndConfigure();
    this.dialogRef.close();
  }

  protected cancel(): void {
    this.dialogRef.close();
  }
}
