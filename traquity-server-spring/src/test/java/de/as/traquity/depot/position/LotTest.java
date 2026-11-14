package de.as.traquity.depot.position;

import static de.as.traquity.depot.transaction.api.model.TransactionTypeDto.BUY;
import static de.as.traquity.depot.transaction.api.model.TransactionTypeDto.DIVIDEND;
import static de.as.traquity.depot.transaction.api.model.TransactionTypeDto.SELL;
import static de.as.traquity.depot.transaction.api.model.TransactionTypeDto.TAX;
import static integration.Accuracy.ACCURACY_ONE_THOUSANDTH;
import static integration.Arithmetic.MATH_CONTEXT;
import static java.math.BigDecimal.ONE;
import static java.math.BigDecimal.ZERO;
import static java.time.Month.APRIL;
import static java.time.Month.DECEMBER;
import static java.time.Month.JANUARY;
import static java.time.Month.JUNE;
import static java.time.Month.NOVEMBER;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatExceptionOfType;
import static org.assertj.core.data.Percentage.withPercentage;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import de.as.traquity.depot.transaction.Transaction;
import de.as.traquity.depot.transaction.api.model.TransactionTypeDto;
import java.math.BigDecimal;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.ZoneId;
import java.util.LinkedList;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

class LotTest {

  private Clock clock;
  private Transaction transaction;
  private List<Lot> lots;

  @BeforeEach
  void beforeEach() {
    clock = mock(Clock.class);
    when(clock.instant()).thenReturn(Instant.parse("2024-01-01T16:37:08Z"));
    when(clock.getZone()).thenReturn(ZoneId.of("Europe/Berlin"));

    transaction = mock(Transaction.class);
    when(transaction.getId()).thenReturn(1L);
    when(transaction.getVersion()).thenReturn(0L);
    when(transaction.getDate()).thenReturn(LocalDate.of(2023, DECEMBER, 18));
    when(transaction.getTime()).thenReturn(LocalTime.of(23, 55, 43));
    when(transaction.getDepotId()).thenReturn(2L);
    when(transaction.getSecurityId()).thenReturn(3L);
    when(transaction.getTransactionType()).thenReturn(BUY);
    when(transaction.getCountForArithmeticOperations()).thenReturn(new BigDecimal("1.234"));
    when(transaction.getTax()).thenReturn(ZERO);
    when(transaction.getFee()).thenReturn(new BigDecimal("0.99"));

    // lot sizes (count): 10 - 9.5 - 8.6
    // lot sizes (buy in): 1500.28 - 1348.03 - 2100
    lots = new LinkedList<>();
    lots.add(Lot.builder()
        .depotId(1)
        .securityId(2)
        .date(LocalDate.of(2022, NOVEMBER, 24))
        .time(LocalTime.of(15, 28, 0))
        .count(new BigDecimal("10"))
        .buyInAbsolute(new BigDecimal("1500.28"))
        .fee(new BigDecimal("10"))
        .tax(new BigDecimal("5"))
        .build());
    lots.add(Lot.builder()
        .depotId(1)
        .securityId(2)
        .date(LocalDate.of(2023, APRIL, 5))
        .time(LocalTime.of(10, 7, 26))
        .holdingPeriodInDays(0)
        .count(new BigDecimal("9.5"))
        .buyInAbsolute(new BigDecimal("1348.03"))
        .fee(new BigDecimal("10"))
        .tax(new BigDecimal("5"))
        .build());
    lots.add(Lot.builder()
        .depotId(1)
        .securityId(2)
        .date(LocalDate.of(2023, JUNE, 12))
        .time(LocalTime.of(9, 36, 10))
        .holdingPeriodInDays(0)
        .count(new BigDecimal("8.6"))
        .buyInAbsolute(new BigDecimal("2100"))
        .fee(new BigDecimal("10"))
        .tax(new BigDecimal("5"))
        .build());
  }

  @Test
  void initialization_bigDecimalsAreZero() {
    Lot lot = Lot.builder().build();
    assertThat(lot.getCount()).isZero();
    assertThat(lot.getBuyInAbsolute()).isZero();
    assertThat(lot.getFee()).isZero();
    assertThat(lot.getTax()).isZero();
    assertThat(lot.getCurrentSizeAbsolute()).isZero();
    assertThat(lot.getPerformanceAbsolute()).isZero();
    assertThat(lot.getPerformanceRelative()).isZero();
    assertThat(lot.getCagr()).isZero();
  }

  @Test
  void add_addFirstLotToEmptyList() {
    lots = new LinkedList<>();
    Lot.add(lots, transaction, clock);
    assertThat(lots).hasSize(1);
    Lot lot = lots.getFirst();
    assertThat(lot.getDepotId()).isEqualTo(transaction.getDepotId());
    assertThat(lot.getSecurityId()).isEqualTo(transaction.getSecurityId());
    assertThat(lot.getDate()).isEqualTo(transaction.getDate());
    assertThat(lot.getTime()).isEqualTo(transaction.getTime());
    assertThat(lot.getHoldingPeriodInDays()).isEqualTo(14);
    assertThat(lot.getCount()).isEqualTo(transaction.getCountForArithmeticOperations());
    assertThat(lot.getBuyInAbsolute()).isEqualTo(transaction.getGrossValue());
    assertThat(lot.getFee()).isEqualTo(transaction.getFee());
    assertThat(lot.getTax()).isEqualTo(transaction.getTax());
    assertThat(lot.getCurrentSizeAbsolute()).isZero();
    assertThat(lot.getPerformanceAbsolute()).isZero();
    assertThat(lot.getPerformanceRelative()).isZero();
  }

  @Test
  void add_addLotToNonemptyList() {
    Lot.add(lots, transaction, clock);

    assertThat(lots).hasSize(4);

    // does not change first three lots
    assertThat(lots.getFirst().getCount()).isEqualByComparingTo("10");
    assertThat(lots.get(1).getCount()).isEqualByComparingTo("9.5");
    assertThat(lots.get(2).getCount()).isEqualByComparingTo("8.6");

    // adds the new lot
    Lot lot = lots.get(3);
    assertThat(lot.getDepotId()).isEqualTo(transaction.getDepotId());
    assertThat(lot.getSecurityId()).isEqualTo(transaction.getSecurityId());
    assertThat(lot.getDate()).isEqualTo(transaction.getDate());
    assertThat(lot.getTime()).isEqualTo(transaction.getTime());
    assertThat(lot.getHoldingPeriodInDays()).isEqualTo(14);
    assertThat(lot.getCount()).isEqualTo(transaction.getCountForArithmeticOperations());
    assertThat(lot.getBuyInAbsolute()).isEqualTo(transaction.getGrossValue());
    assertThat(lot.getFee()).isEqualTo(transaction.getFee());
    assertThat(lot.getTax()).isEqualTo(transaction.getTax());
    assertThat(lot.getCurrentSizeAbsolute()).isZero();
    assertThat(lot.getPerformanceAbsolute()).isZero();
    assertThat(lot.getPerformanceRelative()).isZero();
  }

  @Test
  void add_transactionCountIsZero_noLotAdded() {
    lots = new LinkedList<>();
    when(transaction.getCountForArithmeticOperations()).thenReturn(ZERO);
    Lot.add(lots, transaction, clock);
    assertThat(lots).isEmpty();
  }

  @Test
  void add_lotsIsNull_illegalArgumentException() {
    assertThatExceptionOfType(IllegalArgumentException.class).isThrownBy(() -> Lot.add(null, transaction, clock));
  }

  @Test
  void add_transactionIsNull_illegalArgumentException() {
    assertThatExceptionOfType(IllegalArgumentException.class).isThrownBy(() -> Lot.add(new LinkedList<>(), null, clock));
  }

  @Test
  void add_transactionTypeNotBuy_illegalArgumentException() {
    TransactionTypeDto[] transactionTypes = {SELL, DIVIDEND, TAX};
    lots = new LinkedList<>();
    for (TransactionTypeDto transactionType : transactionTypes) {
      when(transaction.getTransactionType()).thenReturn(transactionType);
      assertThatExceptionOfType(IllegalArgumentException.class).isThrownBy(() -> Lot.add(new LinkedList<>(), transaction, clock));
      assertThat(lots).isEmpty();
    }
  }

  @Test
  void add_clockIsNull_illegalArgumentException() {
    assertThatExceptionOfType(IllegalArgumentException.class).isThrownBy(() -> Lot.add(new LinkedList<>(), transaction, null));
  }

  @Test
  void subtract_emptyList() {
    when(transaction.getTransactionType()).thenReturn(SELL);
    lots = new LinkedList<>();
    Lot.subtract(lots, transaction, MATH_CONTEXT);
    assertThat(lots).isEmpty();
  }

  @Test
  void subtract_removeExactlyFirstLot() {
    when(transaction.getTransactionType()).thenReturn(SELL);
    when(transaction.getCountForArithmeticOperations()).thenReturn(new BigDecimal("10"));

    Lot.subtract(lots, transaction, MATH_CONTEXT);

    assertThat(lots).hasSize(2);
    assertThat(lots.getFirst().getCount()).isEqualByComparingTo("9.5");
    assertThat(lots.get(1).getCount()).isEqualByComparingTo("8.6");
  }

  @Test
  void subtract_removeFirstLotPartially() {
    when(transaction.getTransactionType()).thenReturn(SELL);
    when(transaction.getCountForArithmeticOperations()).thenReturn(new BigDecimal("9.5"));

    Lot.subtract(lots, transaction, MATH_CONTEXT);

    assertThat(lots).hasSize(3);
    Lot lot = lots.getFirst();
    assertThat(lot.getCount()).isEqualByComparingTo("0.5");
    assertThat(lot.getBuyInAbsolute()).isEqualByComparingTo("75.014");
    assertThat(lot.getFee()).isEqualByComparingTo("0.5");
    assertThat(lot.getTax()).isEqualByComparingTo("0.25");

    lot = lots.get(1);
    assertThat(lot.getCount()).isEqualByComparingTo("9.5");
    assertThat(lot.getBuyInAbsolute()).isEqualByComparingTo("1348.03");
    assertThat(lot.getFee()).isEqualByComparingTo("10");
    assertThat(lot.getTax()).isEqualByComparingTo("5");

    lot = lots.get(2);
    assertThat(lot.getCount()).isEqualByComparingTo("8.6");
    assertThat(lot.getBuyInAbsolute()).isEqualByComparingTo("2100");
    assertThat(lot.getFee()).isEqualByComparingTo("10");
    assertThat(lot.getTax()).isEqualByComparingTo("5");
  }

  @Test
  void subtract_removeFirstLotAndSecondLotPartially() {
    when(transaction.getTransactionType()).thenReturn(SELL);
    when(transaction.getCountForArithmeticOperations()).thenReturn(new BigDecimal("10.5"));

    Lot.subtract(lots, transaction, MATH_CONTEXT);

    assertThat(lots).hasSize(2);

    Lot lot = lots.getFirst();
    assertThat(lot.getCount()).isEqualByComparingTo("9");
    assertThat(lot.getBuyInAbsolute()).isCloseTo(new BigDecimal("1277.08105"), ACCURACY_ONE_THOUSANDTH);
    assertThat(lot.getFee()).isCloseTo(new BigDecimal("9.47368"), ACCURACY_ONE_THOUSANDTH);
    assertThat(lot.getTax()).isCloseTo(new BigDecimal("4.73684"), ACCURACY_ONE_THOUSANDTH);

    lot = lots.get(1);
    assertThat(lot.getCount()).isEqualByComparingTo("8.6");
    assertThat(lot.getBuyInAbsolute()).isEqualByComparingTo("2100");
    assertThat(lot.getFee()).isEqualByComparingTo("10");
    assertThat(lot.getTax()).isEqualByComparingTo("5");
  }

  @Test
  void subtract_removeAllLots_exactlyTotalCount() {
    when(transaction.getTransactionType()).thenReturn(SELL);
    when(transaction.getCountForArithmeticOperations()).thenReturn(new BigDecimal("28.1"));

    Lot.subtract(lots, transaction, MATH_CONTEXT);

    assertThat(lots).isEmpty();
  }

  @Test
  void subtract_removeAllLots_moreThanTotalCount() {
    when(transaction.getTransactionType()).thenReturn(SELL);
    when(transaction.getCountForArithmeticOperations()).thenReturn(new BigDecimal("30"));

    Lot.subtract(lots, transaction, MATH_CONTEXT);

    assertThat(lots).isEmpty();
  }

  @Test
  void subtract_lotsIsNull_illegalArgumentException() {
    when(transaction.getTransactionType()).thenReturn(SELL);
    assertThatExceptionOfType(IllegalArgumentException.class).isThrownBy(() -> Lot.subtract(null, transaction, MATH_CONTEXT));
  }

  @Test
  void subtract_transactionIsNull_illegalArgumentException() {
    assertThatExceptionOfType(IllegalArgumentException.class).isThrownBy(() -> Lot.subtract(lots, null, MATH_CONTEXT));
  }

  @Test
  void subtract_transactionTypeNotSell_illegalArgumentException() {
    TransactionTypeDto[] transactionTypes = {BUY, DIVIDEND, TAX};
    lots = new LinkedList<>();
    for (TransactionTypeDto transactionType : transactionTypes) {
      when(transaction.getTransactionType()).thenReturn(transactionType);
      assertThatExceptionOfType(IllegalArgumentException.class).isThrownBy(() -> Lot.subtract(lots, transaction, MATH_CONTEXT));
      assertThat(lots).isEmpty();
    }
  }

  @Test
  void subtract_mathContextIsNull_illegalArgumentException() {
    assertThatExceptionOfType(IllegalArgumentException.class).isThrownBy(() -> Lot.subtract(lots, transaction, null));
  }

  @Test
  void calculatePerformance() {
    BigDecimal currentPrice = new BigDecimal("224.38");
    Lot.calculatePerformance(lots, currentPrice, MATH_CONTEXT, clock);

    assertThat(lots).hasSize(3);

    Lot lot = lots.getFirst();
    assertThat(lot.getCurrentSizeAbsolute()).isEqualByComparingTo("2243.8");
    assertThat(lot.getPerformanceAbsolute()).isEqualByComparingTo("743.52");
    assertThat(lot.getPerformanceRelative()).isCloseTo(new BigDecimal("0.4956"), ACCURACY_ONE_THOUSANDTH);

    lot = lots.get(1);
    assertThat(lot.getCurrentSizeAbsolute()).isEqualByComparingTo("2131.61");
    assertThat(lot.getPerformanceAbsolute()).isEqualByComparingTo("783.58");
    assertThat(lot.getPerformanceRelative()).isCloseTo(new BigDecimal("0.58128"), ACCURACY_ONE_THOUSANDTH);

    lot = lots.get(2);
    assertThat(lot.getCurrentSizeAbsolute()).isEqualByComparingTo("1929.668");
    assertThat(lot.getPerformanceAbsolute()).isEqualByComparingTo("-170.332");
    assertThat(lot.getPerformanceRelative()).isCloseTo(new BigDecimal("-0.08111"), ACCURACY_ONE_THOUSANDTH);
  }

  @Test
  void calculatePerformance_priceIsZero() {
    Lot.calculatePerformance(lots, ZERO, MATH_CONTEXT, clock);

    assertThat(lots).hasSize(3);

    Lot lot = lots.getFirst();
    assertThat(lot.getCurrentSizeAbsolute()).isZero();
    assertThat(lot.getPerformanceAbsolute()).isEqualByComparingTo("-1500.28");
    assertThat(lot.getPerformanceRelative()).isEqualByComparingTo("-1");

    lot = lots.get(1);
    assertThat(lot.getCurrentSizeAbsolute()).isZero();
    assertThat(lot.getPerformanceAbsolute()).isEqualByComparingTo("-1348.03");
    assertThat(lot.getPerformanceRelative()).isEqualByComparingTo("-1");

    lot = lots.get(2);
    assertThat(lot.getCurrentSizeAbsolute()).isZero();
    assertThat(lot.getPerformanceAbsolute()).isEqualByComparingTo("-2100");
    assertThat(lot.getPerformanceRelative()).isEqualByComparingTo("-1");
  }

  @Test
  void calculatePerformance_buyInZero_performanceRelativeInfinite() {
    lots = new LinkedList<>(List.of(freeLot()));
    Lot.calculatePerformance(lots, new BigDecimal("12.5"), MATH_CONTEXT, clock);

    Lot lot = lots.getFirst();
    assertThat(lot.getCurrentSizeAbsolute()).isEqualByComparingTo("25");
    assertThat(lot.getPerformanceAbsolute()).isEqualByComparingTo("25");
    assertThat(lot.getPerformanceRelative()).isNull();
    assertThat(lot.getCagr()).isNull();
  }

  @Test
  void calculatePerformance_buyInAndPriceZero_performanceRelativeZeroCagrAbsent() {
    lots = new LinkedList<>(List.of(freeLot()));
    Lot.calculatePerformance(lots, ZERO, MATH_CONTEXT, clock);

    Lot lot = lots.getFirst();
    assertThat(lot.getCurrentSizeAbsolute()).isEqualByComparingTo("0");
    assertThat(lot.getPerformanceAbsolute()).isEqualByComparingTo("0");
    assertThat(lot.getPerformanceRelative()).isEqualByComparingTo("0");
    assertThat(lot.getCagr()).isNull();
  }

  @Test
  void calculatePerformance_lotDatedToday_cagrAbsent() {
    lots = new LinkedList<>(List.of(lotDated(LocalDate.of(2024, JANUARY, 1))));
    Lot.calculatePerformance(lots, new BigDecimal("12.5"), MATH_CONTEXT, clock);

    Lot lot = lots.getFirst();
    assertThat(lot.getPerformanceRelative()).isEqualByComparingTo("0.25");
    assertThat(lot.getCagr()).isNull();
  }

  @Test
  void calculatePerformance_lotDatedInTheFuture_cagrAbsent() {
    lots = new LinkedList<>(List.of(lotDated(LocalDate.of(2024, JANUARY, 2))));
    Lot.calculatePerformance(lots, new BigDecimal("12.5"), MATH_CONTEXT, clock);

    Lot lot = lots.getFirst();
    assertThat(lot.getPerformanceRelative()).isEqualByComparingTo("0.25");
    assertThat(lot.getCagr()).isNull();
  }

  @Test
  void calculatePerformance_lotHeldForAYear_cagrComputed() {
    lots = new LinkedList<>(List.of(lotDated(LocalDate.of(2023, JANUARY, 1))));
    Lot.calculatePerformance(lots, new BigDecimal("12.5"), MATH_CONTEXT, clock);

    double expectedCagr = Math.pow(25.0 / 20.0, 365.25 / 365) - 1;
    assertThat(lots.getFirst().getCagr().doubleValue()).isCloseTo(expectedCagr, withPercentage(0.0001));
  }

  private Lot lotDated(LocalDate date) {
    return Lot.builder()
        .depotId(1)
        .securityId(2)
        .date(date)
        .time(LocalTime.of(9, 36, 10))
        .holdingPeriodInDays(0)
        .count(new BigDecimal("2"))
        .buyInAbsolute(new BigDecimal("20"))
        .fee(ZERO)
        .tax(ZERO)
        .build();
  }

  private Lot freeLot() {
    return Lot.builder()
        .depotId(1)
        .securityId(2)
        .date(LocalDate.of(2023, JUNE, 12))
        .time(LocalTime.of(9, 36, 10))
        .holdingPeriodInDays(0)
        .count(new BigDecimal("2"))
        .buyInAbsolute(ZERO)
        .fee(ZERO)
        .tax(ZERO)
        .build();
  }

  @Test
  void calculatePerformance_currentPriceIsNull_performanceIsZeroCagrAbsent() {
    Lot.calculatePerformance(lots, null, MATH_CONTEXT, clock);

    assertThat(lots).hasSize(3);

    Lot lot = lots.getFirst();
    assertThat(lot.getCurrentSizeAbsolute()).isEqualByComparingTo("1500.28");
    assertThat(lot.getPerformanceAbsolute()).isZero();
    assertThat(lot.getPerformanceRelative()).isZero();
    assertThat(lot.getCagr()).isNull();

    lot = lots.get(1);
    assertThat(lot.getCurrentSizeAbsolute()).isEqualByComparingTo("1348.03");
    assertThat(lot.getPerformanceAbsolute()).isZero();
    assertThat(lot.getPerformanceRelative()).isZero();
    assertThat(lot.getCagr()).isNull();

    lot = lots.get(2);
    assertThat(lot.getCurrentSizeAbsolute()).isEqualByComparingTo("2100");
    assertThat(lot.getPerformanceAbsolute()).isZero();
    assertThat(lot.getPerformanceRelative()).isZero();
    assertThat(lot.getCagr()).isNull();
  }

  @Test
  void calculatePerformance_emptyList() {
    lots = new LinkedList<>();
    Lot.calculatePerformance(lots, ONE, MATH_CONTEXT, clock);
    assertThat(lots).isEmpty();
  }

  @Test
  void calculatePerformance_lotsIsNull_illegalArgumentException() {
    assertThatExceptionOfType(IllegalArgumentException.class).isThrownBy(() -> Lot.calculatePerformance(null, ONE, MATH_CONTEXT, clock));
  }

  @Test
  void calculatePerformance_currentSizeIsNull_illegalArgumentException() {
    assertThatExceptionOfType(IllegalArgumentException.class).isThrownBy(() -> Lot.calculatePerformance(lots, ONE, null, clock));
  }

  @Test
  void calculatePerformance_clockIsNull_illegalArgumentException() {
    assertThatExceptionOfType(IllegalArgumentException.class).isThrownBy(() -> Lot.calculatePerformance(lots, ONE, MATH_CONTEXT, null));
  }
}
