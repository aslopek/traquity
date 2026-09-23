import {Component, DestroyRef, inject, OnInit, signal, Signal, WritableSignal,} from "@angular/core";
import {takeUntilDestroyed} from "@angular/core/rxjs-interop";
import {MatIconModule} from "@angular/material/icon";
import {MatSidenavModule} from "@angular/material/sidenav";
import {Router, RouterLink, RouterOutlet} from "@angular/router";
import {Store} from "@ngrx/store";
import {firstValueFrom} from "rxjs";
import {AdminApi} from "../../gen/api/admin";
import {securityPageStore} from "../../security/security-page-store/security-page.store";
import {AppConfigActions} from "../../store/app-config/app-config.actions";
import {getOpenPage, isSideMenuOpen,} from "../../store/app-config/app-config.selector";
import {AppActions} from "../../store/app.actions";
import {AppState} from "../../store/app.state";
import {DividendAnnouncementActions} from "../../store/dividend-announcement/dividend-announcement.actions";
import {HeaderComponent} from "../header/header.component";
import {Page} from "../page.type";
import {SnackbarComponent} from "../snackbar/snackbar.component";
import {SplashScreenComponent} from "../splash-screen/splash-screen.component";

@Component({
  selector: "app-shell",
  imports: [
    RouterOutlet,
    MatSidenavModule,
    HeaderComponent,
    SnackbarComponent,
    SplashScreenComponent,
    MatIconModule,
    RouterLink,
  ],
  providers: [securityPageStore],
  templateUrl: "shell.component.html",
  styleUrls: ["shell.component.scss"],
})
export class ShellComponent implements OnInit {

  protected readonly backendAvailable: WritableSignal<boolean>;

  private destroyed: boolean = false;

  private readonly store: Store<AppState> = inject(Store);
  private readonly adminApi: AdminApi = inject(AdminApi);
  protected readonly sideMenuOpen: Signal<boolean> = this.store.selectSignal(isSideMenuOpen);
  protected readonly openPage: Signal<Page> = this.store.selectSignal(getOpenPage);

  constructor(
    private readonly router: Router,
    destroyRef: DestroyRef,
  ) {
    this.backendAvailable = signal<boolean>(false);
    destroyRef.onDestroy((): void => {
      this.destroyed = true;
    });
    this.store.select(getOpenPage)
      .pipe(takeUntilDestroyed(destroyRef))
      .subscribe((page: Page): void => {
        this.router.navigate([`/${page}`]);
      });
  }

  async ngOnInit(): Promise<void> {
    await this.waitForBackend();
    if (this.destroyed) {
      return;
    }
    this.backendAvailable.set(true);
    this.store.dispatch(DividendAnnouncementActions.loadDividendAnnouncements());
    this.store.dispatch(AppActions.initialize());
  }

  /**
   * The packaged app spawns the backend as a child process; it needs several seconds to boot. Dispatching the initial
   * load actions before it accepts connections would fail without retry and leave the app empty.
   *
   * The loop is bounded by this component's own lifetime: it stops on destroy, so a shell torn down while still
   * waiting never dispatches the initial loads afterwards - which would duplicate those of the shell that replaces it.
   */
  private async waitForBackend(): Promise<void> {
    while (!this.destroyed) {
      try {
        await firstValueFrom(this.adminApi.getPid());
        return;
      } catch {
        await new Promise<void>((resolve) => setTimeout(() => resolve(), 500));
      }
    }
  }

  protected async selectPage(page: Page): Promise<void> {
    this.store.dispatch(AppConfigActions.setOpenPage({openPage: page}));
  }
}
