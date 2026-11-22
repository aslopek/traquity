import {Component, computed, inject, Signal} from '@angular/core';
import {Store} from '@ngrx/store';
import {isChristmasThemeOffered} from '../../common/functions/is-christmas-theme-offered';
import {isAppConfigLoaded, isChristmasThemeOn, isDevModeActive, isSideMenuOpen} from '../../store/app-config/app-config.selector';
import {AppState} from '../../store/app.state';

// keep in sync with $flake-count in the stylesheet, which positions and animates each flake by its index
const flakeCount: number = 60;
const lightCount: number = 36;

/**
 * Decoration over the app shell while the Christmas theme is offered and switched on: a garland with fairy lights under the header,
 * falling snow, a snow drift along the bottom edge and, while the side menu is open, a decorated tree with presents, a snowman and a
 * candle under it. Takes no pointer events.
 */
@Component({
  selector: 'app-christmas-overlay',
  templateUrl: 'christmas-overlay.component.html',
  styleUrls: ['christmas-overlay.component.scss'],
})
export class ChristmasOverlayComponent {

  private readonly store: Store<AppState> = inject(Store);
  private readonly appConfigLoaded: Signal<boolean> = this.store.selectSignal(isAppConfigLoaded);
  private readonly christmasThemeOn: Signal<boolean> = this.store.selectSignal(isChristmasThemeOn);
  private readonly devModeActive: Signal<boolean> = this.store.selectSignal(isDevModeActive);

  // without the loaded gate, the default of the not yet loaded setting would show the theme before the stored choice arrives
  protected readonly shown: Signal<boolean> = computed((): boolean =>
    this.appConfigLoaded() && this.christmasThemeOn() && isChristmasThemeOffered(new Date(), this.devModeActive()));
  protected readonly sceneShown: Signal<boolean> = this.store.selectSignal(isSideMenuOpen);
  protected readonly flakes: number[] = Array.from({length: flakeCount}, (_: unknown, index: number): number => index);
  protected readonly lights: number[] = Array.from({length: lightCount}, (_: unknown, index: number): number => index);
}
