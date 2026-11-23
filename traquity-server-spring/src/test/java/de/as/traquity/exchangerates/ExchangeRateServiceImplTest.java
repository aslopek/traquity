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
import static org.mockito.Mockito.verifyNoMoreInteractions;
import static org.mockito.Mockito.when;

import de.as.traquity.common.config.ArithmeticConfig;
import de.as.traquity.common.error.NotFoundException;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.Month;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
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
  void convert_oneInput_indirectRateOfLaterDay_winsOverDirectRate() {
    LocalDate requestDate = LocalDate.of(2024, JANUARY, 10);
    CurrencyConversionRequest request = mockRequest(TEN, requestDate);

    ExchangeRateEntity directRate = mockRate("EUR", "USD", requestDate.minusDays(3), "1.1");
    ExchangeRateEntity reverseRate = mockRate("USD", "EUR", requestDate, "0.5");
    when(exchangeRateRepositoryMock.findAllByBaseCurrencyAndTargetCurrencyOrderByDateAsc("EUR", "USD")).thenReturn(List.of(directRate));
    when(exchangeRateRepositoryMock.findAllByBaseCurrencyAndTargetCurrencyOrderByDateAsc("USD", "EUR")).thenReturn(List.of(reverseRate));

    List<BigDecimal> result = subject.convert(List.of(request), "EUR", "USD");

    // 1 USD = 0.5 EUR, so 10 EUR = 20 USD
    assertThat(result).hasSize(1);
    assertThat(result.getFirst()).isEqualByComparingTo("20");
  }

  @Test
  void convert_oneInput_directRateOfLaterDay_winsOverIndirectRate() {
    LocalDate requestDate = LocalDate.of(2024, JANUARY, 10);
    CurrencyConversionRequest request = mockRequest(TEN, requestDate);

    ExchangeRateEntity directRate = mockRate("EUR", "USD", requestDate, "1.1");
    ExchangeRateEntity reverseRate = mockRate("USD", "EUR", requestDate.minusDays(3), "0.5");
    when(exchangeRateRepositoryMock.findAllByBaseCurrencyAndTargetCurrencyOrderByDateAsc("EUR", "USD")).thenReturn(List.of(directRate));
    when(exchangeRateRepositoryMock.findAllByBaseCurrencyAndTargetCurrencyOrderByDateAsc("USD", "EUR")).thenReturn(List.of(reverseRate));

    List<BigDecimal> result = subject.convert(List.of(request), "EUR", "USD");

    assertThat(result).hasSize(1);
    assertThat(result.getFirst()).isEqualByComparingTo("11");
  }

  @Test
  void convert_oneInput_directAndIndirectRateOfSameDay_directRateTaken() {
    LocalDate requestDate = LocalDate.of(2024, JANUARY, 10);
    CurrencyConversionRequest request = mockRequest(TEN, requestDate);

    ExchangeRateEntity directRate = mockRate("EUR", "USD", requestDate, "1.1");
    ExchangeRateEntity reverseRate = mockRate("USD", "EUR", requestDate, "0.5");
    when(exchangeRateRepositoryMock.findAllByBaseCurrencyAndTargetCurrencyOrderByDateAsc("EUR", "USD")).thenReturn(List.of(directRate));
    when(exchangeRateRepositoryMock.findAllByBaseCurrencyAndTargetCurrencyOrderByDateAsc("USD", "EUR")).thenReturn(List.of(reverseRate));

    List<BigDecimal> result = subject.convert(List.of(request), "EUR", "USD");

    assertThat(result).hasSize(1);
    assertThat(result.getFirst()).isEqualByComparingTo("11");
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
    verifyNoMoreInteractions(exchangeRateRepositoryMock);
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
  void convert_oneInput_pairIntoEur_loadsNoRatesThroughEur() {
    LocalDate requestDate = LocalDate.of(2024, JANUARY, 10);
    CurrencyConversionRequest request = mockRequest(TEN, requestDate);

    ExchangeRateEntity reverseRate = mockRate("EUR", "USD", requestDate, "2");
    when(exchangeRateRepositoryMock.findAllByBaseCurrencyAndTargetCurrencyOrderByDateAsc("EUR", "USD")).thenReturn(List.of(reverseRate));

    List<BigDecimal> result = subject.convert(List.of(request), "USD", "EUR");

    assertThat(result).hasSize(1);
    assertThat(result.getFirst()).isEqualByComparingTo("5");
    verify(exchangeRateRepositoryMock, times(1)).findAllByBaseCurrencyAndTargetCurrencyOrderByDateAsc("USD", "EUR");
    verify(exchangeRateRepositoryMock, times(1)).findAllByBaseCurrencyAndTargetCurrencyOrderByDateAsc("EUR", "USD");
    verifyNoMoreInteractions(exchangeRateRepositoryMock);
  }

  @Test
  void convert_oneInput_throughEur_ratesOfItsDate_ok() {
    LocalDate requestDate = LocalDate.of(2024, JANUARY, 10);
    CurrencyConversionRequest request = mockRequest(TEN, requestDate);

    mockRatesFromEur("GBP", mockRate("EUR", "GBP", requestDate, "0.8"));
    mockRatesFromEur("USD", mockRate("EUR", "USD", requestDate, "1.2"));

    List<BigDecimal> result = subject.convert(List.of(request), "GBP", "USD");

    // 10 GBP = 12.5 EUR = 15 USD
    assertThat(result).hasSize(1);
    assertThat(result.getFirst()).isEqualByComparingTo("15");
  }

  @Test
  void convert_oneInput_throughEur_oneRateMissingOnItsDate_ratesOfLatestEarlierDateWithBoth() {
    LocalDate requestDate = LocalDate.of(2024, JANUARY, 10);
    CurrencyConversionRequest request = mockRequest(TEN, requestDate);

    // both currencies have rates after requestDate - 3, but never on the same day
    mockRatesFromEur("GBP",
        mockRate("EUR", "GBP", requestDate.minusDays(3), "0.8"),
        mockRate("EUR", "GBP", requestDate.minusDays(1), "0.4"));
    mockRatesFromEur("USD",
        mockRate("EUR", "USD", requestDate.minusDays(3), "1.2"),
        mockRate("EUR", "USD", requestDate.minusDays(2), "2.4"),
        mockRate("EUR", "USD", requestDate, "3.6"));

    List<BigDecimal> result = subject.convert(List.of(request), "GBP", "USD");

    assertThat(result).hasSize(1);
    assertThat(result.getFirst()).isEqualByComparingTo("15");
  }

  @Test
  void convert_oneInput_throughEur_ratesOnlyOnDifferentDates_throwsNotFoundException() {
    LocalDate requestDate = LocalDate.of(2024, JANUARY, 10);
    CurrencyConversionRequest request = mockRequest(TEN, requestDate);

    mockRatesFromEur("GBP", mockRate("EUR", "GBP", requestDate.minusDays(2), "0.8"));
    mockRatesFromEur("USD", mockRate("EUR", "USD", requestDate.minusDays(1), "1.2"));

    assertThatExceptionOfType(NotFoundException.class).isThrownBy(() -> subject.convert(List.of(request), "GBP", "USD"));
  }

  @Test
  void convert_oneInput_throughEur_outdated_throwsOutdatedExchangeRateException() {
    LocalDate rateDate = LocalDate.of(2024, JANUARY, 1);
    LocalDate requestDate = LocalDate.of(2024, JANUARY, 20); // 19 days after the rates - older than MAX_AGE (7 days)
    CurrencyConversionRequest request = mockRequest(TEN, requestDate);

    mockRatesFromEur("GBP", mockRate("EUR", "GBP", rateDate, "0.8"));
    mockRatesFromEur("USD", mockRate("EUR", "USD", rateDate, "1.2"));

    boolean caughtException = false;
    try {
      subject.convert(List.of(request), "GBP", "USD");
    } catch (OutdatedExchangeRateException e) {
      caughtException = true;
      assertThat(e.getDate()).isEqualTo(rateDate);
      assertThat(e.getBaseCurrency()).isEqualTo("GBP");
      assertThat(e.getTargetCurrency()).isEqualTo("USD");
      assertThat(e.getExchangeRate()).isEqualByComparingTo("1.5");
      assertThat(e.getConversionResult()).isEqualByComparingTo("15");
    }
    assertThat(caughtException).isTrue();
  }

  @Test
  void convert_oneInput_directRateOfSameDay_winsOverRateThroughEur() {
    LocalDate requestDate = LocalDate.of(2024, JANUARY, 10);
    CurrencyConversionRequest request = mockRequest(TEN, requestDate);

    ExchangeRateEntity directRate = mockRate("GBP", "USD", requestDate, "2");
    when(exchangeRateRepositoryMock.findAllByBaseCurrencyAndTargetCurrencyOrderByDateAsc("GBP", "USD")).thenReturn(List.of(directRate));
    mockRatesFromEur("GBP", mockRate("EUR", "GBP", requestDate, "0.8"));
    mockRatesFromEur("USD", mockRate("EUR", "USD", requestDate, "1.2"));

    List<BigDecimal> result = subject.convert(List.of(request), "GBP", "USD");

    assertThat(result).hasSize(1);
    assertThat(result.getFirst()).isEqualByComparingTo("20");
  }

  @Test
  void convert_oneInput_indirectRateOfSameDay_winsOverRateThroughEur() {
    LocalDate requestDate = LocalDate.of(2024, JANUARY, 10);
    CurrencyConversionRequest request = mockRequest(TEN, requestDate);

    ExchangeRateEntity reverseRate = mockRate("USD", "GBP", requestDate, "0.25");
    when(exchangeRateRepositoryMock.findAllByBaseCurrencyAndTargetCurrencyOrderByDateAsc("USD", "GBP")).thenReturn(List.of(reverseRate));
    mockRatesFromEur("GBP", mockRate("EUR", "GBP", requestDate, "0.8"));
    mockRatesFromEur("USD", mockRate("EUR", "USD", requestDate, "1.2"));

    List<BigDecimal> result = subject.convert(List.of(request), "GBP", "USD");

    // 1 USD = 0.25 GBP, so 10 GBP = 40 USD
    assertThat(result).hasSize(1);
    assertThat(result.getFirst()).isEqualByComparingTo("40");
  }

  @Test
  void convert_oneInput_rateThroughEurOfLaterDay_winsOverDirectRate() {
    LocalDate requestDate = LocalDate.of(2024, JANUARY, 10);
    CurrencyConversionRequest request = mockRequest(TEN, requestDate);

    ExchangeRateEntity directRate = mockRate("GBP", "USD", requestDate.minusDays(3), "2");
    when(exchangeRateRepositoryMock.findAllByBaseCurrencyAndTargetCurrencyOrderByDateAsc("GBP", "USD")).thenReturn(List.of(directRate));
    mockRatesFromEur("GBP", mockRate("EUR", "GBP", requestDate, "0.8"));
    mockRatesFromEur("USD", mockRate("EUR", "USD", requestDate, "1.2"));

    List<BigDecimal> result = subject.convert(List.of(request), "GBP", "USD");

    assertThat(result).hasSize(1);
    assertThat(result.getFirst()).isEqualByComparingTo("15");
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
  void convertBestEffort_oneInput_indirectRateOfLaterDay_winsOverDirectRate() {
    LocalDate requestDate = LocalDate.of(2024, JANUARY, 10);
    CurrencyConversionRequest request = mockRequest(TEN, requestDate);

    ExchangeRateEntity directRate = mockRate("EUR", "USD", requestDate.minusDays(30), "1.1");
    ExchangeRateEntity reverseRate = mockRate("USD", "EUR", requestDate.minusDays(1), "0.5");
    when(exchangeRateRepositoryMock.findAllByBaseCurrencyAndTargetCurrencyOrderByDateAsc("EUR", "USD")).thenReturn(List.of(directRate));
    when(exchangeRateRepositoryMock.findAllByBaseCurrencyAndTargetCurrencyOrderByDateAsc("USD", "EUR")).thenReturn(List.of(reverseRate));

    List<BigDecimal> result = subject.convertBestEffort(List.of(request), "EUR", "USD");

    // 1 USD = 0.5 EUR, so 10 EUR = 20 USD
    assertThat(result).hasSize(1);
    assertThat(result.getFirst()).isEqualByComparingTo("20");
  }

  @Test
  void convertBestEffort_oneInput_directRateOfLaterDay_winsOverIndirectRate() {
    LocalDate requestDate = LocalDate.of(2024, JANUARY, 10);
    CurrencyConversionRequest request = mockRequest(TEN, requestDate);

    ExchangeRateEntity directRate = mockRate("EUR", "USD", requestDate.minusDays(1), "1.1");
    ExchangeRateEntity reverseRate = mockRate("USD", "EUR", requestDate.minusDays(30), "0.5");
    when(exchangeRateRepositoryMock.findAllByBaseCurrencyAndTargetCurrencyOrderByDateAsc("EUR", "USD")).thenReturn(List.of(directRate));
    when(exchangeRateRepositoryMock.findAllByBaseCurrencyAndTargetCurrencyOrderByDateAsc("USD", "EUR")).thenReturn(List.of(reverseRate));

    List<BigDecimal> result = subject.convertBestEffort(List.of(request), "EUR", "USD");

    assertThat(result).hasSize(1);
    assertThat(result.getFirst()).isEqualByComparingTo("11");
  }

  @Test
  void convertBestEffort_oneInput_directAndIndirectRateOfSameDay_directRateTaken() {
    LocalDate requestDate = LocalDate.of(2024, JANUARY, 10);
    CurrencyConversionRequest request = mockRequest(TEN, requestDate);

    ExchangeRateEntity directRate = mockRate("EUR", "USD", requestDate.minusDays(1), "1.1");
    ExchangeRateEntity reverseRate = mockRate("USD", "EUR", requestDate.minusDays(1), "0.5");
    when(exchangeRateRepositoryMock.findAllByBaseCurrencyAndTargetCurrencyOrderByDateAsc("EUR", "USD")).thenReturn(List.of(directRate));
    when(exchangeRateRepositoryMock.findAllByBaseCurrencyAndTargetCurrencyOrderByDateAsc("USD", "EUR")).thenReturn(List.of(reverseRate));

    List<BigDecimal> result = subject.convertBestEffort(List.of(request), "EUR", "USD");

    assertThat(result).hasSize(1);
    assertThat(result.getFirst()).isEqualByComparingTo("11");
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

  @Test
  void convertBestEffort_threeInputs_throughEur_ratesOfItsDate_ofLatestEarlierDateWithBoth_none() {
    LocalDate rateDate = LocalDate.of(2024, JANUARY, 10);
    CurrencyConversionRequest sameDayRequest = mockRequest(TEN, rateDate);
    CurrencyConversionRequest laterDayRequest = mockRequest(new BigDecimal("20"), rateDate.plusDays(1));
    CurrencyConversionRequest earlierDayRequest = mockRequest(TEN, rateDate.minusDays(1));

    // on rateDate + 1 only GBP has a rate, so that day takes the rates of rateDate
    mockRatesFromEur("GBP", mockRate("EUR", "GBP", rateDate, "0.8"), mockRate("EUR", "GBP", rateDate.plusDays(1), "0.4"));
    mockRatesFromEur("USD", mockRate("EUR", "USD", rateDate, "1.2"));

    List<BigDecimal> result =
        subject.convertBestEffort(List.of(sameDayRequest, laterDayRequest, earlierDayRequest), "GBP", "USD");

    assertThat(result).hasSize(3);
    assertThat(result.get(0)).isEqualByComparingTo("15");
    assertThat(result.get(1)).isEqualByComparingTo("30");
    assertThat(result.get(2)).isNull();

    // one query per currency pair, not one per item
    verify(exchangeRateRepositoryMock, times(1)).findAllByBaseCurrencyAndTargetCurrencyOrderByDateAsc("GBP", "USD");
    verify(exchangeRateRepositoryMock, times(1)).findAllByBaseCurrencyAndTargetCurrencyOrderByDateAsc("USD", "GBP");
    verify(exchangeRateRepositoryMock, times(1)).findAllByBaseCurrencyAndTargetCurrencyOrderByDateAsc("EUR", "GBP");
    verify(exchangeRateRepositoryMock, times(1)).findAllByBaseCurrencyAndTargetCurrencyOrderByDateAsc("EUR", "USD");
    verifyNoMoreInteractions(exchangeRateRepositoryMock);
  }

  @Test
  void getEarliestConversionDate_onlyForwardRates_returnsDateOfEarliestForwardRate() {
    LocalDate earliest = LocalDate.of(2024, JANUARY, 5);
    mockEarliestRates(mockRate("EUR", "USD", earliest, "1.1"), null);

    assertThat(subject.getEarliestConversionDate("EUR", "USD")).isEqualTo(earliest);
  }

  @Test
  void getEarliestConversionDate_onlyReverseRates_returnsDateOfEarliestReverseRate() {
    LocalDate earliest = LocalDate.of(2024, JANUARY, 7);
    mockEarliestRates(null, mockRate("USD", "EUR", earliest, "0.9"));

    assertThat(subject.getEarliestConversionDate("EUR", "USD")).isEqualTo(earliest);
  }

  @Test
  void getEarliestConversionDate_forwardRatesStartEarlier_returnsForwardDate() {
    LocalDate forwardDate = LocalDate.of(2024, JANUARY, 5);
    mockEarliestRates(
        mockRate("EUR", "USD", forwardDate, "1.1"),
        mockRate("USD", "EUR", forwardDate.plusDays(3), "0.9"));

    assertThat(subject.getEarliestConversionDate("EUR", "USD")).isEqualTo(forwardDate);
  }

  @Test
  void getEarliestConversionDate_reverseRatesStartEarlier_returnsReverseDate() {
    LocalDate reverseDate = LocalDate.of(2024, JANUARY, 5);
    mockEarliestRates(
        mockRate("EUR", "USD", reverseDate.plusDays(3), "1.1"),
        mockRate("USD", "EUR", reverseDate, "0.9"));

    assertThat(subject.getEarliestConversionDate("EUR", "USD")).isEqualTo(reverseDate);
  }

  @Test
  void getEarliestConversionDate_noRatesInEitherDirection_throwsNotFoundException() {
    mockEarliestRates(null, null);

    assertThatExceptionOfType(NotFoundException.class).isThrownBy(() -> subject.getEarliestConversionDate("EUR", "USD"));
  }

  @Test
  void getEarliestConversionDate_throughEur_returnsFirstDateWithBothRates() {
    LocalDate firstCommonDate = LocalDate.of(2024, JANUARY, 7);
    mockRatesFromEur("GBP",
        mockRate("EUR", "GBP", firstCommonDate.minusDays(2), "0.8"),
        mockRate("EUR", "GBP", firstCommonDate, "0.8"));
    mockRatesFromEur("USD",
        mockRate("EUR", "USD", firstCommonDate.minusDays(1), "1.2"),
        mockRate("EUR", "USD", firstCommonDate, "1.2"));

    assertThat(subject.getEarliestConversionDate("GBP", "USD")).isEqualTo(firstCommonDate);
  }

  @Test
  void getEarliestConversionDate_throughEur_ratesOnlyOnDifferentDates_throwsNotFoundException() {
    LocalDate date = LocalDate.of(2024, JANUARY, 7);
    mockRatesFromEur("GBP", mockRate("EUR", "GBP", date, "0.8"));
    mockRatesFromEur("USD", mockRate("EUR", "USD", date.plusDays(1), "1.2"));

    assertThatExceptionOfType(NotFoundException.class).isThrownBy(() -> subject.getEarliestConversionDate("GBP", "USD"));
  }

  private void mockRatesFromEur(String currency, ExchangeRateEntity... rates) {
    when(exchangeRateRepositoryMock.findAllByBaseCurrencyAndTargetCurrencyOrderByDateAsc("EUR", currency)).thenReturn(List.of(rates));
  }

  private void mockEarliestRates(ExchangeRateEntity forward, ExchangeRateEntity reverse) {
    when(exchangeRateRepositoryMock.findFirstByBaseCurrencyAndTargetCurrencyOrderByDateAsc("EUR", "USD"))
        .thenReturn(Optional.ofNullable(forward));
    when(exchangeRateRepositoryMock.findFirstByBaseCurrencyAndTargetCurrencyOrderByDateAsc("USD", "EUR"))
        .thenReturn(Optional.ofNullable(reverse));
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
