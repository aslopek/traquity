import {Component, EventEmitter, Input, Output,} from "@angular/core";
import {FormsModule} from "@angular/forms";
import {MatButtonModule} from "@angular/material/button";
import {MatIconModule} from "@angular/material/icon";
import {MatInputModule} from "@angular/material/input";
import {MatTooltipModule} from "@angular/material/tooltip";

@Component({
  selector: "app-search-field",
  imports: [MatInputModule, FormsModule, MatIconModule, MatButtonModule, MatTooltipModule],
  templateUrl: "search-field.component.html",
  styleUrls: ["search-field.component.scss"],
})
export class SearchFieldComponent {
  @Input() searchString: string = "";
  @Input() disabled: boolean = false;
  @Output() search: EventEmitter<string> = new EventEmitter<string>();
  @Output() clear: EventEmitter<void> = new EventEmitter<void>();

  onClear() {
    this.searchString = "";
    this.clear.emit();
  }

  onSearch() {
    if (this.searchString.trim().length > 0) {
      this.search.emit(this.searchString);
    } else {
      this.onClear();
    }
  }
}
