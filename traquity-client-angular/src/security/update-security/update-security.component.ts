import {AfterViewInit, Component, inject, Inject,} from "@angular/core";
import {MatButtonModule} from "@angular/material/button";
import {MatIconModule} from "@angular/material/icon";
import {MatTabsModule} from "@angular/material/tabs";
import {TitleToolbarComponent} from "../../common";
import {SecurityMasterDataComponent} from "../details/security-master-data/security-master-data.component";
import {MAT_DIALOG_DATA, MatDialogRef} from "@angular/material/dialog";
import {ReadableUpdateSecurityStore, updateSecurityStore,} from "./store/update-security.store";
import {HistoricalPriceConfigComponent} from "../historical-price/historical-price-config/historical-price-config.component";
import {StockSplitComponent} from "../details/stock-split/stock-split.component";
import {DividendAnnouncementConfigComponent} from "../details/dividend-announcement/dividend-announcement-config.component";

export type UpdateSecurityDialogData = {
  securityId: number;
};

@Component({
  selector: "app-update-security",
  imports: [
    MatButtonModule,
    MatTabsModule,
    MatIconModule,
    TitleToolbarComponent,
    SecurityMasterDataComponent,
    HistoricalPriceConfigComponent,
    StockSplitComponent,
    DividendAnnouncementConfigComponent,
  ],
  providers: [updateSecurityStore],
  templateUrl: "update-security.component.html",
  styleUrls: ["update-security.component.scss"],
})
export class UpdateSecurityComponent implements AfterViewInit {
  protected readonly securityId: number;
  protected readonly updateSecurityStore: ReadableUpdateSecurityStore =
    inject(updateSecurityStore);
  private readonly dialogRef: MatDialogRef<UpdateSecurityComponent> =
    inject(MatDialogRef);

  constructor(@Inject(MAT_DIALOG_DATA) dialogData: UpdateSecurityDialogData) {
    this.securityId = dialogData.securityId;
    this.updateSecurityStore.setSecurity(this.securityId);
  }

  ngAfterViewInit(): void {
    setTimeout(() => this.updateSecurityStore.setUntouched(), 50);
  }

  protected close(): void {
    this.dialogRef.close();
  }

  protected ok(): void {
    this.apply();
    this.close();
  }

  protected apply(): void {
    this.updateSecurityStore.persist();
  }
}
