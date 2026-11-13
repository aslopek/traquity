package de.as.traquity.common.arithmetic;

import static de.as.traquity.common.config.TimeConfig.DAYS_PER_YEAR;
import static java.math.BigDecimal.ONE;
import static java.math.BigDecimal.ZERO;

import de.as.traquity.common.error.BadRequestException;
import java.math.BigDecimal;
import java.math.MathContext;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import lombok.experimental.UtilityClass;

@UtilityClass
public class MathFunctions {

  /**
   * Returns {@code numerator / denominator}, or zero if {@code denominator} is zero.
   */
  public static BigDecimal shareOf(BigDecimal numerator, BigDecimal denominator, MathContext mathContext) {
    if (denominator.signum() == 0) {
      return ZERO;
    }
    return numerator.divide(denominator, mathContext);
  }

  public static BigDecimal pow(BigDecimal base, BigDecimal exponent, MathContext mathContext) throws ArithmeticException,
      IllegalArgumentException {
    if (base == null || exponent == null || mathContext == null) {
      throw new IllegalArgumentException();
    }

    if (base.compareTo(ZERO) <= 0) {
      throw new ArithmeticException();
    }

    double power = Math.pow(base.doubleValue(), exponent.doubleValue());
    return new BigDecimal(power, mathContext);
  }

  public static BigDecimal cagr(BigDecimal startValue, LocalDate startDate, BigDecimal endValue, LocalDate endDate, MathContext mathContext)
      throws ArithmeticException, BadRequestException {
    if (startValue == null || endValue == null || startDate == null || endDate == null) {
      throw new BadRequestException();
    }

    BigDecimal growthFactor = endValue.divide(startValue, mathContext);
    return cagr(growthFactor, startDate, endDate, mathContext);
  }

  public static BigDecimal cagr(BigDecimal growthFactor, LocalDate startDate, LocalDate endDate, MathContext mathContext)
      throws ArithmeticException, BadRequestException {
    if (growthFactor == null || startDate == null || endDate == null) {
      throw new BadRequestException();
    }

    final long days = ChronoUnit.DAYS.between(startDate, endDate);
    if (days <= 0 || growthFactor.compareTo(ZERO) <= 0) {
      return ONE.negate();
    }

    BigDecimal years = new BigDecimal(days).divide(DAYS_PER_YEAR, mathContext);
    BigDecimal exponent = ONE.divide(years, mathContext);
    BigDecimal cagr = pow(growthFactor, exponent, mathContext);
    return cagr.subtract(ONE, mathContext);
  }
}
