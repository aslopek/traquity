import {Component, inject} from "@angular/core";
import {MatButtonModule} from "@angular/material/button";
import {MatFormFieldModule} from "@angular/material/form-field";
import {MatIconModule} from "@angular/material/icon";
import {MatInputModule} from "@angular/material/input";
import {MatSelectModule} from "@angular/material/select";
import {MatTooltipModule} from "@angular/material/tooltip";
import {FileDirectoryPipe} from "../../../common/pipe/file-directory.pipe";
import {FileNamePipe} from "../../../common/pipe/file-name.pipe";
import {ConfigureStore, ReadableConfigureStore} from "../store/configure.store";

@Component({
  selector: "app-database-section",
  imports: [
    FileDirectoryPipe,
    FileNamePipe,
    MatButtonModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatSelectModule,
    MatTooltipModule
  ],
  templateUrl: "database-section.component.html",
  styleUrls: ["database-section.component.scss"],
})
export class DatabaseSectionComponent {

  protected readonly configureStore: ReadableConfigureStore = inject(ConfigureStore);
}
