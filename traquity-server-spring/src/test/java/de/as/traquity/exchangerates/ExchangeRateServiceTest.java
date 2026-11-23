package de.as.traquity.exchangerates;

import static integration.Accuracy.ACCURACY_ONE_THOUSANDTH;
import static integration.Arithmetic.MATH_CONTEXT;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatExceptionOfType;

import de.as.traquity.common.error.NotFoundException;
import integration.IntegrationTest;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.Month;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;

@IntegrationTest
class ExchangeRateServiceTest {

  @Autowired
  private ExchangeRateService subject;

  @Test
  void convertCurrency_directExchangeRate_sameDate() {
    BigDecimal eur = new BigDecimal("1000");
    BigDecimal expectedUsd = new BigDecimal("1077.1");
    BigDecimal usd = convert(eur, "EUR", "USD", LocalDate.of(2023, Month.DECEMBER, 7));
    assertThat(usd).isEqualByComparingTo(expectedUsd);
  }

  @Test
  void convertCurrency_invertedExchangeRate_sameDay() {
    BigDecimal usd = new BigDecimal("1000");
    BigDecimal expectedEur = new BigDecimal("928.4189");
    BigDecimal eur = convert(usd, "USD", "EUR", LocalDate.of(2023, Month.DECEMBER, 7));
    assertThat(eur).isCloseTo(expectedEur, ACCURACY_ONE_THOUSANDTH);
  }

  @Test
  void convertCurrency_directExchangeRate_daysBefore() {
    BigDecimal eur = new BigDecimal("1000");
    BigDecimal expectedUsd = new BigDecimal("1077.7");
    BigDecimal usd;

    for (int i = 9; i <= 15; i++) {
      usd = convert(eur, "EUR", "USD", LocalDate.of(2023, Month.DECEMBER, i));
      assertThat(usd).isEqualByComparingTo(expectedUsd);
    }
  }

  @Test
  void convertCurrency_indirectExchangeRate_daysBefore() {
    BigDecimal usd = new BigDecimal("1000");
    BigDecimal expectedEur = new BigDecimal("927.90201");
    BigDecimal eur;

    for (int i = 9; i <= 15; i++) {
      eur = convert(usd, "USD", "EUR", LocalDate.of(2023, Month.DECEMBER, i));
      assertThat(eur).isCloseTo(expectedEur, ACCURACY_ONE_THOUSANDTH);
    }
  }

  @Test
  void convertCurrency_directExchangeRate_outdated() {
    BigDecimal eur = new BigDecimal("1000");
    BigDecimal expectedUsd = new BigDecimal("1077.7");
    boolean caughtException = false;

    try {
      convert(eur, "EUR", "USD", LocalDate.of(2023, Month.DECEMBER, 16));
    } catch (OutdatedExchangeRateException e) {
      caughtException = true;
      assertThat(e.getDate()).isEqualTo(LocalDate.of(2023, Month.DECEMBER, 8));
      assertThat(e.getBaseCurrency()).isEqualTo("EUR");
      assertThat(e.getTargetCurrency()).isEqualTo("USD");
      assertThat(e.getExchangeRate()).isEqualByComparingTo(new BigDecimal("1.0777"));
      assertThat(e.getConversionResult()).isEqualByComparingTo(expectedUsd);
    }

    assertThat(caughtException).isTrue();
  }

  @Test
  void convertCurrency_indirectExchangeRate_outdated() {
    BigDecimal usd = new BigDecimal("1000");
    BigDecimal expectedEur = new BigDecimal("927.90201");
    boolean caughtException = false;

    try {
      convert(usd, "USD", "EUR", LocalDate.of(2023, Month.DECEMBER, 16));
    } catch (OutdatedExchangeRateException e) {
      caughtException = true;
      assertThat(e.getDate()).isEqualTo(LocalDate.of(2023, Month.DECEMBER, 8));
      // exception should contain base/target currency from the database entry that was actually used for calculation
      assertThat(e.getBaseCurrency()).isEqualTo("EUR");
      assertThat(e.getTargetCurrency()).isEqualTo("USD");
      assertThat(e.getExchangeRate()).isEqualByComparingTo(new BigDecimal("1.0777"));
      assertThat(e.getConversionResult()).isCloseTo(expectedEur, ACCURACY_ONE_THOUSANDTH);
    }

    assertThat(caughtException).isTrue();
  }

  @Test
  void convertCurrency_throughEur_sameDay() {
    BigDecimal gbp = new BigDecimal("1000");
    BigDecimal expectedUsd = new BigDecimal("1256.09329"); // 1000 GBP / 0.8575 EUR/GBP * 1.0771 EUR/USD
    BigDecimal usd = convert(gbp, "GBP", "USD", LocalDate.of(2023, Month.DECEMBER, 7));
    assertThat(usd).isCloseTo(expectedUsd, ACCURACY_ONE_THOUSANDTH);
  }

  @Test
  void convertCurrency_throughEur_daysBefore() {
    BigDecimal gbp = new BigDecimal("1000");
    BigDecimal expectedUsd = new BigDecimal("1257.67301"); // 1000 GBP / 0.8569 EUR/GBP * 1.0777 EUR/USD of 2023-12-08
    BigDecimal usd;

    for (int i = 9; i <= 15; i++) {
      usd = convert(gbp, "GBP", "USD", LocalDate.of(2023, Month.DECEMBER, i));
      assertThat(usd).isCloseTo(expectedUsd, ACCURACY_ONE_THOUSANDTH);
    }
  }

  @Test
  void convertCurrency_throughEur_outdated() {
    BigDecimal gbp = new BigDecimal("1000");
    BigDecimal expectedUsd = new BigDecimal("1257.67301");
    boolean caughtException = false;

    try {
      convert(gbp, "GBP", "USD", LocalDate.of(2023, Month.DECEMBER, 16));
    } catch (OutdatedExchangeRateException e) {
      caughtException = true;
      assertThat(e.getDate()).isEqualTo(LocalDate.of(2023, Month.DECEMBER, 8));
      assertThat(e.getBaseCurrency()).isEqualTo("GBP");
      assertThat(e.getTargetCurrency()).isEqualTo("USD");
      assertThat(e.getExchangeRate()).isEqualByComparingTo(new BigDecimal("1.0777").divide(new BigDecimal("0.8569"), MATH_CONTEXT));
      assertThat(e.getConversionResult()).isCloseTo(expectedUsd, ACCURACY_ONE_THOUSANDTH);
    }

    assertThat(caughtException).isTrue();
  }

  @Test
  void convertCurrency_noPreviousExchangeRateAvailable() {
    assertThatExceptionOfType(NotFoundException.class).isThrownBy(
        () -> convert(BigDecimal.ONE, "EUR", "USD", LocalDate.of(2023, Month.NOVEMBER, 28)));
  }

  @Test
  void convertCurrency_noExchangeRateAvailableAtAll() {
    assertThatExceptionOfType(NotFoundException.class).isThrownBy(
        () -> convert(BigDecimal.ONE, "EUR", "XYZ", LocalDate.of(2023, Month.DECEMBER, 7)));
  }

  private BigDecimal convert(BigDecimal value, String baseCurrency, String targetCurrency, LocalDate date) {
    CurrencyConversionRequest request = new CurrencyConversionRequest(value, date);
    return subject.convert(List.of(request), baseCurrency, targetCurrency).getFirst();
  }
}
