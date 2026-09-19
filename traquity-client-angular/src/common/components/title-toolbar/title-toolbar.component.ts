import {Component, EventEmitter, Input, Output,} from "@angular/core";
import {MatButtonModule} from "@angular/material/button";
import {MatIconModule} from "@angular/material/icon";
import {MatTooltipModule} from "@angular/material/tooltip";

@Component({
  selector: "app-title-toolbar",
  imports: [MatButtonModule, MatIconModule, MatTooltipModule],
  templateUrl: "title-toolbar.html",
  styleUrls: ["title-toolbar.scss"],
})
export class TitleToolbarComponent {
  @Input({ required: true }) title!: string;
  @Output() onClose: EventEmitter<void> = new EventEmitter<void>();

  close(): void {
    this.onClose.emit();
  }
}
