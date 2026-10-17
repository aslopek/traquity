import {Pipe, PipeTransform} from "@angular/core";
import {TqCurrencyPipe} from "../../common/pipe/tq-currency.pipe";
import {PositionPerformance} from "../../gen/api/depot-performance";

@Pipe({
  name: 'costBasisBreakdown',
  pure: true
})
export class CostBasisBreakdownPipe implements PipeTransform {

  constructor(private readonly tqCurrencyPipe: TqCurrencyPipe) {
  }

  transform(performance: PositionPerformance): string {
    const buys: string = this.tqCurrencyPipe.transform(-performance.buysGross, performance.currency);
    const taxes: string = this.tqCurrencyPipe.transform(-performance.taxes, performance.currency);
    const fees: string = this.tqCurrencyPipe.transform(-performance.fees, performance.currency);
    return `Buys ${buys} + Taxes ${taxes} + Fees ${fees}`;
  }
}
