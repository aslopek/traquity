import {Pipe, PipeTransform} from "@angular/core";

@Pipe({
  name: 'lotSoldHeight',
  pure: true
})
export class LotSoldHeightPipe implements PipeTransform {

  /**
   * @param soldFraction the sold share of a lot, where `0` is nothing sold and `1` is fully sold
   * @returns that fraction as a CSS percentage, clamped into `0%`-`100%` and rounded to two decimals
   */
  transform(soldFraction: number): string {
    const clamped: number = Math.min(1, Math.max(0, soldFraction));
    return `${Math.round(clamped * 10000) / 100}%`;
  }
}
