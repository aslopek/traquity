import {DepotRead} from '../gen/api/depot';

export function depotReadFactory(overrides?: Partial<DepotRead>): DepotRead {
  return {
    name: 'Depot',
    currency: 'EUR',
    version: 0,
    id: 1,
    _links: {},
    ...overrides
  };
}
