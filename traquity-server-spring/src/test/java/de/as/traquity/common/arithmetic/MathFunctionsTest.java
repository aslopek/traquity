package de.as.traquity.common.arithmetic;

import static de.as.traquity.common.arithmetic.MathFunctions.shareOf;
import static integration.Arithmetic.MATH_CONTEXT;
import static java.math.BigDecimal.ZERO;
import static java.math.RoundingMode.HALF_UP;
import static org.assertj.core.api.Assertions.assertThat;

import java.math.BigDecimal;
import java.math.MathContext;
import org.junit.jupiter.api.Test;

class MathFunctionsTest {

  @Test
  void shareOf_divides() {
    assertThat(shareOf(new BigDecimal("5208.96"), new BigDecimal("100"), MATH_CONTEXT)).isEqualByComparingTo("52.0896");
  }

  @Test
  void shareOf_negativeNumerator_negativeResult() {
    assertThat(shareOf(new BigDecimal("-11.8"), new BigDecimal("100"), MATH_CONTEXT)).isEqualByComparingTo("-0.118");
  }

  @Test
  void shareOf_roundsWithMathContext() {
    MathContext twoDigits = new MathContext(2, HALF_UP);
    assertThat(shareOf(new BigDecimal("2"), new BigDecimal("3"), twoDigits)).isEqualTo(new BigDecimal("0.67"));
  }

  @Test
  void shareOf_numeratorZero_zero() {
    assertThat(shareOf(ZERO, new BigDecimal("100"), MATH_CONTEXT)).isEqualByComparingTo("0");
  }

  @Test
  void shareOf_denominatorZero_zero() {
    assertThat(shareOf(new BigDecimal("5070.4"), ZERO, MATH_CONTEXT)).isEqualTo(ZERO);
  }

  @Test
  void shareOf_denominatorZeroWithScale_zero() {
    assertThat(shareOf(new BigDecimal("5070.4"), new BigDecimal("0.00"), MATH_CONTEXT)).isEqualTo(ZERO);
  }

  @Test
  void shareOf_numeratorAndDenominatorZero_zero() {
    assertThat(shareOf(ZERO, ZERO, MATH_CONTEXT)).isEqualTo(ZERO);
  }
}
