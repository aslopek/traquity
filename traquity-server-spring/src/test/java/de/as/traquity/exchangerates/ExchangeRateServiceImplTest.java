package de.as.traquity.exchangerates;

import static integration.Arithmetic.MATH_CONTEXT;
import static java.math.BigDecimal.TEN;
import static java.time.Month.JANUARY;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatExceptionOfType;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import de.as.traquity.common.config.ArithmeticConfig;
import de.as.traquity.common.error.NotFoundException;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.Month;
import java.util.ArrayList;
import java.util.List;
import java.util.function.Supplier;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

class ExchangeRateServiceImplTest {

  private static final List<LocalDate> TEN_DATES = List.of(
      LocalDate.of(2024, JANUARY, 1),
      LocalDate.of(2024, Month.FEBRUARY, 1),
      LocalDate.of(2024, Month.MARCH, 1),
      LocalDate.of(2024, Month.APRIL, 1),
      LocalDate.of(2024, Month.MAY, 1),
      LocalDate.of(2024, Month.JUNE, 1),
      LocalDate.of(2024, Month.JULY, 1),
      LocalDate.of(2024, Month.AUGUST, 1),
      LocalDate.of(2024, Month.SEPTEMBER, 1),
      LocalDate.of(2024, Month.OCTOBER, 1));
  private static final List<BigDecimal> TEN_VALUES = List.of(
      TEN,
      new BigDecimal("20"),
      new BigDecimal("30"),
      new BigDecimal("40"),
      new BigDecimal("50"),
      new BigDecimal("60"),
      new BigDecimal("70"),
      new BigDecimal("80"),
      new BigDecimal("90"),
      new BigDecimal("100"));

  private ExchangeRateRepository exchangeRateRepositoryMock;
  private ExchangeRateServiceImpl subject;

  @BeforeEach
  void beforeEach() {
    Supplier<EcbExchangeRateFetcher> ecbExchangeRateFetcherSupplier = mock(Supplier.class);
    exchangeRateRepositoryMock = mock(ExchangeRateRepository.class);
    ArithmeticConfig arithmeticConfig = mock(ArithmeticConfig.class);
    when(arithmeticConfig.mathContext()).thenReturn(MATH_CONTEXT);
    subject = new ExchangeRateServiceImpl(ecbExchangeRateFetcherSupplier, exchangeRateRepositoryMock, arithmeticConfig);
  }

  @Test
  void convert_emptyInput_returnsEmptyList_andSkipsRepository() {
    List<BigDecimal> result = subject.convert(List.of(), "EUR", "USD");

    assertThat(result).isEmpty();
    verifyNoInteractions(exchangeRateRepositoryMock);
  }

  @Test
  void convert_sameCurrency_returnsValuesUnchanged_andSkipsRepository() {
    CurrencyConversionRequest request1 = mockRequest(new BigDecimal("100"), LocalDate.of(2024, JANUARY, 10));
    CurrencyConversionRequest request2 = mockRequest(new BigDecimal("50"), LocalDate.of(2024, JANUARY, 11));

    List<BigDecimal> result = subject.convert(List.of(request1, request2), "EUR", "EUR");

    assertThat(result).containsExactly(new BigDecimal("100"), new BigDecimal("50"));
    verifyNoInteractions(exchangeRateRepositoryMock);
  }

  @Test
  void convert_oneInput_directRate_ok() {
    LocalDate requestDate = LocalDate.of(2024, JANUARY, 10);
    CurrencyConversionRequest request = mockRequest(new BigDecimal("100"), requestDate);

    ExchangeRateEntity rate = mockRate("EUR", "USD", requestDate, "1.1");
    when(exchangeRateRepositoryMock.findAllByBaseCurrencyAndTargetCurrencyOrderByDateAsc("EUR", "USD")).thenReturn(List.of(rate));
    when(exchangeRateRepositoryMock.findAllByBaseCurrencyAndTargetCurrencyOrderByDateAsc("USD", "EUR")).thenReturn(List.of());

    List<BigDecimal> result = subject.convert(List.of(request), "EUR", "USD");

    assertThat(result).hasSize(1);
    assertThat(result.getFirst()).isEqualByComparingTo("110.0");
    verify(exchangeRateRepositoryMock, times(1)).findAllByBaseCurrencyAndTargetCurrencyOrderByDateAsc("EUR", "USD");
    verify(exchangeRateRepositoryMock, times(1)).findAllByBaseCurrencyAndTargetCurrencyOrderByDateAsc("USD", "EUR");
  }

  @Test
  void convert_oneInput_indirectRate_ok() {
    // no EUR->USD rate exists, but a USD->EUR rate does - it must be inverted (1 USD = 0.5 EUR, so 1 EUR = 2 USD)
    LocalDate requestDate = LocalDate.of(2024, JANUARY, 10);
    CurrencyConversionRequest request = mockRequest(TEN, requestDate);

    ExchangeRateEntity reverseRate = mockRate("USD", "EUR", requestDate, "0.5");
    when(exchangeRateRepositoryMock.findAllByBaseCurrencyAndTargetCurrencyOrderByDateAsc("EUR", "USD")).thenReturn(List.of());
    when(exchangeRateRepositoryMock.findAllByBaseCurrencyAndTargetCurrencyOrderByDateAsc("USD", "EUR")).thenReturn(List.of(reverseRate));

    List<BigDecimal> result = subject.convert(List.of(request), "EUR", "USD");

    assertThat(result).hasSize(1);
    assertThat(result.getFirst()).isEqualByComparingTo("20");
  }

  @Test
  void convert_oneInput_notFound_throwsNotFoundException() {
    CurrencyConversionRequest request = mockRequest(TEN, LocalDate.of(2024, JANUARY, 10));
    when(exchangeRateRepositoryMock.findAllByBaseCurrencyAndTargetCurrencyOrderByDateAsc("EUR", "USD")).thenReturn(List.of());
    when(exchangeRateRepositoryMock.findAllByBaseCurrencyAndTargetCurrencyOrderByDateAsc("USD", "EUR")).thenReturn(List.of());

    assertThatExceptionOfType(NotFoundException.class).isThrownBy(() -> subject.convert(List.of(request), "EUR", "USD"));
  }

  @Test
  void convert_oneInput_outdated_throwsOutdatedExchangeRateException() {
    LocalDate rateDate = LocalDate.of(2024, JANUARY, 1);
    LocalDate requestDate = LocalDate.of(2024, JANUARY, 20); // 19 days after the rate - older than MAX_AGE (7 days)
    CurrencyConversionRequest request = mockRequest(new BigDecimal("100"), requestDate);

    ExchangeRateEntity rate = mockRate("EUR", "USD", rateDate, "1.2");
    when(exchangeRateRepositoryMock.findAllByBaseCurrencyAndTargetCurrencyOrderByDateAsc("EUR", "USD")).thenReturn(List.of(rate));
    when(exchangeRateRepositoryMock.findAllByBaseCurrencyAndTargetCurrencyOrderByDateAsc("USD", "EUR")).thenReturn(List.of());

    boolean caughtException = false;
    try {
      subject.convert(List.of(request), "EUR", "USD");
    } catch (OutdatedExchangeRateException e) {
      caughtException = true;
      assertThat(e.getDate()).isEqualTo(rateDate);
      assertThat(e.getBaseCurrency()).isEqualTo("EUR");
      assertThat(e.getTargetCurrency()).isEqualTo("USD");
      assertThat(e.getExchangeRate()).isEqualByComparingTo("1.2");
      assertThat(e.getConversionResult()).isEqualByComparingTo("120.0");
    }
    assertThat(caughtException).isTrue();
  }

  @Test
  void convert_tenInputs_ok() {
    List<CurrencyConversionRequest> requests = tenRequests();
    // a distinct rate per date (1, 2, 3, ...) rather than one shared rate - this way the test fails if the
    // implementation ever picks up the wrong item's rate (e.g. always the first/last one) instead of each item's own
    List<ExchangeRateEntity> rates = new ArrayList<>();
    for (int i = 0; i < TEN_DATES.size(); i++) {
      rates.add(mockRate("EUR", "USD", TEN_DATES.get(i), String.valueOf(i + 1)));
    }
    when(exchangeRateRepositoryMock.findAllByBaseCurrencyAndTargetCurrencyOrderByDateAsc("EUR", "USD")).thenReturn(rates);
    when(exchangeRateRepositoryMock.findAllByBaseCurrencyAndTargetCurrencyOrderByDateAsc("USD", "EUR")).thenReturn(List.of());

    List<BigDecimal> results = subject.convert(requests, "EUR", "USD");

    assertThat(results).hasSize(10);
    for (int i = 0; i < TEN_VALUES.size(); i++) {
      assertThat(results.get(i)).isEqualByComparingTo(TEN_VALUES.get(i).multiply(BigDecimal.valueOf(i + 1)));
    }

    // the whole point of batching: one query per direction, not one per item
    verify(exchangeRateRepositoryMock, times(1)).findAllByBaseCurrencyAndTargetCurrencyOrderByDateAsc("EUR", "USD");
    verify(exchangeRateRepositoryMock, times(1)).findAllByBaseCurrencyAndTargetCurrencyOrderByDateAsc("USD", "EUR");
  }

  @Test
  void convert_tenInputs_oneOutdated_throwsOutdatedExchangeRateExceptionForThatItem() {
    List<CurrencyConversionRequest> requests = tenRequests();
    // no rate for index 4 (2024-05-01) - the floor lookup falls back to index 3's rate (2024-04-01), which is
    // 30 days older than the request date and therefore outdated, even though every other item has its own exact match
    List<ExchangeRateEntity> rates = ratesForEveryDateExcept(4, "2");
    when(exchangeRateRepositoryMock.findAllByBaseCurrencyAndTargetCurrencyOrderByDateAsc("EUR", "USD")).thenReturn(rates);
    when(exchangeRateRepositoryMock.findAllByBaseCurrencyAndTargetCurrencyOrderByDateAsc("USD", "EUR")).thenReturn(List.of());

    boolean caughtException = false;
    try {
      subject.convert(requests, "EUR", "USD");
    } catch (OutdatedExchangeRateException e) {
      caughtException = true;
      assertThat(e.getDate()).isEqualTo(TEN_DATES.get(3));
      assertThat(e.getBaseCurrency()).isEqualTo("EUR");
      assertThat(e.getTargetCurrency()).isEqualTo("USD");
      assertThat(e.getExchangeRate()).isEqualByComparingTo("2");
      assertThat(e.getConversionResult()).isEqualByComparingTo(TEN_VALUES.get(4).multiply(new BigDecimal("2")));
    }
    assertThat(caughtException).isTrue();

    verify(exchangeRateRepositoryMock, times(1)).findAllByBaseCurrencyAndTargetCurrencyOrderByDateAsc("EUR", "USD");
    verify(exchangeRateRepositoryMock, times(1)).findAllByBaseCurrencyAndTargetCurrencyOrderByDateAsc("USD", "EUR");
  }

  @Test
  void convert_tenInputs_oneNotFound_throwsNotFoundExceptionForThatItem() {
    List<CurrencyConversionRequest> requests = new ArrayList<>(tenRequests());
    // index 4's own date is older than every available rate (forward and reverse), unlike the "outdated" case there
    // is no fallback candidate for it at all, while every other item still has its own exact match
    requests.set(4, mockRequest(TEN_VALUES.get(4), LocalDate.of(1900, JANUARY, 1)));
    List<ExchangeRateEntity> rates = ratesForEveryDate("2");
    when(exchangeRateRepositoryMock.findAllByBaseCurrencyAndTargetCurrencyOrderByDateAsc("EUR", "USD")).thenReturn(rates);
    when(exchangeRateRepositoryMock.findAllByBaseCurrencyAndTargetCurrencyOrderByDateAsc("USD", "EUR")).thenReturn(List.of());

    assertThatExceptionOfType(NotFoundException.class).isThrownBy(() -> subject.convert(requests, "EUR", "USD"));
    verify(exchangeRateRepositoryMock, times(1)).findAllByBaseCurrencyAndTargetCurrencyOrderByDateAsc("EUR", "USD");
    verify(exchangeRateRepositoryMock, times(1)).findAllByBaseCurrencyAndTargetCurrencyOrderByDateAsc("USD", "EUR");
  }

  @Test
  void convertBestEffort_emptyInput_returnsEmptyList_andSkipsRepository() {
    List<BigDecimal> result = subject.convertBestEffort(List.of(), "EUR", "USD");

    assertThat(result).isEmpty();
    verifyNoInteractions(exchangeRateRepositoryMock);
  }

  @Test
  void convertBestEffort_sameCurrency_returnsValuesUnchanged_andSkipsRepository() {
    CurrencyConversionRequest request = mockRequest(new BigDecimal("100"), LocalDate.of(2024, JANUARY, 10));

    List<BigDecimal> result = subject.convertBestEffort(List.of(request), "EUR", "EUR");

    assertThat(result).containsExactly(new BigDecimal("100"));
    verifyNoInteractions(exchangeRateRepositoryMock);
  }

  @Test
  void convertBestEffort_oneInput_directRate_ok() {
    LocalDate requestDate = LocalDate.of(2024, JANUARY, 10);
    CurrencyConversionRequest request = mockRequest(new BigDecimal("100"), requestDate);

    ExchangeRateEntity rate = mockRate("EUR", "USD", requestDate, "1.1");
    when(exchangeRateRepositoryMock.findAllByBaseCurrencyAndTargetCurrencyOrderByDateAsc("EUR", "USD")).thenReturn(List.of(rate));
    when(exchangeRateRepositoryMock.findAllByBaseCurrencyAndTargetCurrencyOrderByDateAsc("USD", "EUR")).thenReturn(List.of());

    List<BigDecimal> result = subject.convertBestEffort(List.of(request), "EUR", "USD");

    assertThat(result).hasSize(1);
    assertThat(result.getFirst()).isEqualByComparingTo("110.0");
  }

  @Test
  void convertBestEffort_oneInput_indirectRate_ok() {
    // no EUR->USD rate exists, but a USD->EUR rate does - it must be inverted (1 USD = 0.5 EUR, so 1 EUR = 2 USD)
    LocalDate requestDate = LocalDate.of(2024, JANUARY, 10);
    CurrencyConversionRequest request = mockRequest(TEN, requestDate);

    ExchangeRateEntity reverseRate = mockRate("USD", "EUR", requestDate, "0.5");
    when(exchangeRateRepositoryMock.findAllByBaseCurrencyAndTargetCurrencyOrderByDateAsc("EUR", "USD")).thenReturn(List.of());
    when(exchangeRateRepositoryMock.findAllByBaseCurrencyAndTargetCurrencyOrderByDateAsc("USD", "EUR")).thenReturn(List.of(reverseRate));

    List<BigDecimal> result = subject.convertBestEffort(List.of(request), "EUR", "USD");

    assertThat(result).hasSize(1);
    assertThat(result.getFirst()).isEqualByComparingTo("20");
  }

  @Test
  void convertBestEffort_twoInputs_oneNotFound_thatOneIsNullAndTheOtherStillConverts() {
    LocalDate rateDate = LocalDate.of(2024, JANUARY, 15);
    CurrencyConversionRequest notFoundRequest = mockRequest(TEN, rateDate.minusDays(1));
    CurrencyConversionRequest workingRequest = mockRequest(new BigDecimal("50"), rateDate.plusDays(1));

    ExchangeRateEntity rate = mockRate("EUR", "USD", rateDate, "1.1");
    when(exchangeRateRepositoryMock.findAllByBaseCurrencyAndTargetCurrencyOrderByDateAsc("EUR", "USD")).thenReturn(List.of(rate));
    when(exchangeRateRepositoryMock.findAllByBaseCurrencyAndTargetCurrencyOrderByDateAsc("USD", "EUR")).thenReturn(List.of());

    List<BigDecimal> result = subject.convertBestEffort(List.of(notFoundRequest, workingRequest), "EUR", "USD");

    assertThat(result).hasSize(2);
    assertThat(result.get(0)).isNull();
    assertThat(result.get(1)).isEqualByComparingTo("55.0");
  }

  @Test
  void convertBestEffort_twoInputs_oneOutdated_thatOneConvertsAnywayAndTheOtherIsNull() {
    LocalDate rateDate = LocalDate.of(2024, JANUARY, 1);
    CurrencyConversionRequest outdatedRequest = mockRequest(new BigDecimal("100"), rateDate.plusDays(19));
    CurrencyConversionRequest notFoundRequest = mockRequest(TEN, rateDate.minusDays(1));

    ExchangeRateEntity rate = mockRate("EUR", "USD", rateDate, "1.2");
    when(exchangeRateRepositoryMock.findAllByBaseCurrencyAndTargetCurrencyOrderByDateAsc("EUR", "USD")).thenReturn(List.of(rate));
    when(exchangeRateRepositoryMock.findAllByBaseCurrencyAndTargetCurrencyOrderByDateAsc("USD", "EUR")).thenReturn(List.of());

    List<BigDecimal> result = subject.convertBestEffort(List.of(outdatedRequest, notFoundRequest), "EUR", "USD");

    assertThat(result).hasSize(2);
    assertThat(result.get(0)).isEqualByComparingTo("120.0");
    assertThat(result.get(1)).isNull();
  }

  @Test
  void convertBestEffort_tenInputs_oneOutdated_thatOneConvertsAnywayAndOthersAreUnaffected() {
    List<CurrencyConversionRequest> requests = tenRequests();
    // no rate for index 4 (2024-05-01) - the floor lookup falls back to index 3's rate (2024-04-01), outdated for
    // index 4's request date but not for any other item, which each have their own exact match
    List<ExchangeRateEntity> rates = ratesForEveryDateExcept(4, "2");
    when(exchangeRateRepositoryMock.findAllByBaseCurrencyAndTargetCurrencyOrderByDateAsc("EUR", "USD")).thenReturn(rates);
    when(exchangeRateRepositoryMock.findAllByBaseCurrencyAndTargetCurrencyOrderByDateAsc("USD", "EUR")).thenReturn(List.of());

    List<BigDecimal> results = subject.convertBestEffort(requests, "EUR", "USD");

    assertThat(results).hasSize(10);
    for (int i = 0; i < TEN_VALUES.size(); i++) {
      assertThat(results.get(i)).isEqualByComparingTo(TEN_VALUES.get(i).multiply(new BigDecimal("2")));
    }
  }

  @Test
  void convertBestEffort_tenInputs_oneNotFound_thatOneIsNullAndOthersAreUnaffected() {
    List<CurrencyConversionRequest> requests = new ArrayList<>(tenRequests());
    // index 4's own date is older than every available rate (forward and reverse), so unlike the "outdated" case
    // there is no fallback candidate for it at all, while every other item still has its own exact match
    requests.set(4, mockRequest(TEN_VALUES.get(4), LocalDate.of(1900, JANUARY, 1)));
    List<ExchangeRateEntity> rates = ratesForEveryDate("2");
    when(exchangeRateRepositoryMock.findAllByBaseCurrencyAndTargetCurrencyOrderByDateAsc("EUR", "USD")).thenReturn(rates);
    when(exchangeRateRepositoryMock.findAllByBaseCurrencyAndTargetCurrencyOrderByDateAsc("USD", "EUR")).thenReturn(List.of());

    List<BigDecimal> results = subject.convertBestEffort(requests, "EUR", "USD");

    assertThat(results).hasSize(10);
    assertThat(results.get(4)).isNull();
    for (int i = 0; i < TEN_VALUES.size(); i++) {
      if (i != 4) {
        assertThat(results.get(i)).isEqualByComparingTo(TEN_VALUES.get(i).multiply(new BigDecimal("2")));
      }
    }
  }

  private List<CurrencyConversionRequest> tenRequests() {
    List<CurrencyConversionRequest> requests = new ArrayList<>();
    for (int i = 0; i < TEN_DATES.size(); i++) {
      requests.add(mockRequest(TEN_VALUES.get(i), TEN_DATES.get(i)));
    }
    return requests;
  }

  private List<ExchangeRateEntity> ratesForEveryDate(String rate) {
    return ratesForEveryDateExcept(-1, rate);
  }

  private List<ExchangeRateEntity> ratesForEveryDateExcept(int skippedIndex, String rate) {
    List<ExchangeRateEntity> rates = new ArrayList<>();
    for (int i = 0; i < TEN_DATES.size(); i++) {
      if (i != skippedIndex) {
        rates.add(mockRate("EUR", "USD", TEN_DATES.get(i), rate));
      }
    }
    return rates;
  }

  private CurrencyConversionRequest mockRequest(BigDecimal value, LocalDate date) {
    CurrencyConversionRequest request = mock(CurrencyConversionRequest.class);
    when(request.getValue()).thenReturn(value);
    when(request.getDate()).thenReturn(date);
    return request;
  }

  private ExchangeRateEntity mockRate(String baseCurrency, String targetCurrency, LocalDate date, String rate) {
    ExchangeRateEntity entity = mock(ExchangeRateEntity.class);
    when(entity.getBaseCurrency()).thenReturn(baseCurrency);
    when(entity.getTargetCurrency()).thenReturn(targetCurrency);
    when(entity.getDate()).thenReturn(date);
    when(entity.getExchangeRate()).thenReturn(new BigDecimal(rate));
    return entity;
  }
}
