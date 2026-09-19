import {Component, Signal, signal, WritableSignal,} from "@angular/core";
import {MatIcon} from "@angular/material/icon";
import {MatTabsModule} from "@angular/material/tabs";
import {DepotRead} from "../../gen/api/depot";
import {DividendPageComponent} from "../dividend/dividend-page/dividend-page.component";
import {PositionPageComponent} from "../position/position-page/position-page.component";
import {TransactionPageComponent} from "../transaction/transaction-page/transaction-page.component";
import {Store} from "@ngrx/store";
import {AppState} from "../../store/app.state";
import {selectableTabs, selectedDepots, selectedTab,} from "../../store/depot/depot.selector";
import {DepotTab} from "../../store/depot/depot-tabs";
import {SelectableDepotTabs} from "../../store/depot/selectors/get-selectable-depot-tabs.selector";
import {DepotActions} from "../../store/depot/depot.actions";
import {DepotPerformanceComponent} from "../depot-performance/depot-performance.component";

@Component({
  selector: "app-depot-page",
  imports: [
    MatTabsModule,
    MatIcon,
    TransactionPageComponent,
    PositionPageComponent,
    DividendPageComponent,
    DepotPerformanceComponent,
  ],
  templateUrl: "depot-page.component.html",
  styleUrls: ["depot-page.component.scss"],
})
export class DepotPageComponent {
  protected readonly selectableTabs: Signal<SelectableDepotTabs>;
  protected readonly selectedDepots: Signal<DepotRead[]>;
  protected readonly selectedTab: Signal<DepotTab>;
  protected readonly renderTabContent: WritableSignal<boolean>;

  constructor(private readonly store: Store<AppState>) {
    this.selectableTabs = store.selectSignal(selectableTabs);
    this.selectedDepots = store.selectSignal(selectedDepots);
    this.selectedTab = store.selectSignal(selectedTab);
    this.renderTabContent = signal<boolean>(true);
  }

  protected async onTabSelect(tabIndex: number): Promise<void> {
    this.renderTabContent.set(false);
    switch (tabIndex) {
      case 0:
        this.store.dispatch(
          DepotActions.selectDepotTab({
            tab: {
              index: 0,
              tab: "positions",
            },
          }),
        );
        break;
      case 1:
        this.store.dispatch(
          DepotActions.selectDepotTab({
            tab: {
              index: 1,
              tab: "dividends",
            },
          }),
        );
        break;
      case 2:
        this.store.dispatch(
          DepotActions.selectDepotTab({
            tab: {
              index: 2,
              tab: "performance",
            }
          })
        );
        break;
      case 3:
        this.store.dispatch(
          DepotActions.selectDepotTab({
            tab: {
              index: 3,
              tab: "transactions",
            },
          }),
        );
        break;
    }
  }

  protected onAnimationDone(): void {
    this.renderTabContent.set(true);
  }
}
