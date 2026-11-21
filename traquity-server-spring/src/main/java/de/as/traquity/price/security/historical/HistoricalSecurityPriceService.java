package de.as.traquity.price.security.historical;

import de.as.traquity.common.error.BadRequestException;
import de.as.traquity.common.error.ConflictException;
import de.as.traquity.common.error.NotFoundException;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Collection;
import java.util.List;
import java.util.Map;
import java.util.Set;

public interface HistoricalSecurityPriceService {

  /**
   * @param startDate the first date to include, {@code null} for all prices
   * @return the prices from {@code startDate} on, ordered by date and all in the currency of the security's latest price from a data
   *     source, or of the latest price if none comes from a data source; a price that cannot be converted to that currency is left out
   */
  List<HistoricalSecurityPrice> getPrices(long securityId, LocalDate startDate);

  /**
   * @param startDate the first date to include, {@code null} for all prices
   * @return the prices from {@code startDate} on, ordered by date and all in {@code currency}; a price that cannot be converted to
   *     {@code currency} is left out
   */
  List<HistoricalSecurityPrice> getPrices(long securityId, LocalDate startDate, String currency);

  HistoricalSecurityPrice getLatestPrice(long securityId, String currency) throws NotFoundException;

  /**
   * Summarizes the stored prices of several securities, converting the prices of all of them in one batch per currency pair.
   *
   * @param securityIds the securities to summarize
   * @param currency    the currency of every summary, {@code null} for the currency of each security's latest stored price
   * @param startDate   the first date of each summary's recent prices
   * @return the summaries by security ID; a security without a price stored in or convertible to the summary's currency has none
   */
  Map<Long, HistoricalSecurityPriceSummary> getPriceSummaries(Collection<Long> securityIds, String currency, LocalDate startDate);

  Map<Long, HistoricalSecurityPrice> getLatestPrices(Set<Long> securityIds, String currency);

  void splitAdjustment(Long securityId, BigDecimal multiplier, LocalDate exDate);

  HistoricalSecurityPriceConfig getConfig(long securityId) throws NotFoundException;

  HistoricalSecurityPriceConfig createConfig(HistoricalSecurityPriceConfig config)
      throws BadRequestException, ConflictException, NotFoundException;

  HistoricalSecurityPriceConfig updateConfig(HistoricalSecurityPriceConfig config)
      throws BadRequestException, ConflictException, NotFoundException;
}
