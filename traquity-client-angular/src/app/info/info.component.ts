import {Component, inject, OnInit, signal, WritableSignal} from "@angular/core";
import {HttpClient} from "@angular/common/http";
import {MatDialogRef} from "@angular/material/dialog";
import {MatIconModule} from "@angular/material/icon";
import {MatTabsModule} from "@angular/material/tabs";
import {firstValueFrom} from "rxjs";
import * as packageJson from "../../../package.json";
import {TitleToolbarComponent} from "../../common";
import {AdminApi, ThirdPartyLicense} from "../../gen/api/admin";
import {LicenseComponent} from "../license/license.component";
import {PrivacyNoticeComponent} from "../privacy/privacy-notice/privacy-notice.component";
import {LicenseEntryKeyPipe, LicenseSection} from "./license-entry-key.pipe";
import {ThirdPartyLicenseEntry, ThirdPartyLicensesFile} from "./third-party-license-entry.type";

@Component({
  selector: "app-info",
  imports: [
    MatTabsModule,
    MatIconModule,
    TitleToolbarComponent,
    LicenseComponent,
    LicenseEntryKeyPipe,
    PrivacyNoticeComponent,
  ],
  templateUrl: "info.component.html",
  styleUrls: ["info.component.scss"],
})
export class InfoComponent implements OnInit {

  protected readonly feVersion: WritableSignal<string> = signal<string>(packageJson.version);
  protected readonly frontendLicenses: WritableSignal<ThirdPartyLicenseEntry[]> = signal<ThirdPartyLicenseEntry[]>([]);
  protected readonly backendLicenses: WritableSignal<ThirdPartyLicense[]> = signal<ThirdPartyLicense[]>([]);
  protected readonly expandedEntry: WritableSignal<string | null> = signal<string | null>(null);
  private readonly dialogRef: MatDialogRef<InfoComponent> = inject(MatDialogRef<InfoComponent>);
  private readonly adminApi: AdminApi = inject(AdminApi);
  private readonly httpClient: HttpClient = inject(HttpClient);
  private readonly licenseEntryKeyPipe: LicenseEntryKeyPipe = new LicenseEntryKeyPipe();

  async ngOnInit(): Promise<void> {
    try {
      const backendLicenses: ThirdPartyLicense[] = await firstValueFrom(this.adminApi.getThirdPartyLicenses());
      this.backendLicenses.set(backendLicenses);
    } catch {
      // show error in dialog
    }

    try {
      const licensesFile: ThirdPartyLicensesFile =
        await firstValueFrom(this.httpClient.get<ThirdPartyLicensesFile>("assets/third-party-licenses.json"));
      this.frontendLicenses.set(licensesFile.packages);
    } catch {
      // show error in dialog
    }
  }

  protected close(): void {
    this.dialogRef.close();
  }

  protected toggleLicenseText(section: LicenseSection, name: string): void {
    const key: string = this.licenseEntryKeyPipe.transform(name, section);
    this.expandedEntry.set(this.expandedEntry() === key ? null : key);
  }

  protected openNpm(dependency: string, event: MouseEvent): void {
    event.stopPropagation();
    window.open(`https://www.npmjs.com/package/${dependency}`, "_blank");
  }
}
