import {Component, inject, Signal} from "@angular/core";
import {MatAccordion, MatExpansionPanel, MatExpansionPanelHeader, MatExpansionPanelTitle,} from "@angular/material/expansion";
import {MatIcon} from "@angular/material/icon";
import {AppearanceComponent} from "../appearance/appearance.component";
import {Store} from "@ngrx/store";
import {DataSourceWithId} from "../data-source/data-source.type";
import {AppState} from "../../store/app.state";
import {getHistoricalSecurityPriceDataSources} from "../../store/security/security.selector";
import {getDividendAnnouncementDataSources} from "../../store/dividend-announcement/dividend-announcement.selector";
import {DataSourcePageComponent} from "../data-source/data-source-page/data-source-page.component";
import {SecurityGroupPageComponent} from "../security-group/security-group-page/security-group-page.component";
import {RestartConfigureComponent} from "../restart-configure/restart-configure.component";
import {AiPageComponent} from "../ai/ai-page/ai-page.component";
import {StartupBridgeService} from "../../app/startup/startup-bridge.service";
import {AiIconComponent} from "../../common/components/ai-icon/ai-icon.component";

@Component({
  selector: "app-settings-page",
  imports: [
    AppearanceComponent,
    MatAccordion,
    MatExpansionPanel,
    MatExpansionPanelHeader,
    MatExpansionPanelTitle,
    MatIcon,
    DataSourcePageComponent,
    SecurityGroupPageComponent,
    RestartConfigureComponent,
    AiPageComponent,
    AiIconComponent,
  ],
  templateUrl: "settings-page.component.html",
  styleUrls: ["settings-page.component.scss"],
})
export class SettingsPageComponent {

  protected readonly store: Store<AppState> = inject(Store);
  protected readonly historicalSecurityPriceDataSources: Signal<DataSourceWithId[]> = this.store.selectSignal(getHistoricalSecurityPriceDataSources);
  protected readonly dividendAnnouncementDataSources: Signal<DataSourceWithId[]> = this.store.selectSignal(getDividendAnnouncementDataSources);
  protected readonly bridgeAvailable: boolean = inject(StartupBridgeService).available;
}
