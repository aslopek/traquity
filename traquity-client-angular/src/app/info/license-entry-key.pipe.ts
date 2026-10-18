import {Pipe, PipeTransform} from '@angular/core';

export type LicenseSection = 'frontend' | 'backend';

@Pipe({
  name: 'licenseEntryKey',
  standalone: true
})
export class LicenseEntryKeyPipe implements PipeTransform {

  transform(name: string, section: LicenseSection): string {
    return `${section}:${name}`;
  }
}
