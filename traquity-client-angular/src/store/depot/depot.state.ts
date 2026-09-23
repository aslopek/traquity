import {DepotRead} from '../../gen/api/depot';
import {Timespan} from "../../common/types/timespan";
import {Dividends} from "../../gen/api/depot-dividend";
import {DepotComposition} from "../../gen/api/depot-position";
import {DepotPerformance, Performance} from "../../gen/api/depot-performance";
import {PositionGroupBy} from './position-grouping/position-group.type';

export type DividendView = 'barchart' | 'table';
export type PositionView = 'donut' | 'list';

export type Positions = Omit<DepotComposition, 'currency'>;
export type IncomeByPosition = { [id: number]: Performance };

export type DepotState = {
  depots: DepotRead[]
  selectedDepotCurrency: string
  selectedDepotIds: number[]
  selectedTabIndex: number
  dividend: {
    dividends: Dividends | null
    aggregationTimespan: Timespan
    includeSpecialDividends: boolean
    selectedView: DividendView
    useGrossValues: boolean
  }
  position: {
    positions: Positions | null
    selectedView: PositionView
    useBuyIn: boolean
    incomeByPosition: IncomeByPosition
    groupBy: PositionGroupBy
  },
  performance: {
    performance: DepotPerformance | null
  }
};
