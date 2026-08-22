import {IMAGE_CONFIG, registerLocaleData} from "@angular/common";
import {provideHttpClient, withXhr} from "@angular/common/http";
import localeDe from "@angular/common/locales/de";
import localeDeExtra from "@angular/common/locales/extra/de";
import {ApplicationConfig, importProvidersFrom, inject, provideAppInitializer,} from "@angular/core";
import {MatIconRegistry} from "@angular/material/icon";
import {DateAdapter, MatNativeDateModule} from "@angular/material/core";
import {provideRouter} from "@angular/router";
import {TqDateAdapter, TqDatePipe} from "../common";
import {provideEffects} from "@ngrx/effects";
import {provideStore} from "@ngrx/store";
import {AiEffects} from "../store/ai/ai.effects";
import {aiReducer} from "../store/ai/ai.reducer";
import {AppConfigEffects} from "../store/app-config/app-config.effects";
import {appConfigReducer} from "../store/app-config/app-config.reducer";
import {DividendAnnouncementEffects} from "../store/dividend-announcement/dividend-announcement.effects";
import {dividendAnnouncementReducer} from "../store/dividend-announcement/dividend-announcement.reducer";
import {routes} from "./app.routes";
import {initializeStartup} from "./startup/startup.initializer";
import {BarChart, LineChart, PieChart} from "echarts/charts";
import * as echarts from "echarts/core";
import {provideEchartsCore} from "ngx-echarts";
import {SVGRenderer} from "echarts/renderers";
import {GridComponent, LegendComponent, TooltipComponent,} from "echarts/components";
import {aiSlice, appConfigSlice, depotSlice, dividendAnnouncementSlice, securitySlice,} from "../store/app.state";
import {securityReducer} from "../store/security/security.reducer";
import {SecurityEffects} from "../store/security/security.effects";
import {depotReducer} from "../store/depot/depot.reducer";
import {DepotEffects} from "../store/depot/depot.effects";

registerLocaleData(localeDe, "de-DE", localeDeExtra);

export function initialize() {
  return (): Promise<void> => {
    /** Async initialization can take place here. */
    return new Promise<void>((resolve) => resolve());
  };
}

echarts.use([
  BarChart,
  GridComponent,
  LegendComponent,
  LineChart,
  PieChart,
  SVGRenderer,
  TooltipComponent,
]);

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes),
    provideHttpClient(withXhr()),
    provideEchartsCore({echarts}),
    provideStore({
      [aiSlice]: aiReducer,
      [appConfigSlice]: appConfigReducer,
      [depotSlice]: depotReducer,
      [dividendAnnouncementSlice]: dividendAnnouncementReducer,
      [securitySlice]: securityReducer,
    }),
    provideEffects(
      AiEffects,
      AppConfigEffects,
      DepotEffects,
      DividendAnnouncementEffects,
      SecurityEffects),
    importProvidersFrom(MatNativeDateModule),
    TqDatePipe,
    {provide: DateAdapter, useClass: TqDateAdapter},
    provideAppInitializer(() => {
      inject(MatIconRegistry).setDefaultFontSetClass("material-symbols-outlined", "mat-ligature-font");
    }),
    provideAppInitializer(() => initializeStartup()),
    {
      provide: IMAGE_CONFIG,
      useValue: {
        disableImageSizeWarning: true,
        disableImageLazyLoadWarning: true,
      },
    },
    provideAppInitializer(() => {
      const initializerFn = initialize();
      return initializerFn();
    }),
  ],
};
