package de.as.traquity.price.security.historical;

import java.util.List;
import lombok.Data;

@Data
public class HistoricalSecurityPriceSummary {

  private HistoricalSecurityPrice latestPrice;
  private HistoricalSecurityPrice oldestPrice;

  /** The prices from the summary's start date on that are stored in or convertible to the summary's currency, ordered by date. */
  private List<HistoricalSecurityPrice> recentPrices;
}
