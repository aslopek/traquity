import {Component, inject} from "@angular/core";
import {addSecurityWizardStore, ReadableAddSecurityWizardStore,} from "./store/add-security-wizard.store";
import {TitleToolbarComponent} from "../../common/components/title-toolbar/title-toolbar.component";
import {MatDialogRef} from "@angular/material/dialog";
import {MatStep, MatStepper, MatStepperNext} from "@angular/material/stepper";
import {MatButton} from "@angular/material/button";
import {SecurityMasterDataComponent} from "../details/security-master-data/security-master-data.component";
import {HistoricalPriceConfigComponent} from "../historical-price/historical-price-config/historical-price-config.component";
import {DividendAnnouncementConfigComponent} from "../details/dividend-announcement/dividend-announcement-config.component";
import {SummaryComponent} from "./summary/summary.component";

@Component({
  selector: "app-add-security-wizard",
  imports: [
    TitleToolbarComponent,
    MatStepper,
    SecurityMasterDataComponent,
    MatStep,
    MatButton,
    MatStepperNext,
    HistoricalPriceConfigComponent,
    DividendAnnouncementConfigComponent,
    SummaryComponent,
  ],
  providers: [addSecurityWizardStore],
  templateUrl: "./add-security-wizard.component.html",
  styleUrl: "./add-security-wizard.component.scss",
})
export class AddSecurityWizardComponent {
  protected readonly addSecurityWizardStore: ReadableAddSecurityWizardStore =
    inject(addSecurityWizardStore);
  private readonly dialogRef: MatDialogRef<AddSecurityWizardComponent> =
    inject(MatDialogRef);

  protected complete(): void {
    this.addSecurityWizardStore.persist();
    this.dialogRef.close();
  }

  protected cancel(): void {
    this.dialogRef.close();
  }
}
