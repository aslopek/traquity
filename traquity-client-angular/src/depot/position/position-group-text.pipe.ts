import {Pipe, PipeTransform} from "@angular/core";
import {TqCurrencyPipe} from "../../common/pipe/tq-currency.pipe";
import {TqPercentPipe} from "../../common/pipe/tq-percent.pipe";
import {PositionGroup} from "../../store/depot/position-grouping/position-group.type";

@Pipe({
  name: 'positionGroupText',
  pure: true
})
export class PositionGroupTextPipe implements PipeTransform {

  constructor(private readonly tqCurrencyPipe: TqCurrencyPipe, private readonly tqPercentPipe: TqPercentPipe) {
  }

  transform(group: PositionGroup, useBuyIn: boolean, hideAbsoluteValues: boolean, includeAbsolute: boolean, currency: string): string {
    const relative: string = this.tqPercentPipe.transform(useBuyIn ? group.buyInRelative : group.currentSizeRelative);

    if (!includeAbsolute || hideAbsoluteValues) {
      return `${group.name} · ${relative}`;
    }

    const absolute: string = this.tqCurrencyPipe.transform(useBuyIn ? group.buyInAbsolute : group.currentSizeAbsolute, currency);
    return `${group.name} · ${relative} · ${absolute}`;
  }
}
