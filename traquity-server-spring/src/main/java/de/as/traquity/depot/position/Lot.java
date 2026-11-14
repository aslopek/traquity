package de.as.traquity.depot.position;

import static de.as.traquity.common.arithmetic.MathFunctions.cagr;
import static de.as.traquity.common.arithmetic.MathFunctions.ratioOf;
import static de.as.traquity.depot.transaction.api.model.TransactionTypeDto.BUY;
import static de.as.traquity.depot.transaction.api.model.TransactionTypeDto.SELL;
import static java.math.BigDecimal.ONE;
import static java.math.BigDecimal.ZERO;

import de.as.traquity.depot.transaction.Transaction;
import java.math.BigDecimal;
import java.math.MathContext;
import java.time.Clock;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.temporal.ChronoUnit;
import java.util.List;
import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class Lot implements Performance {

  static void add(List<Lot> lots, Transaction transaction, Clock clock) throws IllegalArgumentException {
    if (lots == null || transaction == null || transaction.getTransactionType() != BUY || clock == null) {
      throw new IllegalArgumentException();
    }

    if (transaction.getCountForArithmeticOperations().compareTo(ZERO) == 0) {
      // do not add empty lots
      return;
    }

    BigDecimal fee = transaction.getFee() == null ? ZERO : transaction.getFee();
    BigDecimal tax = transaction.getTax() == null ? ZERO : transaction.getTax();
    long holdingPeriodInDays = ChronoUnit.DAYS.between(transaction.getDate(), LocalDate.now(clock));

    lots.add(Lot.builder()
        .depotId(transaction.getDepotId())
        .securityId(transaction.getSecurityId())
        .date(transaction.getDate())
        .time(transaction.getTime())
        .holdingPeriodInDays(holdingPeriodInDays)
        .count(transaction.getCountForArithmeticOperations())
        .buyInAbsolute(transaction.getGrossValue())
        .fee(fee)
        .tax(tax)
        .build());
  }

  static void subtract(List<Lot> lots, Transaction transaction, MathContext mathContext) throws IllegalArgumentException {
    if (lots == null || transaction == null || transaction.getTransactionType() != SELL || mathContext == null) {
      throw new IllegalArgumentException();
    }

    BigDecimal remainingCount = transaction.getCountForArithmeticOperations();
    Lot lot;
    int lotIndex = 0;
    boolean remainingCountGreaterThanZero = remainingCount.compareTo(ZERO) > 0;
    boolean nextIndexAvailable = lotIndex < lots.size();

    while (remainingCountGreaterThanZero && nextIndexAvailable) {
      lot = lots.get(lotIndex);

      if (remainingCount.compareTo(lot.getCount()) > 0) {
        // lot will be removed, as more count remains than the current lot has
        remainingCount = remainingCount.subtract(lot.getCount());
        lot.setCount(ZERO);
      } else {
        // lot remains with lower count
        lot.subtract(remainingCount, mathContext);
        break;
      }

      lotIndex++;
      remainingCountGreaterThanZero = remainingCount.compareTo(ZERO) > 0;
      nextIndexAvailable = lotIndex < lots.size();
    }

    while (!lots.isEmpty() && lots.getFirst().getCount().compareTo(ZERO) == 0) {
      // remove empty lots until first non-empty lot is encountered
      lots.removeFirst();
    }
  }

  static void calculatePerformance(Iterable<Lot> lots, BigDecimal price, MathContext mathContext, Clock clock)
      throws IllegalArgumentException {
    if (lots == null || mathContext == null || clock == null) {
      throw new IllegalArgumentException();
    }

    BigDecimal buyInAbsolute;
    BigDecimal currentSizeAbsolute;
    BigDecimal performanceAbsolute;

    for (Lot lot : lots) {
      buyInAbsolute = lot.getBuyInAbsolute();
      if (price == null) {
        lot.setCurrentSizeAbsolute(buyInAbsolute);
        lot.setPerformanceAbsolute(ZERO);
        lot.setPerformanceRelative(ZERO);
        lot.setCagr(null);
        continue;
      }

      currentSizeAbsolute = lot.count.multiply(price, mathContext);
      performanceAbsolute = currentSizeAbsolute.subtract(buyInAbsolute, mathContext);

      lot.currentSizeAbsolute = currentSizeAbsolute;
      lot.performanceAbsolute = performanceAbsolute;
      lot.performanceRelative = ratioOf(performanceAbsolute, buyInAbsolute, mathContext);
      lot.cagr = calculateCagr(lot, mathContext, clock);
    }
  }

  /**
   * @return the lot's compound annual growth rate, or {@code null} if none can be computed (zero buy in, lot held for less than a day)
   */
  private static BigDecimal calculateCagr(Lot lot, MathContext mathContext, Clock clock) {
    LocalDate today = LocalDate.now(clock);
    if (lot.buyInAbsolute.signum() == 0 || !lot.date.isBefore(today)) {
      return null;
    }
    BigDecimal growthFactor = ONE.add(lot.performanceRelative, mathContext);
    return cagr(growthFactor, lot.date, today, mathContext);
  }

  private long depotId;
  private long securityId;
  private String currency;
  private LocalDate date;
  private LocalTime time;
  private long holdingPeriodInDays;

  @Builder.Default
  private BigDecimal count = ZERO;

  @Builder.Default
  private BigDecimal buyInAbsolute = ZERO;

  @Builder.Default
  private BigDecimal fee = ZERO;

  @Builder.Default
  private BigDecimal tax = ZERO;

  @Builder.Default
  private BigDecimal currentSizeAbsolute = ZERO;

  @Builder.Default
  private BigDecimal performanceAbsolute = ZERO;

  @Builder.Default
  private BigDecimal performanceRelative = ZERO;

  @Builder.Default
  private BigDecimal cagr = ZERO;

  private void subtract(BigDecimal countToBeSubtracted, MathContext mathContext) {
    BigDecimal newCount = count.subtract(countToBeSubtracted, mathContext);
    BigDecimal factor = newCount.divide(count, mathContext);
    count = newCount;
    buyInAbsolute = buyInAbsolute.multiply(factor, mathContext);
    fee = fee.multiply(factor, mathContext);
    tax = tax.multiply(factor, mathContext);
  }
}
