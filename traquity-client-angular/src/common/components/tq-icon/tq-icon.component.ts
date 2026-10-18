import {Component, input, InputSignal} from '@angular/core';
import {NgClass} from '@angular/common';
import {IconBackground} from './icon-background.type';
import {IconSize} from './icon-size.type';

@Component({
  selector: 'tq-icon',
  imports: [
    NgClass
  ],
  templateUrl: './tq-icon.component.html',
  styleUrl: './tq-icon.component.scss',
})
export class TqIconComponent {

  readonly src: InputSignal<string> = input.required<string>();
  readonly size: InputSignal<IconSize | undefined> = input<IconSize>();
  readonly background: InputSignal<IconBackground | undefined> = input<IconBackground>();
}
