import {
  Pipe,
  PipeTransform
} from '@angular/core';
import {PriceMetaInfo} from '../../gen/api/security';

@Pipe({
  name: 'priceIcon'
})
export class PriceIconPipePipe implements PipeTransform {

  private readonly maximumPriceAgeInMilliseconds: number = 1000 * 60 * 60 * 24 * 6;

  /**
   * @param priceMetaInfo the price information of the security
   * @returns icon for displaying the current state of the security's prices
   */
  transform(priceMetaInfo?: PriceMetaInfo): string | null {
    if (priceMetaInfo == null) {
      return 'cancel';
    }

    const isOutdated: boolean = Date.now() - Date.parse(priceMetaInfo.latestPriceDate) > this.maximumPriceAgeInMilliseconds;
    if (isOutdated) {
      return 'sync_problem';
    }

    return null;
  }
}
