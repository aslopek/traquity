import {Component, DestroyRef, inject, Signal} from '@angular/core';
import {takeUntilDestroyed} from '@angular/core/rxjs-interop';
import {MatIconModule} from '@angular/material/icon';
import {MatSidenavModule} from '@angular/material/sidenav';
import {Router, RouterLink, RouterOutlet} from '@angular/router';
import {Store} from '@ngrx/store';
import {securityPageStore} from '../../security/security-page-store/security-page.store';
import {AppConfigActions} from '../../store/app-config/app-config.actions';
import {getOpenPage, isSideMenuOpen,} from '../../store/app-config/app-config.selector';
import {AppState} from '../../store/app.state';
import {isDepotSliceInitialized} from '../../store/depot/depot.selector';
import {ChristmasOverlayComponent} from '../christmas-overlay/christmas-overlay.component';
import {HeaderComponent} from '../header/header.component';
import {Page} from '../page.type';
import {SnackbarComponent} from '../snackbar/snackbar.component';
import {SplashScreenComponent} from '../splash-screen/splash-screen.component';

@Component({
  selector: 'app-shell',
  imports: [
    RouterOutlet,
    MatSidenavModule,
    HeaderComponent,
    SnackbarComponent,
    SplashScreenComponent,
    MatIconModule,
    RouterLink,
    ChristmasOverlayComponent,
  ],
  providers: [securityPageStore],
  templateUrl: 'shell.component.html',
  styleUrls: ['shell.component.scss'],
})
export class ShellComponent {

  private readonly store: Store<AppState> = inject(Store);
  // no page shows before the depot slice is set, so none sends a request before the currency of the selected depots is known
  protected readonly ready: Signal<boolean> = this.store.selectSignal(isDepotSliceInitialized);
  protected readonly sideMenuOpen: Signal<boolean> = this.store.selectSignal(isSideMenuOpen);
  protected readonly openPage: Signal<Page> = this.store.selectSignal(getOpenPage);

  constructor(
    private readonly router: Router,
    destroyRef: DestroyRef,
  ) {
    this.store.select(getOpenPage)
      .pipe(takeUntilDestroyed(destroyRef))
      .subscribe((page: Page): void => {
        this.router.navigate([`/${page}`]);
      });
  }

  protected async selectPage(page: Page): Promise<void> {
    this.store.dispatch(AppConfigActions.setOpenPage({openPage: page}));
  }
}
