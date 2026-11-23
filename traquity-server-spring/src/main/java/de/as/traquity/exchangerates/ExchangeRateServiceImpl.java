package de.as.traquity.exchangerates;

import static java.math.BigDecimal.ONE;
import static java.time.temporal.ChronoUnit.DAYS;

import de.as.traquity.common.config.ArithmeticConfig;
import de.as.traquity.common.error.NotFoundException;
import jakarta.transaction.Transactional;
import java.math.BigDecimal;
import java.math.MathContext;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.function.Function;
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
  /**
   * The currency every stored ECB rate is quoted against.
   */
  private static final String PIVOT_CURRENCY = EcbExchangeRateFetcher.BASE_CURRENCY;
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

    MathContext mathContext = arithmeticConfig.mathContext();
    Rates rates = loadRates(baseCurrency, targetCurrency, mathContext);
    return items.stream()
        .map(item -> convertUsingCachedRates(item, rates, baseCurrency, targetCurrency, mathContext))
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

    MathContext mathContext = arithmeticConfig.mathContext();
    Rates rates = loadRates(baseCurrency, targetCurrency, mathContext);
    return items.stream()
        .map(item -> {
          RateLookup rate = findApplicableRate(item, rates, mathContext);
          return rate == null ? null : item.getValue().multiply(rate.multiplier(), mathContext);
        })
        .toList();
  }

  @Override
  public LocalDate getEarliestConversionDate(String baseCurrency, String targetCurrency) throws NotFoundException {
    Stream<LocalDate> directDates = Stream.of(
            exchangeRateRepository.findFirstByBaseCurrencyAndTargetCurrencyOrderByDateAsc(baseCurrency, targetCurrency),
            exchangeRateRepository.findFirstByBaseCurrencyAndTargetCurrencyOrderByDateAsc(targetCurrency, baseCurrency))
        .flatMap(Optional::stream)
        .map(ExchangeRateEntity::getDate);
    Stream<LocalDate> pivotDates = ratesThroughPivot(baseCurrency, targetCurrency, arithmeticConfig.mathContext()).stream()
        .limit(1)
        .map(RateLookup::date);
    return Stream.concat(directDates, pivotDates)
        .min(LocalDate::compareTo)
        .orElseThrow(NotFoundException::new);
  }

  private Rates loadRates(String baseCurrency, String targetCurrency, MathContext mathContext) {
    return new Rates(
        exchangeRateRepository.findAllByBaseCurrencyAndTargetCurrencyOrderByDateAsc(baseCurrency, targetCurrency),
        exchangeRateRepository.findAllByBaseCurrencyAndTargetCurrencyOrderByDateAsc(targetCurrency, baseCurrency),
        ratesThroughPivot(baseCurrency, targetCurrency, mathContext));
  }

  /**
   * Computes the rates from {@code baseCurrency} into {@code targetCurrency} through {@link #PIVOT_CURRENCY}, one for every day that has
   * the rates from {@link #PIVOT_CURRENCY} into both currencies.
   *
   * @param baseCurrency   the currency to convert from
   * @param targetCurrency the currency to convert to
   * @param mathContext    the context to divide the two rates of a day with
   * @return the rates, sorted ascending by date; empty if one of the currencies is {@link #PIVOT_CURRENCY} itself
   */
  private List<RateLookup> ratesThroughPivot(String baseCurrency, String targetCurrency, MathContext mathContext) {
    if (PIVOT_CURRENCY.equals(baseCurrency) || PIVOT_CURRENCY.equals(targetCurrency)) {
      return List.of();
    }
    List<ExchangeRateEntity> intoBase =
        exchangeRateRepository.findAllByBaseCurrencyAndTargetCurrencyOrderByDateAsc(PIVOT_CURRENCY, baseCurrency);
    List<ExchangeRateEntity> intoTarget =
        exchangeRateRepository.findAllByBaseCurrencyAndTargetCurrencyOrderByDateAsc(PIVOT_CURRENCY, targetCurrency);

    List<RateLookup> rates = new ArrayList<>(Math.min(intoBase.size(), intoTarget.size()));
    int baseIndex = 0;
    int targetIndex = 0;
    while (baseIndex < intoBase.size() && targetIndex < intoTarget.size()) {
      ExchangeRateEntity baseRate = intoBase.get(baseIndex);
      ExchangeRateEntity targetRate = intoTarget.get(targetIndex);
      int comparison = baseRate.getDate().compareTo(targetRate.getDate());
      if (comparison < 0) {
        baseIndex++;
      } else if (comparison > 0) {
        targetIndex++;
      } else {
        BigDecimal rate = targetRate.getExchangeRate().divide(baseRate.getExchangeRate(), mathContext);
        rates.add(new RateLookup(baseRate.getDate(), baseCurrency, targetCurrency, rate, rate));
        baseIndex++;
        targetIndex++;
      }
    }
    return rates;
  }

  private BigDecimal convertUsingCachedRates(CurrencyConversionRequest item, Rates rates, String baseCurrency, String targetCurrency,
                                             MathContext mathContext) {
    RateLookup rate = findApplicableRate(item, rates, mathContext);
    if (rate == null) {
      log.error("No exchange rate found for {} to {} at {}", baseCurrency, targetCurrency, item.getDate());
      throw new NotFoundException();
    }

    long exchangeRateAgeInDays = DAYS.between(item.getDate(), rate.date());
    BigDecimal result = item.getValue().multiply(rate.multiplier(), mathContext);
    if (Math.abs(exchangeRateAgeInDays) <= MAX_AGE) {
      return result;
    } else {
      throw OutdatedExchangeRateException.builder().date(rate.date()).baseCurrency(rate.baseCurrency())
          .targetCurrency(rate.targetCurrency()).exchangeRate(rate.exchangeRate()).conversionResult(result).build();
    }
  }

  /**
   * Finds the exchange rate applicable to {@code item} by the rules in the section "Currency conversion" of {@code USER_MANUAL.md}. On the
   * same day, a forward rate is taken over a reverse one, and a reverse one over a rate through {@link #PIVOT_CURRENCY}.
   *
   * @param item        the value to convert, with its date
   * @param rates       the rates to choose from
   * @param mathContext the context to invert a reverse rate with
   * @return the applicable rate, a reverse one inverted, or {@code null} if none of the rates is on or before the item's date
   */
  private RateLookup findApplicableRate(CurrencyConversionRequest item, Rates rates, MathContext mathContext) {
    ExchangeRateEntity forward = findLatestOnOrBefore(rates.forward(), ExchangeRateEntity::getDate, item.getDate());
    ExchangeRateEntity reverse = findLatestOnOrBefore(rates.reverse(), ExchangeRateEntity::getDate, item.getDate());
    RateLookup throughPivot = findLatestOnOrBefore(rates.throughPivot(), RateLookup::date, item.getDate());

    RateLookup applicable = forward == null ? null : RateLookup.of(forward, forward.getExchangeRate());
    if (reverse != null && isLaterThan(reverse.getDate(), applicable)) {
      applicable = RateLookup.of(reverse, ONE.divide(reverse.getExchangeRate(), mathContext));
    }
    if (throughPivot != null && isLaterThan(throughPivot.date(), applicable)) {
      applicable = throughPivot;
    }
    return applicable;
  }

  private static boolean isLaterThan(LocalDate date, RateLookup rate) {
    return rate == null || date.isAfter(rate.date());
  }

  /**
   * Binary search for the latest element whose date is on or before {@code date} in a list sorted ascending by date, each date occurring
   * at most once.
   *
   * @param sortedByDateAsc the list to search
   * @param dateOf          the date of an element
   * @param date            the latest date to accept
   * @param <T>             the type of the elements
   * @return the element found, or {@code null} if every element is after {@code date}
   */
  private static <T> T findLatestOnOrBefore(List<T> sortedByDateAsc, Function<T, LocalDate> dateOf, LocalDate date) {
    int low = 0;
    int high = sortedByDateAsc.size() - 1;
    T result = null;

    while (low <= high) {
      int mid = (low + high) >>> 1;
      T candidate = sortedByDateAsc.get(mid);
      if (!dateOf.apply(candidate).isAfter(date)) {
        result = candidate;
        low = mid + 1;
      } else {
        high = mid - 1;
      }
    }

    return result;
  }

  /**
   * The rates one conversion chooses from, each list sorted ascending by date.
   *
   * @param forward      the rates from the currency converted from into the currency converted to
   * @param reverse      the rates from the currency converted to into the currency converted from
   * @param throughPivot the rates through {@link #PIVOT_CURRENCY}
   */
  private record Rates(List<ExchangeRateEntity> forward, List<ExchangeRateEntity> reverse, List<RateLookup> throughPivot) {
  }

  /**
   * An exchange rate a conversion can use.
   *
   * @param date           the day of the rate
   * @param baseCurrency   the base currency of the stored rate, or the currency converted from for a rate through the pivot
   * @param targetCurrency the target currency of the stored rate, or the currency converted to for a rate through the pivot
   * @param exchangeRate   the stored rate, or the multiplier for a rate through the pivot
   * @param multiplier     the factor a value is multiplied with to convert it
   */
  private record RateLookup(LocalDate date, String baseCurrency, String targetCurrency, BigDecimal exchangeRate, BigDecimal multiplier) {

    private static RateLookup of(ExchangeRateEntity entity, BigDecimal multiplier) {
      return new RateLookup(entity.getDate(), entity.getBaseCurrency(), entity.getTargetCurrency(), entity.getExchangeRate(), multiplier);
    }
  }
}
