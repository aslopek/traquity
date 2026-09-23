import {Component, inject} from '@angular/core';
import {MatButtonModule} from '@angular/material/button';
import {MatButtonToggleModule} from '@angular/material/button-toggle';
import {MatFormFieldModule} from '@angular/material/form-field';
import {MatSelectModule} from '@angular/material/select';
import {MatStepperNext} from '@angular/material/stepper';
import {TransactionType} from '../../../../../gen/api/depot-transaction';
import {TransactionTypeDisplayNamePipe} from '../../../../../common/pipe/transaction-type-display-name.pipe';
import {ReadableTransactionImportStore, TransactionImportStore} from '../../store/transaction-import.store';
import {MappableField} from '../../store/csv/csv.type';
import {lookupTransactionType} from '../../store/csv/lookup-transaction-type';

type MappingFieldConfig = {
  field: MappableField
  label: string
  required: boolean
};

type SeparatorOption = {
  value: string
  label: string
};

const separatorOptions: readonly SeparatorOption[] = [
  {value: ';', label: 'Semicolon (;)'},
  {value: ',', label: 'Comma (,)'},
  {value: '\t', label: 'Tab'},
  {value: '|', label: 'Pipe (|)'}
] as const;

const dateFormatOptions: readonly string[] = ['yyyy-MM-dd', 'dd.MM.yyyy', 'dd/MM/yyyy', 'MM/dd/yyyy', 'd.M.yyyy', 'yyyy/MM/dd'] as const;

const fieldConfigs: readonly MappingFieldConfig[] = [
  {field: 'date', label: 'Date', required: true},
  {field: 'time', label: 'Time', required: false},
  {field: 'transactionType', label: 'Transaction Type', required: true},
  {field: 'isin', label: 'ISIN', required: false},
  {field: 'name', label: 'Name', required: false},
  {field: 'symbol', label: 'Symbol', required: false},
  {field: 'wkn', label: 'WKN', required: false},
  {field: 'securityCountOriginal', label: 'Quantity', required: true},
  {field: 'grossValue', label: 'Gross Value', required: true},
  {field: 'tax', label: 'Tax', required: false},
  {field: 'fee', label: 'Fee', required: false}
] as const;

@Component({
  selector: 'app-mapping-step',
  imports: [MatButtonModule, MatButtonToggleModule, MatFormFieldModule, MatSelectModule, MatStepperNext, TransactionTypeDisplayNamePipe],
  templateUrl: './mapping-step.component.html',
  styleUrl: './mapping-step.component.scss'
})
export class MappingStepComponent {
  protected readonly transactionImportStore: ReadableTransactionImportStore = inject(TransactionImportStore);
  protected readonly separatorOptions: readonly SeparatorOption[] = separatorOptions;
  protected readonly dateFormatOptions: readonly string[] = dateFormatOptions;
  protected readonly fieldConfigs: readonly MappingFieldConfig[] = fieldConfigs;
  protected readonly transactionTypes: TransactionType[] = Object.values(TransactionType);

  protected columnMappingValue(field: MappableField): number | null {
    return this.transactionImportStore.columnMapping()[field] ?? null;
  }

  protected setColumnMapping(field: MappableField, columnIndex: number | null): void {
    this.transactionImportStore.setColumnMapping(field, columnIndex);
  }

  protected typeMappingValue(csvValue: string): TransactionType | null | undefined {
    return lookupTransactionType(this.transactionImportStore.transactionTypeMapping(), csvValue);
  }
}
