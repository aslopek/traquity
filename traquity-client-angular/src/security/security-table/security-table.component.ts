import {Component, inject, output, OutputEmitterRef, Signal, viewChild,} from "@angular/core";
import {ReadableSecurityPageStore, securityPageStore,} from "../security-page-store/security-page.store";
import {MatPaginator} from "@angular/material/paginator";
import {
  MatCell,
  MatCellDef,
  MatColumnDef,
  MatHeaderCell,
  MatHeaderCellDef,
  MatHeaderRow,
  MatHeaderRowDef,
  MatRow,
  MatRowDef,
  MatTable,
} from "@angular/material/table";
import {FlagIconComponent} from "../../common/components/flag-icon/flag-icon.component";
import {SecurityLogoComponent} from "../../common/components/security-logo/security-logo.component";
import {SecurityNamePipe} from "../../common/pipe/security-name.pipe";
import {SecuritySymbolsPipe} from "../../common/pipe/security-symbols.pipe";
import {TqCurrencyPipe} from "../../common/pipe/tq-currency.pipe";
import {TqDatePipe} from "../../common/pipe/tq-date.pipe";
import {PriceIconPipePipe} from "./price-icon.pipe";
import {MatIcon} from "@angular/material/icon";
import {MatTooltip} from "@angular/material/tooltip";
import {MatSlider, MatSliderThumb} from "@angular/material/slider";
import {toObservable} from "@angular/core/rxjs-interop";
import {take} from "rxjs";
import {MatDialog} from "@angular/material/dialog";
import {UpdateSecurityComponent, UpdateSecurityDialogData,} from "../update-security/update-security.component";

@Component({
  selector: "app-security-table",
  imports: [
    MatTable,
    MatColumnDef,
    MatHeaderCellDef,
    MatHeaderCell,
    MatCellDef,
    MatCell,
    SecurityLogoComponent,
    FlagIconComponent,
    SecurityNamePipe,
    MatHeaderRow,
    MatRow,
    MatPaginator,
    SecuritySymbolsPipe,
    PriceIconPipePipe,
    MatIcon,
    MatTooltip,
    TqDatePipe,
    MatSliderThumb,
    TqCurrencyPipe,
    MatSlider,
    MatHeaderRowDef,
    MatRowDef,
  ],
  providers: [],
  templateUrl: "./security-table.component.html",
  styleUrl: "./security-table.component.scss",
})
export class SecurityTableComponent {
  readonly securitySelected: OutputEmitterRef<number> = output<number>();
  readonly columnNames = [
    "logo",
    "isin",
    "name",
    "symbols",
    "sector",
    "price",
    "edit",
  ] as const;
  protected readonly securityPageStore: ReadableSecurityPageStore =
    inject(securityPageStore);
  protected readonly matPaginator: Signal<MatPaginator | undefined> =
    viewChild(MatPaginator);
  private readonly dialog: MatDialog = inject(MatDialog);

  constructor() {
    toObservable(this.matPaginator)
      .pipe(take(2))
      .subscribe((paginator: MatPaginator | undefined) => {
        if (!paginator) {
          return;
        }
        paginator.page.subscribe((event) => {
          this.securityPageStore.loadPage(event.pageIndex);
        });
      });
  }

  protected openEditDialog(securityId: number): void {
    this.dialog.open(UpdateSecurityComponent, {
      width: "70%",
      height: "70%",
      panelClass: "mat-app-background",
      autoFocus: false,
      disableClose: true,
      data: {
        securityId: securityId,
      } satisfies UpdateSecurityDialogData,
    });
  }
}
