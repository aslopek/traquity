import {Component} from "@angular/core";
import {FormsModule} from "@angular/forms";
import {MatButtonModule} from "@angular/material/button";
import {MatDialogRef} from "@angular/material/dialog";
import {MatInputModule} from "@angular/material/input";
import {CurrencySelectComponent} from "../../common/components/currency-select/currency-select.component";
import {TitleToolbarComponent} from "../../common/components/title-toolbar/title-toolbar.component";
import {Store} from "@ngrx/store";
import {AppState} from "../../store/app.state";
import {DepotActions} from "../../store/depot/depot.actions";

@Component({
  selector: "app-depot-create",
  imports: [
    MatInputModule,
    FormsModule,
    MatButtonModule,
    CurrencySelectComponent,
    TitleToolbarComponent,
  ],
  templateUrl: "./depot-create.component.html",
  styleUrl: "./depot-create.component.scss",
})
export class DepotCreateComponent {
  protected name: string = "";
  protected currency: string | undefined = undefined;

  constructor(
    private readonly dialogRef: MatDialogRef<DepotCreateComponent>,
    private readonly store: Store<AppState>,
  ) {
  }

  protected setCurrency(newCurrency: string | undefined): void {
    this.currency = newCurrency;
  }

  protected async createDepot(): Promise<void> {
    if (this.currency === undefined) {
      return;
    }
    this.store.dispatch(
      DepotActions.addDepot({
        depot: {
          name: this.name,
          currency: this.currency,
        },
      }),
    );
    this.dialogRef.close(null);
  }

  protected cancel(): void {
    this.dialogRef.close(null);
  }
}
