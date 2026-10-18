import {Pipe, PipeTransform} from '@angular/core';
import {DepotLogoApi} from '../../gen/api/depot';

@Pipe({
  name: 'depotLogoUrl',
})
export class DepotLogoUrlPipe implements PipeTransform {

  private readonly logoBasePath: string;

  constructor(depotLogoApi: DepotLogoApi) {
    this.logoBasePath = depotLogoApi.configuration.basePath ?? '';
  }

  transform(depotId: number): string {
    return `${this.logoBasePath}/depots/${depotId}/logo`;
  }
}
