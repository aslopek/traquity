import {Component, computed, effect, inject, Signal, signal, WritableSignal} from "@angular/core";
import {MatFormFieldModule} from "@angular/material/form-field";
import {MatInputModule} from "@angular/material/input";
import {MatChipsModule} from "@angular/material/chips";
import {MatAutocompleteModule, MatAutocompleteSelectedEvent} from "@angular/material/autocomplete";
import {MatButtonModule} from "@angular/material/button";
import {MatIconModule} from "@angular/material/icon";
import {Store} from "@ngrx/store";
import {FieldTree, form, FormField, minLength, required, SchemaPathTree} from "@angular/forms/signals";
import {ReadableSecurityGroupStore, SecurityGroupStore} from "../store/security-group.store";
import {SecurityGroupRead} from "../../../gen/api/configuration-security-group";
import {AppState} from "../../../store/app.state";
import {securitiesById as securitiesByIdSelector} from "../../../store/security/security.selector";
import {SecuritiesById} from "../../../store/security/security.state";
import {SecurityNamePipe} from "../../../common/pipe/security-name.pipe";

type MemberOption = {
  id: number
  name: string
};

type FormModel = {
  name: string
  members: number[]
};

@Component({
  selector: "app-security-group-details",
  imports: [
    MatFormFieldModule,
    MatInputModule,
    MatChipsModule,
    MatAutocompleteModule,
    MatButtonModule,
    MatIconModule,
    FormField,
    SecurityNamePipe
  ],
  templateUrl: "./security-group-details.component.html",
  styleUrl: "./security-group-details.component.scss",
})
export class SecurityGroupDetailsComponent {

  private readonly securityGroupStore: ReadableSecurityGroupStore = inject(SecurityGroupStore);
  private readonly securitiesById: Signal<SecuritiesById> = inject(Store<AppState>).selectSignal(securitiesByIdSelector);

  protected readonly selectedSecurityGroupId: Signal<number | 'new' | null> = this.securityGroupStore.selectedSecurityGroupId;
  protected readonly persistError: Signal<'conflict' | 'bad-request' | null> = this.securityGroupStore.persistError;

  protected readonly memberInput: WritableSignal<string> = signal<string>('');

  private readonly formModel: WritableSignal<FormModel> = signal<FormModel>({name: '', members: []});
  protected readonly form: FieldTree<FormModel> = form(this.formModel, (schemaPath: SchemaPathTree<FormModel>): void => {
    required(schemaPath.name);
    minLength(schemaPath.name, 1);
    minLength(schemaPath.members, 2);
  });

  protected readonly filteredOptions: Signal<MemberOption[]> = computed<MemberOption[]>((): MemberOption[] => {
    const filterValue: string = this.memberInput().trim().toLowerCase();
    const assigned: Set<number> = this.securityGroupStore.assignedSecurityIds();
    const selected: Set<number> = new Set<number>(this.form.members().value());
    const securities: SecuritiesById = this.securitiesById();

    return Object.keys(securities)
      .map((id: string): number => Number(id))
      .filter((id: number): boolean => !assigned.has(id) && !selected.has(id))
      .map((id: number): MemberOption => ({id, name: securities[id].name}))
      .filter((option: MemberOption): boolean => filterValue.length === 0 || option.name.toLowerCase().includes(filterValue));
  });

  protected readonly canSave: Signal<boolean> = computed<boolean>((): boolean => {
    let valid: boolean = true;
    for (const [, field] of this.form) {
      valid = valid && field().valid();
    }
    return valid;
  });

  constructor() {
    effect((): void => {
      this.resetForm();
    });
  }

  protected onMemberInput(event: Event): void {
    this.memberInput.set((event.target as HTMLInputElement).value);
  }

  protected selectOption(event: MatAutocompleteSelectedEvent): void {
    const id: number = event.option.value as number;
    const current: number[] = this.form.members().value();
    if (!current.includes(id)) {
      this.form.members().value.set([...current, id]);
    }
    this.memberInput.set('');
    event.option.deselect();
  }

  protected removeMember(id: number): void {
    this.form.members().value.set(this.form.members().value().filter((memberId: number): boolean => memberId !== id));
  }

  protected save(): void {
    if (!this.canSave()) {
      return;
    }
    const selectedSecurityGroupId: number | 'new' | null = this.selectedSecurityGroupId();
    const name: string = this.form.name().value().trim();
    const members: number[] = this.form.members().value();

    if (selectedSecurityGroupId === 'new' || selectedSecurityGroupId === null) {
      this.securityGroupStore.createSecurityGroup(name, members);
      return;
    }

    const selectedSecurityGroup: SecurityGroupRead | null = this.securityGroupStore.selectedSecurityGroup();
    if (selectedSecurityGroup === null) {
      return;
    }
    this.securityGroupStore.updateSecurityGroup(selectedSecurityGroupId, selectedSecurityGroup.version, name, members);
  }

  protected cancel(): void {
    this.resetForm();
  }

  private resetForm(): void {
    const selectedSecurityGroupId: number | 'new' | null = this.selectedSecurityGroupId();
    const selectedSecurityGroup: SecurityGroupRead | null = this.securityGroupStore.selectedSecurityGroup();
    if (selectedSecurityGroupId === 'new') {
      this.formModel.set({name: '', members: []});
    } else if (selectedSecurityGroup !== null) {
      this.formModel.set({name: selectedSecurityGroup.name, members: [...selectedSecurityGroup.securities]});
    }
    this.memberInput.set('');
  }
}
