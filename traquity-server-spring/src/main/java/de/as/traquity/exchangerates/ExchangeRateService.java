package de.as.traquity.exchangerates;

import de.as.traquity.common.error.NotFoundException;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

public interface ExchangeRateService {

  /**
   * Converts every item from {@code baseCurrency} to {@code targetCurrency} by the rules in the section "Currency conversion" of
   * {@code USER_MANUAL.md}, applied to each item's date.
   *
   * @param items          the values to convert, each with its date
   * @param baseCurrency   the currency of every item
   * @param targetCurrency the currency to convert to
   * @return the converted values, same size and order as {@code items}
   * @throws NotFoundException             when one of the items cannot be converted
   * @throws OutdatedExchangeRateException when the exchange rate used for one of the items is from a day more than seven days before
   *     the item's date
   */
  List<BigDecimal> convert(List<CurrencyConversionRequest> items, String baseCurrency, String targetCurrency)
      throws NotFoundException, OutdatedExchangeRateException;

  /**
   * Like {@link #convert}, but an item that cannot be converted gets {@code null} in its slot, and an item whose exchange rate is
   * outdated is converted all the same.
   *
   * @param items          the values to convert, each with its date
   * @param baseCurrency   the currency of every item
   * @param targetCurrency the currency to convert to
   * @return the converted values, same size and order as {@code items}, {@code null} for an item that cannot be converted
   */
  List<BigDecimal> convertBestEffort(List<CurrencyConversionRequest> items, String baseCurrency, String targetCurrency);

  /**
   * @param baseCurrency   one of the two currencies
   * @param targetCurrency the other currency
   * @return the first date {@link #convert} and {@link #convertBestEffort} can convert between the two currencies, in either direction
   * @throws NotFoundException when there is no exchange rate between the two currencies
   */
  LocalDate getEarliestConversionDate(String baseCurrency, String targetCurrency) throws NotFoundException;
}
