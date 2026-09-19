import {Component, Inject, Signal, signal,} from "@angular/core";
import {ReactiveFormsModule} from "@angular/forms";
import {MatButtonModule} from "@angular/material/button";
import {MAT_DIALOG_DATA, MatDialogRef} from "@angular/material/dialog";
import {MatFormFieldModule} from "@angular/material/form-field";
import {MatIconModule} from "@angular/material/icon";
import {MatInputModule} from "@angular/material/input";
import {DepotRead} from "../../gen/api/depot";
import {TitleToolbarComponent} from "../../common/components/title-toolbar/title-toolbar.component";
import {Store} from "@ngrx/store";
import {AppState} from "../../store/app.state";
import {DepotActions} from "../../store/depot/depot.actions";

export type DepotDeleteComponentDialogData = {
  depot: DepotRead;
};

@Component({
  selector: "app-depot-delete",
  imports: [
    MatButtonModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    ReactiveFormsModule,
    TitleToolbarComponent,
  ],
  templateUrl: "./depot-delete.component.html",
  styleUrl: "./depot-delete.component.scss",
})
export class DepotDeleteComponent {
  protected readonly depot: Signal<DepotRead>;

  constructor(
    private readonly dialogRef: MatDialogRef<DepotDeleteComponent>,
    @Inject(MAT_DIALOG_DATA) dialogData: DepotDeleteComponentDialogData,
    private readonly store: Store<AppState>,
  ) {
    this.depot = signal<DepotRead>(dialogData.depot).asReadonly();
  }

  deleteDepot(): void {
    this.store.dispatch(
      DepotActions.deleteDepot({
        depotId: this.depot().id,
      }),
    );
    this.dialogRef.close(true);
  }

  cancel(): void {
    this.dialogRef.close(false);
  }
}
