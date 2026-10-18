import {Component, input, InputSignal,} from '@angular/core';
import {TqIconComponent} from '../tq-icon/tq-icon.component';
import {SecurityLogoUrlPipe} from '../../pipe/security-logo-url.pipe';
import {IconSize} from '../tq-icon/icon-size.type';

@Component({
  selector: 'security-logo',
  imports: [TqIconComponent, SecurityLogoUrlPipe],
  templateUrl: './security-logo.component.html',
  styleUrl: './security-logo.component.scss',
})
export class SecurityLogoComponent {

  readonly securityId: InputSignal<number> = input.required<number>();
  readonly size: InputSignal<IconSize | undefined> = input<IconSize | undefined>();
}
