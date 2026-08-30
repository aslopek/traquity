import {Component, inject} from "@angular/core";
import {MatButtonModule} from "@angular/material/button";
import {MatIconModule} from "@angular/material/icon";
import {StartupBridgeService} from "../../bridge/startup-bridge.service";

@Component({
  selector: "app-insecure",
  imports: [MatButtonModule, MatIconModule],
  templateUrl: "insecure.component.html",
  styleUrls: ["insecure.component.scss"],
})
export class InsecureComponent {

  private readonly bridge: StartupBridgeService = inject(StartupBridgeService);

  close(): void {
    this.bridge.quit();
  }
}
