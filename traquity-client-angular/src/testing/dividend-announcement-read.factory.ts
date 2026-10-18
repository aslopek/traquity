import {DividendAnnouncementRead} from '../gen/api/notification/dividend-announcement';

export function dividendAnnouncementReadFactory(overrides?: Partial<DividendAnnouncementRead>): DividendAnnouncementRead {
  return {
    id: 1,
    dataSourceId: 1,
    securityId: 1,
    payDate: '2026-01-01',
    amountPerShare: 1,
    currency: 'USD',
    isNew: true,
    ...overrides
  };
}
