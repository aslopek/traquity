package de.as.traquity.depot.transaction;

import static de.as.traquity.depot.transaction.api.model.TransactionTypeDto.BUY;
import static de.as.traquity.depot.transaction.api.model.TransactionTypeDto.DIVIDEND;
import static de.as.traquity.depot.transaction.api.model.TransactionTypeDto.SELL;
import static de.as.traquity.depot.transaction.api.model.TransactionTypeDto.SPECIAL_DIVIDEND;
import static de.as.traquity.depot.transaction.api.model.TransactionTypeDto.TAX;
import static java.time.Month.FEBRUARY;
import static java.time.Month.MARCH;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import de.as.traquity.depot.transaction.api.model.TransactionTypeDto;
import java.math.BigDecimal;
import java.math.MathContext;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;
import org.junit.jupiter.api.Test;

class CashFlowTransactionComparatorTest {

  private final CashFlowTransactionComparator subject = new CashFlowTransactionComparator();

  @Test
  void sort_sameDayBuysAndSellsMixedTimes_sameOrderForEveryInitialOrder() {
    List<Transaction> transactions = List.of(
        transaction(1L, BUY, LocalTime.of(10, 0)),
        transaction(2L, SELL, null),
        transaction(3L, BUY, LocalTime.of(9, 0)));

    SortAssertions.assertSortedIdsForEveryPermutation(subject, transactions, 2L, 3L, 1L);
  }

  @Test
  void sort_sameDayBuysAndSellsWithoutTime_sellsThenBuysThenTimed() {
    List<Transaction> transactions = List.of(
        transaction(1L, BUY, null),
        transaction(2L, SELL, null),
        transaction(3L, BUY, null),
        transaction(4L, SELL, null),
        transaction(5L, SELL, LocalTime.of(10, 0)),
        transaction(6L, BUY, LocalTime.of(9, 0)));

    SortAssertions.assertSortedIdsForEveryPermutation(subject, transactions, 2L, 4L, 1L, 3L, 6L, 5L);
  }

  @Test
  void sort_sameDayDividendsTaxesBuysAndSells_dividendsThenTaxesThenBuysAndSells() {
    List<Transaction> transactions = List.of(
        transaction(1L, BUY, null),
        transaction(2L, DIVIDEND, LocalTime.of(11, 0)),
        transaction(3L, SPECIAL_DIVIDEND, LocalTime.of(9, 0)),
        transaction(4L, TAX, LocalTime.of(12, 0)),
        transaction(5L, TAX, null),
        transaction(6L, SELL, LocalTime.of(8, 0)));

    SortAssertions.assertSortedIdsForEveryPermutation(subject, transactions, 2L, 3L, 4L, 5L, 1L, 6L);
  }

  @Test
  void sort_sameDayTaxes_lowestNetValueFirstThenId() {
    List<Transaction> transactions = List.of(
        transaction(1L, TAX, null, "6"),
        transaction(2L, TAX, null, "-3"),
        transaction(3L, TAX, null, "-3"));

    SortAssertions.assertSortedIdsForEveryPermutation(subject, transactions, 2L, 3L, 1L);
  }

  @Test
  void sort_differentDays_dateBeforeTypeTimeAndId() {
    Transaction earlierBuy = transaction(2L, LocalDate.of(2024, FEBRUARY, 29), BUY, LocalTime.of(23, 0), "0");
    Transaction laterDividend = transaction(1L, DIVIDEND, null);

    SortAssertions.assertSortedIdsForEveryPermutation(subject, List.of(earlierBuy, laterDividend), 2L, 1L);
  }

  private Transaction transaction(long id, TransactionTypeDto type, LocalTime time) {
    return transaction(id, type, time, "0");
  }

  private Transaction transaction(long id, TransactionTypeDto type, LocalTime time, String netValue) {
    return transaction(id, LocalDate.of(2024, MARCH, 1), type, time, netValue);
  }

  private Transaction transaction(long id, LocalDate date, TransactionTypeDto type, LocalTime time, String netValue) {
    Transaction transaction = mock(Transaction.class);
    when(transaction.getId()).thenReturn(id);
    when(transaction.getDate()).thenReturn(date);
    when(transaction.getTransactionType()).thenReturn(type);
    when(transaction.getTime()).thenReturn(time);
    when(transaction.getNetValue(MathContext.UNLIMITED)).thenReturn(new BigDecimal(netValue));
    return transaction;
  }
}
