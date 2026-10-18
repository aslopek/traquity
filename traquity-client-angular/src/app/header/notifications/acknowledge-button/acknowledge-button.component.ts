import {Component, EventEmitter, Output,} from '@angular/core';
import {MatIcon} from '@angular/material/icon';

@Component({
  selector: 'app-acknowledge-button',
  imports: [MatIcon],
  templateUrl: './acknowledge-button.component.html',
  styleUrl: './acknowledge-button.component.scss',
})
export class AcknowledgeButtonComponent {
  @Output() onAcknowledge: EventEmitter<Event> = new EventEmitter<Event>();
}
