import {AfterViewInit, Component, ElementRef, inject, Signal, viewChild} from "@angular/core";
import {MatButtonModule} from "@angular/material/button";
import {MatFormFieldModule} from "@angular/material/form-field";
import {MatIconModule} from "@angular/material/icon";
import {MatInputModule} from "@angular/material/input";
import {MatTooltipModule} from "@angular/material/tooltip";
import {FileNamePipe} from "../../common/pipe/file-name.pipe";
import {AboutButtonComponent} from "../info/about-button/about-button.component";
import {ReadableStartupStore, StartupStore} from "../startup/store/startup.store";
import {ReadableUnlockStore, UnlockStore} from "./store/unlock.store";

@Component({
  selector: "app-unlock",
  imports: [AboutButtonComponent, FileNamePipe, MatButtonModule, MatFormFieldModule, MatIconModule, MatInputModule,
    MatTooltipModule],
  providers: [UnlockStore],
  templateUrl: "unlock.component.html",
  styleUrls: ["unlock.component.scss"],
})
export class UnlockComponent implements AfterViewInit {

  protected readonly unlockStore: ReadableUnlockStore = inject(UnlockStore);
  protected readonly startupStore: ReadableStartupStore = inject(StartupStore);

  private readonly passwordInput: Signal<ElementRef<HTMLInputElement>> =
    viewChild.required<ElementRef<HTMLInputElement>>("passwordInput");

  ngAfterViewInit(): void {
    this.passwordInput().nativeElement.focus();
  }
}
