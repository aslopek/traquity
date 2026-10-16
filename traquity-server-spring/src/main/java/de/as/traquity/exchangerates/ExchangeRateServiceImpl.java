package de.as.traquity.exchangerates;

import static java.math.BigDecimal.ONE;
import static java.time.temporal.ChronoUnit.DAYS;

import de.as.traquity.common.config.ArithmeticConfig;
import de.as.traquity.common.error.NotFoundException;
import jakarta.transaction.Transactional;
import java.math.BigDecimal;
import java.math.MathContext;
import java.time.LocalDate;
import java.util.List;
import java.util.function.Supplier;
import java.util.stream.Stream;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

@Slf4j
@Service
@RequiredArgsConstructor
class ExchangeRateServiceImpl implements ExchangeRateService {

  /**
   * Maximum age of an exchange rate - if it is older, it is considered to be outdated.
   */
  private static final long MAX_AGE = 7L;
  private final Supplier<EcbExchangeRateFetcher> ecbExchangeRateFetcherSupplier;
  private final ExchangeRateRepository exchangeRateRepository;
  private final ArithmeticConfig arithmeticConfig;

  @Transactional
  public void updateExchangeRates() {
    ExchangeRateEntity latestExchangeRate;
    try (Stream<ExchangeRateEntity> eurUsdRates =
             exchangeRateRepository.findAllByBaseCurrencyAndTargetCurrencyOrderByDateDesc("EUR", "USD")) {
      latestExchangeRate = eurUsdRates.findFirst().orElse(null);
    }
    LocalDate minDate = latestExchangeRate == null ? LocalDate.EPOCH : latestExchangeRate.getDate().plusDays(1);
    EcbExchangeRateFetcher fetcher = ecbExchangeRateFetcherSupplier.get();
    List<ExchangeRateEntity> exchangeRateEntities = fetcher.fetchExchangeRates(minDate);

    if (!exchangeRateEntities.isEmpty()) {
      exchangeRateRepository.saveAll(exchangeRateEntities);
      log.info("Added {} new exchange rates between {} and {}", exchangeRateEntities.size(),
          exchangeRateEntities.getFirst().getDate(), exchangeRateEntities.getLast().getDate());
    }
  }

  @Override
  @Transactional
  public List<BigDecimal> convert(List<CurrencyConversionRequest> items, String baseCurrency, String targetCurrency)
      throws NotFoundException, OutdatedExchangeRateException {
    if (items.isEmpty()) {
      return List.of();
    }
    if (baseCurrency.equals(targetCurrency)) {
      return items.stream().map(CurrencyConversionRequest::getValue).toList();
    }

    List<ExchangeRateEntity> forwardRates = exchangeRateRepository
        .findAllByBaseCurrencyAndTargetCurrencyOrderByDateAsc(baseCurrency, targetCurrency);
    List<ExchangeRateEntity> reverseRates = exchangeRateRepository
        .findAllByBaseCurrencyAndTargetCurrencyOrderByDateAsc(targetCurrency, baseCurrency);

    MathContext mathContext = arithmeticConfig.mathContext();
    return items.stream()
        .map(item -> convertUsingCachedRates(item, forwardRates, reverseRates, baseCurrency, targetCurrency, mathContext))
        .toList();
  }

  @Override
  @Transactional
  public List<BigDecimal> convertBestEffort(List<CurrencyConversionRequest> items, String baseCurrency, String targetCurrency) {
    if (items.isEmpty()) {
      return List.of();
    }
    if (baseCurrency.equals(targetCurrency)) {
      return items.stream().map(CurrencyConversionRequest::getValue).toList();
    }

    List<ExchangeRateEntity> forwardRates = exchangeRateRepository
        .findAllByBaseCurrencyAndTargetCurrencyOrderByDateAsc(baseCurrency, targetCurrency);
    List<ExchangeRateEntity> reverseRates = exchangeRateRepository
        .findAllByBaseCurrencyAndTargetCurrencyOrderByDateAsc(targetCurrency, baseCurrency);

    MathContext mathContext = arithmeticConfig.mathContext();
    return items.stream()
        .map(item -> {
          RateLookup rate = findApplicableRate(item, forwardRates, reverseRates, mathContext);
          return rate == null ? null : item.getValue().multiply(rate.multiplier(), mathContext);
        })
        .toList();
  }

  private BigDecimal convertUsingCachedRates(CurrencyConversionRequest item, List<ExchangeRateEntity> forwardRates,
                                             List<ExchangeRateEntity> reverseRates, String baseCurrency,
                                             String targetCurrency, MathContext mathContext) {
    RateLookup rate = findApplicableRate(item, forwardRates, reverseRates, mathContext);
    if (rate == null) {
      log.error("No exchange rate found for {} to {} at {}", baseCurrency, targetCurrency, item.getDate());
      throw new NotFoundException();
    }

    long exchangeRateAgeInDays = DAYS.between(item.getDate(), rate.entity().getDate());
    BigDecimal result = item.getValue().multiply(rate.multiplier(), mathContext);
    if (Math.abs(exchangeRateAgeInDays) <= MAX_AGE) {
      return result;
    } else {
      throw OutdatedExchangeRateException.builder().date(rate.entity().getDate()).baseCurrency(rate.entity().getBaseCurrency())
          .targetCurrency(rate.entity().getTargetCurrency()).exchangeRate(rate.entity().getExchangeRate())
          .conversionResult(result).build();
    }
  }

  /**
   * The exchange rate entity applicable to {@code item}'s date - forward if available, otherwise reverse inverted
   * via {@code mathContext} - or {@code null} if neither list has one on or before that date.
   */
  private RateLookup findApplicableRate(CurrencyConversionRequest item, List<ExchangeRateEntity> forwardRates,
                                        List<ExchangeRateEntity> reverseRates, MathContext mathContext) {
    ExchangeRateEntity entity = findRateOnOrBefore(forwardRates, item.getDate());
    if (entity != null) {
      return new RateLookup(entity, entity.getExchangeRate());
    }

    entity = findRateOnOrBefore(reverseRates, item.getDate());
    if (entity == null) {
      return null;
    }
    return new RateLookup(entity, ONE.divide(entity.getExchangeRate(), mathContext));
  }

  private record RateLookup(ExchangeRateEntity entity, BigDecimal multiplier) {
  }

  /**
   * Binary search for the latest entity whose date is on or before {@code date} in a list sorted ascending by date
   * (each date occurs at most once, per {@code UNIQUE_EXCHANGE_RATE}).
   */
  private ExchangeRateEntity findRateOnOrBefore(List<ExchangeRateEntity> ratesSortedByDateAsc, LocalDate date) {
    int low = 0;
    int high = ratesSortedByDateAsc.size() - 1;
    ExchangeRateEntity result = null;

    while (low <= high) {
      int mid = (low + high) >>> 1;
      ExchangeRateEntity candidate = ratesSortedByDateAsc.get(mid);
      if (!candidate.getDate().isAfter(date)) {
        result = candidate;
        low = mid + 1;
      } else {
        high = mid - 1;
      }
    }

    return result;
  }
}
