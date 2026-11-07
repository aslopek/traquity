package de.as.traquity.price.security.historical;

import de.as.traquity.common.error.BadRequestException;
import de.as.traquity.common.error.ConflictException;
import de.as.traquity.common.error.NotFoundException;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.Set;

public interface HistoricalSecurityPriceService {

  /**
   * @param startDate the first date to include, {@code null} for all prices
   * @return the prices from {@code startDate} on, ordered by date and all in the currency of the security's latest price from a data
   *     source, or of the latest price if none comes from a data source; a price without an exchange rate to that currency for its
   *     date is left out
   */
  List<HistoricalSecurityPrice> getPrices(long securityId, LocalDate startDate);

  /**
   * @param startDate the first date to include, {@code null} for all prices
   * @return the prices from {@code startDate} on, ordered by date and all in {@code currency}; a price without an exchange rate to
   *     {@code currency} for its date is left out
   */
  List<HistoricalSecurityPrice> getPrices(long securityId, LocalDate startDate, String currency);

  HistoricalSecurityPrice getLatestPrice(long securityId, String currency) throws NotFoundException;

  Map<Long, HistoricalSecurityPrice> getLatestPrices(Set<Long> securityIds, String currency);

  void splitAdjustment(Long securityId, BigDecimal multiplier, LocalDate exDate);

  HistoricalSecurityPriceConfig getConfig(long securityId) throws NotFoundException;

  HistoricalSecurityPriceConfig createConfig(HistoricalSecurityPriceConfig config)
      throws BadRequestException, ConflictException, NotFoundException;

  HistoricalSecurityPriceConfig updateConfig(HistoricalSecurityPriceConfig config)
      throws BadRequestException, ConflictException, NotFoundException;
}
