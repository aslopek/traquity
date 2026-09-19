import {Component, Input, OnInit,} from "@angular/core";
import {MatButtonModule} from "@angular/material/button";
import {MatDialogRef} from "@angular/material/dialog";
import {MatIconModule} from "@angular/material/icon";
import {firstValueFrom} from "rxjs";
import {TqDatePipe, SecurityNamePipe, TransactionTypeDisplayIconPipe, TransactionTypeDisplayNamePipe,} from "../../../common";
import {TransactionApi, TransactionRead,} from "../../../gen/api/depot-transaction";
import {SecurityApi} from "../../../gen/api/security";
import {TitleToolbarComponent} from "../../../common/components/title-toolbar/title-toolbar.component";
import {Store} from "@ngrx/store";
import {AppState} from "../../../store/app.state";

@Component({
  selector: "app-transaction-delete",
  imports: [
    TqDatePipe,
    TransactionTypeDisplayNamePipe,
    MatButtonModule,
    MatIconModule,
    TransactionTypeDisplayIconPipe,
    TitleToolbarComponent,
  ],
  templateUrl: "./transaction-delete.component.html",
  styleUrl: "./transaction-delete.component.scss",
})
export class TransactionDeleteComponent implements OnInit {
  @Input({ required: true })
  depotId!: number;

  @Input({ required: true })
  transaction!: TransactionRead;

  @Input({ required: true })
  securityId!: number;

  protected securityName: string = "";

  constructor(
    private readonly dialogRef: MatDialogRef<TransactionDeleteComponent>,
    private readonly transactionApi: TransactionApi,
    private readonly store: Store<AppState>,
    protected readonly securityApi: SecurityApi,
  ) {
  }

  async ngOnInit(): Promise<void> {
    this.securityName = new SecurityNamePipe(this.store).transform(
      this.securityId,
    );
  }

  async deleteTransaction(): Promise<void> {
    await firstValueFrom(
      this.transactionApi.deleteTransaction(this.depotId, this.transaction.id),
    );
    this.dialogRef.close(true);
  }

  cancel(): void {
    this.dialogRef.close(false);
  }
}
