import {Component} from "@angular/core";
import {MatProgressBarModule} from "@angular/material/progress-bar";

@Component({
  selector: "app-splash-screen",
  imports: [MatProgressBarModule],
  templateUrl: "splash-screen.component.html",
  styleUrls: ["splash-screen.component.scss"],
})
export class SplashScreenComponent {
}
