import {Component, computed, EventEmitter, inject, input, InputSignal, Output, Signal} from "@angular/core";
import {SecurityGroupRead} from "../../../gen/api/configuration-security-group";
import {MatIcon} from "@angular/material/icon";
import {ReadableSecurityGroupStore, SecurityGroupStore} from "../store/security-group.store";
import {SecurityLogoComponent} from "../../../common/components/security-logo/security-logo.component";

@Component({
  selector: "app-security-group-card",
  imports: [
    MatIcon,
    SecurityLogoComponent
  ],
  templateUrl: "./security-group-card.component.html",
  styleUrl: "./security-group-card.component.scss",
})
export class SecurityGroupCardComponent {

  readonly securityGroup: InputSignal<SecurityGroupRead | 'new'> = input.required<SecurityGroupRead | 'new'>();
  @Output() readonly remove: EventEmitter<number> = new EventEmitter<number>();

  private readonly securityGroupStore: ReadableSecurityGroupStore = inject(SecurityGroupStore);
  protected readonly isSelected: Signal<boolean> = computed((): boolean => {
    const group: SecurityGroupRead | 'new' = this.securityGroup();
    const selected: number | 'new' | null = this.securityGroupStore.selectedSecurityGroupId();
    return (group === 'new' && selected === 'new') || (group !== 'new' && group.id === selected);
  });

  protected clickSecurityGroup(): void {
    const group: SecurityGroupRead | 'new' = this.securityGroup();
    this.securityGroupStore.selectSecurityGroup(group === 'new' ? 'new' : group.id);
  }

  protected clickSideButton(event: MouseEvent): void {
    event.stopPropagation();
    const group: SecurityGroupRead | 'new' = this.securityGroup();
    if (group === 'new') {
      this.clickSecurityGroup();
      return;
    }
    this.remove.emit(group.id);
  }
}
