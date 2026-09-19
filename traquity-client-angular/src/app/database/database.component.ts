import {ClipboardModule} from "@angular/cdk/clipboard";
import {Component, computed, inject, Signal, signal, WritableSignal,} from "@angular/core";
import {MatButtonModule} from "@angular/material/button";
import {MAT_DIALOG_DATA, MatDialogRef} from "@angular/material/dialog";
import {MatIconModule} from "@angular/material/icon";
import {MatSidenavModule} from "@angular/material/sidenav";
import {MatTooltipModule} from "@angular/material/tooltip";
import {DomSanitizer, SafeUrl} from "@angular/platform-browser";
import {TitleToolbarComponent} from "../../common";
import {DatabaseConfig} from "../../gen/api/admin";

/**
 * The H2 console URL is bypassed through bypassSecurityTrustResourceUrl before going into an iframe - only ever trust it when it actually
 * points at the local backend process (http://localhost or http://127.0.0.1), never an arbitrary URL.
 */
function isTrustedLocalH2ConsoleUrl(url: string): boolean {
  try {
    const parsed: URL = new URL(url);
    return parsed.protocol === "http:" && (parsed.hostname === "localhost" || parsed.hostname === "127.0.0.1");
  } catch {
    return false;
  }
}

@Component({
  selector: "app-database",
  imports: [
    MatButtonModule,
    TitleToolbarComponent,
    MatSidenavModule,
    MatIconModule,
    MatTooltipModule,
    ClipboardModule,
  ],
  templateUrl: "database.component.html",
  styleUrls: ["database.component.scss"],
})
export class DatabaseComponent {

  protected readonly databaseConfig: Signal<DatabaseConfig> = signal(inject<DatabaseConfig>(MAT_DIALOG_DATA));
  private readonly dialogRef: MatDialogRef<DatabaseComponent> = inject(MatDialogRef);
  private readonly domSanitizer: DomSanitizer = inject(DomSanitizer);
  protected readonly showConnectionData: WritableSignal<boolean> = signal<boolean>(false);
  protected readonly databaseWebInterfaceUrl: Signal<SafeUrl> = computed<SafeUrl>((): SafeUrl => {
    const url: string = this.databaseConfig().webInterfaceUrl;
    return this.domSanitizer.bypassSecurityTrustResourceUrl(isTrustedLocalH2ConsoleUrl(url) ? url : "");
  });

  protected toggleHideConnectionData(): void {
    this.showConnectionData.set(!this.showConnectionData());
  }

  protected close(): void {
    this.dialogRef.close();
  }
}
